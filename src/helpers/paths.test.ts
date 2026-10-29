import { describe, expect, it } from "vite-plus/test";

import {
  baseName,
  childSpecifier,
  isInsideDir,
  moduleCandidates,
  namesSameModule,
  normalizePath,
  parentDir,
  resolveFrom,
  stemName,
} from "./paths.ts";

describe("normalizePath", () => {
  it("converts Windows backslashes to forward slashes", () => {
    expect(normalizePath(String.raw`C:\dir\a.ts`)).toBe("C:/dir/a.ts");
  });

  it("strips file:// and the slash before a Windows drive", () => {
    expect(normalizePath("file:///C:/dir/a.ts")).toBe("C:/dir/a.ts");
  });

  it("keeps the leading slash of a POSIX file URL and decodes it", () => {
    expect(normalizePath("file:///home/my%20dir/a.ts")).toBe("/home/my dir/a.ts");
  });

  it("leaves an empty path alone", () => {
    expect(normalizePath("")).toBe("");
  });
});

describe("parentDir", () => {
  it("drops the last segment on both platforms", () => {
    expect(parentDir("/dir/sub/a.ts")).toBe("/dir/sub");
    expect(parentDir(String.raw`C:\dir\a.ts`)).toBe("C:/dir");
  });

  it("stops at the root", () => {
    expect(parentDir("/a.ts")).toBe("/a.ts");
    expect(parentDir("C:")).toBe("C:");
  });
});

describe("names", () => {
  it("takes the base name and its stem", () => {
    expect(baseName(String.raw`C:\dir\index.tsx`)).toBe("index.tsx");
    expect(stemName("/dir/index.ts")).toBe("index");
    expect(stemName("/dir/.gitignore")).toBe(".gitignore");
  });
});

describe("resolveFrom", () => {
  it("resolves . and .. segments", () => {
    expect(resolveFrom("/dir/src", "../lib/./a.ts")).toBe("/dir/lib/a.ts");
  });

  it("resolves against a Windows directory without climbing past the drive", () => {
    expect(resolveFrom(String.raw`C:\dir`, String.raw`..\..\a.ts`)).toBe("C:/a.ts");
  });
});

describe("isInsideDir", () => {
  it("compares whole segments", () => {
    expect(isInsideDir("/src/utils/a.ts", "/src/utils")).toBe(true);
    expect(isInsideDir("/src/utils-extra/a.ts", "/src/utils")).toBe(false);
    expect(isInsideDir("/src/utils/a.ts", "/src/utils/")).toBe(true);
  });
});

describe("childSpecifier", () => {
  it("spells a path inside a directory with ./", () => {
    expect(childSpecifier("/src/a", "/src/a/sub/x.ts")).toBe("./sub/x.ts");
    expect(childSpecifier("/src/a/", "/src/a/x.ts")).toBe("./x.ts");
  });

  it("gives null for a path only ../ could reach", () => {
    expect(childSpecifier("/src/a/sub", "/src/a/x.ts")).toBeNull();
    expect(childSpecifier("/src/a", "/src/ab/x.ts")).toBeNull();
  });
});

describe("namesSameModule", () => {
  it("matches the spellings TypeScript resolves to a file", () => {
    expect(namesSameModule("/a/index.ts", "/a/index.ts")).toBe(true);
    expect(namesSameModule("/a/index.js", "/a/index.ts")).toBe(true);
    expect(namesSameModule("/a/index", "/a/index.ts")).toBe(true);
    expect(namesSameModule("/a/x.y", "/a/x.y.ts")).toBe(true);
    expect(namesSameModule("/b/f.mjs", "/b/f.mts")).toBe(true);
    expect(namesSameModule("/b/f.cjs", "/b/f.cts")).toBe(true);
    expect(namesSameModule("/b/f.js", "/b/f.tsx")).toBe(true);
    expect(namesSameModule("/b/f.jsx", "/b/f.tsx")).toBe(true);
  });

  it("tells apart other module kinds, extensions, stems, and folders", () => {
    expect(namesSameModule("/b/f.mts", "/b/f.ts")).toBe(false);
    expect(namesSameModule("/b/f.tsx", "/b/f.ts")).toBe(false);
    expect(namesSameModule("/b/f.cjs", "/b/f.ts")).toBe(false);
    expect(namesSameModule("/b/f.ts", "/b/f.js")).toBe(false);
    expect(namesSameModule("/b/f", "/b/f.mts")).toBe(false);
    expect(namesSameModule("/a/index.css", "/a/index.ts")).toBe(false);
    expect(namesSameModule("/a/one.ts", "/a/index.ts")).toBe(false);
    expect(namesSameModule("/b/index.ts", "/a/index.ts")).toBe(false);
    expect(namesSameModule("/a.js/index", "/a/index.ts")).toBe(false);
  });
});

describe("moduleCandidates", () => {
  it("lists the files a specifier may name in TypeScript's order", () => {
    expect(moduleCandidates("/c/x")).toStrictEqual([
      "/c/x",
      "/c/x.ts",
      "/c/x.tsx",
      "/c/x.js",
      "/c/x.jsx",
    ]);
    expect(moduleCandidates("/c/x.js")).toStrictEqual(["/c/x.js", "/c/x.ts", "/c/x.tsx"]);
    expect(moduleCandidates("/c/x.mjs")).toStrictEqual(["/c/x.mjs", "/c/x.mts"]);
    expect(moduleCandidates("/c/x.ts")).toStrictEqual(["/c/x.ts"]);
  });
});
