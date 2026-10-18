---
description: vite.config.ts lint uses Oxlint categories at error with default limits, names no rule itself, and spreads configs from the plugins and scripts/project-lint.ts
---

The lint config is short and category-driven (user decisions 2026-10-14/15):
turn on whole categories, then list only what parity or a real need adds.

```ts
lint: {
  plugins: ["typescript", "unicorn", "oxc", "import"],
  jsPlugins: ["@cunarist/eslint-plugin-explicit-types", "./scripts/project-lint.ts"],
  categories: { correctness: "error", suspicious: "error", pedantic: "error", perf: "error" },
  rules: { ...explicitTypes.configs.concrete.rules, ...projectLint.configs.project.rules },
  ignorePatterns: ["src/generated/**"], // generated files only, see below
  options: { typeAware: true, typeCheck: true, maxWarnings: 0, reportUnusedDisableDirectives: "error" },
},
```

- **Categories:** `correctness`, `suspicious`, `pedantic`, `perf` at `error`.
  `style` and `restriction` are never turned on wholesale; pick single rules
  from them in `configs.project`. Extra rules that categories bring are fine.
- **Default limits stay** (2026-10-16): pedantic's `max-lines` 300,
  `max-lines-per-function` 50, `max-classes-per-file` 1,
  `max-dependencies` 10, `max-params` 3, `complexity` 20. Don't raise them to
  make code pass; refactor (see [[lint-overrides-policy]]). `max-lines` is
  never turned off, `scripts/` included: split a long file instead. The
  plugin repos turn off `max-lines-per-function`,
  `typescript/prefer-readonly-parameter-types`, and
  `typescript/no-unsafe-enum-comparison` because AST visitors fight them, each
  with a one-line reason; do not add new opt-outs without asking the user.
- **`vite.config.ts` names no rule.** Every rule id, built-in ones included,
  lives in `configs.project` of `scripts/project-lint.ts`
  ([[project-lint-plugin]]). `vite.config.ts` only spreads configs.
- **Published plugins are consumed through their configs**: ESLint flat config
  uses `plugin.configs.<name>`; Oxlint lists the package in `jsPlugins` and
  spreads `plugin.configs.<name>.rules`, since Oxlint plugins carry no configs.
  Use the configs equivalent to what the repo enabled under Deno.
- **`maxWarnings: 0`** keeps Deno's "every diagnostic fails" behaviour.
- **`ignorePatterns`** is only for generated files (compiled output, codegen).
  Hand-written code is never ignored.
- **No lint disable comments**: [[lint-no-disable-comments]].
- **Parity:** [[lint-parity-never-shrinks]]. **Naming:** [[naming-id-match]].
- Don't add a second import sorter; the modules plugin's `enforce-import-order` is
  the only one, and Oxfmt's `sortImports` stays off.

`perf` came last: in the template it flagged nine `.includes` on constant
arrays, fixed as `ReadonlySet` + `.has()` rather than by turning a rule off.
That is the expected response to any new rule: change the code.
