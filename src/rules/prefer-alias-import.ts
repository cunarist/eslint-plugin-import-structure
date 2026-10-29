import type { RuleTextEdit } from "@eslint/core";

import {
  docsUrl,
  entryAt,
  type ExplicitRule,
  findImportsConfig,
  isOwnedBy,
  quoteLike,
  resolveLocalSpecifier,
  visitSpecifiers,
} from "#helpers";

/**
 * `prefer-alias-import` - requires the `#` alias when a `./` specifier names
 * the target of an alias, in any script extension spelling, from outside that alias's area, a same-folder
 * sibling included. An alias owns its target, so its target has one spelling
 * everywhere outside it.
 *
 * One spelling per module keeps `package.json` `imports` the single source of
 * truth, and keeps the layer rules from being sidestepped by a path.
 */
export const preferAliasImportRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require the `#` alias for a module that `package.json` declares",
      url: docsUrl("prefer-alias-import"),
    },
    fixable: "code",
    schema: [],
    messages: {
      useAlias: "'{{specifier}}' is declared as '{{alias}}' in package.json.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      // Parent specifiers are banned outright by "no-parent-import", which
      // already offers this same rewrite.
      if (!specifier.startsWith("./")) {
        return;
      }
      const config = findImportsConfig(context.filename);
      const resolved = resolveLocalSpecifier(context.filename, specifier);
      const entry = config === null || resolved === null ? null : entryAt(config, resolved);
      if (config === null || entry === null) {
        return;
      }
      // Reaching the entry point of the importing file's own area is never
      // fixed by switching to the alias, so "enforce-layer-order" owns it.
      if (isOwnedBy(config, context.filename, entry)) {
        return;
      }
      context.report({
        node,
        messageId: "useAlias",
        data: { specifier, alias: entry.specifier },
        fix: (fixer): RuleTextEdit => fixer.replaceText(node, quoteLike(node, entry.specifier)),
      });
    });
  },
};
