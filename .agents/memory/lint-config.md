---
description: Lint config shape - all Oxlint categories but nursery, plugins via `all`, a blacklist in configs.project.rules, per-file exceptions only in projectOverrides, ignorePatterns only for generated output
---

Lint policy is a blacklist (user decisions 2026-10-19). `vite.config.ts`
names no rule; everything lives in `scripts/project-lint.ts`
([[project-lint-plugin]]).

- **Categories:** `correctness`, `suspicious`, `pedantic`, `perf`, `style`,
  `restriction` at `error`. `nursery` stays off (no line for it).
- **Plugins** come in whole through their `all` configs
  (`importStructure.configs.all.rules`, built from the rule registry).
- **The blacklist** is `projectLint.configs.project.rules`, spread last in
  `rules`: repo-only `project/*` rules, repo-wide offs (each with a one-line
  reason: a collision, too much churn, or Node code), and option tweaks
  (limits set to the smallest value the code passes). Never re-list a rule a
  category already turns on.
- **Per-file exceptions** go only in `projectOverrides`, the whole
  `overrides` array exported from `scripts/project-lint.ts`: the Node code
  entry (`vite.config.ts`, `scripts/**`) first, then one entry per exception
  with a why-comment. `vite.config.ts` uses exactly
  `overrides: projectOverrides`.
- **No `allowFiles`** options in custom rules and **no disable comments**
  ([[lint-no-disable-comments]]); an exemption is always an override entry.
- **`ignorePatterns`** only for generated or build output, never hand-written
  code. This repo has none; `dist/` and `coverage/` are gitignored.
- **Precedence:** categories < `rules` (a later spread wins) < `overrides`
  (a later entry wins).

```ts
// vite.config.ts
lint: {
  categories: { correctness: "error", suspicious: "error", pedantic: "error",
    perf: "error", style: "error", restriction: "error" },
  rules: { ...importStructure.configs.all.rules, ...projectLint.configs.project.rules },
  overrides: projectOverrides,
},

// scripts/project-lint.ts
export const projectOverrides: OxlintOverride[] = [
  { files: ["vite.config.ts", "scripts/**"], rules: nodeRules },
  // A per-file exception: say why.
  // { files: ["src/example.ts"], rules: { "no-console": "off" } },
];
```

Prefer fixing the code (split files, extract helpers, barrels) over a new
off or override. Parity: [[lint-parity-never-shrinks]]. Naming:
[[naming-id-match]].
