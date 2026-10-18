---
description: package.json imports replace deno.json imports; key order is the layer order; no "#x/*" patterns, deeper specifiers are bypasses
---

`src/helpers/imports.ts` reads the nearest `package.json` `imports` with
`node:fs` and `JSON.parse` (reading a file is not an import, so
`project/no-asset-imports` is unaffected). `JSON.parse` keeps key order for
`#` keys, which are never integer-like, so the layer order maps 1:1. Neither
Oxfmt's `package.json` sort nor npm reorders the keys inside `imports`.

- Node.js has no trailing-slash folder mappings (`"#components/"`), and `/*`
  subpath patterns are not used either: outside an alias's area only the
  exact alias reaches it ([[imports-aliases-barrels]]). `no-barrel-bypass`
  reports any specifier deeper than an alias (`#components/x.ts`), whether or
  not a pattern makes it resolve, suggesting the alias; the layer rules
  resolve such a specifier to that alias. A catch-all `"#/*"` is reported
  too, with no alias to suggest.
- Only string targets starting with `./` or `../` are read. Package targets
  (`"#lit": "lit"`) and condition objects are ignored, as Deno ignored
  `jsr:`/`npm:` targets.
- Discovery follows Node.js, not Deno: walk up from the file and stop at the
  nearest `package.json`, even when it has no local `#` entry, so a nested
  package never borrows an enclosing one's imports (decided 2026-10-16;
  Deno kept walking to the first file with a `#` entry). A fixture under
  `src/testing/fixture/src/utils/vendored/` tests it.
- `deno.jsonc` and JSONC are gone: `package.json` is strict JSON. An
  unparsable nearest file gives no config; the search does not go past it.
- Parsed configs are cached per file path and reused only while its `mtimeMs`
  is unchanged, so an editor's long-lived lint process sees edits. Deno cached
  per directory for the whole run.
