# E10 — validate-all, L5 delivery and automatic completion

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

E10 does not write `publish*.conf` or `.conf.example`.

The config merger preserves unrelated keys, projects and modules. With no existing config it creates only a module seed; publication, masters and deploy settings remain out of scope. Output ordering is stable, so unchanged inputs produce byte-identical config JSON.

## Completion

After successful validation and delivery, the same deterministic hook records `approvedBy=auto`, writes
`e10-result`, marks the module complete and closes the pipeline. E10 has no clarification or CSS widget.
A blocking report still records the earliest owning repair step and leaves the durable report available
for audit and a later module resume.
