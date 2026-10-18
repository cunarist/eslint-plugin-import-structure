import {
  docsUrl,
  type ExplicitRule,
  findImportsConfig,
  findOwningEntry,
  isClaimedBy,
  resolveLocalSpecifier,
  visitSpecifiers,
} from "#helpers";

/**
 * `no-relative-bypass` - rejects a `./` specifier that reaches into an area
 * an alias owns from outside that area.
 *
 * An alias owns its target: an alias to a folder's `index.ts` owns that
 * folder and everything below it, and an alias to any other file owns only
 * that file. Code outside an area reaches it only through the alias. Inside
 * an area, siblings and subfolders are free, and so are files no alias owns.
 * A path to an alias's exact target is left to `prefer-alias-import`, which
 * rewrites it to the alias.
 */
export const noRelativeBypassRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow relative specifiers that reach into an alias's area from outside it",
      url: docsUrl("no-relative-bypass"),
    },
    schema: [],
    messages: {
      bypass: "'{{specifier}}' reaches into the area of '{{alias}}' from outside it.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      // Parent imports belong to "no-parent-import", and bare or "#"
      // specifiers never walk the file tree.
      if (!specifier.startsWith("./")) {
        return;
      }
      const config = findImportsConfig(context.filename);
      const resolved = resolveLocalSpecifier(context.filename, specifier);
      if (config === null || resolved === null || config.byTarget.has(resolved)) {
        return;
      }
      const target = findOwningEntry(config, resolved);
      if (target === null || isClaimedBy(config, context.filename, target)) {
        return;
      }
      context.report({ node, messageId: "bypass", data: { specifier, alias: target.specifier } });
    });
  },
};
