/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Page11 Render TS Skill

Generate the Lit render file for one Stage 2 frontend page genome: web/desktop/page11.
This file extends the shared base class and only renders. It must not own state, define handlers or duplicate i18n.

## Input contract

Definition is the page11 .defs.ts object:
- page metadata
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
- import the exact base class from /_{project}_/l2/{moduleName}/web/shared/{pageName}.js
- @customElement tag from outputPath using the same rule as /_102020_/l2/utils.ts convertFileToTag:
  - Insert "-" before every uppercase letter that follows a lowercase letter or digit.
  - Lowercase the result.
  - Replace folder "/" with "--".
  - Append "-{project}" to the page shortName.
  - Example: folder cafeFlow/web/desktop/page11, page aiSalesSummary, project 102050 becomes cafe-flow--web--desktop--page11--ai-sales-summary-102050.
  - Never collapse camelCase into lowercase-only names such as aisalessummary.
- export class {ModulePascal}DesktopPage11{PagePascal}Page extends {BaseClassName}
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

## Layout patterns

Render page11 as a simple operational page:
- outer wrapper: min-h-full bg-slate-50 dark:bg-slate-950
- inner container: max-w-6xl mx-auto px-4 py-6 space-y-6
- header with page title from an existing msg key. Do not render purpose unless a purpose msg key exists in the shared class.
- sections as cards
- organisms as grouped panels
- plain forms for commandForm intentions
- plain tables for queryList intentions
- compact summary blocks for summary intentions
- button rows for actionList intentions
- simple status lists for workflowStatus intentions

Do not import or render molecule packages in page11.
Do not render custom molecule/web-component tags.
Do not use group names such as groupViewTable or tags such as groupviewtable--ml-data-table.

Use Tailwind utility classes with dark variants for color classes.
Keep cards at rounded-lg or less.
Do not create local CSS.

## Interaction rules

- Inputs bind value from shared properties.
- Input/change events bind only to existing shared handlers.
- Buttons bind only to existing shared handlers.
- Query refresh buttons may call existing query handlers.
- No inline assignment like this.field = value.
- Inline arrows are allowed only to pass item context to an existing shared handler.

## Guardrails

- Render must compile even when some optional layout hints are missing.
- Prefer omitting an interaction over inventing one.
- Every visible text should use this.msg when the key exists.
- Never use this.purpose; shared/base classes do not expose a purpose property.
- Do not use page definition i18n; it is intentionally absent.
`;
