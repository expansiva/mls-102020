/// <mls fileReference="_102020_/l2/agentImplementGenome/skills/genCfePageGenome.ts" enhancement="_blank"/>

export const skill = `
# SKILL: Render the page genome (structure + molecules + design system)

Generate the Lit render file for one frontend page genome: web/{device}/page{layout}{ds}
(e.g. web/desktop/page22). This file extends the shared base class and only renders. It must
not own state, define handlers or duplicate i18n. Three jobs, in order:
1. render the STRUCTURE from \`definition.layout\`;
2. render the MOLECULE assigned to each element;
3. style YOUR OWN markup (page scaffolding + slot content) with the design-system CSS variables.

## Input contract

Definition is the page .defs.ts object:
- page metadata
- navigationRefs
- sections[] compatibility summary
- layout.sections[] as the source of truth for render structure
- dataBindings
- layout elements (fields/filters/actions/intentions) MAY carry a \`molecule\` assignment

The page definition must not contain i18n values. All visible text values come from the shared .defs.ts / shared .ts context.

Context Files must include:
- shared .defs.ts: source of states, actions and i18n values
- shared .ts: source of actual class name, @property names, handlers and msg keys
- contract .defs.ts and contract .ts for type reference when needed
- the DS global stylesheet (styles/<ds>/global.css) and one molecule USAGE skill per used group

## Mandatory first step

Read the shared .ts context before writing code and extract:
1. Base class name from export class.
2. Every @property() field name.
3. Every method whose name starts with handle.
4. Every method referenced by shared actions.
5. Every msg/message key available.

Use only those names in render().
Never invent property names, handler names or msg keys from conventions.

## File shape

Generate:
- MLS header from target outputPath, with enhancement="_102020_/l2/enhancementAura".
- import { html } from 'lit';
- import { customElement } from 'lit/decorators.js';
- one side-effect import per DISTINCT molecule used: import '<molecule.import>';
- import the exact base class from /_{project}_/l2/{moduleName}/web/shared/{pageName}.js
- @customElement tag from outputPath using the same rule as /_102020_/l2/utils.ts convertFileToTag:
  - Insert "-" before every uppercase letter that follows a lowercase letter or digit.
  - Lowercase the result.
  - Replace folder "/" with "--".
  - Append "-{project}" to the page shortName.
  - Example: folder cafeFlow/web/desktop/page22, page aiSalesSummary, project 102050 becomes cafe-flow--web--desktop--page22--ai-sales-summary-102050.
  - Never collapse camelCase into lowercase-only names such as aisalessummary.
- export class {ModulePascal}Desktop{PageFolderPascal}{PagePascal}Page extends {BaseClassName} (e.g. CafeFlowDesktopPage22AiSalesSummaryPage)
- The only class method is render().

Do not add @property fields.
Do not add helper methods.
Do not mutate state.
Do not call setState.
Do not duplicate i18n objects.

## Mapping layout to render

Use Definition.layout.sections[].
Use section.titleKey, organism.titleKey, intention.titleKey, intention.emptyKey, field.labelKey and action.labelKey only as keys into this.msg.
If a key does not exist in the shared class msg object, render a safe empty string or a short TODO comment; do not invent a new key.

For every field/column/filter:
- Use field.stateKey to find the corresponding shared state from shared .defs.ts.
- Then use the property name actually declared in shared .ts.
- If no shared state/property exists, render the control read-only or skip the value. Do not invent a property.

For every action:
- Use action.actionKey or action.action to find Definition.actions[] in shared .defs.ts.
- Bind only to handlerName/methodName that exists in shared .ts.
- If no handler exists, render the button disabled.

Per intent: commandForm → a form; queryList → a collection (table/grid/list); summary → a
metric block; actionList → a button row; workflowStatus → a status/progress block.

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
- **\`molecule\` ABSENT** → render a plain control (native input / table / button), still bound to
  the shared state/handlers and msg keys, styled with the \`--ds-*\` variables.

If a molecule needs a property/handler missing from shared .ts, degrade gracefully — never invent.

### Molecules are ALREADY themed — do not restyle them

Molecule internals consume \`--ml-*\` CSS variables, and the design-system stylesheet already
reconciles those to the DS (e.g. \`--ml-on-surface: var(--ds-text)\`). Theming is AUTOMATIC.

- Do NOT put color/background/border/radius/shadow classes on the molecule tag to "theme" it.
- Do NOT set or override any \`--ml-*\` variable (inline, in a class, anywhere).
- Do NOT reach into the molecule's internal DOM or restyle its parts.
- What you MAY style is the **content you place inside its slot tags**: layout, spacing,
  typography and text colors, using the same \`--ds-*\` variables. Never fight styles the
  molecule already applies to its slots.
- **\`data-class\`, not \`class\`, on the molecule host and on slot TAGS.** Molecules read extra
  CSS classes from the \`data-class\` attribute (see each usage skill): a \`class\` attribute there
  is ignored. Your own plain HTML elements (divs/spans INSIDE a slot) use normal \`class\`.
- Layout-only utilities on the molecule host are fine (grid placement, width, margin) — e.g.
  \`data-class="col-span-2"\` — they position the component without re-theming it.

Example — molecule tag stays clean; only the slot CONTENT you author gets styling:

\`\`\`html
<groupviewcard--ml-vertical-card .isEditing=\${true} data-class="col-span-2">
  <CardHeader>
    <CardTitle data-class="font-[family-name:var(--ds-font-display)] text-lg font-semibold">
      \${this.msg.criarOuAtualizarItemEstoqueLabel}
    </CardTitle>
    <CardDescription data-class="text-sm text-[color:var(--ds-muted)]">
      \${this.msg.loadingListarItensEstoque}
    </CardDescription>
  </CardHeader>
  <CardContent data-class="flex flex-col gap-3">
    <!-- your own plain HTML inside the slot uses normal class, styled with --ds-* -->
    <div class="flex items-center gap-2 text-[color:var(--ds-text)]">…</div>
  </CardContent>
</groupviewcard--ml-vertical-card>
\`\`\`

---

## Design system — what you receive (and what you don't)

You do NOT receive the design-system JSON. You receive the DS GLOBAL STYLESHEET
(\`_<project>_/l2/styles/<ds>/global.css\`), already loaded by this page's pipeline. It defines,
on \`:root\` (with dark overrides on \`:root.dark\`):

- \`--ds-*\` variables — the vocabulary YOU style with: color roles (e.g. \`--ds-bg\`,
  \`--ds-surface\`, \`--ds-text\`, \`--ds-muted\`, \`--ds-primary\`, \`--ds-accent\`, \`--ds-border\`,
  \`--ds-success\`, \`--ds-danger\`), font roles (\`--ds-font-<role>\`), and possibly \`--ds-radius\`
  and \`--ds-border-w\`;
- \`--ml-*\` variables — molecule theming, reconciled to the \`--ds-*\` vars. These belong to the
  molecules; you never reference or override them.

**READ the stylesheet first** and use ONLY the \`--ds-*\` variables that actually exist in it.
Never invent a variable; never hardcode a hex color. Do NOT emit a \`<style>\` block and do NOT
add any wrapper class — components render in the light DOM
(\`createRenderRoot() { return this; }\`), so the \`:root\` variables cascade into everything,
molecules included; dark mode is the \`.dark\` toggle on \`<html>\` and needs no per-element work.

---

## Styling your markup with Tailwind (arbitrary values)

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

> Use only the roles present in the stylesheet. For hover/active, layer opacity on the same
> role: \`hover:bg-[var(--ds-primary)]/90\`. Do not introduce a new color.

### Typography

> **Font family — Tailwind v4 requires the \`family-name:\` type hint.** A bare
> \`font-[var(--ds-font-display)]\` does NOT emit \`font-family\`. Always write
> \`font-[family-name:var(--ds-font-…)]\`; no extra fallback in the class — the variable
> already carries family + fallback.

- **Headings/titles:** the display-like font role (e.g. \`--ds-font-display\`) + a heavier weight (\`font-semibold\`).
- **Body/labels:** the body font role (e.g. \`--ds-font-body\`) + \`font-normal\`/\`font-medium\`.
- **Sizes:** the stylesheet does not dictate sizes — pick ONE consistent scale for the whole
  page (e.g. \`text-xs\` labels / \`text-sm\` body / \`text-lg\` headings) and never mix scales.

### Shape, spacing, elevation

- **Radius:** \`rounded-[var(--ds-radius,0.5rem)]\` on cards, inputs and buttons — the SAME radius everywhere.
- **Border:** \`border-[length:var(--ds-border-w,1px)] border-[color:var(--ds-border)]\`.
- **Spacing:** choose ONE rhythm (e.g. \`p-4\` panels / \`gap-3\` elements / \`gap-6\` sections) and
  apply it consistently — do not mix densities across the page.
- **Elevation:** ONE shadow language for the whole page (border-only, or a consistent
  \`shadow-sm\`) — never decorative multi-level shadows.

---

## Hard rules (consistency)

### ✅ Do
- Resolve every visual choice of YOUR markup to a \`--ds-*\` variable that exists in the stylesheet.
- Keep one radius, one spacing rhythm, one shadow language, one type scale across the page.
- Derive hover/active/disabled from the same role (opacity), not a new color.

### ❌ Never
- Hardcode a bare hex in a class (\`bg-[#C85A2A]\`) — use \`var(--ds-…)\`.
- Invent a \`--ds-*\` variable that is not in the stylesheet.
- Reference or override any \`--ml-*\` variable — molecule theming is automatic.
- Re-theme a molecule (its tag or internals); style only the content you put in its slots.
- Emit a \`<style>\` block, local CSS, gradients or fonts the stylesheet does not declare.
`;
