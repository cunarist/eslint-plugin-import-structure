/**
 * `eslint-plugin-import-structure` - import rules that keep a module
 * graph free of cycles and clearly layered, with the order of the
 * `package.json` `imports` field as the layer order.
 *
 * One plugin, namespace `import-structure`, so a rule id reads
 * `import-structure/enforce-layer-order`. Its configs are
 * `modules`, the rules it was ported with, and `all`, which turns on
 * every rule. The plugin is the only export; its configs
 * are at `plugin.configs`.
 *
 * This file is the package entry: `vp pack` builds it as `dist/index.js`.
 *
 * @module
 */

import type { ConfigObject, Plugin } from "@eslint/core";

import { rules } from "#rules";

/** The prefix of every rule id, as ESLint derives it from the package name. */
const NAMESPACE = "import-structure";

/**
 * The `modules` preset - every rule the plugin was ported with.
 *
 * Bans the import patterns that create cycles, keeps every module behind one
 * entry point, layers modules by their `package.json` `imports` order, and
 * keeps import blocks grouped and sorted.
 */
const MODULES: string[] = [
  "no-self-import",
  "no-parent-import",
  "no-absolute-import",
  "prefer-alias-import",
  "no-barrel-bypass",
  "no-relative-bypass",
  "no-wildcard-import",
  "enforce-mod-file",
  "no-duplicate-import-source",
  "enforce-import-order",
  "enforce-layer-order",
];

/** The flat configs at `plugin.configs`: `modules` and `all`. */
interface ModulesConfigs {
  modules: ConfigObject;
  all: ConfigObject;
}

/** The plugin, with its configs known by name. */
interface ModulesPlugin {
  meta?: Plugin["meta"];
  rules?: Plugin["rules"];
  configs: ModulesConfigs;
}

/** The plugin before its configs exist, which each config refers back to. */
const basePlugin: Plugin = {
  meta: {
    // Written out rather than imported from `package.json`, so the source has
    // only `.ts` imports. A release bumps both; `tests/package-meta.test.ts`
    // fails if they drift apart.
    name: "eslint-plugin-import-structure",
    version: "0.12.0",
    namespace: NAMESPACE,
  },
  rules: Object.fromEntries(rules),
};

/**
 * A flat config that loads the plugin and turns every given rule on. A config
 * is only a list of rule ids, so one rule can sit in several configs.
 */
function presetConfig(preset: string, ruleIds: string[]): ConfigObject {
  return {
    name: `${NAMESPACE}/${preset}`,
    plugins: Object.fromEntries([[NAMESPACE, basePlugin]]),
    rules: Object.fromEntries(ruleIds.map((id) => [`${NAMESPACE}/${id}`, "error"])),
  };
}

/**
 * The plugin, for ESLint `plugins` or Oxlint `jsPlugins`, and the package's
 * only export. Configs: `modules` holds the ported rules, and
 * `all` turns on every rule, so a new rule joins it by itself.
 */
const plugin: ModulesPlugin = Object.assign(basePlugin, {
  configs: {
    modules: presetConfig("modules", MODULES),
    all: presetConfig("all", [...rules.keys()]),
  },
});

export default plugin;
