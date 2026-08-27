# s3-indexts (E8a + E8b + G4)

ONE step, TWO modes — **migrate** (no LLM) and **create** (one LLM call). ⚠️ Since G4, the mode is decided
by the ROOT and passed in the step's own prompt (`mode: 'migrate' | 'create'`), never re-derived here from
whether `index.ts` exists on disk: a G4 group's file DOES exist, so "exists -> migrate" would silently
pick a no-op migration and never touch the missing cards (see `the G4 decision of 2026-08-27` §3.1
and `flow.json`'s `decisions.g4Regeneration_modeFromRoot`).

- **G3 — migrate** an existing `index.ts`: its `renderReferenceTable()` method starts importing the
  scenario table from `index.defs.ts` instead of carrying it as hand-written Lit code. No LLM.
- **G1 — create** `index.ts` from scratch (E8b): the ONLY LLM call in this whole agent, one tool-call
  turn. The page must be born ALREADY in the migrated shape — see `createGate.ts` and
  `flow.json`'s `decisions.e8bCreation_*`.
- **G4 — regenerate** an existing, already-migrated `index.ts` whose `renderShowcaseCards()` (still
  static Lit code, unlike the now-reactive reference table) doesn't show every molecule of the group.
  Runs in CREATE mode — the whole page is rewritten, same as G1 — with `regenerationMissingCount` set in
  the step args so the note/report can say "regenerada: N molécula(s)..." instead of "criado".

Planted for a group the root already confirmed has the **G3**, **G1** or **G4** trigger. Never planted for
a group with no trigger at all.

## Migration mode (G3) — what it does

1. Read the group's current `index.ts`.
2. `helpers/syMigrateIndexTs.syMigrateIndexTs`: find `renderReferenceTable()`, replace its whole body
   with `return renderCatalogReferenceTable(molecules, scenarios);`, add the two imports it needs.
3. Write the result back — or, if the migration could not apply (no method found, unbalanced source),
   leave the file untouched and record why.

## Creation mode (G1, E8b) — what it does

1. `beforePromptStep` builds the system/human prompt (`createPrompt.md` + `skills/indexGroupPage.ts` +
   an OVERRIDE section that supersedes only the skill's `renderReferenceTable()` instructions) and
   returns a `prompt_ready` intent with a strict tool schema (`schemas/s3-indexts-create.schema.json`) —
   this is the only branch of this step that ever reaches an LLM.
2. `afterPromptStep` extracts `{ indexTs, scenarios }`, writes+compiles `index.ts`, runs `createGate.ts`
   (structural checks — importantly, that the reference table was NOT hand-written) plus the compile
   diagnostics together, and retries (same shape as `agentNewMolecule2/n7-index`) up to `NM_MAX_ATTEMPTS`.
3. On success: re-derives the group's molecule list the same way `s1` does, resolves the model's
   `scenarios` (short names -> full tags, dropping anything that matches no real molecule — never
   guessed), and re-renders the group's WHOLE `index.defs.ts` via `syRenderIndexDefs` (the same renderer
   `s1` used a moment earlier in the same run) with only `scenarios[]` different. Writes, compiles and
   re-caches it — `index.ts` itself is never cached, since nothing imports it by name.

## Why the whole method is replaced, not edited piecemeal

Measured across all 30 real groups (`the E8a measurement of 2026-08-25` §1, E8 prep sweep): the
`rows`/`headers` declaration shape is not consistent — 27 groups inline `Array<{...}>`, one uses a local
`interface Row`, one a local `type Row`, one no type at all. All four live entirely inside the method
body, so replacing the whole method sidesteps parsing any of them — the only thing that has to be exactly
right is finding where the method starts and ends, which needs a small brace-matching scanner aware of
nested Lit template literals (`${headers.map(h => html\`...\`)}`).

## Why the migration collapsed to a 3-line call instead of ①②③-only surgery

The original plan (`the E8a measurement of 2026-08-25` §1) was to regenerate only the interface/headers/
rows and leave the table's markup untouched. Two decisions made with the product owner changed that:
color now follows the molecule's alphabetical index (D-E2), which meant column order had to become
alphabetical too (D-E2b) to keep the colors reading as a clean sequence — and that already required
editing the markup. Once editing was unavoidable, and D-E1 had already asked for a "thin call site," the
whole table moved into the shared renderer. See `flow.json` at the agent root, `decisions.s3Migration_*`.
