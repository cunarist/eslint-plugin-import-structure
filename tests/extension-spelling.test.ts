/**
 * Regression: a specifier names a module whether it spells the file's own
 * extension, swaps it for another script extension, or drops it, as
 * `nodenext` code writes `./index.js` and bundler code `./index` for
 * `./index.ts`. So an own-entry cycle is caught however it is spelled, no
 * suggestion names the entry point or the importer itself, and a path to an
 * alias's target is rewritten to the alias in any spelling.
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
 * file alias of `b/f.ts`, and `#pat/*` sends `#pat/x` to `a/x`.
 */
function owned(path: string): string {
  return fixture(`owned/${path}`);
}

const MAIN = owned("main.ts");

const ONE = owned("a/one.ts");

const SIBLING = owned("b/g.ts");

/** A case that fails with the given errors. */
interface InvalidCase {
  code: string;
  filename: string;
  errors: ExpectedError[];
  output?: string;
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

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [importing("#pat/two", ONE), importing("./index.css", ONE)],
  invalid: [
    ownEntry("#pat/index"),
    ownEntry("#pat/index.js"),
    ownEntry("#a/index.js"),
    ownEntry("#a/index"),
    ownEntry("./index.js"),
    ownEntry("./index"),
  ],
});

testRule("no-barrel-bypass", rule("no-barrel-bypass"), {
  valid: [],
  invalid: [
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

testRule("prefer-alias-import", rule("prefer-alias-import"), {
  valid: [importing("./b/f.css", MAIN)],
  invalid: [
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
  ],
});

testRule("no-parent-import", rule("no-parent-import"), {
  valid: [],
  invalid: [
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
