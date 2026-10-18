/** Where a rule's `.md` lives, so `meta.docs.url` links to the source of truth. */
const DOCS_BASE = "https://github.com/cunarist/eslint-plugin-modules/blob/main/docs/rules";

/** The documentation URL of a rule, e.g. `no-self-import`. */
export function docsUrl(rule: string): string {
  return `${DOCS_BASE}/${rule}.md`;
}
