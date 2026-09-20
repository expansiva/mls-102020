# menu20 — decide the module menu tree

LLM step (`modelType: reasoning`). One call. The product is `l4/<mod>/pool/l2/web/menu.json` (schema `2026-09-20-p2-menu-v2.2`).

## Input

Module l4: every journey (id, actor, title, goal, steps), `access.defs.ts` actors and grants (mode, anchor, disclosure), ontology entities (family, displayField, derived/`ddm`, `writer`), `workflows.defs.ts` processes (id, trigger, stages), and the deterministic candidates from `menuCandidates` (hubs = grant anchors; pages = `(entity, actor)` from `workspaces20/contracts.ts`; `beyondJourneys` = human/alert/mechanical/derived per actor; `recordsKept` = per `writer: crud` entity, the grants that reach it with description as-is) — labelled **candidates, not the answer** and **what this actor must see, beyond journeys**.

## Output

`l4/<mod>/pool/l2/web/menu.json` (overwritten). Envelope fields (`schemaVersion`, `moduleName`, `userLanguage`, `device`) are filled by code. The model emits `tree`, `authorities`, `meta` (journeys/processes). `action` is stamped by L2 against what is already a screen in l2 (the manifesto materialization will write per device). That manifesto does not exist yet, so every node is `new` and `meta.removed` is `[]`. On approve, `pipeline.device` and `actionCounts` are recorded; `effort40` closes the pipeline. Gate warnings land on `pipeline.warnings`. Done-anchor `menu20-done`.

## Invariants

- One tree per module, one file per device (`web` today). Nodes are `hub`, `page` or `group`. A page has `organisms[]` (9 kinds, including `inbox` and `alerts`); a hub has `context` + `text` + `children`. Every node has `action`: `new` | `change` | `keep` | `remove`. Today only `new` is emitted (`meta.removed` is always `[]`) because nothing is built in l2 yet. When the manifesto exists, `action` becomes a structural diff against it.
- `authorities` is visibility (ordered; a hub grants its children). Every page is reachable from at least one actor.
- Gate: unique ids; hub.context is an l4 entity; every authorities id exists; every authorities actor exists in access; hub has ≥ 1 child; every l4 journey appears in `meta.journeys` (empty ⇒ warning, not error); every l4 process appears in `meta.processes` (empty ⇒ warning; unknown id/page ⇒ error). Alert without `alerts`, human without `inbox`/`actions`, mechanical effect without `timeline`, derived/`ddm` without `summary`/`highlights`/`detail` are warnings. No entity gate: who maintains a `crud` record is in the grant description; a gate on that expectation is the origin of the whack-a-mole. No UX rule in the gate.
- Bounded repair (2) and one transport retry, NS5 pattern.
- Does not delete pool messages. Does not write `pool/l1` or `l2/<mod>/web/`.
