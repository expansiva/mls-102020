# entry10 — take the pool/l2 message and open the l2 pipeline

Deterministic. No LLM.

## Input

- Hand: `@@agentPlannerL2 <lowerCamel> [/candidate [rel]]` → every pool/l2
  **message**, partitioned by `from`. `menu.json` is ignored.
- L4 step: prompt JSON `{ moduleName, thread, file, candidate }`. Same grouping
  inside the chosen partition. `candidate` is optional.
- Effort partition (`from: l1` and `backend.json` in artifacts): do not wipe;
  require `pipeline.json` and `menu.json`.

## Output

`l2/<mod>/pipeline/pipeline.json` (or `l2/<mod>/tobe/plan/pipeline/…` under
`/candidate`) with `thread`, `round`, `messageFile`, `sourceMessages`,
`steps.entry10.status: approved`, `webDir`.
Menu partition: wipes `pipeline/` and `web/` files of the **active root** first.
Canonical `l2/<mod>` is not listed when a candidate is set. Empty `web/`
directories stay (no `removeDir`); the pipeline records `webDir`. Done-anchor
`entry10-done` unlocks the rest of the chosen conversation (`menu20` or `effort40`).

## Invariants

- Module token is lowerCamel. l4 `pipeline.json` must be `complete`.
- Empty box (or only `menu.json`) refuses `nothing pending for <mod> in pool/l2`.
- Same `moduleName` + `mode` + `artifacts` → one request. Two different requests refuse in English for the l4 supervisor.
- Does not read `l1/`. Does not delete pool messages.
