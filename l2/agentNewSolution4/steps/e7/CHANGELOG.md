# Changelog

- 2026-08-13: Run 38 fixes the E7 validation-report reader/writer schema mismatch (`v3` reader versus
  `v4` writer). Both now use one constant, and round merge preserves prior findings while replacing
  only a replay of the same round; reduced two-round fixture and regression tests added.

- 2026-08-12: Run 36 aligns lifecycle shrink and gate on one reachability function. Shrink now reaches
  a fixed point, records cascading state and dormant-predicate decisions, and omits transitionless
  workflows with explicit evidence while retaining the post-resolution invariant throw.

- 2026-08-12: Accept the platform tool-call transport around the strict worker envelope as well as
  direct and legacy raw worker artifacts.

- 2026-08-12: A2.1 narrows workflow-required lifecycle detection to states between the declared
  initial and terminal states. Binary flags do not require workflows; a missing workflow suppresses
  same-entity predicate cascades and opens a human E2/E4 resolution checkpoint instead of failing E7.

- 2026-08-12: Use-case fan-out now submits its artifact through a strict `flexible` tool envelope,
  avoiding provisional worker failures for healthy tool results.

- 2026-08-11: Copy explicit E4 lifecycle initial/terminal contracts into workflow artifacts and fail closed on unreachable, unoperated, dead-predicate or missing workflows with structured E2/E4 repair alternatives.

- 2026-08-10: Reduce permanent use cases to descriptions, contexts, entity refs, rule ids and transition
  refs. Move provenance/language/timestamps to indexes, keep full transitions only in workflows, remove
  field-level inputs/outputs/read/write/error contracts, and persist deterministic validation attempts.
- 2026-08-10: Replace the oversized architecture/access contract with simple business behaviors. Remove
  actors, authorities, scopes, query UI concerns, ports, transactions and idempotency; version drafts so
  old shapes are regenerated rather than patched; derive E3 authority realization and ontology field types mechanically.
- 2026-08-10: Reconcile journey context lineage mechanically, accept explicit authenticated-actor context,
  treat entity rules as applicability candidates instead of mandatory-on-read rules, and reuse valid drafts on resume.
- 2026-08-10: Initial E7 realization compiler with mechanical N→1 planning, parallel use-case detail,
  deterministic gates, targeted repair, typed permanent use-case/workflow artifacts and E8 handoff.
- 2026-08-12: Flow v29 replaces the mandatory lifecycle-resolution checkpoint with deterministic
  partial-workflow compilation and durable shrinkLifecycle system decisions.
