# agentChooseMolecules2

Given an existing page `.defs.ts` and the project whose molecule catalog answers, decides which
molecule serves each region of that page and **rewrites the same file in place**. It is the sibling of
`agentChooseMolecules` (the probe that only measures whether the catalog is good enough) — this one
actually annotates a page, and writes nothing else anywhere.

```
@@agentChooseMolecules2 {"catalogProject": 102040, "target": "_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs"}
```

Both keys are required. `catalogProject` is never discovered — no dependency search, no "more than one
catalog reachable" refusal: whoever calls this agent already knows which project's catalog applies.
`target` is the import-style reference of the page's own `.defs.ts` (its `definition` + `pipeline`
shape — the same file `page11`, `page21`, `page31` or a future `page12` all share).

## What it changes

- `definition.dataBindings[]` (a `query` binding) and `definition.dataBindings[].inputs[]` (a `form`
  input) each get a `molecule: { group, tag }` field when a molecule was chosen — nothing more:
  ```json
  "molecule": { "group": "groupSelectOne", "tag": "groupselectone--ml-select-one" }
  ```
- `pipeline[0].dependsFiles`/`pipeline[0].skills` get the chosen molecules' own source files and their
  group's usage contract appended (deduplicated) — files that already exist in the catalog project;
  nothing new is generated.

**Nothing else is ever written.** No report, no trace, no `l4` folder in any project. See `flow.json`'s
"ZERO ARTIFACT RULE".

## The tree

| step | model | what it does |
|---|---|---|
| (root) | — | deterministic bootstrap (`skipRootLLM`); no classifier |
| c1-groups | `reasoning` | deterministic regions in (from `dataBindings`/`inputs` + the sibling contract) → the group of each, or `none` |
| c1r-fanout (root) | — | plants one c2 per chosen group, plus c3-patch |
| c2-`<group>` | `reasoning` | level 2 of ONE group in → the molecule per region, or `none` (anti-invention gate) |
| c3-patch | — | joins c1 + every c2, rewrites the target `.defs.ts` — the run's only write |

## Reused from `agentChooseMolecules`, unchanged

- `helpers/chCatalog.ts`: `readChLevel1`, `readChGroupCatalog` (reading only — this agent never
  discovers a catalog, `catalogProject` is explicit).
- `helpers/chTypes.ts`: `chFileRefFromImport`, `chCanonicalGroup`, `CH_*` gate-result helpers.
- `steps/c1-groups/gate.ts` and `steps/c2-molecules/gate.ts`: the anti-invention gate, imported
  verbatim. Only the source of the region list changes (deterministic here, LLM-invented there).

## Files

```
flow.json  spec.md  README.md              the design record — spec first
agentChooseMolecules2.ts                   root: bootstrap, phase-1 planting, the fan-out
helpers/cm2Entry.ts                        pure: the mention argument, the sibling contract path
helpers/cm2Regions.ts                      pure: deterministic region extraction
helpers/cm2DefsPatch.ts                    pure: parse / patch / serialize the target .defs.ts
helpers/cm2Types.ts                        constants, step-args, task-tree result readers
schemas/                                   the two tool schemas (adapted from agentChooseMolecules)
steps/c1-groups/  steps/c2-molecules/  steps/c3-patch/
```

Tests: `cm2Entry.test.ts`, `cm2Regions.test.ts`, `cm2DefsPatch.test.ts` — all pure, no `mls.*` access,
covering the parse→patch→serialize round-trip against a real page shape and the region-extraction
rules (query → view region, form input → entry region, selection/route → never a region).
