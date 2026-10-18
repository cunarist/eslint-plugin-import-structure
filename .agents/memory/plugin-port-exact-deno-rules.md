---
description: A published eslint-plugin-* holds exactly the rules of the Deno plugin it replaced, same names and behavior; anything not 1:1 is flagged, not decided
---

User decision (2026-10-15): each npm plugin contains **exactly** the rules of
the original Deno plugin: same rule names, same behavior, none added, none
removed. `tests/configs.test.ts` pins the rule list.

| npm package                      | Deno source                              | Rules | Configs                                                             |
| -------------------------------- | ---------------------------------------- | ----- | ------------------------------------------------------------------- |
| `eslint-plugin-explicit-types`   | `deno-lint-plugin-explicit-types` 0.5.1  | 15    | `concrete`, `naming`, `absence`, `all`                              |
| `eslint-plugin-import-structure` | `deno-import-check` 0.9.0, `./lint` only | 11    | `modules`, `all`                                                    |
| `eslint-plugin-lit-robust`       | `deno-lint-plugin-lit` 0.7.1             | 82    | `core`, `strict`, `dom-ref`, `reactive-controller`, `naming`, `all` |

- **A rule this repo needs only for itself** (Deno parity, self-lint) goes in
  `scripts/project-lint.ts`, never in the published plugin
  ([[project-lint-plugin]]).
- **New rules after the port** are separate, later PRs the user asks for
  (explicit-types PR 2 adds `single-capital-type-params` to `naming`). Never
  slip a new rule into a port PR.
- **Differences forced by Node** are allowed and documented: `deno.json`
  `imports` → `package.json` `imports`, `mod.ts` → `index.ts` (the import-structure plugin's
  `enforce-mod-file` keeps its name but now requires `index.ts`), Deno's
  `message` + `hint` → one ESLint-style message plus suggestions.
- **Anything else that can't be 1:1** is flagged to the user in the PR and
  `.agents/memory`, not decided quietly. Open examples: deno-import-check's CLI
  (alias checks) was not ported; renaming `enforce-mod-file`; whether lit
  rules get options for their hard-coded lists.
- Versions continue from Deno: explicit-types went 0.5.1 → 0.6.0, so the
  first npm version is the next minor.

Each plugin lives in a new repo (`cunarist/eslint-plugin-<x>`) with fresh
history: `main` starts as a README-only commit and the port lands through a
PR. The old `deno-*` repo keeps its history and is archived only after the npm
package is published.

Every README says the plugin targets both ESLint and Oxlint, and states
"Node.js 22.18+".
