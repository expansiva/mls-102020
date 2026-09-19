# entry10 — take the pool/l2 message and open the l2 pipeline

Deterministic. No LLM.

## Input

- Hand: `@@agentPlannerL2 <lowerCamel>` → every pool/l2 **message** (oldest first). `menu.json` is ignored.
- L4 step: prompt JSON `{ moduleName, thread, file }`. Same grouping.

## Output

`l2/<mod>/pipeline/pipeline.json` with `thread`, `round`, `messageFile`, `sourceMessages`, `steps.entry10.status: approved`.
Wipes `l2/<mod>/pipeline/` and `l2/<mod>/web/` first. Done-anchor `entry10-done` unlocks `menu20`.

## Invariants

- Module token is lowerCamel. l4 `pipeline.json` must be `complete`.
- Empty box (or only `menu.json`) refuses `nothing pending for <mod> in pool/l2`.
- Same `moduleName` + `mode` + `artifacts` → one request. Two different requests refuse in English for the l4 supervisor.
- Does not read `l1/`. Does not delete pool messages.
