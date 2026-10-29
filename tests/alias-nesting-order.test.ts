/**
 * Regression: nested alias ownership holds whatever the declaration order,
 * at any depth, and through subpath patterns. An inner alias declared above
 * its outer one still owns its part, 3 nested aliases each own their own
 * slice, and a deep specifier that a `/*` pattern resolves elsewhere reaches
 * past the owner of the file the pattern names, not of the path it spells.
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
 * A file in the `nested/` fixture project: `#e-sub` is declared above `#e`,
 * `#g-mid-in` lies inside `#g-mid` inside `#g`, and `#f/*` sends deep `#f`
 * specifiers into the `#f-lib` area, away from `#f-sub`.
 */
function nested(path: string): string {
  return fixture(`nested/${path}`);
}

const E = nested("e/x.ts");

const E_SUB = nested("e/sub/x.ts");

const G = nested("g/x.ts");

const G_MID = nested("g/mid/x.ts");

const G_IN = nested("g/mid/in/x.ts");

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

/** An import of `target` from an area declared below it. */
function upward(owner: string, target: string): { messageId: string; data: object } {
  return { messageId: "upward", data: { owner, target } };
}

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    { code: CODE, filename: E },
    { code: CODE, filename: E_SUB },
    { code: CODE, filename: G_MID },
    { code: CODE, filename: G_IN },

    // the inner area, declared above, imports the outer one
    importing("#e", E_SUB),

    // each level imports the ones inside it, declared below
    importing("#g-mid", G),
    importing("#g-mid-in", G),
    importing("#g-mid-in", G_MID),
  ],
  invalid: [
    { ...importing("#e-sub", E), errors: [upward("#e", "#e-sub")] },
    { ...importing("#g", G_IN), errors: [upward("#g-mid-in", "#g")] },
    { ...importing("#g-mid", G_IN), errors: [upward("#g-mid-in", "#g-mid")] },
    { ...importing("#g", G_MID), errors: [upward("#g-mid", "#g")] },
  ],
});

testRule("no-relative-bypass", rule("no-relative-bypass"), {
  valid: [
    importing("./y.ts", E_SUB),
    importing("./y.ts", E),
    importing("./y.ts", G),
    importing("./y.ts", G_MID),
    importing("./deep/y.ts", G_IN),
  ],
  invalid: [
    { ...importing("./sub/x.ts", E), errors: [bypass("./sub/x.ts", "#e-sub")] },
    { ...importing("./e/sub/x.ts", MAIN), errors: [bypass("./e/sub/x.ts", "#e-sub")] },
    { ...importing("./mid/x.ts", G), errors: [bypass("./mid/x.ts", "#g-mid")] },
    { ...importing("./mid/in/x.ts", G), errors: [bypass("./mid/in/x.ts", "#g-mid-in")] },
    { ...importing("./in/x.ts", G_MID), errors: [bypass("./in/x.ts", "#g-mid-in")] },
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
  valid: [importing("#e-sub", MAIN), importing("#g-mid-in", MAIN), importing("#f-sub", MAIN)],
  invalid: [
    { ...importing("#e/sub/x.ts", MAIN), errors: [deeper("#e/sub/x.ts", "#e-sub")] },
    { ...importing("#g/mid/x.ts", MAIN), errors: [deeper("#g/mid/x.ts", "#g-mid")] },
    { ...importing("#g/mid/in/x.ts", MAIN), errors: [deeper("#g/mid/in/x.ts", "#g-mid-in")] },
    { ...importing("#g-mid/in/x.ts", MAIN), errors: [deeper("#g-mid/in/x.ts", "#g-mid-in")] },

    // the pattern sends `#f/sub/x.ts` to `f/lib/sub/x.ts`, owned by `#f-lib`
    { ...importing("#f/sub/x.ts", MAIN), errors: [deeper("#f/sub/x.ts", "#f-lib")] },
    { ...importing("#f/x.ts", MAIN), errors: [deeper("#f/x.ts", "#f-lib")] },

    // a path that climbs out to a file no alias owns falls back to the prefix
    { ...importing("#g/../main.ts", MAIN), errors: [deeper("#g/../main.ts", "#g")] },
  ],
});
