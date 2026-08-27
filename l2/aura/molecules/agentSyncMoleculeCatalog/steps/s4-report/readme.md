# s4-report

Consolidates the run into `report.json` and the readable summary. No LLM — a model writing this would be
a call spent describing what deterministic steps already measured.

## The four obligations (`report.ts`)

Every one traces to a defect that was actually measured, not a style preference:

1. **what was written**, per file and per group;
2. **ignored groups, with an actionable reason** — `groupNavigateMain` today, "add the missing
   `skills/index.ts` entry and re-run";
3. **`index.ts` status, per matched group** — `migrated` (G3) / `created` (G1, E8b) / `regenerated` (G4,
   `the G4 decision of 2026-08-27`, WITH the reason: "regenerada: N molécula(s) do grupo não
   apareciam na página" — a silently rewritten page reads exactly like a corrupted one, so this line is
   not optional), each with a matching `-failed` status when the group's own `s3` step did not leave a
   successful artifact, or `already-migrated` (had no trigger this run);
4. **that the catalog is written but NOT PUBLISHED** — the two silent failure modes this covers: an
   unpublished catalog fails an outside `await import()` with "Failed to fetch"; a PUBLISHED project with
   this edit unsaved reads the OLD content, with no error at all.

## What it reads

`input.json` (the run's scope, including which groups needed migration vs. creation vs. regeneration) plus
every `s1-<group>.json` and `s3-<group>.json` the run's matched groups produced, and `s2-project.json` if
it exists. A group whose `s1` artifact is missing is simply not counted as written; one flagged for
migration/creation/regeneration whose `s3` artifact is missing is reported `*-failed` — neither is ever
assumed to have succeeded silently.
