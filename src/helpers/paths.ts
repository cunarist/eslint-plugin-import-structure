/**
 * Path helpers that work on forward-slash paths, whatever the platform, so
 * `C:\dir\a.ts`, `/dir/a.ts`, and `file:///dir/a.ts` compare alike.
 */

/** A Windows drive path after a leading slash, as in `/C:/dir`. */
const SLASHED_DRIVE_PATTERN: RegExp = /^\/[a-zA-Z]:/u;

/** Every backslash, which Windows uses as a separator. */
const BACKSLASH_PATTERN: RegExp = /\\/gu;

/**
 * Normalizes a path by removing the `file://` prefix and converting
 * backslashes to forward slashes on Windows.
 */
export function normalizePath(path: string): string {
  if (path === "") {
    return path;
  }
  let normalized = path;
  if (normalized.startsWith("file://")) {
    normalized = decodeURIComponent(normalized.slice("file://".length));
    // On Windows the remainder looks like "/C:/dir", so drop the leading
    // slash. On POSIX it looks like "/home/dir", which must keep it.
    if (SLASHED_DRIVE_PATTERN.test(normalized)) {
      normalized = normalized.slice(1);
    }
  }
  return normalized.replace(BACKSLASH_PATTERN, "/");
}

/** The parent directory of a path, without a trailing slash. */
export function parentDir(path: string): string {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index <= 0 ? normalized : normalized.slice(0, index);
}

/** The last segment of a path. */
export function baseName(path: string): string {
  const normalized = normalizePath(path);
  return normalized.slice(normalized.lastIndexOf("/") + 1);
}

/**
 * The last segment without its extension, so `index.ts`, `index.tsx` and
 * `index.js` all yield `index`. A leading dot is kept, so `.gitignore` is its
 * own stem rather than an empty string.
 */
export function stemName(path: string): string {
  const base = baseName(path);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? base : base.slice(0, dot);
}

/**
 * Resolves a relative path such as `../utils/index.ts` against a directory,
 * returning a normalized absolute path.
 */
export function resolveFrom(baseDir: string, relative: string): string {
  const segments = normalizePath(baseDir).split("/");
  for (const segment of normalizePath(relative).split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (segments.length > 1) {
        segments.pop();
      }
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
}

/**
 * Whether a path lies inside a directory. Segment aware, so `/src/utils` does
 * not contain `/src/utils-extra/index.ts`.
 */
export function isInsideDir(path: string, dir: string): boolean {
  return path.startsWith(dir.endsWith("/") ? dir : `${dir}/`);
}

/**
 * The `./` specifier from a directory to a path inside it, such as
 * `./sub/x.ts`. Returns `null` for a path outside the directory, which only
 * a banned `../` specifier could reach.
 */
export function childSpecifier(fromDir: string, path: string): string | null {
  return isInsideDir(path, fromDir)
    ? `./${path.slice(fromDir.replace(/\/$/u, "").length + 1)}`
    : null;
}

/** The extensions of script modules, which a specifier may swap or drop. */
const SCRIPT_EXTENSIONS: Set<string> = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".jsx",
  ".tsx",
]);

/** A path without its last extension when that is a script extension. */
function withoutScriptExtension(path: string): string {
  const dot = path.lastIndexOf(".");
  const isExtension = dot > path.lastIndexOf("/") + 1;
  return isExtension && SCRIPT_EXTENSIONS.has(path.slice(dot)) ? path.slice(0, dot) : path;
}

/**
 * Whether a resolved specifier path names the module file `file`: the same
 * path, or the same path with a script extension swapped or dropped, as
 * `nodenext` code writes `./index.js` and bundler code `./index` for
 * `./index.ts`. Another extension, such as `index.css`, names another file.
 */
export function namesSameModule(path: string, file: string): boolean {
  return path === file || withoutScriptExtension(path) === withoutScriptExtension(file);
}
