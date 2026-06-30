/// <mls fileReference="_102020_/l2/agentImplementGenome/skills/genCfePageDesignSystem.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Design System stylesheet — how \`styles/<ds>/global.css\` is built

Each design system owns ONE stylesheet at \`_<project>_/l2/styles/<ds>/global.css\`, generated
from \`designSystems[<ds>].tokens\` in project.json. It declares the \`--ds-*\` CSS variables that
the page render (\`genCfePageGenome\`) consumes through \`var(--ds-*)\`. This is the VARIABLE,
per-DS half of the pipeline: different tokens → different stylesheet, same rules.

Pure token → CSS. Never invent a value: if it is not in the tokens, do not emit it.

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

## 2. Output shape (one file per DS)

Order matters — \`@import\` must precede every rule:

\`\`\`css
/* AUTO-GENERATED — do not edit by hand. */

@import url('…');           /* google css2 / custom stylesheet URLs */
@font-face { … }            /* custom self-hosted faces */

:root {                     /* light (base) + theme-independent vars */
  --ds-<role>: <light>;
  --ds-font-<name>: <family>, <fallback>;
  --ds-radius: <length>;
  --ds-border-w: <Npx>;
}

:root.dark {                /* dark overrides — only the color roles */
  --ds-<role>: <dark>;
}
\`\`\`

---

## 3. Emission rules

- **Color roles** → \`--ds-<role>\`, with one alias: \`background\` → \`--ds-bg\`. Light values go in
  \`:root\`, dark values in \`:root.dark\`. Emit a role only when it declares that variant.
- **Fonts** → \`--ds-font-<name>\` (theme-independent → \`:root\` only). Loading by \`source\`:
  - \`google\` → \`@import\` a css2 URL built from family + sorted weights;
  - \`custom\` → \`@import\` the \`url\`, and/or \`@font-face\` blocks from \`faces[]\`;
  - \`system\` → load nothing.
  Quote families with spaces; append the \`fallback\`. Legacy \`fontDisplay\`/\`fontBody\` map to
  \`--ds-font-display\`/\`--ds-font-body\`.
- **Shape** → \`--ds-radius\` (none→0, sm→0.25rem, md→0.375rem, lg→0.5rem, full→9999px) and
  \`--ds-border-w\` (bare integer → \`Npx\`, otherwise the literal value). Theme-independent → \`:root\`.
- **density / elevation / typography.scale|weight|tracking** are NOT CSS variables — they are
  applied by the render skill as Tailwind classes. Do not emit them here.

---

## 4. Hard rules

- Deterministic & idempotent: the same tokens always produce the same file.
- Never emit \`palette[i]\` — only semantic \`color\` roles.
- Dark mode uses \`:root.dark\` (the Aura preview toggles \`.dark\` on \`<html>\`). No \`[data-theme]\`.
- A DS without \`tokens\` (e.g. the default DS) produces NO file.
`;
