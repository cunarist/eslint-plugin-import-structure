At the start of every new session, run `damem recall` in the terminal and treat
its output as the context for this repository. If the `damem` command is not
found, read [INSTALL.md](https://github.com/cunarist/damem/blob/main/INSTALL.md)
and follow it before reasoning or responding.

# AGENTS.md

## Project

- **eslint-plugin-import-structure**: import rules that keep a module
  graph layered and free of cycles, with the order of `package.json` `imports`
  as the layer order. One ESLint plugin that also runs under Oxlint. Namespace
  `import-structure`, 11 rules in one config, `modules`.
- The package's only export is the default one, the plugin. Configs live at
  `plugin.configs`: `modules` and `all` (every rule, built from the rule
  registry). No `recommended`, no named exports.
- Runs on Node.js 22.18+; Bun is not a supported target. Built with Vite+ (`vp`):
  Oxlint, Oxfmt, type checking, Vitest, tsdown.
- Ported from the lint plugin of the `deno-import-check` JSR package (its
  `./lint` entry). The published plugin mirrors exactly its 11 rules, nothing
  added or removed. Its CLI was not ported.
- Renamed twice; rule names never changed. On 2026-10-17 the scoped
  import-check package (config `import-check`) became the scoped modules
  package (config `modules`). On 2026-10-18 it became the unscoped
  `eslint-plugin-import-structure` (namespace `import-structure`), and the
  repo moved to `cunarist/eslint-plugin-import-structure`. The `modules`
  config kept its name.

## Rules

- `vp check`, `vp test`, and `vp pack` must all pass. `vp pack` builds
  `src/plugin/index.ts` into `dist/index.js` and `dist/index.d.ts`, the files
  `package.json` `exports` names. `vp check --fix` formats.
- The only config files are `package.json`, `tsconfig.json`, and
  `vite.config.ts`, plus `package-lock.json`. Only `.ts` source files, configs
  included; there are no `.js`, `.mjs`, `.cjs`, `.jsx`, or `.tsx` files. The
  only other JSON files are the rule-test fixtures under
  `src/testing/fixture/`: its `package.json`, a nested one that proves the
  config lookup stops at the nearest `package.json`, as Node.js does, and the
  `owned/`, `nested/`, and `overlap/` projects that pin the alias ownership
  rule.
- `tsconfig.json` turns on exactly `strict`, `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`, `noImplicitReturns`,
  `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, and `erasableSyntaxOnly`, sets
  `allowUnreachableCode` and `allowUnusedLabels` to `false`, plus the
  mechanical flags and `declaration`/`isolatedDeclarations`. `exactOptionalPropertyTypes`
  stays off.
- Entry files are `index.ts` only, and only where an alias targets a
  folder; `scripts/` is flat, with no `index.ts`. Every rule lives flat in
  `src/rules/<rule-id>.ts`, tested in `src/rules/<rule-id>.test.ts` and
  registered in `src/rules/index.ts`.
- Each rule file has one named export with a `Rule` suffix, e.g.
  `export const noSelfImportRule`. The package's only default export is the
  plugin, defined in `src/plugin/index.ts`, which is also the package entry
  (there is no `src/index.ts`); `scripts/project-lint.ts` default-exports its
  own.
- Configs are lists of rule ids in `src/plugin/index.ts`. `all` is built from the
  registry.
- Aliases follow one rule, with no folder names in it: an alias owns its
  target (a folder's `index.ts` owns that folder and everything below it;
  any other file owns only itself) minus the area of any deeper alias
  inside it, 2 aliases with the same area are an error, code
  outside an area reaches it only through the exact alias, relative imports
  inside an area are free, and `../` is banned in every file. This repo's
  aliases, in layer order (`enforce-layer-order`): `#plugin`, `#rules`,
  `#testing`, `#helpers`. `vite.config.ts` imports the plugin through
  `#plugin` and `./scripts/project-lint.ts` by path, free because no alias
  owns `scripts/`; `jsPlugins` stay path strings. Imports name `.ts` files
  (or `.js`, `.mts`, `.mjs` package subpaths), never JSON or other assets
  (`project/no-asset-imports`); rules read `package.json` with `node:fs`.
- Local convention, stricter than the general alias rule and kept out of
  plugin code and docs: in this repo, `imports` aliases point only at a
  direct subfolder of `src/` (`"#helpers": "./src/helpers/index.ts"`). Code
  outside `src/` imports its own files by `./` relative paths. See
  `imports-aliases-barrels`.
- `meta.name` and `meta.version` are written out in `src/plugin/index.ts`; a release
  bumps them with `package.json`, and `tests/package-meta.test.ts` checks both.
- Rules use ESLint's standard `create` API, typed `ExplicitRule`, with every
  visitor's node parameter annotated. Messages are one ESLint-style sentence.
- Unit tests sit next to the code as `*.test.ts`. Regression and integration
  tests go in `tests/` and use only the plugin, through `#plugin`, plus the
  `#testing` harness to run its rules under both hosts.
- Every rule test runs under both ESLint's and Oxlint's `RuleTester` through
  `testRule`, called exactly once per rule file with every case in its `valid`
  and `invalid` lists. Write cases once, in ESLint's shape and 1-based columns.
- Rules this repo enforces on itself but does not publish live in the
  repo-local `project` plugin: `scripts/project-lint.ts` holds the plugin and
  rule list and imports its rules from flat siblings
  (`project-lint-source.ts`, `project-lint-modules.ts`,
  `project-lint-hugoalh.ts`, `project-lint-hugoalh-types.ts`,
  `project-lint-types.ts`). `scripts/` is repo tooling, flat, never packed or
  published, and has no tests.
- Source files are ASCII only (`project/prefer-ascii`, Deno's
  `prefer-ascii`); write `-` or `,` instead of an em dash. Functions take at
  most 4 parameters (`max-params`) and stay at or under a complexity of 32
  (`complexity`), hugoalh's defaults from the old Deno config.
- The repo lints itself with its own rules. Lint disable and enable comments
  (`eslint-*` or `oxlint-*`, any form) fail `vp check`; fix the source.
- Lint policy is a blacklist: every Oxlint category but `nursery` (correctness,
  suspicious, pedantic, perf, style, restriction) is on at `error`.
  `scripts/project-lint.ts` holds only the repo-only rules, the rules turned
  off (each with a one-line reason: a collision, too much churn, or Node code),
  and option tweaks; never re-list a rule a category already turns on.
- `vite.config.ts` lists no rule by name: its `rules` spreads
  `configs.all.rules` from `src/plugin/index.ts` and `configs.project.rules` from
  `scripts/project-lint.ts`, and its `overrides` is exactly `projectOverrides`
  from `scripts/project-lint.ts` (the Node code entry first, then per-file
  exceptions with a why-comment). No `allowFiles` options; `ignorePatterns`
  only for generated output. See `.agents/memory/lint-config.md`.
- Every rule has a `docs/rules/<rule>.md` in the ESLint core layout: Rule
  Details, incorrect/correct examples, and When Not To Use It. `npm run docs`
  regenerates the headers and the README rules list after `vp pack`.
- Never add a second import sorter beside `enforce-import-order`.
- CI runs every rule test, ESLint and Oxlint halves alike, on node@22.18.0 and
  node@latest. Bun is not tested and not supported.
- `package.json` keys follow Oxfmt's standard sort (`vp check --fix`); there
  is no `fmt.sortPackageJson` setting. The keys inside `imports` keep the
  layer order. There is no `packageManager` field; npm is detected from
  `package-lock.json`.
- Every file stays under Oxlint's default `max-lines` of 300; split a long
  file rather than turning the rule off. Every function likewise stays under
  `max-lines-per-function`'s default of 50, rule `create` functions and
  visitors included; split one into named helpers that take the context,
  source, and plain data as arguments.
- Only CI publishes, from a published GitHub release `vX.Y.Z` that matches
  `package.json`. Use the `release` skill and ask the user first.
- Release notes live only on GitHub releases. There is no `CHANGELOG.md`; never
  add one.
