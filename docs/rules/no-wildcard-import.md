# @cunarist/modules/no-wildcard-import

📝 Disallow namespace imports.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-modules#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

An explicit list of names keeps each file's dependency surface narrow and
visible at the import site. A namespace import hides which bindings are used
and lets that set grow without the import changing.

- `import * as name` fires, including `import type * as name` and a namespace
  beside a default binding. The report points at the namespace binding.
- Default, named, and side-effect imports are allowed.
- Re-exports such as `export * from` are left alone.

Examples of **incorrect** code for this rule:

```ts
import * as internal from "./internal.ts";
```

Examples of **correct** code for this rule:

```ts
import { parse, stringify } from "./internal.ts";
import internal from "./internal.ts";
import "./setup.ts";
```

## When Not To Use It

Oxlint's `import/no-namespace` is equivalent. If you run it, turn one of the
two off.
