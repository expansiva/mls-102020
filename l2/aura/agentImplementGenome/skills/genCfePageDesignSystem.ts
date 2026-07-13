/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/skills/genCfePageDesignSystem.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Design System tokens — the \`designSystem.ts\` module and how it becomes CSS

\`_<project>_/l2/designSystem.ts\` is the SINGLE home of the project's design systems:
identity AND styling tokens, one entry per DS. Token names are FREE-FORM — the module is
the model (no fixed vocabulary; \`ds-*\` is the recommended convention). Each entry carries
a \`dsIndex\` correlating it with the generation config bucket \`designSystems[dsIndex]\`
in project.json and with the \`page<layout><ds>\` variation folders. At runtime (dev preview
and the production bootstrap alike), \`getTokensCss\` from \`_102029_/l2/designSystemBase\`
renders the selected entry (by \`themeName\`) into CSS variables that the page render
(\`genCfePageGenome\`) consumes through \`var(--<token>)\`.

---

## 1. Module shape

\`\`\`ts
// _<project>_/l2/designSystem.ts
import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';

export const tokens: IDesignSystemTokens[] = [
  {
    themeName: '<DS name>',            // the selection key at runtime
    description: '<DS description>',
    dsIndex: '<n>',                    // correlates with project.json designSystems[n] + page folders
    color:      { '<token>': '<light value>', '_dark-<token>': '<dark value>' },
    typography: { '<token>': '<value>' },
    global:     { '<token>': '<value>', 'ml-<token>': 'var(--…)' },
    fonts:      [ /* DsFont[] — families that must be LOADED (@import/@font-face) */ ],
  },
]
\`\`\`

- A token key becomes the CSS variable \`--<token>\`.
- A \`_dark-<token>\` key is the DARK value of \`<token>\` (same variable, overridden in dark mode).
- \`ml-*\` tokens belong to the molecule reconciliation agent — never invent or rename them.
- \`fonts\` declares font LOADING by \`source\` (google → css2 @import; custom → url @import
  and/or @font-face from \`faces[]\`; system → nothing). The family VALUE itself is a normal
  typography token.

---

## 2. Runtime CSS (what getTokensCss emits)

Order matters — \`@import\` must precede every rule:

\`\`\`css
@import url('…');                    /* from fonts[] */
@font-face { … }

:root {                              /* every token (light values) */
  --<token>: <light value>;
}

[data-theme="dark"], :root.dark {    /* only the _dark- tokens, prefix stripped */
  --<token>: <dark value>;
}
\`\`\`

Values may hold Less expressions referencing other tokens (\`calc(@space-base-unit * 2)\`) —
they are rewritten to \`var(--space-base-unit)\` form at render time.

---

## 3. Hard rules

- The module is edited by the Design System plugin (and the reconciliation agent for \`ml-*\`).
  Identity lives ONLY here — project.json holds no DS name/description.
- Dark mode CSS targets \`[data-theme="dark"], :root.dark\` (the Aura preview toggles \`.dark\`
  on \`<html>\`; the legacy attribute keeps older shells working).
- When styling pages, use ONLY variables whose tokens exist in the selected entry — never
  invent a variable, never hardcode a hex color.
`;
