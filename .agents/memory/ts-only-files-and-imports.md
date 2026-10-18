---
description: Every file is .ts (no js/mjs/cjs/jsx/tsx, configs included); imports name .ts files or .js/.mts/.mjs package subpaths, never assets; JSON data becomes .ts modules
---

The user's rule, from the Deno days and restated for Node (2026-10-12): "No
JS, not even JSX/TSX, only TS." Source, scripts, tests, and configs are all
plain `.ts`. Build output in a gitignored folder is the only JS.

`tsconfig.json`: no `allowJs`, no `jsx`, and exactly this strictness set (user
decision, 2026-10-18): `strict` (written out), `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noUnusedLocals`,
`noUnusedParameters`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
`erasableSyntaxOnly`, and `allowUnreachableCode: false` plus
`allowUnusedLabels: false` (user decision, 2026-10-18; on in the Deno setup),
plus the mechanical `verbatimModuleSyntax`, `allowImportingTsExtensions`, and
`noEmit` (this package also keeps `declaration` and `isolatedDeclarations`).
`exactOptionalPropertyTypes` is off everywhere: write `{ key: maybeUndefined }`
rather than leaving the key out to please it. If a tool or framework seems to
need a JS or TSX file, stop and flag it instead of adding one.

## No asset imports (2026-10-14, widened 2026-10-16 and 2026-10-17)

`project/no-asset-imports` (in `scripts/project-lint-modules.ts`; it was
`no-non-ts-imports` before 2026-10-16) fails:

- a relative, absolute, `#`, or package-subpath specifier whose last segment
  has an extension other than `.ts`, `.js`, `.mts`, or `.mjs`: `.css`,
  `.json`, `.svg`, `.jsx`, `.tsx`, and every other asset;
- any `?query` suffix (`?raw`, `?url`, `?inline`);
- any import attributes (`with { type: "json" }`, `with { type: "text" }`).

`.js`, `.mts`, and `.mjs` are allowed (user decision, 2026-10-17) for package
subpaths such as `lit/decorators.js` or `pdfjs-dist/legacy/build/pdf.mjs`;
our own files are still `.ts` only. `.jsx` and `.tsx` stay banned. Extensions
are matched whole, so `.cjs` and `.cts` stay banned too. Bare packages (`lit`, `@types/json-schema`,
`lodash.debounce`), `#` aliases, and `node:` builtins pass.
`@fortawesome/x/svgs/a.svg` fails.

```ts
import "./theme.css"; // no
import data from "./scenes.json" with { type: "json" }; // no
import icon from "./lock.svg?raw"; // no
import { scenes } from "#data/scenes"; // yes: scenes.ts
```

## What to do instead

- **JSON data:** turn it into a `.ts` module exporting a typed constant.
- **`package.json` fields at runtime:** never `import pkg from
  "./package.json"` and there is no `#package` alias. Write the value out in
  `.ts` and add a test in `tests/` that reads `package.json` with `node:fs`
  and fails on drift (the plugin repos do this for `meta.name`/`meta.version`).
- **Reading a file is not importing it.** `readFileSync` + `JSON.parse` is
  fine in tooling and tests.
- **A tool's `.js` entry:** `import("pkg/cli.js")` passes the rule now, but
  prefer the package entry or spawning its bin.
