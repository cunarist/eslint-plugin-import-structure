import { spanOf, testRule } from "#testing";

import { enforceImportOrderRule } from "./enforce-import-order.ts";

const PACKAGE = "package";

const ALIAS = "`#` alias";

const RELATIVE = "relative";

const memberCode = 'import { normalizePath, baseName } from "#paths";\n';

testRule("enforce-import-order", enforceImportOrderRule, {
  valid: [
    // leaves a correct three-group block alone
    'import { a } from "@scope/pkg";\nimport { z } from "zod";\n\nimport { b } from "#components";\n\nimport { c } from "./helper.ts";\n',

    // accepts sorted names
    'import { alpha, type Beta, zeta } from "#paths";\n',
  ],
  invalid: [
    // requires a blank line between groups
    {
      code: 'import { a } from "zod";\nimport { b } from "#components";\n',
      output: 'import { a } from "zod";\n\nimport { b } from "#components";\n',
      errors: [{ messageId: "missingBlankLine", data: { previous: PACKAGE, group: ALIAS } }],
    },

    // rejects a group out of place
    {
      code: 'import { b } from "./helper.ts";\n\nimport { a } from "zod";\n',
      output: 'import { a } from "zod";\n\nimport { b } from "./helper.ts";\n',
      errors: [{ messageId: "groupOrder", data: { group: PACKAGE, previous: RELATIVE } }],
    },

    // rejects a blank line inside a group
    {
      code: 'import { a } from "#app-store";\n\nimport { b } from "#components";\n',
      output: 'import { a } from "#app-store";\nimport { b } from "#components";\n',
      errors: [{ messageId: "extraBlankLine", data: { group: ALIAS } }],
    },

    // sorts within a group by code point
    {
      code: 'import { b } from "#components";\nimport { a } from "#app-store";\n',
      output: 'import { a } from "#app-store";\nimport { b } from "#components";\n',
      errors: [
        { messageId: "sourceOrder", data: { specifier: "#app-store", previous: "#components" } },
      ],
    },

    // rewrites a full three-group block
    {
      code: 'import { c } from "./helper.ts";\nimport { b } from "#components";\nimport { a } from "zod";\n',
      output:
        'import { a } from "zod";\n\nimport { b } from "#components";\n\nimport { c } from "./helper.ts";\n',
      errors: [{ messageId: "groupOrder", data: { group: ALIAS, previous: RELATIVE } }],
    },

    // reports without a fix when a comment would be lost
    {
      code: 'import { b } from "#components";\n// Why this import exists.\nimport { a } from "#app-store";\n',
      errors: [{ messageId: "extraBlankLine" }],
    },

    // reports without a fix when a comment trails the last import
    {
      code: 'import { b } from "./helper.ts";\nimport { a } from "zod"; // Why zod.\n',
      errors: [{ messageId: "groupOrder", data: { group: PACKAGE, previous: RELATIVE } }],
    },

    // reports without a fix when another statement sits between imports
    {
      code: 'import { b } from "#components";\nconst x = 1;\nimport { a } from "#app-store";\nexport { a, b, x };\n',
      errors: [{ messageId: "extraBlankLine" }],
    },

    // reports without a fix when only moving a side-effect import would help
    {
      code: 'import { b } from "#components";\nimport "./setup.ts";\nimport { a } from "zod";\n',
      errors: [{ messageId: "missingBlankLine", data: { previous: ALIAS, group: RELATIVE } }],
    },
    {
      code: 'import "./setup.ts";\nimport { a } from "zod";\n',
      errors: [{ messageId: "groupOrder", data: { group: PACKAGE, previous: RELATIVE } }],
    },

    // keeps a side-effect import in place and fixes the blank lines around it
    {
      code: 'import { a } from "zod";\nimport "./setup.ts";\n',
      output: 'import { a } from "zod";\n\nimport "./setup.ts";\n',
      errors: [{ messageId: "missingBlankLine", data: { previous: PACKAGE, group: RELATIVE } }],
    },

    // sorts the imports before a side-effect import without moving it
    {
      code: 'import { z } from "zod";\nimport { a } from "@scope/pkg";\nimport "./setup.ts";\n',
      output: 'import { a } from "@scope/pkg";\nimport { z } from "zod";\n\nimport "./setup.ts";\n',
      errors: [{ messageId: "sourceOrder", data: { specifier: "@scope/pkg", previous: "zod" } }],
    },

    // reports without a fix when only side-effect imports are out of place
    {
      code: 'import { a } from "zod";\n\nimport "./setup.ts";\n\nimport "#polyfill";\n',
      errors: [{ messageId: "groupOrder", data: { group: ALIAS, previous: RELATIVE } }],
    },

    // sorts names inside the braces
    {
      code: memberCode,
      output: 'import { baseName, normalizePath } from "#paths";\n',
      errors: [
        {
          messageId: "memberOrder",
          data: { name: "baseName", previous: "normalizePath" },
          ...spanOf(memberCode, "baseName"),
        },
      ],
    },

    // ignores case and type modifiers when sorting names
    {
      code: 'import { zeta, Alpha, type Beta } from "#paths";\n',
      output: 'import { Alpha, type Beta, zeta } from "#paths";\n',
      errors: [{ messageId: "memberOrder", data: { name: "Alpha", previous: "zeta" } }],
    },

    // keeps a multi-line member list broken
    {
      code: 'import {\n  zeta,\n  alpha,\n} from "#paths";\n',
      output: 'import {\n  alpha,\n  zeta,\n} from "#paths";\n',
      errors: [{ messageId: "memberOrder" }],
    },

    // leaves default bindings in place
    {
      code: 'import plugin, { zebra, apple } from "#lint";\n',
      output: 'import plugin, { apple, zebra } from "#lint";\n',
      errors: [{ messageId: "memberOrder" }],
    },

    // reports without a fix when the first name shares the line with the brace
    {
      code: 'import { zeta,\n  alpha } from "#paths";\n',
      errors: [{ messageId: "memberOrder", data: { name: "alpha", previous: "zeta" } }],
    },

    // reports without a fix when a comment follows the last name
    {
      code: 'import {\n  zeta,\n  alpha, // Why alpha.\n} from "#paths";\n',
      errors: [{ messageId: "memberOrder", data: { name: "alpha", previous: "zeta" } }],
    },

    // reports without a fix when a comment sits inside the braces
    {
      code: 'import {\n  zeta, // last\n  alpha,\n} from "#paths";\n',
      errors: [{ messageId: "memberOrder" }],
    },

    // sorts type-only imports in with the rest, by source alone
    {
      code: 'import { b } from "#utils";\nimport type { A } from "#components";\n',
      output: 'import type { A } from "#components";\nimport { b } from "#utils";\n',
      errors: [
        { messageId: "sourceOrder", data: { specifier: "#components", previous: "#utils" } },
      ],
    },
    {
      code: 'import type { A } from "./types.ts";\n\nimport { b } from "#utils";\n',
      output: 'import { b } from "#utils";\n\nimport type { A } from "./types.ts";\n',
      errors: [{ messageId: "groupOrder", data: { group: ALIAS, previous: RELATIVE } }],
    },
  ],
});
