/// <mls fileReference="_102020_/l2/skills/desingsystem/genPageDsCustom.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Apply the Design System (custom tokens)

This page is generated **with a configured Design System**. Unlike the free-form
\`genPageDS\` skill, you do **not** invent colors, fonts or spacing here — you
**apply the tokens** declared in the project's design system. Every visual
decision must trace back to a token. If a value is not in the tokens, derive it
from the tokens (e.g. a hover shade) — never introduce an unrelated color.

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

## 2. Step 1 — Apply the design-system class

**Do NOT emit a \`<style>\` block with the token values.** The \`--ds-*\` variables are
already defined, project-wide, in a generated stylesheet (\`_<project>_/l2/styles/global.css\`)
under a class per design system: \`.ds-<dsName>\` (light) and \`.dark .ds-<dsName>\` (dark).

Your only job is to **add that class to the page's root element**:

\`\`\`html
<!-- dsName comes from the design system applied to this page, e.g. "default" -->
<div class="ds-default bg-[var(--ds-bg)] text-[color:var(--ds-text)] min-h-screen">
  <!-- the whole page goes here -->
</div>
\`\`\`

> **Why a class (not a baked \`<style>\`):** these components render into the
> **light DOM** (\`createRenderRoot() { return this; }\`), so the \`--ds-*\` variables
> defined on \`.ds-<dsName>\` **cascade into every child — including the molecules
> and their slot tags**. One class at the root themes the whole tree. Dark mode is
> the host \`.dark\` toggle; \`.dark .ds-<dsName>\` swaps the values automatically — no
> per-element rework. Editing a token only regenerates \`global.css\`; this page does
> not change.


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

- **Headings/titles:** \`font-[var(--ds-font-display)]\` + heading weight + \`tracking\` from token.
- **Body/labels:** \`font-[var(--ds-font-body)]\` + body weight.
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
    <CardTitle class="font-[var(--ds-font-display)] text-lg font-semibold tracking-tight text-[color:var(--ds-text)]">
      \${this.msg.criarOuAtualizarItemEstoqueLabel}
    </CardTitle>
    <CardDescription class="font-[var(--ds-font-body)] text-sm text-[color:var(--ds-muted)]">
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
- [ ] The page root carries \`class="ds-<dsName>"\` (NO inline \`<style>\` token block).
- [ ] Page background, surfaces, text, borders all use role variables (with fallbacks).
- [ ] Headings use \`fontDisplay\`; body uses \`fontBody\`; sizes follow the \`scale\` row.
- [ ] Radius, density and elevation are uniform and match the tokens.
- [ ] Every composed molecule is themed on its slot tags with the same variables.
- [ ] No raw hex, no \`palette[i]\`, no undeclared colors/fonts.
`;
