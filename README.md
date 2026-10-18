# eslint-plugin-import-structure

Import-structure rules for both [ESLint](https://eslint.org) and [Oxlint](https://oxc.rs/docs/guide/usage/linter): a module graph that stays layered and free of cycles.\
Install with `npm install --save-dev eslint-plugin-import-structure`. Requires Node.js 22.18+.

```ts
// Oxlint, through Vite+: vite.config.ts
import plugin from "eslint-plugin-import-structure";
import { defineConfig } from "vite-plus";
const rules = { ...plugin.configs.modules.rules };
export default defineConfig({
  lint: { jsPlugins: ["eslint-plugin-import-structure"], rules },
});
```

```ts
// ESLint 9: eslint.config.ts (loading a .ts config needs jiti)
import plugin from "eslint-plugin-import-structure";
import { parser } from "typescript-eslint";
const ts = { files: ["**/*.ts"], languageOptions: { parser } };
export default [ts, plugin.configs.modules];
```

## Configs and rules

- `modules`: areas reached only through their `package.json` `imports` aliases, layered by their order.
- `all`: every rule, including ones added later. Rules take no options.

The order of the `#` aliases in `package.json` is the layer order, top first; an area may only import aliases declared below its own.

### Modules

An alias owns its target, and code outside the owned area reaches it only through the alias.
The rule never depends on folder or file names; an alias may point anywhere.

- An alias to a folder's `index.ts` owns that folder and everything below it. An alias to any other file owns only that file.
- No file may be owned by 2 aliases: no alias inside another alias's area, and no 2 aliases with the same target.
  `enforce-layer-order` reports an overlap once at the top of every file 2 aliases claim, since lint cannot report on `package.json`.
- Outside an area, any other route to an owned file is a bypass: a deeper alias specifier such as `#a/one.ts` (`no-barrel-bypass`), or a relative path (`no-relative-bypass`, and `prefer-alias-import`, which rewrites a path to the alias's exact target).
- Inside an area, relative imports of siblings and subfolders are free.
- `../` is banned in every file, owned or not (`no-parent-import`). Anything above a file needs an alias.
- Files no alias owns need no `index.ts` and no alias, and import `./` siblings and subfolders freely.
- Don't declare `/*` subpath patterns: any use of one that reaches an owned area is a bypass (`no-barrel-bypass`). Entry points are named `index.ts` only (`enforce-mod-file`).

```jsonc
"imports": {
  "#a": "./a/index.ts", // owns a/ and everything below it
  "#f": "./b/f.ts", // owns only b/f.ts; b/g.ts stays unowned
}
```

```ts
// in main.ts, which no alias owns
import { a } from "#a"; // ✅
import { one } from "#a/one.ts"; // ❌ deeper alias specifier
import { two } from "./a/two.ts"; // ❌ relative path into #a
import { f } from "./b/f.ts"; // ❌ relative path to a file alias; use "#f"
import { g } from "./b/g.ts"; // ✅ unowned
// in a/one.ts, owned by #a
import { two } from "./two.ts"; // ✅ sibling
import { deep } from "./sub/deep.ts"; // ✅ subfolder of the same area
import { x } from "../x.ts"; // ❌ no ../ anywhere
```

The other rules (import order, duplicate sources, wildcards, absolute paths, self-imports) are not about aliases and apply to every file.

<!-- prettier-ignore-start -->
<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules) enabled in.\
🧭 Set in the `modules` [configuration](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

| Name                                                                   | Description                                                                  | 💼 |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :- |
| [enforce-import-order](docs/rules/enforce-import-order.md)             | Enforce grouped and sorted import declarations and import members            | 🧭 |
| [enforce-layer-order](docs/rules/enforce-layer-order.md)               | Enforce the order of `package.json` `imports` as the layer order             | 🧭 |
| [enforce-mod-file](docs/rules/enforce-mod-file.md)                     | Enforce `index.ts` as the name of module entry points                        | 🧭 |
| [no-absolute-import](docs/rules/no-absolute-import.md)                 | Disallow absolute paths and `file:` URLs as module specifiers                | 🧭 |
| [no-barrel-bypass](docs/rules/no-barrel-bypass.md)                     | Disallow `#` specifiers deeper than an alias                                 | 🧭 |
| [no-duplicate-import-source](docs/rules/no-duplicate-import-source.md) | Disallow separate import declarations from the same source                   | 🧭 |
| [no-parent-import](docs/rules/no-parent-import.md)                     | Disallow parent-relative module specifiers                                   | 🧭 |
| [no-relative-bypass](docs/rules/no-relative-bypass.md)                 | Disallow relative specifiers that reach into an alias's area from outside it | 🧭 |
| [no-self-import](docs/rules/no-self-import.md)                         | Disallow a module from importing itself                                      | 🧭 |
| [no-wildcard-import](docs/rules/no-wildcard-import.md)                 | Disallow namespace imports                                                   | 🧭 |
| [prefer-alias-import](docs/rules/prefer-alias-import.md)               | Require the `#` alias for a module that `package.json` declares              | 🧭 |

<!-- end auto-generated rules list -->
<!-- prettier-ignore-end -->

License: MIT.
