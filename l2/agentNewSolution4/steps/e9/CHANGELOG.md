# E9 changelog

## 2026-08-14 — notifications compile from the handoff itself

- A notification is compiled from the handoff `targetProfile` and the sending step entity instead of
  matching declared context names between an event-driven journey and its provider. Delivery remains
  a notification and never a navigation edge; deep links are still validated through `routeOf`.


## 2026-08-13 — run 40 shared identifier field

- Route-selection validation now uses context identity as its authority.
- A selection context may share an `idFieldRef` such as `projectId` with a legitimate routed page
  context without being falsely reported as part of the URL.
- Unique, unowned selection-field segments and selection context ids in `pathContextIds` remain
  blocking findings.

## 2026-08-13

- Added the deterministic E9 navigation compiler and structural gate.
- Added canonical route, tab-scoped store, notification and typed BFF contract artifacts.
- Added E3 access realization by compiled operation.
- Added source-hash propagation and timestamp-free idempotent output.
- Added Run 38, orphan-context, synthetic notification, field-contract and rerun fixtures/tests.
- Integrated E9 into the NS4 pipeline; structural failures repair through E8 and successful completion unlocks E10.
