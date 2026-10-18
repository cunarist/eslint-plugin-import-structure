/**
 * The `project` plugin's import rule: `no-asset-imports`.
 *
 * @module
 */

import type { TSESTree } from "@typescript-eslint/types";

import type { ProjectRule } from "./project-lint-types.ts";

/** A module specifier read as a path: relative, absolute, or a `#` alias. */
const PATH_SPECIFIER_PATTERN: RegExp = /^[./#]/u;

/**
 * Extensions a module specifier may end in: our own `.ts` files and `.js`,
 * `.mts`, or `.mjs` package subpaths. Matched as whole extensions, so `.cjs`
 * and `.cts` stay banned.
 */
const MODULE_EXTENSIONS: ReadonlySet<string> = new Set<string>(["ts", "js", "mts", "mjs"]);

/**
 * Whether `source` names an asset rather than a module: a query string such
 * as `?raw`, or a final path segment with an extension other than `.ts`,
 * `.js`, `.mts`, or `.mjs`. Bare package names are left alone, dots and all, as are
 * extensionless paths.
 */
function isAssetSource(source: string): boolean {
  if (source.includes("?")) {
    return true;
  }
  const segments: string[] = source.split("/");
  if (!PATH_SPECIFIER_PATTERN.test(source)) {
    const nameLength: number = source.startsWith("@") ? 2 : 1;
    if (segments.length <= nameLength) {
      return false;
    }
  }
  const lastSegment: string = segments.at(-1) ?? "";
  if (lastSegment === "." || lastSegment === ".." || !lastSegment.includes(".")) {
    return false;
  }
  const extension: string = lastSegment.slice(lastSegment.lastIndexOf(".") + 1);
  return !MODULE_EXTENSIONS.has(extension);
}

/**
 * `no-asset-imports` - rejects importing anything but a `.ts`, `.js`, `.mts`,
 * or `.mjs` module (the last three cover package subpaths such as
 * `lit/decorators.js` or `pdfjs-dist/legacy/build/pdf.mjs`): a source path,
 * static or a dynamic `import()` with a string literal, ending in another
 * extension (`.css`, `.json`, `.svg`, `.jsx`, `.tsx`, `.cjs`) or carrying a
 * query string (`?raw`, `?url`), and any import or export with import
 * attributes. Bare package names, `#` aliases, and `node:` builtins without an
 * extension pass; package subpaths are checked like paths.
 */
export const noAssetImportsRule: ProjectRule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow importing assets instead of .ts, .js, .mts, or .mjs modules" },
    schema: [],
    messages: {
      extension: "Only .ts, .js, .mts and .mjs modules may be imported.",
      attributes: "Import attributes are not allowed.",
    },
  },
  create(context) {
    function checkSource(source: TSESTree.StringLiteral): void {
      if (isAssetSource(source.value)) {
        context.report({ node: source, messageId: "extension" });
      }
    }
    function checkDeclaration(
      node:
        | TSESTree.ImportDeclaration
        | TSESTree.ExportNamedDeclaration
        | TSESTree.ExportAllDeclaration,
    ): void {
      if (node.source === null) {
        return;
      }
      checkSource(node.source);
      if (node.attributes.length > 0) {
        context.report({ node, messageId: "attributes" });
      }
    }
    return {
      ImportDeclaration: checkDeclaration,
      ExportNamedDeclaration: checkDeclaration,
      ExportAllDeclaration: checkDeclaration,
      ImportExpression(node: TSESTree.ImportExpression): void {
        if (node.source.type === "Literal" && typeof node.source.value === "string") {
          checkSource(node.source);
        }
        if (node.options !== null) {
          context.report({ node, messageId: "attributes" });
        }
      },
    };
  },
};
