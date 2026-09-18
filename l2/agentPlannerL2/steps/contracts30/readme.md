# contracts30 — one `.defs.ts` contract per workspace

LLM step. Field catalog and call slots are deterministic; the model names calls and picks fields.

## Input

- `l2/<mod>/pipeline/workspaces20-draft.json`
- Module l4 journeys (step kind / effect / transitionRef) and ontology entity files

## Output

`l2/<mod>/web/contracts/{workspaceId}.defs.ts` plus draft `l2/<mod>/pipeline/contracts30-draft.json`.
Done-anchor `contracts30-done` unlocks `shared40`.

## Invariants

- Fields come from `ontologyPaths` (plus type / derived / enum of the ontology). The model does not invent names or types.
- `locate` → paginated `qry*`; `inspect` → `qryGet*` or hub `ddm`; `act` → `cmd*` by `effect`; `decide` → one `cmd*` per branching origin.
- Gate: every cited field resolves; `derived: true` never in command Input except `{Entity}.id`; no `any`; no import; enum is a literal union.
- Emitted file is only `export interface` and `export const … as const`.
- Bounded repair (2) and one transport retry, NS5 pattern.
