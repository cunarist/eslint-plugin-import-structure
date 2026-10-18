import type { RuleFixer, RuleTextEdit } from "@eslint/core";
import type { TSESTree } from "@typescript-eslint/types";

import {
  compareSpecifiers,
  docsUrl,
  type ExplicitContext,
  type ExplicitRule,
  type ExplicitSourceCode,
  fixedOrder,
  type ImportEntry,
  importGroup,
  isSorted,
  orderProblem,
} from "#helpers";

/** Every line break, for counting the lines between two imports. */
const NEWLINE_PATTERN: RegExp = /\n/gu;

/**
 * Orders imported names case insensitively, unlike `compareSpecifiers`.
 * Specifiers are lowercase paths where only punctuation is ambiguous, but a
 * member list mixes `PascalCase` types, `camelCase` functions and
 * `SCREAMING_CASE` constants. Sorting those by code point would clump them by
 * case, which hides the alphabetical order a reader is scanning for.
 */
function compareMembers(a: string, b: string): number {
  const lowered = compareSpecifiers(a.toLowerCase(), b.toLowerCase());
  return lowered === 0 ? compareSpecifiers(a, b) : lowered;
}

/**
 * The names inside the braces of an import, in source order. Default and
 * namespace bindings sit outside the braces and are left alone.
 */
function namedSpecifiers(node: TSESTree.ImportDeclaration): TSESTree.ImportSpecifier[] {
  return node.specifiers.filter(
    (specifier): specifier is TSESTree.ImportSpecifier => specifier.type === "ImportSpecifier",
  );
}

/** The name a member is sorted by, which is the one written first. */
function memberName(specifier: TSESTree.ImportSpecifier): string {
  const imported = specifier.imported;
  return imported.type === "Identifier" ? imported.name : specifier.local.name;
}

/** Whether a comment lies inside a range of the source. */
function hasCommentWithin(source: ExplicitSourceCode, start: number, end: number): boolean {
  return source
    .getAllComments()
    .some((comment) => comment.range[0] >= start && comment.range[1] <= end);
}

/**
 * Rewrites the braces of one import in sorted order, preserving whether the
 * list was written on one line or spread across several. `null` when a
 * comment anywhere in the import could end up beside a different member, or
 * when a multiline list does not start its first member on a line of its
 * own, since there is no indent to reuse.
 */
function fixMemberOrder(
  source: ExplicitSourceCode,
  node: TSESTree.ImportDeclaration,
  members: TSESTree.ImportSpecifier[],
): RuleFixer | null {
  const first = members.at(0);
  const last = members.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  const start = first.range[0];
  const end = last.range[1];
  if (hasCommentWithin(source, node.range[0], node.range[1])) {
    return null;
  }
  const text = source.text;
  const sorted = members.toSorted((a, b) => compareMembers(memberName(a), memberName(b)));
  // Match the existing layout rather than reflowing it, so a list the
  // formatter already broke across lines stays broken.
  const multiline = text.slice(start, end).includes("\n");
  const lead = text.slice(text.lastIndexOf("\n", start) + 1, start);
  if (multiline && lead.trim() !== "") {
    return null;
  }
  const indent = multiline ? lead : "";
  const separator = multiline ? `,\n${indent}` : ", ";
  const replacement = sorted.map((member) => source.getText(member)).join(separator);
  return (fixer): RuleTextEdit => fixer.replaceTextRange([start, end], replacement);
}

/**
 * Builds the whole-block rewrite, but only when nothing would be lost and the
 * rewrite changes something. Comments inside the block have no home in the
 * rewritten text, and statements interleaved between imports would be erased
 * by a single range replacement, so both cases give `null` and report
 * without a fix. So does a block that cannot be put fully in order without
 * moving a side-effect import, rather than fixing it halfway.
 */
function fixImportBlock(
  source: ExplicitSourceCode,
  body: TSESTree.ProgramStatement[],
  entries: ImportEntry[],
): RuleFixer | null {
  const first = entries.at(0);
  const last = entries.at(-1);
  if (first === undefined || last === undefined) {
    return null;
  }
  const start = first.node.range[0];
  const end = last.node.range[1];
  const contiguous = body.indexOf(last.node) - body.indexOf(first.node) + 1 === entries.length;
  // A comment trailing the last import on its line would stay put and end up
  // beside whichever import is moved there.
  const lineEnd = source.text.indexOf("\n", end);
  const commentEnd = lineEnd === -1 ? source.text.length : lineEnd;
  if (!contiguous || hasCommentWithin(source, start, commentEnd)) {
    return null;
  }
  const ordered = fixedOrder(entries);
  if (!isSorted(ordered)) {
    return null;
  }
  let replacement = "";
  let previousGroup: number | null = null;
  for (const entry of ordered) {
    if (previousGroup !== null) {
      replacement += entry.group === previousGroup ? "\n" : "\n\n";
    }
    replacement += source.getText(entry.node);
    previousGroup = entry.group;
  }
  return (fixer): RuleTextEdit => fixer.replaceTextRange([start, end], replacement);
}

/**
 * Reports the first import member that sorts before the one ahead of it, with
 * a fix that sorts the whole member list when it is safe. Returns whether a
 * report was made.
 */
function reportMemberOrder(
  context: ExplicitContext,
  source: ExplicitSourceCode,
  imports: TSESTree.ImportDeclaration[],
): boolean {
  for (const node of imports) {
    const members = namedSpecifiers(node);
    for (const [index, member] of members.entries()) {
      const before = members[index - 1];
      if (before === undefined) {
        continue;
      }
      const name = memberName(member);
      const previous = memberName(before);
      if (compareMembers(name, previous) >= 0) {
        continue;
      }
      const fix = fixMemberOrder(source, node, members);
      context.report({
        node: member,
        messageId: "memberOrder",
        data: { name, previous },
        ...(fix === null ? {} : { fix }),
      });
      return true;
    }
  }
  return false;
}

/**
 * Reports the first import out of group order, sort order, or blank-line
 * spacing, with a fix that rewrites the whole block when it is safe.
 */
function reportImportOrder(
  context: ExplicitContext,
  source: ExplicitSourceCode,
  body: TSESTree.ProgramStatement[],
  imports: TSESTree.ImportDeclaration[],
): void {
  const entries: ImportEntry[] = imports.map((node) => ({
    node,
    specifier: node.source.value,
    group: importGroup(node.source.value),
  }));
  for (const [index, current] of entries.entries()) {
    const previous = entries[index - 1];
    if (previous === undefined) {
      continue;
    }
    const between = source.text.slice(previous.node.range[1], current.node.range[0]);
    const blankLine = (between.match(NEWLINE_PATTERN) ?? []).length >= 2;
    const problem = orderProblem(previous, current, blankLine);
    if (problem === null) {
      continue;
    }
    const fix = fixImportBlock(source, body, entries);
    context.report({
      node: current.node,
      messageId: problem.messageId,
      data: Object.fromEntries(problem.data),
      ...(fix === null ? {} : { fix }),
    });
    return;
  }
}

/**
 * `enforce-import-order` - groups imports as packages, then `#` aliases, then
 * relative paths, separated by a blank line and each sorted by code point.
 * Names inside the braces are sorted too, ignoring case and any `type`
 * modifier.
 *
 * The fix rewrites the import block, unless a comment or another statement
 * sits between the imports, so nothing gets discarded. Side-effect imports
 * stay where they are and no import is moved across one.
 */
export const enforceImportOrderRule: ExplicitRule = {
  meta: {
    type: "layout",
    docs: {
      description: "Enforce grouped and sorted import declarations and import members",
      url: docsUrl("enforce-import-order"),
    },
    fixable: "code",
    schema: [],
    messages: {
      memberOrder: "Expected '{{name}}' before '{{previous}}'.",
      groupOrder: "Expected {{group}} imports before {{previous}} imports.",
      missingBlankLine: "Expected a blank line between {{previous}} imports and {{group}} imports.",
      extraBlankLine: "Unexpected blank line between {{group}} imports.",
      sourceOrder: "Expected '{{specifier}}' before '{{previous}}'.",
    },
  },
  create(context) {
    const source = context.sourceCode;
    return {
      "Program:exit"(program: TSESTree.Program): void {
        const body = program.body;
        const imports = body.filter(
          (statement): statement is TSESTree.ImportDeclaration =>
            statement.type === "ImportDeclaration",
        );
        if (!reportMemberOrder(context, source, imports)) {
          reportImportOrder(context, source, body, imports);
        }
      },
    };
  },
};
