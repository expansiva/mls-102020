/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageRender.ts" enhancement="_blank"/>

export const skill = `
# Lit WebComponent Render Generator

You generate the **page render** TypeScript file — a Lit 3 WebComponent that extends the Shared base class and only implements \`render()\`.
All state, all methods, and all i18n live in the base class. You NEVER invent names. You read the base and use what is there.

---

## What you receive

- \`## Definition\`: the **page spec** JSON — \`pageId\`, \`pageName\`, \`actor\`, \`purpose\`, \`layout\`, \`sections[]\`, \`navigationRefs[]\`.
  Prefer \`definition.layout.sections[]\` as the source of truth. \`definition.sections[]\` is only a compact compatibility summary.
  Each layout section: \`sectionName\`, \`mode\`, \`organisms[]\`.
  Each organism: \`organismName\`, \`purpose\`, \`userActions[]\`, \`requiredEntities[]\`, \`readsFields[]\`, \`writesFields[]\`, \`molecules[]\`.
  Each molecule contains semantic UI intent plus \`stateKey\`, field \`stateKey\` and action \`actionKey\` when available.
  Each navigationRef: \`direction\` ("inbound" | "outbound"), \`pageId\`, \`trigger\`.
- \`## Context Files\`: the already-generated source files for this page.
  The shared base class \`.ts\` file is listed here — it contains the real class name, all \`@property()\` declarations, all handler methods, and the i18n message object.
  The contract \`.ts\` file may also be listed here for type reference.
- \`##User info\`: JSON with \`moduleName\`, \`device\`, \`type\`, \`project\`, \`item.outputPath\`.
- \`##Design System\` (optional): component and styling guidelines.

---

## MANDATORY FIRST STEP — read base class structure from the actual source

Open the shared base class file in \`## Context Files\` and extract the four lists below.
**Never guess, derive, or invent names.** Every identifier you use in \`render()\` must exist in that source file.

### List 1 — Reactive properties
Read every \`@property()\` declaration from the base class source.
Record the exact property name and type as declared.

> **CRITICAL:** Use only the property names found in the source.
> Never assume a property exists based on command names or conventions.
> If a field is not declared as \`@property()\` in the source, it does not exist.

### List 2 — Handler methods
Read every method whose name starts with \`handle\` from the base class source.
Record the exact method name and signature as declared.

> **CRITICAL:** Only bind events to methods that are actually in List 2.
> Never invent handler names from command names or navigation targets.

### List 3 — i18n keys
Read the \`message_pt\` (or \`message_en\`) object from the base class source.
Record every key name exactly as it appears.

> **CRITICAL:** Only use \`this.msg.{key}\` for keys that exist in List 3.
> Never invent i18n key names.

### List 4 — Base class name and import path
Read the \`export class\` declaration from the source to get the exact class name (e.g. \`CafeFlowPainelCozinhaBase\`).
Read the file path from the \`## Context Files\` header to build the import path.

These four lists are the ONLY names you may use inside \`render()\`.
Do not reference any property, method, or i18n key that is not in these lists.

---

## File structure

### 1. MLS header
\`item.outputPath\` from \`##User info\`, strip leading \`/\`:
\`\`\`
/// <mls fileReference="{item.outputPath without leading /}" enhancement="_102027_/l2/enhancementLit.ts" />
\`\`\`
> **MANDATORY:** The \`enhancement\` attribute must always be exactly \`_102027_/l2/enhancementLit.ts\`.
> Never change it, never leave it blank, never use \`_blank\` or any other value.

### 2. Imports
\`\`\`typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { {BaseClassName} } from '{baseClassImportPath}';
\`\`\`
- \`BaseClassName\` = the exact class name read from the base class source in List 4 (e.g. \`CafeFlowPainelCozinhaBase\`)
- \`baseClassImportPath\` = the MLS path from the \`## Context Files\` header for the shared file, prefixed with \`/\` and with \`.ts\` replaced by \`.js\`
  - Example: header shows \`_102043_/l2/cafeFlow/web/shared/fechamentoTurno.ts\` → import path is \`/_102043_/l2/cafeFlow/web/shared/fechamentoTurno.js\`
  - **NEVER** use relative paths (\`../\`, \`./\`). Always use the full absolute MLS path starting with \`/\`.
- For every molecule rendered (organisms with \`molecules[]\`), add ONE side-effect import per distinct molecule, using its exact \`import\` value — this registers the custom element:
  \`\`\`typescript
  import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
  \`\`\`
  Never duplicate a molecule import; never alter the path.
- No other imports unless a Lit directive (e.g., \`repeat\`) is genuinely needed

### 3. Class

**Tag name** and **class name** are derived from \`item.outputPath\` (e.g. \`_102043_/l2/cafeFlow/web/desktop/page11/cardapioEstoque.ts\`):

| Part | Source | Conversion rule | Example |
|---|---|---|---|
| \`{project}\` | number between \`_\` in path | as-is | \`102043\` |
| \`{kebab-module}\` | path segment after \`l2/\` | camelCase → kebab-case | \`cafeFlow\` → \`cafe-flow\` |
| \`{device}\` | path segment after \`web/\` | as-is (already lowercase) | \`desktop\` |
| \`{kebab-page}\` | filename without \`.ts\` | camelCase → kebab-case | \`cardapioEstoque\` → \`cardapio-estoque\` |

> **camelCase → kebab-case rule:** insert a hyphen before each uppercase letter and lowercase everything.
> \`cafeFlow\` → \`cafe-flow\` | \`cardapioEstoque\` → \`cardapio-estoque\` | \`painelCozinha\` → \`painel-cozinha\`

Full tag pattern: \`{kebab-module}--web--{device}--page11--{kebab-page}-{project}\`

Example: \`_102043_/l2/cafeFlow/web/desktop/page11/cardapioEstoque.ts\`
→ tag: \`cafe-flow--web--desktop--page11--cardapio-estoque-102043\`
→ class: \`CafeFlowDesktopPage11CardapioEstoquePage\`

> **MANDATORY:** \`Prefix\` and \`PageNamePascal\` in the class name must match the base class name from List 4 exactly.
> If List 4 says the base is \`CafeFlowPainelCozinhaBase\`, the render class must be \`CafeFlowDesktopPage11PainelCozinhaPage\` — same \`CafeFlow\` prefix and \`PainelCozinha\` page name.

\`\`\`typescript
@customElement('{tag}')
export class {ClassName} extends {BaseClassName} {
  render() {
    // Extract busy booleans from action-state props (only for props that exist in List 1):
    const saveBusy    = this.save    === 'loading';
    const cancelBusy  = this.cancel  === 'loading';

    return html\`
      <!-- page markup -->
    \`;
  }
}
\`\`\`

Do not add \`@property\`, class fields, helper methods, lifecycle methods, or local state to this render class.
The only method in the class must be \`render()\`.

---

## Molecules (Design System components)

Some organisms carry a \`molecules[]\` array — design-system components already chosen for them.
Each molecule: \`group\`, \`tag\`, \`purpose\`, \`import\`.

**When an organism has a non-empty \`molecules[]\`, build its UI with those components instead of
hand-coding the raw control (input, table, card, button group, etc.).** Raw HTML controls are only
the fallback for organisms with NO assigned molecule. Never change the molecule choice.

### Using a molecule
- The \`tag\` is the exact custom element name — use it verbatim as an element:
  \`<{tag}> ... </{tag}>\`. Example: \`<groupviewcard--ml-vertical-card></groupviewcard--ml-vertical-card>\`.
- For each distinct molecule, add its side-effect import (see "## Imports"), using the exact \`import\` value.
- Wire data/events to the SAME base-class names you already use — never invent names:
  - bind the molecule's value to the matching reactive prop from List 1 (e.g. \`.value=\${this.items}\`);
  - bind the molecule's events to the matching handler from List 2 (Rule A/B below).
- If the molecule's usage documentation is provided in \`##Design System\`/context, follow its exact
  property and event names. If it is NOT provided, place the element binding its value to the matching
  List 1 prop and the most fitting List 2 handler, and do not invent other attributes.

---

## How to bind events

### Rule A — base class has a matching handler → use direct method reference (no parens, no arrow)
\`\`\`typescript
// handler in base: handleSaveClienteSubmit(event: SubmitEvent)
<form @submit=\${this.handleSaveClienteSubmit}>

// handler in base: handleCancelCadastroClick()
<button @click=\${this.handleCancelCadastroClick}>

// handler in base: handleValidateCpfCnhClick()
<button @click=\${this.handleValidateCpfCnhClick}>
\`\`\`

### Rule B — no handle method for this interaction → no interactivity

The render class must not mutate shared state directly.
Never write inline arrows like \`() => { this.field = ... }\`.
If a user-editable field has no handler in List 2, render it disabled/read-only or skip that interaction.
Inline arrows are allowed only to pass item context into an existing shared handler, such as navigation params.

The decision tree for every interactive element:
0. Does the organism have a molecule for this need (\`molecules[]\`)? → render the molecule element (see "## Molecules") and bind its value/events using the rules below.
1. Is this a **navigation action** (outbound navigationRef trigger)? → Rule C (see below)
2. Does List 2 (from the actual base class source) have a \`handle*\` method that fits this action? → Rule A
3. Is there no shared handler? → Rule B
4. Neither → do not add interactivity (the feature does not exist in the base)

### Rule C — outbound navigation (always state-driven, never \`href\` routing)

Navigation is triggered **only** by calling \`handleNavigateTo{PageIdPascal}Click\` from List 2.
Never use \`<a href="...">\` for intra-app navigation.

**Case 1 — navigation from a standalone element (no item context):**
Use Rule A (direct method reference, no parens):
\`\`\`typescript
<button @click=\${this.handleNavigateToCatalogPageClick}>
  \${this.msg.navigateToCatalogPage}
</button>
\`\`\`

**Case 2 — navigation from inside a collection (item has context data to pass):**
Use an inline arrow to forward the relevant item fields as params:
\`\`\`typescript
\${(this.items ?? []).map((item: any) => html\`
  <div>
    ...item fields...
    <button @click=\${() => this.handleNavigateToProductServiceDetailPageClick({ itemId: item.itemId })}>
      \${this.msg.navigateToProductServiceDetailPage}
    </button>
  </div>
\`)}
\`\`\`

**How to find which organisms trigger navigation:**
Cross-reference List 4 (outbound targets) with organism \`userActions[]\`:
- If an organism's \`userActions\` contains text matching (or semantically equivalent to) a \`trigger\`, that organism owns the navigation button.
- If no organism matches, render the navigation button as a standalone CTA in the most logical section.

**Inbound navigationRefs require no render code** — the page receives incoming context via
\`consumeExpectedNavigationLoad()\` in the base class \`connectedCallback\`.

---

## How to map organisms to sections

Use \`## Definition.layout.sections\` sections and organisms to understand what to show and where.
If \`definition.layout.sections\` is absent, use \`definition.sections\` as legacy fallback.
Use \`##Base Class\` lists to decide exactly how to show it.

**Molecule-first:** if an organism has \`molecules[]\`, render it with those components (see "## Molecules").
The organism-type patterns below (read-only / collection / form / action) are the fallback for organisms
with NO assigned molecule.

**Before mapping organisms**, scan List 2 for outbound navigation handler methods and List 4 (from \`## Definition\` navigationRefs) to identify which organisms own navigation buttons (match \`trigger\` against \`userActions\`). Navigation buttons are part of those organisms — they are not separate sections.

### Read-only organism (\`writesFields\` empty, \`userActions\` empty)
Render a display panel. For each field in \`readsFields\`:
- Find the matching reactive prop in List 1
  - Field \`"Cliente.nome"\` → if List 1 has \`this.nome\` → \`\${this.nome ?? ''}\`
  - Field \`"Cart.subtotalAmount"\` → if List 1 has \`this.cart\` → \`\${this.cart?.subtotalAmount ?? 0}\`
- If no matching prop exists in List 1, skip that field

### Collection organism (primary entity has an array prop in List 1)
\`\`\`typescript
\${(this.items ?? []).map((item: any) => html\`...\`)}
\`\`\`

### Form organism (\`writesFields\` non-empty)
- Find the \`handleXxxSubmit\` method in List 2 that matches this form's action → bind with Rule A
- Bind each input value to the matching reactive prop from List 1 and bind \`@input\`/\`@change\` only to an existing shared handler from List 2.
- Prefer handlers generated from shared state setter actions, e.g. \`handleCreateOrderCustomerNameChange\`.
- If no handler exists, render the field read-only; never assign \`this.field = ...\` in the render layer.
- Submit button: \`?disabled=\${saveBusy}\`, label must use two distinct keys:
  \`\`\`typescript
  \${saveBusy ? this.msg.{commandName}Loading : this.msg.{commandName}Label}
  \`\`\`
  NEVER put the same \`this.msg.*\` key in both branches of any ternary — that renders the condition useless.

### Action organism (\`userActions\` non-empty, no form)
- Find the \`handleXxxClick\` in List 2 that matches the action → bind with Rule A
- \`?disabled=\${actionBusy}\`
- Button label **must** use a ternary with **two distinct keys** from List 3:
  \`\`\`typescript
  \${actionBusy ? this.msg.{commandName}Loading : this.msg.{commandName}Label}
  \`\`\`
  - \`{commandName}Label\` → the idle/default label (e.g. "Confirmar Pedido")
  - \`{commandName}Loading\` → the in-progress label (e.g. "Confirmando...")
  - NEVER use the same key in both branches of the ternary — that makes the condition useless.

---

## Design

Design for the \`purpose\` and \`actor\` from the \`## Definition\`. Use Tailwind CSS.
The page must look cohesive with the molecules, which use the **slate** (neutral) + **sky**
(accent) families and are **dark-mode aware**. So the page scaffold MUST do the same.

### Dark mode is MANDATORY
Every color utility MUST be paired with its \`dark:\` counterpart — never a bare color class.
Wrong: \`bg-white text-gray-900\`. Right: \`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100\`.

### Color vocabulary (use these literal classes; align with the molecules)
| Role | Classes |
|---|---|
| page background | \`bg-slate-50 dark:bg-slate-950\` |
| surface / card | \`bg-white dark:bg-slate-900\` + \`border border-slate-200 dark:border-slate-800\` |
| text primary | \`text-slate-900 dark:text-slate-100\` |
| text secondary | \`text-slate-500 dark:text-slate-400\` |
| text muted / labels | \`text-slate-400 dark:text-slate-500\` |
| primary action | \`bg-sky-600 hover:bg-sky-500 text-white\` (focus: \`focus:ring-2 focus:ring-sky-500\`) |
| secondary action | \`border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800\` |
| success / warning / danger | \`text-emerald-600 dark:text-emerald-400\` / \`text-amber-600 dark:text-amber-400\` / \`text-red-600 dark:text-red-400\` |

### Layout scaffold
- Outer wrapper: \`min-h-full bg-slate-50 dark:bg-slate-950\`, content in a \`max-w-6xl mx-auto px-4 py-6\` container.
- **Page header**: title = \`pageName\` (\`text-2xl font-semibold text-slate-900 dark:text-slate-100\`) + subtitle = \`purpose\` (\`text-sm text-slate-500 dark:text-slate-400\`).
- Each **section** → a titled **card**: \`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5\`, section title \`text-lg font-medium\`. Use \`gap-6\` between sections, \`gap-4\` inside.

### Data presentation (richness — avoid bare \${field} dumps)
- **Collection** (array prop): render a **table** (header row \`bg-slate-50 dark:bg-slate-800/50\`, rows with \`hover:bg-slate-50 dark:hover:bg-slate-800/40\`, cell padding \`px-3 py-2\`, \`divide-y divide-slate-100 dark:divide-slate-800\`) OR a list of **cards** with a title + **label/value** pairs + actions. Never a flat list of raw values.
- **Read-only fields**: label/value rows — label \`text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500\`, value \`text-sm text-slate-900 dark:text-slate-100\`.
- **Status** (\`this.status\`): show in a banner/pill, colored by meaning (success/warning/danger classes above).
- **Loading / empty / error**: render a styled block (e.g. centered muted text, or skeleton rows), not nothing.
- **Buttons**: primary vs secondary per the vocabulary; \`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed\`.

### Scope — IMPORTANT
This styling is for the **page scaffold** (header, sections, panels) and for **fallback raw HTML**
(organisms with NO molecule). Do **NOT** add Tailwind classes inside molecule custom elements —
each molecule styles itself (including dark mode). Just place the molecule element.

### Always
- \`mode: "edit"\` → interactive; \`mode: "view"\` → read-only.
- Extract busy booleans at the top of \`render()\` — only for props in List 1.
- Guard nullable props with \`??\` and \`?.\`.
- All human-visible text via \`this.msg.*\` using only keys from List 3 — never hardcode strings, never use a key not in the base class message object.

---

## Output format rules
- No markdown fences, no explanations, no inline comments in generated TypeScript
- 2-space indentation inside the class; html template may use deeper indentation
- One blank line between top-level declarations
- The \`srcFile\` value in the JSON response must be a single-line string — escape all special characters:
  - newlines → \\n  |  tabs → \\t  |  double quotes → \\"  |  backslashes → \\\\

---
`;
