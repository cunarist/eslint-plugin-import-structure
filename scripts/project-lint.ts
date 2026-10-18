/**
 * `project` - lint rules this repository holds its own source to that are not
 * part of the published plugin. The published plugin mirrors the rules it was
 * ported with and nothing else; a rule kept only for this repo's own lint
 * lives in a flat `scripts/project-lint-*.ts` file and is registered here.
 * Its rules of its own are `prefer-ascii` and `no-disable-comments`
 * (`project-lint-source.ts`), `no-asset-imports` (`project-lint-modules.ts`),
 * and ports of the hugoalh `recommended` rules Oxlint lacks
 * (`project-lint-hugoalh.ts`, `project-lint-hugoalh-types.ts`); naming is
 * checked by Oxlint's built-in `id-match`.
 *
 * Loaded by `vite.config.ts` as an Oxlint `jsPlugins` entry, never packed:
 * `vp pack` builds `src/plugin/index.ts` alone and the tarball holds only `dist/`.
 *
 * @module
 */

import type { DummyRuleMap } from "vite-plus/lint";

import {
  noDuplicateInterfacesRule,
  noDuplicateTypesRule,
  noModifierPrivateRule,
  noUselessTypeRule,
} from "./project-lint-hugoalh-types.ts";
import {
  noDuplicateAwaitsRule,
  noDuplicateTypeofsRule,
  noDuplicateVoidsRule,
  noEmptyYieldRule,
  noEnumRule,
  noNanRule,
  noUnsafeNumberRule,
  noUselessContinueRule,
} from "./project-lint-hugoalh.ts";
import { noAssetImportsRule } from "./project-lint-modules.ts";
import { noDisableCommentsRule, preferAsciiRule } from "./project-lint-source.ts";

/**
 * This repository's own rule list, spread by `vite.config.ts` after the
 * published `all` config: rules beyond the Oxlint categories, plus a
 * few extras and opt-outs. Built-in Oxlint rule ids sit here too, so
 * `vite.config.ts` lists no rule by name.
 */
const rules: DummyRuleMap = {
  // Rules beyond the categories in `vite.config.ts`. First, naming: no
  // `_` inside the name once leading and trailing ones are trimmed,
  // unless it has no lowercase ASCII letter (UPPER_SNAKE). Shorthand
  // destructuring binds a key the code does not own, and property names
  // are not declarations.
  "id-match": [
    "error",
    "^_*[^_]*_*$|^[^a-z]*$",
    {
      properties: false,
      classFields: false,
      onlyDeclarations: false,
      ignoreDestructuring: true,
    },
  ],
  curly: "error",
  "guard-for-in": "error",
  "no-console": "error",
  "no-empty": "error",
  "no-regex-spaces": "error",
  "no-restricted-globals": ["error", "window"],
  "no-var": "error",
  "prefer-const": "error",
  "import/no-cycle": "error",
  "import/no-relative-parent-imports": "error",
  "typescript/adjacent-overload-signatures": "error",
  "typescript/consistent-type-imports": "error",
  "typescript/no-empty-interface": "error",
  "typescript/no-explicit-any": "error",
  "typescript/no-namespace": "error",
  "typescript/no-non-null-assertion": "error",
  "project/no-disable-comments": "error",
  "project/no-asset-imports": "error",
  // Deno's `prefer-ascii`, which also covers hugoalh's
  // `prefer-ascii-identifier`.
  "project/prefer-ascii": "error",
  "unicorn/no-abusive-eslint-disable": "error",
  // The hugoalh `recommended` set that deno-import-check's `deno.json`
  // loaded, mapped to the built-ins outside the categories above (the rest
  // are in them). It left `max-params` and `max-complexity` at their
  // defaults: 4 parameters and a complexity of 32.
  "max-params": ["error", { max: 4 }],
  complexity: ["error", { max: 32 }],
  "no-lone-blocks": "error",
  "import/first": "error",
  "typescript/consistent-type-definitions": ["error", "interface"],
  "typescript/consistent-type-assertions": ["error", { assertionStyle: "as" }],
  "typescript/explicit-member-accessibility": ["error", { accessibility: "no-public" }],
  "unicorn/prefer-module": "error",
  // hugoalh's `no-import-absolute`, `no-import-data`, `no-import-file`,
  // `no-import-http`, `no-import-jsr` (by URL), and `std-on-jsr`.
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          regex: "^(?:/|data:|file:|http:|https://jsr\\.io/|https://deno\\.land/std)",
          message: "Import packages by name and local files by a relative or `#` path.",
        },
      ],
    },
  ],
  // Ports of the hugoalh `recommended` rules with no Oxlint built-in, under
  // their hugoalh names.
  "project/no-duplicate-awaits": "error",
  "project/no-duplicate-interfaces": "error",
  "project/no-duplicate-typeofs": "error",
  "project/no-duplicate-types": "error",
  "project/no-duplicate-voids": "error",
  "project/no-empty-yield": "error",
  "project/no-enum": "error",
  "project/no-modifier-private": "error",
  "project/no-nan": "error",
  "project/no-unsafe-number": "error",
  "project/no-useless-continue": "error",
  "project/no-useless-type": "error",
  // Pedantic rules that fight the AST types: nodes are mutable, and `type`
  // is an enum imported only as a type.
  "typescript/prefer-readonly-parameter-types": "off",
  "typescript/no-unsafe-enum-comparison": "off",
  "typescript/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
};

/**
 * The repo-local plugin, namespace `project`: its own rules, enabled as
 * `project/<rule>`, and `configs.project`, the rule list above.
 */
const plugin = {
  meta: { name: "project" },
  rules: {
    "no-disable-comments": noDisableCommentsRule,
    "no-asset-imports": noAssetImportsRule,
    "prefer-ascii": preferAsciiRule,
    "no-duplicate-awaits": noDuplicateAwaitsRule,
    "no-duplicate-interfaces": noDuplicateInterfacesRule,
    "no-duplicate-typeofs": noDuplicateTypeofsRule,
    "no-duplicate-types": noDuplicateTypesRule,
    "no-duplicate-voids": noDuplicateVoidsRule,
    "no-empty-yield": noEmptyYieldRule,
    "no-enum": noEnumRule,
    "no-modifier-private": noModifierPrivateRule,
    "no-nan": noNanRule,
    "no-unsafe-number": noUnsafeNumberRule,
    "no-useless-continue": noUselessContinueRule,
    "no-useless-type": noUselessTypeRule,
  },
  configs: { project: { rules } },
};

export default plugin;
