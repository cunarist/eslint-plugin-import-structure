---
description: Enum-like string values are UPPER_SNAKE wherever we own the format, JSON included; external standards convert at the boundary with explicit functions
---

User decision (2026-10-19, all repos): enum-like string values, such as
string-union members, are UPPER_SNAKE everywhere we own the format,
including JSON wire and stored formats. No `enum` (`explicit-types/no-enum`).

External standards we don't own (BCP 47 language tags, MIME types, HTTP
values, a third-party API's strings) keep their own spelling on the wire and
are converted at the boundary with explicit `switch` functions:

```ts
type Locale = "EN_US" | "KO_KR";

function localeToLangTag(locale: Locale): string {
  switch (locale) {
    case "EN_US":
      return "en-US";
    case "KO_KR":
      return "ko-KR";
  }
}
```

In this repo the rule options and messages follow ESLint's own formats
(`"code"`, `"problem"`, kebab-case rule ids), which are external, so they
stay as ESLint defines them. Related: [[naming-id-match]].
