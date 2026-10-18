---
description: Vitest via vp test; unit tests sit next to code as *.test.ts, regression/integration tests in tests/ via the public entry; scripts/ has no tests
---

Decided 2026-10-14 for all repos.

- **Runner:** Vitest through `vp test`. Import test APIs from
  `vite-plus/test` (`describe`, `expect`, `it`).
- **Unit tests** sit next to the code: `src/foo/bar.ts` is tested in
  `src/foo/bar.test.ts`. Vitest's default include finds them; no `test`
  config needed. Packages publish only `dist/`, so colocated tests cost nothing
  in the tarball.
- **Regression and integration tests** live in the top-level `tests/` folder
  and use only the public entry point (through an alias like `#plugin`,
  which names `src/plugin/`, since no alias may point at `src/` itself), never
  internals. `vp test tests` runs just these.
- **No in-source tests** (`import.meta.vitest`).
- **`scripts/` gets no tests** (2026-10-15): it is repo tooling, not
  production code (the `project-lint*.ts` files).
- Test files follow every lint rule; no relaxed overrides for tests.

## Migrating Deno tests

`Deno.test` suites were converted by a codemod
(`~/.local/share/deno-migration/src/convert.ts` on the user's machine), then
its TODOs finished by hand. Watch for:

- `@std/assert` → `expect` (`assertEquals` → `toStrictEqual` or `toBe`,
  `assertThrows` → `toThrow`, `assertRejects` → `rejects.toThrow`);
- `Deno.*` file, env, and process APIs → `node:fs`, `process.env`,
  `node:child_process`;
- `t.step` → nested `describe`/`it`;
- sanitizer options, which Vitest doesn't have.

A migration PR must keep every test case; a dropped case is lost coverage.
Tests must pass locally before any push.
