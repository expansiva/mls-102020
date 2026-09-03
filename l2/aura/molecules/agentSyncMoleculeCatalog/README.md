# agentSyncMoleculeCatalog

Generates the molecule catalog an LLM consumer reads to choose components: `l2/molecules/skill.ts`
(level 1) and, per group, `index.defs.ts` + `index.html` (level 2) — derived from the molecule files
already in the project. Also handles a group's `index.ts` showcase page: migrates it to import its
scenario table from the catalog instead of carrying it as hand-written code (G3, no LLM), creates it from
scratch for a group that has none at all (G1, E8b), or regenerates it for a group whose page exists and is
migrated but doesn't show every molecule (G4) — both G1 and G4 spend the one LLM call this agent ever
uses, exactly one tool-call turn per group. See "E8"/"E8b"/"G4" in `spec.md`.

```
@@agentSyncMoleculeCatalog
@@agentSyncMoleculeCatalog atualizar groupEnterText
@@agentSyncMoleculeCatalog atualizar grupos groupEnterText, groupSelectOne e groupViewTable
```
 
With nothing after the mention, or `all`, every group the project has (with a `skills/index.ts` entry) is
synced. A specific list is comma/`e`-separated. `index.ts` migration runs automatically wherever it
applies — no opt-in needed (see `spec.md` → `decisions.migrationIsAutomatic`).

## The tree

| step | model | what it does |
|---|---|---|
| root (`beforePromptImplicit`) | — | parses the mention, scans the project, computes triggers, plants everything below in one batch |
| `s1-<group>` × N | none | one group's `index.defs.ts` + `index.html` |
| `s3-<group>` × M | none for G3, one call for G1/G4 | migrates (G3), creates (G1, E8b) or regenerates (G4) `index.ts` for each triggered group, after that group's own `s1` — the root decides which mode |
| `s2-project` | none | `l2/molecules/skill.ts`, after every `s1` of the run |
| `s4-report` | none | `report.json` + the readable summary, after `s2` and every `s3` |

## What a run leaves behind

`l4/agentSyncMoleculeCatalog/<runKey>/` in the active project:

| file | what for |
|---|---|
| `report.json` | what was written, ignored groups with reasons, `index.ts` status **per group** (migrated / created / regenerated — with the reason — / already-migrated, or one of their `-failed` counterparts), and that the catalog is written but **not published** |
| `input.json` | the resolved scope: matched/ignored/requested-but-ignored/unknown groups, which groups need migration vs. creation vs. regeneration (G4, with how many molecules were missing) |
| `s1-<group>.json`, `s3-<group>.json`, `s2-project.json` | each step's own written summary |

## Three things worth knowing before reading the code

**The tag is never invented.** It is read from the molecule's real `@customElement(...)` decorator, by
construction — never from a filename, never from an LLM. There is no separate anti-invention gate because
there is nothing to gate against.

**Scenarios are the one field that is not derived.** They are editorial. On a fresh group they are
harvested from its current `index.ts`; on every resync, whatever is already in the group's
`index.defs.ts` is preserved — a resync never clobbers a hand edit. See `spec.md` for the field-matching
algorithm groupViewTable's abbreviated column names required.

**`index.ts` migration is a text surgery, not a rewrite.** `renderReferenceTable()`'s whole method body
is replaced with a 3-line call into the new `shared/indexReferenceTable.ts`; everything else in the file
— hero, showcase cards, `render()` — is untouched. **Creating a page from scratch (E8b) is the one LLM
call in this agent** — the model writes the page ALREADY in that migrated shape (never hand-written table
markup — a structural gate enforces it and retries otherwise) plus the scenarios as data, which the step
then writes into the group's `index.defs.ts`.

**Regeneration (G4) reuses creation whole, and the mode always comes from the root.** A page whose
showcase cards fall behind the molecule folder (nothing regenerates static Lit markup on its own) is fixed
by running the SAME create-mode LLM call as G1 — not a patch onto the existing page. `s3` never infers
migrate-vs-create from whether `index.ts` exists on disk (true for G1/G3, false for G4, whose file already
exists and is already migrated); the root computes the trigger and hands the mode down explicitly.

## Files

```
flow.json  spec.md  README.md              the design record — spec first
agentSyncMoleculeCatalog.ts                root: mention parsing, discovery, trigger detection, single-batch planting
helpers/syTypes.ts                         pure: constants, anchors, artifact shapes
helpers/syEntry.ts                         pure: the mention — which groups, index.ts opt-in phrase
helpers/syDiscover.ts                      pure: project folders matched against skills/index.ts
helpers/syExtract.ts                       pure: one molecule's tag/Objective/layoutConfig + scenario harvest
helpers/syLabels.ts                        pure: palette + short label (consumed by s3/the shared renderer)
helpers/syRenderDefs.ts                    pure: index.defs.ts + index.html TEXT
helpers/syRenderSkill.ts                   pure: skill.ts TEXT
helpers/syMigrateIndexTs.ts                pure: the index.ts migration surgery + G1/G3/G4 trigger checks + syMoleculesNotShown
helpers/syCreateIndexTs.ts                 pure: E8b's scenario resolution (short name -> full tag, anti-invention)
helpers/syFs.ts                            the only module that touches mls.stor — l4 paths + scans
schemas/s3-indexts-create.schema.json      the E8b tool schema (indexTs + scenarios as data)
steps/s1-group/  steps/s2-project/  steps/s4-report/
steps/s3-indexts/agentSyIndexTs.ts         both modes: G3 migration (no LLM) and G1 creation (E8b, one LLM call)
steps/s3-indexts/createPrompt.md           E8b's system prompt (reuses skills/indexGroupPage.ts + an override)
steps/s3-indexts/createGate.ts             pure: E8b's structural gate — "born migrated" is enforced, not just asked
../shared/indexReferenceTable.ts           the shared Lit renderer every migrated/created index.ts imports
../shared/indexReferenceTableData.ts       its pure data half (column order, color, D-E3 row filtering)
```

Tests: `helpers/*.test.ts`, `steps/s3-indexts/createGate.test.ts`, `steps/s4-report/report.test.ts` and
`../shared/indexReferenceTableData.test.ts` — all pure, all `node:test`. E5's and E8a's acceptance checks
(regenerating pilot groups / migrating real `index.ts` files and diffing) were run as one-off scripts, not
shipped; E8b's and G4's strong acceptance (creating/regenerating a real page for real) are Studio runs —
see `spec.md` for all three.
