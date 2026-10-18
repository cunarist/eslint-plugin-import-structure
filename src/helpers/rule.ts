import type { LanguageOptions, RuleDefinition, RuleVisitor, TextSourceCode } from "@eslint/core";
import type { TSESTree } from "@typescript-eslint/types";

/**
 * The source code both hosts hand a rule: its text, plus the node text and
 * comment lookups ESLint and Oxlint each implement on it.
 */
export interface ExplicitSourceCode extends TextSourceCode {
  getText(node?: TSESTree.Node): string;
  getAllComments(): TSESTree.Comment[];
}

/**
 * The type parameters of every rule in this package: ESLint's defaults, except
 * that a report points at a TypeScript-ESTree node.
 *
 * `Visitor` stays ESLint's loose `RuleVisitor`, so each visitor annotates its
 * node parameter itself. The type-aware `no-unsafe-*` lint rules in
 * `vite.config.ts` catch a parameter left as `any`.
 */
export interface ExplicitRuleTypes {
  LangOptions: LanguageOptions;
  Code: ExplicitSourceCode;
  RuleOptions: [];
  Visitor: RuleVisitor;
  Node: TSESTree.Node;
  MessageIds: string;
  ExtRuleDocs: unknown;
}

/** A rule in this package, in ESLint's standard `create` form. */
export type ExplicitRule = RuleDefinition<ExplicitRuleTypes>;

/** The context a rule in this package receives in `create`. */
export type ExplicitContext = Parameters<ExplicitRule["create"]>[0];
