/**
 * Regression: a `/*` subpath pattern is credited to the owner of the file it
 * resolves to, even with no exact alias of the same name and with a query
 * string after the specifier. So `#pat/x.js?raw` under `"#pat/*.js":
 * "./a/*.ts"` reaches past `#a`, and the layer order applies to it. Inside
 * the area, the alias is never suggested; a `./` path is, when one exists.
 * A pattern into files no alias owns is credited to no alias, whatever its
 * name.
 */

import plugin from "#plugin";
import { type ExpectedError, fixture, type TestedRule, testRule } from "#testing";

/** The published rule with this id. */
function rule(id: string): TestedRule {
  const found = plugin.rules?.[id];
  if (found === undefined) {
    throw new Error(`no rule named ${id}`);
  }
  return found;
}

/**
 * A file in the `owned/` fixture project, whose `#pat/*.js` pattern sends
 * `#pat/x.js` to `a/x.ts`, owned by `#a`, ahead of the shorter `#pat/*`
 * declared before it, as Node.js does, and whose `#lib/*` pattern sends
 * `#lib/f.ts` to `b/f.ts`, the target of the file alias `#f`. Its
 * `#tool/*` pattern shares the name of the file alias `#tool` but sends
 * `#tool/x.ts` to the unowned `vendor/x.ts`.
 */
function owned(path: string): string {
  return fixture(`owned/${path}`);
}

const MAIN = owned("main.ts");

const ONE = owned("a/one.ts");

const DEEP = owned("a/sub/deep.ts");

const FILE_ALIAS = owned("b/f.ts");

const TOOL = owned("tools/lint.ts");

/** One import of `specifier`, linted as `filename`. */
function importing(specifier: string, filename: string): { code: string; filename: string } {
  return { code: `import { x } from "${specifier}";\n`, filename };
}

/** A case that fails with the given errors. */
interface InvalidCase {
  code: string;
  filename: string;
  errors: ExpectedError[];
}

/**
 * A deep specifier from outside the area of `owner`, suggesting `owner`
 * unless it carries a query or fragment, which the alias would lose.
 */
function bypass(specifier: string, owner: string): InvalidCase {
  const output = `import { x } from "${owner}";\n`;
  const hasQuery = /[?#]/u.test(specifier.slice(1));
  return {
    ...importing(specifier, MAIN),
    errors: [
      {
        messageId: "bypass",
        data: { specifier, owner },
        suggestions: hasQuery ? [] : [{ messageId: "useEntry", data: { owner }, output }],
      },
    ],
  };
}

/** A deep specifier into the importer's own area `#a`, suggesting `path`. */
function ownArea(specifier: string, filename: string, path: string | null): InvalidCase {
  return {
    ...importing(specifier, filename),
    errors: [
      {
        messageId: "ownArea",
        data: { specifier, owner: "#a" },
        suggestions:
          path === null
            ? []
            : [
                {
                  messageId: "useRelative",
                  data: { path },
                  output: `import { x } from "${path}";\n`,
                },
              ],
      },
    ],
  };
}

testRule("no-barrel-bypass", rule("no-barrel-bypass"), {
  valid: [
    importing("#a?raw", MAIN),
    importing("#lib/g.ts", MAIN),

    // a pattern into unowned files, from an unowned file, whatever its name
    importing("#tool/x.ts", MAIN),
  ],
  invalid: [
    // a pattern with no exact alias of its name reaches past the file's owner
    bypass("#pat/x.js", "#a"),
    bypass("#lib/f.ts", "#f"),

    // a query string or fragment does not stop the pattern from matching
    bypass("#pat/x.js?raw", "#a"),
    bypass("#pat/x.js#frag", "#a"),

    // a pattern into unowned files is credited to no alias, not its namesake
    {
      ...importing("#tool/x.ts", TOOL),
      errors: [{ messageId: "internals", data: { specifier: "#tool/x.ts" }, suggestions: [] }],
    },
    {
      ...importing("#tool/x.ts", ONE),
      errors: [{ messageId: "internals", data: { specifier: "#tool/x.ts" }, suggestions: [] }],
    },

    // inside the area, a relative path, never the area's own alias
    ownArea("#pat/sub/x.js", ONE, "./sub/x.ts"),
    ownArea("#pat/sub/x.ts", ONE, "./sub/x.ts"),
    ownArea("#pat/two.js?raw", ONE, "./two.ts?raw"),

    // no suggestion where only `../`, the entry point, or the file itself fits
    ownArea("#pat/x.js", DEEP, null),
    ownArea("#pat/index.js", ONE, null),
    ownArea("#pat/one.js", ONE, null),
  ],
});

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    // `#a` is declared above `#f`, so it may import `#f` by any spelling
    importing("#lib/f.ts", ONE),
    importing("#lib/f.ts?raw", ONE),

    // a deep specifier to a non-entry file of the own area is no cycle; it is
    // left to no-barrel-bypass
    importing("#pat/sub/x.js", ONE),
    importing("#a/two.ts", ONE),

    // a pattern into unowned files has no layer
    importing("#tool/x.ts", ONE),
  ],
  invalid: [
    // `#f` is declared below `#a`, through a pattern or a query alike
    {
      ...importing("#pat/x.js", FILE_ALIAS),
      errors: [{ messageId: "upward", data: { owner: "#f", target: "#a" } }],
    },
    {
      ...importing("#pat/x.js?raw", FILE_ALIAS),
      errors: [{ messageId: "upward", data: { owner: "#f", target: "#a" } }],
    },
    {
      ...importing("#pat/index.js", ONE),
      errors: [{ messageId: "ownEntry", data: { owner: "#a", specifier: "#pat/index.js" } }],
    },
    {
      ...importing("./index.ts?raw", ONE),
      errors: [{ messageId: "ownEntry", data: { owner: "#a", specifier: "./index.ts?raw" } }],
    },
  ],
});
