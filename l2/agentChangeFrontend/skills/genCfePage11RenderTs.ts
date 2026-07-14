/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Page11 Render TS Skill

Generate the Lit render file for one Stage 2 frontend page genome: web/desktop/page11.
This file extends the shared base class and only renders. It must not own state, define handlers or duplicate i18n.

## Input contract

Definition is the page11 .defs.ts object:
- page metadata
- baseClassName: the deterministic shared base class that this page must import and extend
- navigationRefs
- sections[] compatibility summary
- layout.sections[] as the source of truth for render structure
- dataBindings

The page11 definition must not contain i18n values. All visible text values come from the shared .defs.ts / shared .ts context.

Context Files must include:
- shared .defs.ts: source of states, actions and i18n values
- shared .ts: source of actual class name, @property names, handlers and msg keys
- contract .defs.ts and contract .ts for type reference when needed

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
- import Definition.baseClassName exactly from /_{project}_/l2/{moduleName}/web/shared/{pageName}.js.
  The extension is always .js, never .ts.
- @customElement tag from outputPath using the same rule as /_102020_/l2/utils.ts convertFileToTag:
  - Insert "-" before every uppercase letter that follows a lowercase letter or digit.
  - Lowercase the result.
  - Replace folder "/" with "--".
  - Append "-{project}" to the page shortName.
  - Example: folder cafeFlow/web/desktop/page11, page aiSalesSummary, project 102050 becomes cafe-flow--web--desktop--page11--ai-sales-summary-102050.
  - Never collapse camelCase into lowercase-only names such as aisalessummary.
- export class {ModulePascal}DesktopPage11{PagePascal}Page extends Definition.baseClassName
- The only class method is render().

Do not add @property fields.
Do not add helper methods.
Do not mutate state.
Do not call setState.
Do not duplicate i18n objects.

## Mapping layout to render

Use Definition.layout.sections[].
Use section.titleKey, organism.titleKey, intention.titleKey, intention.emptyKey, field.labelKey and action.labelKey only as keys into this.msg.
Access messages ONLY as typed member access on this.msg using the exact key string, e.g. this.msg['menuManagement.field.name.label']. The msg keys are declared in the shared .ts and are type-checked: a wrong or missing key must surface as a compile error — that is the desired behavior.
NEVER cast this.msg (no "as Record<string, string>", no "as any") and NEVER wrap it in a helper such as getMsg/t/translate. Those erase key typing and let broken keys ship silently as empty strings.
Use each key EXACTLY as it appears in the layout *Key field (which matches the shared i18n); do not shorten or re-derive it — e.g. never write 'section.board' when the declared key is 'menuManagement.section.main.title'.
If a required key is genuinely absent from shared, render a literal string with a short TODO comment; never add a dynamic lookup that hides the missing key.

For every field/column/filter:
- Use field.stateKey to find the corresponding shared state from shared .defs.ts.
- Then use the property name actually declared in shared .ts.
- If no shared state/property exists, render the control read-only or skip the value. Do not invent a property.
- If the shared state kind is businessContext, render it as a compact current-company/current-unit badge or selector area. Do not render it as a plain technical text input and do not label it workspaceId.
- For queryResult states, inspect shared .defs.ts:
  - outputShape "array": rows are the shared property itself.
  - outputShape "paginated": rows are sharedProperty.items (fallback to [] when missing), and total/page/pageSize may be shown only when those properties exist on the state value.
  - outputShape "object": render a summary/detail block, not an array table.

For every action:
- Use action.actionKey or action.action to find Definition.actions[] in shared .defs.ts.
- Bind only to handlerName/methodName that exists in shared .ts.
- If no handler exists, render the button disabled.

## Layout patterns

Render page11 as a simple operational page:
- outer wrapper: min-h-full, background from the design-system surface token (see "Design system colors")
- inner container: max-w-6xl mx-auto px-4 py-6 space-y-6
- header with page title from an existing msg key. Do not render purpose unless a purpose msg key exists in the shared class.
- sections as cards
- organisms as grouped panels
- plain forms for commandForm intentions
- plain tables for queryList intentions
- compact summary blocks for summary intentions
- button rows for actionList intentions
- simple status lists for workflowStatus intentions
- for every command action, render a textual feedback region driven by its action status: success uses feedback.successMessageKey; error uses the AppError text from errorStateKey when present, otherwise feedback.errorMessageKey. It must be dismissible and must never be only an icon or glyph.
- bind the feedback dismiss control only to the handler declared by feedback.dismissActionId; never clear status inline.
- represent loading consistently: query/list intentions show a placeholder or skeleton while their query state is loading; command buttons show a spinner/progress label and are disabled while their action is loading.
- collapse repeated hierarchy: render the page title once as h1. A section/organism/intention title that resolves to the same message as its parent must not be rendered again. Use the next distinct title as h2, then render blocks without another repeated title.
- use the Definition.visualStyle direction when it exists. Translate only evidenced signals into layout density: data-dense/status-driven favors compact tables and grouped statuses; dashboard-first favors summary before detail; otherwise retain the simple operational layout. Do not invent colors, chart data or components from the style string.

Do not import or render molecule packages in page11.
Do not render custom molecule/web-component tags.
Do not use group names such as groupViewTable or tags such as groupviewtable--ml-data-table.

Keep cards at rounded-lg or less. Use Tailwind utility classes for LAYOUT (spacing, flex/grid, sizing, radius).

## Design system colors

Color must come from the design-system tokens, not hardcoded palettes. This keeps page11 plain (no
molecules) but themed by the project's design system.
- The design system module (designSystem.ts) is provided in context when it exists. Read the ACTUAL
  token names from it (token key "<t>" -> CSS variable var(--<t>); the "ds-*" prefix is the convention).
- Apply colors via Tailwind arbitrary-value utilities that reference the variable, e.g.
  bg-[var(--ds-color-surface)], text-[var(--ds-color-text)], border-[var(--ds-color-border)],
  and the primary/accent token for main buttons.
- ALWAYS include a neutral fallback INSIDE the var() so the page still renders when the design system
  or a token is absent, e.g. bg-[var(--ds-color-surface,#ffffff)], text-[var(--ds-color-text,#0f172a)],
  border-[var(--ds-color-border,#e2e8f0)]. Never emit a token reference without a fallback.
- Do NOT hardcode a palette color (no bg-slate-50, no #hex on its own) for themable surfaces/text/borders.
  Neutral structural utilities without a color (shadows, ring width) are fine.
- Dark mode is handled by the design system variables themselves (the shell toggles the theme); do not
  add dark: color variants for tokenized colors.
- Local CSS is allowed ONLY to reference these variables (e.g. a small style block or inline style using
  var(--token, fallback)); do not author fixed color values or component styling beyond that.

## Interaction rules

- Inputs bind value from shared properties.
- Input/change events bind only to existing shared handlers.
- Buttons bind only to existing shared handlers.
- Query refresh buttons may call existing query handlers.
- No inline assignment like this.field = value.
- Inline arrows are allowed only to pass item context to an existing shared handler.
- For a row action with context "row", read action.rowRef from that row and call the existing
  stateSetter for the action's selectedEntityInputStateKey before its command handler. Disable the
  action when rowRef or the setter is unavailable; never submit the current form against an unrelated row.
- Before opening or submitting an edit action, copy every action.prefillRefs value from the row into
  its existing form stateSetter. Never invent draft properties or assign them inline.
- A row/action with confirmation=true must ask for explicit confirmation before calling its handler.
- A field with inputType "select" must render a select whose options come from its declared query
  source; never degrade it to a free-text input.

## Guardrails

- Render must compile even when some optional layout hints are missing.
- Prefer omitting an interaction over inventing one.
- Every visible text uses typed this.msg['<exact key>'] access; never a cast or a getMsg-style helper.
- Never use this.purpose; shared/base classes do not expose a purpose property.
- Do not use page definition i18n; it is intentionally absent.
`;
