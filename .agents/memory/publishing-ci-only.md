---
description: Packages publish only from CI when a GitHub release vX.Y.Z is published, via npm trusted publishing; never npm publish by hand; notes live only on the release page
---

Standing convention (2026-10-12), applied to every package:

- **Only CI publishes.** Publishing a GitHub release `vX.Y.Z` triggers
  `.github/workflows/publish.yml`. Never run `npm publish` locally and never
  push a bare `v*` tag. Use the `release` skill, and only when the user asked
  for a release.
- **The workflow** checks that the tag equals `v` + `package.json` `version`,
  runs the full CI as a reusable workflow (every Node version in the matrix),
  then `vp pack` and `npm publish --access public --provenance`. A release
  marked pre-release publishes under the `next` dist-tag, others `latest`.
  It runs on Node 24 (npm 11, which trusted publishing needs) with no cache.
- **Auth is npm trusted publishing** (OIDC, `id-token: write`), which also
  attaches provenance. npm only allows a trusted publisher on a package that
  already exists, so the very first release bootstraps with a short-lived
  token in the `NPM_TOKEN` repo secret (the workflow uses it only when set).
  Afterwards the user configures the trusted publisher for `publish.yml`,
  deletes the secret, and sets the package to disallow tokens.
- **Release notes live only on the GitHub release page**
  (`--generate-notes`, edited there). There is no `CHANGELOG.md`; never add
  one.
- **The version lives in two places in plugin packages:** `package.json` and
  `meta.version` in `src/plugin/index.ts`; `tests/package-meta.test.ts` fails if they
  differ.
- **Before 1.0**, a change that breaks users (renamed rule id, a rule that
  fires on more code, removed behavior) is a minor bump.
- **Before a release**, pack the package and lint a known-bad and a known-good
  file from separate consumer projects, once through `vp lint` with
  `jsPlugins` and once through ESLint 9 with the configs. On the lit plugin
  this caught two bugs that 313 unit tests missed.

The cunarist lint plugins (explicit-types, modules, lit) are published
together, with a token the user provides; the old `deno-*` repos are archived
only after that, one at a time.
