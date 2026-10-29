# import-structure/enforce-layer-order

📝 Enforce the order of `package.json` `imports` as the layer order.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

The order of `#` aliases in `package.json` `imports` is the layer order,
top layer first: an area may only import aliases declared below its own.
This makes cycles between areas structurally impossible rather than merely
detectable, and the `imports` map doubles as documentation of the layers.

```json
{
  "imports": {
    "#components": "./src/components/index.ts",
    "#utils": "./src/utils/index.ts",
    "#types": "./src/types/index.ts"
  }
}
```

- An alias owns its target: an alias to an `index` file, with any
  extension, owns its whole folder; an alias to any other file, `mod.ts`
  included, owns only that file. Aliases may point anywhere. Files no alias
  owns are never checked (see [Modules](../../README.md#modules)).
- An alias may sit inside another alias's area. The deeper alias owns its
  part, carved out of the outer area, and the outer alias owns the rest.
  The two are ordered like any other pair of aliases.
- No 2 aliases may have the same area, such as the same target or 2
  `index` files in one folder. Lint cannot report on `package.json`, so an
  overlap fires once at the top of every file the 2 aliases own, naming
  them. Merge the aliases.
- A target is resolved whether it is written as an exact alias, a deeper
  specifier such as `#components/x.ts`, or a relative path to an alias's
  target. A path names a file in any spelling TypeScript resolves to it,
  in TypeScript's order, so `./index.js` and `./index` name `./index.ts`.
  A specifier a `/*` subpath pattern matches belongs to the alias whose
  target the file it resolves to is, else to the alias that owns that
  file, whatever the pattern's name. It belongs to no alias when no alias
  owns that file, or when the pattern leads to a package or through
  conditions. A query or fragment suffix, such as `?raw`, is ignored.
- A file importing its own area's alias, or a path or deeper specifier to
  its entry point, fires too, since that is a cycle waiting to happen. Use a
  relative import of the sibling file instead. A deeper specifier to any
  other file of the own area is no cycle and is left to `no-barrel-bypass`.
- To fix an upward import, either reorder the two aliases or move the shared
  code into an area declared below both.

Examples of **incorrect** code for this rule:

```ts
// in ./src/utils/format.ts
import { Button } from "#components";
import { helper } from "#utils";
```

```ts
// "#utils": "./src/utils/index.ts", "#utils-sub": "./src/utils/sub/index.ts"
// in ./src/utils/sub/x.ts, owned by #utils-sub, declared below #utils
import { helper } from "#utils";
```

```jsonc
// every file in src/utils/ is owned by both
"#utils": "./src/utils/index.ts",
"#helpers": "./src/utils/index.ts"
```

Examples of **correct** code for this rule:

```ts
// in ./src/utils/format.ts
import type { User } from "#types";
import { helper } from "./helper.ts";
// in ./src/utils/x.ts, owned by #utils, declared above #utils-sub
import { sub } from "#utils-sub";
```

## When Not To Use It

If your `imports` aliases are not ordered by layer, turn this rule off.
