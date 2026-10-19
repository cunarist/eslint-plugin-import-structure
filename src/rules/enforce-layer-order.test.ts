import { fixture, spanOf, testRule } from "#testing";

import { enforceLayerOrderRule } from "./enforce-layer-order.ts";

const UTILS = fixture("src/utils/index.ts");

const INTERNAL = fixture("src/components/internal.ts");

const upwardCode = 'import { components } from "#components";\n';

/** An error for `#utils` importing `target`, declared above it. */
function upward(target: string): { messageId: string; data: { owner: string; target: string } } {
  return { messageId: "upward", data: { owner: "#utils", target } };
}

/** An error for `#components` importing its own entry point as `specifier`. */
function ownEntry(specifier: string): {
  messageId: string;
  data: { owner: string; specifier: string };
} {
  return { messageId: "ownEntry", data: { owner: "#components", specifier } };
}

testRule("enforce-layer-order", enforceLayerOrderRule, {
  valid: [
    // allows importing modules declared below
    {
      code: 'import { utils } from "#utils";\nimport type { Thing } from "#types";\n',
      filename: fixture("src/components/index.ts"),
    },

    // ignores files outside every declared module
    { code: upwardCode, filename: fixture("scripts/build.ts") },

    // a file entry owns only itself, not its whole directory
    { code: upwardCode, filename: fixture("src/other.ts") },

    // a mod file is a plain file entry, so its folder stays unowned
    { code: upwardCode, filename: fixture("src/legacy/helper.ts") },

    // leaves a substituted backtick specifier alone, since nothing is known
    {
      code: `const n = 'components';\nconst m = await import(\`#\${n}\`);\nexport const x = m;\n`,
      filename: UTILS,
    },

    // never fires for a "#" specifier the nearest package.json lacks
    upwardCode,

    // stops at the nearest package.json, like Node.js, even without imports
    { code: upwardCode, filename: fixture("src/utils/vendored/index.ts") },
  ],
  invalid: [
    // a mod file entry still owns itself
    {
      code: upwardCode,
      filename: fixture("src/legacy/mod.ts"),
      errors: [{ messageId: "upward", data: { owner: "#legacy", target: "#components" } }],
    },

    // rejects importing a module declared above
    {
      code: upwardCode,
      filename: UTILS,
      errors: [{ ...upward("#components"), ...spanOf(upwardCode, '"#components"') }],
    },
    {
      code: 'import { store } from "#app-store";\n',
      filename: UTILS,
      errors: [upward("#app-store")],
    },

    // treats a deep specifier as its owning module
    {
      code: 'import { internal } from "#components/internal.ts";\n',
      filename: UTILS,
      errors: [upward("#components")],
    },

    // sees a type-level import expression and a backtick specifier
    {
      code: 'type T = import("#components").Thing;\nexport type U = T;\n',
      filename: UTILS,
      errors: [upward("#components")],
    },
    {
      code: "const m = await import(`#components`);\nexport const x = m;\n",
      filename: UTILS,
      errors: [upward("#components")],
    },

    // reports once at the top of a file two aliases claim
    {
      code: "export const x = 1;\n",
      filename: fixture("overlap/a/sub/x.ts"),
      errors: [{ messageId: "overlap", data: { aliases: "#a, #a-sub" }, line: 1, column: 1 }],
    },

    // rejects a module importing its own entry point, by alias or by path
    { code: upwardCode, filename: INTERNAL, errors: [ownEntry("#components")] },
    {
      code: 'import { x } from "./index.ts";\n',
      filename: INTERNAL,
      errors: [ownEntry("./index.ts")],
    },
    {
      code: 'type T = import("./index.ts").Thing;\nexport type U = T;\n',
      filename: INTERNAL,
      errors: [ownEntry("./index.ts")],
    },

    // treats type-only imports and re-exports like any other import
    {
      code: 'import type { Thing } from "#components";\nexport type { Thing };\n',
      filename: UTILS,
      errors: [upward("#components")],
    },
    {
      code: 'import { type Thing } from "#components";\nexport type { Thing };\n',
      filename: UTILS,
      errors: [upward("#components")],
    },
    {
      code: 'export type { Thing } from "#components";\n',
      filename: UTILS,
      errors: [upward("#components")],
    },
    {
      code: 'import type { X } from "./index.ts";\nexport type { X };\n',
      filename: INTERNAL,
      errors: [ownEntry("./index.ts")],
    },
  ],
});
