---
description: deno-import-check's deno.json lint config is mapped: prefer-ascii and the hugoalh recommended rules Oxlint lacks as project rules, the rest of hugoalh recommended to built-ins, no-external-import skipped by the user
---

`configs.project` in `scripts/project-lint.ts` started as the template's
list, audited against the explicit-types repo's Deno config (see
cunarist/eslint-plugin-explicit-types#1). `import/no-cycle` stands in for the
Deno CLI's cycle check.

This repo's old `deno.json` (cunarist/deno-import-check main) also included
`no-external-import` and `prefer-ascii`, and loaded
`jsr:@hugoalh/deno-lint-rules@0.8.3/recommended`, i.e. `configurePlugin()`
with no options (excluding `hugoalh/no-duplicate-imports` and
`no-import-self`). User decision (2026-10-17, PR #2):

- `no-external-import`: skipped.
- `prefer-ascii`: `project/prefer-ascii` in `scripts/project-lint-source.ts`,
  copied from temeddix/eximium (node-migration). Rules take no `allowFiles`
  option; a file exemption is a `projectOverrides` entry in
  `scripts/project-lint.ts` with a why-comment.
  It also covers hugoalh's `prefer-ascii-identifier`.
- `max-params` 4 and `complexity` 32 with Oxlint's built-ins. These are
  hugoalh's defaults; that `recommended` entry did not actually turn them on.
  hugoalh's `max-complexity` counts nesting, not branches, so 32 is not the
  same measure.
- Other hugoalh `recommended` rules map to built-ins where one exists:
  `no-lone-blocks`, `import/first`, `typescript/consistent-type-definitions`,
  `consistent-type-assertions` (`as`), `explicit-member-accessibility`
  (`no-public`), `unicorn/prefer-module` (`no-use-strict`), and a
  `no-restricted-imports` regex for `no-import-absolute`/`data`/`file`/`http`,
  `no-import-jsr` by URL, and `std-on-jsr`. Already in the categories:
  `no-constructor-return`, `no-duplicate-type-constituents`,
  `no-loss-of-precision`, `no-useless-constructor`, `no-empty-static-block`,
  `no-else-return`, `no-useless-empty-export`, `no-unused-expressions`,
  `unicorn/no-useless-switch-case`, `no-unneeded-ternary`, `no-useless-catch`;
  `curly` covers `prefer-statement-block`.
- No built-in, so ported as repo-local rules under their hugoalh names
  (`project/<name>`): `no-duplicate-awaits`, `no-duplicate-typeofs`,
  `no-duplicate-voids`, `no-empty-yield`, `no-enum`, `no-nan`,
  `no-unsafe-number` (`no-loss-of-precision` misses literals such as `1e300`)
  and `no-useless-continue` in `scripts/project-lint-hugoalh.ts`;
  `no-duplicate-interfaces`, `no-duplicate-types`, `no-modifier-private` and
  `no-useless-type` in `scripts/project-lint-hugoalh-types.ts`. A gap is not
  an acceptable end state ([[lint-parity-never-shrinks]]).

Before removing a line from `configs.project`, find what else covers it
([[lint-parity-never-shrinks]]). `maxWarnings: 0` keeps Deno's
every-diagnostic-fails behaviour.
