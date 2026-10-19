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
 * published `all` config. Every Oxlint category but `nursery` is on, so
 * this list holds only the repo-only rules, the rules turned off (each
 * with its reason), and option tweaks.
 */
const rules: DummyRuleMap = {
  // Repo-only rules.
  "project/no-disable-comments": "error",
  "project/no-asset-imports": "error",
  // Deno's `prefer-ascii`, which also covers hugoalh's
  // `prefer-ascii-identifier`.
  "project/prefer-ascii": "error",
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

  // Option tweaks. Naming: no `_` inside the name once leading and
  // trailing ones are trimmed, unless it has no lowercase ASCII letter
  // (UPPER_SNAKE). Shorthand destructuring binds a key the code does not
  // own, and property names are not declarations.
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
  // Single capital letters stay allowed as type parameters (`T`).
  "id-length": ["error", { exceptionPatterns: ["^[A-Z]$"] }],
  "no-restricted-globals": ["error", "window"],
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
  // The hugoalh `recommended` limits: 4 parameters and a complexity of 32.
  "max-params": ["error", { max: 4 }],
  complexity: ["error", { max: 32 }],
  "typescript/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
  "one-var": ["error", "never"],
  "no-use-before-define": ["error", { functions: false }],
  "func-style": ["error", "declaration", { allowArrowFunctions: true }],

  // The smallest limit the current code passes.
  "max-statements": ["error", { max: 23 }],
  // `isolatedDeclarations` needs the type on the declaration, not the `new`.
  "typescript/consistent-generic-constructors": ["error", "type-annotation"],

  // Off: collides with the AST types (`type` is an enum imported only as a type).
  "typescript/no-unsafe-enum-comparison": "off",
  // Off: collides with `project/no-modifier-private` (members carry no modifier).
  "typescript/explicit-member-accessibility": "off",
  // Off: collides with `project/no-modifier-private` (it targets private members).
  "typescript/prefer-readonly": "off",
  // Off: collides with the mutable AST node types every rule takes.
  "typescript/prefer-readonly-parameter-types": "off",
  // Off: collides with interface index signatures (`consistent-type-definitions`).
  "typescript/consistent-indexed-object-style": "off",
  // Off: collides with `isolatedDeclarations` and the explicit `const` annotations.
  "typescript/no-inferrable-types": "off",
  // Off: collides with `import-structure/enforce-import-order`.
  "sort-imports": "off",
  // Off: collides with the `index.ts` entry files the `#` aliases target.
  "oxc/no-barrel-file": "off",
  // Twelve: the most any file needs, the rule registry `src/rules/index.ts`.
  "import/max-dependencies": ["error", { max: 12 }],
  // Off: collides with each export sitting on its own declaration.
  "import/group-exports": "off",
  // Off: collides with each export sitting on its own declaration.
  "import/exports-last": "off",
  // Off: collides with the one named `...Rule` export per rule file.
  "import/prefer-default-export": "off",
  // Off: collides with the named exports every module uses.
  "import/no-named-export": "off",
  // Off: collides with the default export ESLint plugins and `vite.config.ts` need.
  "import/no-default-export": "off",
  // Off: collides with the `import type` fixes of `typescript/consistent-type-imports`.
  "import/consistent-type-specifier-style": "off",
  // Off: collides with `unicorn/prefer-ternary`.
  "no-ternary": "off",
  // Off: collides with the ES2024 target and `typescript/prefer-optional-chain`.
  "oxc/no-async-await": "off",
  // Off: collides with the ES2024 target and `typescript/prefer-optional-chain`.
  "oxc/no-optional-chaining": "off",
  // Off: collides with bit flags where an API uses them.
  "no-bitwise": "off",
  // Off: collides with `undefined` as the absent value instead of `null`.
  "no-undefined": "off",
  // Off: collides with `typescript/no-floating-promises` (`void` marks ignored ones).
  "no-void": "off",
  // Off: collides with the AST and JSON APIs that return `null`.
  "unicorn/no-null": "off",
  // Off: collides with Oxfmt, which lowercases hex digits back.
  "unicorn/number-literal-case": "off",
  // Off: collides with `strictFunctionTypes`: `OxlintRunner` relies on method
  // bivariance to bridge the two hosts' rule types.
  "typescript/method-signature-style": "off",

  // Off: too much churn.
  "no-magic-numbers": "off",
  "sort-keys": "off",
  "capitalized-comments": "off",
  "typescript/explicit-function-return-type": "off",
  "typescript/explicit-module-boundary-types": "off",
  "no-empty-function": "off",
  "class-methods-use-this": "off",
  "unicorn/switch-case-braces": "off",
  "prefer-destructuring": "off",
  "oxc/no-rest-spread-properties": "off",
  "unicorn/numeric-separators-style": "off",
  "no-continue": "off",

  // Off: Node code. The plugin runs inside ESLint and Oxlint on Node.js.
  "import/no-nodejs-modules": "off",
  "unicorn/no-process-exit": "off",
};

/** Node code (`vite.config.ts` and `scripts/`), spread into `overrides`. */
const nodeRules: DummyRuleMap = {
  // Vite and the Oxlint plugin host read a default export.
  "import/no-default-export": "off",
  // Node code: tooling imports Node's built-ins.
  "import/no-nodejs-modules": "off",
  // Node code: a CLI exits with a status.
  "unicorn/no-process-exit": "off",
  // Node code: a CLI reports to the console.
  "no-console": "off",
};

/**
 * The repo-local plugin, namespace `project`: its own rules, enabled as
 * `project/<rule>`, `configs.project`, the rule list above, and
 * `configs.node`, the Node code override.
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
  configs: { project: { rules }, node: { rules: nodeRules } },
};

export default plugin;
