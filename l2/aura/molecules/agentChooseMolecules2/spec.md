# agentChooseMolecules2 — spec

**Status: production equipper. v3 since 2026-09-08.** Given an existing page `.defs.ts` and an explicit
catalog project, it decides which molecule serves each region of that page and rewrites that file's
**`pipeline`** with the answer — the chosen components in `dependsFiles`, their groups' usage contracts
in `skills`. It is a sibling of `agentChooseMolecules` (the probe that only measures whether the catalog
is good enough for an LLM to choose from), built to actually equip a page.

## Two sources for analysis, one file written

| file | read for | written? |
|---|---|---|
| the TARGET `.defs.ts` (the mention argument) | its prose `definition` — what the page IS FOR (`uxExperience`, `purpose`, `actor`) | **yes, and only its `pipeline` value** |
| `web/shared/{page}.defs.ts` (the workspace shared) | `dataBindings[]` — what interactions EXIST; the declared i18n labels; `destructiveCommandIds`; `contractRef.tsPath` | never |
| the contract the shared declares | the type of each field | never |
| `catalogProject`'s three catalog levels | which groups and molecules exist | never |

The shared is **analysis only**. No run amends the workspace to make a page easier to equip, and the
reverse derivation does not exist by design: the shared's own `layoutRef.defPath` names one genome
(page11), so it could never say which target a run was pointed at. The target is the argument.

## How it got here: v1 → v2 → v3

**v1** read `dataBindings[]` off the page's own JSON `definition` and wrote `molecule: { group, tag }`
onto each binding/input.

**v2** followed the format change: the page `.defs.ts` now carries a template literal of prose (four
labelled lines plus a fixed paragraph), so there was no node left to annotate and the pipeline became
the whole output. Regions were named by an LLM from that prose.

**v3 exists because v2 was measured.** On `_102047_` page21/ticketCatalogue it produced ONE region, so
one molecule — a `groupviewtable--ml-lcrud-detail-grid` — for a screen that also has 7 typed command
fields, 3 typed listing filters, 4 command triggers, 3 listing surfaces and 4 declared success/error
messages. The cause was neither the model nor the catalog (every group needed is published:
`groupEnterText`, `groupSelectOne`, `groupTriggerAction`, `groupNotifyUser`, `groupSearchContent`). It
was the source:

- `page11DefinitionProse` (`agentChangeFrontend/helpers/cfeCreateShared.ts`) is a **fixed four-line
  template** — pageName, actor, purpose, categoryRef — plus one boilerplate paragraph;
- `defsFormat: 'prose'` is hardcoded for every genome and every category (`cfePageRecipe.ts`, with a
  test asserting it).

So the prose can never name a field, a command or a control — on any page, not just that one. Sharpest
evidence that every step had actually behaved correctly: the molecule c2 chose declares in its own defs
that the record detail content *"is supplied by the consumer"* inside its `Detail` content area. The
container names the hole the missing molecules belong in.

The facts had simply moved. `web/shared/{page}.defs.ts` still publishes `dataBindings[]` in the same
shape v1 walked, and it is where the platform's own gates read them from
(`cfeMaterializeCore.pageDefinitionForChecks`: *"page11: the workspace shared map... the prose
definition has neither"*), which the generator states itself in `pageLayoutDefsExport`: *"the structured
map lives once on the workspace shared defs; gates read it from there."* v3 reads it from there too.

**Same page after the change: 18 regions.**

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
| what a region IS | invented by an LLM from free prose | **extracted deterministically** from the workspace's dataBindings, and c1's echo of that list is checked |
| classifier | c0-classify (slug, language, titles) | **none** — deterministic bootstrap (`skipRootLLM`). Nothing needs classifying: the regions come from code and the only language fact used is the one `l5/project.json` declares, read by c2 to break a locale tie |
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

## Regions: extraction rules

Produced by `helpers/cm2Regions.extractRegions` from the shared's `dataBindings[]`. Four kinds:

- a binding with `kind: "query"` → **one surface region**, id = the binding's own `id`, need = its
  description, the output field names from the contract, **the declared column labels** and, when any
  command input of the page is fed by a row selection, the fact that this surface is a selector;
- a binding with `kind: "command"` → **one trigger region**, id = the binding's `id`: the control that
  executes it. Emitted for every command, including one with no typed field at all — in v1 such a
  binding produced zero regions and vanished from the answer. A command declared in the shared's
  `destructiveCommandIds` says so in its need line;
- any input with `presentation: "form"` → **one entry region**, id = `${binding.id}::${input.name}`.
  On a command it is a field of the record being written; on a **query** it is a filter or sort control
  of the listing, and the need line says which — a search box and a text field are not the same choice.
  ⚠️ Query form inputs became regions in v3, caught by `cm2Regions`' own test: v1 read command inputs
  only, so ticketCatalogue's `search`/`sortBy`/`sortOrder` produced nothing at all;
- **one page region** per page-wide need, id = `page::<role>` — today only `page::feedback`, the
  success/error surface of every command, emitted when the page has at least one command.

`presentation: "selection"` (populated by picking a row elsewhere) and `presentation: "route"`
(populated by the URL) are **never regions** — nothing is typed by hand there.

**The region id is a label, not an address.** In v1 it doubled as the write-back address of a node.
Nothing is written into a definition any more, so the id is the c1→c2 join key and what the summary
names; it stays derived from the binding so a reader can trace a choice back to the interaction that
caused it.

**c1's echo is checked.** Because the regions are deterministic, `steps/c1-groups.checkRegionSet`
verifies the answer against the list that was sent: a renamed region cannot be joined to anything and a
dropped one loses its molecule in silence, with the run still reporting success. The imported gate
cannot do this — it comes from the probe, where regions are invented and there is no list to check
against — so this closes at c1 the same hole the c2 gate already closed at c2.

## Field types: the contract the shared declares

`contractRef.tsPath`, as published by the shared — no `web/contracts/{page}` convention to re-derive
(v1 had to). The `.defs.ts` beside it is preferred when present (source of truth); the materialized
`.ts` is the fallback and, in practice, the only one on disk in a client project (confirmed on
mls-102046 and mls-102047, whose `web/contracts/` holds `.ts` only). A type neither rung resolves is
`'unknown'` in the need line — never guessed from the field name.

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
5. **The shared defs and the contract are never written.** They are the run's analysis sources. No run
   amends the workspace — not even to add something that would make a page easier to equip.
6. **Nothing outside the target's `pipeline` value is ever written.** No `l4` artifact, no trace, no
   report, in any project, at any point in the run. If a future implementation needs scratch data
   mid-run because something does not fit the task tree's step `result`, that scratch file must be
   deleted by c3-patch before the run completes — never left "just in case".
7. **The patch spends no LLM call.** c3-patch aggregates c1 + every c2's task-tree result and rewrites
   the pipeline; it is pure arithmetic and JSON manipulation over what was already decided.
8. **Idempotent, and self-correcting.** c3-patch PRUNES this agent's own previous entries before adding
   the current ones (recognized by shape: `l2/molecules/<group>/<name>.ts` in dependsFiles,
   `l2/aura/molecules/skills/<group>/usage.ts` in skills) and SORTS what it adds. So a rerun that chose
   the same set writes nothing even if c1 returned the groups in another order; a rerun that changed its
   mind replaces the old choice instead of stacking both; and a rerun that chose nothing clears what a
   previous run had equipped. Everything the generator put in those arrays matches neither pattern and
   survives untouched. A rerun that changes nothing does not touch the file (byte-equality check).

## What it does not do

- Does not create the target file. The caller decides which file to point this agent at.
- Does not WRITE to the workspace shared defs, the contract, or anything but the target's pipeline.
- Does not read the shared's `scenaries[]` yet — the declared scene structure is the next cheap source
  of evidence and is already in the file c1 reads (`flow.json.knownGaps.scenariesUnused`).
- Does not annotate the v1 object definition. A target still carrying it is refused with an error that
  says so by name, never parsed on a guess.
- Does not run materialization, touch `todoFrontend`/`statusFrontend`, or update `l5/config.json`.
- Does not read or copy the level-3 `usage.ts` CONTENT — only its reference.
- Does not persist the region→molecule mapping. There is no node left to carry it and `PipelineItem` is
  a closed interface, so the render model receives the components and the usage contracts and composes
  the page from them (`flow.json.knownGaps.mappingNotPersisted`).
