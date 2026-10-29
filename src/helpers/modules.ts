/**
 * Looks up the areas the `#` aliases of a `package.json` `imports` config
 * own: which alias owns a file, which one a specifier names, and whether an
 * import touches an owned area at all.
 *
 * An alias owns its target minus the area of any deeper alias inside it. An
 * alias to a folder's `index.ts` owns that folder and everything below it;
 * an alias to any other file owns only that file. Where one area lies inside
 * another, the deeper alias owns its part and the outer one owns the rest, so
 * every file has a single owner: the alias with the deepest area holding it.
 * Two aliases on the same area tie, which `enforce-layer-order` reports.
 * Nothing here depends on folder or file names.
 */

import {
  findImportsConfig,
  type ImportsConfig,
  type ModuleEntry,
  type PatternEntry,
  QUERY_PATTERN,
  SLASHED_DRIVE_PATTERN,
} from "./imports.ts";
import { isInsideDir, normalizePath, parentDir, resolveFrom } from "./paths.ts";

/**
 * Whether a normalized path lies in the area an alias owns. A folder alias's
 * area includes the folder path itself, so a directory specifier such as
 * `./utils` cannot reach the area by path.
 */
function ownsPath(entry: ModuleEntry, path: string): boolean {
  return (
    entry.target === path ||
    (entry.isBarrel && (path === entry.dir || isInsideDir(path, entry.dir)))
  );
}

/**
 * The aliases that own a file: those whose area holds it and lies deepest,
 * in declaration order. An outer alias gives way to any alias inside its
 * area, so this is one alias unless two share the same area, which
 * `enforce-layer-order` reports as an overlap.
 */
export function owningEntries(config: ImportsConfig, filePath: string): ModuleEntry[] {
  const path = normalizePath(filePath);
  let owners: ModuleEntry[] = [];
  for (const entry of config.entries) {
    const deepest = owners[0];
    if (!ownsPath(entry, path)) {
      continue;
    }
    if (deepest === undefined || entry.dir.length > deepest.dir.length) {
      owners = [entry];
    } else if (entry.dir.length === deepest.dir.length) {
      owners.push(entry);
    }
  }
  return owners;
}

/**
 * Whether `entry` owns a file. A file two aliases share an area on counts as
 * inside both, so the overlap is reported once by `enforce-layer-order`
 * rather than again as a bypass.
 */
export function isOwnedBy(config: ImportsConfig, filePath: string, entry: ModuleEntry): boolean {
  return owningEntries(config, filePath).some((owner) => owner.index === entry.index);
}

/**
 * Finds the alias that owns a file, the one with the deepest area holding
 * it; the first declared when two share that area. Returns `null` for a file
 * no alias owns.
 */
export function findOwningEntry(config: ImportsConfig, filePath: string): ModuleEntry | null {
  return owningEntries(config, filePath)[0] ?? null;
}

/**
 * The exact alias a deeper `#` specifier reaches past, such as `#utils` for
 * `#utils/internal.ts`, whether or not a subpath pattern makes it resolve.
 * It is the owner of the file the specifier names: the file a matching
 * subpath pattern resolves to, or else, under a folder alias prefix, the rest
 * of the specifier read as a path in that folder. So `#a/sub/x.ts` reaches
 * past `#a-sub` when that alias owns `a/sub/`. A named file no alias owns
 * falls back to the longest alias prefix. Returns `null` when no alias is a
 * prefix.
 */
export function deeperAliasOwner(config: ImportsConfig, specifier: string): ModuleEntry | null {
  let best: ModuleEntry | null = null;
  for (const entry of config.entries) {
    if (
      specifier.startsWith(`${entry.specifier}/`) &&
      (best === null || entry.specifier.length > best.specifier.length)
    ) {
      best = entry;
    }
  }
  if (best === null) {
    return null;
  }
  const path = namedPath(config, specifier, best);
  return (path === null ? null : findOwningEntry(config, path)) ?? best;
}

/**
 * The file a deeper `#` specifier names under the alias prefix `prefix`:
 * where a subpath pattern sends it, or else, for a folder alias, the rest of
 * the specifier read as a path in that folder. Returns `null` when neither
 * applies.
 */
function namedPath(config: ImportsConfig, specifier: string, prefix: ModuleEntry): string | null {
  const pattern = findPatternEntry(config, specifier);
  if (pattern !== null) {
    return patternPath(config, pattern, specifier);
  }
  if (!prefix.isBarrel) {
    return null;
  }
  const rest = specifier.slice(prefix.specifier.length + 1).replace(QUERY_PATTERN, "");
  return resolveFrom(prefix.dir, `./${rest}`);
}

/** The file a subpath pattern resolves a `#` specifier matching it to. */
function patternPath(config: ImportsConfig, pattern: PatternEntry, specifier: string): string {
  const matched = specifier
    .slice(pattern.prefix.length, specifier.length - pattern.suffix.length)
    .replace(QUERY_PATTERN, "");
  return resolveFrom(config.configDir, pattern.target.replaceAll("*", matched));
}

/**
 * Finds the subpath pattern a deep `#` specifier reaches through, such as
 * `#utils/*` for `#utils/internal.ts`. Returns `null` when none match.
 */
export function findPatternEntry(config: ImportsConfig, specifier: string): PatternEntry | null {
  for (const pattern of config.patterns) {
    if (
      specifier.length >= pattern.prefix.length + pattern.suffix.length &&
      specifier.startsWith(pattern.prefix) &&
      specifier.endsWith(pattern.suffix)
    ) {
      return pattern;
    }
  }
  return null;
}

/**
 * Resolves the module a `#` specifier belongs to, whether it is an exact
 * entry such as `#utils` or a deep one such as `#utils/internal.ts`.
 */
export function targetModule(config: ImportsConfig, specifier: string): ModuleEntry | null {
  const exact = config.bySpecifier.get(specifier);
  if (exact !== undefined) {
    return exact;
  }
  return deeperAliasOwner(config, specifier);
}

/**
 * Resolves a local module specifier far enough to tell which file it names.
 * Package specifiers have no local target, so they give `null`.
 */
export function resolveLocalSpecifier(filename: string, specifier: string): string | null {
  const path = specifier.replace(QUERY_PATTERN, "");
  if (specifier.startsWith(".")) {
    return resolveFrom(parentDir(normalizePath(filename)), path);
  }
  if (specifier.startsWith("file:")) {
    return normalizePath(path);
  }
  if (specifier.startsWith("/")) {
    const absolute = normalizePath(path);
    return SLASHED_DRIVE_PATTERN.test(absolute) ? absolute.slice(1) : absolute;
  }
  if (!specifier.startsWith("#")) {
    return null;
  }

  const config = findImportsConfig(filename);
  if (config === null) {
    return null;
  }
  const exact = config.bySpecifier.get(specifier);
  if (exact !== undefined) {
    return exact.target;
  }
  const pattern = findPatternEntry(config, specifier);
  return pattern === null ? null : patternPath(config, pattern, specifier);
}

/**
 * The module a specifier points at, whether it was written as a `#` alias or
 * as a path. Resolving both means the layer rules cannot be sidestepped by
 * spelling the same target a different way. Returns `null` for specifiers
 * that leave the project, such as package names.
 */
export function resolveTarget(
  config: ImportsConfig,
  filename: string,
  specifier: string,
): ModuleEntry | null {
  if (specifier.startsWith("#")) {
    return targetModule(config, specifier);
  }
  if (!specifier.startsWith(".")) {
    return null;
  }
  const resolved = resolveFrom(parentDir(normalizePath(filename)), specifier);
  return config.byTarget.get(resolved) ?? null;
}

/** Whether a path lies in the area some alias owns. */
export function isModulePath(config: ImportsConfig, path: string): boolean {
  return findOwningEntry(config, path) !== null;
}

/**
 * Whether an import touches an owned area: the importing file or the file it
 * names lies in one. Imports between files no alias owns, such as
 * `vite.config.ts` reaching `./scripts/build.ts`, give `false`, and so does
 * everything in a project whose `package.json` declares no `#` alias.
 */
export function isInModuleScope(filename: string, specifier: string): boolean {
  const config = findImportsConfig(filename);
  if (config === null) {
    return false;
  }
  if (isModulePath(config, filename)) {
    return true;
  }
  const target = resolveLocalSpecifier(filename, specifier);
  return target !== null && isModulePath(config, target);
}
