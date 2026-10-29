import type { RuleTextEdit } from "@eslint/core";

import {
  docsUrl,
  entryAt,
  type ExplicitRule,
  findImportsConfig,
  isOwnedBy,
  quoteLike,
  resolveLocalSpecifier,
  stripQuery,
  visitSpecifiers,
} from "#helpers";

/**
 * `no-parent-import` - rejects `../` specifiers in every file, owned by an
 * alias or not, rewriting one to its `#` alias where `package.json` declares
 * an alias for that file, in any spelling TypeScript resolves to it.
 *
 * Reaching up and back down couples two files through their layout instead
 * of a name. Anything above a file is reached through an alias.
 */
export const noParentImportRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow parent-relative module specifiers",
      url: docsUrl("no-parent-import"),
    },
    fixable: "code",
    schema: [],
    messages: {
      parentImport: "Unexpected parent-relative import '{{specifier}}'.",
      useAlias: "Parent-relative import '{{specifier}}' should be '{{alias}}'.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      if (!specifier.startsWith("../")) {
        return;
      }
      const config = findImportsConfig(context.filename);
      const resolved = resolveLocalSpecifier(context.filename, specifier);
      const entry = config === null || resolved === null ? null : entryAt(config, resolved);
      // The alias of the importing file's own area is no fix: that import is
      // a cycle, which "enforce-layer-order" reports.
      if (config === null || entry === null || isOwnedBy(config, context.filename, entry)) {
        context.report({ node, messageId: "parentImport", data: { specifier } });
        return;
      }
      context.report({
        node,
        messageId: "useAlias",
        data: { specifier, alias: entry.specifier },
        // A query or fragment changes what is imported, and the alias cannot
        // carry one, so such a specifier is reported without a fix.
        fix:
          stripQuery(specifier) === specifier
            ? (fixer): RuleTextEdit => fixer.replaceText(node, quoteLike(node, entry.specifier))
            : null,
      });
    });
  },
};
