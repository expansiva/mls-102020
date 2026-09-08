# agentChooseMolecules2 — spec

**Status: production equipper. v2 since 2026-09-08.** Given an existing page `.defs.ts` and an explicit
catalog project, it decides which molecule serves each region of that page and rewrites that file's
**`pipeline`** with the answer — the chosen components in `dependsFiles`, their groups' usage contracts
in `skills`. `export const definition` is read (it is the description the choice reasons over) and never
written. It is a sibling of `agentChooseMolecules` (the probe that only measures whether the catalog is
good enough for an LLM to choose from), built to actually equip a page.

## v1 → v2: the file shape changed under it

The page `.defs.ts` used to carry a JSON object with `dataBindings[]`/`inputs[]`, and v1 read the
regions straight out of it. It now carries a **template literal of prose** (measured on
`_102047_/l2/controleChamados`, all three genomes):

```ts
export const definition = `page: Registrar comentário em chamado aberto
actor: atendente
purpose: Documentar o andamento do atendimento em um chamado aberto.
uxExperience: processWizard
The page extends the shared base class of this workspace: ... do not list routines.`;
```

Two consequences, and together they are the whole redesign (`flow.json.decisions.definitionFormat`,
`.whatIsWritten`):

| | v1 (object definition) | v2 (prose definition) |
|---|---|---|
| regions | extracted deterministically from `dataBindings[]`/`inputs[]` | **named by c1 from the prose**, probe-style |
| region kinds | four, derived (surface / entry / trigger / page) | whatever the prose supports — no derived kinds |
| what is written | `molecule: { group, tag }` on bindings/inputs, `pageMolecules[]` at the root, **and** the pipeline | **the pipeline alone** |
| the definition | rewritten (it was the same JSON value) | **read-only, spliced back byte for byte** |
| field types | `web/contracts/{page}` contract, `.defs.ts` then compiled `.ts` | not read — there is no declared field to type |
| region id | the write-back address of a node | a label: the c1→c2 join key and the summary, nothing more |

**Where the structure went, for whoever needs it later.** It did not vanish: the workspace shared defs
(`web/shared/{page}.defs.ts`) still publishes `dataBindings[]` with the same `inputs[]`/`presentation`
shape, plus the `i18n` keys that name each list's columns and each form field, `scenaries`,
`destructiveCommandIds` and `contractRef.tsPath`. The platform's own gates already follow it there
(`cfeMaterializeCore.pageDefinitionForChecks`: *"page11: the workspace shared map... the prose
definition has neither"*). Reading it was offered and **declined** by the product owner: the prose is
the only evidence this agent uses. The consequence is accepted and stated in
`flow.json.knownGaps.thinEvidence` — four labelled lines discriminate less than a typed binding list,
so `none` is expected more often. That is this family's honest answer, not a defect, and the shared defs
is the obvious first move if the choices come back too coarse.

## The three levels it walks

Same three-level catalog as the probe (`agentChooseMolecules/spec.md` §"The three levels it walks"),
with one addition: this agent is the first in the family to reach level 3.

| level | file | what it answers | who reads it |
|---|---|---|---|
| 1 | `l2/molecules/skill.ts` of `catalogProject` | which GROUPS exist | c1-groups |
| 2 | `l2/molecules/<group>/index.defs.ts` | which MOLECULES the group has, with scenarios | c2-molecules |
| 3 | the group's `usage.ts` (referenced by level 2 as `usageContract`) | how to write the markup | **c3-patch — reference only, content never read or copied** |

c3-patch never reads the usage.ts CONTENT — it only carries forward the reference string c2 already had
in scope (`ChGroupCatalog.usageContract`), appending it to `pipeline[0].skills` so the render step can
read it when it actually composes markup.

## What else is different from the probe

| | agentChooseMolecules (probe) | agentChooseMolecules2 |
|---|---|---|
| catalog | discovered (active project + direct deps); refuses on 0 or >1 candidates | **explicit** — `catalogProject` in the argument, no search |
| the description | free prose typed in the mention | **read from the target file** — its own `definition` |
| classifier | c0-classify (slug, language, titles) | **none** — deterministic bootstrap (`skipRootLLM`); the language comes from the target project's declared `l5/project.json` |
| output | `l4/agentChooseMolecules/<runKey>/report.json` + per-attempt traces | **the target's `pipeline`**, rewritten — nothing else |

## Which catalog answers the run

Always `catalogProject`, verbatim. There is no search, no "active project" concept, no
direct-dependency check, no ambiguity refusal — all three existed in the probe purely because it never
received the project explicitly. If `catalogProject` does not publish `l2/molecules/skill.ts`, the run
fails with a readable error naming the project; it never falls back to searching.

## The funnel, and why it is still a funnel

The whole catalog does not fit a prompt — level 1 is ~1.5 KB, a single level 2 is 2–6 KB, all 32 groups
would be ~90 KB (measured on the same catalog the probe measured). So: **one level per prompt, one group
per c2 call**, unchanged from the probe.

## Regions

Named by c1 from the prose, so the rules are the probe's own and
`steps/c1-groups/prompt.md` now carries them verbatim — both halves matter and only work together:

- **anti-superdecomposition**: a verb a component performs on its own content is not a region of its
  own (a table with sorting and selection is ONE region; the verbs go into the `need` line);
- **anti-invention**: a field the prose does not name is never a region. `purpose: Cadastro de Chamado.`
  has one region, not a guessed list of what a ticket record contains. This is the half that carries the
  weight in v2, because the prose names very little.

Two things the prompt says that the object definition made unnecessary: the four labels (`page:`,
`actor:`, `purpose:`, `uxExperience:`) are named so the model knows what it is reading, and the closing
paragraph — *"...do not list fields and do not list routines"* — is declared to be **addressed to a
later generator, not to c1**, so it is not read as an instruction to name no regions.

## Project and page context (c2 only)

c2 never sees the definition, so the target's declared intent reaches it as a prompt section:

- **page context** (`helpers/cm2PageContext.ts`): the prose's four labelled lines, with `uxExperience`
  (`processWizard`, `entityRecordManagement`, `dashboardCommandCenter`, ...) as the declared experience
  shape. It took over from v1's `presentation.categoryRef` as the fact that rules a *specific* scenario
  row in or out — the measured defect it answers is c2 flip-flopping between 11 near-siblings when
  nothing discriminates between them.
- **project context** (`helpers/cm2ProjectContext.ts`): the target project's declared language(s) from
  `l5/project.json`, used only to break a locale-formatting tie between siblings (a BR- vs a
  US-formatted money input). Absent or unreadable → the section is omitted, never padded with a default.

Both are DECLARED facts, never inferences. c1 needs no page-context section: it receives the whole prose
as its human prompt.

## Invariants

1. **Never a tag from outside the catalog.** Same gate as the probe
   (`agentChooseMolecules/steps/c2-molecules/gate.ts`), imported unchanged. The published tag carries
   the group prefix and must be copied in full.
2. **Never a group outside level 1.** Same gate as the probe
   (`agentChooseMolecules/steps/c1-groups/gate.ts`), imported unchanged.
3. **`none` is a legal answer at both levels**, and it is written as the ABSENCE of a pipeline entry —
   never a placeholder.
4. **The definition is never written.** It is not a parameter of `serializePageDefsSource`: it travels
   back inside the parsed prefix, so no run can change what the page says it is.
5. **Nothing outside the target's `pipeline` value is ever written.** No `l4` artifact, no trace, no
   report, in any project, at any point in the run. If a future implementation needs scratch data
   mid-run because something does not fit the task tree's step `result`, that scratch file must be
   deleted by c3-patch before the run completes — never left "just in case".
6. **The patch spends no LLM call.** c3-patch aggregates c1 + every c2's task-tree result and rewrites
   the pipeline; it is pure arithmetic and JSON manipulation over what was already decided.
7. **Idempotent, and self-correcting.** c3-patch PRUNES this agent's own previous entries before adding
   the current ones (recognized by shape: `l2/molecules/<group>/<name>.ts` in dependsFiles,
   `l2/aura/molecules/skills/<group>/usage.ts` in skills) and SORTS what it adds. So a rerun that chose
   the same set writes nothing even if c1 returned the groups in another order; a rerun that changed its
   mind replaces the old choice instead of stacking both; and a rerun that chose nothing clears what a
   previous run had equipped. Everything the generator put in those arrays matches neither pattern and
   survives untouched. A rerun that changes nothing does not touch the file (byte-equality check).

## What it does not do

- Does not create the target file. The caller decides which file to point this agent at.
- Does not read the workspace shared defs — offered and declined, see above.
- Does not annotate the v1 object definition. A target still carrying it is refused with an error that
  says so by name, never parsed on a guess.
- Does not run materialization, touch `todoFrontend`/`statusFrontend`, or update `l5/config.json`.
- Does not read or copy the level-3 `usage.ts` CONTENT — only its reference.
- Does not persist the region→molecule mapping. There is no node left to carry it and `PipelineItem` is
  a closed interface, so the render model receives the components and the usage contracts and composes
  the page from them (`flow.json.knownGaps.mappingNotPersisted`).
