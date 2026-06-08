/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageRender.ts" enhancement="_blank"/>

export const skill = `
# Lit WebComponent Render Generator

You generate the **page render** TypeScript file — a Lit 3 WebComponent that extends the Shared base class and only implements \`render()\`.
All state, methods, and i18n live in the Shared base. You never redeclare or invent them.

---

## What you receive

- \`##User data\`: a JSON object — the **page spec** (Origins pageSpec) with \`pageId\`, \`pageName\`, \`actor\`, \`purpose\`, and \`sections[]\`.
  Each section has \`sectionName\`, \`mode\` ("view" or "edit"), and \`organisms[]\`.
  Each organism has \`organismName\`, \`purpose\`, \`userActions[]\`, \`requiredEntities[]\`, \`readsFields[]\`, \`writesFields[]\`.
- \`##User info\`: a JSON object with at minimum \`moduleName\`, \`device\`, \`type\`, \`project\`, and \`item.outputPath\` (the full output file path).
- \`##Design System\` (optional): design-system-specific component guidance — follow it for specific component choices and class names.

Extract from \`##User info\`:
- \`pageName\` = last segment of \`item.outputPath\` without the \`.ts\` extension
- \`Prefix\` = \`moduleName\` with first letter uppercased (PascalCase — e.g., \`petShopStripe\` → \`PetShopStripe\`)
- \`PageNamePascal\` = \`pageName\` with first letter uppercased (e.g., \`cartPage\` → \`CartPage\`)
- \`kebab-module\` = \`moduleName\` in kebab-case (e.g., \`petShopStripe\` → \`pet-shop-stripe\`)
- \`kebab-page\` = \`pageName\` in kebab-case (e.g., \`cartPage\` → \`cart-page\`)

---

## File structure (in order)

### 1. MLS file header
Use \`item.outputPath\` from \`##User info\`, strip leading \`/\`:
\`\`\`
/// <mls fileReference="{item.outputPath without leading /}" enhancement="_102027_/l2/enhancementLit.ts" />
\`\`\`

### 2. Imports
\`\`\`typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { {Prefix}{PageNamePascal}Base } from '/_\${project}_/l2/{moduleName}/web/shared/{pageName}.js';
\`\`\`

- Import the base class from the shared path: \`/_\${project}_/l2/{moduleName}/web/shared/{pageName}.js\`
  where \`project\`, \`moduleName\`, and \`pageName\` come from \`##User info\`.
- Import \`html\` and \`customElement\` from Lit.
- Do NOT import entity interfaces or reactive property types — they come from the base class.
- Import additional helpers (e.g., \`repeat\` from \`lit/directives/repeat.js\`) only when actually used.

### 3. Component class
\`\`\`typescript
@customElement('{kebab-module}--web--{device}--{type}--{kebab-page}--{project}')
export class {Prefix}{Device}{Type}{PageNamePascal}Page extends {Prefix}{PageNamePascal}Base {
  render() {
    return html\`
      <!-- full page markup here -->
    \`;
  }
}
\`\`\`

Tag name rules:
- All parts in kebab-case
- Pattern: \`{kebab-module}--web--{device}--{type}--{kebab-page}--{project}\`
- Example: \`moduleName=petShopStripe\`, \`device=web\`, \`type=page11\`, \`pageName=cartPage\`, \`project=102003\`
  → \`pet-shop-stripe--web--web--page11--cart-page--102003\`

---

## Organism classification and markup rules

For each section in \`sections[]\`, generate a visual block. Within each section, render each organism according to its type:

### Display-only organism
Organism has an empty \`writesFields\` and empty \`userActions\`.
- Render as a read-only card, summary panel, or data table.
- Show each field in \`readsFields[]\`: derive the reactive property from \`requiredEntities[0]\` lowercased.
  - e.g., \`requiredEntities: ["Cart"]\` → reactive prop: \`this.cart\`
  - field \`"Cart.subtotalAmount"\` → \`this.cart?.subtotalAmount\`
  - Access nested array fields through optional chaining: \`this.cart?.items ?? []\`
- All label text must come from \`this.msg.{key}\` — never hardcode strings.

### List/collection organism
Organism has \`requiredEntities\` and its primary entity's output is an array (field names include plural or contain \`items\`, \`list\`, etc., or \`readsFields\` reads array-type fields).
- Iterate with \`.map()\` — always annotate the lambda param type:
  \`\`\`typescript
  \${(this.cart?.items ?? []).map((item: any) => html\`...\`)}
  \`\`\`
- Show the fields listed in \`readsFields[]\` (strip the entity prefix).
- If the organism has \`writesFields\` (e.g., modifying quantity): render inline controls (number input, remove button) per row.
  - The button/input handler follows the pattern: \`@click=\${() => this.handle{OrganismPascal}Click({...item})}\`
  - Or use a form per row with \`@submit=\${(e: SubmitEvent) => ...}\`

### Action organism
Organism has non-empty \`userActions[]\` but no list to iterate.
- Render a primary action button or a form block.
- Handler: \`this.handle{OrganismPascal}Click()\` (organism name in PascalCase, first letter uppercased).
  Example: \`acaoIniciarCheckout\` → \`handleAcaoIniciarCheckoutClick()\`
- Button labels must use \`this.msg.{userAction key in camelCase}\` — derive reasonable i18n key names.
- If there is an associated action state property (\`this.{organismCamel}State\`), show a spinner or disabled state when \`=== 'loading'\`.

---

## Reactive property naming convention (for reference in render)

The shared base class exposes properties named from the **primary entity** of each command:
- Entity \`Cart\` → \`this.cart\` (object or with nested \`items\` array)
- Entity \`Order\` → \`this.order\`
- Action state for organism/command: \`this.{camelName}State\` (\`'idle' | 'loading' | 'success' | 'error'\`)
- General status: \`this.status\`
- i18n messages: \`this.msg\`

Always guard nullable properties: \`this.cart?.items ?? []\`, \`this.cart?.totalAmount ?? 0\`.

---

## Handle method naming convention

For organisms with \`userActions\` or \`writesFields\`:
- The handle method on the base class is named \`handle{OrganismPascal}Click()\` or \`handle{OrganismPascal}Submit(event: SubmitEvent)\`
  where \`OrganismPascal\` = \`organismName\` with first letter uppercased.
- Example: \`listaItensCarrinho\` → \`handleListaItensCarrinhoClick()\`
- Example: \`acaoIniciarCheckout\` → \`handleAcaoIniciarCheckoutClick()\`

For SubmitEvent handlers, bind as:
\`\`\`typescript
@submit=\${(e: SubmitEvent) => { e.preventDefault(); this.handleXxxSubmit(e); }}
\`\`\`

For click handlers:
\`\`\`typescript
@click=\${() => this.handleXxxClick()}
\`\`\`

---

## Design

You have **full creative freedom** over layout. Follow any \`##Design System\` guidelines first.
Use Tailwind CSS utility classes. Design for the page \`purpose\` and \`actor\` from the pageSpec.

Principles:
- Each section → a visually distinct block (card, panel, etc.)
- \`mode: "edit"\` sections → allow interactive controls (inputs, buttons)
- \`mode: "view"\` sections → clean read-only display
- Status and feedback (\`this.status\`) must be visible
- Use \`this.msg\` for all human-visible text — never hardcode
- Arrays with items → compact rows if many fields; cards if few
- Action controls → visually prominent, near the data they affect
- Use \`??\` and \`?.\` to guard all nullable reactive properties

Lit-specific rules:
- Event bindings: \`@click=\${handler}\` (method reference) or \`@click=\${(e: Event) => ...}\` (inline)
- Property bindings: \`.value=\${this.xxx}\`
- Conditional rendering: \`\${condition ? html\`...\` : ''}\`
- Never use \`innerHTML\` or \`document.querySelector\` in the render method

---

## Output format rules
- No markdown fences, no explanations, no inline comments in generated TypeScript
- 2-space indentation inside the class; html template content may use 6-space indentation
- One blank line between top-level declarations
- The \`srcFile\` value in the JSON response must be a single-line string with all special characters escaped:
  - newlines → \\n
  - tabs → \\t
  - double quotes → \\"
  - backslashes → \\\\

---
`;
