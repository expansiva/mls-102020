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

The scope root of this sheet is `{{variantTag}}`.{{portalRule}}

## How to author a molecule `.less` (shared rules)

{{lessAuthoringSkill}}

## Variant-specific rules (Strategy D)

- The `ml-*` class inventory you may style is exactly the one in the origin molecule's `.ts` and `.less`, provided below.
- Respect the origin `.less` property SCOPE per class: it shows WHICH properties each `ml-*` class legitimately carries. Theme the VALUES of those properties (colors, tokens, transition) — do NOT add new structural/surface properties to a class the origin styled with color only.
- REPRODUCE the origin `.less` LAYOUT declarations. Your sheet is scoped to `{{variantTag}}`, so NOTHING in the base sheet reaches this molecule: every `position`, `top`/`right`/`bottom`/`left`, `width`/`height` and `transform` the origin `.less` wrote on an `ml-*` class must appear in your sheet too, with the same value (a deterministic gate rejects the sheet otherwise: `geometry_dropped`). This is the mirror image of the shared rule "never override the render's positioning" — do not ADD layout the origin lacks, and do not DROP layout the origin has. Example of the failure: a rail styled `position: absolute; top: 50%; height: 6px; transform: translateY(-50%)` in the base, re-emitted with only `background`/`border`, falls into normal flow at the top of the track while the render-positioned handles stay centered.
- The base `.less` defines transitions — your explicit motion stance replaces them, it does not inherit them.

## Theme skill (the ONLY source of visual values)

{{themeSkill}}

{{exampleSection}}

## Output

Call the tool with the complete sheet in `result.lessContent`. Raw LESS only — no markdown fences, no prose.
