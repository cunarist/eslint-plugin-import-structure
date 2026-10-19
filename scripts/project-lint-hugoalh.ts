/**
 * The `project` plugin's ports of `@hugoalh/deno-lint-rules` 0.8.3
 * `recommended` rules that read single expressions and statements, which
 * the old Deno config loaded and Oxlint has no built-in for:
 * `no-duplicate-typeofs`, `no-empty-yield`, `no-nan`, `no-unsafe-number`,
 * and `no-useless-continue`. Each keeps its original name and behavior.
 * `no-duplicate-awaits` and `no-duplicate-voids` are covered by
 * `unicorn/no-unnecessary-await` and `typescript/no-meaningless-void-operator`,
 * and `no-enum` by `explicit-types/no-enum`.
 *
 * @module
 */

import type { RuleTextEdit } from "@eslint/core";
import type { TSESTree } from "@typescript-eslint/types";

import type { ProjectRule } from "./project-lint-types.ts";

/** The globals `no-nan` sees through, as in `globalThis.Number.NaN`. */
const GLOBAL_NAMES: ReadonlySet<string> = new Set<string>(["globalThis", "self", "window"]);

/** A loop statement, whose last `continue` `no-useless-continue` checks. */
type LoopStatement =
  | TSESTree.DoWhileStatement
  | TSESTree.ForInStatement
  | TSESTree.ForOfStatement
  | TSESTree.ForStatement
  | TSESTree.WhileStatement;

/**
 * A rule that reports an operator applied twice in a row, such as
 * `await await x`. When `safeFix` is set, dropping the outer keyword gives
 * the same value, so the rule fixes it; otherwise it only reports.
 */
function doubledOperatorRule(
  keyword: "await" | "typeof" | "void",
  effect: string,
  safeFix: boolean,
): ProjectRule {
  return {
    meta: {
      type: "problem",
      docs: { description: `Disallow \`${keyword}\` applied twice in a row` },
      ...(safeFix ? { fixable: "code" as const } : {}),
      schema: [],
      messages: { doubled: `Multiple \`${keyword}\`s ${effect}, possibly not intended.` },
    },
    create(context) {
      function check(node: TSESTree.AwaitExpression | TSESTree.UnaryExpression): void {
        const inner = node.argument;
        const doubled =
          keyword === "await"
            ? inner.type === "AwaitExpression"
            : inner.type === "UnaryExpression" && inner.operator === keyword;
        if (!doubled || (node.type === "UnaryExpression" && node.operator !== keyword)) {
          return;
        }
        const range: [number, number] = [node.range[0], node.range[0] + keyword.length];
        context.report({
          loc: {
            start: context.sourceCode.getLocFromIndex(range[0]),
            end: context.sourceCode.getLocFromIndex(range[1]),
          },
          messageId: "doubled",
          ...(safeFix ? { fix: (fixer): RuleTextEdit => fixer.removeRange(range) } : {}),
        });
      }
      return keyword === "await" ? { AwaitExpression: check } : { UnaryExpression: check };
    },
  };
}

/**
 * `no-duplicate-typeofs` - `typeof typeof x` is always `"string"`. Not
 * fixed, since dropping one `typeof` changes the value.
 */
export const noDuplicateTypeofsRule: ProjectRule = doubledOperatorRule(
  "typeof",
  'always return `"string"`',
  false,
);

/** `no-empty-yield` - a `yield` with no expression, likely missing one. */
export const noEmptyYieldRule: ProjectRule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow `yield` without an expression" },
    schema: [],
    messages: { empty: "Empty `yield` is not allowed, possibly missing the expression." },
  },
  create(context) {
    return {
      YieldExpression(node: TSESTree.YieldExpression): void {
        if (node.argument === null) {
          context.report({ node, messageId: "empty" });
        }
      },
    };
  },
};

/** The name a member expression's property spells, computed or not. */
function propertyName(node: TSESTree.MemberExpression): string | null {
  if (node.property.type === "Identifier" && !node.computed) {
    return node.property.name;
  }
  if (node.property.type === "Literal" && typeof node.property.value === "string") {
    return node.property.value;
  }
  return null;
}

/** Whether `node` is a global object, such as `globalThis` or `globalThis.self`. */
function isGlobalChain(node: TSESTree.Expression): boolean {
  if (node.type === "Identifier") {
    return GLOBAL_NAMES.has(node.name);
  }
  return (
    node.type === "MemberExpression" &&
    GLOBAL_NAMES.has(propertyName(node) ?? "") &&
    isGlobalChain(node.object)
  );
}

/**
 * Whether a member expression reads the global `NaN`: `Number.NaN`,
 * `globalThis.NaN`, or `globalThis.Number.NaN`.
 */
function isNanMember(node: TSESTree.MemberExpression): boolean {
  if (propertyName(node) !== "NaN") {
    return false;
  }
  const { object } = node;
  if (object.type === "Identifier" && object.name === "Number") {
    return true;
  }
  return (
    isGlobalChain(object) ||
    (object.type === "MemberExpression" &&
      propertyName(object) === "Number" &&
      isGlobalChain(object.object))
  );
}

/** `no-nan` - a `NaN` value is usually an error; test with `Number.isNaN`. */
export const noNanRule: ProjectRule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow `NaN` as a value" },
    schema: [],
    messages: { nan: "Using `NaN` as a value is usually an error and not intended." },
  },
  create(context) {
    return {
      Identifier(node: TSESTree.Identifier): void {
        if (node.name === "NaN" && node.parent.type !== "MemberExpression") {
          context.report({ node, messageId: "nan" });
        }
      },
      MemberExpression(node: TSESTree.MemberExpression): void {
        if (isNanMember(node)) {
          context.report({ node, messageId: "nan" });
        }
      },
    };
  },
};

/** `no-unsafe-number` - a number literal outside the safe integer range. */
export const noUnsafeNumberRule: ProjectRule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow number literals outside the safe integer range" },
    schema: [],
    messages: {
      unsafe:
        "Number literals with values equal to 2^53 or greater are too large to be represented accurately.",
    },
  },
  create(context) {
    return {
      Literal(node: TSESTree.Literal): void {
        if (
          typeof node.value === "number" &&
          (node.value < Number.MIN_SAFE_INTEGER || node.value > Number.MAX_SAFE_INTEGER)
        ) {
          context.report({ node, messageId: "unsafe" });
        }
      },
    };
  },
};

/**
 * The unlabeled `continue` a loop ends with, and whether removing it is a
 * safe fix: it is in a block, rather than the loop's whole body.
 */
function trailingContinue(
  node: LoopStatement,
): { statement: TSESTree.ContinueStatement; removable: boolean } | null {
  if (node.body.type === "BlockStatement") {
    const last = node.body.body.at(-1);
    return last?.type === "ContinueStatement" && last.label === null
      ? { statement: last, removable: true }
      : null;
  }
  if (node.body.type === "ContinueStatement" && node.body.label === null) {
    return { statement: node.body, removable: false };
  }
  return null;
}

/**
 * `no-useless-continue` - an unlabeled `continue` that ends a loop body. A
 * trailing `continue;` in a block is removed by the fix. A loop whose whole
 * body is `continue;` is only reported: hugoalh's fix deleted the loop,
 * header side effects included.
 */
export const noUselessContinueRule: ProjectRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow an unlabeled `continue` at the end of a loop" },
    fixable: "code",
    schema: [],
    messages: {
      useless: "The statement `continue` at the end of the loop and without a label is useless.",
    },
  },
  create(context) {
    function check(node: LoopStatement): void {
      const found = trailingContinue(node);
      if (found !== null) {
        context.report({
          node: found.statement,
          messageId: "useless",
          ...(found.removable
            ? { fix: (fixer): RuleTextEdit => fixer.remove(found.statement) }
            : {}),
        });
      }
    }
    return {
      DoWhileStatement: check,
      ForInStatement: check,
      ForOfStatement: check,
      ForStatement: check,
      WhileStatement: check,
    };
  },
};
