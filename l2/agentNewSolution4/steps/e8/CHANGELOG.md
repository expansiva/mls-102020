# Changelog

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
