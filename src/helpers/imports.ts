/**
 * Reads the `#` entries of the nearest `package.json` `imports` field, the
 * Node.js subpath imports that name a project's modules and, by their order,
 * its layers.
 */

import { readFileSync, statSync } from "node:fs";

import { normalizePath, parentDir, resolveFrom, stemName } from "./paths.ts";

/**
 * File name stems that mark a directory's public entry point. Compared
 * without the extension so `.ts`, `.tsx`, `.js` and friends all count. Only
 * `index` qualifies; a `mod` file is a plain module.
 */
export const BARREL_STEMS: string[] = ["index"];

/** Entry-point stems the `enforce-mod-file` rule rejects. */
export const REJECTED_STEMS: string[] = ["mod"];

/** The config file searched for in every directory up from a file. */
const CONFIG_NAME = "package.json";

/** A query or fragment suffix, which never names part of a path. */
export const QUERY_PATTERN: RegExp = /[?#].*$/u;

/**
 * A specifier without its query or fragment, such as `#a/x.js` for
 * `#a/x.js?raw`. The `#` that starts an alias is kept.
 */
export function stripQuery(specifier: string): string {
  const alias = specifier.startsWith("#") ? "#" : "";
  return alias + specifier.slice(alias.length).replace(QUERY_PATTERN, "");
}

/** A path written with a Windows drive after a leading slash, as in `/C:/dir`. */
export const SLASHED_DRIVE_PATTERN: RegExp = /^\/[a-zA-Z]:/u;

/** A single `#`-prefixed entry of the `imports` map in `package.json`. */
export interface ModuleEntry {
  /** The bare specifier, such as `#utils`. */
  specifier: string;
  /** Normalized absolute path the specifier resolves to. */
  target: string;
  /**
   * The directory this module owns. For a barrel such as
   * `./src/utils/index.ts` this is `./src/utils`, meaning every file below it
   * belongs to the module. For a plain file entry it equals `target`, so the
   * module owns nothing but itself.
   */
  dir: string;
  /** Whether `target` is a barrel file rather than a plain module. */
  isBarrel: boolean;
  /** Declaration order in `package.json`, which defines the layer order. */
  index: number;
}

/**
 * A `#`-prefixed subpath pattern with one `*`, such as `#utils/*`, which lets
 * importers reach files inside a module directly.
 */
export interface PatternEntry {
  /** The whole pattern key, such as `#utils/*`. */
  specifier: string;
  /** The key before its `*`, such as `#utils/`. */
  prefix: string;
  /** The key after its `*`, usually empty. */
  suffix: string;
  /** The target as written, such as `./src/utils/*`. */
  target: string;
}

/** The `#`-prefixed portion of a `package.json` `imports` map. */
export interface ImportsConfig {
  /** Normalized absolute directory containing the config file. */
  configDir: string;
  /** Exact `#` entries in declaration order. */
  entries: ModuleEntry[];
  /** Lookup from a normalized absolute path to the entry pointing at it. */
  byTarget: Map<string, ModuleEntry>;
  /** Lookup from a bare specifier such as `#utils` to its entry. */
  bySpecifier: Map<string, ModuleEntry>;
  /** Subpath patterns, longest prefix first. */
  patterns: PatternEntry[];
}

/** A config file read from disk, and the modification time it was read at. */
interface CachedConfig {
  mtimeMs: number;
  config: ImportsConfig | null;
}

/**
 * Parsed configs keyed by file path. An entry is reused only while the file's
 * modification time is unchanged, so an editor session sees edits.
 */
const configCache: Map<string, CachedConfig> = new Map();

/** The modification time of a file, or `null` when it does not exist. */
function modifiedAt(path: string): number | null {
  try {
    const stats = statSync(path, { throwIfNoEntry: false });
    return stats?.isFile() === true ? stats.mtimeMs : null;
  } catch {
    return null;
  }
}

/**
 * Walks up from a file to the nearest `package.json` and reads its
 * `#`-prefixed imports. Like Node.js, the search stops at that file even when
 * it declares no `#` entries, so a nested package never borrows the imports
 * of an enclosing one. Returns `null` when no `package.json` exists up the
 * tree, or when the nearest one cannot be read or declares no local `#` entry.
 */
export function findImportsConfig(fromFile: string): ImportsConfig | null {
  let dir = parentDir(normalizePath(fromFile));
  for (;;) {
    const configPath = `${dir}/${CONFIG_NAME}`;
    const mtimeMs = modifiedAt(configPath);
    if (mtimeMs !== null) {
      return cachedConfig(configPath, dir, mtimeMs);
    }
    const parent = parentDir(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/** One config file, read through the cache. */
function cachedConfig(
  configPath: string,
  configDir: string,
  mtimeMs: number,
): ImportsConfig | null {
  const cached = configCache.get(configPath);
  if (cached?.mtimeMs === mtimeMs) {
    return cached.config;
  }
  const config = readConfig(configPath, configDir);
  configCache.set(configPath, { mtimeMs, config });
  return config;
}

/** The `imports` object of a parsed `package.json`, or `null` if it has none. */
function importsField(parsed: unknown): object | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const imports: unknown = Reflect.get(parsed, "imports");
  return typeof imports === "object" && imports !== null ? imports : null;
}

/**
 * Parses one config file and returns its `imports` object. `null` when the
 * file is unreadable, is not JSON, or has no `imports` object.
 */
function readImportsField(configPath: string): object | null {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
  return importsField(parsed);
}

/**
 * Whether an `imports` entry is a `#` alias with a relative string target.
 * Only those point at local files. A "#" alias for a package, or a condition
 * object, is legitimate but irrelevant here.
 */
function isLocalEntry(specifier: string, value: unknown): value is string {
  return (
    specifier.startsWith("#") &&
    typeof value === "string" &&
    (value.startsWith("./") || value.startsWith("../"))
  );
}

/** A subpath pattern entry, split around the `*` at index `star`. */
function patternEntry(specifier: string, star: number, target: string): PatternEntry {
  return {
    specifier,
    prefix: specifier.slice(0, star),
    suffix: specifier.slice(star + 1),
    target,
  };
}

/** An exact entry, resolved from the config directory, declared at `index`. */
function moduleEntry(
  configDir: string,
  specifier: string,
  value: string,
  index: number,
): ModuleEntry {
  const target = resolveFrom(configDir, value);
  const isBarrel = BARREL_STEMS.includes(stemName(target));
  return {
    specifier,
    target,
    dir: isBarrel ? parentDir(target) : target,
    isBarrel,
    index,
  };
}

/**
 * Reads and parses one config file. Returns `null` when the file
 * is unreadable, is not JSON, or has no local `#` entries.
 */
function readConfig(configPath: string, configDir: string): ImportsConfig | null {
  const imports = readImportsField(configPath);
  if (imports === null) {
    return null;
  }

  const entries: ModuleEntry[] = [];
  const byTarget: Map<string, ModuleEntry> = new Map();
  const bySpecifier: Map<string, ModuleEntry> = new Map();
  const patterns: PatternEntry[] = [];

  for (const [specifier, value] of Object.entries(imports)) {
    if (!isLocalEntry(specifier, value)) {
      continue;
    }

    const star = specifier.indexOf("*");
    if (star !== -1) {
      patterns.push(patternEntry(specifier, star, value));
      continue;
    }

    const entry = moduleEntry(configDir, specifier, value, entries.length);
    entries.push(entry);
    bySpecifier.set(specifier, entry);
    // First declaration wins when two specifiers share a target.
    if (!byTarget.has(entry.target)) {
      byTarget.set(entry.target, entry);
    }
  }

  if (entries.length === 0 && patterns.length === 0) {
    return null;
  }

  patterns.sort((left, right) => right.prefix.length - left.prefix.length);

  return { configDir, entries, byTarget, bySpecifier, patterns };
}
