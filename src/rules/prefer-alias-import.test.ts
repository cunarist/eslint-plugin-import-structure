import { fixture, spanOf, testRule } from "#testing";

import { preferAliasImportRule } from "./prefer-alias-import.ts";

const SRC = fixture("src/index.ts");

const aliasCode = 'import { c } from "./components/index.ts";\n';

testRule("prefer-alias-import", preferAliasImportRule, {
  valid: [
    // leaves a path to the importing file's own entry point to enforce-layer-order
    { code: 'import { c } from "./index.ts";\n', filename: fixture("src/components/x.ts") },

    // ignores paths with no declared entry
    { code: 'import { u } from "./unmapped/index.ts";\n', filename: SRC },
  ],
  invalid: [
    // rewrites a path that has an alias
    {
      code: aliasCode,
      filename: SRC,
      output: 'import { c } from "#components";\n',
      errors: [
        {
          messageId: "useAlias",
          data: { specifier: "./components/index.ts", alias: "#components" },
          ...spanOf(aliasCode, '"./components/index.ts"'),
        },
      ],
    },

    // rewrites a same-folder sibling that is a file alias
    {
      code: 'import { s } from "./app-store.ts";\n',
      filename: SRC,
      output: 'import { s } from "#app-store";\n',
      errors: [
        { messageId: "useAlias", data: { specifier: "./app-store.ts", alias: "#app-store" } },
      ],
    },

    // treats a type-only import like any other import
    {
      code: 'import { type C } from "./components/index.ts";\n',
      filename: SRC,
      output: 'import { type C } from "#components";\n',
      errors: [
        {
          messageId: "useAlias",
          data: { specifier: "./components/index.ts", alias: "#components" },
        },
      ],
    },
  ],
});
