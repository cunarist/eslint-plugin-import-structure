import type { RuleTextEdit } from "@eslint/core";

import {
  deeperAliasOwner,
  docsUrl,
  type ExplicitRule,
  findImportsConfig,
  findPatternEntry,
  isInModuleScope,
  quoteLike,
  visitSpecifiers,
} from "#helpers";

/**
 * `no-barrel-bypass` - rejects a `#` specifier deeper than an alias, such as
 * `#components/internal.ts` beside `#components`, whether or not a subpath
 * pattern makes it resolve, and any use of a subpath pattern that reaches
 * into an owned area.
 *
 * Code outside an alias's area reaches it only through the exact alias, so
 * the area keeps one public surface. Switching to the alias is a suggestion,
 * since its target may not export the name yet.
 */
export const noBarrelBypassRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow `#` specifiers deeper than an alias",
      url: docsUrl("no-barrel-bypass"),
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      bypass: "'{{specifier}}' reaches past the entry point '{{owner}}'.",
      internals: "'{{specifier}}' reaches into module internals.",
      useEntry: "Import from '{{owner}}' instead.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      if (!specifier.startsWith("#")) {
        return;
      }
      const config = findImportsConfig(context.filename);
      if (config === null || config.bySpecifier.has(specifier)) {
        return;
      }
      const owner = deeperAliasOwner(config, specifier);
      if (owner === null) {
        // A pattern no exact alias sits under, such as a catch-all "#/*",
        // still makes files reachable past their alias.
        if (
          findPatternEntry(config, specifier) !== null &&
          isInModuleScope(context.filename, specifier)
        ) {
          context.report({ node, messageId: "internals", data: { specifier } });
        }
        return;
      }
      context.report({
        node,
        messageId: "bypass",
        data: { specifier, owner: owner.specifier },
        suggest: [
          {
            messageId: "useEntry",
            data: { owner: owner.specifier },
            fix: (fixer): RuleTextEdit => fixer.replaceText(node, quoteLike(node, owner.specifier)),
          },
        ],
      });
    });
  },
};
