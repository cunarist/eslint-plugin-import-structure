import { describe, expect, it } from "vite-plus/test";

import { stripQuery } from "./imports.ts";

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
