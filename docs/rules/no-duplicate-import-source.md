# import-structure/no-duplicate-import-source

📝 Disallow separate import declarations from the same source.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

Splitting the imports from one source across several declarations scatters a
file's dependency on that module. Combine them into one declaration.

- Sources are compared exactly as written, so two specifiers that resolve to
  the same file are not assumed equal.
- The first import that binds a value keeps its place, and every other import
  of that source is reported.
- A type-only import beside a bare side-effect import is allowed. The type-only
  declaration disappears from the emitted module, so folding the bare import
  into it would drop the side effect.
- Re-exports and dynamic imports are separate operations and are left alone.

Examples of **incorrect** code for this rule:

```ts
import { parse } from "#utils";
import type { Options } from "#utils";
```

Examples of **correct** code for this rule:

```ts
import { type Options, parse } from "#utils";
```

## When Not To Use It

Oxlint's `no-duplicate-imports` is close, but it also reports a type-only
import beside a side-effect import. If you prefer that, turn this rule off.
