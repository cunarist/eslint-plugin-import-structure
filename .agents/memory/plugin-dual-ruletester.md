---
description: Every rule test runs under both ESLint's and Oxlint's RuleTester via testRule, once per rule file, cases in ESLint shape; CI runs them all in one vp test step on node 22.18.0 and latest
---

`testRule` from `#testing` is called **exactly once per rule file**, with all
cases in one `valid` and one `invalid` list (typescript-eslint and unicorn
style), a `//` comment heading each group of cases.

It runs every case twice in Vitest:

- under ESLint's `RuleTester` with `@typescript-eslint/parser` and a `.ts`
  filename (ESLint parses TypeScript only with both);
- under Oxlint's `RuleTester` from `vite-plus/lint/plugins-dev`.

Suites nest as `<rule> > eslint|oxlint`. CI runs one plain `vp test` step,
which covers both hosts, the helper unit tests, and `tests/` (2026-10-16:
the per-host `-t` filter steps were merged into it). `-t " eslint "` still
works locally to run one host.

CI matrix: node `22.18.0` (the minimum, an exact version) and `latest`; no LTS
entry, no Bun (Oxlint's tester refuses Bun, and Bun support was dropped).

## Writing cases

- Write cases once, in ESLint's shape. `spanOf(code, text)` gives ESLint's
  1-based columns; the harness subtracts one for Oxlint, which counts columns
  from 0.
- Both testers reject a repeated `code` within one run, so put every
  assertion for a snippet on one case.
- Placeholder `data` values must be strings (Oxlint types them narrower).
- Snippets must be valid TypeScript, not just valid syntax: Oxlint's parser
  rejects e.g. a required parameter after an optional one.
- Every autofix and suggestion is asserted (`output`, `suggestions`) and so
  is tested under both hosts.
- Port **all** Deno test cases for a ported rule.

## Why the harness bridges types

`@eslint/core`'s `RuleDefinition` is not assignable to Oxlint's `Rule`
(`meta.docs` lacks an index signature, `sourceCode` shapes differ), and
`@typescript-eslint/utils`' `RuleModule` fits neither. Oxlint runs ESLint rules
unchanged at runtime, so the harness widens Oxlint's `run` parameter in one
documented interface (`OxlintRunner`), and the Oxlint half of every test
proves the runtime agrees. Don't depend on `@oxlint/plugins` for types.
