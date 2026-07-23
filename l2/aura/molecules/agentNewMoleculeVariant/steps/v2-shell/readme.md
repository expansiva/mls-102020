# v2-shell

Deterministic shell .ts + .defs.ts from templates (NO LLM).

Input: context.json. Output: l2/molecules/<group>/<shortName>.ts + .defs.ts + v2-done anchor.
Invariants: @customElement(variantTag); extends origin class; NO render(); portalWidgetName iff portal; never portalClassName; defs exports group + mentions tag.
Known traps: a gate failure here is a TEMPLATE bug — no retry, fix vTemplates.ts.
