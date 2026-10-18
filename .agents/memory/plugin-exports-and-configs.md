---
description: The plugin is the package's only (default) export; one config per former Deno plugin plus all, no recommended; meta.name/version written out in src/plugin/index.ts
---

## Exports (2026-10-14)

- The package has **only a default export**: the plugin object. No named
  exports (`concreteConfig`, rule objects), as ESLint plugins do.
- Namespace comes from the package name, ESLint's convention:
  `eslint-plugin-explicit-types` → `explicit-types`, so a
  rule id is `explicit-types/no-keyof`. Oxlint normalizes
  `meta.name` the same way (verified).
- `meta.name` and `meta.version` are **written out** in `src/plugin/index.ts`, never
  imported from `package.json` (no non-`.ts` imports). A release bumps both;
  `tests/package-meta.test.ts` reads `package.json` with `node:fs` and fails
  on drift.

## Configs (2026-10-14)

- **Exactly one config per former Deno plugin**, named after it, plus
  **`all`**, which turns on every rule and is built from the registry so a new
  rule joins it by itself. `tests/configs.test.ts` checks `all` equals the
  union of the others.
- **No `recommended`** config and no `meta.docs.recommended` flag.
- A config is just a list of rule ids in `src/plugin/index.ts`, so one rule may sit
  in several configs. Each config is a flat config object carrying the plugin:

  ```ts
  { name: `${NAMESPACE}/${preset}`, plugins: { [NAMESPACE]: basePlugin },
    rules: { [`${NAMESPACE}/${id}`]: "error", ... } }
  ```

- Usage: ESLint `export default [plugin.configs.concrete]`; Oxlint
  `jsPlugins: ["eslint-plugin-explicit-types"]` plus
  `rules: { ...plugin.configs.concrete.rules }`, since Oxlint plugins carry no
  configs. (Whether Oxlint accepts `extends: [plugin.configs.x]` is untested.)
- No shared lint-config package exists; each consumer writes its own config.
- **No rule takes options** unless the Deno rule had them; a project-specific
  denylist is dropped rather than shipped as an option.

## Typing the plugin

`@eslint/core`'s `Plugin` makes `configs` optional, any-keyed, and possibly an
array, so reading `plugin.configs.all.rules` back fails type checking. The
template declares `basePlugin: Plugin` (meta + rules) and a small
`<Name>Plugin` interface with named configs (`<Name>Configs`) for the
exported object; keep that shape.

The repo lints itself from source: `vite.config.ts` loads `./src/plugin/index.ts` as
a `jsPlugins` entry and spreads `configs.all.rules`, so a new rule applies to
the code that implements it immediately.
