# CHANGELOG — skills/themeAuthoring

- 2026-07-24: 1st draft (todo-agent-new-theme.md Fase 0.1) — target artifact, contract v1,
  canonical --ml-* vocabulary, 9 authoring rules distilled from the Variant acceptances P3–P10.
- 2026-07-27 (series T, todo Fase 10): T1 class vocabulary is GIVEN (never invent names);
  T2 modal veil anchor `div[aria-hidden='true']`; T3 no universal selector + mechanical
  spinner; T4 overlay background must differ from the page + token roles kept apart;
  T5 one mechanism per concern (a token no recipe mentions is normal; two ways to say the
  same thing is not); T13 no `:host`/`::slotted` (light DOM).
- 2026-07-28 (T10/T12, todo Fase 10): rule 0 — geometry from the RENDER is never redefined,
  geometry from the ORIGIN STYLESHEET must be reproduced verbatim; border budget on thin
  primitives (a border costs its width on both sides).
- 2026-07-28 (T16/T17, todo Fase 10): the transversal classes are now a TABLE of
  single-family utilities (measured across the 175 base stylesheets of mls-102040), because
  the 2nd generated theme mapped roles onto the wrong classes — `.ml-border` (a border COLOR
  utility that sits on dividers and image frames) became an overlay surface with background
  and shadow, `.ml-primary-dim-bg` (a tint that lands on 8px progress bars) became a
  ghost-button variant, and `.ml-text` (user content) was uppercased. Added the rule that
  SURFACES ARE CONTAINERS — only per-molecule classes, `.ml-input-container` and the tag root
  take the full background+border+radius+shadow treatment. Rule 8 (casing) now names the
  classes: `.ml-label` and button labels only, never `.ml-text*`/`.ml-input`. Mirrored in the
  v3-less prompt, which is what the .less generator reads.
