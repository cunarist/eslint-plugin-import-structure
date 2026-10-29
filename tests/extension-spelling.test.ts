/**
 * Regression: a specifier names a module in any spelling TypeScript resolves
 * to it, as `nodenext` code writes `./index.js` and bundler code `./index`
 * for `./index.ts`, but never another module kind beside it, such as
 * `./f.mts` beside `f.ts`. So an own-entry cycle is caught however it is
 * spelled, no suggestion names the entry point or the importer itself, and
 * a path to an alias's target is rewritten to the alias in any spelling,
 * unless a query or fragment, which the alias cannot carry, would be lost.
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
 * A file in the `owned/` fixture project, where `#a` owns `a/`, `#f` is the
 * file alias of `b/f.ts`, `#pat/*` sends `#pat/x` to `a/x`, `#lib/*` sends
 * `#lib/x` to `b/x`, and `#xt`, declared first, and `#x` alias `c/x.tsx`
 * and `c/x.ts`.
 */
function owned(path: string): string {
  return fixture(`owned/${path}`);
}

const MAIN = owned("main.ts");

const ONE = owned("a/one.ts");

const SIBLING = owned("b/g.ts");

/** A file owned by `#deep`, declared below `#f`. */
const DEEP = owned("src/x/y/z.ts");

/** A case that fails with the given errors. */
interface InvalidCase {
  code: string;
  filename: string;
  errors: ExpectedError[];
  output?: string | null;
}

/** One import of `specifier`, linted as `filename`. */
function importing(specifier: string, filename: string): { code: string; filename: string } {
  return { code: `import { x } from "${specifier}";\n`, filename };
}

/** `a/one.ts` importing its own entry point `#a` as `specifier`. */
function ownEntry(specifier: string): InvalidCase {
  return {
    ...importing(specifier, ONE),
    errors: [{ messageId: "ownEntry", data: { owner: "#a", specifier } }],
  };
}

/** `a/one.ts` reaching into its own area `#a`, with no suggestion. */
function ownArea(specifier: string): InvalidCase {
  return {
    ...importing(specifier, ONE),
    errors: [{ messageId: "ownArea", data: { specifier, owner: "#a" }, suggestions: [] }],
  };
}

/** A file beside the file alias `#f`'s target, of another module kind. */
const DUAL = owned("b/f.mts");

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    importing("#pat/two", ONE),
    importing("./index.css", ONE),

    // `b/f.mts` is another module than `#f`'s `b/f.ts`, not part of it
    importing("./f.ts", DUAL),
  ],
  invalid: [
    ownEntry("#pat/index"),
    ownEntry("#pat/index.js"),
    ownEntry("#a/index.js"),
    ownEntry("#a/index"),
    ownEntry("./index.js"),
    ownEntry("./index"),

    // the layer order sees a file alias's target in any spelling
    upwardToF("#lib/f.ts"),
    upwardToF("#lib/f.js"),
    upwardToF("#lib/f"),
  ],
});

/** `src/x/y/z.ts`, owned by `#deep`, importing `#f`'s target, declared above. */
function upwardToF(specifier: string): InvalidCase {
  return {
    ...importing(specifier, DEEP),
    errors: [{ messageId: "upward", data: { owner: "#deep", target: "#f" } }],
  };
}

/** `main.ts` reaching `alias`'s target by the path `specifier`, fixed to it. */
function useAlias(specifier: string, alias: string): InvalidCase {
  return {
    ...importing(specifier, MAIN),
    output: `import { x } from "${alias}";\n`,
    errors: [{ messageId: "useAlias", data: { specifier, alias } }],
  };
}

/** A deeper specifier from `main.ts` past the file alias `#f`. */
function pastF(specifier: string): InvalidCase {
  return {
    ...importing(specifier, MAIN),
    errors: [
      {
        messageId: "bypass",
        data: { specifier, owner: "#f" },
        suggestions: [
          { messageId: "useEntry", data: { owner: "#f" }, output: 'import { x } from "#f";\n' },
        ],
      },
    ],
  };
}

testRule("no-barrel-bypass", rule("no-barrel-bypass"), {
  valid: [],
  invalid: [
    // a pattern naming a file alias's target in another spelling reaches past it
    pastF("#lib/f.js"),
    pastF("#lib/f"),

    // never the entry point or the importer itself
    ownArea("#pat/index"),
    ownArea("#a/index.js"),
    ownArea("#pat/one"),
    ownArea("#a/one.js"),

    // a sibling keeps the spelling it was written with
    {
      ...importing("#pat/two", ONE),
      errors: [
        {
          messageId: "ownArea",
          data: { specifier: "#pat/two", owner: "#a" },
          suggestions: [
            {
              messageId: "useRelative",
              data: { path: "./two" },
              output: 'import { x } from "./two";\n',
            },
          ],
        },
      ],
    },
  ],
});

testRule("no-self-import", rule("no-self-import"), {
  valid: [importing("./one.css", ONE), importing("./two.js", ONE), importing("./f.ts", DUAL)],
  invalid: [
    { ...importing("./one.js", ONE), errors: [{ messageId: "selfImport" }] },
    { ...importing("./one", ONE), errors: [{ messageId: "selfImport" }] },
    { ...importing("#pat/one", ONE), errors: [{ messageId: "selfImport" }] },
    { ...importing("#pat/one.js?raw", ONE), errors: [{ messageId: "selfImport" }] },
  ],
});

testRule("prefer-alias-import", rule("prefer-alias-import"), {
  // other module kinds beside `b/f.ts` are other files
  valid: [
    importing("./b/f.css", MAIN),
    importing("./b/f.mts", MAIN),
    importing("./b/f.tsx", MAIN),
    importing("./b/f.cjs", MAIN),
  ],
  invalid: [
    // a query or fragment is reported without a fix, since the alias would
    // lose it
    {
      ...importing("./b/f.ts?raw", MAIN),
      output: null,
      errors: [{ messageId: "useAlias", data: { specifier: "./b/f.ts?raw", alias: "#f" } }],
    },
    {
      ...importing("./b/f.js", MAIN),
      output: 'import { x } from "#f";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./b/f.js", alias: "#f" } }],
    },
    {
      ...importing("./a/index", MAIN),
      output: 'import { x } from "#a";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./a/index", alias: "#a" } }],
    },

    // the file TypeScript tries first wins, not the alias declared first
    useAlias("./c/x", "#x"),
    useAlias("./c/x.js", "#x"),
    useAlias("./c/x.tsx", "#xt"),
    useAlias("./c/x.jsx", "#xt"),
  ],
});

testRule("no-parent-import", rule("no-parent-import"), {
  valid: [],
  invalid: [
    {
      ...importing("../b/f.mts", ONE),
      output: null,
      errors: [{ messageId: "parentImport", data: { specifier: "../b/f.mts" } }],
    },
    {
      ...importing("../b/f.ts?raw", ONE),
      output: null,
      errors: [{ messageId: "useAlias", data: { specifier: "../b/f.ts?raw", alias: "#f" } }],
    },
    {
      ...importing("../a/index.js", SIBLING),
      output: 'import { x } from "#a";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "../a/index.js", alias: "#a" } }],
    },
  ],
});

testRule("no-relative-bypass", rule("no-relative-bypass"), {
  // a path to an alias's target is prefer-alias-import's, in any spelling
  valid: [importing("./b/f.js", MAIN), importing("./a/index", MAIN)],
  invalid: [],
});
