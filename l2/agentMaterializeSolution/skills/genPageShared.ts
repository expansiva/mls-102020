/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageShared.ts" enhancement="_blank"/>

export const skill = `
# Lit Shared Base Class Generator

You generate a **Shared** TypeScript file: a headless Lit 3 base class that holds all reactive state and communicates with the backend via \`execBff\`.
It never renders, never registers a custom element, and never dispatches events.

---

## What you receive

- \`## Definition\`: the shared .defs.ts JSON for one page.
  New format:
  - \`contractRef\`: points to the contract .defs.ts and generated contract .ts.
  - \`layoutRef\`: points to the page11 .defs.ts layout source.
  - \`states[]\`: the complete shared/global state inventory for this page.
  - \`actions[]\`: every BFF action and every state setter action available to the render layer.
  - \`initialLoads[]\`: query actions that must run on \`connectedCallback\`.
  - \`navigationRefs[]\`: navigation entries for this page.
  Legacy format:
  - \`bffCommands\` or a plain array may still appear. Treat those as command descriptors and derive missing states/actions mechanically.
- \`## Context Files\`: includes the contract .defs.ts, the generated contract .ts and the page11 .defs.ts when available.
- \`##User info\`: a JSON object with at minimum \`moduleName\`, \`device\`, \`project\`, and \`item.outputPath\` (the full output file path).

Extract \`pageName\` from the last segment of \`item.outputPath\` (strip the leading path and the \`.ts\` extension).

---

## MANDATORY FIRST STEP — read contract commands and interface names

The contract files are provided in \`## Context Files\`. Open the contract .defs.ts to collect command descriptors and open the contract .ts to collect every exported interface name.
Do **not** guess or derive names from a convention — use only the names that actually appear in that file.

Rules:
- Prefer commands from \`definition.contractRef.defPath\` / the contract .defs.ts context file.
- Use \`definition.bffCommands\` or a plain array only as legacy fallback.
- Scan all \`export interface\` declarations in the contract file
- For each command, find the matching Input and Output interface by their actual names in the file
- If a command has no matching interface in the contract file, fall back to \`any\` and add a \`// TODO: missing contract\` comment
- Build the full list of interface names you will import — only names that truly exist in the file

**CRITICAL: never invent, guess, or derive interface names. Use only what is exported in the contract file.**

---

## MANDATORY SECOND STEP — inventory navigationRefs

Read \`navigationRefs\` from \`## Definition\` completely before writing any code.

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
> **MANDATORY:** The \`enhancement\` attribute must always be exactly \`_102027_/l2/enhancementLit.ts\`.
> Never change it, never leave it blank, never use \`_blank\` or any other value.

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

Using the interface names collected in MANDATORY FIRST STEP (the actual names from the contract file), add:
\`\`\`typescript
import type { InterfaceA, InterfaceB } from '/_{project}_/l2/{moduleName}/web/contracts/{pageName}.js';
\`\`\`
Include only the interface names that are actually referenced in the class body AND exist in the contract file.
The path uses \`project\`, \`moduleName\`, and \`pageName\` from \`##User info\`.
Omit this line only if there are zero commands.

Import \`initState\` only if there are action state keys to initialize.

### 3. i18n block

#### MANDATORY THIRD STEP — read layout from page .defs.ts for i18n keys

The page \`.defs.ts\` file is provided in \`## Context Files\`. Open it and read the \`definition.layout\` object.
Use its content to derive ALL UI-facing i18n keys — do NOT invent labels from command names alone.

Derivation rules (apply to every element in \`layout.sections[].organisms[].molecules[]\`):
- \`section.titleKey\`, \`organism.titleKey\`, \`molecule.titleKey\`, \`molecule.emptyKey\` → include the exact key from \`definition.i18n\`
- \`molecule.columns[].labelKey\` → one key per column, using the exact labelKey
- \`molecule.filters[].labelKey\` and \`molecule.fields[].labelKey\` → one key per filter/form field, using the exact labelKey
- \`molecule.toolbar[].labelKey\`, \`rowActions[].labelKey\`, \`actions[].labelKey\` → one key per action, using the exact labelKey

For Portuguese, copy the value from \`definition.i18n\` when present. For English, translate the same key.
If the layout is absent or the file is not in \`##Context Files\`, fall back to deriving labels from command names only.

---

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
  // ── LAYOUT-DERIVED KEYS from MANDATORY THIRD STEP ──
  // section titles, column headers, filter field labels, form field labels, submit buttons
  // ── FOR EACH OUTBOUND ENTRY from MANDATORY SECOND STEP — one key per entry ──
  // navigateTo{PageIdPascal}: '{trigger text verbatim from navigationRef}'
  //
  // Do NOT omit these keys. The render layer uses them as button labels.
};
const message_en = { /* same keys, in English — including every navigateTo* and layout-derived key */ };
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

Use \`definition.states[]\` as the source of truth. Every state entry must become exactly one \`@property()\`.

Rules:
- Property name = \`state.name\`.
- State key = \`state.stateKey\`.
- \`kind: "pageStatus"\` → \`@property() status: string = '';\`
- \`kind: "actionStatus"\` → \`@property() {name}: 'idle' | 'loading' | 'success' | 'error' = 'idle';\`
- \`kind: "input"\` → property type comes from the referenced contract input field. If the contract field is missing, use \`string\`.
- \`kind: "queryResult"\` → property type comes from the referenced contract output interface. If \`collection: true\`, default to \`[]\`.

Do not create any reactive property that is not present in \`definition.states[]\`, except a legacy fallback when the definition has only \`bffCommands\`.

For legacy \`bffCommands\` only:
- Derive states mechanically using the same key shape as the new generator:
  - \`ui.{pageName}.input.{commandName}.{fieldName}\`
  - \`ui.{pageName}.data.{commandName}\`
  - \`ui.{pageName}.action.{commandName}.status\`

> **CRITICAL — never explode output item fields into individual page state.**
> A query output with fields \`menuItemId\`, \`name\`, \`price\` becomes one collection state, not three independent properties.

### 5. State keys

Derive \`_stateKeys\` from \`definition.states[].stateKey\` exactly.
Do not omit input/form/filter states. They are required for page automation.

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

### 6.1 State setter actions

For every \`definition.actions[]\` entry with \`kind: "stateSetter"\`, generate both methods:

\`\`\`typescript
set{StatePascal}(value: {StateType}): void {
  this.{stateName} = value;
  setState('{stateKey}', value);
}

handle{StatePascal}Change(event: Event): void {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  this.set{StatePascal}(target.value as {StateType});
}
\`\`\`

Rules:
- Use the exact \`methodName\`, \`handlerName\`, \`stateKey\` and \`state.name\` from the definition.
- For boolean states, read \`(event.target as HTMLInputElement).checked\`.
- For number states, convert with \`Number(target.value || 0)\`.
- Do not let the render layer mutate a property directly; every user-editable field must have a shared setter/handler.

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
- [ ] Every interface name used in the class body was read from the actual contract file (MANDATORY FIRST STEP)
- [ ] No interface name was guessed or derived from a convention — only names that exist in the contract file
- [ ] All interface names used in the class body are imported from the contracts path
- [ ] \`any\` is used only when no matching interface was found in the contract file (with a \`// TODO: missing contract\` comment)

**A2. Shared state/actions**
- [ ] Every \`definition.states[]\` entry has one \`@property()\`
- [ ] Every \`definition.states[].stateKey\` appears in \`_stateKeys\`
- [ ] \`handleIcaStateChange\` has one case per state key
- [ ] Every \`kind: "stateSetter"\` action has the exact setter and handler named in the definition
- [ ] No user-editable field depends on a render-layer inline property assignment

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

For each load/action method, always use the interface names read from the contract file in MANDATORY FIRST STEP.
Never fall back to \`any\` or inline shapes unless no matching interface exists in the contract file:

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
