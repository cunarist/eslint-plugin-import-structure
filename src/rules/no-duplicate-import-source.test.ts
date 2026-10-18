import { testRule } from "#testing";

import { noDuplicateImportSourceRule } from "./no-duplicate-import-source.ts";

const duplicateCode =
  'import { a } from "#utils";\nimport type { Utils } from "#utils";\nimport "#utils";\n';

const DUPLICATE = { messageId: "duplicate", data: { specifier: "#utils" } };

/** A report on source `x` at a 1-based line and column. */
function duplicateX(line: number, column: number): Record<string, unknown> {
  return { messageId: "duplicate", data: { specifier: "x" }, line, column };
}

// Every case below `type-only imports` was run through the original Deno rule
// (`deno-import-check` 0.9.0 from JSR, its `./lint` entry, under `deno lint`), and the reports
// listed are exactly the ones it gave.
testRule("no-duplicate-import-source", noDuplicateImportSourceRule, {
  valid: [
    // keeps a type-only and a bare import of one source
    'import type { Utils } from "#utils";\nimport "#utils";\n',

    // compares exact static sources, leaving re-exports and dynamic imports alone
    'import { a } from "#utils";\nimport { b } from "#components";\nexport { c } from "#utils";\nconst mod = await import("#utils");\n',
  ],
  invalid: [
    // reports every repeated source beside the first value import
    {
      code: duplicateCode,
      errors: [
        { ...DUPLICATE, line: 2 },
        { ...DUPLICATE, line: 3 },
      ],
    },

    // with no value import, keeps one type-only and one bare import
    {
      code: 'import type { A } from "#utils";\nimport type { B } from "#utils";\nimport "#utils";\nimport "#utils";\n',
      errors: [DUPLICATE, DUPLICATE],
    },

    // type-only imports: a value import absorbs a type-only one before it
    {
      code: 'import type { A } from "x";\nimport { b } from "x";\n',
      errors: [duplicateX(1, 24)],
    },

    // type-only imports: a value import absorbs a type-only one after it
    {
      code: 'import { b } from "x";\nimport type { A } from "x";\n',
      errors: [duplicateX(2, 24)],
    },

    // type-only imports: two type-only imports collapse into the first
    {
      code: 'import type { A } from "x";\nimport type { B } from "x";\n',
      errors: [duplicateX(2, 24)],
    },

    // type-only imports: a type-only default beside a namespace value import
    {
      code: 'import type A from "x";\nimport * as ns from "x";\n',
      errors: [duplicateX(1, 20)],
    },

    // inline type specifiers: the declaration is a value import
    {
      code: 'import { type A, b } from "x";\nimport { c } from "x";\n',
      errors: [duplicateX(2, 19)],
    },

    // inline type specifiers: one inline type alone is still a value import
    {
      code: 'import { type A } from "x";\nimport { b } from "x";\n',
      errors: [duplicateX(2, 19)],
    },

    // inline type specifiers: it absorbs a bare import, unlike `import type`
    {
      code: 'import { type A } from "x";\nimport "x";\n',
      errors: [duplicateX(2, 8)],
    },

    // inline type specifiers: two of them are two value imports
    {
      code: 'import { type A } from "x";\nimport { type B } from "x";\n',
      errors: [duplicateX(2, 24)],
    },

    // mixed: an inline type import absorbs a type-only one
    {
      code: 'import type { A } from "x";\nimport { type B } from "x";\n',
      errors: [duplicateX(1, 24)],
    },

    // mixed: a value import absorbs both a type-only and a bare import
    {
      code: 'import type { A } from "x";\nimport "x";\nimport { b } from "x";\n',
      errors: [duplicateX(1, 24), duplicateX(2, 8)],
    },

    // mixed: without a value import, the first bare and type-only ones stay
    {
      code: 'import "x";\nimport type { A } from "x";\nimport type { B } from "x";\nimport "x";\n',
      errors: [duplicateX(3, 24), duplicateX(4, 8)],
    },

    // mixed: the first value import stays, whatever comes before or after it
    {
      code: 'import type { A } from "x";\nimport type * as T from "x";\nimport { b, type C } from "x";\nimport d from "x";\n',
      errors: [duplicateX(1, 24), duplicateX(2, 25), duplicateX(4, 15)],
    },

    // mixed: sources are grouped apart, and a type-only re-export is ignored
    {
      code: 'import type { A } from "x";\nimport type { B } from "y";\nimport { a } from "y";\nexport type { C } from "x";\n',
      errors: [{ messageId: "duplicate", data: { specifier: "y" }, line: 2, column: 24 }],
    },
  ],
});
