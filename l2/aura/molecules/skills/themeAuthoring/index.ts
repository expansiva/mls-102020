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
canonical rules. There is **no Shadow DOM** here (the components render in light DOM), so
the scope root is the TAG itself — \`my-molecule-tag { ... }\`. Never write \`:host\`,
\`:host-context\` or \`::slotted()\` in a recipe: those selectors match nothing in light DOM,
so a rule written with them is silently dead. Put root-level declarations (font, base color)
directly at the tag scope. Key consequence: the theme expresses APPEARANCE as tokens + CSS recipes;
the GEOMETRY (position, size, flex/grid, spacing) is owned by the molecule's inherited
render (global Tailwind utilities) and must never be redefined by the theme.

## The class vocabulary is GIVEN — never invent class names

The \`ml-*\` classes come from the molecule library's renders. A deterministic gate rejects
any \`ml-*\` class the molecule does not actually emit, so a recipe written against an
invented name is dead weight at best and a wasted generation attempt at worst.

**Do NOT invent generic names** like \`.ml-surface\`, \`.ml-primary\`, \`.ml-overlay\`,
\`.ml-scrim\`, \`.ml-track\`, \`.ml-thumb\`, \`.ml-flat\`, \`.ml-selected\`, \`.ml-open\`,
\`.ml-btn-label\` — none of those exist.

Two real families:

1. **Transversal classes** — they appear across the whole library, and each one is a
   SINGLE-FAMILY UTILITY: it colors one thing. This is measured, not opinion (the base
   stylesheets of 175 molecules declare exactly these property families). The right column is
   the ONLY thing a theme may set on that class:

   | Class | What it is | The theme sets |
   |---|---|---|
   | \`.ml-text\` | primary text, INCLUDING user content (values, item text, card content) | \`color\`, font family |
   | \`.ml-text-muted\` / \`.ml-text-faint\` | secondary / tertiary text | \`color\`, font family |
   | \`.ml-label\` | field and control LABELS (never user content) | \`color\`, font family/weight, casing (see rule 8) |
   | \`.ml-helper\` | helper / hint text under a field | \`color\`, font family |
   | \`.ml-error-text\` / \`.ml-success-text\` / \`.ml-warning-text\` | feedback text | \`color\`, font family |
   | \`.ml-primary-text\` | text painted in the brand color | \`color\`, font family |
   | \`.ml-border\` | the DEFAULT BORDER COLOR of whatever carries it — dividers, image frames, containers. NOT a surface. | \`border-color\` only |
   | \`.ml-border-focus\` / \`.ml-border-error\` | border color in the focus / error state | \`border-color\` only |
   | \`.ml-focus-ring\` | the focus ring itself | \`box-shadow\` (or \`outline\`) |
   | \`.ml-surface-bg\` / \`.ml-surface-dim-bg\` | the BACKGROUND of a container | \`background\` only |
   | \`.ml-primary-bg\` | filled brand background | \`background\` + \`color\` |
   | \`.ml-primary-dim-bg\` / \`.ml-error-dim-bg\` | a TINTED background (avatar circles, progress fills, badges) | \`background\` only |
   | \`.ml-input\` | the input element itself | background, \`color\`, \`border-color\`, font, transition |
   | \`.ml-disabled\` | the disabled state | \`opacity\`, \`cursor\`, \`pointer-events\` (+ neutralizing shadow/transform) |
   | \`.ml-skeleton\` | loading placeholder | \`background\`, \`animation\` (mind rule 3: it lands on thin elements too) |
   | \`.ml-spinner\` | the loading ring | \`border-color\`, \`border-top-color\` |

   Consequences, all three of which have already gone wrong once: \`.ml-border\` is NOT an
   overlay (giving it a background + shadow repaints every divider and frame);
   \`.ml-primary-dim-bg\` is NOT a ghost-button variant (it is a tint, and it lands on 8px
   progress bars); \`.ml-text\` is NOT a label (see rule 8).

2. **Per-molecule classes**, shaped \`ml-<thing>-<part>[-state]\`: \`.ml-select-trigger\`,
   \`.ml-select-panel\`, \`.ml-select-trigger-open\`, \`.ml-select-item-selected\`,
   \`.ml-slider-track\`, \`.ml-slider-thumb\`, \`.ml-slider-mark\`, \`.ml-calendar-nav\`,
   \`.ml-dial-track\`. You cannot know every one of them, and you must not guess.

**SURFACES ARE CONTAINERS, and containers are family 2** (plus \`.ml-input-container\` and the
tag root). Only a container may receive the full surface treatment — background + border +
radius + shadow together. A transversal utility never does: it contributes its one family to
whatever element happens to carry it, and you cannot know what that element is.

So write each canonical rule by the **ROLE of the element**, naming real classes only as
examples: "Interactive surface (\`.ml-select-trigger\`, \`.ml-input-container\`, button roots):
then the declarations". The molecule agent maps the role onto whatever classes that molecule
really emits. A recipe that reads like a role + declarations is portable; one that reads
like a stylesheet for made-up selectors is not.

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
Theme extras (add only if the style needs them): focus ring — EITHER the shorthand
\`--ml-outline-focus\` OR the pair \`--ml-focus-ring-width\` + \`--ml-focus-ring-color\`, never
both; \`--ml-outline-error\` (only if the error border differs from \`--ml-error\`);
\`--ml-backdrop-blur\`, \`--ml-backdrop-blur-strong\`, \`--ml-text-transform\`,
\`--ml-letter-spacing\`; \`--ml-surface-hover\` (a distinct hover background, if the style has one).
Molecules define ONLY the tokens they consume and always read them as \`var(--ml-x, <fallback>)\`
where the fallback equals the canonical value — so name and value must be self-consistent.

**ONE mechanism per concern.** The Tokens table is the VOCABULARY the molecules consume, so a
token that no recipe of yours mentions is perfectly fine — that is how the validated themes
work. What is NOT fine is declaring two competing ways to express the same thing (a shorthand
AND its parts) and then writing the recipe with only one of them: the other is ambiguity the
molecule agent has to guess about. Choose one, and let the recipe that consumes it be the
proof of the choice.

## Authoring RULES (hard — each comes from a real defect we fixed)

0. **Two kinds of geometry — override neither, but REPRODUCE one.** A molecule's layout has
   two sources, and they must be treated in opposite ways:
   - what the RENDER provides (global Tailwind utilities in the markup: \`absolute\`,
     \`top-1/2\`, \`-translate-y-1/2\`, \`flex\`, \`gap-2\`) applies to the variant too → never
     redefine it (rule 1);
   - what the ORIGIN STYLESHEET provides (\`position\`, \`top/right/bottom/left\`,
     \`width\`/\`height\`, \`transform\` written on an \`ml-*\` class in the base \`.less\`) does
     NOT apply to the variant: the base sheet is scoped to the BASE tag and never reaches
     the variant's tag → it MUST be reproduced verbatim, and only the appearance around it
     changes.

   Getting this backwards is not cosmetic: a slider whose rail was \`position: absolute;
   top: 50%; height: 6px; transform: translateY(-50%)\` in the base sheet, restyled with
   color and border ALONE, dropped into normal flow at the top of the track — while the
   handles, positioned by the render, stayed centered. The rail and its handles ended up in
   different places. A deterministic gate now rejects the variant sheet for it, so say this
   in the theme too: appearance is yours, the origin's layout declarations are furniture you
   carry over.

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
   value) plus, for modals, a dimmed veil. INLINE surfaces may be translucent if the style
   calls for it (e.g. glass over a dark backdrop). State this split explicitly in the Visual
   Signature "Background" row and in the "Overlay surfaces" canonical rule.

   **The modal veil has ONE working anchor.** The modal render emits its veil as
   \`<div class="absolute inset-0 ml-surface-bg/40" aria-hidden="true">\`. That
   \`ml-surface-bg/40\` is a DEAD token: Tailwind is not configured with \`ml-*\` colors, and
   the \`/40\` suffix means the element never matches a \`.ml-surface-bg\` selector — styling
   \`.ml-surface-bg\` dims the panel, not the veil (this shipped as a real bug: an unreadable
   modal). The stable anchor is the veil being the only \`aria-hidden\` element:

   \`\`\`less
   div[aria-hidden='true'] { background: rgba(0, 0, 0, 0.7); }   // veil
   \`\`\`

   Write the veil recipe with that selector and say why. Never invent \`.ml-scrim\`.

   **Overlay background must differ from the PAGE background.** A panel/dropdown/modal
   painted the same color as \`themeInfo.background.css\` has no hierarchy — only its border
   separates it from the page, and the user reads it as part of the page. Pick a visibly
   distinct step (a lighter/darker shade, or plain white/near-black), and check your own
   palette: if \`--ml-surface-dim\` equals the page color, the choice is wrong, however
   elegant the rationale sounds. A gate compares the two.

   Keep the token ROLES apart while you are at it: \`--ml-surface\` = inline surface,
   \`--ml-surface-dim\` = OVERLAY surface. If the style also wants a distinct hover
   background, that is a separate theme extra (e.g. \`--ml-surface-hover\`) — do not overload
   \`--ml-surface-dim\` with it, or overlays and hover states drift into the same value.

3. **Control primitives vs surfaces.** Do NOT apply heavy surface effects (blur, an added
   border, offset/spread box-shadow, specular \`::before\`) to tiny geometric primitives —
   thin tracks/rails, small marks/ticks/dots, drag thumbs, floating indicators (≈≤20px).
   Keep those to color / border-color / opacity. Reserve rich effects for real surfaces
   (cards, panels, inputs, trigger buttons).

   **Border budget.** A border costs its width on BOTH sides. On a 6px rail the canonical
   \`--ml-border-width: 3px\` leaves zero fill — the primitive becomes solid border. So when
   the origin gives a thin primitive a border, the ORIGIN's width wins inside that
   molecule's scope (keep its literal, or drop the border and use color alone); never let a
   token swallow the element. State this as a nuance, and give the canonical border width a
   thickness the theme's real SURFACES want, not one every primitive must inherit.

4. **Comments in English.** All comments/prose inside the generated \`theme.ts\` are in English.

5. **Explicit motion stance, never a universal selector.** State it (a \`--ml-transition\`
   value, or \`transition: none\`); the molecule base defines transitions, so the theme must
   take a position. But apply that stance ON THE ELEMENTS YOUR RECIPES NAME — never write
   \`* { transition: ... }\`. A universal selector wipes animation the molecule INHERITS from
   its base and leaks outside the component scope; a molecule sheet is rejected for it.

   If your style is anti-smooth, do not kill the inherited SVG spinner — make its rotation
   match the style instead (validated technique):

   \`\`\`less
   .animate-spin { animation-timing-function: steps(8); }   // mechanical, not disabled
   \`\`\`

6. **States.** Provide recipes for the state classes molecules emit — disabled, open,
   selected, error — and exclude states from hover with \`:not(.ml-disabled)\` etc.

7. **Flat variants** (link/ghost buttons): neutralize the surface — no shadow, no border,
   no background, no specular edge.

8. **Casing / \`text-transform\`.** If the style uppercases (or otherwise transforms) text,
   it goes on \`.ml-label\` and on button labels — and NOWHERE else. Name those classes in the
   recipe and stop there. In particular NEVER on \`.ml-text\`, \`.ml-text-muted\`,
   \`.ml-text-faint\` or \`.ml-input\`: those carry user content (field values, item text, card
   content, placeholders), and uppercasing a person's data is a defect, not a style. The same
   goes for \`letter-spacing\` when it travels with the casing. A rule that lists
   \`.ml-label, .ml-text\` together is the exact mistake to avoid.

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
