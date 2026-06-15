/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageShared.ts" enhancement="_blank"/>

export const skill = `
# Lit Shared Base Class Generator

You generate a **Shared** TypeScript file: a headless Lit 3 base class that holds all reactive state and communicates with the backend via \`execBff\`.
It never renders, never registers a custom element, and never dispatches events.

---

## What you receive

- \`##User data\`: a JSON object with two top-level fields:
  - \`commands\`: array of command descriptors — the **Origins** list for this page.
    Each entry has \`commandName\`, \`kind\` ("query" or "command"), \`purpose\`, \`input\`, and \`output\`.
  - \`navigationRefs\`: array of navigation entries for this page.
    Each entry has \`direction\` ("inbound" | "outbound"), \`pageId\`, and \`trigger\`.
  If \`##User data\` is a plain array (legacy), treat it as \`commands\` with an empty \`navigationRefs\`.
- \`##User info\`: a JSON object with at minimum \`moduleName\`, \`device\`, \`project\`, and \`item.outputPath\` (the full output file path).

Extract \`pageName\` from the last segment of \`item.outputPath\` (strip the leading path and the \`.ts\` extension).

---

## MANDATORY FIRST STEP — derive contract interface names from commands

You do NOT receive the contracts file. Derive every interface name directly from the \`commands\` array using the same deterministic convention the contract generator uses:

| Name | Rule | Example (moduleName = \`petShopStripe\`, commandName = \`getCart\`) |
|---|---|---|
| \`Prefix\` | moduleName with first letter uppercased (rest unchanged) | \`PetShopStripe\` |
| \`CommandPascal\` | commandName with first letter uppercased | \`GetCart\` |
| Input interface | \`{Prefix}{CommandPascal}Input\` | \`PetShopStripeGetCartInput\` |
| Output interface | \`{Prefix}{CommandPascal}Output\` | \`PetShopStripeGetCartOutput\` |

Build the full list from every entry in \`commands\`. These interfaces **will exist** in the contracts file when the system runs — never fall back to \`any\` for command input/output types.

**CRITICAL: never use \`any\` for a type that corresponds to a command's input or output. Always use the derived interface name.**

---

## MANDATORY SECOND STEP — inventory navigationRefs

Read \`navigationRefs\` from \`##User data\` completely before writing any code.

Separate by direction and build this list:
\`\`\`
OUTBOUND: productServiceDetailPage   trigger: "Repetir compra ou agendar serviço"
OUTBOUND: catalogPage                trigger: "Explorar catálogo"
INBOUND:  homePage                   (no code generated — informational only)
\`\`\`

Rules:
- \`direction: "outbound"\` → record pageId and trigger text verbatim — **these REQUIRE generated code (Section 7 below)**
- \`direction: "inbound"\` → informational only, skip entirely
- If \`navigationRefs\` is absent or empty → outbound list is empty and Section 7 produces nothing

**If the outbound list is non-empty, the navigation handler methods (Section 7) and their i18n keys (Section 3) are REQUIRED output.
A class that has outbound navigationRefs but is missing handler methods or i18n keys is INCOMPLETE — it will cause TypeScript errors in the render layer.**

---

## BFF route key convention

Every \`execBff\` call uses:

\`\`\`
{moduleName}.{pageName}.{commandName}
\`\`\`

---

## Command classification

| \`kind\`      | Generates                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------|
| \`"query"\`   | A \`load{CommandPascal}\` method — reads data, stores in reactive properties, calls \`setState\` |
| \`"command"\` | An \`{commandName}\` action method + a \`handle{CommandPascal}Click()\` wrapper               |

---


## CRITICAL: MLS mock pattern

### Query methods (kind: "query")

Use the correct template based on the output shape (Case A vs Case B from Section 4):

**Case A — output is a raw array \`[{...}]\`** (one reactive property \`{propName}\` typed \`Output[]\`):
\`\`\`typescript
async load{CommandPascal}(params?: {Prefix}{CommandPascal}Input, options?: BffClientOptions): Promise<void> {
  if ((window as any).mls) {
    this.{propName} = [ /* 2–3 realistic stub items */ ] as {Prefix}{CommandPascal}Output[];
    setState('ui.{pageName}.{propName}', this.{propName});
    this.status = this.msg.loaded;
    return;
  }
  const response = await execBff<{Prefix}{CommandPascal}Output[]>(
    '{moduleName}.{pageName}.{commandName}',
    params ?? ({} as {Prefix}{CommandPascal}Input),
    options,
  );
  if (!response.ok || !response.data) {
    if (options?.mode === 'blocking') {
      throw (response.error ?? { code: 'UNEXPECTED_ERROR', message: this.msg.couldNotLoad }) satisfies AuraNormalizedError;
    }
    this.status = this.msg.couldNotLoad;
    return;
  }
  this.{propName} = response.data;
  setState('ui.{pageName}.{propName}', this.{propName});
  this.status = this.msg.loaded;
}
\`\`\`

**Case B — output is an object with named keys**:
\`\`\`typescript
async load{CommandPascal}(params?: {Prefix}{CommandPascal}Input, options?: BffClientOptions): Promise<void> {
  if ((window as any).mls) {
    // stub each top-level key in output with realistic data
    this.{key} = { /* realistic stub */ };
    setState('ui.{pageName}.{key}', this.{key});
    this.status = this.msg.loaded;
    return;
  }
  const response = await execBff<{Prefix}{CommandPascal}Output>(
    '{moduleName}.{pageName}.{commandName}',
    params ?? ({} as {Prefix}{CommandPascal}Input),
    options,
  );
  if (!response.ok || !response.data) {
    if (options?.mode === 'blocking') {
      throw (response.error ?? { code: 'UNEXPECTED_ERROR', message: this.msg.couldNotLoad }) satisfies AuraNormalizedError;
    }
    this.status = this.msg.couldNotLoad;
    return;
  }
  // assign each top-level output key to the matching reactive property
  this.{key} = response.data.{key};
  setState('ui.{pageName}.{key}', this.{key});
  this.status = this.msg.loaded;
}
\`\`\`

### Command methods (kind: "command")

\`\`\`typescript
async {commandName}(params: {...input shape...}, signal?: AbortSignal): Promise<void> {
  if ((window as any).mls) {
    console.log('[mls mock] {moduleName}.{pageName}.{commandName}', params);
    this.{commandName}State = 'success';
    setState('ui.{pageName}.{commandName}', 'success');
    return;
  }
  this.{commandName}State = 'loading';
  setState('ui.{pageName}.{commandName}', 'loading');
  try {
    const response = await execBff<{CommandPascal}Output>(
      '{moduleName}.{pageName}.{commandName}',
      params,
      signal ? { signal } : undefined
    );
    if (!response.ok) throw response.error;
    this.{commandName}State = 'success';
    setState('ui.{pageName}.{commandName}', 'success');
    // reload primary query if applicable
  } catch (e) {
    this.{commandName}State = 'error';
    setState('ui.{pageName}.{commandName}', 'error');
    throw e;
  }
}

handle{CommandPascal}Click(): void {
  const params = { /* collect from reactive properties */ };
  void runBlockingUiAction(
    async (signal: AbortSignal) => { await this.{commandName}(params, signal); },
    {
      busyLabel: this.msg.{commandName}Loading,
      errorTitle: this.msg.couldNot{CommandPascal},
      retry: () => this.{commandName}(params),
    },
  );
}
\`\`\`

\`runBlockingUiAction\` accepts **exactly 2 arguments** — never pass \`this\` as first arg.
The signal parameter **must** be typed \`AbortSignal\`.

Mock stub rules:
- Arrays \`[{...}]\` → 2–3 items
- Object \`{...}\` → one realistic object
- id/...Id fields → \`'id-001'\`; name/nome → \`'Ana Silva'\`; email → \`'ana@exemplo.com'\`; number fields → small integer
- Required fields must be present; optional (key ends with \`?\`) may be omitted

---

## File structure (in order)

### 1. MLS file header
Use \`item.outputPath\` from \`##User info\`, strip leading \`/\`:
\`\`\`
/// <mls fileReference="{item.outputPath without leading /}" enhancement="_102027_/l2/enhancementLit.ts" />
\`\`\`

### 2. Imports
\`\`\`typescript
import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import { property } from 'lit/decorators.js';
import type { AuraNormalizedError } from '/_102029_/l2/contracts/bootstrap.js';
import type { BffClientOptions } from '/_102029_/l2/bffClient.js';
import { execBff } from '/_102029_/l2/bffClient.js';
import {
  bindExpectedNavigationLoad,
  consumeExpectedNavigationLoad,
  runBlockingUiAction,
} from '/_102029_/l2/interactionRuntime.js';
import { subscribe, unsubscribe, getState, setState } from '/_102029_/l2/collabState.js';
// contracts import — see rules below
\`\`\`

**Contracts import (always emit when there are commands):**

Using the derived interface names from MANDATORY FIRST STEP, add:
\`\`\`typescript
import type { InterfaceA, InterfaceB } from '/_{project}_/l2/{moduleName}/web/contracts/{pageName}.js';
\`\`\`
Include all interface names that are actually referenced in the class body.
The path uses \`project\`, \`moduleName\`, and \`pageName\` from \`##User info\`.
Omit this line only if there are zero commands.

Import \`initState\` only if there are action state keys to initialize.

### 3. i18n block

Wrap with \`/// **collab_i18n_start**\` / \`/// **collab_i18n_end**\`:

\`\`\`typescript
/// **collab_i18n_start**
const message_pt = {
  brand: '{module name readable}',
  pageTitle: '{page name readable}',
  loaded: 'Dados carregados',
  couldNotLoad: 'Nao foi possivel carregar',
  // one loading label per query:    loading{CommandPascal}: '...'
  // one idle label per command:     {commandName}Label: '...'
  // one loading label per command:  {commandName}Loading: '...'
  // one error label per command:    couldNot{CommandPascal}: '...'
  // ── FOR EACH OUTBOUND ENTRY from MANDATORY SECOND STEP — one key per entry ──
  // navigateTo{PageIdPascal}: '{trigger text verbatim from navigationRef}'
  //
  // EXAMPLE — if outbound list has "productServiceDetailPage / Repetir compra ou agendar serviço":
  //   navigateToProductServiceDetailPage: 'Repetir compra ou agendar serviço'
  //
  // Do NOT omit these keys. The render layer uses them as button labels.
};
const message_en = { /* same keys, in English — including every navigateTo* key */ };
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**
\`\`\`

Never write \`as const\` on message objects.

**CRITICAL — UTF-8 encoding:** Write all translated strings directly with their Unicode characters.
Never use hex escape sequences, Unicode escapes, or entity codes for accented letters.
Write \`'Métricas'\` — not \`'M\\xe9tricas'\`, not \`'M e9tricas'\`, not \`'M&eacute;tricas'\`.
This applies to every string in \`message_pt\` and \`message_en\`.

### 4. Reactive properties

**Classify each query command as Case A or Case B before writing any property:**

| Case | Signal | How to identify |
|---|---|---|
| **Case A — list** | commandName starts with \`listar\` / \`buscar\` / \`getAll\` / \`list\` | Output interface describes **one item** in a collection |
| **Case B — structured** | commandName starts with \`obter\` / \`get\` / \`calcular\` / or has explicitly array-valued keys in \`output\` | Output interface has named keys that are the actual result |

> **CRITICAL — never explode item fields into individual properties.**
> For a \`listar*\` command whose output is \`{ menuItemId, nome, preco, ... }\`, those are fields of ONE item.
> **Do not** create \`@property() menuItemId\`, \`@property() nome\`, etc.
> **Do** create one single property \`@property() itensCardapio: CafeFlowListarItensCardapioOutput[] = []\`.
> Exploding fields into separate properties is ALWAYS WRONG for list commands.

**Case A — list command (output represents one item):**
- Declare **one** reactive property for the whole collection
- Property name: strip leading verb (\`listar\`/\`buscar\`/\`getAll\`/\`list\`) and camelCase the remainder
  (e.g. \`listarItensCardapio\` → \`itensCardapio\`, \`listarCategorias\` → \`categorias\`)
- Type: \`{Prefix}{CommandPascal}Output[]\` — never \`Output[fieldName]\` or \`Output\`
- Default: \`= []\`
- State key: \`'ui.{pageName}.{propName}'\` (one key for the whole list)
- In the load method: use \`execBff<{Prefix}{CommandPascal}Output[]>\`, assign \`this.{propName} = response.data;\`

**Case B — structured result (output has named composite keys):**
- Declare one property per top-level key of \`output\`
- Array-valued key → \`@property() {key}: {Prefix}{CommandPascal}Output['{key}'] = [];\`
- Object/primitive key → \`@property() {key}: {Prefix}{CommandPascal}Output['{key}'] | undefined = undefined;\`
- In the load method: use \`execBff<{Prefix}{CommandPascal}Output>\`, assign \`this.{key} = response.data.{key};\`

The derived interface always exists — never fall back to \`any[]\` or \`any\`.

For each **command** entry:
- \`@property() {commandName}State: 'idle' | 'loading' | 'success' | 'error' = 'idle';\`

Always include:
- \`@property() status: string = '';\`

### 5. State keys

Derive \`_stateKeys\` as:
- \`'ui.{pageName}.{outputKey}'\` — one per top-level output key of each query command
- \`'ui.{pageName}.{commandName}'\` — one per command kind

### 6. Base class

\`\`\`typescript
export class {Prefix}{PageNamePascal}Base extends CollabLitElement {

  private readonly _stateKeys = [ /* derived above */ ] as const;

  /* reactive properties */

  protected msg: MessageType = messages['en'];

  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    const pendingLoad = consumeExpectedNavigationLoad();
    const task = this.loadInitialData(undefined, { mode: 'silent', signal: pendingLoad?.signal });
    bindExpectedNavigationLoad(pendingLoad, task);
    void task.catch(() => undefined);
    const lang: string = this.getMessageKey(messages);
    this.msg = messages[lang] || messages['en'];
    subscribe(this._stateKeys as unknown as string[], this);
    (this._stateKeys as unknown as string[]).forEach(key => {
      const v = getState(key);
      if (v !== undefined) this.handleIcaStateChange(key, v);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    unsubscribe(this._stateKeys as unknown as string[], this);
  }

  handleIcaStateChange(key: string, value: any): void {
    switch (key) {
      // one case per _stateKeys entry
      // assign to the matching reactive property with a safe default fallback
    }
  }

  async loadInitialData(params?: unknown, options?: BffClientOptions): Promise<void> {
    // Call EVERY query load method for this page in sequence (await each one).
    // Do NOT call only the first — every query that populates the page must run here.
    // Propagate \`options\` to each call so silent/blocking mode is respected.
    // Example for a page with two queries:
    //   await this.loadGetOrderHistory(params as any, options);
    //   await this.loadGetCustomerServiceBookings(undefined, options);
  }

  // ── load methods (one per query command) ──
  // ── action methods + handle* wrappers (one per command kind) ──
}
\`\`\`

### 7. Navigation handler methods (REQUIRED when outbound list is non-empty)

For **every** entry in the outbound list from MANDATORY SECOND STEP, add one method to the class.
If the outbound list is empty, this section produces nothing.

\`\`\`typescript
// Template — repeat once per outbound entry:
handleNavigateTo{PageIdPascal}Click(params?: Record<string, unknown>): void {
  if ((window as any).mls) {
    console.log('[mls mock] navigate to {pageId}', params);
    return;
  }
  setState('navigation.request', { pageId: '{pageId}', params: params ?? {} });
}
\`\`\`

Substitution rules:
- \`{pageId}\` = the pageId string verbatim (e.g. \`productServiceDetailPage\`)
- \`{PageIdPascal}\` = pageId with the first letter uppercased (e.g. \`ProductServiceDetailPage\`)
- The method is **synchronous** — no \`async\`, no \`await\`, no \`runBlockingUiAction\`
- \`'navigation.request'\` is a **global** state key — do NOT add it to \`_stateKeys\`
- \`params\` lets the render layer forward item context (ids, filters) when triggering navigation

---

## PRE-OUTPUT VERIFICATION CHECKLIST

Before writing the final output, verify each of the following. Fix anything that fails.

**A. Contracts**
- [ ] Every command has a derived Input and Output interface name (MANDATORY FIRST STEP convention applied)
- [ ] All derived interface names used in the class body are imported from the contracts path
- [ ] NO command uses \`any\` where a derived interface name must be used

**B. Navigation (check per outbound entry from MANDATORY SECOND STEP)**
- [ ] \`message_pt\` contains key \`navigateTo{PageIdPascal}\` with the trigger text in Portuguese
- [ ] \`message_en\` contains key \`navigateTo{PageIdPascal}\` with the trigger text in English
- [ ] The class body contains method \`handleNavigateTo{PageIdPascal}Click\`
- [ ] That method calls \`setState('navigation.request', ...)\` (not \`href\`, not a router)

If ANY of the navigation checks fail → add the missing code before outputting.

**C. loadInitialData**
- [ ] Calls \`await this.load{CommandPascal}(...)\` for **every** query command — not just the first

---

## Method parameter typing

For each load/action method, always use the derived interface names from MANDATORY FIRST STEP.
Every command will have a matching Input and Output interface — never fall back to \`any\` or inline shapes:

\`\`\`typescript
async load{CommandPascal}(params?: {Prefix}{CommandPascal}Input, options?: BffClientOptions): Promise<void>
async {commandName}(params: {Prefix}{CommandPascal}Input, signal?: AbortSignal): Promise<void>
\`\`\`

For \`execBff\` generic type parameter — always use the derived Output interface:
\`\`\`typescript
const response = await execBff<{Prefix}{CommandPascal}Output>('{moduleName}.{pageName}.{commandName}', ...)
\`\`\`

---

## Output format rules
- No markdown fences, no explanations, no inline comments in generated TypeScript
- 2-space indentation
- One blank line between top-level declarations
- The \`srcFile\` value in the JSON response must be a single-line string with all special characters escaped:
  - newlines → \\n
  - tabs → \\t
  - double quotes → \\"
  - backslashes → \\\\

---
`;
