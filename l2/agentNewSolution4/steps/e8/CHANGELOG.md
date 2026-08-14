# Changelog

## 2026-08-13 — run 40 bounded selection repair

- Retarget an invalid selection source deterministically only when its ontology field identifies
  exactly one compatible frozen slice; ambiguous and missing candidates remain blocking.
- Await the deterministic finalizer inside the E8 failure boundary so terminal findings persist
  failed pipeline state instead of leaving the stage marked as running.

## 2026-08-13 — E8 URL-role boundary

- Versioned routed contexts and moved scenario-local selections out of `workspace.pageContext`.
- Derive hub/external path identities and local picker selections mechanically; reserve only viable
  focused-context ambiguity for the strict L1 presentation tool.
- Added one presentation repair followed by non-blocking `selection` fallback with an E8
  `systemDecision`, structural path/selection gates and route previews in the checkpoint widget.
- Added a reduced run 38 fixture covering Project path identity plus assignee/material selections,
  handoff and invalid-L1/default regressions, and the many-cardinality path blocker.

## 2026-08-12 — run 37 cold-start creation gate

- Restrict `NS4_E8_DECISION_WITHOUT_CONTEXT` to reviews, unknown form contracts and commands that
  explicitly declare `contexts.requires`.
- Allow a known context-free command, including the run's cold-start creation, to collect new values
  without inventing a record slice or page context, while preserving the blocker for context-dependent commands.
- Added the reduced run 37 fixture and positive/negative regression coverage.
- Reconciled `docs/flow.json` with the runtime v30 checkpoint so this compatible gate fix does not
  invalidate the failed run's resume authority.

## 2026-08-13 — automatic E8 compilation

- Removed the E8 clarification hook and workspace-review widget/CSS.
- Dispatch the gated skeleton directly to the existing bounded workspace-detail fan-out with
  `approvedBy=auto` in normal and `/fast` runs.
- Preserve duplicate-dispatch protection through the stable workspace-detail plan id.

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
