/**
 * Regression: an alias owns its target. An alias to a folder's `index.ts`
 * owns that folder and everything below it; an alias to any other file owns
 * only that file. Outside an owned area, only the exact alias reaches it;
 * inside, relative imports of siblings and subfolders are free. `../` is
 * banned in every file, and files no alias owns import `./` paths freely.
 * Nothing here depends on folder names: aliases sit at any depth and in any
 * top-level folder, and a target need not exist yet.
 */

import plugin from "#plugin";
import { fixture, type TestedRule, testRule } from "#testing";

/** The published rule with this id. */
function rule(id: string): TestedRule {
  const found = plugin.rules?.[id];
  if (found === undefined) {
    throw new Error(`no rule named ${id}`);
  }
  return found;
}

/**
 * A file in the `owned/` fixture project, whose aliases are `#a` (a folder),
 * `#f` (a file next to unowned ones), `#deep` (a folder three levels down),
 * `#tool` (a file in another top-level folder), and `#gen` (a file that
 * does not exist, like build output). Its `#pat/*.js` and `#lib/*` patterns
 * have no exact alias of their own.
 */
function owned(path: string): string {
  return fixture(`owned/${path}`);
}

const MAIN = owned("main.ts");

const ONE = owned("a/one.ts");

const SIBLING = owned("b/g.ts");

const FILE_ALIAS = owned("b/f.ts");

/** One import of `specifier`, linted as `filename`. */
function importing(specifier: string, filename: string): { code: string; filename: string } {
  return { code: `import { x } from "${specifier}";\n`, filename };
}

testRule("no-parent-import", rule("no-parent-import"), {
  valid: [importing("./two.ts", ONE), importing("#f", ONE)],
  invalid: [
    // in an owned file, even toward a file of the same area
    { ...importing("../x.ts", ONE), errors: [{ messageId: "parentImport" }] },
    {
      ...importing("../index.ts", owned("a/sub/deep.ts")),
      errors: [{ messageId: "parentImport" }],
    },
    {
      ...importing("../../q.ts", owned("src/x/y/z/w.ts")),
      errors: [{ messageId: "parentImport" }],
    },

    // in files no alias owns, too
    {
      ...importing("../main.ts", owned("tools/other.ts")),
      errors: [{ messageId: "parentImport" }],
    },
    { ...importing("../scripts/build.ts", fixture("tests/a.test.ts")), errors: 1 },
    { ...importing("../vite.config.ts", fixture("scripts/build.ts")), errors: 1 },

    // still rewrites a path that names an alias's exact target
    {
      ...importing("../a/index.ts", SIBLING),
      output: 'import { x } from "#a";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "../a/index.ts", alias: "#a" } }],
    },
  ],
});

testRule("no-relative-bypass", rule("no-relative-bypass"), {
  valid: [
    // inside an area, siblings and subfolders at any depth
    importing("./two.ts", ONE),
    importing("./sub/deep.ts", ONE),
    importing("./sub/deeper/x.ts", owned("a/index.ts")),
    importing("./z/w.ts", owned("src/x/y/index.ts")),

    // files no alias owns, from anywhere, with no index.ts demanded
    importing("./b/g.ts", MAIN),
    importing("./b/sub/h.ts", MAIN),
    importing("./c/any/where.ts", MAIN),
    importing("./build/other.ts", MAIN),
    importing("./h.ts", SIBLING),
    importing("./sub/deep.ts", SIBLING),

    // a file alias owns only its file, so its neighbors stay free
    importing("./g.ts", FILE_ALIAS),
    importing("./sub/deep.ts", FILE_ALIAS),

    // an alias's exact target is left to prefer-alias-import
    importing("./a/index.ts", MAIN),
    importing("./b/f.ts", MAIN),

    // the main fixture: files no alias owns import each other by path
    importing("./scripts/decorators.ts", fixture("vite.config.ts")),
    importing("./scripts/mod.ts", fixture("vite.config.ts")),
    importing("./sub/deep/thing.ts", fixture("scripts/build.ts")),
    importing("./utils/y.ts", fixture("src/types/index.ts")),
  ],
  invalid: [
    // a relative path into an area from outside it
    {
      ...importing("./a/one.ts", MAIN),
      errors: [{ messageId: "bypass", data: { specifier: "./a/one.ts", alias: "#a" } }],
    },
    {
      ...importing("./a/sub/deep.ts", MAIN),
      errors: [{ messageId: "bypass", data: { specifier: "./a/sub/deep.ts", alias: "#a" } }],
    },
    // a directory specifier names the folder an alias owns
    {
      ...importing("./a", MAIN),
      errors: [{ messageId: "bypass", data: { specifier: "./a", alias: "#a" } }],
    },
    {
      ...importing("./a/", MAIN),
      errors: [{ messageId: "bypass", data: { specifier: "./a/", alias: "#a" } }],
    },
    {
      ...importing("./y/z/w.ts", owned("src/x/other.ts")),
      errors: [{ messageId: "bypass", data: { specifier: "./y/z/w.ts", alias: "#deep" } }],
    },
    {
      ...importing("./src/utils/y.ts", fixture("vite.config.ts")),
      errors: [{ messageId: "bypass", data: { specifier: "./src/utils/y.ts", alias: "#utils" } }],
    },
  ],
});

testRule("prefer-alias-import", rule("prefer-alias-import"), {
  valid: [importing("./b/g.ts", MAIN), importing("./index.ts", ONE), importing("#gen", MAIN)],
  invalid: [
    // a file alias, from a folder above and from a sibling it owns nothing of
    {
      ...importing("./b/f.ts", MAIN),
      output: 'import { x } from "#f";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./b/f.ts", alias: "#f" } }],
    },
    {
      ...importing("./f.ts", SIBLING),
      output: 'import { x } from "#f";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./f.ts", alias: "#f" } }],
    },
    {
      ...importing("./lint.ts", owned("tools/other.ts")),
      output: 'import { x } from "#tool";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./lint.ts", alias: "#tool" } }],
    },

    // a folder alias, and an alias whose target does not exist yet
    { ...importing("./a/index.ts", MAIN), output: 'import { x } from "#a";\n', errors: 1 },
    {
      ...importing("./build/generated.ts", MAIN),
      output: 'import { x } from "#gen";\n',
      errors: 1,
    },
    {
      ...importing("./src/utils/index.ts", fixture("vite.config.ts")),
      output: 'import { x } from "#utils";\n',
      errors: 1,
    },
  ],
});

/** A bypass of `alias` through `specifier`, suggesting the alias itself. */
function deeper(
  specifier: string,
  alias: string,
): {
  messageId: string;
  data: { specifier: string; owner: string };
  suggestions: { messageId: string; data: { owner: string }; output: string }[];
} {
  return {
    messageId: "bypass",
    data: { specifier, owner: alias },
    suggestions: [
      { messageId: "useEntry", data: { owner: alias }, output: `import { x } from "${alias}";\n` },
    ],
  };
}

testRule("no-barrel-bypass", rule("no-barrel-bypass"), {
  valid: [importing("#a", MAIN), importing("#f", MAIN), importing("#gen", MAIN)],
  invalid: [
    // a deeper alias specifier, even with no "/*" pattern declared
    { ...importing("#a/one.ts", MAIN), errors: [deeper("#a/one.ts", "#a")] },
    { ...importing("#deep/z/w.ts", SIBLING), errors: [deeper("#deep/z/w.ts", "#deep")] },
    { ...importing("#f/x.ts", owned("tools/lint.ts")), errors: [deeper("#f/x.ts", "#f")] },
  ],
});

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    importing("#a", MAIN),
    importing("#gen", owned("tools/lint.ts")),
    importing("#tool", owned("src/x/y/z/w.ts")),
    { code: "export const x = 1;\n", filename: owned("build/generated.ts") },
  ],
  invalid: [
    // the layer order holds for aliases at any depth and location
    {
      ...importing("#a", FILE_ALIAS),
      errors: [{ messageId: "upward", data: { owner: "#f", target: "#a" } }],
    },
    {
      ...importing("#f", owned("src/x/y/z/w.ts")),
      errors: [{ messageId: "upward", data: { owner: "#deep", target: "#f" } }],
    },
  ],
});
