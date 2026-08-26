# s3-indexts (E8a only)

Migrates ONE group's `index.ts` — its `renderReferenceTable()` method starts importing the scenario
table from `index.defs.ts` instead of carrying it as hand-written Lit code. No LLM.

Planted ONLY for a group the root already confirmed has the **G3 trigger**: `index.ts` exists and does
not yet import from `./index.defs`. Never planted for a **G1** group (no `index.ts` at all — that is
creation, E8b, not built) or a group with no trigger at all.

## What it does

1. Read the group's current `index.ts`.
2. `helpers/syMigrateIndexTs.syMigrateIndexTs`: find `renderReferenceTable()`, replace its whole body
   with `return renderCatalogReferenceTable(molecules, scenarios);`, add the two imports it needs.
3. Write the result back — or, if the migration could not apply (no method found, unbalanced source),
   leave the file untouched and record why.

## Why the whole method is replaced, not edited piecemeal

Measured across all 30 real groups (`todo-implementar-E8-index-ts.md` §1, E8 prep sweep): the
`rows`/`headers` declaration shape is not consistent — 27 groups inline `Array<{...}>`, one uses a local
`interface Row`, one a local `type Row`, one no type at all. All four live entirely inside the method
body, so replacing the whole method sidesteps parsing any of them — the only thing that has to be exactly
right is finding where the method starts and ends, which needs a small brace-matching scanner aware of
nested Lit template literals (`${headers.map(h => html\`...\`)}`).

## Why the migration collapsed to a 3-line call instead of ①②③-only surgery

The original plan (`todo-implementar-E8-index-ts.md` §1) was to regenerate only the interface/headers/
rows and leave the table's markup untouched. Two decisions made with the product owner changed that:
color now follows the molecule's alphabetical index (D-E2), which meant column order had to become
alphabetical too (D-E2b) to keep the colors reading as a clean sequence — and that already required
editing the markup. Once editing was unavoidable, and D-E1 had already asked for a "thin call site," the
whole table moved into the shared renderer. See `flow.json` at the agent root, `decisions.s3Migration_*`.
