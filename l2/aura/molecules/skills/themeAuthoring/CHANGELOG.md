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
- 2026-07-28 (T20, todo Fase 10): new section "How to WRITE a recipe". The same skill produced
  three different formats in three runs: the brutal theme COMMENTED OUT its container recipes
  (dead text), glass A used declaration-only blocks (correct — the reference format), and glass B
  invented selectors (`.ml-dialog`, `.ml-popover`, `.ml-panel`, `.ml-flat`… all zero uses in
  mls-102040), used element selectors (`button`, `[role='button']`, which inside a molecule hit
  every icon button and calendar arrow, with `overflow: hidden` clipping focus rings) and reached
  for `!important` seven times. Unspecified format => the recipe is dead, unmatched, or
  over-applied. Now prescribed: transversal utility = a normal rule with its class; container role
  = a DECLARATION-ONLY block introduced by a prose line naming the role and real example classes,
  with `&:hover`/`&::before`/real state classes nested inside. Four explicit bans: no commented
  recipe, no invented selector, no element/attribute selector, no `!important`.
- 2026-07-28 (T22/T23/T25, todo Fase 10): (T22) rule 2 now demands the theme spell out that
  OVERLAY is a per-molecule decision, not a token pair — measured: the modal card carries
  `.ml-surface-bg` (the inline-card class) and `.ml-select-panel` is painted with
  `var(--ml-surface, ...)` in the base sheet, so defining `--ml-surface-dim` alone leaves overlays
  with the INLINE value, which is how a glass modal became unreadable. Mirrored in the v3-less
  prompt, which is where the per-molecule decision is actually made. (T23) rule 1 was too absolute:
  the specular `::before` needs a positioned host, so `position: relative` on a surface the render
  does NOT position is legitimate and belongs in the recipe — the ban applies only to elements the
  render already positions. (T25) `--ml-transition` is a transition shorthand; plugging it into an
  `animation` turns it into a 250ms DELAY (the glass skeleton did exactly that).
- 2026-07-28 (T27, todo Fase 10): the canonical token vocabulary is now MEASURED — a table of
  what the 175 base stylesheets actually read, with each token's SHAPE and the property it is
  read into. Trigger: both glass themes declared `--ml-outline-focus: 0 0 0 3px rgba(...)`, a
  box-shadow shorthand, while molecules read it as `border-color: var(--ml-outline-focus, #3b82f6)`
  in 102 places — invalid CSS, silently dropped, no focus border anywhere; meanwhile the tokens
  the molecules DO read for the focus ring (`--ml-focus-ring-width` 165 reads,
  `--ml-focus-ring-color` 156) were declared by neither theme, so every focus ring stayed the
  light-theme blue. The old text caused it: T5 had framed the shorthand and the pair as
  alternatives ("EITHER ... OR ... never both") when they are different things read differently.
  Two more corrections fell out of the measurement: `--ml-surface-dim` is the RECESSED surface
  (316 reads — slider rails, footers, empty states), NOT the overlay, so the overlay now names
  `--ml-surface-overlay` (rule 2, the T22 paragraph and the v3-less prompt follow); and
  `--ml-radius-lg`, `--ml-surface-hover`, `--ml-backdrop-blur*`, `--ml-text-transform`,
  `--ml-letter-spacing` are theme-only (no molecule reads them). Added the fallback warning: an
  undeclared token resolves to the molecule's literal, and those literals are LIGHT-theme values.
  Also: if a recipe NAMES an animation it must ship the `@keyframes` (both glass themes referenced
  `ml-shimmer` and defined it nowhere, so their skeletons never animated).
