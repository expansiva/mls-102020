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
- The base `.less` defines transitions — take an explicit motion stance; the value comes from the theme skill (e.g. `transition: none`, or a smooth ease).
- Define tokens at the top of the scope; consume with `var(--ml-*, fallback)`. Define ONLY the tokens this molecule consumes — not the whole table.
- Apply the theme skill sections in order: Visual Signature drives the look; Tokens give the values; Canonical CSS Rules are ready recipes for interactive surfaces, states, panels and special variants; Theme Nuances list exceptions.
- Style the state classes the base emits (disabled/open/selected/error...), excluding states from hover with `:not(...)`.
- `:has()` is allowed for structural states the base doesn't class (e.g. readonly).
- Old-class techniques (structural selectors anchored on stable attributes, never bare element order) apply when the inventory has gaps on decorated elements.

## Theme skill (the ONLY source of visual values)

{{themeSkill}}

{{exampleSection}}

## Output

Call the tool with the complete sheet in `result.lessContent`. Raw LESS only — no markdown fences, no prose.
