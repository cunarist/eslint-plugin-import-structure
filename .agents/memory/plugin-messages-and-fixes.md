---
description: Messages are one ESLint-style sentence via messageId; descriptions start Disallow/Require/Enforce; safe autofixes in the rule file, suggestions where judgment is needed
---

## Messages and descriptions

- ESLint and Oxlint diagnostics have no hint field, so Deno's `message` and
  `hint` become **one sentence** in ESLint style. Fix advice that needs more
  words goes in a suggestion's description or the rule doc.
- Report with `messageId` (and string `data`), never a raw `message`, so tests
  assert which message fired.
- `meta.docs.description` starts with **Disallow**, **Require**, or
  **Enforce**, and has no trailing period (it feeds the generated README
  list).
- `meta.docs.url` points at `docs/rules/<rule>.md` on GitHub.

```ts
// src/rules/no-keyof.ts in explicit-types
export const noKeyofRule: ExplicitRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow the `keyof` type operator", url: docsUrl("no-keyof") },
    schema: [],
    messages: { keyof: "Unexpected `keyof` in a type position." },
  },
  create(context) {
    return {
      TSTypeOperator(node: TSESTree.TSTypeOperator): void {
        if (node.operator !== "keyof") {
          return;
        }
        context.report({ node, messageId: "keyof" });
      },
    };
  },
};
```

## Autofix vs suggestion (2026-10-14)

- **Autofix** (`meta.fixable` + `fix` in `context.report`) only when the
  change is safe for behavior _and_ types in every case the rule reports.
- **Suggestion** (`meta.hasSuggestions` + `suggest`) when a fix is plausible
  but needs a human's judgment, or is unsafe in some cases.
- **Nothing** when no fix is reliably right.
- The fix lives in the rule's own file. Every fix and suggestion is tested
  under both linters ([[plugin-dual-ruletester]]).
- A fix must refuse rather than guess when comments or other statements sit
  in the range it would rewrite (the modules plugin's `enforce-import-order` does
  this).
