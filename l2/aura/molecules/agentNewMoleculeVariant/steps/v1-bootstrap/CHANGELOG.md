# CHANGELOG — v1-bootstrap

- 2026-07-23: created (Fase 2 do todo-agents-molecules-modelos-novos.md; spec: flow.json v1-bootstrap).
- 2026-07-24: context.json now includes `origin.absoluteMlClasses` (ml-* classes the
  origin render positions absolute/fixed, via vOrigin.extractAbsoluteMlClasses) — the
  input to the v3-less position-override gate.

- 2026-07-28 (T11, todo-agent-new-theme.md Fase 10): context.origin gained
  `geometryByClass` — the layout declarations (position/top/right/bottom/left/width/height/
  transform) the ORIGIN .less made per ml-* class, computed by
  vOrigin.extractGeometryByClass. Strategy D scopes the base sheet to the base tag, so the
  variant sheet must reproduce them; the v3-less gate diffs this map against the generated
  sheet (`geometry_dropped`). Optional field — older context.json artifacts default to none.
