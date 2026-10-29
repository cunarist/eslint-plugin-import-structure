# import-structure/prefer-alias-import

📝 Require the `#` alias for a module that `package.json` declares.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

An alias owns its target, so its target has one spelling everywhere outside
it: the alias. Reaching the same file through a `./` path gives it a second
spelling, which hides the dependency from anyone searching for the alias and
lets a path sidestep the layer order of
[`enforce-layer-order`](enforce-layer-order.md).

- A `./` specifier fires when an alias points at the resolved file
  and the importing file lies outside that alias's area, a same-folder
  sibling of a file alias included. The fix swaps in the alias, keeping the
  quote style. The target counts as named with its own extension, another
  script extension, or none, so `./b/f.js` and `./b/f` both name `b/f.ts`.
  A specifier with a query or fragment, such as `./b/f.ts?raw`, is reported
  without a fix, since the alias cannot carry it.
- A path to the importing file's own area entry point is left to
  `enforce-layer-order`, since switching to the alias would not fix it.
- A path to another file inside an area is left to
  [`no-relative-bypass`](no-relative-bypass.md), and `../` specifiers to
  [`no-parent-import`](no-parent-import.md), which offers the same rewrite.

Examples of **incorrect** code for this rule:

```ts
// "#a": "./a/index.ts", "#f": "./b/f.ts"
// in main.ts
import { a } from "./a/index.ts";
import { f } from "./b/f.ts";
// in b/g.ts, which no alias owns
import { f } from "./f.ts";
```

Examples of **correct** code for this rule:

```ts
import { a } from "#a";
import { f } from "#f";
import { g } from "./b/g.ts";
```

## When Not To Use It

If you prefer paths to aliases for nearby modules, turn this rule off.
