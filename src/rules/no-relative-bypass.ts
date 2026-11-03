import {
  BARREL_STEMS,
  docsUrl,
  entryAt,
  type ExplicitRule,
  findImportsConfig,
  findOwningEntry,
  type ImportsConfig,
  isInsideDir,
  isOwnedBy,
  isParentSpecifier,
  normalizePath,
  parentDir,
  resolveLocalSpecifier,
  stemName,
  visitSpecifiers,
} from "#helpers";

/** What a `./` specifier breaks, if anything. */
type Problem = { messageId: "bypass"; alias: string } | { messageId: "subfolder" } | null;

/**
 * Whether a path inside an area's folder is reached the way the area allows:
 * a file in the same folder, or the `index` entry point of a direct child
 * folder, in any spelling.
 */
function isReachable(dir: string, path: string): boolean {
  const folder = parentDir(path);
  return folder === dir || (parentDir(folder) === dir && BARREL_STEMS.includes(stemName(path)));
}

/** Checks a resolved `./` path from the importing file against the areas. */
function problemOf(config: ImportsConfig, filename: string, resolved: string): Problem {
  if (entryAt(config, resolved) !== null) {
    return null;
  }
  const target = findOwningEntry(config, resolved);
  if (target === null) {
    return null;
  }
  if (!isOwnedBy(config, filename, target)) {
    return { messageId: "bypass", alias: target.specifier };
  }
  const dir = parentDir(normalizePath(filename));
  return isInsideDir(resolved, dir) && !isReachable(dir, resolved)
    ? { messageId: "subfolder" }
    : null;
}

/**
 * `no-relative-bypass` - rejects a `./` specifier that reaches into an area
 * an alias owns from outside that area, or past a subfolder's `index.ts`
 * inside one.
 *
 * An alias owns its target: an alias to a folder's `index.ts` owns that
 * folder and everything below it, and an alias to any other file owns only
 * that file. Code outside an area reaches it only through the alias. Inside
 * an area, siblings are free and a subfolder is reached only through its own
 * `index.ts`, like a Rust `mod.rs`. Files no alias owns are free. A path to
 * an alias's target, in any spelling TypeScript resolves to it, is left to
 * `prefer-alias-import`, which rewrites it to the alias.
 */
export const noRelativeBypassRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow relative specifiers that reach into an alias's area from outside it or past a subfolder's index file",
      url: docsUrl("no-relative-bypass"),
    },
    schema: [],
    messages: {
      bypass: "'{{specifier}}' reaches into the area of '{{alias}}' from outside it.",
      subfolder:
        "'{{specifier}}' reaches into a subfolder past its 'index.ts', the only file a parent folder may import there.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      // Parent imports belong to "no-parent-import", and bare or "#"
      // specifiers never walk the file tree.
      if (!specifier.startsWith("./") || isParentSpecifier(specifier)) {
        return;
      }
      const config = findImportsConfig(context.filename);
      const resolved = resolveLocalSpecifier(context.filename, specifier);
      if (config === null || resolved === null) {
        return;
      }
      const problem = problemOf(config, context.filename, resolved);
      if (problem?.messageId === "bypass") {
        context.report({ node, messageId: "bypass", data: { specifier, alias: problem.alias } });
      } else if (problem?.messageId === "subfolder") {
        context.report({ node, messageId: "subfolder", data: { specifier } });
      }
    });
  },
};
