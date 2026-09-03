# v2-shell

Deterministic shell .ts + .defs.ts (NO LLM).

Input: context.json + the origin `.defs.ts` (read from mls.stor). Output:
l2/molecules/<group>/<shortName>.ts + .defs.ts + v2-done anchor.

- .ts: template (Strategy D shell). Invariants: @customElement(variantTag);
  extends origin class; NO render(); portalWidgetName iff portal; never portalClassName.
- .defs.ts: a CONTRACT other collab routines consume (e.g. the DS agent reads
  `layoutConfig`). The variant inherits ALL behavior, so its contract is the
  origin's — the origin .defs.ts is REPLICATED VERBATIM, swapping ONLY the two
  identity fields: the mls header fileReference and the skill's `TagName` line.
  A missing origin .defs.ts fails readable (the contract cannot be fabricated).
Known traps: a gate failure here is a TEMPLATE bug — no retry, fix vTemplates.ts.
