import { docsUrl, type ExplicitRule, visitSpecifiers } from "#helpers";

/**
 * `no-absolute-import` - rejects specifiers starting with `/` or `file:`.
 *
 * A leading slash resolves against the file system root rather than the
 * project root, and a `file:` URL hard codes one machine's layout.
 */
export const noAbsoluteImportRule: ExplicitRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow absolute paths and `file:` URLs as module specifiers",
      url: docsUrl("no-absolute-import"),
    },
    schema: [],
    messages: {
      absolute: "'{{specifier}}' is an absolute path.",
    },
  },
  create(context) {
    return visitSpecifiers((node, specifier) => {
      if (specifier.startsWith("/") || specifier.startsWith("file:")) {
        context.report({ node, messageId: "absolute", data: { specifier } });
      }
    });
  },
};
