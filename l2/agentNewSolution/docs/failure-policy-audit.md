# NS4 terminal-failure audit — flow v30

Audit boundary: runtime branches under `agentNewSolution.ts`, `steps/e1`–`steps/e8` and shared
helpers that throw, return a failed task intent or persist a failed pipeline state. The inventory was
refreshed with:

```text
rg -n "throw new Error|status.*'failed'|recordNs4.*Failure" \
  agentNewSolution.ts steps helpers --glob '*.ts' --glob '!*.test.ts'
```

CLI/live/smoke utilities are test tools rather than task-state transitions and are excluded. Errors
raised inside an open clarification callback are recoverable UI feedback and are listed separately.

## Terminal and invariant boundaries

| Owner/location | Class | Audited action |
| --- | --- | --- |
| Root `agentNewSolution.ts` planning and dispatch | A | Stop on unsupported plan id, failed dependency, invalid root envelope/prompt or root hook exception. |
| E1 prompt/compile and permanent module gate | A | Stop on provider/protocol failure, invalid ownership/resume, missing approved input or deterministic module-contract failure. |
| E2 proposal, structural repair and coverage judge | A | Stop on missing source/draft, invalid provider/judge protocol after its bounded retry, broken policy-decision reference, draft integrity drift or exhausted structural repair. Coverage bifurcations after the semantic budget are Type B decisions, not terminal. |
| E3 access compilation | A | Stop on source/protocol failure or deterministic access-contract failure after bounded repair. |
| E4 overview/entity/binding finalizers | A | Stop on source/protocol failure, invalid structural contract after bounded repair or incomplete approved artifact input. Worker-local failures complete for targeted repair. |
| E5 rule compilation | A | Stop on source/protocol failure, invalid rule catalog after repair or approved-source failure. |
| E6 composition compilation | A | Stop on source/protocol failure, invalid composition contract after repair or approved-source failure. |
| E7 use-case finalizer | A | Stop after exhausted missing/invalid use-case repair. Worker-local failures remain completed for the bounded finalizer repair. |
| E7 post-resolution workflow gate (`agentNs4E7.ts`, `E7 workflow structural gate failed`) | A invariant | Keep the throw. Build first resolves reachability, predicate cascades and evidence-backed workflow omission; any remaining gate error means compiler/gate drift. The complete E7 validation report is persisted before this assertion. Run 36 exposed exactly this boundary and led to the shared reachability fix rather than weakening the gate. |
| E8 skeleton/workspace finalizers | A | Stop on invalid orchestration/provider envelope, invalid skeleton, missing/broken approved sources or unresolved Type A workspace findings after repair. The E8 report is durable before the remaining finalizer throw. |
| `helpers/ns4ApprovedArtifacts.ts` and required reads in `ns4Fs.ts` | A source integrity | Ownership mismatch, duplicate/missing approved defs and exhausted bounded reads bubble to the owning step and become its terminal source failure. |
| Typed contract builders (`steps/*/contracts.ts`) | A invariant | Unknown targets, legacy contracts and impossible relationship realizations are programmer/source-contract errors and are caught by the owning runtime phase. |
| `helpers/ns4Core.ts` `markNs4*Failed` functions | A sink | Persist a terminal decision already made by the owning phase; they never classify findings. |

## Non-terminal resolution boundaries

| Owner/location | Class | Audited action |
| --- | --- | --- |
| E2 semantic coverage resolver | B | After one semantic repair, record the generator default in `systemDecisions`; `/fast` auto-approves it and interactive mode opens the normal review. |
| E7 fixed-point workflow compiler | C | Use the same reachability function as the gate, remove every unreachable state and cascading transition, record `shrinkLifecycle`, record predicates made dormant and omit a transitionless workflow with explicit evidence. E4 and E5 remain unchanged. |
| E8 disclosure and invalid-field resolver | B/C | Record prose-only `fieldsOnly` review decisions; patch exact invalid field refs after repair and preserve the full validation history. |
| `helpers/ns4Resolve.ts` | A/B/C boundary | Return A unresolved; record B without changing the artifact; apply and record C. |

## Recoverable clarification errors

E1–E6/E8 clarification callbacks may throw for cancellation not yet supported, an empty adjustment,
invalid selections or edited review data that fails its deterministic gate. The widget catches these
errors, remains open and does not mark the task or pipeline failed.

Conclusion: every runtime terminal branch is either Type A infrastructure/source/protocol failure or
an explicit post-resolution invariant. Known Type B and mechanically resolvable Type C findings have
durable non-terminal paths.
