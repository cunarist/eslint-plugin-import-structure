/**
 * Regression: no file may be owned by two aliases. An alias inside another
 * alias's area and two aliases with the same target both make some file
 * belong to two areas. Lint cannot report on `package.json`, so
 * `enforce-layer-order` fires once at the top of every file two aliases
 * claim, and leaves every other file alone. The other rules count such a
 * file as inside every area that claims it, so the overlap is the only
 * report.
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
 * A file in the `overlap/` fixture project: `#a-sub` lies inside `#a`,
 * `#c2` repeats `#c`, `#d-file` lies inside `#d`, and `#e2` repeats `#e`.
 */
function overlap(path: string): string {
  return fixture(`overlap/${path}`);
}

const CODE = "export const x = 1;\n";

/** The one error for a file that `aliases` all claim. */
function claimedBy(aliases: string): { messageId: string; data: { aliases: string } }[] {
  return [{ messageId: "overlap", data: { aliases } }];
}

testRule("enforce-layer-order", rule("enforce-layer-order"), {
  valid: [
    // files only one alias claims
    { code: CODE, filename: overlap("a/x.ts") },
    { code: CODE, filename: overlap("a/index.ts") },
    { code: CODE, filename: overlap("d/other.ts") },
    { code: CODE, filename: overlap("main.ts") },
  ],
  invalid: [
    // a folder alias inside another
    { code: CODE, filename: overlap("a/sub/x.ts"), errors: claimedBy("#a, #a-sub") },
    { code: CODE, filename: overlap("a/sub/index.ts"), errors: claimedBy("#a, #a-sub") },
    { code: CODE, filename: overlap("a/sub/deep/y.ts"), errors: claimedBy("#a, #a-sub") },

    // two folder aliases with the same target
    { code: CODE, filename: overlap("c/x.ts"), errors: claimedBy("#c, #c2") },

    // a file alias inside a folder alias
    { code: CODE, filename: overlap("d/file.ts"), errors: claimedBy("#d, #d-file") },

    // two file aliases with the same target
    { code: CODE, filename: overlap("e.ts"), errors: claimedBy("#e, #e2") },
  ],
});

/** One import of `specifier`, linted as `filename`. */
function importing(specifier: string, filename: string): { code: string; filename: string } {
  return { code: `import { x } from "${specifier}";\n`, filename };
}

testRule("no-relative-bypass", rule("no-relative-bypass"), {
  // d/file.ts is claimed by #d too, so d/ is not outside its area
  valid: [importing("./x.ts", overlap("d/file.ts")), importing("./sub/y.ts", overlap("d/file.ts"))],
  invalid: [],
});

testRule("prefer-alias-import", rule("prefer-alias-import"), {
  // d/index.ts is #d's own entry point, left to enforce-layer-order
  valid: [importing("./index.ts", overlap("d/file.ts"))],
  invalid: [],
});
