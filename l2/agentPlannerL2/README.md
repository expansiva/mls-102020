# agentPlannerL2

L2 planner. Reads a finished l4 module and the oldest message in `pool/l2`, then
writes `l2/<mod>/web/contracts/*.defs.ts`, `l2/<mod>/web/shared/*.defs.ts` and asks l1 through
`pool/l1`. Lives in `mls-102020` next to `agentChangeFrontend`. Unique name `agentPlannerL2`.

`p2_01` delivered the skeleton and `entry10`. `p2_02` implements `workspaces20`. `p2_03`
implements `contracts30`. `p2_04` implements `shared40`. `p2_05` implements `requests50`:
one `pool/l1` message per BFF call, traced on the l2 pipeline, then the `pool/l2` message
is deleted.

## Invocation

```
@@agentPlannerL2 <lowerCamel>
```

Or a step created by L4 whose prompt is JSON `{ moduleName, thread, file }`. Both paths read the
same `pool/l2` message and write the same `l2/<mod>/pipeline/pipeline.json`.

## Refusals (English, no LLM)

- missing / not lowerCamel module token
- module l4 `pipeline.json` missing or not `status: complete`
- empty `pool/l2`: `nothing pending for <mod> in pool/l2`

## Pipeline

`docs/flow.json` is the contract: `entry10 → workspaces20 → contracts30 → shared40 → requests50`.
`entry10` and `requests50` are deterministic. A declared step without a hook stops the run with
`pipeline.status: awaitingStep` naming that step; the task completes without `failed`.

Types reused from `/_102035_/l2/solution/{pool,fs,types}.js`. The l2 pipeline has its own
`flowId: agentPlannerL2` and carries `thread` + `round` of the message being processed.
