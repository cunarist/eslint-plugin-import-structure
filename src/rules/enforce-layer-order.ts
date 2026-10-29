import type { TSESTree } from "@typescript-eslint/types";

import {
  docsUrl,
  type ExplicitRule,
  findImportsConfig,
  findOwningEntry,
  owningEntries,
  resolveTarget,
  visitSpecifiers,
} from "#helpers";

/**
 * `enforce-layer-order` - treats the order of `#` aliases in `package.json`
 * `imports` as the layer order, top layer first: an area may only import
 * aliases declared below its own. Also rejects a file that imports its own
 * area's alias, by alias or by path, and a file that two aliases with the
 * same area both own.
 *
 * An alias inside another alias's area owns its part, carved out of the
 * outer area, and the two are ordered like any other pair of aliases.
 *
 * This makes cycles between areas structurally impossible rather than
 * merely detectable. Lint cannot report on `package.json` itself, so an
 * overlap fires once at the top of every file it affects.
 */
export const enforceLayerOrderRule: ExplicitRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce the order of `package.json` `imports` as the layer order",
      url: docsUrl("enforce-layer-order"),
    },
    schema: [],
    messages: {
      ownEntry: "'{{owner}}' must not import its own entry point through '{{specifier}}'.",
      upward:
        "'{{owner}}' must not import '{{target}}', which is declared above it in package.json.",
      overlap:
        "This file is owned by more than one alias with the same target in package.json: {{aliases}}.",
    },
  },
  create(context) {
    const specifiers = visitSpecifiers((node, specifier) => {
      const config = findImportsConfig(context.filename);
      if (config === null) {
        return;
      }
      const owner = findOwningEntry(config, context.filename);
      const target = resolveTarget(config, context.filename, specifier);
      if (owner === null || target === null) {
        return;
      }
      if (target.index === owner.index) {
        context.report({
          node,
          messageId: "ownEntry",
          data: { owner: owner.specifier, specifier },
        });
        return;
      }
      if (target.index < owner.index) {
        context.report({
          node,
          messageId: "upward",
          data: { owner: owner.specifier, target: target.specifier },
        });
      }
    });
    return {
      ...specifiers,
      Program(node: TSESTree.Program): void {
        const config = findImportsConfig(context.filename);
        const owners = config === null ? [] : owningEntries(config, context.filename);
        if (owners.length < 2) {
          return;
        }
        context.report({
          node,
          loc: { line: 1, column: 0 },
          messageId: "overlap",
          data: { aliases: owners.map((entry) => entry.specifier).join(", ") },
        });
      },
    };
  },
};
