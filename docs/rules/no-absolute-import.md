# import-structure/no-absolute-import

📝 Disallow absolute paths and `file:` URLs as module specifiers.

💼 This rule is enabled in the 🧭 `modules` [config](https://github.com/cunarist/eslint-plugin-import-structure#configs-and-rules).

<!-- end auto-generated rule header -->

## Rule Details

A leading slash resolves against the file system root rather than the project
root, and a `file:` URL hard codes one machine's layout. Neither survives a
clone into another directory. Use a sibling path or a `#` entry.

- Every import, re-export, dynamic `import()`, and type-level `import("...")`
  is checked.
- Only specifiers starting with `/` or `file:` fire; a Windows drive path such
  as `C:/` is not a valid specifier in the first place.

Examples of **incorrect** code for this rule:

```ts
import { thing } from "/src/components/internal.ts";
import { other } from "file:///home/me/project/src/other.ts";
```

Examples of **correct** code for this rule:

```ts
import { thing } from "#components";
import { other } from "./other.ts";
```

## When Not To Use It

Oxlint's `import/no-absolute-path` covers the leading-slash form. If you run it
and never write `file:` URLs, this rule adds little.
