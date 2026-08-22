/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Page21 Render TS Skill (goal-first)

Generate the Lit render file for the SECOND genome of a Stage 2 frontend page: web/desktop/page21.
This is the goal-first variant. It has the SAME contract, shared base class and closed vocabulary as
page11, but its layout was designed around the page objective, so it uses richer presentation
patterns instead of the plain "list on top, form below" baseline.

This file extends the shared base class and only renders. It must not own state, define handlers or
duplicate i18n. All the page11 guardrails apply unchanged — this skill only WIDENS presentation.

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

Definition is the page21 .defs.ts object:
- page metadata
- baseClassName: the deterministic shared base class that this page must import and extend
- pageObjective: the synthesized goal for this page (actor, jobToBeDone, primaryDecision,
  decisiveInfo, usageFrequency, criticalActions[{action,presentation}], informationHierarchy,
  successCriteria, antiPatterns). Use it to drive ordering, density and how each action is presented.
- purpose: what this page is FOR, in the l4 author's words
- presentation.categoryRef: the UX category this workspace was classified as
- dataBindings[]: THE source of truth for structure — one entry per bffCall, each with "command",
  "kind" (query|command), "stateKey" and "inputs[]" ({ name, stateKey, source, required }). There is NO
  layout/sections block: the EXPERIENCE SKILL appended after this one says WHICH experience to build,
  and you wire it to these bindings.

The page21 definition, like page11, must not contain i18n values. All visible text comes from the
shared context (compiled .d.ts or raw .ts).

## Mandatory first step (identical to page11)

Read the shared base-class context (compiled .d.ts, or raw .ts as fallback) before writing code and extract:
1. Base class name from export class.
2. Every @property() field name (its JSDoc 'state <stateKey>' links it to layout stateKeys).
3. Every method whose name starts with handle (its JSDoc names the action it belongs to).
4. Every action method and its JSDoc (inputs, output states, status state, feedback keys).
5. Every msg/message key it offers — the MENU of already-translated text you may REFERENCE from the page
   i18n block (through s_<locale>), not the vocabulary of this.msg. this.msg keys are the SHORT ones you
   declare in the skeleton's block.
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
a render workaround. Never invent property names or handler names. msg keys are the
opposite: you DO invent them — short, in the skeleton's i18n block, in every locale.
Import DTO types EXCLUSIVELY from the shared module — it re-exports every contract type this page can
need. Never import from the contracts module (it is not in context and the page must not depend on it).

## File shape (identical rules to page11)

- MLS header from the target outputPath (web/desktop/page21/...), enhancement="_102020_/l2/enhancementAura".
- import { html, nothing } from 'lit'; import { customElement } from 'lit/decorators.js';
  (nothing is the Lit sentinel for an empty branch - see the EMPTY BRANCHES rule below.)
- import Definition.baseClassName exactly from /_{project}_/l2/{moduleName}/web/shared/{pageName}.js (.js, never .ts).
- @customElement tag from the outputPath using convertFileToTag (insert "-" before an uppercase that
  follows a lowercase/digit, lowercase, folder "/" -> "--", append "-{project}"). The folder is
  {moduleName}/web/desktop/page21, so the tag contains "--desktop--page21--". Never collapse camelCase.
- export class {ModulePascal}DesktopPage21{PagePascal}Page extends Definition.baseClassName
- The only class method is render().

Do not add @property fields. Do not add helper methods that mutate state or call setState. Do not
duplicate i18n objects. Local const helpers inside render() (pure formatting, grouping, filtering of
already-loaded shared data) are allowed and expected for the richer patterns below.

EMPTY BRANCHES (mandatory - a violation renders source code as text on the screen):
In a template conditional, the FALSE branch must be the Lit sentinel "nothing", IMPORTED FROM 'lit'
(plain null is also accepted). NEVER declare a function to stand in for the empty branch. A local
"function nothing()" returning an empty html template, combined with a bare "nothing" in the template,
passes the FUNCTION OBJECT to Lit, which paints the function's own source code into the DOM. This
happened in production on a page21 workspace: the screen showed the literal text
"function nothing() { return b of nothing }". The same applies to any invented name (nothingOrEmpty,
nothingPlaceholder, emptyTpl, ...). A generated page therefore has NO module-level function declarations
when a helper is used by name. Declaring one at module level is fine — just always CALL it.
Class methods are RENDER FUNCTIONS only: render() plus any number of render<Name>() returning
TemplateResult. Split the page - render() composes, each organism gets its own render<Name>() - and
ALWAYS call them, this.renderBoard(), never pass one by name: a bare \${this.renderBoard} in a template
makes Lit paint the method source onto the screen. The allowed const helpers live INSIDE a render
function.

## Mapping the contract to render (same binding rules as page11)

Choreograph from Definition.dataBindings[] under the experience skill's direction: a "query" binding is
a surface, a "command" binding is an action on the surface it belongs to. The text catalog lives in THIS file - the i18n
block of the skeleton - and YOU decide which keys exist. Reference shared text through s_<locale> with a
SHORT key (never copy the string: the reference is what keeps this page translated), and invent the copy
this experience needs with short keys too. Repeat EVERY key in each locale const, translated; a missing
or misspelled key does not compile.
Access messages ONLY as typed member access on this.msg using the exact key string. Read it once per
render function - const msg = this.msg; - then use msg['key'].
this.msg resolves to the getter THIS file defines below the i18n block - the base class you extend does
NOT provide msg, so deleting the block (as four pages of a real run did) is a TS2339 with no text at all.
NEVER cast this.msg and NEVER wrap it in a getMsg/t helper.
NEVER write a visible literal into the template: it is untranslatable and it compiles clean, which is how
a whole page once shipped in English. If you need a word, add a key.

For every field/column/filter: resolve field.stateKey to the shared property whose JSDoc says
'state <that stateKey>', then use that property name exactly. If no shared state/property exists,
render read-only or skip; never invent a property. businessContext states (per JSDoc kind) render as
a compact current-company/current-unit badge. queryResult states — read outputShape from the property
JSDoc: "array" -> rows are the property; "paginated" -> rows are the property's DECLARED collection
field (the array-typed key of the contract Output, e.g. property.stockItems — NOT a hardcoded ".items";
fallback []); "object" -> summary/detail block, iterating any array-typed fields by their declared name.

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
- **landing / content organisms** (organism.type 'content'/'showcase'; intent hero/banner/richText/
  imageSet/ctaLink/showcase): a marketing/landing composition — a hero (title/subtitle from msg keys) at
  the top, a showcase card grid fed by its query state (same reading rules as a list, rendered as cards),
  and a ctaLink bound to the shared navigation handler (or an <a href> to the layout-provided target
  route, else a disabled button — never a fabricated route). An imageSet/hero image with NO data field
  behind it is a neutral placeholder box; never INVENT an image URL.

DATA-BOUND IMAGES (mandatory when the field exists): a DTO/row field that holds an image URL — its name
ends in imageUrl / photoUrl / logoUrl / avatarUrl / pictureUrl / thumbnailUrl — MUST be rendered as a real
image, never as the raw URL text and never as a placeholder box. This is NOT "inventing a URL": the value
comes from the BFF. Bind it and keep an empty branch, e.g. for a row/card variable named item:
    item.imageUrl ? html(img src=item.imageUrl alt=item.name loading lazy) : nothing
Always set alt from the row's own name/title field (empty string when there is none) and loading="lazy"
inside lists/grids. Give the img a bounded size with layout utilities (never a raw width attribute) so one
asset cannot blow up the grid. Observed failure this rule fixes: listMenuItems and queryMenuItems both
returned imageUrl for every row and NO generated page contained an img tag, so the seeded photos were
invisible in the app.

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

## Design system colors (identical to page11)

Color comes from design-system tokens, never hardcoded palettes. The context provides the token
NAMES as a compact list (base tokens may also have -hover/-focus/-disabled variants); use ONLY names
from that list — the names below are ILLUSTRATIVE. Apply via Tailwind arbitrary-value utilities
referencing the variable WITH a neutral fallback inside var(), e.g. bg-[var(--surface-bg,#ffffff)],
text-[var(--text-default,#0f172a)], border-[var(--border-default,#e2e8f0)]. Do not hardcode a
palette color for themable surfaces/text/borders. Dark mode is handled by the design system variables.

RESPECT THE TOKEN'S ROLE. A token ending in -bg is a BACKGROUND and NEVER a text color; one ending in
-text is a text color and never a background. A surface painted with <role>-bg MUST label itself with
the <role>-text of the SAME role — bg-[var(--button-primary-bg)] pairs with
text-[var(--button-primary-text)]. A -bg token in a text utility looks fine only while the hardcoded
fallback applies; with the theme on, the label becomes invisible.

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
