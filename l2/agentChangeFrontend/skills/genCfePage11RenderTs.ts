/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Page11 Render TS Skill

Generate the Lit render file for one Stage 2 frontend page genome: web/desktop/page11.
This file extends the shared base class and only renders. It must not own state, define handlers or duplicate i18n.

## Input contract

Definition is the page11 .defs.ts object:
- page metadata
- baseClassName: the deterministic shared base class that this page must import and extend
- purpose: what this page is FOR, in the l4 author's words — the intent to design around
- presentation.categoryRef: the UX category this workspace was classified as
- dataBindings[]: THE source of truth for structure. One entry per bffCall of the page, each with
  "command", "kind" (query|command), "stateKey" (its result/output state) and "inputs[]"
  ({ name, stateKey, source, required }). There is NO layout/sections block: YOU choreograph the page
  from these bindings plus the shared base class surface.

The page11 definition must not contain i18n values. All visible text values come from the shared context.

Context Files:
- shared base class, normally as its compiled .d.ts (the authoritative public surface: exact typed
  msg key set, @property names, handler signatures, plus JSDoc annotations mapping states/actions —
  'state <stateKey>', 'action <actionId> ...', 'handler for action <actionId>'). When only the raw
  shared .ts is present (fallback), use it the same way; when both appear, the .d.ts wins. The shared
  module RE-EXPORTS every DTO type (input/output/row-item), so all list-item and payload types are
  imported from shared — the contract .ts is NOT part of the page context.
- design tokens section: the list of design-system token NAMES (see "Design system colors").

## Mandatory first step

Read the shared base-class context (compiled .d.ts, or raw .ts as fallback) before writing code and extract:
1. Base class name from export class.
2. Every @property() field name (its JSDoc 'state <stateKey>' links it to layout stateKeys).
3. Every method whose name starts with handle (its JSDoc names the action it belongs to).
4. Every action method and its JSDoc (inputs, output states, status state, feedback keys).
5. Every msg/message key available (MessageType).
6. Re-exported contract type names (export type { ... }).

Use only those names in render().
Never invent property names, handler names or msg keys from conventions.
Import DTO types EXCLUSIVELY from the shared module — it re-exports every contract type this page can
need. Never import from the contracts module (it is not in context and the page must not depend on it).

## File shape

Generate:
- MLS header from target outputPath, with enhancement="_102020_/l2/enhancementAura".
- import { html, nothing } from 'lit';   // nothing is the Lit sentinel for an empty branch
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

EMPTY BRANCHES (mandatory - a violation renders source code as text on the screen):
In a template conditional, the FALSE branch must be the Lit sentinel "nothing", IMPORTED FROM 'lit'
(plain null is also accepted). NEVER declare a function to stand in for the empty branch. A local
"function nothing()" returning an empty html template, combined with a bare "nothing" in the template,
passes the FUNCTION OBJECT to Lit, which paints the function's own source code into the DOM. This
happened in production: the screen showed the literal text "function nothing() { return b of nothing }".
The same applies to any invented name (nothingOrEmpty, nothingPlaceholder, emptyTpl, ...). A generated
page therefore has NO module-level function declarations at all: the only class method is render(), and
pure formatting/grouping helpers are const arrow functions declared INSIDE render().

## Mapping the contract to render

Choreograph from Definition.dataBindings[]: a "query" binding is a surface (table/list/cards/panel per
its output shape), a "command" binding is an action on the surface it belongs to. Group a command WITH
the data it acts on — never a stray form at the bottom of the page. Order by what "purpose" says matters.
Use only msg keys declared by the shared base class MessageType.
Access messages ONLY as typed member access on this.msg using the exact key string, e.g. this.msg['menuManagement.field.name.label']. The msg keys are declared in the shared .ts and are type-checked: a wrong or missing key must surface as a compile error — that is the desired behavior.
NEVER cast this.msg (no "as Record<string, string>", no "as any") and NEVER wrap it in a helper such as getMsg/t/translate. Those erase key typing and let broken keys ship silently as empty strings.
Use each key EXACTLY as it appears in the layout *Key field (which matches the shared i18n); do not shorten or re-derive it — e.g. never write 'section.board' when the declared key is 'menuManagement.section.main.title'.
The shared base class MessageType (extracted in the mandatory first step from the shared .d.ts/.ts)
is the complete closed vocabulary of this.msg keys this page may use — the page defs carries no
separate key list. NEVER use a this.msg key that is not declared in that MessageType — do not invent
presentation keys (no 'lane.registered', no 'status.x.label' unless declared) and do not abbreviate
('organism.dashboard.empty' when the shared type declares 'organism.dashboardSummary.empty' is a
compile error under strict tsc). Status/lane labels with no key in the shared MessageType are
rendered from the data value itself (e.g. item.status) or a literal with a TODO comment.
If a required key is genuinely absent from shared, render a literal string with a short TODO comment; never add a dynamic lookup that hides the missing key.

For every field/column/filter:
- Use field.stateKey to find the shared property whose JSDoc says 'state <that stateKey>'.
- Then use that property name exactly as declared in the shared context.
- If no shared state/property exists, render the control read-only or skip the value. Do not invent a property.
- If the shared state kind (from its JSDoc) is businessContext, render it as a compact current-company/current-unit badge or selector area. Do not render it as a plain technical text input and do not label it workspaceId.
- For queryResult states, read the outputShape from the property JSDoc:
  - outputShape "array": rows are the shared property itself.
  - outputShape "paginated": rows are the shared property's DECLARED collection field — read the field
    name from the contract Output type (the array-typed property, e.g. sharedProperty.stockItems), NOT a
    hardcoded ".items"; fall back to [] when missing. total/page/pageSize shown only if present.
  - outputShape "object": render a summary/detail block. If the object has array-typed fields (e.g. a
    dashboard's orders/topSellers/lowStockAlerts), iterate each by its DECLARED name for its own list.

For every action:
- Use action.actionKey or action.action to find the shared method whose JSDoc says 'action <that actionId>'.
- Bind only to a handler/method that exists in the shared context (JSDoc 'handler for action ...').
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
- detail panels for detail intentions (a detailPanel organism): render the selected/loaded object's
  fields as a read-only detail block beside or below its source list (master-detail), driven by the
  detail query's object state; empty state when nothing is selected/loaded.
- button rows for actionList intentions
- simple status lists for workflowStatus intentions
- content organisms (landing pages, organism.type 'content' or 'showcase'; intent hero/banner/richText/imageSet/ctaLink/showcase):
  - hero/banner: a prominent title/subtitle block from the organism/intention msg keys; no data binding.
  - richText: a paragraph/prose block from its msg key.
  - imageSet/hero image with NO data field behind it: render an empty placeholder box (aspect-ratio container with a neutral surface token) — never INVENT an image URL.
  - showcase: a card grid fed by its query state (same queryResult reading rules as a list, but rendered as cards); read rows from the shared property's declared collection field.

DATA-BOUND IMAGES (mandatory when the field exists): a DTO/row field that holds an image URL — its name
ends in imageUrl / photoUrl / logoUrl / avatarUrl / pictureUrl / thumbnailUrl — MUST be rendered as a real
image, never as the raw URL text and never as a placeholder box. This is NOT "inventing a URL": the value
comes from the BFF. Bind it and keep an empty branch, e.g. for a row/card variable named item:
    item.imageUrl ? html(img src=item.imageUrl alt=item.name loading lazy) : nothing
Always set alt from the row's own name/title field (empty string when there is none) and
loading="lazy" inside lists/grids. Give the img a bounded size with layout utilities (never a raw width
attribute) so one asset cannot blow up the grid. Observed failure this rule fixes: listMenuItems and
queryMenuItems both returned imageUrl for every row and NO generated page contained an img tag, so the
seeded photos were invisible in the app (todo/runtime/bugimage.md).
  - ctaLink: a navigation link/button. Bind it to the shared navigation action if one exists (JSDoc 'handler for action ...'); otherwise render an <a href> to the target route when the layout provides one, else a disabled button. Never fabricate a route.
- for every command action, render a textual feedback region driven by its action status: success uses the success feedback key from the action's JSDoc ('feedback keys'); error uses the AppError text from the error state when present, otherwise the error feedback key. It must be dismissible and must never be only an icon or glyph.
- represent loading consistently: query/list intentions show a placeholder or skeleton while their query state is loading; command buttons show a spinner/progress label and are disabled while their action is loading.
- collapse repeated hierarchy: render the page title once as h1. A section/organism/intention title that resolves to the same message as its parent must not be rendered again. Use the next distinct title as h2, then render blocks without another repeated title.
- use the Definition.visualStyle direction when it exists. Translate only evidenced signals into layout density: data-dense/status-driven favors compact tables and grouped statuses; dashboard-first favors summary before detail; otherwise retain the simple operational layout. Do not invent colors, chart data or components from the style string.

Do not import or render molecule packages in page11.
Do not render custom molecule/web-component tags.
Do not use group names such as groupViewTable or tags such as groupviewtable--ml-data-table.

Keep cards at rounded-lg or less. Use Tailwind utility classes for LAYOUT (spacing, flex/grid, sizing, radius).

## Regras invioláveis de experiência (as 4 reincidentes — cada uma tem check no gate)

1. VOCABULÁRIO INTERNO NUNCA VIRA TEXTO DE TELA. displayHint, intent id, state key, nome de bffCall e
   ids de binding são fiação, não copy. Um tile intitulado "Summary first" (o displayHint humanizado)
   foi defeito real. Escreva o texto que o USUÁRIO leria; se não há msg key declarada para ele, use
   literal com TODO — nunca o token técnico.
2. page / pageSize / sortBy / offset / limit NUNCA SÃO CAMPOS DE FORMULÁRIO. São controle da coleção:
   paginação é o pager da própria superfície, ordenação é o cabeçalho da coluna. Ninguém digita um
   "page size" num form.
3. RESPEITE "source" DE CADA INPUT (dataBindings[].inputs[].source) — é o que decide se o input pode ser
   um campo:
   - "userInput"/"userDecision" → campo de formulário normal;
   - "selectedEntity"/"selection" → vem de SELECIONAR uma linha da superfície, e a seleção ALIMENTA o
     form/painel do comando. Nunca um painel "Update" órfão com campos vazios, nunca um input de id;
   - "routeParam"/"pageInput" → vem do contexto/rota, não renderiza como campo;
   - "actorSession"/"businessContext" → do usuário logado, NUNCA editável;
   - "derived" → encadeado do output anterior, somente leitura.
4. DISCIPLINA DE TÍTULOS E AÇÕES DESTRUTIVAS: o título da página aparece 1× (o shell já mostra o nome —
   não repita); um heading nunca repete o label do botão/link vizinho (se o botão diz "Aprovar", o
   heading acima dele diz outra coisa ou não existe); no máximo UMA ação destrutiva por superfície,
   nunca como botão default de linha, e sempre com confirmação que NOMEIA o registro.

## Design system colors

Color must come from the design-system tokens, not hardcoded palettes. This keeps page11 plain (no
molecules) but themed by the project's design system.
- The context provides the design-system token NAMES as a compact list (token "<t>" -> CSS variable
  var(--<t>)). Use ONLY names from that list; when the list says base tokens also have -hover/-focus/
  -disabled variants, those variants are valid too. If no token list is present, use neutral
  fallbacks only.
- Apply colors via Tailwind arbitrary-value utilities that reference the variable, e.g.
  bg-[var(--surface-bg)], text-[var(--text-default)], border-[var(--border-default)],
  and the primary button pair for main actions. The names above are ILLUSTRATIVE — always use the exact
  names from the context list.
- RESPECT THE TOKEN'S ROLE. A token whose name ends in -bg is a BACKGROUND and NEVER a text color; a
  token ending in -text is a text color and never a background. A surface painted with <role>-bg MUST
  label itself with the <role>-text of the SAME role: bg-[var(--button-primary-bg)] goes with
  text-[var(--button-primary-text)]. Putting a -bg token in a text utility yields text that is invisible
  once the theme applies (it only looks right while the hardcoded fallback is in effect).
- ALWAYS include a neutral fallback INSIDE the var() so the page still renders when the design system
  or a token is absent, e.g. bg-[var(--surface-bg,#ffffff)], text-[var(--text-default,#0f172a)],
  border-[var(--border-default,#e2e8f0)]. Never emit a token reference without a fallback.
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

## Guardrails

- Render must compile even when some optional layout hints are missing.
- Prefer omitting an interaction over inventing one.
- Every visible text uses typed this.msg['<exact key>'] access; never a cast or a getMsg-style helper.
- Never use this.purpose; shared/base classes do not expose a purpose property.
- Do not use page definition i18n; it is intentionally absent.
`;
