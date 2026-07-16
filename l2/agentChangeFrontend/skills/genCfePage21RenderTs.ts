/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Page21 Render TS Skill (goal-first)

Generate the Lit render file for the SECOND genome of a Stage 2 frontend page: web/desktop/page21.
This is the goal-first variant. It has the SAME contract, shared base class and closed vocabulary as
page11, but its layout was designed around the page objective, so it uses richer presentation
patterns instead of the plain "list on top, form below" baseline.

This file extends the shared base class and only renders. It must not own state, define handlers or
duplicate i18n. All the page11 guardrails apply unchanged — this skill only WIDENS presentation.

## Input contract

Definition is the page21 .defs.ts object:
- page metadata
- baseClassName: the deterministic shared base class that this page must import and extend
- pageObjective: the synthesized goal for this page (actor, jobToBeDone, primaryDecision,
  decisiveInfo, usageFrequency, criticalActions[{action,presentation}], informationHierarchy,
  successCriteria, antiPatterns). Use it to drive ordering, density and how each action is presented.
- msgKeys: the CLOSED vocabulary of this.msg keys this page may use (keys only, values live in shared)
- navigationRefs
- layout.sections[] as the source of truth for render structure (organisms, intentions, displayHint)
- dataBindings

The page21 definition, like page11, must not contain i18n values. All visible text comes from the
shared context (compiled .d.ts or raw .ts).

## Mandatory first step (identical to page11)

Read the shared base-class context (compiled .d.ts, or raw .ts as fallback) before writing code and extract:
1. Base class name from export class.
2. Every @property() field name (its JSDoc 'state <stateKey>' links it to layout stateKeys).
3. Every method whose name starts with handle (its JSDoc names the action it belongs to).
4. Every action method and its JSDoc (inputs, output states, status state, feedback keys).
5. Every msg/message key available (MessageType).
6. Re-exported contract type names (export type { ... }).

Use only those names in render(). Never invent property names, handler names or msg keys.
Import DTO types from the shared module when it re-exports them; only fall back to the contracts
module for a type the shared does not re-export.

## File shape (identical rules to page11)

- MLS header from the target outputPath (web/desktop/page21/...), enhancement="_102020_/l2/enhancementAura".
- import { html } from 'lit'; import { customElement } from 'lit/decorators.js';
- import Definition.baseClassName exactly from /_{project}_/l2/{moduleName}/web/shared/{pageName}.js (.js, never .ts).
- @customElement tag from the outputPath using convertFileToTag (insert "-" before an uppercase that
  follows a lowercase/digit, lowercase, folder "/" -> "--", append "-{project}"). The folder is
  {moduleName}/web/desktop/page21, so the tag contains "--desktop--page21--". Never collapse camelCase.
- export class {ModulePascal}DesktopPage21{PagePascal}Page extends Definition.baseClassName
- The only class method is render().

Do not add @property fields. Do not add helper methods that mutate state or call setState. Do not
duplicate i18n objects. Local const helpers inside render() (pure formatting, grouping, filtering of
already-loaded shared data) are allowed and expected for the richer patterns below.

## Mapping layout to render (same binding rules as page11)

Use Definition.layout.sections[]. Use section.titleKey, organism.titleKey, intention.titleKey,
intention.emptyKey, field.labelKey and action.labelKey only as keys into this.msg. Access messages
ONLY as typed member access on this.msg using the exact key string (e.g. this.msg['field.status.label']).
NEVER cast this.msg and NEVER wrap it in a getMsg/t helper. Use each key EXACTLY as declared.
Definition.msgKeys is the complete closed list of keys this page may use. NEVER use a this.msg key
that is not in msgKeys — do not invent presentation keys and do not abbreviate
('organism.dashboard.empty' when msgKeys has 'organism.dashboardSummary.empty' is a compile error).
Status/lane labels with no key in msgKeys are rendered from the data value itself (e.g. item.status)
or a literal with a TODO comment. A shared compiled .d.ts context section, when present, is the
authoritative public surface (typed msg keys, properties, handlers) — it wins over your reading of
the source.
If a required key is genuinely absent, render a literal string with a short TODO comment.

For every field/column/filter: resolve field.stateKey to the shared property whose JSDoc says
'state <that stateKey>', then use that property name exactly. If no shared state/property exists,
render read-only or skip; never invent a property. businessContext states (per JSDoc kind) render as
a compact current-company/current-unit badge. queryResult states — read outputShape from the property
JSDoc: "array" -> rows are the property; "paginated" -> rows are property.items (fallback []);
"object" -> summary/detail block.

For every action: resolve action.actionKey/action.action to the shared method whose JSDoc says
'action <that actionId>' and bind only to handlers/methods that exist in the shared context
(JSDoc 'handler for action ...'). If no handler exists, render disabled.

## Goal-first layout patterns (this is what differs from page11)

Lay the page out around Definition.pageObjective, using the intention/organism displayHint values.
Prefer these patterns over the baseline stacked-cards-and-forms shape:

- **master-detail**: render a selectable list/board and a contextual detail/action panel for the
  selected item side by side (grid md:grid-cols-2/3). Drive selection through an EXISTING shared
  selected-id state/handler (e.g. a setXxxId handler). Do NOT stack a separate form section below a
  list when the form only acts on the selected row — put it in the detail panel.
- **contextual-transition-actions**: for a lifecycle/status mutation, compute the allowed next states
  from the selected item's current status (reading the lifecycle from shared state / rulesApplied) and
  render ONE button per allowed transition that calls the existing mutation handler. NEVER a free
  <select> over all enum values and NEVER a manually typed id input. This is the main fix over page11.
- **card-board**: group items into lanes by status/stage; the primary action lives inline on each card.
- **inline-row-command**: a one-decision command executed directly on a list row.
- **summary-first**: when pageObjective.informationHierarchy leads with numbers/status, render a
  compact summary/stat row before the detail.

Respect pageObjective.antiPatterns: if it lists "separate transition form" or "status select", you
must not emit them. Order organisms by pageObjective.informationHierarchy / primaryDecision.

## Density, feedback and loading

- Translate pageObjective.usageFrequency into density: continuous/hands-busy favors large touch
  targets and compact cards; back-office favors tables and detail panels.
- For every command action, render a dismissible textual feedback region driven by its action status:
  success uses feedback.successMessageKey; error uses the AppError text from errorStateKey when present,
  otherwise feedback.errorMessageKey. Never only an icon.
- Query/list intentions show a placeholder/skeleton while their query state is loading; command buttons
  show a progress label and are disabled while their action is loading.
- Collapse repeated hierarchy: page title once as h1; a title that resolves to the same message as its
  parent is not repeated.

## Design system colors (identical to page11)

Color comes from design-system tokens, never hardcoded palettes. The context provides the token
NAMES as a compact list (base tokens may also have -hover/-focus/-disabled variants); use ONLY names
from that list. Apply via Tailwind arbitrary-value utilities referencing the variable
WITH a neutral fallback inside var(), e.g. bg-[var(--ds-color-surface,#ffffff)],
text-[var(--ds-color-text,#0f172a)], border-[var(--ds-color-border,#e2e8f0)]. Do not hardcode a
palette color for themable surfaces/text/borders. Dark mode is handled by the design system variables.

## Guardrails

- No Shadow DOM styles, no molecule/web-component tags, no group names such as groupviewtable.
- Use Tailwind utility classes for LAYOUT (spacing, flex/grid, sizing, radius); keep cards at
  rounded-lg or less.
- Inputs bind value from shared properties; input/change/click events bind only to existing shared
  handlers; no inline this.field = value assignment. Inline arrows only to pass item context to an
  existing shared handler.
- Render must compile even when optional layout hints or pageObjective fields are missing; prefer
  omitting an interaction over inventing one.
- Every visible text uses typed this.msg['<exact key>'] access; never a cast or a getMsg-style helper.
- Never use this.purpose. Do not use page definition i18n; it is intentionally absent.
`;
