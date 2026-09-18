# entry10 — take the pool/l2 message and open the l2 pipeline

Deterministic. No LLM.

## Input

- Hand: `@@agentPlannerL2 <lowerCamel>` → oldest file in `pool/l2`.
- L4 step: prompt JSON `{ moduleName, thread, file }`.

## Output

`l2/<mod>/pipeline/pipeline.json` with `thread`, `round`, `messageFile`, `steps.entry10.status: approved`.
Done-anchor `entry10-done` unlocks `workspaces20`.

## Invariants

- Module token is lowerCamel. l4 `pipeline.json` must be `complete`.
- Empty box refuses `nothing pending for <mod> in pool/l2`.
- Does not read `l1/`. Does not delete the pool message (that is `requests50`).
