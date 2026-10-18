import { defineConfig } from "vite-plus";

import modules from "#plugin";

import projectLint from "./scripts/project-lint.ts";

export default defineConfig({
  lint: {
    plugins: ["typescript", "unicorn", "oxc", "import"],
    // Lints itself from source; `scripts/project-lint.ts` holds the repo's own
    // rule list and repo-only rules, never published.
    jsPlugins: ["./src/plugin/index.ts", "./scripts/project-lint.ts"],
    categories: { correctness: "error", suspicious: "error", pedantic: "error", perf: "error" },
    rules: { ...modules.configs.all.rules, ...projectLint.configs.project.rules },
    // The rule registry must import every rule, more than max-dependencies allows.
    overrides: [{ files: ["src/rules/index.ts"], rules: { "import/max-dependencies": "off" } }],
    options: {
      typeAware: true,
      typeCheck: true,
      maxWarnings: 0,
      reportUnusedDisableDirectives: "error",
    },
  },
  pack: {
    // Built as dist/index.js, the file package.json "exports" names.
    entry: { index: "src/plugin/index.ts" },
    dts: true,
    fixedExtension: false,
  },
});
