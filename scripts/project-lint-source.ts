/**
 * The `project` plugin's rules that read a file's raw text and comments:
 * `prefer-ascii` and `no-disable-comments`.
 *
 * @module
 */

import type { TSESTree } from "@typescript-eslint/types";

import type { ProjectRule } from "./project-lint-types.ts";

/** The highest code point `prefer-ascii` lets through. */
const MAX_ASCII_CODE_POINT: number = 0x7f;

/** A comment that turns lint rules off or back on, in ESLint or Oxlint form. */
const DIRECTIVE_PATTERN: RegExp = /^\s*(?:eslint|oxlint)-(?:disable|enable)/u;

/** This rule's own name, which a directive may not use to silence it. */
const RULE_NAME: string = "no-disable-comments";

/**
 * `no-disable-comments` - rejects every `eslint-disable*`, `eslint-enable*`,
 * `oxlint-disable*`, and `oxlint-enable*` comment, line or block. Oxlint has
 * no `noInlineConfig` and no `eslint-comments` rules, so this repo bans them
 * itself: when a rule fires, fix the source.
 *
 * A directive can silence the report on itself, so two built-in checks close
 * the gaps: `unicorn/no-abusive-eslint-disable` fails one that names no rule,
 * and this rule skips one that names it, which then silences nothing and fails
 * `reportUnusedDisableDirectives` in `vite.config.ts`.
 */
export const noDisableCommentsRule: ProjectRule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow lint disable and enable comments" },
    schema: [],
    messages: { directive: "Lint disable comments are not allowed; fix the source." },
  },
  create(context) {
    return {
      Program(_node: TSESTree.Program): void {
        for (const comment of context.sourceCode.getAllComments()) {
          if (DIRECTIVE_PATTERN.test(comment.value) && !comment.value.includes(RULE_NAME)) {
            context.report({ loc: comment.loc, messageId: "directive" });
          }
        }
      },
    };
  },
};

/**
 * `prefer-ascii` - every character of the source is ASCII, as Deno's
 * `prefer-ascii` required. A file is exempted only through an entry in
 * `projectOverrides` in `project-lint.ts`; this repo has none.
 */
export const preferAsciiRule: ProjectRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Require the source to be ASCII" },
    schema: [],
    messages: {
      nonAscii: "Non-ASCII character '{{character}}' (U+{{codePoint}}) is not allowed.",
    },
  },
  create(context) {
    return {
      Program(_node: TSESTree.Program): void {
        const { sourceCode } = context;
        let index: number = 0;
        for (const character of sourceCode.text) {
          const codePoint: number = character.codePointAt(0) ?? 0;
          if (codePoint > MAX_ASCII_CODE_POINT) {
            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(index),
                end: sourceCode.getLocFromIndex(index + character.length),
              },
              messageId: "nonAscii",
              data: { character, codePoint: codePoint.toString(16).toUpperCase().padStart(4, "0") },
            });
          }
          index += character.length;
        }
      },
    };
  },
};
