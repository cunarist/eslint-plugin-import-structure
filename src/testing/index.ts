/**
 * Shared harness for rule tests: every case runs under both ESLint's and
 * Oxlint's `RuleTester`, wired into Vitest.
 *
 * Imported only by `*.test.ts` files, never by the plugin, so neither tester
 * ends up in the published bundle. No ESLint config file is involved: each
 * tester is configured here.
 */

import type { RuleDefinition } from "@eslint/core";
import tsParser from "@typescript-eslint/parser";
import { RuleTester as EslintRuleTester } from "eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RuleTester as OxlintRuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import type { ExplicitRule } from "#helpers";

/**
 * A rule under test: one from `src/rules/`, or one read back off the
 * published plugin, which types its rules as ESLint's plain `RuleDefinition`.
 */
export type TestedRule = ExplicitRule | RuleDefinition;

EslintRuleTester.describe = describe;
EslintRuleTester.it = it;
EslintRuleTester.itOnly = it.only;
OxlintRuleTester.describe = (text, fn) => {
  describe(text, fn);
};
OxlintRuleTester.it = it;

/**
 * The filename a snippet is linted as unless its case names one, so both
 * parsers read TypeScript. Absolute, because ESLint passes a relative name
 * through unchanged while Oxlint resolves it elsewhere; this way both hosts
 * see the same path, under this repository's own `package.json`.
 */
const FILENAME: string = path.resolve("example.ts");

/**
 * The fixture project: a `package.json` whose `imports` the rules read from
 * disk. No source file in it needs to exist, since no rule opens one.
 */
const FIXTURE_URL: URL = new URL("fixture/", import.meta.url);

/** The absolute path of a file inside the fixture project. */
export function fixture(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, FIXTURE_URL));
}

const eslintTester = new EslintRuleTester({
  languageOptions: { parser: tsParser },
});

/**
 * Oxlint's tester, seen through the one method this harness calls.
 *
 * Oxlint types `run` against its own `Rule`, which ESLint's `RuleDefinition`
 * does not satisfy on paper - `meta.docs` lacks an index signature and the
 * two `sourceCode` shapes differ - although Oxlint runs ESLint rules as they
 * are. Widening the parameter here is the one place the two type systems are
 * bridged; the Oxlint half of every test is what proves the runtime agrees.
 */
interface OxlintRunner {
  run(name: string, rule: unknown, cases: OxlintRuleTester.TestCases): void;
}

const oxlintTester: OxlintRunner = new OxlintRuleTester({
  languageOptions: { parserOptions: { lang: "ts" } },
});

/** A valid snippet linted as a given file, for rules that read its path. */
export interface ValidCase {
  code: string;
  filename: string;
}

/** The cases one rule is tested against, written in ESLint's shape. */
interface RuleCases {
  valid: (string | ValidCase)[];
  invalid: EslintRuleTester.InvalidTestCase[];
}

/** A valid case with its filename spelled out. */
function validCase(test: string | ValidCase): ValidCase {
  return typeof test === "string" ? { code: test, filename: FILENAME } : test;
}

/** An expected error, in ESLint's shape. */
export type ExpectedError = EslintRuleTester.TestCaseError;

/** An expected suggestion and the code it leaves, in ESLint's shape. */
export type ExpectedSuggestion = EslintRuleTester.SuggestionOutput;

/**
 * Where a diagnostic should land, counted the way ESLint counts: lines and
 * columns both from 1. The Oxlint run shifts columns to its 0-based count.
 */
interface ReportedSpan {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

/**
 * The span of the first occurrence of `text` in `code`. A rule can fire
 * correctly while highlighting the wrong characters; this is what catches that.
 */
export function spanOf(code: string, text: string): ReportedSpan {
  const start = code.indexOf(text);
  if (start === -1) {
    throw new Error(`${JSON.stringify(text)} is not in the code`);
  }
  const begin = position(code, start);
  const end = position(code, start + text.length);
  return {
    line: begin.line,
    column: begin.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

/** A line and column within source text. */
interface Position {
  line: number;
  column: number;
}

/** The 1-indexed line and 1-indexed column of an offset. */
function position(code: string, offset: number): Position {
  const before = code.slice(0, offset).split("\n");
  return {
    line: before.length,
    column: (before.at(-1)?.length ?? 0) + 1,
  };
}

/**
 * Run one rule over all its valid and invalid snippets, under ESLint and
 * Oxlint. Each rule's test file calls this once. The suites nest as
 * `<rule> > eslint|oxlint`, so a full test name contains ` eslint ` or
 * ` oxlint `, which is what CI filters each host's step by.
 */
export function testRule(name: string, rule: TestedRule, cases: RuleCases): void {
  describe(name, () => {
    describe("eslint", () => {
      eslintTester.run(name, rule, {
        valid: cases.valid.map(validCase),
        invalid: cases.invalid.map((test) => ({ ...test, filename: test.filename ?? FILENAME })),
      });
    });
    describe("oxlint", () => {
      oxlintTester.run(name, rule, {
        valid: cases.valid.map(validCase),
        invalid: cases.invalid.map((test) => ({
          code: test.code,
          filename: test.filename ?? FILENAME,
          errors: oxlintErrors(test.errors),
          ...(test.output === undefined ? {} : { output: test.output }),
        })),
      });
    });
  });
}

/** ESLint's expected errors, with columns shifted to Oxlint's 0-based count. */
function oxlintErrors(
  errors: EslintRuleTester.InvalidTestCase["errors"],
): OxlintRuleTester.InvalidTestCase["errors"] {
  if (typeof errors === "number") {
    return errors;
  }
  return errors.map((error) => {
    if (typeof error === "string") {
      return error;
    }
    const shifted: OxlintRuleTester.Error = { ...oxlintMessage(error) };
    if (error.suggestions !== undefined) {
      shifted.suggestions = oxlintSuggestions(error.suggestions);
    }
    if (error.line !== undefined) {
      shifted.line = error.line;
    }
    if (error.endLine !== undefined) {
      shifted.endLine = error.endLine;
    }
    if (error.column !== undefined) {
      shifted.column = error.column - 1;
    }
    if (error.endColumn !== undefined) {
      shifted.endColumn = error.endColumn - 1;
    }
    return shifted;
  });
}

/** ESLint's expected suggestions, in the shape Oxlint reads. */
function oxlintSuggestions(
  suggestions: EslintRuleTester.SuggestionOutput[] | null,
): OxlintRuleTester.ErrorSuggestion[] | null {
  if (suggestions === null) {
    return null;
  }
  return suggestions.map((suggestion) => {
    const expected: OxlintRuleTester.ErrorSuggestion = { output: suggestion.output };
    if (suggestion.messageId !== undefined) {
      expected.messageId = suggestion.messageId;
    }
    if (suggestion.desc !== undefined) {
      expected.desc = suggestion.desc;
    }
    if (suggestion.data !== undefined) {
      expected.data = Object.fromEntries(stringEntries(suggestion.data));
    }
    return expected;
  });
}

/** The message half of an expected error, which both testers read alike. */
function oxlintMessage(error: EslintRuleTester.TestCaseError): OxlintRuleTester.Error {
  if (error.messageId !== undefined) {
    return error.data === undefined
      ? { messageId: error.messageId }
      : { messageId: error.messageId, data: Object.fromEntries(stringEntries(error.data)) };
  }
  if (error.message !== undefined) {
    return { message: error.message };
  }
  throw new Error("an expected error needs a messageId or a message");
}

/**
 * Placeholder data as Oxlint types it. ESLint types it `any`; every
 * placeholder in this package is a string, so anything else is a test bug.
 */
function stringEntries(data: unknown): [string, string][] {
  if (typeof data !== "object" || data === null) {
    throw new Error("data is not an object");
  }
  return Object.entries(data).map(([key, value]) => {
    if (typeof value !== "string") {
      throw new TypeError(`placeholder ${key} is not a string`);
    }
    return [key, value];
  });
}
