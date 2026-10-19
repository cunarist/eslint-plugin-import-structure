/**
 * The ordering `enforce-import-order` checks: import groups, specifier
 * comparison, and the fixed order of a whole import block.
 */

import type { TSESTree } from "@typescript-eslint/types";

/** The three import groups, in the order they must appear. */
const IMPORT_GROUPS: string[] = ["package", "`#` alias", "relative"];

/**
 * Classifies a specifier into its `IMPORT_GROUPS` index. Anything that is
 * neither a `#` alias nor a path is a package, which covers bare names,
 * `node:` builtins, and URLs alike.
 */
export function importGroup(specifier: string): number {
  if (specifier.startsWith("#")) {
    return 1;
  }
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return 2;
  }
  return 0;
}

/** The name of a group, for a message. */
export function groupName(group: number): string {
  return IMPORT_GROUPS[group] ?? "";
}

/**
 * Orders specifiers by code point rather than locale, so the result does not
 * depend on collation rules that quietly ignore punctuation.
 */
export function compareSpecifiers(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

/** One import declaration with its specifier and group. */
export interface ImportEntry {
  node: TSESTree.ImportDeclaration;
  specifier: string;
  group: number;
}

/**
 * Whether an import only runs a module for its side effects, as in
 * `import "./polyfill.ts";`. Such imports can depend on running before or
 * after their neighbours, so the fix never moves them.
 */
export function isSideEffect(node: TSESTree.ImportDeclaration): boolean {
  return node.specifiers.length === 0;
}

/** Sorts imports by group, then by specifier. */
export function compareEntries(left: ImportEntry, right: ImportEntry): number {
  return left.group - right.group || compareSpecifiers(left.specifier, right.specifier);
}

/**
 * The imports in their fixed order: side-effect imports keep their places,
 * and the imports in each run between them are sorted within that run, so no
 * import crosses a side-effect import.
 */
export function fixedOrder(entries: ImportEntry[]): ImportEntry[] {
  const ordered: ImportEntry[] = [];
  let run: ImportEntry[] = [];
  for (const entry of entries) {
    if (isSideEffect(entry.node)) {
      ordered.push(...run.toSorted(compareEntries), entry);
      run = [];
    } else {
      run.push(entry);
    }
  }
  ordered.push(...run.toSorted(compareEntries));
  return ordered;
}

/**
 * Whether imports are in group order and sorted within each group, which is
 * what the rewrite needs to clear every order problem.
 */
export function isSorted(entries: ImportEntry[]): boolean {
  return entries.every((entry, index) => {
    const previous = entries[index - 1];
    return previous === undefined || compareEntries(previous, entry) <= 0;
  });
}

/** A problem between two neighbouring imports, as a message and its data. */
export interface OrderProblem {
  messageId: string;
  data: Map<string, string>;
}

/** What is wrong between two neighbouring imports, or `null` if nothing. */
export function orderProblem(
  previous: ImportEntry,
  current: ImportEntry,
  blankLine: boolean,
): OrderProblem | null {
  const names = new Map([
    ["group", groupName(current.group)],
    ["previous", groupName(previous.group)],
  ]);
  if (current.group < previous.group) {
    return { messageId: "groupOrder", data: names };
  }
  if (current.group > previous.group && !blankLine) {
    return { messageId: "missingBlankLine", data: names };
  }
  if (current.group === previous.group && blankLine) {
    return { messageId: "extraBlankLine", data: names };
  }
  if (
    current.group === previous.group &&
    compareSpecifiers(current.specifier, previous.specifier) < 0
  ) {
    return {
      messageId: "sourceOrder",
      data: new Map([
        ["specifier", current.specifier],
        ["previous", previous.specifier],
      ]),
    };
  }
  return null;
}
