# E10 — validate-all, L5 delivery and final approval

E10 is the final NS4 stage. Its compile phase is fully deterministic and consumes only approved permanent E2–E9 artifacts. It does not call an LLM.

## Phase A — validate-all

The gate recompiles E9 in memory and validates the complete saved graph. Blocking findings cover unresolved contexts, journey reachability, policy/system-decision contradictions, compiled-workflow reachability and stale source hashes. Every blocking finding names the earliest owning E2–E9 repair step.

Disclosure and dormant commands are registrars:

- `fieldsOnly` verifies only whether the matching E8 disclosure decision was recorded. E3 prose is never compared with ontology field ids.
- a command whose `transitionRefs` are absent from compiled E7 workflows remains visible and receives a deterministic E10 system decision.

The versioned report is written to `l4/<module>/pipeline/e10-validation-report.json`. A failed report is durable and no L5 file is created or updated.

## Phase B — L5 delivery

After a green report E10 writes:

- additive module navigation and manageable header links in `l5/config.json`;
- `l5/<module>/todoFrontend.defs.ts`, with workspace and contract owners;
- `l5/<module>/todoBackend.defs.ts`, with use-case owners;
- `l5/<module>/process.defs.ts`, with hashes, counts and report handoff.

The config merger preserves unrelated keys, projects and modules. With no existing config it creates only a module seed; publication, masters and deploy settings remain out of scope. Output ordering is stable, so unchanged inputs produce byte-identical config JSON.

## Final checkpoint

The disk-backed `e10-final-review` widget previews the gate, general/hub navigation, header links, counts and every consolidated policy/system decision. Approval writes `e10-result`, marks the module complete and closes the pipeline. Rejection records one selected repair owner, marks it and downstream stages stale, and leaves the task ready for a later module resume.
