---
description: Rule docs in docs/rules/<rule>.md (ESLint core layout); README rules list and doc headers come from eslint-doc-generator after vp pack
---

## Rule docs

Every rule has `docs/rules/<rule>.md` (ESLint's convention; `meta.docs.url`
points there). The user had docs moved out of `src/` for this. Layout, below
the generated header:

```markdown
<!-- end auto-generated rule header -->

## Rule Details

What failure it prevents and why the alternative removes it; bullets for the
edges (what it does not fire on, what it can't see).

Examples of **incorrect** code for this rule:
(one ts block)

Examples of **correct** code for this rule:
(one ts block)

## Options <- only if the rule has options

## When Not To Use It
```

Keep `ts` examples valid at top level; `vp fmt` reformats Markdown.

## eslint-doc-generator

- devDependency; options live in the `eslint-doc-generator` key of
  `package.json` (no other config file is allowed).
- It loads the **built** plugin from `exports` (`dist/index.js`), so run
  `vp pack` first, then `npm run docs`. CI runs `npm run docs -- --check`.
- It writes each doc's header (title, description, configs) and the README
  rules list.
- Settings used: `configEmoji` per config, `ignoreConfig: ["all"]` (it would
  mark every rule), `ruleListColumns: ["name", "description", "configsError"]`,
  `ruleDocSectionInclude: ["Rule Details", "When Not To Use It"]`, and
  `urlConfigs` pointing at the README's configs section.
- **Gotchas:** wrap the README list in `<!-- prettier-ignore-start -->` /
  `<!-- prettier-ignore-end -->`, because Oxfmt and the generator measure emoji
  widths differently and would fight forever. Avoid config emojis with a
  U+FE0F variation selector (padding never settles). The list can't be grouped
  by config: `--rule-list-split` splits only by rule properties.

## README

- For library users only (no contributor content).
- States that it targets both ESLint and Oxlint and needs Node.js 22.18+.
- Shows install plus ESLint and Oxlint usage, one short paragraph per config,
  then the generated rules list. It links to the rule docs, never repeats
  them.
