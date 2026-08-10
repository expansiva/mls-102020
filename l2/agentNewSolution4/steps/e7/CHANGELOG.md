# Changelog

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
