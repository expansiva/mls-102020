# n5-less

Writes the molecule's `.less`, consuming the SHARED `skills/lessAuthoring` (decision D3) — the same
skill the Variant's `v3-less` uses, so a rule fixed once applies to both paths.

## Two modes, because the two validated corpora are different

| | no theme (NEUTRAL) | with a theme (THEMED) |
|---|---|---|
| what the sheet is | a BASE sheet a future theme must be able to override | the molecule's final appearance in that theme |
| appearance values | always `var(--ml-token, <literal fallback>)` | the theme's literal values are fine |
| defines `--ml-*` tokens | no | **yes**, with the theme's values |
| motion stance | not required | **required** (`transition: none` counts) |
| gate codes | `color_literal`, `token_consumption` | `tokens`, `motion` |

Both modes share: one correct header, balanced braces, tag scope, the portal rule, the class-inventory
subset check, no redefined Tailwind layout utility, no override of render-owned positioning, no Shadow
DOM selector, no universal selector.

## Why the split — measured, not assumed

Against the **147 neutral base sheets of mls-102040**:

| fact | measured | consequence |
|---|---|---|
| sheets that DEFINE `--ml-*` tokens | **0 / 147** | requiring definitions would fail every neutral molecule → THEMED-only rule |
| sheets that CONSUME `var(--ml-…)` | 146 / 147 | `token_consumption` is the neutral discipline |
| sheets with a `transition` | 51 / 147 | an explicit motion stance is a THEMED-only rule |
| colour literal outside a token | 10 / 147 | almost all the same hardcoded red focus ring — a defect, so rejected in neutral mode |
| `!important` | 41 / 147 | a PATTERN (beating a global Tailwind utility), **not** a gate code |
| universal selector / `:host` | 1 / 147 and 0 / 147 | both bans stand |

Against the **84 validated themed sheets of mls-102054 / mls-102055**:

| check | would fail | verdict |
|---|---|---|
| `color_literal` | **84 / 84** | the rule is WRONG for themed sheets — a themed sheet writes `box-shadow: 4px 4px 0 #000000` because those are the theme's values. Applied only in neutral mode. |
| `universal_selector`, `shadow_dom_selector` | 0 / 84 | bans stand |
| `tokens`, `motion` | 2 / 84 and 4 / 84 | kept: these are the same two checks the sibling `v3-less` gate already enforces in production |

That last row is the whole reason this gate is split: had I applied one rule set, the themed path would
have rejected every sheet the team already signed off on.

## The `!important` correction

The shared skill's first version banned `!important` outright, inherited from the Variant's prompt.
41 of 147 base sheets use it — to beat the specificity of a global Tailwind utility on the same
element. The skill now calls it a last resort for exactly that case, and there is no gate code. Same
class of correction as T5 in the theme skill: a rule asserted in prose that the library contradicted.

## Artifacts

- `l2/molecules/<group>/<name>.less` (header prepended by code)
- `trace-n5-less-<attempt>.json`, recording whether the run was themed
- the `n5-done` anchor

Retry ≤ 1 with the gate errors in context; a second failure fails the step.
