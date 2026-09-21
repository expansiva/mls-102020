# needs30

## 2026-09-21 (p2_26)

- Home `inbox` reads the human-stage `entityRef` (`from: organism:inbox`). Empty `entityRef` adds no read.

## 2026-09-21 (p2_22)

- No longer closes the pipeline. `effort40` is the last `flow.json` step.

## 2026-09-21 (p2_21)

- First cut. Deterministic needs.json from menu v2.2 + l4. No LLM.
- Transitions of a page are the `transitionRef` of that page's `act` steps (there is no `meta.transitions`).
- `family` is derived (`role` → mdm, `isDdmEntity` → ddm, else tdm).
- Widest grant wins for `scope`.
