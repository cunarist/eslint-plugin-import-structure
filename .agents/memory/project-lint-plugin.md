---
description: scripts/project-lint.ts is the repo-local plugin "project" holding the repo's rule list (typed DummyRuleMap); its rules sit in flat scripts/project-lint-*.ts files; never published, no tests
---

Every repo has `scripts/project-lint.ts`, copied from
`cunarist/eslint-plugin-explicit-types` and extended. It is a repo-local
Oxlint plugin with `meta.name` `"project"`, loaded through `jsPlugins` in
`vite.config.ts`. It holds:

- **`configs.project.rules`**: the repo's whole rule list beyond the published
  plugin configs: Deno parity rules, extras, per-rule options, and opt-outs,
  built-in Oxlint ids included (`curly`, `id-match`, `import/no-cycle`, ...).
- **Custom rules**, enabled as `project/<rule>`. Every repo has
  `no-disable-comments` and `no-asset-imports`. Apps also port the rules of
  their old `scripts/deno-lint-plugin.ts` here under the same names and
  behavior (`no-self-sync`, `app-module-conventions`, `restricted-types`, ...).

`scripts/` is flat: no subfolders and no `index.ts`. `max-lines` (300)
applies, so rules live in themed sibling files sharing the prefix and
`scripts/project-lint.ts` imports them by relative path. In eslint-plugin-import-structure:
`project-lint.ts` (plugin and rule list), `project-lint-source.ts`
(`prefer-ascii` with its `allowFiles` option, and `no-disable-comments`), `project-lint-modules.ts` (`no-asset-imports`), and
`project-lint-types.ts` (shared rule types). Don't add `scripts/rules/`.

```ts
import type { DummyRuleMap } from "vite-plus/lint";

const rules: DummyRuleMap = {
  "id-match": ["error", "^_*[^_]*_*$|^[^a-z]*$", {/* ... */}],
  curly: "error",
  "project/no-disable-comments": "error",
};

const plugin = {
  meta: { name: "project" },
  rules: { "no-disable-comments": noDisableCommentsRule /* ... */ },
  configs: { project: { rules } },
};
export default plugin;
```

## Why `DummyRuleMap` and an unannotated plugin (decided 2026-10-15)

- `DummyRuleMap` (re-exported by `vite-plus/lint`) is Oxlint's type for
  `OxlintConfig.rules`. Despite the name it lists every built-in rule with its
  options, so a typo in a rule id or option is a type error, not just a CI
  failure. Without it, TypeScript widens `"error"` to `string`; `as const`
  doesn't help because Oxlint wants mutable tuples.
- `@eslint/core`'s `Plugin` is too loose to read back: `configs` is optional,
  any key may be missing, and a config may be an array, so
  `projectLint.configs.project.rules` fails in `vite.config.ts` (and `!` is
  banned). Optional chaining still leaves the array case.
- Oxlint's own `Plugin` type (`vite-plus/lint/plugins`) has no `configs`.
- Two hand-written interfaces worked but were dropped as noise; a plain
  config object was rejected because custom rules need the plugin form anyway
  and every repo should look the same.

`scripts/` is tooling, not production code: never packed or published, and
no tests. Narrow `overrides` for `scripts/**` are allowed when a script truly
needs one (e.g. `no-console`); see [[lint-overrides-policy]].
