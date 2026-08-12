# NS4 terminal-failure audit — flow v29

The audit boundary is every runtime branch that sets a task step or persisted pipeline to `failed`.
Line numbers refer to the v29 source. Validation errors shown inside an open clarification are not
terminal transitions and are therefore excluded.

| Location | Class | Action |
| --- | --- | --- |
| `agentNewSolution4.ts:266,308,313,329` | A | Stop: unsupported plan id, failed dependency, invalid root prompt/envelope, or root hook exception. |
| `steps/e1/agentNs4E1.ts:101,113,116,225-226,264-265` | A | Stop: invalid args/provider envelope, missing approved input, or deterministic module-contract failure. |
| `steps/e2/agentNs4E2.ts:205-206,242-243,281-282,305-306` | A | Stop: missing source/draft, invalid provider envelope, exhausted structural repair, or infrastructure exception. |
| `steps/e2/agentNs4E2.ts:348-366,446-447` | A | Stop: invalid judge protocol after retry, broken policy-decision reference, draft integrity drift, or invalid repair envelope after its bounded retry. Semantic coverage remnants are no longer in these branches. |
| `steps/e3/agentNs4E3.ts:100-101,122-146,163-164` | A | Stop: source/protocol failure or deterministic access-contract failure after its bounded repair. |
| `steps/e4/agentNs4E4.ts:139-140,322-323,358-359,424-425,466-487,542-543` | A | Stop: source/protocol failure, invalid overview/entity/binding contract after bounded repair, or infrastructure exception. Parallel worker-local failures remain completed for finalizer repair. |
| `steps/e5/agentNs4E5.ts:75-76,128-129,229-230` | A | Stop: source/protocol failure, invalid rule catalog after bounded repair, or infrastructure exception. |
| `steps/e6/agentNs4E6.ts:71-72,121-122,214-215` | A | Stop: source/protocol failure, invalid composition contract after bounded repair, or infrastructure exception. |
| `steps/e7/agentNs4E7.ts:93-94,109,262,276,541-543` | A | Stop: invalid orchestration, exhausted use-case repair, structurally invalid workflow/reference, or infrastructure exception. Worker-local payload/gate failures remain completed for the bounded finalizer repair. |
| `steps/e8/agentNs4E8.ts:39,55,65,148` | A | Stop: invalid orchestration/provider envelope, invalid skeleton after bounded handling, exhausted workspace repair, missing/broken source artifacts, or infrastructure exception. Worker-local failures remain completed for finalizer repair. |
| `helpers/ns4Core.ts:876,892,1034,1126,1214,1299,1366,1407` | A sink | These functions only persist a terminal decision already made by the owning step; they do not classify findings. |

Non-terminal resolution points:

| Location | Class | Action |
| --- | --- | --- |
| `steps/e2/agentNs4E2.ts:372-413` + `steps/e2/coverageJudge.ts:153-170` | B | After one semantic repair, record the judge-reported generator default in `systemDecisions`, persist it in E2 review/index, and open the normal review checkpoint. |
| `steps/e7/contracts.ts:299-360` | C | Compile the operated lifecycle subset, remove each unoperated intermediate state only from the workflow, record `shrinkLifecycle` with `operateState` as alternative, and leave E4 unchanged. |
| `helpers/ns4Resolve.ts` | A/B/C boundary | Return A unresolved; record B without changing the artifact; apply and record C. |

Conclusion: no audited Type B or mechanically resolvable Type C branch still marks the task failed.
