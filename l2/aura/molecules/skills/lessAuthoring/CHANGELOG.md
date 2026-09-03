# skills/lessAuthoring — CHANGELOG

## 2026-07-29 — created (decision D3 / Q6)

Extracted from `agentNewMoleculeVariant/steps/v3-less/prompt.md`, which was the only home of
these rules. `agentNewMolecule2/n5-less` needs the same ones, and duplicated prose diverges: the
next fix would land in one copy. `v3-less` was migrated in the SAME batch (Q6) — a shared skill
with one consumer is a future divergence.

Origin of each section (every rule was paid for by a Studio run that came out wrong):

| section | came from |
|---|---|
| 1. Shape of the file | v3-less structure block + `!important` ban (T5 family) |
| 2. Light DOM | T20 — `:host`/`::slotted` rules died silently; gate `shadow_dom_selector` |
| 3. Portal exception | measured on real 102054/102055 variants: nesting `div[data-widget]` compiles to a descendant selector and the panel loses all styling |
| 4. Inventory is given | T1 — invented classes; `refactor`-style structural selectors for gaps |
| 5. Layout belongs to the render | T10/T11/T12 — the range-slider bug: overriding render positioning dropped the rail into normal flow and clipped the indicator arrow |
| 6. Single-family utilities | T22 — the transversal table measured over the 175 base stylesheets of mls-102040 |
| 7. Overlay vs recessed | T16/T17 — a glass modal came out translucent over page content (`--ml-surface-overlay` vs `--ml-surface-dim`); gate `overlay_contrast` |
| 8. Border budget | T13 — a 3px border on a 6px rail left no fill |
| 9. Small primitives | T13/T17 — "glassified" ticks produced drop-shadow bars and misaligned marks |
| 10. States and motion | v3-less motion stance + `:not()` on hover |
| 11. Theme order | v3-less "apply the theme skill sections in order" |

**Deliberately NOT extracted** (Variant-only, there is no origin sheet when creating a molecule):

- Strategy D framing ("your sheet is a complete sheet, not a delta").
- The origin `.less` per-class property SCOPE.
- REPRODUCE the origin layout declarations (gate `geometry_dropped`, T11).
- The origin class inventory listing and the matching theme example section.

## 2026-07-29 — `!important` rule corrected by measurement

The first version of section 1 banned `!important` outright, carried over from the Variant's prompt.
Measured over the 147 base `.less` sheets of mls-102040: **41 of them use it** (28%). It is a pattern,
not a defect — it is how a base sheet beats the specificity of a global Tailwind utility on the same
element. The rule now says "last resort, only against a global utility; never to win against your own
sheet". Same class of correction as T5 in the theme skill: an asserted rule the library contradicted.

Other calibration numbers from the same measurement, used by the `n5-less` gate:

| fact | measured |
|---|---|
| base sheets that DEFINE `--ml-*` tokens | **0 / 147** — they only consume them, so requiring definitions is a THEMED-sheet rule |
| base sheets that consume `var(--ml-…)` | 146 / 147 |
| base sheets with a `transition` | 51 / 147 — an explicit motion stance is a THEMED-sheet rule |
| base sheets with a colour literal OUTSIDE `var(--ml-…, fallback)` | 10 / 147, almost all the same hardcoded red focus ring — a genuine defect, so the gate rejects it |
| base sheets with a universal selector | 1 / 147 — the ban stands (T3) |
| base sheets with `:host` | 0 / 147 — the ban stands (T20) |
