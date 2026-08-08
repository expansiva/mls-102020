# E3 changelog

- 2026-08-08: Build 32 removes the large `e2-journeys.draft.json` dependency exposed by the first
  run24 recovery. E3 now reads the approved journey index and per-journey defs through the shared
  permanent-artifact reader, and uses the approved access def as the previous revision.
- 2026-08-08: Build 31 accepts an E5 upstream-contract report as a targeted adjustment, preserves
  the approved matrix and adds only missing backend-enforceable authorities/grants. A deliberate
  approved revision records its new review round without weakening monotonic checkpoint handling.
- 2026-08-05: Added the first access-matrix contract, deterministic gate, iterative clarification
  loop, localized matrix widget and permanent hashed L4 artifact. Ontology moved to E4.
