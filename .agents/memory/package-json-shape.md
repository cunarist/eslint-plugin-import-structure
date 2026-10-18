---
description: package.json uses Oxfmt's standard key order (no sortPackageJson override); standard fields only; no peerDependencies or packageManager
---

## Key order (2026-10-16)

Oxfmt's standard `package.json` sort decides the key order; `vite.config.ts`
has no `fmt.sortPackageJson` setting, and `vp check --fix` applies the order.
This replaced the earlier hand-written order (2026-10-14). The sort leaves the
keys inside `imports` alone.

```jsonc
{
  "name": "eslint-plugin-x",
  "version": "0.1.0",
  "description": "...",
  "keywords": ["eslint", "eslint-plugin", "eslintplugin", "oxlint"],
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/..." },
  "files": ["dist"],
  "type": "module",
  "imports": { "#helpers": "./src/helpers/index.ts" },
  "exports": { ".": "./dist/index.js" },
  "scripts": { "docs": "eslint-doc-generator" },
  "dependencies": {},
  "devDependencies": { "vite-plus": "^1.1.0" },
  "engines": { "node": ">=22.18" },
  "eslint-doc-generator": {/* tool options that can only live here */},
}
```

The `imports` key order can carry meaning: the import-structure plugin's
`enforce-layer-order` reads it as the layer order. Never reorder it casually;
Oxfmt does not sort it.

## Fields

- **Standard fields only.** `engines` has only `node` (never `engines.bun`).
  A tool-owned key (`eslint-doc-generator`) is allowed only because the tool
  reads nothing else and no other config file is allowed.
- **No `packageManager`.** npm is detected from `package-lock.json`.
- **No `peerDependencies`, ever** (user preference, 2026-10-14). If something
  is needed at runtime, it goes in `dependencies`.
- **`dependencies`** = what runs or is type-referenced at runtime by consumers
  (the lit plugin ships `parse5`, `oxc-parser`, `oxc-resolver`, and
  `@eslint/core` for its public types; they stay external, never bundled).
- **`devDependencies`** = everything else: `vite-plus`, `eslint`,
  `@typescript-eslint/parser`, `eslint-doc-generator`, `esbuild`,
  `typescript-6`, `@types/node`. ESLint is a devDependency only; plugins need
  nothing from it at runtime.

Refresh the lockfile with `npm install` (or `npm install
--package-lock-only` for a version bump) and commit it with the change.
