---
name: add-lint-rule
description: Add a rule to a @cunarist/eslint-plugin-* repo (only when the user asked for that rule); the files to create, dual ESLint+Oxlint tests, config registration, docs regeneration
---

The published plugin holds exactly the rules the user decided on; never add
one on your own initiative, and never inside a port PR (memory
`plugin-port-exact-deno-rules`). A rule only this repo needs for itself goes
in `scripts/project-lint.ts` instead, with no tests.

Use a new branch and PR. For a rule id `my-rule` (kebab-case):

1. **`src/rules/my-rule.ts`** exporting `export const myRuleRule:
   <Repo>Rule` (the repo's rule type alias, e.g. `ExplicitRule`, `LitRule`).
   - Standard `meta` + `create(context)`; never `createOnce`.
   - `meta.docs.description` starts with Disallow/Require/Enforce, no period;
     `meta.docs.url: docsUrl("my-rule")`.
   - `messages` with one ESLint-style sentence each; report via `messageId`
     with string `data`.
   - Annotate every visitor's node parameter with its `TSESTree` type.
   - Autofix only when safe for behavior and types (`meta.fixable`);
     otherwise a suggestion (`meta.hasSuggestions`), or nothing.
   - Shared code from `#helpers`; no `../` imports.
2. **`src/rules/my-rule.test.ts`**: exactly one `testRule("my-rule",
   myRuleRule, { valid: [...], invalid: [...] })` call from `#testing`, cases
   grouped under `//` comments, ESLint-shaped (1-based columns via `spanOf`),
   with `output`/`suggestions` asserted for every fix. Cover what it must not
   fire on as well as what it catches. Snippets must be valid TypeScript.
3. **Register** it in `src/rules/index.ts` (the `Map`) and add its id to the
   config list(s) in `src/plugin/index.ts`. `all` picks it up by itself.
4. **Update `tests/configs.test.ts`**, which pins the rule list.
5. **`docs/rules/my-rule.md`**: Rule Details, one incorrect and one correct
   `ts` block, Options only if any, When Not To Use It.
6. **Regenerate docs:**

   ```sh
   vp pack && npm run docs
   ```

   This writes the doc header and the README rules list.

7. **Verify** before pushing:

   ```sh
   vp check
   vp test
   vp pack && npm run docs -- --check
   ```

   The repo lints itself with the new rule at once; fix any hits in the
   source, never with disable comments or overrides.

8. Open the PR and run the `review-cycle` skill. A new rule is a minor bump
   before 1.0 when it ships in an existing config.
