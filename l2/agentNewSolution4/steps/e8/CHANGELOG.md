# Changelog

## 2026-08-12 — run 36 cross-journey context edge

- Derive E8 candidate edges for exact E2 prerequisite handoffs when the prerequisite explicitly
  names `providesContext` and a provider step emits the same context consumed by the target step.
  Same-journey adjacency remains unchanged and no label/entity heuristic is used.

## 2026-08-12 — run 35 finalizer doctrine

- Changed `fieldsOnly` field projection from an unsatisfiable text-to-field blocker into one
  recorder decision per workspace and authority, without heuristic matching.
- Persist every validation round, including passes, and resolve remaining Type B/C findings through
  the shared resolver before reserving terminal failure for irrecoverable findings.
- Exclude platform entities from hub ranking by ownership/storage markers and warn on truly empty
  menu sections.

## 2026-08-12 — tool-call reader

- Accept the platform tool-call transport around the strict worker envelope as well as direct and
  legacy raw workspace artifacts.

## 2026-08-12 — worker envelope

- Workspace-detail fan-out now submits a strict `flexible` envelope so healthy workers do not
  transiently appear as failed before their result is consumed.

## 2026-08-11 — E8 v1

- Added derived workspace skeleton, human map checkpoint and bounded workspace-detail fan-out.
- Added deterministic gates for workspace partition, context, menu, queues, fields and disclosure.
- Added permanent typed workspace and workspace-index artifacts.
