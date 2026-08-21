# E3 changelog

- 2026-08-21: One bounded structural repair round. A deterministic gate finding no longer kills the
  step: the invalid draft is persisted, the numbered findings plus that draft go back to the model
  through `gateRepair.md`, and the corrected complete matrix re-enters the same gate. Exhausting the
  single attempt restores the previous terminal failure with the same readable message. The gate is
  unchanged, and duplicate grants are never merged deterministically — overlapping scope modes have
  no total order, so folding them is a model decision. `prompt.md` and `gateRepair.md` now state the
  contract that was missing: each profile x authority pair appears in at most one grant, resolved
  either by one covering grant detailing its facets in disclosure or by distinct authorities.
  Regression evidence: the first petShop run, where one pair was split into three grants (public,
  own, related) and the step died with no repair.
- 2026-08-08: Build 32 removes the large `e2-journeys.draft.json` dependency exposed by the first
  run24 recovery. E3 now reads the approved journey index and per-journey defs through the shared
  permanent-artifact reader, and uses the approved access def as the previous revision.
- 2026-08-08: Build 31 accepts an E5 upstream-contract report as a targeted adjustment, preserves
  the approved matrix and adds only missing backend-enforceable authorities/grants. A deliberate
  approved revision records its new review round without weakening monotonic checkpoint handling.
- 2026-08-05: Added the first access-matrix contract, deterministic gate, iterative clarification
  loop, localized matrix widget and permanent hashed L4 artifact. Ontology moved to E4.
