/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Page11 Render TS Skill

Generate the Lit render file for one Stage 2 frontend page genome: web/desktop/page11.
This file extends the shared base class and only renders. It must not own state, define handlers or duplicate i18n.

## THE SKELETON COMES FIRST

The human message ends with a "## Skeleton — complete this file" section holding the FULL file, already
written for you. You are NOT writing a file from scratch: you take that exact text, replace every
\`/* to implement */\` marker with your code, and return the whole thing.

Keep verbatim: the mls header, the imports, the CATALOGUE BLOCK between the
\`/// **collab_i18n_start**\` and \`/// **collab_i18n_end**\` markers, the tag name, the class name, and
the \`msg\` getter. Do not re-derive them, do not reorder them, never add a second catalogue block,
never write your own \`get msg\`.

The block the skeleton hands you is named \`pageMessage_<locale>\` (or \`o<N>Message_<locale>\` in a split
organism), with the type \`PageMessageType\` (\`O<N>Msg\`) and the map \`pageMessages\` (\`o<N>Messages\`).
Those are the ONLY names — there is no \`collab_i18n_<lang>\` const and you must not create one. If you
rename or rebuild that block, the file stops compiling:

- **The LOCALE SET is the skeleton's, exactly.** One const per locale it emitted, no more, no fewer.
  Adding a language is \`@@addLanguage\`'s job, which runs AFTER generation; a locale you invent here has
  no translation and breaks the type.
- **Never \`as const\` on a catalogue.** The first const defines the type by inference; with \`as const\`
  its values become literal types and every OTHER locale fails TS2322. Real defect (petShop 22/08):
  three \`collab_i18n_*\` consts with \`as const\` plus \`type CollabI18n = typeof collab_i18n_pt\` = 6
  errors in 2 files.
- The default locale is the only one WITHOUT an annotation; every other one keeps its \`: PageMessageType\`.
  That is what makes a missing key TS2741 and a typo TS2353 instead of a silent untranslated screen.

Anything below that contradicts the skeleton loses to the skeleton.

Never annotate the return type of a render method. A helper that returns the Lit sentinel \`nothing\` for
an empty branch is NOT a TemplateResult, so \`: TemplateResult\` (or \`: ReturnType<typeof html>\`) is a
TS2322 error. Let TypeScript infer it.

ONE exception, and it is not optional: a helper that is RECURSIVE — it calls itself, directly or through
another helper — cannot be inferred at all (TS7023/TS7024, "implicitly has return type 'any' because it
is referenced directly or indirectly in one of its return expressions"). Annotate exactly that helper,
and only it, with the union the body really returns:

\`\`\`ts
const renderRecord = (value: unknown): TemplateResult | typeof nothing => { … renderRecord(child) … };
\`\`\`

Real defect (petShop 22/08, \`page11/petServiceOverviewView.ts\`): a recursive \`renderRecord\` with no
annotation = 2 errors. Non-recursive helpers keep following the rule above: no annotation.

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
5. Every msg/message key it offers — that is the MENU of already-translated text you may REFERENCE from
   the page i18n block (through s_<locale>), not the vocabulary of this.msg. this.msg keys are the SHORT
   ones you declare in the skeleton's block.
6. Re-exported contract type names (export type { ... }).

Use only those names in render().

**The output of a query is a CLOSED set.** Every field you read from a row — or from the single record
you pick out of it (\`const selected = rows.find(…)\`, \`rows[0]\`) — must be declared by that query's
Output interface in the shared re-exports. A field that exists only in the output of a COMMAND is read
from that command's state (\`this.cmd<X>Data\`), NEVER from the query record: the query does not return it
and the access is a TS2339. Real defect (petShop 22/08, \`page21/recordInStoreServiceAttendance.ts\`):
\`selected.serviceStartedAt\`, \`selected.completedAt\`, \`selected.pickedUpAt\`, \`selected.inStorePaymentId\`
read off \`qryLocateConfirmedServiceAppointment\`, whose output carries only the appointment's own fields —
7 errors from four fields that belong to \`registerServiceStart\`/\`registerPetArrival\`. If the screen needs
a field the query does not return, render what IS declared; adding it to the query is an l4 decision, not
a render workaround.
Never invent property names or handler names from conventions. msg keys are the opposite: you DO invent
them — short, in the skeleton's i18n block, in every locale.
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
- The only class methods allowed are RENDER FUNCTIONS: render() plus any number of render<Name>()
  returning TemplateResult (or nothing). Split the page: render() composes, each organism gets its own
  render<Name>(). A long single render() is harder for you to keep coherent and forces a full rewrite on
  every repair. ALWAYS call them - this.renderHeader() - never pass them by name: a bare
  \${this.renderHeader} inside a template makes Lit paint the method source onto the screen.

Do not add @property fields.
Do not add class methods that are not render functions. Pure helpers (formatters, grouping, mappers) may
live at module level or inside a render function — your choice; just always CALL them.
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
The rule is about the CALL, not the declaration: a module-level helper is fine — declare formatMoney,
asRows, whatever the file needs — as long as every use CALLS it. Class methods remain render functions
only.

## Mapping the contract to render

Choreograph from Definition.dataBindings[]: a "query" binding is a surface (table/list/cards/panel per
its output shape), a "command" binding is an action on the surface it belongs to. Group a command WITH
the data it acts on — never a stray form at the bottom of the page. Order by what "purpose" says matters.
TEXT: every visible string comes from this.msg, and the catalog lives in THIS file - the i18n block of
the skeleton. You decide which keys exist. Two kinds:
- text that already exists in the shared catalog: reference it, never copy the string, and give it a
  SHORT key. In the default locale: 'orders.empty': s_en['intent.changeOrder.listOrders.list.empty'].
  The reference is what keeps this page translated when the shared text changes.
- copy you invent (headings, empty states, button labels, helper text): write it with a short key too.
  Invent freely - this is where the page gets its voice.
Then repeat EVERY key in each other locale const, translated, taking shared text through that locale's
s_<locale>. A missing or misspelled key does not compile, so it cannot ship broken.
Access messages ONLY as typed member access on this.msg using the exact key string. Read it once at the
top of each render function - const msg = this.msg; - then use msg['key'].
this.msg resolves to the getter THIS file defines below the i18n block - the base class you extend does
NOT provide msg, so deleting the block (as four pages of a real run did) is a TS2339 with no text at all.
NEVER cast this.msg (no "as Record<string, string>", no "as any") and NEVER wrap it in a helper such as
getMsg/t/translate. Those erase key typing and let broken keys ship silently as empty strings.
NEVER write a visible literal into the template: a hardcoded string is untranslatable and it compiles
clean, which is exactly how a whole page shipped in English once. If you need a word, add a key.

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
- When a field in the layout/shared catalog carries enumLabels, display enumLabels[].label (user language) and keep enum[] / the stored value as the wire code. Without enumLabels, display the code. Never send the label on the wire.
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
seeded photos were invisible in the app.
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
   foi defeito real. Escreva o texto que o USUÁRIO leria — e como as chaves são suas, declare a chave
   que faltar no bloco i18n do esqueleto. Nunca um literal solto, nunca o token técnico.
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

## \`source\` is a RENDERING INSTRUCTION, not metadata

Every entry of \`inputs[]\` carries \`source\` and (when it has an origin) \`sourceRef\`. The contract is
telling you WHERE the value comes from, and therefore WHAT control to render. Ignoring it is a real defect
that shipped: a page rendered a text field with the placeholder "Selecione o projeto..." for an id the
contract said came from the page context — a field the user could type nonsense into, for a value they were
never supposed to provide.

Two vocabularies exist and BOTH must be honoured (older projects emit the first column):

| source | also written as | render THIS |
|---|---|---|
| \`userDecision\` | \`userInput\` | a normal editable control for the field's type |
| \`selection\` | \`selectedEntity\` | a PICKER over the query named in \`sourceRef\` — never a text field |
| \`pageInput\` | \`routeParam\`, \`currentWorkspace\` | read-only context: show it as text if it helps, never as an input |
| \`actorSession\` | — | resolved from the logged-in user; never rendered as a field |
| \`derived\` | \`previousStepOutput\` | comes from \`<bffId>.<field>\` of another call on this page; never typed |
| \`actorDirectory\` | — | a person picker over the role named in \`sourceRef\` (see below) |
| \`businessContext\`, \`systemDefault\` | — | context, never a field |

### The picker for \`selection\`

\`sourceRef\` names a bffCall of THIS page, so its rows are already in a shared state — the same state the
list/table for that query reads. Build the picker from it and write the chosen id into the input's
\`stateKey\`:

\`\`\`typescript
// input { name: 'projectId', source: 'selection', sourceRef: 'browseProjects', stateKey: 'ui...projectId' }
html\`<select .value=\${host.projectId} @change=\${host.setProjectId}>
  <option value="">\${msg['project.choose']}</option>
  \${(host.browseProjectsData?.projects ?? []).map(p => html\`<option value=\${p.projectId}>\${p.name}</option>\`)}
</select>\`
\`\`\`

Selecting a row of that query's own table is equally valid, and better when the row is already on screen.

### \`actorDirectory\` — no directory service exists yet

\`sourceRef\` is an actor role (\`fieldWorker\`), and the value must be a PERSON holding it. The runtime has
no people-directory endpoint today, so there is nothing to populate a picker from.

Until it exists: render the field READ-ONLY or omit it, with a short TODO comment saying the directory is
missing. Do NOT invent an endpoint, do NOT fall back to a free-text id field — a typed-in person id is
worse than an absent control, because it looks like it works.

## Charts

Apache ECharts is in the runtime and registered for you. To draw one, import the directive and put it on
an element — nothing else, no lifecycle, no init:

\`\`\`typescript
import { chart } from '/_102033_/l2/shared/chartRuntime.js';
// inside a render:
html\`<div class="h-80" \${chart(option)}></div>\`
\`\`\`

- The element MUST have a height (\`h-80\`, \`h-64\`…): ECharts measures its container, and a container of
  height 0 draws nothing.
- \`option\` is a normal ECharts option object. Registered and ready: line, bar, pie, scatter, gauge,
  funnel, heatmap, treemap, sunburst, sankey, graph, candlestick, boxplot — plus tooltip, legend, dataset,
  dataZoom, grid, toolbox, markLine/markPoint/markArea, visualMap and aria.
- NEVER import from 'echarts' or 'echarts/core' directly. Those need \`echarts.use([...])\` for every piece
  you touch, and a missing one renders a BLANK chart with no error at all.
- Resize and disposal are handled by the directive. Do not add a lifecycle method for a chart.
- To react to a click, a legend toggle or a zoom, pass HANDLERS to the directive — never a \`@chartclick\`
  binding. ECharts emits on the instance, not on the DOM, so \`@chartclick\` compiles and never fires:

  \`\`\`typescript
  html\`<div class="h-80" \${chart(option, { click: (p) => host.setFilter(p.name) })}></div>\`
  \`\`\`

  Event names are the ECharts ones: \`click\`, \`legendselectchanged\`, \`datazoom\`, \`brushselected\`.
- Every label inside the option is screen text: it comes from \`msg[...]\` like any other, never a literal.

Use a chart when the data is a comparison or a trend a table cannot show at a glance — a KPI over time, a
breakdown by category, a distribution. A list of records is still a list; do not chart it for decoration.

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
