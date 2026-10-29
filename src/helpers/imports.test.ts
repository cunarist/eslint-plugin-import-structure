import { describe, expect, it } from "vite-plus/test";

import { comparePatterns, isParentSpecifier, type PatternEntry, stripQuery } from "./imports.ts";

describe("stripQuery", () => {
  it("drops a query or fragment after a # specifier, keeping its leading #", () => {
    expect(stripQuery("#a/x.js?raw")).toBe("#a/x.js");
    expect(stripQuery("#a/x.ts#frag")).toBe("#a/x.ts");
    expect(stripQuery("#a?raw#frag")).toBe("#a");
  });

  it("leaves a specifier without a query alone", () => {
    expect(stripQuery("#a")).toBe("#a");
    expect(stripQuery("#/x.ts")).toBe("#/x.ts");
  });

  it("drops a query and fragment after a relative specifier", () => {
    expect(stripQuery("./x.ts?raw#h")).toBe("./x.ts");
  });
});

/** A pattern entry for `specifier`, split at its `*`. */
function pattern(specifier: string, target: string | null): PatternEntry {
  const star = specifier.indexOf("*");
  return {
    specifier,
    prefix: specifier.slice(0, star),
    suffix: specifier.slice(star + 1),
    target,
  };
}

describe("comparePatterns", () => {
  it("orders by longest prefix, then longest key, local or not", () => {
    const sorted = [
      pattern("#a/*", "./a/*"),
      pattern("#a/*.js", "./a/*.ts"),
      pattern("#a/ext/*", null),
    ].toSorted(comparePatterns);
    expect(sorted.map((entry) => entry.specifier)).toStrictEqual(["#a/ext/*", "#a/*.js", "#a/*"]);
  });
});

describe("isParentSpecifier", () => {
  it("finds a .. segment anywhere in a relative specifier", () => {
    expect(isParentSpecifier("../x.ts")).toBe(true);
    expect(isParentSpecifier("./../x.ts")).toBe(true);
    expect(isParentSpecifier("./sub/../../x.ts")).toBe(true);
    expect(isParentSpecifier("..")).toBe(true);
  });

  it("leaves other specifiers alone", () => {
    expect(isParentSpecifier("./x..ts")).toBe(false);
    expect(isParentSpecifier("./x.ts?a/../b")).toBe(false);
    expect(isParentSpecifier("#a/../x.ts")).toBe(false);
    expect(isParentSpecifier("pkg/../x")).toBe(false);
  });
});
