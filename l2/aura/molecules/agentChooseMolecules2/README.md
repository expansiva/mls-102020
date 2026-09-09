# agentChooseMolecules2

Given an existing page `.defs.ts` and the project whose molecule catalog answers, decides which molecule
serves each region of that page and **equips that file's `pipeline`** with them. It is the sibling of
`agentChooseMolecules` (the probe that only measures whether the catalog is good enough) — this one
actually equips a page, and writes nothing else anywhere.

```
@@agentChooseMolecules2 {"catalogProject": 102040, "target": "_102047_/l2/controleChamados/web/desktop/page21/commentOpenTicket.defs"}
```

Both keys are required. `catalogProject` is never discovered — no dependency search, no "more than one
catalog reachable" refusal: whoever calls this agent already knows which project's catalog applies.
`target` is the import-style reference of the page's own `.defs.ts` (its `definition` + `pipeline`
shape — the same file `page11`, `page21` and `page31` all share).

## What it reads, and what it changes

**Two sources for analysis, one file written.**

It reads the TARGET's `export const definition` — which is **prose** since 2026-09-08 — for what the
page is FOR:

```ts
export const definition = `page: Chamado
actor: atendente
purpose: Cadastro de Chamado.
uxExperience: entityRecordManagement
The page extends the shared base class of this workspace: ... do not list routines.`;
```

and it reads the **workspace shared defs** (`web/shared/{page}.defs.ts`, same folder the page's own
pipeline already depends on) for what interactions EXIST — `dataBindings[]`, the declared i18n column
and field labels, `destructiveCommandIds`, and `contractRef.tsPath` for the field types. **The shared is
never written**, nor is the contract: they are analysis sources. The target passed in the argument is
the only file a run touches.

And in that target it rewrites **only `pipeline[0]`** — the chosen molecules' own source files appended
to `dependsFiles`, their groups' usage contracts to `skills`, in pipeline form (no leading slash, with
extension):

```json
"dependsFiles": [
  "_102047_/l2/controleChamados/web/shared/ticketCatalogueDts.txt",
  "_102047_/l2/designSystem.ts",
  "_102040_/l2/molecules/groupentertext/ml-multiline-text.ts",
  "_102040_/l2/molecules/groupviewtable/ml-data-table.ts"
],
"skills": [
  "_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts",
  "_102020_/l4/collabux/templates/entityRecordManagement/page21.md",
  "_102020_/l2/aura/molecules/skills/groupEnterText/usage.ts",
  "_102020_/l2/aura/molecules/skills/groupViewTable/usage.ts"
]
```

Those two arrays are not an arbitrary choice — they are the two fields materialize actually reads
(`agentCfeMaterializeGen`): `dependsFiles` becomes the `## Context files` sections of the render prompt
and `skills` is concatenated into its system prompt. `PipelineItem` is a closed interface, so a new
pipeline KEY would be dropped in silence.

**`export const definition` is never written.** It is not even a parameter of the serializer: it travels
back byte for byte inside the parsed prefix. And **nothing else in any project is written** — no report,
no trace, no `l4` folder. See `flow.json`'s "ZERO ARTIFACT RULE".

**A rerun reconciles.** c3-patch removes this agent's own previous entries before adding the current
ones (recognized by shape, never by position: `l2/molecules/<group>/<name>.ts` and
`l2/aura/molecules/skills/<group>/usage.ts`) and sorts what it adds. So changing the choice replaces it
instead of stacking both, choosing nothing clears what was equipped, and a rerun that decided the same
thing touches no bytes at all. What the generator put in those arrays survives untouched.

## The tree

| step | model | what it does |
|---|---|---|
| (root) | — | deterministic bootstrap (`skipRootLLM`); no classifier |
| c1-groups | `reasoning` | deterministic regions (from the shared, read-only) + the target's prose intent + level 1 → the group of each, or `none` |
| c1r-fanout (root) | — | plants one c2 per chosen group, plus c3-patch |
| c2-`<group>` | `reasoning` | level 2 of ONE group in → the molecule per region, or `none` (anti-invention gate) |
| c3-patch | — | joins c1 + every c2, rewrites the target's `pipeline` — the run's only write |

## v1 → v2 → v3, and why the shared is read

v1 walked the page's own `definition.dataBindings[]` and wrote `molecule: { group, tag }` onto each
binding/input. The definition became prose, so v2 had no node to annotate (the pipeline became the whole
output) and named the regions from that prose instead.

Then v2 was measured on `_102047_` page21/ticketCatalogue: **one region, one molecule**, for a screen
with 7 typed command fields, 3 listing filters, 4 command triggers, 3 surfaces and 4 declared
success/error messages. Not the model's fault and not the catalog's — every group needed is published.
The prose simply cannot name them: `page11DefinitionProse` is a fixed four-line template and
`defsFormat: 'prose'` is hardcoded for every genome and category. The facts had moved to the workspace
shared defs, which is where the platform's own gates read them from.

v3 reads them from there too — **read-only** — and got 18 regions on the same page. `spec.md` §"How it
got here" carries the full measurement.

## Reused from `agentChooseMolecules`, unchanged

- `helpers/chCatalog.ts`: `readChLevel1`, `readChGroupCatalog` (reading only — this agent never
  discovers a catalog, `catalogProject` is explicit).
- `helpers/chTypes.ts`: `chFileRefFromImport`, `chCanonicalGroup`, `CH_*` gate-result helpers.
- `steps/c1-groups/gate.ts` and `steps/c2-molecules/gate.ts`: the anti-invention gate, imported
  verbatim.
- `steps/c2-molecules/prompt.md`'s catch-all-row warning and `none` discipline.

(The probe's anti-superdecomposition and anti-invention prompt sections travelled here in v2, when the
regions were briefly LLM-named; v3 dropped them again — the regions are code, so there is nothing to
invent and nothing to over-split.)

## Files

```
flow.json  spec.md  README.md              the design record — spec first
agentChooseMolecules2.ts                   root: bootstrap, phase-1 planting, the fan-out
helpers/cm2Entry.ts                        pure: the mention argument
helpers/cm2DefsPatch.ts                    pure: read the TARGET's prose + pipeline, equip the pipeline, serialize
helpers/cm2Shared.ts                       the READ-ONLY analysis sources: the workspace shared defs and its contract
helpers/cm2Regions.ts                      pure: deterministic region extraction from the shared's dataBindings
helpers/cm2PageContext.ts                  pure: the prose's declared lines, as a c2 prompt section
helpers/cm2ProjectContext.ts               the target project's declared language (l5/project.json)
helpers/cm2Types.ts                        constants, step-args, task-tree result readers, reference forms
schemas/                                   the two tool schemas (adapted from agentChooseMolecules)
steps/c1-groups/  steps/c2-molecules/  steps/c3-patch/
```

Tests: `cm2Entry.test.ts`, `cm2DefsPatch.test.ts`, `cm2Shared.test.ts`, `cm2Regions.test.ts`,
`cm2PageContext.test.ts`, `cm2ProjectContext.test.ts`, `cm2Types.test.ts` — all pure, no `mls.*` access.
`cm2DefsPatch.test.ts` runs against the real page shape and covers the parse→equip→serialize round trip,
the idempotency and pruning rules, and the refusal of a v1 object definition; `cm2Regions.test.ts` runs
against the real bindings of the page the v2 measurement was taken on.
