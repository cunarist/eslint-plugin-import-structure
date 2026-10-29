import type { RuleTextEdit } from "@eslint/core";

import {
  childSpecifier,
  deeperAliasOwner,
  deeperAliasPath,
  docsUrl,
  type ExplicitContext,
  type ExplicitRule,
  findImportsConfig,
  findPatternEntry,
  type ImportsConfig,
  isInModuleScope,
  isOwnedBy,
  type ModuleEntry,
  namesSameModule,
  normalizePath,
  parentDir,
  quoteLike,
  type SpecifierNode,
  stripQuery,
  visitSpecifiers,
} from "#helpers";

/**
 * The `./` specifier a file inside `owner`'s area can use instead of a deeper
 * `#` specifier into that same area, keeping any query. `null` when the named
 * file is not in the importer's folder or below, since `../` is banned, or
 * when it is the area's entry point or the importer itself, which
 * `enforce-layer-order` and `no-self-import` reject by any spelling.
 */
function relativeSpecifier(
  config: ImportsConfig,
  filename: string,
  specifier: string,
  owner: ModuleEntry,
): string | null {
  const path = deeperAliasPath(config, specifier);
  const importer = normalizePath(filename);
  if (path === null || namesSameModule(path, owner.target) || namesSameModule(path, importer)) {
    return null;
  }
  const relative = childSpecifier(parentDir(importer), path);
  return relative === null ? null : relative + specifier.slice(stripQuery(specifier).length);
}

/**
 * Reports a deeper `#` specifier into the importing file's own area. The
 * alias itself is never suggested there, since importing it is a cycle;
 * a relative path is, when one without `../` exists.
 */
function reportOwnArea(
  context: ExplicitContext,
  node: SpecifierNode,
  data: { specifier: string; owner: string },
  relative: string | null,
): void {
  context.report({
    node,
    messageId: "ownArea",
    data,
    suggest:
      relative === null
        ? []
        : [
            {
              messageId: "useRelative",
              data: { path: relative },
              fix: (fixer): RuleTextEdit => fixer.replaceText(node, quoteLike(node, relative)),
            },
          ],
  });
}

/**
 * Reports a deeper `#` specifier from outside the area of its owner,
 * suggesting the alias unless a query or fragment, which the alias cannot
 * carry, would be lost.
 */
function reportBypass(
  context: ExplicitContext,
  node: SpecifierNode,
  specifier: string,
  owner: ModuleEntry,
): void {
  context.report({
    node,
    messageId: "bypass",
    data: { specifier, owner: owner.specifier },
    suggest:
      stripQuery(specifier) === specifier
        ? [
            {
              messageId: "useEntry",
              data: { owner: owner.specifier },
              fix: (fixer): RuleTextEdit =>
                fixer.replaceText(node, quoteLike(node, owner.specifier)),
            },
          ]
        : [],
  });
}

/**
 * `no-barrel-bypass` - rejects a `#` specifier deeper than an alias, such as
 * `#components/internal.ts` beside `#components`, whether or not a subpath
 * pattern makes it resolve, and any use of a subpath pattern that reaches
 * into an owned area.
 *
 * Code outside an alias's area reaches it only through the exact alias, so
 * the area keeps one public surface. Switching to the alias is a suggestion,
 * since its target may not export the name yet. Inside the area, the alias
 * is a cycle, so a relative path is suggested instead.
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
      ownArea: "'{{specifier}}' reaches into this file's own area '{{owner}}' through an alias.",
      internals: "'{{specifier}}' reaches into module internals.",
      useEntry: "Import from '{{owner}}' instead.",
      useRelative: "Import from '{{path}}' instead.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      if (!specifier.startsWith("#")) {
        return;
      }
      const config = findImportsConfig(context.filename);
      if (config === null || config.bySpecifier.has(stripQuery(specifier))) {
        return;
      }
      const owner = deeperAliasOwner(config, specifier);
      if (owner === null) {
        // A pattern into files no alias owns, such as a catch-all "#/*",
        // still makes files reachable from an owned area.
        if (
          findPatternEntry(config, specifier) !== null &&
          isInModuleScope(context.filename, specifier)
        ) {
          context.report({ node, messageId: "internals", data: { specifier } });
        }
        return;
      }
      if (isOwnedBy(config, context.filename, owner)) {
        const relative = relativeSpecifier(config, context.filename, specifier, owner);
        reportOwnArea(context, node, { specifier, owner: owner.specifier }, relative);
        return;
      }
      reportBypass(context, node, specifier, owner);
    });
  },
};
