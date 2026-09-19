# menu20 — decide the per-profile menu

LLM step (`modelType: reasoning`). One call. The product is `l4/<mod>/pool/l2/menu.json`.

## Input

Module l4: every journey (id, actor, title, goal, steps), `access.defs.ts` actors and grants (mode, anchor, disclosure), ontology entities (family, displayField), `workflows.defs.ts` processes (id, trigger, stages), and the deterministic `(entity, actor)` candidates from `workspaces20/contracts.ts` — labelled **candidates, not the answer**.

## Output

`l4/<mod>/pool/l2/menu.json` (overwritten). Envelope fields (`schemaVersion`, `moduleName`, `userLanguage`, `sourceMessages`, `generatedAt`, `workflows: []`) are filled by code. On approve, `pipeline.status = complete`. Done-anchor `menu20-done`.

## Invariants

- Menu is per actor. Items are `place` or `action`. An action has a `placeRef` that is a place of the same actor.
- Gate: every `origins.*` id exists in the l4; every `actorRef` exists; `itemId` lowerCamel unique; unused journeys are a warning, not an error.
- Bounded repair (2) and one transport retry, NS5 pattern.
- Does not delete pool messages. Does not write `pool/l1` or `l2/<mod>/web/`.
