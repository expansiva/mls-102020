# menu20 — decide the module menu tree

LLM step (`modelType: reasoning`). One call. The product is `l4/<mod>/pool/l2/menu.json` (schema `2026-09-19-p2-menu-v2`).

## Input

Module l4: every journey (id, actor, title, goal, steps), `access.defs.ts` actors and grants (mode, anchor, disclosure), ontology entities (family, displayField), `workflows.defs.ts` processes (id, trigger, stages), and the deterministic candidates from `menuCandidates` (hubs = grant anchors; pages = `(entity, actor)` from `workspaces20/contracts.ts`) — labelled **candidates, not the answer**.

## Output

`l4/<mod>/pool/l2/menu.json` (overwritten). Envelope fields (`schemaVersion`, `moduleName`, `userLanguage`) are filled by code. The model emits `tree`, `authorities`, `meta`. On approve, `pipeline.status = complete`. Gate warnings land on `pipeline.warnings`. Done-anchor `menu20-done`.

## Invariants

- One tree per module. Nodes are `hub`, `page` or `group`. A page has `organisms[]`; a hub has `context` + `text` + `children`.
- `authorities` is visibility (ordered; a hub grants its children). Every page is reachable from at least one actor.
- Gate: unique ids; hub.context is an l4 entity; every authorities id exists; every authorities actor exists in access; hub has ≥ 1 child; every l4 journey appears in `meta.journeys` (empty ⇒ warning, not error). No UX rule in the gate.
- Bounded repair (2) and one transport retry, NS5 pattern.
- Does not delete pool messages. Does not write `pool/l1` or `l2/<mod>/web/`.
