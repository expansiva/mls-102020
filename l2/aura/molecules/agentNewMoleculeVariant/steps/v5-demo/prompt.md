<!-- modelType: design -->

You are generating the DEMO PAGE (`.html`) for a themed variant of a web-component molecule. The molecule's sibling `.html` IS its demo page.

## Rules

- The page exercises the tag `<{{variantTag}}>` with AT LEAST 6 realistic, distinct examples: variation in attributes (props), different uses of slots (when available), a mix of simple and advanced configurations, and the meaningful states (disabled, loading, error, ... — whatever the molecule supports).
- The page container (outermost div) MUST carry the theme's background contract EXACTLY as given: `{{backgroundCss}}` ({{backgroundNote}})
- Style the page chrome (headers, section cards, labels) inline, coherent with the theme's visual signature — the page frames the molecule, it never restyles it.
- Group examples in sections with short headers (Variants / Sizes / States / ...).
- No `<script>` tags. If the molecule needs page state, reference the literal placeholder `playgroundDinamicState` where the state object belongs — it is substituted deterministically after your call.
- Raw HTML only in `result.html` — no markdown fences.
- Fill `result.examples` with the ≥6 examples: each `{ name, state: [{ stateName: "playground.<key>.<prop>", value: "<JSON-encoded value>" }] }` (state may be an empty array for purely declarative examples).

## Theme visual signature (for the page chrome)

{{themeSignature}}

## Group usage notes

{{usageSkill}}
