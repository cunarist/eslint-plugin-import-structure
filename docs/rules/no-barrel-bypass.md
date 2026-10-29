# import-structure/no-barrel-bypass

📝 Disallow `#` specifiers deeper than an alias.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Code outside an alias's area reaches it only through the exact alias, so the
area keeps exactly one public surface. Whatever the importer needs should be
exported from the alias's target.

- A `#` specifier deeper than an alias, such as `#a/one.ts` beside `#a`,
  fires whether or not a subpath pattern makes it resolve. The rule suggests
  the alias itself. It is a suggestion, not a fix: the target may not export
  the name yet.
- The suggested alias is the one that owns the path the specifier names, so
  with `#a-sub` owning `a/sub/`, `#a/sub/x.ts` reaches past `#a-sub`.
- No `/*` subpath patterns: a pattern no alias sits under, such as a
  catch-all `"#/*": "./src/*"`, fires when it is used from or into an owned
  area, with no alias to suggest.
- See [Modules](../../README.md#modules) for the whole rule.

Examples of **incorrect** code for this rule:

```ts
// "#components": "./src/components/index.ts"
import { internal } from "#components/internal.ts";
```

Examples of **correct** code for this rule:

```ts
import { internal } from "#components";
```

## When Not To Use It

If you deliberately expose files inside an area through a subpath pattern,
turn this rule off.
