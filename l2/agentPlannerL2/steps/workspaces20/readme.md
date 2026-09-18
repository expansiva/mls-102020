# workspaces20 — cut workspaces from l4 journeys

LLM step. Candidates are deterministic; the model only chooses and names.

## Input

Module l4: `journeys/*.defs.ts`, `access.defs.ts`, `ontology/index.defs.ts` (+ entity files for `ddm`).

## Output

`l2/<mod>/pipeline/workspaces20-draft.json`. Done-anchor `workspaces20-done` unlocks `contracts30`.

## Invariants

- Candidates group steps by `(entity, actorRef, kind)`.
- Journey with only `act` and no `locate` → `command`. Panel `ddm` or inspect-only → `hub`. Else `catalogue`.
- Gate: every `journeyRef` / `stepRef` / `entityRef` / `actorRef` exists in the l4; every journey is in exactly one workspace; ids lowerCamel unique; kind matches the overlapping candidates.
- Bounded repair (2) and one transport retry, NS5 pattern.
