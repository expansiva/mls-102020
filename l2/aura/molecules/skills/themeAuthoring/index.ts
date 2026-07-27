/// <mls fileReference="_102020_/l2/aura/molecules/skills/themeAuthoring/index.ts" enhancement="_blank"/>

// Meta-skill: how to author a project theme file (l2/skills/theme.ts, contract v1).
// Injected into the New Theme generation step (and, later, Improve Theme). It teaches
// the TARGET artifact + the good-authoring rules distilled from the agentNewMoleculeVariant
// acceptance tests (P3–P10). It is theme-agnostic: it must produce a good theme for ANY
// style (glass, brutal, neumorphic, a brand look, ...), not a specific one.

export const skill = `
# Skill — Authoring a project theme (\`l2/skills/theme.ts\`, contract v1)

You write ONE file: \`l2/skills/theme.ts\`. It is pure DATA + STYLING RULES that other
agents consume — it never contains procedure, never references other files, and never
touches layout/geometry.

## Who consumes it (why the shape matters)

The molecule agents (New Molecule / New Molecule Variant / Improve Molecule) read this
file and, for EACH molecule, generate a \`.less\` scoped under the molecule's custom-element
tag that styles the molecule's semantic \`ml-*\` classes using THIS theme's tokens and
canonical rules. Key consequence: the theme expresses APPEARANCE as tokens + CSS recipes;
the GEOMETRY (position, size, flex/grid, spacing) is owned by the molecule's inherited
render (global Tailwind utilities) and must never be redefined by the theme.

## Required exports (a deterministic validator rejects anything off — matches vTheme.validateVThemeModule)

\`\`\`ts
export const themeInfo = {
  name: '<kebab, e.g. glass>',            // short id
  suffix: '-<kebab>',                      // MUST start with '-'; unique per project; becomes the molecule filename/tag suffix
  displayName: '<Human Name>',
  description: '<one line: the visual system in a sentence>',
  background: {
    kind: 'light' | 'dark' | 'image',
    css: '<the page background CSS, e.g. "background: #f5f5f5;" or a gradient>',
    note: '<the backdrop contract: what the surfaces assume behind them, and the text color stance>',
  },
};
export const skill = /* a template string carrying the 4-section markdown below */;
export const examples = [];               // start EMPTY (pilot); reference molecules are registered later after visual approval
\`\`\`

## The \`skill\` string — EXACTLY these sections, in order

- \`## 1. Visual Signature\` (MANDATORY) — a compact table naming the look. Rows:
  Background, Border, Radius, Shadow, Blur (or "none"), Font, Transition, Extras,
  and a "Background contract" row. Distinguish INLINE surfaces from OVERLAY surfaces
  in the Background row (see rule 2).
- \`## 2. Tokens\` (MANDATORY) — a \`| Token | value | Role |\` table over the canonical
  \`--ml-*\` vocabulary (below). Give a concrete value per token in this theme.
- \`## 3. Canonical CSS Rules\` (MANDATORY) — ready-to-apply recipes the per-molecule
  \`.less\` will follow: interactive surface, OVERLAY surfaces, states, flat variants,
  motion stance, and any signature technique. Recipes consume \`var(--ml-*, fallback)\`.
- \`## 4. Theme Nuances\` (optional) — exceptions, per-molecule alphas, migration precedence.

## Canonical \`--ml-*\` token vocabulary (name them; molecules consume these)

Typography: \`--ml-font-family\`, \`--ml-font-weight-medium\`.
Shape: \`--ml-radius-sm\`, \`--ml-radius-md\`, \`--ml-radius-lg\`, \`--ml-border-width\`.
Color/surface: \`--ml-primary\`, \`--ml-on-primary\`, \`--ml-surface\` (inline field/secondary bg),
\`--ml-surface-dim\` (OVERLAY bg — modal/dropdown/popover/tooltip/panel), \`--ml-on-surface\`
(primary text), \`--ml-on-surface-muted\` (secondary text), \`--ml-outline-variant\` (default border),
\`--ml-error\` (feedback).
Depth/motion: \`--ml-shadow-1\` (resting), \`--ml-shadow-2\` (hover), \`--ml-transition\`,
\`--ml-disabled-opacity\`.
Theme extras (add only if the style needs them): \`--ml-outline-focus\`, \`--ml-outline-error\`,
\`--ml-focus-ring-width\`, \`--ml-focus-ring-color\`, \`--ml-backdrop-blur\`, \`--ml-backdrop-blur-strong\`,
\`--ml-text-transform\`, \`--ml-letter-spacing\`.
Molecules define ONLY the tokens they consume and always read them as \`var(--ml-x, <fallback>)\`
where the fallback equals the canonical value — so name and value must be self-consistent.

## Authoring RULES (hard — each comes from a real defect we fixed)

1. **Geometry is the render's, not the theme's.** Style appearance only. NEVER set
   \`position\`/\`overflow\` (and avoid \`transform\`) on an element the render positions
   \`absolute\`/\`fixed\` (floating value indicators, stop marks/ticks, drag thumbs) — forcing
   \`position: relative\` drops it into normal flow (full width) and \`overflow: hidden\` clips
   its arrows. \`position\`/\`transform\`/\`display\` ARE fine on elements the render does NOT
   position (e.g. a button root anchoring an offset shadow, or a hover micro-interaction).
   Achieve specular/light edges with \`::before\` (\`border-radius: inherit\`) or \`inset\` box-shadow,
   never by forcing the host's position/overflow.

2. **Overlay surfaces vs inline surfaces.** Any floating container shown OVER page content —
   modal/dialog, dropdown, popover, tooltip, panel — MUST stay readable regardless of what is
   behind it: give it an OPAQUE/high-contrast \`--ml-surface-dim\` (not a faint translucent
   value) plus, for modals, a dimmed scrim. INLINE surfaces may be translucent if the style
   calls for it (e.g. glass over a dark backdrop). State this split explicitly in the Visual
   Signature "Background" row and in the "Overlay surfaces" canonical rule.

3. **Control primitives vs surfaces.** Do NOT apply heavy surface effects (blur, an added
   border, offset/spread box-shadow, specular \`::before\`) to tiny geometric primitives —
   thin tracks/rails, small marks/ticks/dots, drag thumbs, floating indicators (≈≤20px).
   Keep those to color / border-color / opacity. Reserve rich effects for real surfaces
   (cards, panels, inputs, trigger buttons).

4. **Comments in English.** All comments/prose inside the generated \`theme.ts\` are in English.

5. **Explicit motion stance.** State it (a \`--ml-transition\` value, or \`transition: none\`);
   the molecule base defines transitions, so the theme must take a position.

6. **States.** Provide recipes for the state classes molecules emit — disabled, open,
   selected, error — and exclude states from hover with \`:not(.ml-disabled)\` etc.

7. **Flat variants** (link/ghost buttons): neutralize the surface — no shadow, no border,
   no background, no specular edge.

8. **Casing / \`text-transform\`.** If the style uppercases (or otherwise transforms) text,
   apply it to labels/buttons ONLY — never to user content (input values, item text,
   placeholders that echo user data).

9. **Self-contained.** No "go read file X"; no migration/procedure mechanics (those live in
   the molecule agents). Just the visual system: signature, tokens, recipes, nuances.

## Deriving the theme from the request + clarification answers

Map the inputs to the artifact:
- background kind + page CSS + text stance → \`themeInfo.background\` + the "Background contract".
- palette (primary/accent, surfaces, on-surface text, error) → the color tokens.
- corner style (sharp/rounded/pill) → \`--ml-radius-*\`.
- border style (thickness/color) → \`--ml-border-width\`, \`--ml-outline-variant\`.
- shadow style (soft/hard-offset/none) → \`--ml-shadow-1/2\` + Shadow row.
- motion (smooth/instant/none) → \`--ml-transition\` + Motion stance.
- typography → \`--ml-font-family\`, weight, optional \`--ml-text-transform\`/\`--ml-letter-spacing\`.
Then write Canonical CSS Rules that honor rules 1–9 for THIS style.

## Reference themes (study for format + range, do not copy verbatim)

Two validated themes exist and span the space: a DARK, translucent, blurred style with a
specular edge and opaque overlays; and a LIGHT, fully opaque style with hard edges, offset
solid shadows, a kinetic hover, and uppercase labels. They show the format of all four
sections and the two ends of light×dark and opaque×translucent. Match the FORMAT, invent the
VALUES for the requested style.
`;
