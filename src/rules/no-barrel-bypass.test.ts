import { fixture, spanOf, testRule } from "#testing";

import { noBarrelBypassRule } from "./no-barrel-bypass.ts";

const APP_STORE = fixture("src/app-store.ts");

const bypassCode = 'import { internal } from "#components/internal.ts";\n';

testRule("no-barrel-bypass", noBarrelBypassRule, {
  valid: [
    // allows the exact module specifier
    { code: 'import { components } from "#components";\n', filename: APP_STORE },

    // allows a package alias and a specifier no pattern matches
    {
      code: 'import { html } from "#lit";\nimport { x } from "#other/x.ts";\n',
      filename: APP_STORE,
    },

    // leaves a pattern linking files outside every module alone
    { code: 'import { other } from "#/other.ts";\n', filename: fixture("scripts/build.ts") },

    // never fires for a "#" specifier the nearest package.json lacks
    'import { internal } from "#components/internal.ts";\n',
  ],
  invalid: [
    // rejects reaching past a module entry point, suggesting the entry point
    {
      code: bypassCode,
      filename: APP_STORE,
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "#components/internal.ts", owner: "#components" },
          ...spanOf(bypassCode, '"#components/internal.ts"'),
          suggestions: [
            {
              messageId: "useEntry",
              data: { owner: "#components" },
              output: 'import { internal } from "#components";\n',
            },
          ],
        },
      ],
    },

    // rejects a deeper specifier of an exact alias even with no pattern for it
    {
      code: 'import { x } from "#utils/x.ts";\n',
      filename: APP_STORE,
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "#utils/x.ts", owner: "#utils" },
          suggestions: [
            {
              messageId: "useEntry",
              data: { owner: "#utils" },
              output: 'import { x } from "#utils";\n',
            },
          ],
        },
      ],
    },

    // names the alias nested deepest under the path, not the longest prefix
    {
      code: 'import { x } from "#a/sub/x.ts";\n',
      filename: fixture("nested/main.ts"),
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "#a/sub/x.ts", owner: "#a-sub" },
          suggestions: [
            {
              messageId: "useEntry",
              data: { owner: "#a-sub" },
              output: 'import { x } from "#a-sub";\n',
            },
          ],
        },
      ],
    },

    // credits a catch-all pattern to the owner of the file it resolves to
    {
      code: 'import { utils } from "#/utils/index.ts";\n',
      filename: APP_STORE,
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "#/utils/index.ts", owner: "#utils" },
          suggestions: [
            {
              messageId: "useEntry",
              data: { owner: "#utils" },
              output: 'import { utils } from "#utils";\n',
            },
          ],
        },
      ],
    },

    // rejects a pattern into files no alias owns, with nothing to suggest
    {
      code: 'import { other } from "#/other.ts";\n',
      filename: APP_STORE,
      errors: [{ messageId: "internals", data: { specifier: "#/other.ts" }, suggestions: [] }],
    },

    // never suggests the importing file's own alias, only a relative path
    {
      code: bypassCode,
      filename: fixture("src/components/button.ts"),
      errors: [
        {
          messageId: "ownArea",
          data: { specifier: "#components/internal.ts", owner: "#components" },
          suggestions: [
            {
              messageId: "useRelative",
              data: { path: "./internal.ts" },
              output: 'import { internal } from "./internal.ts";\n',
            },
          ],
        },
      ],
    },

    // still checks a file outside the modules reaching into one
    {
      code: bypassCode,
      filename: fixture("vite.config.ts"),
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "#components/internal.ts", owner: "#components" },
          suggestions: [
            {
              messageId: "useEntry",
              data: { owner: "#components" },
              output: 'import { internal } from "#components";\n',
            },
          ],
        },
      ],
    },

    // treats a type-only import like any other import
    {
      code: 'import type { Internal } from "#components/internal.ts";\n',
      filename: APP_STORE,
      errors: [
        {
          messageId: "bypass",
          data: { specifier: "#components/internal.ts", owner: "#components" },
          suggestions: [
            {
              messageId: "useEntry",
              data: { owner: "#components" },
              output: 'import type { Internal } from "#components";\n',
            },
          ],
        },
      ],
    },
  ],
});
