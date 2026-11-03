# import-structure/no-relative-bypass

📝 Disallow relative specifiers that reach into an alias's area from outside it or past a subfolder's index file.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

The same principle as [`no-barrel-bypass`](no-barrel-bypass.md), for
relative paths. An alias owns its target: an alias to a folder's `index.ts`
owns that folder and everything below it, and an alias to any other file
owns only that file. An alias inside another alias's area owns its part,
carved out of the outer area. Code outside an area reaches it only through
the alias.

- A `./` specifier fires when it lands in an area the importing file is not
  in. It names the alias to import instead. A folder alias's area includes
  the folder path itself, so a directory specifier such as `./a` fires too.
- A file 2 aliases with the same area own counts as inside both areas,
  so only `enforce-layer-order` reports the overlap.
- Inside an area, siblings are free, and a subfolder is reached only
  through its direct `index.ts`, like a Rust `mod.rs`. A `./` specifier
  that goes deeper into a subfolder fires, a grandchild's `index.ts`
  (`./sub/inner/index.ts`) included, which is reached through
  `./sub/index.ts`. A subfolder without an `index.ts` cannot be imported by
  path at all. The `index.ts` may be spelled any way TypeScript resolves to
  it, such as `./sub/index.js`; a directory specifier such as `./sub` names
  a sibling path and stays free.
- Inside an area, a path into a deeper alias's area is reached through that
  alias.
- Files no alias owns are free from anywhere, and no `index.ts` is demanded
  of their folders.
- A path to an alias's target, in any spelling TypeScript resolves to it
  (such as `.js` for `.ts`, or no extension), is left to
  [`prefer-alias-import`](prefer-alias-import.md), which rewrites it.
- Specifiers with a `..` segment (such as `../x.ts` or `./sub/../x.ts`),
  `#`, and package specifiers are left to other rules.
- See [Modules](../../README.md#modules) for the whole rule.

Examples of **incorrect** code for this rule:

```ts
// "#a": "./a/index.ts", in main.ts
import { one } from "./a/one.ts";
import { deep } from "./a/sub/deep.ts";
import { a } from "./a";
// in a/one.ts, owned by #a
import { deep } from "./other/deep.ts";
import { inner } from "./other/inner/index.ts";
// "#a-sub": "./a/sub/index.ts" as well, in a/one.ts
import { deep } from "./sub/deep.ts";
```

Examples of **correct** code for this rule:

```ts
// in main.ts, which no alias owns
import { a } from "#a";
import { g } from "./b/g.ts";
// in a/one.ts, owned by #a
import { two } from "./two.ts";
import { other } from "./other/index.ts";
```

## When Not To Use It

If you reach into aliased folders or deep into subfolders by path on
purpose, turn this rule off.
