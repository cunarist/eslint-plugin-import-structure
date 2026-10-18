# import-structure/enforce-import-order

📝 Enforce grouped and sorted import declarations and import members.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Imports go in three groups separated by a blank line: packages, then `#`
aliases, then relative paths. The groups run from most distant to most local,
so the shape of a file's dependencies is visible before reading a single
statement.

- Anything that is neither a `#` alias nor a path counts as a package, which
  covers bare names, `node:` builtins, and URLs alike.
- Within a group, specifiers are sorted by code point, so punctuation such as
  `#` and `@` counts.
- Names inside the braces are sorted case-insensitively, ignoring any `type`
  modifier. A default or namespace binding sits outside the braces and stays
  where it is.
- One problem is reported per file. The fix rewrites the whole import block,
  or the one brace list, unless a comment or another statement sits inside it,
  or a wrapped brace list starts on the `import {` line; then it reports
  without a fix, so nothing gets discarded or mangled.
- A side-effect import, such as `import "./setup.ts";`, may need to run
  before or after its neighbours, so the fix never moves it or moves another
  import across it. It still counts for the order, and a block that cannot be
  put fully in order without moving it is reported without a fix.
- Do not run another import sorter, such as Oxfmt's `sortImports`, beside this
  rule: two sorters that disagree undo each other's fixes.

Examples of **incorrect** code for this rule:

```ts
import { helper } from "./helper.ts";
import { format, Button } from "#components";
import { z } from "zod";
```

Examples of **correct** code for this rule:

```ts
import { z } from "zod";

import { Button, format } from "#components";

import { helper } from "./helper.ts";
```

## When Not To Use It

If a formatter already sorts your imports, turn this rule off.
