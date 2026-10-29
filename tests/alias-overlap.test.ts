/**
 * Regression: no two aliases may share an area. Two folder aliases or two
 * file aliases with the same target make every file of that area belong to
 * both. Lint cannot report on `package.json`, so `enforce-layer-order` fires
 * once at the top of every file such a tie owns, and leaves every other file
 * alone. The other rules count such a file as inside both areas, so the
 * overlap is the only report. An alias inside another alias's area is no
 * overlap; see `alias-nesting.test.ts`.
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
 * A file in the `overlap/` fixture project: `#c2` repeats the folder alias
 * `#c`, and `#e2` repeats the file alias `#e`.
 */
function overlap(path: string): string {
  return fixture(`overlap/${path}`);
}

const CODE = "export const x = 1;\n";

/** The one error for a file that `aliases` all own. */
function ownedBy(aliases: string): { messageId: string; data: { aliases: string } }[] {
  return [{ messageId: "overlap", data: { aliases } }];
}

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    // files no alias owns
    { code: CODE, filename: overlap("main.ts") },
    { code: CODE, filename: overlap("e-other.ts") },
  ],
  invalid: [
    // two folder aliases with the same target
    { code: CODE, filename: overlap("c/x.ts"), errors: ownedBy("#c, #c2") },
    { code: CODE, filename: overlap("c/index.ts"), errors: ownedBy("#c, #c2") },
    { code: CODE, filename: overlap("c/sub/y.ts"), errors: ownedBy("#c, #c2") },

    // two file aliases with the same target
    { code: CODE, filename: overlap("e.ts"), errors: ownedBy("#e, #e2") },
  ],
});

/** One import of `specifier`, linted as `filename`. */
function importing(specifier: string, filename: string): { code: string; filename: string } {
  return { code: `import { x } from "${specifier}";\n`, filename };
}

testRule("no-relative-bypass", rule("no-relative-bypass"), {
  // c/x.ts is owned by both #c and #c2, so c/ is inside either area
  valid: [importing("./y.ts", overlap("c/x.ts")), importing("./sub/y.ts", overlap("c/x.ts"))],
  invalid: [],
});

testRule("prefer-alias-import", rule("prefer-alias-import"), {
  // c/index.ts is the own entry point of both, left to enforce-layer-order
  valid: [importing("./index.ts", overlap("c/x.ts"))],
  invalid: [],
});
