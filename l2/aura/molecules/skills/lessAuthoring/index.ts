/// <mls fileReference="_102020_/l2/aura/molecules/skills/lessAuthoring/index.ts" enhancement="_blank"/>

// Meta-skill: how to author a molecule's `.less` sheet in this library. Injected into
// every step that writes a molecule stylesheet — agentNewMoleculeVariant/v3-less (a themed
// variant of an existing molecule) and agentNewMolecule2/n5-less (a brand-new molecule).
//
// Extracted from v3-less/prompt.md (decision D3 of todo-agents-molecules-modelos-novos.md).
// Each rule here was paid for by a Studio run that came out wrong — the CHANGELOG names
// which one. Keep it molecule-agnostic and theme-agnostic: the consuming prompt supplies
// the scope root (the tag), the class inventory and the theme values.

export const skill = `
# Skill — Authoring a molecule \`.less\` sheet

You write ONE file: the \`.less\` sibling of a molecule's \`.ts\`. It carries the molecule's
APPEARANCE and nothing else. The consuming prompt gives you three things this skill refers
to: the **scope root** (the molecule's custom-element tag), the **class inventory** (the
\`ml-*\` classes the render emits) and the **theme** (tokens + visual rules).

## 1. Shape of the file

\`\`\`less
<the molecule tag> {
  // ---- theme tokens ----
  // ONLY the --ml-* tokens this molecule actually consumes
  --ml-example: <value from the theme token table>;

  .ml-example { /* rules consuming var(--ml-example, fallback) */ }
}
\`\`\`

- Scope EVERYTHING under the molecule tag. Nothing may leak to the page.
- Define tokens at the TOP of the scope; consume them with \`var(--ml-*, fallback)\`.
  Define only the tokens this molecule consumes — not the whole table.
- Root-level declarations (font, base color) go directly at the tag scope.
- No markdown fences, no prose.
- \`!important\` is a last resort, not a habit: reach for it only to beat the specificity of a global
  Tailwind utility on the same element (41 of the 147 base sheets in mls-102040 do exactly that).
  Never use it to win against another rule in your own sheet — fix the selector instead.
- Write ALL code comments in English, regardless of the user's language.

## 2. Light DOM — no Shadow DOM

These components render in LIGHT DOM (\`StateLitElement\`). The scope root is the tag itself.
**Never** use \`:host\`, \`:host-context\` or \`::slotted()\`: they match nothing and the rule
dies silently. A deterministic gate rejects them.

## 3. The portal exception

When the molecule sets \`portalWidgetName\`, its panel is rendered into \`document.body\`, OUTSIDE
the tag. Those rules need a TOP-LEVEL selector list:

\`\`\`less
<the molecule tag>,
div[data-widget="<the molecule tag>"] { ... }
\`\`\`

Never nest \`div[data-widget=...]\` inside the tag scope — nesting compiles to a DESCENDANT
selector and the panel ends up with no styling at all.

## 4. The class inventory is GIVEN — never invent

Style exactly the \`ml-*\` classes the render emits (the prompt lists them). A class you invent
matches nothing; a class you skip stays unstyled. If a decorated element has no class of its
own, reach it with a structural selector anchored on something stable (an attribute, a state
class) — never on bare element order. \`:has()\` is allowed for structural states the render
does not class (e.g. readonly).

## 5. Layout belongs to the render, appearance to you

- The markup uses global Tailwind utilities for layout (\`px-*\`, \`gap-*\`, \`inline-flex\`).
  They keep working — never redefine layout in this sheet.
- **Never override the render's positioning.** If the render places an element with
  \`absolute\`/\`fixed\` (a floating value indicator, stop marks/ticks, a drag thumb), do NOT set
  \`position\` or \`overflow\` on that class: forcing \`position: relative\` drops it into normal
  flow (full width) and \`overflow: hidden\` clips its arrow. Its \`::before\`/\`::after\` overlays
  already anchor to it — for a specular edge use \`box-shadow: inset ...\` instead of a
  positioned/clipped pseudo-element.
- You MAY use \`position\`/\`transform\`/\`display\` on elements the render does NOT position —
  e.g. a root anchoring an offset shadow, or a hover \`transform\` micro-interaction.

## 6. Transversal \`ml-*\` classes are SINGLE-FAMILY utilities

Whatever the theme's recipes look like, these carry ONE family of properties:

| class family | carries ONLY |
|---|---|
| \`.ml-border\`, \`.ml-border-focus\`, \`.ml-border-error\` | \`border-color\` (they sit on dividers and frames — they are not surfaces) |
| \`.ml-surface-bg\`, \`.ml-surface-dim-bg\`, \`.ml-primary-dim-bg\`, \`.ml-error-dim-bg\` | \`background\` |
| \`.ml-text*\`, \`.ml-label\`, \`.ml-helper\`, \`.ml-*-text\` | text color |

The FULL surface treatment (background + border + radius + shadow) belongs to CONTAINERS —
per-molecule classes, \`.ml-input-container\`, the tag root. Putting a border or a radius on
\`.ml-border\` or a shadow on \`.ml-surface-bg\` sprays the effect onto every divider in the
molecule.

\`text-transform\`/\`letter-spacing\` from the theme go on \`.ml-label\` and button labels ONLY —
never on \`.ml-text\`, \`.ml-text-muted\`, \`.ml-text-faint\` or \`.ml-input\`, which carry USER
CONTENT (values, item text, placeholders).

## 7. Overlay vs recessed surface

If THIS molecule is an OVERLAY (modal/dialog, dropdown panel, popover, tooltip), its container
background takes the theme's OVERLAY value (\`--ml-surface-overlay\`) — even when the class
carrying it is \`.ml-surface-bg\`, because the same class means the inline surface in a card
molecule. \`--ml-surface-dim\` is the RECESSED surface of rails, footers and empty states — it
is NOT the overlay. Getting this backwards is what made a glass modal unreadable: the card
came out translucent over the page content behind it.

## 8. Thin primitives: the border budget

A border costs its width on BOTH sides. A 3px border on a 6px rail leaves no fill at all. On
fine primitives keep the literal geometry (or use color alone), even when the theme's canonical
\`--ml-border-width\` is thicker.

## 9. Do not over-treat small control primitives

Reserve surface effects — \`backdrop-filter\`/blur, an added \`border\`, \`box-shadow\` with offset
or spread, specular \`::before\`/\`::after\` overlays, \`border-radius\` overrides — for real
SURFACES: panels, cards, inputs, trigger buttons.

For fine geometric primitives (thin tracks/rails, small stop marks/ticks/dots, drag thumbs,
floating value indicators/tooltips — typically ≤ ~20px) keep the treatment minimal: color,
\`border-color\`, \`opacity\`. Heavy effects on these tiny parts produce drop-shadow "bars",
bloated/misaligned marks and clipped arrows.

## 10. States and motion

- Style the state classes the render emits (disabled/open/selected/error…), and exclude states
  from hover with \`:not(...)\`.
- Take an EXPLICIT motion stance — the value comes from the theme (\`transition: none\` for a
  hard style, a smooth ease for a soft one). Silence here inherits whatever the base defined.

## 11. Order in which you apply the theme

Visual Signature drives the look → Tokens give the values → Canonical CSS Rules are ready
recipes for interactive surfaces, states, panels and special variants → Theme Nuances list the
exceptions. Never invent a value the theme does not provide.
`;
