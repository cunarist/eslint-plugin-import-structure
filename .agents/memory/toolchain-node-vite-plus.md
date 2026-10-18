---
description: Node.js 22.18+ with Vite+ (vp) and npm; only package.json, tsconfig.json, vite.config.ts plus a committed package-lock.json
---

## The stack

- **Runtime:** Node.js 22.18 or newer. `engines` is `{ "node": ">=22.18" }` and
  nothing else. Containers and the publish job use Node 24 (LTS); a repo may
  need more where a feature demands it (bot-agents uses Node 24.2+).
- **Bun is not supported** (dropped 2026-10-15). No Bun CI legs, docs, or
  runtime branches. Oxlint's `RuleTester` refuses to run under Bun anyway, and
  `vp` brings its own Node, the way uv brings its own Python.
- **Toolchain:** Vite+ (`vite-plus` devDependency, command `vp`): Vite,
  Vitest, Oxlint, Oxfmt, type checking, tsdown.
- **Package manager:** npm everywhere. `package-lock.json` is committed in
  apps _and_ libraries (user agreed 2026-10-14: `npm ci` needs it). There is no
  `packageManager` field; Vite+ detects npm from the lockfile.

## Config files

Exactly three, plus the lockfile: `package.json`, `tsconfig.json`,
`vite.config.ts`. No `.oxlintrc.json`, `.prettierrc`, `eslint.config.*`,
`vitest.config.*`, `.npmrc`, or `tsdown.config.*`. Tool options go into
`vite.config.ts` keys (`lint`, `fmt`, `test`, `pack`) or, when a tool only
reads `package.json` (eslint-doc-generator), into a `package.json` key.
The target is a short `vite.config.ts`, around 30 lines (not strict).

## Commands

| Command                  | Does                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `vp check`               | format check, Oxlint (type-aware), and type check together |
| `vp check --fix`         | the same, applying formatting and safe fixes               |
| `vp test`                | Vitest; `vp test tests` runs only the top-level `tests/`   |
| `vp build`               | Vite production build (apps)                               |
| `vp dev`                 | Vite dev server (apps)                                     |
| `vp pack`                | tsdown library build into `dist/` (packages)               |
| `npm ci` / `npm install` | install; never another package manager                     |

`vp check`, `vp test`, and the build (`vp build` or `vp pack`) must all pass
before any push. CI installs the toolchain with `voidzero-dev/setup-vp`.

## Gotchas found during the migration

- `vp check` does **not** report `isolatedDeclarations` errors (TS9010); only
  `vp pack` does, so packages run `vp pack` in CI on every PR.
- Oxfmt sorts `package.json` keys by default; accept its order, with no
  `fmt.sortPackageJson` setting ([[package-json-shape]]).
- Oxlint and Oxfmt skip what `.gitignore` lists; that is the only reason
  `dist/` and `node_modules/` are not linted. Keep build output gitignored.
- Vite+ bundles `vite.config.ts` itself and resolves `#` imports in it.
- Oxlint loads a `.ts` plugin file directly on Node 24 (`jsPlugins`), so
  repo-local lint plugins need no build step.
