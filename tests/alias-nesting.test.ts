/**
 * Regression: an alias may sit inside another alias's area. The deeper alias
 * owns its part, carved out of the outer area, and the outer alias owns the
 * rest, so every file has one owner: the alias with the deepest area holding
 * it. Each part is reached from outside only through its own alias, a path
 * from the outer area into the inner one included, relative imports stay
 * free inside each part, and the two aliases are ordered like any other pair.
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
 * A file in the `nested/` fixture project: the folder alias `#a-sub` lies
 * inside the folder alias `#a`, and the file alias `#d-file` inside the
 * folder alias `#d`. Each outer alias is declared above its inner one.
 */
function nested(path: string): string {
  return fixture(`nested/${path}`);
}

const A = nested("a/x.ts");

const A_INDEX = nested("a/index.ts");

const SUB = nested("a/sub/x.ts");

const D_FILE = nested("d/file.ts");

const MAIN = nested("main.ts");

const CODE = "export const x = 1;\n";

/** One import of `specifier`, linted as `filename`. */
function importing(specifier: string, filename: string): { code: string; filename: string } {
  return { code: `import { x } from "${specifier}";\n`, filename };
}

/** A relative path into the area of `alias` from outside it. */
function bypass(specifier: string, alias: string): { messageId: string; data: object } {
  return { messageId: "bypass", data: { specifier, alias } };
}

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    // a nested alias is no overlap
    { code: CODE, filename: SUB },
    { code: CODE, filename: nested("a/sub/index.ts") },
    { code: CODE, filename: nested("a/sub/deep/y.ts") },
    { code: CODE, filename: A },
    { code: CODE, filename: D_FILE },
    { code: CODE, filename: nested("d/other.ts") },

    // the outer area imports the inner one, declared below it
    importing("#a-sub", A),
    importing("#a-sub", A_INDEX),
    importing("#d-file", nested("d/other.ts")),
  ],
  invalid: [
    // the inner area imports the outer one, declared above it
    {
      ...importing("#a", SUB),
      errors: [{ messageId: "upward", data: { owner: "#a-sub", target: "#a" } }],
    },
    {
      ...importing("#a/y.ts", SUB),
      errors: [{ messageId: "upward", data: { owner: "#a-sub", target: "#a" } }],
    },
    {
      ...importing("#d", D_FILE),
      errors: [{ messageId: "upward", data: { owner: "#d-file", target: "#d" } }],
    },

    // the inner area's own entry point is its own, not the outer one's
    {
      ...importing("./index.ts", SUB),
      errors: [{ messageId: "ownEntry", data: { owner: "#a-sub", specifier: "./index.ts" } }],
    },
  ],
});

testRule("no-relative-bypass", rule("no-relative-bypass"), {
  valid: [
    // relative imports inside the inner area
    importing("./y.ts", SUB),
    importing("./deep/z.ts", SUB),

    // relative imports inside the outer area, outside the inner one
    importing("./y.ts", A),
    importing("./other/z.ts", A),
    importing("./y.ts", A_INDEX),
    importing("./y.ts", nested("d/other.ts")),
  ],
  invalid: [
    // from the outer area into the inner one
    { ...importing("./sub/x.ts", A), errors: [bypass("./sub/x.ts", "#a-sub")] },
    { ...importing("./sub/deep/y.ts", A), errors: [bypass("./sub/deep/y.ts", "#a-sub")] },
    { ...importing("./sub", A), errors: [bypass("./sub", "#a-sub")] },
    { ...importing("./sub/x.ts", A_INDEX), errors: [bypass("./sub/x.ts", "#a-sub")] },

    // from outside both, each part through its own alias
    { ...importing("./a/sub/x.ts", MAIN), errors: [bypass("./a/sub/x.ts", "#a-sub")] },
    { ...importing("./a/x.ts", MAIN), errors: [bypass("./a/x.ts", "#a")] },

    // a file alias owns only itself, so its folder is the outer area
    { ...importing("./y.ts", D_FILE), errors: [bypass("./y.ts", "#d")] },
  ],
});

testRule("prefer-alias-import", rule("prefer-alias-import"), {
  valid: [importing("./index.ts", SUB), importing("./index.ts", A)],
  invalid: [
    {
      ...importing("./sub/index.ts", A),
      output: 'import { x } from "#a-sub";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./sub/index.ts", alias: "#a-sub" } }],
    },
    {
      ...importing("./file.ts", nested("d/index.ts")),
      output: 'import { x } from "#d-file";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "./file.ts", alias: "#d-file" } }],
    },
  ],
});

testRule("no-parent-import", rule("no-parent-import"), {
  valid: [],
  invalid: [
    // the outer entry point is another area's, so it has an alias to use
    {
      ...importing("../index.ts", SUB),
      output: 'import { x } from "#a";\n',
      errors: [{ messageId: "useAlias", data: { specifier: "../index.ts", alias: "#a" } }],
    },
    { ...importing("../y.ts", SUB), errors: [{ messageId: "parentImport" }] },
  ],
});

/** A deeper specifier reaching past `alias`, suggesting the alias itself. */
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
  valid: [importing("#a", MAIN), importing("#a-sub", MAIN), importing("#d-file", MAIN)],
  invalid: [
    // a deep specifier through the outer alias into the inner area
    { ...importing("#a/sub/x.ts", MAIN), errors: [deeper("#a/sub/x.ts", "#a-sub")] },
    { ...importing("#a/sub", MAIN), errors: [deeper("#a/sub", "#a-sub")] },
    { ...importing("#d/file.ts", MAIN), errors: [deeper("#d/file.ts", "#d-file")] },

    // the rest of the outer area, and a path that climbs out of it
    { ...importing("#a/x.ts", MAIN), errors: [deeper("#a/x.ts", "#a")] },
    { ...importing("#a/../d/x.ts", MAIN), errors: [deeper("#a/../d/x.ts", "#a")] },
    { ...importing("#a-sub/x.ts", MAIN), errors: [deeper("#a-sub/x.ts", "#a-sub")] },
  ],
});
