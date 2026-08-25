# s4-report

Consolidates the run into `report.json` and the readable summary. No LLM — a model writing this would be
a call spent describing what deterministic steps already measured.

## The four obligations (`report.ts`)

Every one traces to a defect that was actually measured, not a style preference:

1. **what was written**, per file and per group;
2. **ignored groups, with an actionable reason** — `groupNavigateMain` today, "add the missing
   `skills/index.ts` entry and re-run";
3. **that `index.ts` was not touched, and how to ask for it** — this build has no `s3` yet, so the
   answer is always the same, but staying silent about it would read as "nothing was wanted" instead of
   "not built yet";
4. **that the catalog is written but NOT PUBLISHED** — the two silent failure modes this covers: an
   unpublished catalog fails an outside `await import()` with "Failed to fetch"; a PUBLISHED project with
   this edit unsaved reads the OLD content, with no error at all.

## What it reads

`input.json` (the run's scope) plus every `s1-<group>.json` the run's matched groups produced and
`s2-project.json`, if it exists. A group whose `s1` artifact is missing is simply not counted as written —
never assumed to have succeeded.
