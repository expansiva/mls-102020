/// <mls fileReference="_102020_/l2/agentImplementGenome/skills/genCfePageGenome.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Render the page genome (structure + molecules + design system)

The FIXED base skill for every page{layout}{ds}. You extend the shared base class and ONLY
render — no own state, handlers or i18n. Three jobs, in order:
1. render the STRUCTURE from \`definition.layout\`;
2. render the MOLECULE assigned to each element;
3. apply the DESIGN SYSTEM tokens (sections 1–6 below) — you do **not** invent colors, fonts or
   spacing; every visual decision traces back to a token (derive hovers from the same role).

---

## Structure — read \`definition.layout\`

Use \`definition.layout.sections[].organisms[].intentions[]\` as the source of truth. Each
intention has an \`intent\` plus \`fields[]\`, \`columns[]\`, \`filters[]\`, \`toolbar[]\`, \`rowActions[]\`,
\`actions[]\`. Use \`section.titleKey\` / \`organism.titleKey\` / \`intention.titleKey\` /
\`intention.emptyKey\` / \`field.labelKey\` / \`action.labelKey\` only as keys into \`this.msg\`
(render a safe empty string when a key is missing — never invent keys).

Read the shared \`.ts\` FIRST and use ONLY its real @property names, handlers (\`handle…\`) and msg
keys. Bind \`field.stateKey\` → the shared property; \`action.actionKey\`/\`action.action\` → the shared
handler. Never invent names — degrade to read-only / disabled instead.

Per intent: \`commandForm\` → a form; \`queryList\` → a collection (table/grid/list); \`summary\` → a
metric block; \`actionList\` → a button row; \`workflowStatus\` → a status/progress block.

---

## Molecules — render the assigned \`molecule\` per element

ANY element (a \`field\`/\`filter\`/\`column\`/\`action\`, or the intention itself for
\`queryList\`/\`summary\`/\`workflowStatus\`) MAY carry a \`molecule\` object:
\`{ project, group, tag, purpose, import }\`.

- **\`molecule\` PRESENT** → import it for its side effect (registers the custom element):
  \`import '<molecule.import>';\` — then render its tag \`<molecule.tag …></molecule.tag>\`. The tag
  IS the chosen variant; never swap it for another tag/group. Configure it from its group's USAGE
  skill (the matching \`…/skills/molecules/<group>/usage.ts\` is provided): fill its slots, bind its
  value to the shared property (via \`field.stateKey\`) and its change/input/submit/click to existing
  shared handlers.
- **\`molecule\` ABSENT** → render a plain control (native input / table / button), still bound to the
  shared state/handlers and msg keys.

If a molecule needs a property/handler missing from shared \`.ts\`, degrade gracefully — never invent.

Once the structure + molecules are in place, theme everything with the design-system tokens:

---

## 1. The token contract you receive

The design system is an object on \`designSystems[ds].tokens\` with this exact shape:

\`\`\`jsonc
{
  "palette": ["#C85A2A", "#F2C57C", "#F6F1EB", "#3B2F2F", "#2E7D32"], // source swatches (authoring only — DO NOT consume directly)
  "color": {                       // semantic roles — each has light + dark
    "primary":    { "light": "#C85A2A", "dark": "#E0723F" },
  },
  "typography": {
    "fontDisplay":   "Fraunces, serif",
  },
  "shape":     { "radius": "lg", "borderWidth": "1" },   // radius: none | sm | md | lg | full
  "density":   "cozy",                                    // compact | cozy | comfortable
  "elevation": "soft"                                     // none | soft | strong
}
\`\`\`

> **\`palette\` is authoring input only** — it feeds the configuration UI. Always
> consume the semantic **\`color\` roles**, never \`palette[0]\`, \`palette[1]\`, …
> A role tells you *intent* (primary, surface, danger); a palette index does not.

---

## 2. Step 1 — Nothing to set up: the variables are global

**Do NOT emit a \`<style>\` block, and do NOT add any wrapper class.** The \`--ds-*\`
variables are already defined on \`:root\` by this page's design-system stylesheet
(\`_<project>_/l2/styles/<ds>/global.css\`), which the page's pipeline loads. Each page
has exactly ONE design system, so the variables are simply available everywhere.

Your only job is to **reference them** with \`var(--ds-*)\`:

\`\`\`html
<div class="bg-[var(--ds-bg)] text-[color:var(--ds-text)] min-h-screen">
  <!-- the whole page goes here -->
</div>
\`\`\`

> **Why it just works:** the stylesheet defines \`:root { --ds-*: … }\` (light) and
> \`:root.dark { … }\` (dark). Because these components render into the **light DOM**
> (\`createRenderRoot() { return this; }\`), the \`:root\` variables **cascade into every
> child — including the molecules and their slot tags**. Dark mode is the host \`.dark\`
> toggle on \`<html>\`; \`:root.dark\` swaps the values automatically — no per-element
> rework. Editing a token only regenerates that stylesheet; this page does not change.

---

## 3. Step 2 — Apply the tokens with Tailwind

Reference the variables through Tailwind **arbitrary values**

### Color → utility

| Intent | Pattern |
|--------|---------|
| Page background | \`bg-[var(--ds-bg)]\` |
| Card / panel surface | \`bg-[var(--ds-surface)]\` |
| Primary action / emphasis | \`bg-[var(--ds-primary)]\` / \`text-[color:var(--ds-primary)]\` |
| Accent (badges, highlights) | \`bg-[var(--ds-accent)]\` |
| Body text | \`text-[color:var(--ds-text)]\` |
| Secondary / helper text | \`text-[color:var(--ds-muted)]\` |
| Borders / dividers | \`border-[color:var(--ds-border)]\` |
| Success / danger states | \`text-[color:var(--ds-success)]\` / \`text-[color:var(--ds-danger)]\` |

> For hover/active, layer opacity on the same role:
> \`hover:bg-[var(--ds-primary)]/90\`. Do not introduce a new color.

### Typography → utility

> **Font family — Tailwind v4 requires the \`family-name:\` type hint.** A bare
> \`font-[var(--ds-font-display)]\` does NOT emit \`font-family\` (Tailwind can't tell if
> \`font-[…]\` means family, size or weight). Always write \`font-[family-name:var(--ds-font-…)]\`.
> Do NOT add a font fallback in the class — the variable already carries family + fallback.

- **Headings/titles:** \`font-[family-name:var(--ds-font-display)]\` + heading weight + \`tracking\` from token.
- **Body/labels:** \`font-[family-name:var(--ds-font-body)]\` + body weight.
- **Size scale** (from \`typography.scale\`) — pick the row, apply consistently:

| scale | body | label | heading |
|-------|------|-------|---------|
| \`compact\` | \`text-sm\` | \`text-xs\` | \`text-base\` |
| \`comfortable\` | \`text-base\` | \`text-sm\` | \`text-lg\` |
| \`spacious\` | \`text-lg\` | \`text-base\` | \`text-2xl\` |

- **Weights:** \`weightHeading\`/\`weightBody\` map to \`font-medium\`/\`font-semibold\`/\`font-normal\` (\`600\`→\`font-semibold\`, \`500\`→\`font-medium\`, \`400\`→\`font-normal\`).
- **Tracking:** \`tracking-tight\` | \`tracking-normal\` | \`tracking-wide\`.

### Shape → utility (\`shape.radius\`, \`shape.borderWidth\`)

\`shape.radius\` and \`shape.borderWidth\` are exposed as variables (\`--ds-radius\`,
\`--ds-border-w\`) in \`global.css\`. Reference them so the radius/border stay uniform:

- **Radius:** \`rounded-[var(--ds-radius,0.5rem)]\` on cards, inputs and buttons.
- **Border width:** \`border border-[color:var(--ds-border)]\` (1px) or, for a custom
  width, \`border-[length:var(--ds-border-w,1px)]\`.

Apply the **same** radius across cards, inputs, and buttons — one shape language.

### Density → spacing scale (\`density\`)

| density | component padding | element gap | section gap |
|---------|-------------------|-------------|-------------|
| \`compact\` | \`p-3\` | \`gap-2\` | \`gap-4\` |
| \`cozy\` | \`p-4\` | \`gap-3\` | \`gap-6\` |
| \`comfortable\` | \`p-6\` | \`gap-4\` | \`gap-8\` |

### Elevation → shadow (\`elevation\`)

| elevation | surfaces |
|-----------|----------|
| \`none\` | no shadow — separate with \`border\` only |
| \`soft\` | \`shadow-sm\` |
| \`strong\` | \`shadow-md\` / \`shadow-lg\` for key surfaces |

---

## 4. Styling molecules (composition / slot tags)

Molecules are **composed** — you fill their slot tags with your own markup.
You do **not** restyle the molecule's internals; you style **the content you put
inside the slots**, using the very same DS variables. Because molecules live in
the light DOM, the \`--ds-*\` variables already cascade into them.

Given a molecule used like this:

\`\`\`html
<groupviewcard--ml-vertical-card .isEditing=\${true}>
  <CardHeader>
    <CardTitle>\${this.msg.criarOuAtualizarItemEstoqueLabel}</CardTitle>
    <CardDescription>\${this.msg.loadingListarItensEstoque}</CardDescription>
  </CardHeader>
  <CardContent>
    <!-- fields … -->
  </CardContent>
</groupviewcard--ml-vertical-card>
\`\`\`

Apply the design system **on the slot tags and their children**:

\`\`\`html
<groupviewcard--ml-vertical-card
  .isEditing=\${true}
  class="bg-[var(--ds-surface)] border border-[color:var(--ds-border)] rounded-lg shadow-sm">
  <CardHeader class="p-4 border-b border-[color:var(--ds-border)]">
    <CardTitle class="font-[family-name:var(--ds-font-display)] text-lg font-semibold tracking-tight text-[color:var(--ds-text)]">
      \${this.msg.criarOuAtualizarItemEstoqueLabel}
    </CardTitle>
    <CardDescription class="font-[family-name:var(--ds-font-body)] text-sm text-[color:var(--ds-muted)]">
      \${this.msg.loadingListarItensEstoque}
    </CardDescription>
  </CardHeader>
  <CardContent class="p-4 flex flex-col gap-3 text-[color:var(--ds-text)]">
    <!-- fields, themed with the same tokens -->
  </CardContent>
</groupviewcard--ml-vertical-card>
\`\`\`

**Rules for molecule slots:**
- Put the surface/border/radius/shadow on the **molecule root tag** (or its
  outermost slot wrapper) — one themed container per molecule.
- Title-like slots → display font + heading weight + \`--ds-text\`.
- Description/helper slots → body font + \`--ds-muted\`.
- Action slots (buttons inside the molecule) → \`--ds-primary\` background,
  contrasting text; danger actions → \`--ds-danger\`.
- Keep padding/gap from the **density** scale so molecules match the page rhythm.
- Never reach into the molecule's own DOM or override its behavior — only theme
  what you place in the slots.

---

## 5. Hard rules (consistency)

### ✅ Do
- Resolve every visual choice to a token (\`color\` role, \`typography\`, \`shape\`, \`density\`, \`elevation\`).
- Reference tokens through \`var(--ds-*)\` so light/dark and future edits propagate.
- Use **one** radius, **one** density, **one** elevation language across the whole page.
- Derive hover/active/disabled from the same role (opacity), not a new color.

### ❌ Never
- Hardcode a bare hex in a class (\`bg-[#C85A2A]\`) — use \`var(--ds-primary)\`. 
- Consume \`palette[i]\` directly — use the semantic \`color\` roles.
- Mix radii/shadows/fonts not present in the tokens.
- Restyle a molecule's internals — theme only its slots.
- Add gradients, decorative shadows, or fonts the design system did not declare.

---

## 6. Output checklist

Before finishing, confirm:
- [ ] NO inline \`<style>\` token block and NO \`ds-*\` wrapper class — variables come from \`:root\`.
- [ ] Page background, surfaces, text, borders all use role variables (with fallbacks).
- [ ] Headings use \`fontDisplay\`; body uses \`fontBody\`; sizes follow the \`scale\` row.
- [ ] Radius, density and elevation are uniform and match the tokens.
- [ ] Every composed molecule is themed on its slot tags with the same variables.
- [ ] No raw hex, no \`palette[i]\`, no undeclared colors/fonts.
`;
