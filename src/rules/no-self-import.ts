import {
  docsUrl,
  type ExplicitRule,
  normalizePath,
  resolveLocalSpecifier,
  visitSpecifiers,
} from "#helpers";

/**
 * `no-self-import` - rejects any statically knowable specifier that resolves
 * to the importing file: a relative path, an absolute path or `file:` URL, an
 * exact `#` entry, or a `#` subpath pattern.
 *
 * A self-import is an immediate circular dependency.
 */
export const noSelfImportRule: ExplicitRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow a module from importing itself",
      url: docsUrl("no-self-import"),
    },
    schema: [],
    messages: {
      selfImport: "'{{specifier}}' imports the current file.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      const target = resolveLocalSpecifier(context.filename, specifier);
      if (target !== normalizePath(context.filename)) {
        return;
      }
      context.report({ node, messageId: "selfImport", data: { specifier } });
    });
  },
};
