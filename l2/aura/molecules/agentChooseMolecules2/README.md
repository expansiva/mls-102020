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

It reads `export const definition` — which is **prose** since 2026-09-08:

```ts
export const definition = `page: Registrar comentário em chamado aberto
actor: atendente
purpose: Documentar o andamento do atendimento em um chamado aberto.
uxExperience: processWizard
The page extends the shared base class of this workspace: ... do not list routines.`;
```

and rewrites **only `pipeline[0]`** — the chosen molecules' own source files appended to
`dependsFiles`, their groups' usage contracts to `skills`, in pipeline form (no leading slash, with
extension):

```json
"dependsFiles": [
  "_102047_/l2/controleChamados/web/shared/commentOpenTicketDts.txt",
  "_102047_/l2/designSystem.ts",
  "_102040_/l2/molecules/groupentertext/ml-multiline-text.ts",
  "_102040_/l2/molecules/groupviewtable/ml-data-table.ts"
],
"skills": [
  "_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts",
  "_102020_/l4/collabux/templates/processWizard/page21.md",
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
| c1-groups | `reasoning` | the target's prose definition + level 1 → the regions and the group of each, or `none` |
| c1r-fanout (root) | — | plants one c2 per chosen group, plus c3-patch |
| c2-`<group>` | `reasoning` | level 2 of ONE group in → the molecule per region, or `none` (anti-invention gate) |
| c3-patch | — | joins c1 + every c2, rewrites the target's `pipeline` — the run's only write |

## v1 → v2 in one paragraph

v1 walked the page's own `definition.dataBindings[]` to extract regions deterministically and wrote
`molecule: { group, tag }` onto each binding/input plus a root `pageMolecules[]` array. The definition
is prose now, so there is no node left to annotate and no binding list to walk: c1 names the regions
from the prose (exactly as the probe does) and the pipeline is the whole output. The structural facts
moved to the workspace shared defs (`web/shared/{page}.defs.ts`, which still has `dataBindings[]` plus
`i18n` column/field labels, `scenaries` and `destructiveCommandIds`); reading it was offered and
declined, so the prose is the only evidence — see `spec.md` §"v1 → v2" and
`flow.json.knownGaps.thinEvidence` for the accepted cost.

## Reused from `agentChooseMolecules`, unchanged

- `helpers/chCatalog.ts`: `readChLevel1`, `readChGroupCatalog` (reading only — this agent never
  discovers a catalog, `catalogProject` is explicit).
- `helpers/chTypes.ts`: `chFileRefFromImport`, `chCanonicalGroup`, `CH_*` gate-result helpers.
- `steps/c1-groups/gate.ts` and `steps/c2-molecules/gate.ts`: the anti-invention gate, imported
  verbatim.
- `steps/c1-groups/prompt.md`'s region rules: the probe's measured anti-superdecomposition and
  anti-invention sections, carried over when the regions stopped being deterministic here.

## Files

```
flow.json  spec.md  README.md              the design record — spec first
agentChooseMolecules2.ts                   root: bootstrap, phase-1 planting, the fan-out
helpers/cm2Entry.ts                        pure: the mention argument
helpers/cm2DefsPatch.ts                    pure: read the prose + pipeline, equip the pipeline, serialize
helpers/cm2PageContext.ts                  pure: the prose's declared lines, as a c2 prompt section
helpers/cm2ProjectContext.ts               the target project's declared language (l5/project.json)
helpers/cm2Types.ts                        constants, step-args, task-tree result readers, reference forms
schemas/                                   the two tool schemas (adapted from agentChooseMolecules)
steps/c1-groups/  steps/c2-molecules/  steps/c3-patch/
```

Tests: `cm2Entry.test.ts`, `cm2DefsPatch.test.ts`, `cm2PageContext.test.ts`, `cm2ProjectContext.test.ts`,
`cm2Types.test.ts` — all pure, no `mls.*` access. `cm2DefsPatch.test.ts` runs against the real v2 page
shape and covers the parse→equip→serialize round trip, the idempotency and pruning rules, and the
refusal of a v1 object definition.
