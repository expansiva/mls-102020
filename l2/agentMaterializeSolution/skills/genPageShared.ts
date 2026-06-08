/// <mls fileReference="_102020_/l2/agentMaterializeSolution/skills/genPageShared.ts" enhancement="_blank"/>

export const skill = `
# Lit Shared Base Class Generator

You generate a **Shared** TypeScript file: a headless Lit 3 base class that holds all reactive state and communicates with the backend via \`execBff\`.
It never renders, never registers a custom element, and never dispatches events.

---

## What you receive

- \`##User data\`: a JSON array of command descriptors — the **Origins** list for this page.
  Each entry has \`commandName\`, \`kind\` ("query" or "command"), \`purpose\`, \`input\`, and \`output\`.
- \`##User info\`: a JSON object with at minimum \`moduleName\`, \`device\`, \`project\`, and \`item.outputPath\` (the full output file path).

Extract \`pageName\` from the last segment of \`item.outputPath\` (strip the leading path and the \`.ts\` extension).

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

\`\`\`typescript
async load{CommandPascal}(params?: {...input shape...}, options?: BffClientOptions): Promise<void> {
  if ((window as any).mls) {
    // stub each top-level key in output with realistic data
    this.someKey = { /* realistic stub */ };
    setState('ui.{pageName}.someKey', this.someKey);
    this.status = this.msg.loaded;
    return;
  }
  const response = await execBff<{CommandPascal}Output>(
    '{moduleName}.{pageName}.{commandName}',
    params ?? {},
    options
  );
  if (!response.ok || !response.data) {
    if (options?.mode === 'blocking') {
      throw (response.error ?? { code: 'UNEXPECTED_ERROR', message: this.msg.couldNotLoad }) satisfies AuraNormalizedError;
    }
    this.status = this.msg.couldNotLoad;
    return;
  }
  // assign each top-level output key to the matching reactive property
  this.someKey = response.data.someKey;
  setState('ui.{pageName}.someKey', this.someKey);
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
import type { /* only interfaces actually used */ } from '/_{project}_/l2/{moduleName}/{device}/contracts/{pageName}.js';
\`\`\`

Import \`initState\` only if there are action state keys to initialize.
Import ONLY the interface types actually referenced in the class body.
The contracts import path is built from \`project\`, \`moduleName\`, \`device\`, and \`pageName\` (from \`##User info\`).

### 3. i18n block

Wrap with \`/// **collab_i18n_start**\` / \`/// **collab_i18n_end**\`:

\`\`\`typescript
/// **collab_i18n_start**
const message_pt = {
  brand: '{module name readable}',
  pageTitle: '{page name readable}',
  loaded: 'Dados carregados',
  couldNotLoad: 'Nao foi possivel carregar',
  // one loading label per query:   loading{CommandPascal}: '...'
  // one error label per command:   couldNot{CommandPascal}: '...'
  // one loading label per command: {commandName}Loading: '...'
};
const message_en = { /* same keys in English */ };
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**
\`\`\`

Never write \`as const\` on message objects.

### 4. Reactive properties

For each top-level key in the \`output\` of every **query** command:
- Array value \`[{...}]\` → \`@property() {key}: Array<...> = [];\`
- Object value \`{...}\` → \`@property() {key}: {...} | undefined = undefined;\`

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
    // call the first query load method (propagate options)
  }

  // ── load methods (one per query command) ──
  // ── action methods + handle* wrappers (one per command kind) ──
}
\`\`\`

---

## Shape → TypeScript type mapping (for method signatures)

When writing typed method params derived from an \`input\` shape:
- \`"string"\` → \`string\`; \`"number"\` → \`number\`; \`"boolean"\` → \`boolean\`
- \`"A|B"\` → \`'A' | 'B'\`
- Key ending with \`?\` → optional field (\`?: type\`)
- Nested object → inline \`{ field: type }\`
- Array element \`[{...}]\` → \`Array<{ field: type }>\`

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
