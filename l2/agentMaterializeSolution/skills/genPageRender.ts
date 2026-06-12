/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageRender.ts" enhancement="_blank"/>

export const skill = `
# Lit WebComponent Render Generator

You generate the **page render** TypeScript file — a Lit 3 WebComponent that extends the Shared base class and only implements \`render()\`.
All state, all methods, and all i18n live in the base class. You NEVER invent names. You read the base and use what is there.

---

## What you receive

- \`##User data\`: the **page spec** JSON — \`pageId\`, \`pageName\`, \`actor\`, \`purpose\`, \`sections[]\`, \`navigationRefs[]\`.
  Each section: \`sectionName\`, \`mode\`, \`organisms[]\`.
  Each organism: \`organismName\`, \`purpose\`, \`userActions[]\`, \`requiredEntities[]\`, \`readsFields[]\`, \`writesFields[]\`.
  Each navigationRef: \`direction\` ("inbound" | "outbound"), \`pageId\`, \`trigger\`.
- \`##User info\`: JSON with \`moduleName\`, \`device\`, \`type\`, \`project\`, \`item.outputPath\`.
- \`##Base Class\`: the **shared defs spec** — the \`commands\` + \`navigationRefs\` JSON that was used to generate the shared base class. Use it to derive the base class structure (properties, methods, i18n keys).
- \`##Design System\` (optional): component and styling guidelines.

---

## MANDATORY FIRST STEP — derive base class structure from the shared defs

You do NOT receive the compiled base class source. \`##Base Class\` contains the **shared defs spec** (commands + navigationRefs JSON). From it, derive the four lists deterministically before writing any render code.

Naming conventions (same as the shared generator uses):
- \`Prefix\` = moduleName first letter uppercased (e.g. \`petShopStripe\` → \`PetShopStripe\`)
- \`PageNamePascal\` = pageName first letter uppercased
- \`CommandPascal\` = commandName first letter uppercased
- \`PageIdPascal\` = pageId first letter uppercased

The base class is: \`{Prefix}{PageNamePascal}Base\` in \`/_\${project}_/l2/{moduleName}/web/shared/{pageName}.js\`

### List 1 — Reactive properties
Derive from \`commands\` in \`##Base Class\`:
- For each **query** command (\`kind: "query"\`): each top-level key of its \`output\` shape becomes a property
  - Array value \`[{...}]\` → \`{key}: any[] = []\`
  - Object / primitive value → \`{key}: any = undefined\`
- For each **command** (\`kind: "command"\`): \`{commandName}State: 'idle'|'loading'|'success'|'error'\`
- Always present: \`status: string\`

### List 2 — Handler methods
Derive from \`commands\` and \`navigationRefs\` in \`##Base Class\`:
- For each command (\`kind: "command"\`): \`handle{CommandPascal}Click()\`
- For each outbound navigationRef: \`handleNavigateTo{PageIdPascal}Click(params?: Record<string, unknown>)\`

### List 3 — i18n keys
Derive using these exact patterns:
- Always: \`brand\`, \`pageTitle\`, \`loaded\`, \`couldNotLoad\`
- Per query command: \`loading{CommandPascal}\`
- Per command: \`{commandName}Label\`, \`{commandName}Loading\`, \`couldNot{CommandPascal}\`
- Per outbound navigationRef: \`navigateTo{PageIdPascal}\`

### List 4 — Outbound navigation targets
From \`navigationRefs\` in \`##Base Class\`: entries with \`direction: "outbound"\`.
\`\`\`
outbound: productServiceDetailPage  trigger: "Selecionar item"
outbound: catalogPage               trigger: "Explorar catálogo"
...
\`\`\`

These four lists are the ONLY names and targets you may use inside \`render()\`.
Do not use any name not derivable by the rules above.

---

## File structure

### 1. MLS header
\`item.outputPath\` from \`##User info\`, strip leading \`/\`:
\`\`\`
/// <mls fileReference="{item.outputPath}" enhancement="_102027_/l2/enhancementLit.ts" />
\`\`\`

### 2. Imports
\`\`\`typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { {Prefix}{PageNamePascal}Base } from '/_\${project}_/l2/{moduleName}/web/shared/{pageName}.js';
\`\`\`
- \`Prefix\` = \`moduleName\` first letter uppercased (e.g., \`locadora\` → \`Locadora\`)
- \`PageNamePascal\` = filename without \`.ts\`, first letter uppercased
- No other imports unless a Lit directive (e.g., \`repeat\`) is genuinely needed

### 3. Class

Tag name: \`{kebab-module}--web--{device}--page11--{kebab-page}-{project}\`
Class name: \`{Prefix}{DevicePascal}Page11{PageNamePascal}Page\`

\`\`\`typescript
@customElement('{tag}')
export class {ClassName} extends {Prefix}{PageNamePascal}Base {
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

### Rule B — no handle method for this interaction → inline arrow only for local reactive state mutation
\`\`\`typescript
// toggling a boolean prop that exists in List 1
@click=\${() => { this.showValidationHint = !this.showValidationHint; }}

// input bound to a reactive field in List 1
@input=\${(e: Event) => {
  this.nome = (e.target as HTMLInputElement).value;
  this.formDirty = true;
}}
\`\`\`

The decision tree for every interactive element:
1. Is this a **navigation action** (outbound navigationRef trigger)? → Rule C (see below)
2. Does \`##Base Class\` have a \`handle*\` method that fits this action? → Rule A
3. Is this a local state mutation (toggling, input binding) with no dedicated handler? → Rule B
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

Use \`##User data\` sections and organisms to understand what to show and where.
Use \`##Base Class\` lists to decide exactly how to show it.

**Before mapping organisms**, scan List 4 for outbound navigation targets and mark which organisms own them (match \`trigger\` against \`userActions\`). Navigation buttons are part of those organisms — they are not separate sections.

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
- Bind each input to the matching reactive prop from List 1 → Rule B for \`@input\`
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

Follow \`##Design System\` guidelines if provided. Otherwise use Tailwind CSS freely.
Design for the \`purpose\` and \`actor\` from \`##User data\`.

- Each section → visually distinct block (card, panel, column)
- \`mode: "edit"\` → interactive; \`mode: "view"\` → read-only
- Extract busy booleans at the top of \`render()\` — only for props in List 1
- Guard nullable props with \`??\` and \`?.\`
- Show \`this.status\` visibly
- All human-visible text via \`this.msg.*\` using keys from List 3 only — never hardcode strings

---

## Output format rules
- No markdown fences, no explanations, no inline comments in generated TypeScript
- 2-space indentation inside the class; html template may use deeper indentation
- One blank line between top-level declarations
- The \`srcFile\` value in the JSON response must be a single-line string — escape all special characters:
  - newlines → \\n  |  tabs → \\t  |  double quotes → \\"  |  backslashes → \\\\

---
`;
