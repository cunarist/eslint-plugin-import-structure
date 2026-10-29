---
description: Fix every review finding before a release, including bugs that were already on main; never ship with known findings left open without asking
---

On 2026-10-29, v0.11.0 shipped with 3 review findings left open because they
predated the PR (query strings defeating `/*` patterns, `/*` patterns with no
same-name alias getting no owner, `no-barrel-bypass` suggesting the importer's
own alias). The user was upset that they weren't fixed for the release.

Before merging a release PR, fix every finding the review raises, whether or
not it is new. If a finding can't be fixed in time, ask the user before
merging. Related: [[git-pr-workflow]].
