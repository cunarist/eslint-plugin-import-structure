---
description: The plugin holds exactly the 11 lint rules of the `./lint` entry of the `deno-import-check` JSR package, same names; the CLI was not ported
---

Ported from the `deno-import-check` JSR package 0.9.0, its `./lint` entry
(`src/lint.ts`) only. The published plugin holds exactly its 11 rules under the
same names, nothing added or removed; `tests/configs.test.ts` pins the list.
Anything that cannot be 1:1 is flagged to the user, not decided
([[plugin-port-exact-deno-rules]]).

**The CLI was not ported.** It resolved the whole module graph with
`@deno/loader` and reported cycles, `#` aliases sharing a target, and unused
`#` aliases. Oxlint's `import/no-cycle` covers cycles (this repo turns it on in
`configs.project`); nothing covers the alias checks yet. Whether to port the
CLI is an open question for the user.

Deliberate differences from Deno, each forced by Node.js:

- `deno.json` `imports` became `package.json` `imports`; see
  [[node-subpath-imports]].
- Entry points are `index.ts`, not `mod.ts`; see [[index-not-mod]].
- Messages are one ESLint-style sentence; Deno's hints moved to the rule docs.
  `no-barrel-bypass` gained a suggestion to import the entry point, the
  template's way of carrying fix advice.
