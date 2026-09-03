/// <mls fileReference="_102020_/l2/aura/agentManageDesignSystem/skills/dsTokenStandard.ts" enhancement="_blank" />

// The mandatory design-system TOKEN STANDARD, as prose for the generate-DS agent's prompt.
// The canonical machine-readable source of truth is `DEFAULT_TOKENS_TEMPLATE` /
// `MANDATORY_COLOR_ROLES` in `_102029_/l2/designSystemBase.ts`; this skill only DESCRIBES the
// convention and tells the LLM WHAT to return. Keep the two in sync (role list, naming).

export const skill = `
# Design System token standard (mandatory)

A project's design system entry defines styling tokens with FREE-FORM names (no fixed prefix).
Dark-theme values live under a \`_dark-<name>\` key (same var, overridden in the dark block).
Colors are named BY ROLE: \`<role>[-hover|-focus|-disabled]\`. The name says WHERE the token is
used — never infer it from the value.

## Your job (colors only)
Return, for EACH of the 44 mandatory COLOR ROLES below, a light and a dark ANCHOR color
(#rrggbb) derived from the brand palette. You do NOT return the states — the system derives
\`-hover\`, \`-focus\`, \`-disabled\` and the \`_dark-\` twins deterministically from your anchors.
\`global\` (spacing/breakpoints/radius/shadow) and \`typography\` (font families/sizes/weights) come
from the canonical template — do not return them.

## The 44 roles (semantics)
Surfaces (hierarchy, back to front):
- page-bg          — the page behind everything.
- surface-bg       — cards, panels, modals.
- surface-alt-bg   — zebra rows, row hover, skeletons, section headers.
- input-bg         — form field background.

Text on surfaces:
- text-strong      — titles.
- text-default     — body.
- text-muted       — secondary text and placeholders.

Borders: border-default (visible separation) · border-subtle (hairlines).

Buttons (each -bg pairs with its -text):
- button-primary-bg / button-primary-text     — the main action.
- button-secondary-bg / button-secondary-text / button-secondary-border — the quiet action.
- button-danger-bg / button-danger-text       — destructive.

Interaction: link-text · focus-ring (keyboard focus) ·
selected-bg / selected-text / selected-border (selected row/item).

Status (each -bg pairs with its -text): status-success-* · status-error-* · status-warning-* ·
status-info-* · status-neutral-*.

Navigation: nav-bg / nav-text · nav-active-bg / nav-active-text (current item).

Overlays: overlay-backdrop-bg (behind a modal; may be rgba) · tooltip-bg / tooltip-text.

Charts: chart-series-1 … chart-series-6.

## Rules
- Anchors must be valid #rrggbb (overlay-backdrop-bg may be rgba()). Dark anchors are a REAL dark
  design, not a naive inversion: readable contrast (>= 4.5:1 for every -text over its paired -bg,
  in BOTH themes), calmer saturation on dark backgrounds.
- PAIRS TRAVEL TOGETHER: whoever paints with \`<role>-bg\` writes the label with \`<role>-text\`.
  Check the contrast of every pair, not of colors in isolation.
- Keep the surface hierarchy visibly ordered (page-bg / surface-bg / surface-alt-bg must be
  distinguishable side by side) — this is what makes cards read as cards.
- chart-series-1..6 are consumed ALWAYS in this fixed order: that order IS the colour-blindness
  safeguard. Make consecutive series distinguishable in hue AND lightness. Never reuse a
  status-* color as a series — status is reserved for state.
- Map the brand palette to the roles by MEANING; keep sensible conventions for the semantic
  roles (status-*) unless the brand clearly dictates otherwise.
- If given a brand palette, derive the anchors FROM it — do not invent an unrelated palette.
- "name": short, lowercase, evocative; keep the given name if one was provided.
- "description": one sentence on the intended feel/use, in the requested language.
`;
