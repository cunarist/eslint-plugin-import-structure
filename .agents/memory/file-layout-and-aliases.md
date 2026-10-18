---
description: This repo's # alias order is #plugin, #rules, #testing, #helpers (its own layer order); vite.config.ts imports #plugin and ./scripts/project-lint.ts; rule tests read src/testing/fixture/ through fixture()
---

The general layout is in [[plugin-layout-flat-rules]] and the alias rules in
[[imports-aliases-barrels]]. What is specific to this repo:

**Alias order is a layer order.** The repo's own `enforce-layer-order` reads
the `package.json` `imports` key order as layers, top first, so the order is
`#plugin`, `#rules`, `#testing`, `#helpers`: the plugin imports the rule
registry, rule tests import the harness, and everything imports `#helpers`.

**Aliases follow the one ownership rule** ([[imports-aliases-barrels]],
user rule 2026-10-17). Each alias here points at a folder's `index.ts`, so it
owns that folder: `#plugin` (`src/plugin/`, the package entry, which `vp pack`
names `dist/index.js`; there is no `src/index.ts`), `#rules`, `#testing`,
`#helpers`. `tests/` imports only through `#` aliases: `../` is banned in
every file (`no-parent-import`, `import/no-relative-parent-imports`, no
overrides for test code). `vite.config.ts` imports the plugin through
`#plugin` (`prefer-alias-import` rewrites a `./src/plugin/index.ts` path)
and `./scripts/project-lint.ts` by path, which is free because no alias owns
`scripts/`. Its `jsPlugins` entries stay path strings. Vite+ bundles the
config and resolves both.

**Fixtures.** A rule that reads `package.json` needs a real path. A valid
case may be `{ code, filename }` and an invalid case may set `filename`,
both passed to both testers ([[plugin-dual-ruletester]]).
`fixture("src/utils/index.ts")` from `#testing` gives a path in
`src/testing/fixture/`, whose `package.json` holds the test `imports`.
Two nested projects pin the ownership rule without folder names:
`fixture/owned/` (a folder alias, a file alias next to unowned files, an alias
three levels down, one in another top-level folder, and one whose target does
not exist) and `fixture/overlap/` (nested and duplicate aliases). A
nested `src/utils/vendored/package.json` without `imports` proves the lookup
stops at the nearest `package.json` ([[node-subpath-imports]]). No rule opens
a source file, so no source file exists there. A case without a filename is
linted as `example.ts` in the working directory, which sees this repo's own
`package.json`.
