# CHANGELOG — v3-less

- 2026-07-23: created (Fase 2 do todo-agents-molecules-modelos-novos.md; spec: flow.json v3-less).
- 2026-07-24: prompt.md — added two rules after ml-discrete-slider-glass came out
  wrong (glass over-applied): (1) respect the origin .less property SCOPE per class
  (theme values, don't add new structural/surface props to a color-only class);
  (2) do NOT "glassify" small control primitives (thin tracks, stop marks/ticks,
  drag thumbs, floating indicators ≤ ~20px) — keep them color/border-color/opacity
  only, matching the origin; reserve blur/added-border/offset-or-spread box-shadow/
  specular ::before for real surfaces. Prompt-only nudge (no gate/code change).
- 2026-07-24: render-aware position-override GATE. After the slider `.ml-slider-thumb`
  set `position: relative` + `overflow: hidden` (overriding the render's `absolute`
  → full-width tooltip + clipped arrow), added a deterministic check: `position`/
  `overflow` are forbidden ONLY on classes the origin render positions absolute/fixed
  (`ctx.origin.absoluteMlClasses`, computed by v1-bootstrap via
  vOrigin.extractAbsoluteMlClasses). position/transform/display stay allowed on
  non-render-positioned elements (the brutal golden uses them). ::before/::after
  blocks are scrubbed first (they may position themselves). A blanket layout-property
  ban was rejected — it would break the golden (display/position/transform legit).
  Prompt gained a matching hard rule. Tests: v3-less gate + vOrigin extractor.
