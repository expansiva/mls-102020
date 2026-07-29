<!-- modelType: design -->

You are generating the COMPLETE `.less` theme sheet for a themed VARIANT of an existing web-component molecule (Strategy D — derivation by inheritance).

The variant `.ts` shell already exists: it extends the origin molecule and inherits its `render()`, which emits semantic `ml-*` classes plus global Tailwind layout utilities. The base `.less` scopes under the BASE tag, so it never reaches the variant tag: **your sheet must define the FULL appearance of the variant** — it is a complete sheet, not a delta.

## Structure

```less
{{variantTag}}{{portalSelectorHint}} {
  // ---- theme tokens ----
  // define ONLY the --ml-* tokens this molecule actually consumes
  // (values come from the theme skill token table below)

  .ml-example { /* rules consuming var(--ml-*, fallback) */ }
}
```

## Rules

- Scope EVERYTHING under the variant tag `{{variantTag}}`.{{portalRule}}
- The `ml-*` class inventory you may style is exactly the one in the origin molecule's `.ts` and `.less`, provided below. NEVER invent classes.
- Tailwind utilities in the inherited markup (layout: `px-*`, `gap-*`, `inline-flex`) are global and keep working — never redefine layout in this sheet.
- NEVER override the render's inherited positioning: if the origin `.ts` places an element with `absolute`/`fixed` (e.g. a floating value indicator, stop marks/ticks, a drag thumb), do NOT set `position` or `overflow` on that `ml-*` class — forcing `position: relative` drops it into normal flow (full width) and `overflow: hidden` clips its arrow. Its `::before`/`::after` overlays already anchor to it; for a glass specular edge use `box-shadow: inset ...` instead of a positioned/clipped `::before`. (You MAY use `position`/`transform`/`display` on elements the render does NOT position — e.g. a button root anchoring an offset shadow, or a hover `transform` micro-interaction.)
- The base `.less` defines transitions — take an explicit motion stance; the value comes from the theme skill (e.g. `transition: none`, or a smooth ease).
- Define tokens at the top of the scope; consume with `var(--ml-*, fallback)`. Define ONLY the tokens this molecule consumes — not the whole table.
- Apply the theme skill sections in order: Visual Signature drives the look; Tokens give the values; Canonical CSS Rules are ready recipes for interactive surfaces, states, panels and special variants; Theme Nuances list exceptions.
- Respect the origin `.less` property SCOPE per class: it shows WHICH properties each `ml-*` class legitimately carries. Theme the VALUES of those properties (colors, tokens, transition) — do NOT add new structural/surface properties to a class the origin styled with color only.
- REPRODUCE the origin `.less` LAYOUT declarations. Your sheet is scoped to `{{variantTag}}`, so NOTHING in the base sheet reaches this molecule: every `position`, `top`/`right`/`bottom`/`left`, `width`/`height` and `transform` the origin `.less` wrote on an `ml-*` class must appear in your sheet too, with the same value (a deterministic gate rejects the sheet otherwise: `geometry_dropped`). This is the mirror image of the rule above — do not ADD layout the origin lacks, and do not DROP layout the origin has. Example of the failure: a rail styled `position: absolute; top: 50%; height: 6px; transform: translateY(-50%)` in the base, re-emitted with only `background`/`border`, falls into normal flow at the top of the track while the render-positioned handles stay centered.
- Mind the BORDER BUDGET on thin primitives: a border costs its width on both sides, so a 3px border on a 6px rail leaves no fill. Keep the origin's literal width there (or use color alone) even when the theme's canonical `--ml-border-width` is thicker.
- Do NOT "glassify"/heavily treat small control primitives. Reserve surface effects (`backdrop-filter`/blur, an added `border`, `box-shadow` with an offset or spread, specular `::before`/`::after` overlays, `border-radius` overrides) for real SURFACES — panels, cards, inputs, trigger buttons. For fine geometric primitives — thin tracks/rails, small stop marks/ticks/dots, drag thumbs, floating value indicators/tooltips (typically ≤ ~20px) — keep the treatment minimal (color / border-color / opacity), matching the origin, so layout and alignment are preserved. Heavy effects on these tiny parts produce drop-shadow "bars", bloated/misaligned marks, and clipped arrows.
- Style the state classes the base emits (disabled/open/selected/error...), excluding states from hover with `:not(...)`.
- If THIS molecule is an OVERLAY (modal/dialog, dropdown panel, popover, tooltip), its container background takes the theme's OVERLAY value (`--ml-surface-overlay`; `--ml-surface-dim` is the RECESSED surface of rails/footers/empty states, not the overlay), even when the class carrying it is `.ml-surface-bg` — the same class means the inline surface in a card molecule. Check the origin before deciding: the modal card carries `ml-surface-bg`, and `.ml-select-panel` is painted with `var(--ml-surface, ...)` in the base sheet. Getting this backwards is what made a glass modal unreadable (the card came out translucent over page content).
- Transversal `ml-*` classes are SINGLE-FAMILY utilities, whatever the theme's recipes look like: `.ml-border`/`.ml-border-focus`/`.ml-border-error` carry `border-color` only (they sit on dividers and frames, they are not surfaces), `.ml-surface-bg`/`.ml-surface-dim-bg`/`.ml-primary-dim-bg`/`.ml-error-dim-bg` carry `background` only, `.ml-text*`/`.ml-label`/`.ml-helper`/`.ml-*-text` carry text color. The full surface treatment (background + border + radius + shadow) belongs to CONTAINERS — per-molecule classes, `.ml-input-container`, the tag root.
- `text-transform`/`letter-spacing` from the theme go on `.ml-label` and button labels ONLY — never on `.ml-text`, `.ml-text-muted`, `.ml-text-faint` or `.ml-input`, which carry user content (values, item text, placeholders).
- `:has()` is allowed for structural states the base doesn't class (e.g. readonly).
- Old-class techniques (structural selectors anchored on stable attributes, never bare element order) apply when the inventory has gaps on decorated elements.
- These components render in LIGHT DOM (no Shadow DOM): the scope root is the tag `{{variantTag}}` itself. Never use `:host`, `:host-context` or `::slotted()` — they match nothing and the rule dies silently (the gate rejects them). Root-level declarations (font, base color) go directly at the tag scope.
- Write ALL code comments in English, regardless of the user's language.

## Theme skill (the ONLY source of visual values)

{{themeSkill}}

{{exampleSection}}

## Output

Call the tool with the complete sheet in `result.lessContent`. Raw LESS only — no markdown fences, no prose.
