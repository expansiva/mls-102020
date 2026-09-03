/// <mls fileReference="_102020_/l2/aura/molecules/skills/tokenVocabulary.ts" enhancement="_blank"/>

// Meta-skill: the CLOSED token vocabulary of a BASE molecule `.less` sheet, and the rules
// for using it. Injected into every step that writes or edits a base molecule's appearance —
// agentNewMolecule2/n5-less (NEUTRAL mode) and agentImproveMolecule2/i3-edit.
//
// Does NOT apply to a themed variant (agentNewMoleculeVariant/v3-less, n5-less in THEMED
// mode): there the sheet DEFINES its own `--ml-*` with the theme's values, is self-contained
// and lives under a different tag (`...-brutal`). The two vocabularies coexist by design.
//
// Every rule here came from a measurement, not an opinion. The evidence is recorded in
// todo/moleculetokens/.

export const skill = `
# Skill — The token vocabulary of a base \`.less\` sheet

Every appearance value goes through \`var(<token>, <fallback>)\`. The **token** binds the
molecule to the project's design system; the **fallback** is what it renders when the project
has no design system. Neither is optional.

## 1. There are TWO vocabularies, with different channels

| | design-system role (\`--surface-bg\`) | molecule token (\`--ml-border-width\`) |
|---|---|---|
| who defines it | the client, in \`l2/designSystem.ts\` (via the plugin) | nobody — only the fallback exists |
| night mode | yes, \`_dark-\` twin key | no |
| \`-hover\`/\`-focus\`/\`-disabled\` states | yes | no |
| how the client adjusts it | by theming the project | by overriding the variable in hand-written CSS |

**ALWAYS prefer the design-system role.** Use \`--ml-*\` only for what the design system does
not cover (section 3).

## 2. The design-system roles (closed vocabulary)

Surfaces, from the page forward:
\`page-bg\` · \`surface-bg\` (cards, panels, modals, floating menus) ·
\`surface-alt-bg\` (zebra row, row hover, skeleton, section header) ·
\`input-bg\` (form field background)

Text on a surface, strongest to weakest:
\`text-strong\` · \`text-default\` · \`text-muted\` (secondary and placeholder)

Borders — **there are only these four**:
\`border-default\` (structural border: input, table, card, floating panel) ·
\`border-subtle\` (faint separator) · \`button-secondary-border\` · \`selected-border\`

Actions:
\`button-primary-bg\` + \`button-primary-text\` · \`button-secondary-bg\` +
\`button-secondary-text\` + \`button-secondary-border\` · \`button-danger-bg\` +
\`button-danger-text\` · \`link-text\`

Focus and selection:
\`focus-ring\` (the ring's COLOUR) · \`selected-bg\` + \`selected-text\` + \`selected-border\`

State, always as a \`bg\` + \`text\` pair:
\`status-success-*\` · \`status-error-*\` · \`status-warning-*\` · \`status-info-*\` ·
\`status-neutral-*\`

Navigation and overlay:
\`nav-bg\` + \`nav-text\` · \`nav-active-bg\` + \`nav-active-text\` ·
\`overlay-backdrop-bg\` (the DARK scrim behind a modal) · \`tooltip-bg\` + \`tooltip-text\`

Charts: \`chart-series-1\` … \`chart-series-6\` — **always in this fixed order**. The order IS
the colour-blindness safeguard: never shuffle it, never invent a seventh colour, and never use
\`status-*\` as a series.

Shape, elevation, motion, typography:
\`radius-small\` · \`radius-medium\` · \`radius-large\` · \`radius-pill\` ·
\`shadow-small\` · \`shadow-medium\` ·
\`transition-fast\` · \`transition-normal\` · \`transition-slow\` ·
\`font-family-primary\` · \`font-family-secondary\` ·
\`font-weight-lighter\` · \`font-weight-light\` · \`font-weight-normal\` · \`font-weight-bold\` ·
\`font-weight-bolder\` — **there is no weight 500**; for emphasis use \`font-weight-bold\`.

**Every COLOUR role accepts the \`-hover\`, \`-focus\` and \`-disabled\` variants** —
\`var(--button-primary-bg-hover, …)\`, \`var(--text-muted-disabled, …)\`. Use them instead of
\`filter: brightness()\` when the state is a colour change.

A role outside this list **does not exist**: the \`var()\` falls back forever, silently. A
deterministic checker (\`harness/check-ds-tokens.mjs\`) rejects it as \`DESCONHECIDO\` — that is
how a \`--radius-smal\` (typo of \`radius-small\`) was caught.

## 3. What the design system does NOT cover — that is where \`--ml-*\` belongs

Use exactly these names; the library already shares them:

| missing from the DS | molecule token |
|---|---|
| border width and style | \`--ml-border-width\` (1px), \`--ml-border-style\` (solid) |
| focus-ring thickness (the DS has only the colour) | \`--ml-focus-ring-width\` (2px) |
| disabled opacity (the DS models it as a \`-disabled\` colour) | \`--ml-disabled-opacity\` (0.5) |
| status border — the DS has \`bg\`+\`text\` for all 5 statuses and **no border at all** | \`--ml-outline-error\`, \`--ml-success-border\`, \`--ml-warning-border\`, \`--ml-info-border\` |

If the molecule needs a value neither the design system nor the table above covers — a knob
size, a track height, a spinner duration — **coin a token PREFIXED with the molecule**, as the
library already does: \`--ml-nrs-knob-size\`, \`--ml-spinner-duration\`, \`--ml-gradient-1\`.
Still consumed with a fallback: \`var(--ml-nrs-knob-size, 20px)\`.

## 4. The five rules

1. **Never write a bare colour** (\`color: #1c1b1f\`). A deterministic gate rejects it: nothing
   could ever override it.
2. **Every \`var()\` carries a fallback.** \`var(--surface-bg)\` with no fallback leaves the
   molecule with no background in a project that has no design system.
3. **One role, ONE fallback.** If two places use \`--text-muted\`, the fallback must be the same
   value in both. The checker rejects divergence — that is the defect that left
   \`--ml-surface-variant\` with 6 different values across the library.
4. **A border takes a border role; a background takes a background role; text takes a text
   role.** There are only 4 border roles: if what you want is not there, it is a section-3
   case — do not borrow a text role to paint a border.
5. **Do not define tokens** (\`--ml-x: value\`) in a base sheet. Defining is the theme's job.

## 5. Pick the role by the PLACE, not by the class name

A role's name says **where** it is used. Two different parts of the same molecule may need
different roles even when they come from the same conceptual class:

- the two halves of a split-button are a button → \`button-secondary-bg\`;
  its **floating menu** is not a button → \`surface-bg\` + \`border-default\`;
  the menu **item** → \`surface-bg\`, and the item's hover is a ROW hover → \`surface-alt-bg\`.
- a button's label → \`button-secondary-text\`; a menu item's label → \`text-strong\`.
- button hover → \`button-secondary-bg-hover\`; row hover → \`surface-alt-bg\`.

If the same class shows up in different roles, use a more specific selector. Do not force a
role just because the class happens to be named \`.ml-primary-dim-bg\`.

## 6. Two things the design system does not have

- **A pressed state.** There are \`-hover\`, \`-focus\` and \`-disabled\`, no "active". For
  \`:active\`, keep \`filter: brightness(0.9)\` and write a comment saying why.
- **"Selected AND emphasized."** \`selected-bg\` is a subtle tint (the fill of a selected row).
  For a filled pill that needs the highest visual weight, use \`button-primary-bg\` and comment
  the choice.

## 7. Careful: name collision with Tailwind v4

Tailwind v4 publishes its own theme as custom properties on \`:root\`, and emits only the ones
the page's classes use. Three roles exist in both scales:
**\`font-weight-light\`, \`font-weight-normal\`, \`font-weight-bold\`**.

Consequence: on a page that uses \`font-bold\`, the molecule's \`var(--font-weight-bold, 500)\`
**ignores the fallback** and picks up Tailwind's 700. With a design system this is harmless
(the DS's \`:root\` wins); without one, the fallback is discarded. This is not a reason to avoid
the role — it is a reason not to be surprised.
`;
