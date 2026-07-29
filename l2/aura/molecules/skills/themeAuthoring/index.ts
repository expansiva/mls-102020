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

## How to WRITE a recipe (the format is not optional)

Two shapes, and nothing else. Left to itself the same instruction has produced three different
formats in three runs — one of them dead, one of them harmful — so this is spelled out:

**A transversal utility** → a normal rule, because the class name is real and its family is known:

\`\`\`less
.ml-border { border-color: var(--ml-outline-variant, rgba(255,255,255,0.25)); }
\`\`\`

**A container role** (interactive surface, overlay, button root, flat variant) → a block of
DECLARATIONS WITH NO SELECTOR, introduced by a prose line naming the role and real example
classes. The molecule agent applies the block to whatever class that molecule actually uses.
Write it exactly like this — a bold role, the examples in parentheses, then the declarations:

Overlay surface (\`.ml-select-panel\`, a modal/dialog root, a popover container):

\`\`\`less
background: var(--ml-surface-dim, rgba(30,27,75,0.95));
border: var(--ml-border-width, 1px) solid var(--ml-outline-variant, rgba(255,255,255,0.25));
border-radius: var(--ml-radius-lg, 14px);
box-shadow: var(--ml-shadow-2, 0 6px 24px rgba(0,0,0,0.26));
&:not(.ml-disabled):hover { box-shadow: var(--ml-shadow-1); }
&::before { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
\`\`\`

Nested \`&:hover\`, \`&:focus-visible\`, \`&::before\` and real state classes (\`&.ml-select-item-selected\`)
belong INSIDE such a block — they attach to whatever the block is applied to.

Four things never appear in a recipe:

1. **A commented-out recipe.** \`// border: 3px solid ...\` is not guidance, it is dead text. If
   you cannot name a selector, use the declaration-only form above — that is what it is for.
2. **An invented selector.** Writing \`.ml-dialog, .ml-popover, .ml-tooltip, .ml-panel { ... }\`
   because the role needs a selector produces rules that match nothing (none of those exist).
3. **An element or attribute selector.** \`button\`, \`[role='button']\`, \`[aria-selected]\` are not
   the theme's vocabulary: inside a molecule they hit every icon button, every calendar arrow
   and every clear "x", and \`overflow: hidden\` on those clips focus rings. The theme's
   vocabulary is \`ml-*\` classes and the tag root.
4. **\`!important\`.** If a recipe seems to need it, the previous rule was too broad (see 3) —
   narrow that one instead of escalating this one.

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

## Canonical \`--ml-*\` token vocabulary — and the SHAPE of each value

This table is measured: it lists what the 175 base stylesheets actually read, with the property
each token is read into and how often. **A token's value must have the shape its consumers
expect.** Get that wrong and the declaration is silently dropped by the browser: a theme once
set \`--ml-outline-focus: 0 0 0 3px rgba(...)\` (a box-shadow shorthand) and produced
\`border-color: 0 0 0 3px rgba(...)\` in 102 places — invalid CSS, no focus border anywhere.

| Token | Shape | Read as | Uses |
|---|---|---|---|
| \`--ml-font-family\` | font stack | \`font-family\` | 834 |
| \`--ml-on-surface\` | color | \`color\` (primary text) | 435 |
| \`--ml-on-surface-muted\` | color | \`color\` (secondary text) | 318 |
| \`--ml-surface-dim\` | color | \`background\` of a RECESSED area — slider rails, footers, empty states. NOT the overlay. | 316 |
| \`--ml-primary\` | color | \`color\`, \`background\`, \`border-color\` | 315 |
| \`--ml-outline-variant\` | color | \`border-color\`, and the color slot of a \`border:\` shorthand | 279 |
| \`--ml-surface\` | color | \`background\` of an INLINE surface (fields, cards) | 238 |
| \`--ml-focus-ring-width\` | LENGTH | \`box-shadow: 0 0 0 <width> <color>\` | 165 |
| \`--ml-focus-ring-color\` | color | the color slot of that same ring | 156 |
| \`--ml-font-weight-medium\` | number | \`font-weight\` | 152 |
| \`--ml-disabled-opacity\` | number | \`opacity\` | 150 |
| \`--ml-error\` | color | \`color\` (error TEXT), sometimes \`border-color\` | 147 |
| \`--ml-transition\` | transition value (\`250ms ease\` / \`none\`) | \`transition\` | 143 |
| \`--ml-on-surface-faint\` | color | \`color\`, \`border-color\` (tertiary) | 105 |
| \`--ml-outline-error\` | color | \`border-color\` | 103 |
| \`--ml-outline-focus\` | color | \`border-color\` of a focused field — a COLOR, never a shorthand | 102 |
| \`--ml-border-style\` | keyword (\`solid\`) | the style slot of a \`border:\` shorthand | 98 |
| \`--ml-border-width\` | length | the width slot of a \`border:\` shorthand | 93 |
| \`--ml-on-primary\` | color | \`color\` on a primary fill | 72 |
| \`--ml-radius-sm\` / \`--ml-radius-md\` | length | \`border-radius\` | 55 / 19 |
| \`--ml-shadow-1\` / \`--ml-shadow-2\` | box-shadow value | \`box-shadow\` (resting / hover) | 14 / 14 |
| \`--ml-radius-full\` | length | \`border-radius\` of PILL primitives — a sharp theme sets it to 0 | 10 |
| \`--ml-success\`, \`--ml-warning\` | color | feedback \`color\` | 14 / 6 |
| \`--ml-success-dim\`, \`--ml-warning-dim\`, \`--ml-error-dim\` | color | tinted \`background\` | 7 / 4 / 1 |
| \`--ml-success-border\`, \`--ml-warning-border\`, \`--ml-info-border\` | color | \`border-color\` | 7 / 4 / 4 |
| \`--ml-surface-overlay\` | color | \`background\` of a FLOATING container — this is the overlay one | 1 |

**An undeclared token does not disappear — it falls back to the molecule's literal, and those
literals are LIGHT-theme values** (\`#f5f5f5\`, \`#e2e8f0\`, \`rgba(59,130,246,0.4)\`). On a dark
theme every token you skip becomes a pale patch. Declare the whole table.

The feedback families follow one pattern — \`--ml-<role>\` for text, \`--ml-<role>-dim\` for the
tinted background, \`--ml-<role>-border\` for the border — for error, success, warning and info.

THEME-ONLY extras (no molecule reads them; only your own recipes do, so name them freely):
\`--ml-radius-lg\`, \`--ml-surface-hover\`, \`--ml-backdrop-blur\`, \`--ml-backdrop-blur-strong\`,
\`--ml-text-transform\`, \`--ml-letter-spacing\`.

Molecules read every token as \`var(--ml-x, <fallback>)\` where the fallback equals the canonical
value — so name and value must be self-consistent.

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
   Specular/light edges go on a \`::before\` (\`position: absolute; inset: 0;
   border-radius: inherit; pointer-events: none\`) or on an \`inset\` box-shadow. That pseudo-element
   needs a positioned host, and \`position: relative\` on a surface the render does NOT position is
   legitimate — put it in the recipe. What is forbidden is touching \`position\`/\`overflow\` on an
   element the render already positions.

2. **Overlay surfaces vs inline surfaces.** Any floating container shown OVER page content —
   modal/dialog, dropdown, popover, tooltip, panel — MUST stay readable regardless of what is
   behind it: give it an OPAQUE/high-contrast \`--ml-surface-overlay\` (not a faint translucent
   value) plus, for modals, a dimmed veil. INLINE surfaces (\`--ml-surface\`) may be translucent
   if the style calls for it (e.g. glass over a dark backdrop), and \`--ml-surface-dim\` is a
   THIRD thing — the recessed background of rails, footers and empty states, which molecules
   read 316 times and which must NOT carry the overlay value or every slider rail turns into a
   panel. State the split explicitly in the Visual Signature "Background" row and in the
   "Overlay surfaces" canonical rule.

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

   **A token alone does NOT express the split — say it per molecule.** Two measured facts: the
   modal's card carries \`.ml-surface-bg\` (the same class inline cards use), and the dropdown's
   base sheet paints \`.ml-select-panel\` with \`var(--ml-surface, ...)\`. So declaring an overlay
   token and hoping overlays pick it up silently fails — the overlay ends up with the INLINE
   value, which is exactly how a glass modal became unreadable. State the rule explicitly in the
   theme: **in a molecule that IS an overlay** (modal/dialog, dropdown panel, popover, tooltip),
   the container's background takes \`--ml-surface-overlay\` **whatever class carries it**,
   including \`.ml-surface-bg\` and \`.ml-select-panel\`. Elsewhere the same class keeps the inline
   value. Without that sentence a translucent theme reintroduces the bug.

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

   \`--ml-transition\` is a TRANSITION shorthand (\`250ms ease\`, or \`none\`) — never plug it into an
   \`animation\`. \`animation: shimmer 1.6s var(--ml-transition) infinite\` expands to a 250ms DELAY
   plus \`ease\`, which is not what you meant; animations declare their own duration and easing.

   And if you NAME an animation, ship its \`@keyframes\` in the same recipe. \`animation: ml-shimmer
   1.6s linear infinite\` with no \`@keyframes ml-shimmer\` anywhere is a no-op — a theme did exactly
   that and its skeletons never moved.

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
