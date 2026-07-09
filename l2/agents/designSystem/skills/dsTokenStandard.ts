/// <mls fileReference="_102020_/l2/agents/designSystem/skills/dsTokenStandard.ts" enhancement="_blank" />

// The mandatory design-system TOKEN STANDARD, as prose for the generate-DS agent's prompt.
// The canonical machine-readable source of truth is `DEFAULT_TOKENS_TEMPLATE` /
// `MANDATORY_TOKEN_KEYS` in `_102029_/l2/designSystemBase.ts`; this skill only DESCRIBES the
// convention and tells the LLM WHAT to return. Keep the two in sync (families list, naming).

export const skill = `
# Design System token standard (mandatory)

A project's design system entry defines styling tokens with FREE-FORM names (no fixed prefix).
Dark-theme values live under a \`_dark-<name>\` key (same var, overridden in the dark block).
Colors follow: \`<family>-color[-lighter|-darker][-hover|-focus|-disabled]\`
(\`grey\` is special: \`grey-color[-lighter|-light|-dark|-darker]\`, no states).

## Your job (colors only)
Return, for EACH of the 11 mandatory COLOR FAMILIES below, a light and a dark ANCHOR color
(#rrggbb) derived from the brand palette. You do NOT return the shades/states — the system
expands lighter/darker/hover/focus/disabled + the \`_dark-\` pairs deterministically from your
anchors. \`global\` (spacing/breakpoints/transitions) and \`typography\` (font families/sizes/
weights) are taken from the canonical template — do not return them.

## The 11 families (semantics)
- text-primary   — main body/heading text (usually a dark neutral in light theme).
- text-secondary — secondary / accent text.
- bg-primary     — main page background (near-white light / near-black dark).
- bg-secondary   — secondary surface / panel background.
- grey           — neutral scale (borders, dividers, subtle fills).
- error          — destructive / danger.
- success        — positive / confirmation.
- warning        — caution.
- info           — informational.
- active         — primary interactive / brand accent (buttons, focus).
- link           — hyperlink color (often equal to active).

## Rules
- Anchors must be valid #rrggbb. Dark anchors are a REAL dark design, not a naive inversion:
  readable contrast (≥ 4.5:1 for text families over bg families in BOTH themes), calmer
  saturation on dark backgrounds.
- Map the brand palette to the families by MEANING; keep sensible defaults for the semantic
  families (error/success/warning/info) unless the brand clearly dictates them.
- If given a brand palette, derive the anchors FROM it — do not invent an unrelated palette.
- "name": short, lowercase, evocative; keep the given name if one was provided.
- "description": one sentence on the intended feel/use, in the requested language.
`;
