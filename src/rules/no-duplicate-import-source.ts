import type { TSESTree } from "@typescript-eslint/types";

import { docsUrl, type ExplicitRule } from "#helpers";

/**
 * The declarations in a same-source group that another one in the group can
 * absorb. A value import absorbs anything, so the first one keeps its place
 * and the rest are reported. With no value import, the bare imports collapse
 * into one and the type-only imports into another, and those two survive.
 */
function mergeableImports(group: TSESTree.ImportDeclaration[]): TSESTree.ImportDeclaration[] {
  const typeOnly = group.filter((node) => node.importKind === "type");
  const runtime = group.filter((node) => node.importKind !== "type");
  const firstValue = runtime.find((node) => node.specifiers.length > 0);
  if (firstValue !== undefined) {
    return group.filter((node) => node !== firstValue);
  }
  return [...runtime.slice(1), ...typeOnly.slice(1)];
}

/**
 * `no-duplicate-import-source` - rejects separate static import declarations
 * with the same module specifier. Re-exports and dynamic imports are
 * different operations and are left alone.
 *
 * A type-only import beside a bare one is the exception. The type-only
 * declaration disappears from the emitted module, so folding the bare import
 * into it would drop the side effect that registers a custom element or
 * installs a polyfill. Those two say different things and both have to stay.
 */
export const noDuplicateImportSourceRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow separate import declarations from the same source",
      url: docsUrl("no-duplicate-import-source"),
    },
    schema: [],
    messages: {
      duplicate: "Import source '{{specifier}}' is duplicated.",
    },
  },
  create(context) {
    const groups: Map<string, TSESTree.ImportDeclaration[]> = new Map();
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        const specifier = node.source.value;
        const group = groups.get(specifier) ?? [];
        group.push(node);
        groups.set(specifier, group);
      },
      "Program:exit"(_node: TSESTree.Program): void {
        for (const [specifier, group] of groups) {
          for (const node of mergeableImports(group)) {
            context.report({ node: node.source, messageId: "duplicate", data: { specifier } });
          }
        }
      },
    };
  },
};
