# import-structure/no-parent-import

📝 Disallow parent-relative module specifiers.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Reaching up with `../` and back down couples two files through their layout
instead of a name: moving either breaks the import, and nothing marks the
target as something meant to be imported. Anything above a file is reached
through an alias.

- Any specifier starting with `../`, or any relative specifier with a `..`
  segment such as `./sub/../../x.ts`, fires, in every file, whether an alias
  owns it or not, and in every import, re-export, dynamic `import()`, and
  type-level `import("...")`.
- When the nearest `package.json` has an alias that points at the same
  file, in any spelling TypeScript resolves to it (such as `.js` for `.ts`),
  the fix rewrites the specifier to that alias, keeping the quote
  style. A backtick specifier becomes a double-quoted one.
- A specifier with a query or fragment, such as `../b/f.ts?raw`, is
  reported without a fix, since the alias cannot carry it.
- With no such alias, or when the alias is the importing file's own area,
  the rule reports without a fix. Add an alias, or move the file.

Examples of **incorrect** code for this rule:

```ts
// in ./src/components/index.ts
import { format } from "../utils/index.ts";
// in ./tests/build.test.ts
import { build } from "../scripts/build.ts";
```

Examples of **correct** code for this rule:

```ts
// package.json: "imports": { "#utils": "./src/utils/index.ts" }
import { format } from "#utils";
```

## When Not To Use It

If your project relies on `../` paths between folders, turn this rule off.
