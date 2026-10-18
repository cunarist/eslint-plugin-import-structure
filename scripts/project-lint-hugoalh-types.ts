/**
 * The `project` plugin's ports of `@hugoalh/deno-lint-rules` 0.8.3
 * `recommended` rules about types and classes, which the old Deno config
 * loaded and Oxlint has no built-in for: `no-duplicate-interfaces`,
 * `no-duplicate-types`, `no-modifier-private`, and `no-useless-type`. Each
 * keeps its original name and behavior.
 *
 * @module
 */

import type { TSESTree } from "@typescript-eslint/types";

import type { ProjectRule } from "./project-lint-types.ts";

/** Node keys that say where a node is, not what it is, in ESLint and Oxlint. */
const POSITION_KEYS: ReadonlySet<string> = new Set<string>([
  "parent",
  "range",
  "loc",
  "start",
  "end",
]);

/** Node types whose member lists mean the same in any order. */
const UNORDERED_TYPES: ReadonlySet<string> = new Set<string>([
  "TSInterfaceBody",
  "TSTypeLiteral",
  "TSUnionType",
  "TSIntersectionType",
]);

/** Type annotations too simple for an alias of their own (`no-useless-type`). */
const SIMPLE_TYPES: ReadonlySet<string> = new Set<string>([
  "TSAnyKeyword",
  "TSBigIntKeyword",
  "TSBooleanKeyword",
  "TSIntrinsicKeyword",
  "TSNeverKeyword",
  "TSNullKeyword",
  "TSNumberKeyword",
  "TSObjectKeyword",
  "TSStringKeyword",
  "TSSymbolKeyword",
  "TSUndefinedKeyword",
  "TSUnknownKeyword",
  "TSVoidKeyword",
]);

/** A class member that can carry the `private` keyword. */
type AccessibilityCarrier =
  | TSESTree.AccessorProperty
  | TSESTree.MethodDefinition
  | TSESTree.PropertyDefinition
  | TSESTree.TSAbstractAccessorProperty
  | TSESTree.TSAbstractMethodDefinition
  | TSESTree.TSAbstractPropertyDefinition
  | TSESTree.TSParameterProperty;

/**
 * A node's shape as text, without positions, so two declarations compare
 * alike wherever they sit. Members of a type literal, interface body,
 * union, or intersection are sorted, since their order means nothing.
 */
function serialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item)).join(",")}]`;
  }
  if (typeof value !== "object" || value === null) {
    return JSON.stringify(value) ?? "undefined";
  }
  const unordered = "type" in value && UNORDERED_TYPES.has(String(value.type));
  const parts = Object.entries(value)
    .filter(([key]) => !POSITION_KEYS.has(key))
    .map(([key, child]) => {
      const text =
        unordered && Array.isArray(child)
          ? `[${child
              .map((item) => serialize(item))
              .toSorted()
              .join(",")}]`
          : serialize(child);
      return `${key}:${text}`;
    });
  return `{${parts.join(",")}}`;
}

/** The top-level declarations in a block, exported or not, that `matches`. */
function declarationsOf<T extends TSESTree.Node>(
  statements: TSESTree.Node[],
  matches: (node: TSESTree.Node) => node is T,
): T[] {
  const found: T[] = [];
  for (const statement of statements) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration !== null && matches(declaration)) {
      found.push(declaration);
    }
  }
  return found;
}

/** Whether a node is an interface declaration. */
function isInterface(node: TSESTree.Node): node is TSESTree.TSInterfaceDeclaration {
  return node.type === "TSInterfaceDeclaration";
}

/** Whether a node is a type alias declaration. */
function isTypeAlias(node: TSESTree.Node): node is TSESTree.TSTypeAliasDeclaration {
  return node.type === "TSTypeAliasDeclaration";
}

/** Groups nodes by a key and returns the groups with more than one node. */
function duplicateGroups<T>(nodes: T[], keyOf: (node: T) => string): T[][] {
  const groups = Map.groupBy(nodes, keyOf);
  return [...groups.values()].filter((group) => group.length > 1);
}

/** What an interface declares, its `extends` list included. */
function interfaceShape(node: TSESTree.TSInterfaceDeclaration): string {
  return `${serialize(node.extends)}&${serialize(node.body)}`;
}

/**
 * `no-duplicate-interfaces` - two interfaces in one block with the same
 * name, which merge silently, or with the same shape, which could be one.
 */
export const noDuplicateInterfacesRule: ProjectRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow interfaces with the same name or shape in one block" },
    schema: [],
    messages: {
      sameShape: "Found multiple interfaces with the same shape, possibly mergeable.",
      sameName: "Found multiple interfaces named '{{name}}', possibly not intended.",
    },
  },
  create(context) {
    function check(statements: TSESTree.Node[]): void {
      const nodes = declarationsOf(statements, isInterface);
      for (const node of duplicateGroups(nodes, interfaceShape).flat()) {
        context.report({ node, messageId: "sameShape" });
      }
      for (const node of duplicateGroups(nodes, (each) => each.id.name).flat()) {
        context.report({ node, messageId: "sameName", data: { name: node.id.name } });
      }
    }
    return {
      BlockStatement: (node: TSESTree.BlockStatement): void => {
        check(node.body);
      },
      Program: (node: TSESTree.Program): void => {
        check(node.body);
      },
    };
  },
};

/** `no-duplicate-types` - two type aliases in one block with the same type. */
export const noDuplicateTypesRule: ProjectRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow type aliases with the same type in one block" },
    schema: [],
    messages: { sameShape: "Found multiple types with the same shape, possibly mergeable." },
  },
  create(context) {
    function check(statements: TSESTree.Node[]): void {
      const nodes = declarationsOf(statements, isTypeAlias);
      for (const node of duplicateGroups(nodes, (each) => serialize(each.typeAnnotation)).flat()) {
        context.report({ node, messageId: "sameShape" });
      }
    }
    return {
      BlockStatement: (node: TSESTree.BlockStatement): void => {
        check(node.body);
      },
      Program: (node: TSESTree.Program): void => {
        check(node.body);
      },
    };
  },
};

/**
 * `no-modifier-private` - class members are made private with `#`, never the
 * `private` keyword, which only TypeScript enforces. A `private constructor`
 * has no `#` form and stays allowed.
 */
export const noModifierPrivateRule: ProjectRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow the private modifier" },
    schema: [],
    messages: { private: "Use a # private name instead of the private modifier." },
  },
  create(context) {
    function check(node: AccessibilityCarrier): void {
      const isConstructor = node.type === "MethodDefinition" && node.kind === "constructor";
      if (node.accessibility === "private" && !isConstructor) {
        context.report({ node, messageId: "private" });
      }
    }
    return {
      AccessorProperty: check,
      MethodDefinition: check,
      PropertyDefinition: check,
      TSAbstractAccessorProperty: check,
      TSAbstractMethodDefinition: check,
      TSAbstractPropertyDefinition: check,
      TSParameterProperty: check,
    };
  },
};

/** Whether a type is too simple to need an alias: a keyword, literal, or bare name. */
function isSimpleType(node: TSESTree.TypeNode): boolean {
  if (SIMPLE_TYPES.has(node.type)) {
    return true;
  }
  if (node.type === "TSLiteralType") {
    return node.literal.type === "Literal";
  }
  return (
    node.type === "TSTypeReference" &&
    node.typeName.type === "Identifier" &&
    node.typeArguments === undefined
  );
}

/** `no-useless-type` - a type alias for a keyword, literal, or bare type name. */
export const noUselessTypeRule: ProjectRule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow type aliases too simple to need a name" },
    schema: [],
    messages: { simple: "The type is too simple to need an alias." },
  },
  create(context) {
    return {
      TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration): void {
        if (isSimpleType(node.typeAnnotation)) {
          context.report({ node, messageId: "simple" });
        }
      },
    };
  },
};
