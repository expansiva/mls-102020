# agentChooseMolecules2 — spec

**Status: production annotator.** Given an existing page `.defs.ts` and an explicit catalog project, it
decides which molecule serves each region of that page and rewrites the same file — `definition` and
`pipeline` — with the answer. It is a sibling of `agentChooseMolecules` (the probe that only measures
whether the catalog is good enough for an LLM to choose from), built to actually annotate a page.

## The three levels it walks

Same three-level catalog as the probe (`agentChooseMolecules/spec.md` §"The three levels it walks"),
with one addition: this agent is the first in the family to reach level 3.

| level | file | what it answers | who reads it |
|---|---|---|---|
| 1 | `l2/molecules/skill.ts` of `catalogProject` | which GROUPS exist | c1-groups |
| 2 | `l2/molecules/<group>/index.defs.ts` | which MOLECULES the group has, with scenarios | c2-molecules |
| 3 | the group's `usage.ts` (referenced by level 2 as `usageContract`) | how to write the markup | **c3-patch — reference only, content never read or copied** |

c3-patch never reads the usage.ts CONTENT — it only carries forward the reference string c2 already had
in scope (`ChGroupCatalog.usageContract`), appending it to `pipeline[0].skills` so a future render step
can read it when it actually composes markup. Reading and inlining that content is out of scope here.

## What is different from the probe

| | agentChooseMolecules (probe) | agentChooseMolecules2 |
|---|---|---|
| catalog | discovered (active project + direct deps); refuses on 0 or >1 candidates | **explicit** — `catalogProject` in the argument, no search |
| regions | invented by an LLM from free prose | **extracted deterministically** from `dataBindings[]`/`inputs[]` |
| classifier | c0-classify (slug, language, titles) | **none** — deterministic bootstrap (`skipRootLLM`) |
| output | `l4/agentChooseMolecules/<runKey>/report.json` + per-attempt traces | **the target `.defs.ts` itself**, rewritten — nothing else |
| persisted molecule shape | n/a (never writes source) | `{ group, tag }` only — no reason, no scenarioUsed |

## Which catalog answers the run

Always `catalogProject`, verbatim. There is no search, no "active project" concept, no direct-dependency
check, no ambiguity refusal — all three existed in the probe purely because it never received the
project explicitly. If `catalogProject` does not publish `l2/molecules/skill.ts`, the run fails with a
readable error naming the project; it never falls back to searching.

## The funnel, and why it is still a funnel

Even though regions are already final by the time c1 runs, the whole catalog still does not fit a
prompt — level 1 is ~1.5 KB, a single level 2 is 2–6 KB, all 32 groups would be ~90 KB (measured on the
same catalog the probe measured). So: **one level per prompt, one group per c2 call**, unchanged from
the probe. What the funnel no longer does is invent what a region IS — c1 here only ever answers
"which group", starting from a region list that code already produced.

## Regions: extraction rules

A region is the same unit the probe means by the word: one interaction a single molecule could serve.
Here it is produced by `helpers/cm2Regions.extractRegions`, walking the target's `definition.dataBindings[]`:

- a binding with `kind: "query"` → **one view region**, id = the binding's own `id`, need = its
  `description` plus the output field names resolved from the sibling contract;
- a binding with `kind: "command"`, for each of its `inputs[]` with `presentation: "form"` → **one entry
  region**, id = `${binding.id}::${input.name}`, need = the binding's description, the field name and
  its resolved type;
- `presentation: "selection"` (populated by picking a row elsewhere) and `presentation: "route"`
  (populated by the URL) are **never regions** — nothing is typed by hand there, so there is nothing for
  a molecule to serve.

The region `id` doubles as the write-back address: `helpers/cm2DefsPatch.applyMoleculeChoices` walks it
back to the exact same `dataBinding`/`input` node. This is why c1 and c2 are instructed to echo `region`
back byte-for-byte rather than rename it — the join key IS the file address.

## Field types: the sibling contract

`web/contracts/{page}.defs.ts` (same project/module, `web/contracts` instead of the page's own
device/layout folder, same `shortName`). Read in this order:

1. `web/contracts/{page}.defs.ts` — `definition` is an ARRAY of bffCall commands
   (`{ commandName, input: [{name,type,...}], output: [...] }`, per `agentChangeFrontend/spec.md`
   "1. Contract"). Parsed the same JSON-slice way as the page file, just for an array value.
2. **Fallback**: `web/contracts/{page}.ts` (the materialized DTOs) — a regex over
   `export interface <PascalName>Input/Output { field: type; ... }`. Confirmed necessary: a real
   client project (`mls-102046`) had no `.defs.ts` for its contracts checked out locally, only the
   compiled `.ts`.

A field whose type cannot be resolved by either rung is `'unknown'` in the region's `need` line — never
guessed from the field name. The known platform gap (`agentChangeFrontend/flow.json`: a `status` field
often degrades to plain `string` instead of a literal union) is not something this agent tries to work
around; it decides with what the contract actually publishes.

## Invariants

1. **Never a tag from outside the catalog.** Same gate as the probe
   (`agentChooseMolecules/steps/c2-molecules/gate.ts`), imported unchanged. The published tag carries
   the group prefix and must be copied in full.
2. **Never a group outside level 1.** Same gate as the probe
   (`agentChooseMolecules/steps/c1-groups/gate.ts`), imported unchanged.
3. **`none`/absent is a legal answer at both levels**, and it is written as the ABSENCE of a `molecule`
   field — never `"molecule": null`. A region a previous run annotated and this run answers `none` for
   has its `molecule` field removed (reconciliation), not overwritten with a null.
4. **Nothing outside the target `.defs.ts` is ever written.** No `l4` artifact, no trace, no report, in
   any project, at any point in the run. If a future implementation needs scratch data mid-run because
   something does not fit the task tree's step `result`, that scratch file must be deleted by c3-patch
   before the run completes — never left "just in case".
5. **The patch spends no LLM call.** c3-patch aggregates c1 + every c2's task-tree result and rewrites
   the file; it is pure arithmetic and JSON manipulation over what was already decided.
6. **Idempotent.** A rerun that changes nothing does not touch the file (byte-equality check before
   writing). A rerun that changes something reconciles in place — no duplicate `molecule` fields, no
   duplicate `pipeline.skills`/`dependsFiles` entries (both de-duplicated via `Set`).

## What it does not do

- Does not create the target file. `page12` (or any new genome) is created by whoever calls this agent;
  this agent only annotates a `.defs.ts` that already exists in the `{ definition, pipeline }` shape.
- Does not run materialization, touch `todoFrontend`/`statusFrontend`, or update `l5/config.json`.
- Does not read or copy the level-3 `usage.ts` CONTENT — only its reference.
- Does not decide molecules for `selection`/`route` inputs or for page-level cross-cutting needs
  (success/error notifications, workflow-progress indicators) not tied to a single dataBinding — v2.
