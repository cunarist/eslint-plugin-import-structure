# eslint-plugin-import-structure

Keep a TypeScript module graph layered and free of cycles, using the `imports` field of `package.json` as the map.
Works in both [ESLint](https://eslint.org) and [Oxlint](https://oxc.rs/docs/guide/usage/linter).

![Diagram: the package.json imports aliases #app, #utils and #types each own a folder through its index.ts, and their order is the layer order. #app may import "#utils" and #utils may import "#types". Reaching into an internal file with "#utils/format.ts" and importing "#utils" upward from #types are reported. Files inside a module import each other relatively.](https://raw.githubusercontent.com/cunarist/eslint-plugin-import-structure/main/docs/images/module-layers.svg)

## Why

In a growing codebase, any file can import any other: modules leak their internals, and cycles creep in.
This plugin turns each `#` alias into a module with one entry point, and turns the alias order into a one-way layer order, so cycles between modules cannot happen.

## Install

```sh
npm install --save-dev eslint-plugin-import-structure
# for ESLint, also:
npm install --save-dev eslint typescript-eslint jiti
```

Requires Node.js 22.18+.

## Usage

```ts
// ESLint 9: eslint.config.ts (needs eslint, typescript-eslint, and jiti)
import plugin from "eslint-plugin-import-structure";
import { parser } from "typescript-eslint";

const ts = { files: ["**/*.ts"], languageOptions: { parser } };
export default [ts, plugin.configs.modules];
```

```ts
// Oxlint, through Vite+: vite.config.ts
import plugin from "eslint-plugin-import-structure";
import { defineConfig } from "vite-plus";

const rules = { ...plugin.configs.modules.rules };
export default defineConfig({
  lint: { jsPlugins: ["eslint-plugin-import-structure"], rules },
});
```

Then declare your modules in `package.json`, top layer first:

```json
{
  "imports": {
    "#app": "./src/app/index.ts",
    "#utils": "./src/utils/index.ts",
    "#types": "./src/types/index.ts"
  }
}
```

```ts
// in src/utils/format.ts
import { App } from "#app"; // ❌ upward import (enforce-layer-order)
import type { User } from "#types"; // ✅ a lower layer, through its alias
import { user } from "#types/user.ts"; // ❌ deep import (no-barrel-bypass)

import { x } from "../x.ts"; // ❌ parent path (no-parent-import)
import { helper } from "./helper.ts"; // ✅ a sibling in the same module
```

## Configs and rules

- `modules`: every rule below, all at `error`.
- `all`: every rule, including rules added later. Today it equals `modules`.

No rule takes options.

### Modules

The order of the `#` aliases in `package.json` is the layer order, top first; a module may only import aliases declared below its own.
An alias owns its target, and code outside the owned area reaches it only through the alias.
The rules never depend on folder or file names; an alias may point anywhere.

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
import { two } from "./a/two.ts"; // ❌ relative path into #a
import { f } from "./b/f.ts"; // ❌ relative path to a file alias; use "#f"
import { g } from "./b/g.ts"; // ✅ unowned
// in a/one.ts, owned by #a
import { two } from "./two.ts"; // ✅ sibling
import { deep } from "./sub/deep.ts"; // ✅ subfolder of the same area
```

The other rules (import order, duplicate sources, wildcards, absolute paths, self-imports) are not about aliases and apply to every file.

### Rules

<!-- prettier-ignore-start -->
<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules) enabled in.\
🧭 Set in the `modules` [configuration](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                   | Description                                                                  | 💼 | 🔧 | 💡 |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :- | :- | :- |
| [enforce-import-order](docs/rules/enforce-import-order.md)             | Enforce grouped and sorted import declarations and import members            | 🧭 | 🔧 |    |
| [enforce-layer-order](docs/rules/enforce-layer-order.md)               | Enforce the order of `package.json` `imports` as the layer order             | 🧭 |    |    |
| [enforce-mod-file](docs/rules/enforce-mod-file.md)                     | Enforce `index.ts` as the name of module entry points                        | 🧭 |    |    |
| [no-absolute-import](docs/rules/no-absolute-import.md)                 | Disallow absolute paths and `file:` URLs as module specifiers                | 🧭 |    |    |
| [no-barrel-bypass](docs/rules/no-barrel-bypass.md)                     | Disallow `#` specifiers deeper than an alias                                 | 🧭 |    | 💡 |
| [no-duplicate-import-source](docs/rules/no-duplicate-import-source.md) | Disallow separate import declarations from the same source                   | 🧭 |    |    |
| [no-parent-import](docs/rules/no-parent-import.md)                     | Disallow parent-relative module specifiers                                   | 🧭 | 🔧 |    |
| [no-relative-bypass](docs/rules/no-relative-bypass.md)                 | Disallow relative specifiers that reach into an alias's area from outside it | 🧭 |    |    |
| [no-self-import](docs/rules/no-self-import.md)                         | Disallow a module from importing itself                                      | 🧭 |    |    |
| [no-wildcard-import](docs/rules/no-wildcard-import.md)                 | Disallow namespace imports                                                   | 🧭 |    |    |
| [prefer-alias-import](docs/rules/prefer-alias-import.md)               | Require the `#` alias for a module that `package.json` declares              | 🧭 | 🔧 |    |

<!-- end auto-generated rules list -->
<!-- prettier-ignore-end -->

License: MIT.
