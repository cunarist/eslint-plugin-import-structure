import { fixture, spanOf, testRule } from "#testing";

import { noRelativeBypassRule } from "./no-relative-bypass.ts";

const SRC = fixture("src/index.ts");

const COMPONENTS = fixture("src/components/index.ts");

const internalCode = 'import { internal } from "./components/internal.ts";\n';

testRule("no-relative-bypass", noRelativeBypassRule, {
  valid: [
    // allows siblings and subfolders at any depth inside one area
    {
      code: 'import { a } from "./internal.ts";\nimport { b } from "./sub/deep/thing.ts";\n',
      filename: COMPONENTS,
    },

    // leaves an alias's exact target to prefer-alias-import
    {
      code: 'import { a } from "./components/index.ts";\nimport { b } from "./app-store.ts";\n',
      filename: SRC,
    },

    // ignores parent and package specifiers
    {
      code: 'import { utils } from "../utils/deep/thing.ts";\nimport { html } from "lit/directives/class-map.js";\n',
      filename: SRC,
    },

    // lets files no alias owns be imported by any path, with no index.ts demanded
    {
      code: 'import { decorators } from "./scripts/decorators.ts";\n',
      filename: fixture("vite.config.ts"),
    },
    {
      code: 'import { deep } from "./sub/deep/thing.ts";\n',
      filename: fixture("scripts/build.ts"),
    },
    {
      code: 'import { thing } from "./unmapped/thing.ts";\n',
      filename: fixture("src/utils/index.ts"),
    },
    {
      code: 'import { thing } from "./unmapped/deep/thing.ts";\n',
      filename: SRC,
    },

    // inside an alias nested in another's area, and beside it in the outer area
    { code: 'import { y } from "./y.ts";\n', filename: fixture("nested/a/sub/x.ts") },
    { code: 'import { y } from "./y.ts";\n', filename: fixture("nested/a/x.ts") },
  ],
  invalid: [
    // rejects a path from an outer area into an alias nested in it
    {
      code: 'import { x } from "./sub/x.ts";\n',
      filename: fixture("nested/a/x.ts"),
      errors: [{ messageId: "bypass", data: { specifier: "./sub/x.ts", alias: "#a-sub" } }],
    },

    // rejects a relative path into an area from outside it
    {
      code: internalCode,
      filename: SRC,
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "./components/internal.ts", alias: "#components" },
          ...spanOf(internalCode, '"./components/internal.ts"'),
        },
      ],
    },

    // treats a mod file in an area as an internal file, not an entry point
    {
      code: 'import { legacy } from "./components/mod.ts";\n',
      filename: SRC,
      errors: [
        { messageId: "bypass", data: { specifier: "./components/mod.ts", alias: "#components" } },
      ],
    },

    // sees a re-export, a dynamic import, and a deep path into an area
    {
      code: 'export * from "./src/utils/a.ts";\nconst m = await import("./src/utils/sub/b.ts");\n',
      filename: fixture("index.ts"),
      errors: [
        { messageId: "bypass", data: { specifier: "./src/utils/a.ts", alias: "#utils" } },
        { messageId: "bypass", data: { specifier: "./src/utils/sub/b.ts", alias: "#utils" } },
      ],
    },

    // treats type-only imports like any other import
    {
      code: 'import type { Internal } from "./components/internal.ts";\nexport type { X } from "./components/x.ts";\n',
      filename: SRC,
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "./components/internal.ts", alias: "#components" },
        },
        { messageId: "bypass", data: { specifier: "./components/x.ts", alias: "#components" } },
      ],
    },
  ],
});
