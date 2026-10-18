# import-structure/enforce-mod-file

📝 Enforce `index.ts` as the name of module entry points.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

Module entry points are named `index.ts`, the Node.js convention. One name
everywhere means a module's entry point is never ambiguous.

The rule keeps the name it had in the Deno plugin, which required `mod.ts`;
on Node.js it requires `index.ts` and rejects `mod`.

- A file whose stem is `mod`, with any extension, fires once at the top of the
  file.
- A `./`, `../`, or `#` specifier pointing at a `mod` file fires. Rename the
  target and update the specifier.
- Package specifiers are never checked: a package may ship whatever file names
  it likes.
- Only areas an alias owns have entry points (see
  [Modules](../../README.md#modules)). A `mod` file no alias owns, and an
  import between two such files, such as `./scripts/mod.ts` from
  `vite.config.ts`, are left alone.
- No rule treats `mod` as an entry point. With this rule off, an alias to a
  `mod` file still owns only that file.

Examples of **incorrect** code for this rule:

```ts
// in ./src/utils/mod.ts
import { thing } from "./sub/mod.ts";
```

Examples of **correct** code for this rule:

```ts
// in ./src/utils/index.ts
import { thing } from "./sub/index.ts";
import { html } from "some-package/mod.ts";
```

## When Not To Use It

If your project has files named `mod` that are not meant as entry points,
turn this rule off. The plugin does not support `mod.ts` entry points.
