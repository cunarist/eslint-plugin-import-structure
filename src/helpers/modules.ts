/**
 * Looks up the areas the `#` aliases of a `package.json` `imports` config
 * own: which alias owns a file, which one a specifier names, and whether an
 * import touches an owned area at all.
 *
 * An alias owns its target. An alias to a folder's `index.ts` owns that
 * folder and everything below it; an alias to any other file owns only that
 * file. Nothing here depends on folder or file names.
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
 * Every alias whose area holds a file, in declaration order. More than one
 * means two aliases overlap, which `enforce-layer-order` reports.
 */
export function claimingEntries(config: ImportsConfig, filePath: string): ModuleEntry[] {
  const path = normalizePath(filePath);
  return config.entries.filter((entry) => ownsPath(entry, path));
}

/**
 * Whether `entry` is among the aliases that claim a file. A file two aliases
 * overlap on counts as inside both areas, so the overlap is reported once by
 * `enforce-layer-order` rather than again as a bypass.
 */
export function isClaimedBy(config: ImportsConfig, filePath: string, entry: ModuleEntry): boolean {
  return claimingEntries(config, filePath).some((claimant) => claimant.index === entry.index);
}

/**
 * Finds the alias that owns a file, which is the one with the most specific
 * area containing it. Returns `null` for a file no alias owns.
 */
export function findOwningEntry(config: ImportsConfig, filePath: string): ModuleEntry | null {
  let best: ModuleEntry | null = null;
  for (const entry of claimingEntries(config, filePath)) {
    if (best === null || entry.dir.length > best.dir.length) {
      best = entry;
    }
  }
  return best;
}

/**
 * The exact alias a deeper `#` specifier reaches past, such as `#utils` for
 * `#utils/internal.ts`, whether or not a subpath pattern makes it resolve.
 * The longest alias wins. Returns `null` when no alias is a prefix.
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
  return best;
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
  if (pattern === null) {
    return null;
  }
  const matched = specifier
    .slice(pattern.prefix.length, specifier.length - pattern.suffix.length)
    .replace(QUERY_PATTERN, "");
  return resolveFrom(config.configDir, pattern.target.replaceAll("*", matched));
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
  const normalized = normalizePath(path);
  return config.entries.some((entry) => ownsPath(entry, normalized));
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
