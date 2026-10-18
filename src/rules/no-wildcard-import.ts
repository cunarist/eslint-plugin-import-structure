import type { TSESTree } from "@typescript-eslint/types";

import { docsUrl, type ExplicitRule } from "#helpers";

/**
 * `no-wildcard-import` - requires imports to name the bindings they depend
 * on, so `import * as name` is rejected, `type` or not.
 *
 * An explicit list keeps each file's dependency surface narrow and visible at
 * the import site. Side-effect imports and re-exports are left alone.
 */
export const noWildcardImportRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow namespace imports",
      url: docsUrl("no-wildcard-import"),
    },
    schema: [],
    messages: {
      wildcard: "Unexpected wildcard import.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration): void {
        const namespace = node.specifiers.find(
          (specifier) => specifier.type === "ImportNamespaceSpecifier",
        );
        if (namespace !== undefined) {
          context.report({ node: namespace, messageId: "wildcard" });
        }
      },
    };
  },
};
