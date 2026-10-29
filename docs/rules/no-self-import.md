# import-structure/no-self-import

📝 Disallow a module from importing itself.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

A module that imports itself is an immediate circular dependency: the import
evaluates the file that is already evaluating, and every binding it reads may
still be uninitialized. Read the local declaration directly instead.

- Every form that names a module is checked: `import`, `export ... from`,
  `export * from`, a dynamic `import()` with a string or substitution-free
  backtick literal, and a type-level `import("...")`.
- Relative paths, absolute paths, `file:` URLs, exact `#` entries, and `#`
  subpath patterns from the nearest `package.json` are all resolved.
- A query or fragment suffix, such as `?raw`, is ignored when resolving,
  and a path names a file in any spelling TypeScript resolves to it, so
  `./one.js` and `./one` both name `one.ts`, but `./one.mts` does not.
- Package specifiers are never resolved, so they never fire.

Examples of **incorrect** code for this rule:

```ts
// in ./src/components/internal.ts
import { helper } from "./internal.ts";
import { other } from "#components/internal.ts";
```

Examples of **correct** code for this rule:

```ts
// in ./src/components/internal.ts
import { helper } from "./helper.ts";
```

## When Not To Use It

Oxlint's and eslint-plugin-import's `import/no-self-import` cover the common
forms. If you already run one of them and do not need the type-level and
backtick forms, this rule adds little.
