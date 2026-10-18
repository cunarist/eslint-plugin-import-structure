import { describe, expect, it } from "vite-plus/test";

import plugin from "#plugin";

const NAMESPACE = "import-structure";

/**
 * The rules this plugin was ported with, and nothing else. A repo-only
 * rule goes in `scripts/project-lint.ts`, never in the published plugin.
 */
const PORTED_RULES: string[] = [
  "enforce-import-order",
  "enforce-layer-order",
  "enforce-mod-file",
  "no-absolute-import",
  "no-barrel-bypass",
  "no-duplicate-import-source",
  "no-parent-import",
  "no-relative-bypass",
  "no-self-import",
  "no-wildcard-import",
  "prefer-alias-import",
];

describe("plugin.rules", () => {
  it("holds exactly the 11 ported rules", () => {
    expect(Object.keys(plugin.rules ?? {}).toSorted()).toEqual(PORTED_RULES);
  });
});

describe("plugin.configs.all", () => {
  it("turns on every rule in the plugin", () => {
    expect(Object.keys(plugin.configs.all.rules ?? {})).toHaveLength(11);
    const ruleIds = Object.keys(plugin.rules ?? {}).map((id) => `${NAMESPACE}/${id}`);
    expect(Object.keys(plugin.configs.all.rules ?? {}).toSorted()).toEqual(ruleIds.toSorted());
  });

  it("equals the modules config, the only ported rule set", () => {
    expect(plugin.configs.all.rules).toEqual(plugin.configs.modules.rules);
  });
});
