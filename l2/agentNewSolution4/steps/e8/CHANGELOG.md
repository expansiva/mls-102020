# Changelog

## 2026-08-12 — run 37 cold-start creation gate

- Restrict `NS4_E8_DECISION_WITHOUT_CONTEXT` to reviews, unknown form contracts and commands that
  explicitly declare `contexts.requires`.
- Allow a known context-free command, including the run's cold-start creation, to collect new values
  without inventing a record slice or page context, while preserving the blocker for context-dependent commands.
- Added the reduced run 37 fixture and positive/negative regression coverage.
- Reconciled `docs/flow.json` with the runtime v30 checkpoint so this compatible gate fix does not
  invalidate the failed run's resume authority.

## 2026-08-12 — run 36 duplicate approval dispatch

- Disable the E8 review controls synchronously on submit and re-enable them only when application
  fails.
- Treat an existing stable workspace-detail `planId` as an already dispatched approval, preventing
  a late or repeated callback from adding another fan-out and finalizer for the same review round.
- Added the reduced four-dispatch run 36 fixture and regression coverage.

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
