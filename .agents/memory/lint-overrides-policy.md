---
description: No lint overrides for source files; narrow ones only for scripts/**; generated files go in ignorePatterns; refactor (barrels, splits) instead of raising limits
---

Final policy (2026-10-16). The user considers per-file `overrides` bad
practice.

- **Source files: never.** No `overrides` entry may target `src/**` or any
  other hand-written production or test code.
- **The one exception** is in lint-plugin repos: `import/max-dependencies`
  off for `src/rules/index.ts`, the rule registry, which must import every
  rule. It is not a precedent for apps.
- **`scripts/**`:** a narrow override is allowed when a tooling script truly
  needs it, e.g. `no-console` in a CLI script.
- **`vite.config.ts`** counts as tooling too, but needs no override: no
  alias owns `scripts/project-lint.ts`, so it imports it as
  `./scripts/project-lint.ts` (unowned files import `./` paths freely).
- **Never for size.** `max-lines` is not turned off anywhere, `scripts/**`
  included; split the file. Every remaining override or opt-out carries a
  one-line comment saying why.
- **Generated files:** list them in `ignorePatterns`, never `overrides`.
- **Anything else needs the user's approval first.** When the user is away,
  don't add it: refactor, or leave the violation failing and log the question.

## Fix the code instead

Oxlint's defaults stay; violations are refactored without behavior change,
covered by the tests, inside the same migration PR.

| Rule                      | Usual fix                                               |
| ------------------------- | ------------------------------------------------------- |
| `import/max-dependencies` | import a barrel (`#ui`) instead of many direct modules  |
| `max-lines`               | split the file by responsibility                        |
| `max-lines-per-function`  | extract helpers; split a long Lit template into parts   |
| `max-classes-per-file`    | one class per file                                      |
| `max-params`              | pass one options object                                 |
| `prefer-set-has`          | `const K: ReadonlySet<string> = new Set([...])`, `.has` |

```ts
// before: 14 imports, over the limit of 10
import { a } from "#ui/button";
import { b } from "#ui/dialog";
// after: one barrel
import { a, b } from "#ui";
```
