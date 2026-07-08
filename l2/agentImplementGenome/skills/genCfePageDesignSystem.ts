/// <mls fileReference="_102020_/l2/agentImplementGenome/skills/genCfePageDesignSystem.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Design System tokens — how \`designSystem.ts\` is built and becomes CSS

Each project owns ONE generated tokens module at \`_<project>_/l2/designSystem.ts\`, built from
ALL \`designSystems[*].tokens\` in project.json — one \`tokens[]\` entry per design system, with
\`themeName\` = the DS name. At runtime (dev preview and the production bootstrap alike),
\`getTokensCss\` from \`_102029_/l2/designSystemBase\` turns the selected entry into the \`--ds-*\`
CSS variables that the page render (\`genCfePageGenome\`) consumes through \`var(--ds-*)\`. This is
the VARIABLE, per-DS half of the pipeline: different tokens → different theme entry, same rules.

Pure token → code. Never invent a value: if it is not in the tokens, do not emit it.

---

## 1. Token contract (\`designSystems[<ds>].tokens\`)

\`\`\`jsonc
{
  "palette": ["#…", …],                       // authoring-only — NEVER emit
  "color":   { "<role>": { "light": "#…", "dark": "#…" } },  // primary, surface, bg, text, muted, border, accent, success, danger, …
  "typography": {
    "fonts": [{ "name": "display", "source": "google|custom|system", "family": "…", "weights": [400,600], "fallback": "serif", "url": "…", "faces": [{ "src": "…", "weight": 400, "style": "normal" }] }],
    "fontDisplay": "…", "fontBody": "…",       // legacy string fallback when \`fonts\` is absent
    "scale": "compact|comfortable|spacious",   // NOT a CSS var (applied as Tailwind classes by the render skill)
    "weightHeading": "…", "weightBody": "…", "tracking": "…"   // NOT CSS vars (render-skill classes)
  },
  "shape":     { "radius": "none|sm|md|lg|full", "borderWidth": "1" },
  "density":   "compact|cozy|comfortable",     // NOT a CSS var (render-skill classes)
  "elevation": "none|soft|strong"              // NOT a CSS var (render-skill classes)
}
\`\`\`

---

## 2. Output shape (one theme entry per DS, all in one module)

\`\`\`ts
// _<project>_/l2/designSystem.ts — AUTO-GENERATED, do not edit by hand.
import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';

export const tokens: IDesignSystemTokens[] = [
  {
    themeName: '<DS name>',
    description: '<DS description>',
    color:      { 'ds-<role>': '<light>', '_dark-ds-<role>': '<dark>' },
    typography: { 'ds-font-<name>': '<family>, <fallback>' },
    global:     { 'ds-radius': '<length>', 'ds-border-w': '<Npx>', 'ml-<token>': 'var(--ds-*)' },
    fonts:      [ /* the DsFont[] declarations, for @import/@font-face loading */ ],
  },
]
\`\`\`

At runtime \`getTokensCss\` renders the selected entry as (order matters — \`@import\` first):

\`\`\`css
@import url('…');                    /* google css2 / custom stylesheet URLs */
@font-face { … }                     /* custom self-hosted faces */

:root {                              /* light (base) + theme-independent vars */
  --ds-<role>: <light>;  --ds-font-<name>: …;  --ds-radius: …;  --ds-border-w: …;  --ml-*: var(--ds-*);
}

[data-theme="dark"], :root.dark {    /* dark overrides — only the _dark- tokens */
  --ds-<role>: <dark>;
}
\`\`\`

---

## 3. Token generation rules

- **Color roles** → token \`ds-<role>\` (light) + \`_dark-ds-<role>\` (dark), with one alias:
  \`background\` → \`ds-bg\`. Emit a token only when the role declares that variant.
- **Fonts** → token \`ds-font-<name>\` valued family + \`fallback\` (quote families with spaces),
  plus the raw \`fonts\` field kept on the entry so runtime emits the loading by \`source\`:
  - \`google\` → \`@import\` a css2 URL built from family + sorted weights;
  - \`custom\` → \`@import\` the \`url\`, and/or \`@font-face\` blocks from \`faces[]\`;
  - \`system\` → load nothing.
  Legacy \`fontDisplay\`/\`fontBody\` map to \`ds-font-display\`/\`ds-font-body\`.
- **Shape** → \`ds-radius\` (none→0, sm→0.25rem, md→0.375rem, lg→0.5rem, full→9999px) and
  \`ds-border-w\` (bare integer → \`Npx\`, otherwise the literal value).
- **Reconciliation** → each \`tokenReconciliation\` mapping becomes an \`ml-*\` token valued
  \`var(--ds-*)\` (\`pinned\` overrides win; \`null\` = keep the molecule default).
- **density / elevation / typography.scale|weight|tracking** are NOT tokens — they are
  applied by the render skill as Tailwind classes. Do not emit them here.

---

## 4. Hard rules

- Deterministic & idempotent: the same tokens always produce the same module.
- Never emit \`palette[i]\` — only semantic \`color\` roles.
- Dark mode CSS targets \`[data-theme="dark"], :root.dark\` (the Aura preview toggles \`.dark\`
  on \`<html>\`; the legacy attribute keeps older shells working).
- A DS without \`tokens\` (e.g. the default DS) gets NO entry in the array.
`;
