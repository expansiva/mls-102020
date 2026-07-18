/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfeSharedTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Shared TS Skill

Generate the shared/base TypeScript file for one Stage 2 frontend page.
This file is headless: it owns state, i18n, backend calls and handlers. It never renders and never registers a custom element.

## Input contract

Definition is the shared .defs.ts object:
- pageId, pageName, moduleName, sourceKind, ownerIds, operationIds
- baseClassName: precomputed deterministic ModulePascalPagePascalBase class name
- routePattern: registered page route, with optional :param? segments when the page accepts route params
- contractRef: points to contract .defs.ts and contract .ts
- layoutRef: points to page11 .defs.ts
- states[]: the complete shared/global state inventory
- actions[]: all BFF actions and all stateSetter actions used by render
- initialLoads[]: query actions to run on connectedCallback
- businessContextRefs[]: company/unit context dependencies declared by L4 operations
- navigationRefs[]
- i18nMeta: defaultLocale and activeLocales from the L4 module language metadata
- i18n: the only place where UI text values live
- automation

Context Files include the contract .ts and the 102029 runtime context expanded from _102029_.d.ts.

## Mandatory source of truth

Use Definition.states[] as the only list of reactive properties.
Use Definition.actions[] as the only list of methods/handlers.
Use Definition.i18n as the only message catalog.
Use contract .ts only for actual exported interface names.

Never create state, action, handler, message key or contract type that is not backed by Definition or contract .ts.
Never copy bffCommands into this file.
Never read i18n from page11; page11 only references i18n keys.

## Class and file shape

Generate:
- MLS header from target outputPath, with enhancement="_102020_/l2/enhancementAura".
- Imports:
  - CollabLitElement from /_102029_/l2/collabLitElement.js
  - property from lit/decorators.js
  - execBff and type BffClientOptions from /_102029_/l2/bffClient.js
  - setState, getState, subscribe, unsubscribe or initState only from /_102029_/l2/collabState.js when used
  - runBlockingUiAction only from /_102029_/l2/interactionRuntime.js when BFF click handlers are generated
  - contract types this class USES to type @property fields and action IO: emit an
    "import type { ...used types... } from '/_{project}_/l2/{moduleName}/web/contracts/{pageName}.js';".
    This import is MANDATORY and SEPARATE from the re-export below. A re-export ("export type { X } from
    '...'") does NOT create a local binding, so any contract type referenced inside this file (e.g.
    "@property() data!: FooOutput") MUST also appear in this import — otherwise it is a "cannot find
    name" compile error. Use only interfaces/types that exist in the contract .ts context.
- Immediately after the imports, ALSO add a SEPARATE re-export statement listing EVERY interface/type
  exported by the contract .ts (all Input, Output and Output row-item DTOs — not only the ones this
  class references directly), so page renders import every DTO type from the shared module and never
  depend on the contract file:
  export type { TypeA, TypeB } from '/_{project}_/l2/{moduleName}/web/contracts/{pageName}.js';
  BOTH statements must be present and are NOT interchangeable: the "import type" (local bindings, only
  the used types) AND the "export type ... from" (re-export, all types). Never merge them into a single
  re-export — that would drop the local bindings and break compilation.
- export class Definition.baseClassName extends CollabLitElement. This name is precomputed: copy it
  exactly. Never derive a name from pageName/title and never choose a class name yourself.

Do not use customElement.
Do not implement render().

## Self-describing JSDoc (mandatory)

This class is consumed by page generators through its compiled .d.ts, and declaration emit preserves
JSDoc — so every public/protected member MUST carry a one-line JSDoc that makes the .d.ts
self-sufficient (no other file needed to understand the member). Formats:

- Every @property field:
  /** state <stateKey> — <kind><, outputShape: array|paginated|object when queryResult><, values: ... when enum-like> */
- Every query/command method:
  /** action <actionId> (<kind>) — route <routeKey>; inputs: <input field names or none>; writes <outputStateKeys or none>; status <statusStateKey><; feedback keys <successKey> / <errorKey> when present> */
- Every handler:
  /** handler for action <actionId> — bind UI events here */
- Every stateSetter method:
  /** setter for state <stateKey> */
- The msg getter:
  /** i18n catalog — MessageType keys are the CLOSED msg vocabulary for page renders */

Use /** ... */ JSDoc syntax exactly (line comments // are stripped from the .d.ts). Keep each JSDoc
to one line. The information comes from Definition.states[] and Definition.actions[] — never invent.

## Runtime API contracts

Use exactly these APIs:

import { execBff, type BffClientOptions } from '/_102029_/l2/bffClient.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';

Never import getState, setState or runBlockingUiAction from bffClient.js or collabLitElement.js.
Never import stateManager.js, stateStore.js, uiBlocking.js or blockingUi.js; those modules do not exist.

execBff has this signature:
const response = await execBff<OutputType>(routeKey, params, options);

BffClientOptions has only mode, timeoutMs and signal. Do not put routeKey inside options.
When using mode, only use 'silent' or 'blocking'. Use 'silent' for query actions and 'blocking' for command actions.
Never use mode values such as 'query', 'command' or 'standard'.
The routeKey string is always the first argument to execBff.
The params object is always the second argument, even when it is {}.
The return value is an envelope: { ok, data, error }. Never assign the response envelope directly to an output state. Use response.data only after checking response.ok.
getState is not generic. Use casts after the call when needed, e.g. getState(key) as SomeType.
subscribe returns void and unsubscribe requires the same state keys plus component. Do not push subscribe() results into an array of unsubscribe callbacks.

## State generation

For every item in states[]:
- Declare one @property() class field.
- Property name is state.name when present; otherwise derive a safe camelCase name from stateKey.
- Initial value comes from state.defaultValue.
- actionStatus states use type "idle" | "loading" | "success" | "error" when valueSet matches.
- queryResult states use the matching contract output type when available.
- queryResult states with outputShape "array" default to [].
- queryResult states with outputShape "paginated" default to an object literal matching the contract
  Output's OWN keys — the collection field keyed by its DECLARED name (e.g. { stockItems: [], total: 0 },
  NOT assumed "items") plus its total; it must not be treated as an array. Rows come from that declared
  array field, whichever name the contract uses.
- queryResult states with outputShape "object" default to null. The object may contain array fields
  (e.g. a dashboard's orders/topSellers/lowStockAlerts) — those are read by their declared names.
- input states use string/number/boolean based on the matching contract field when available; otherwise unknown or string.
- businessContext states are shared string state for visible company/unit context. They are not command form inputs and must not be sent as typed workspaceId filters unless an action explicitly references their stateKey.

Maintain a mapping from stateKey to propertyName internally while generating code. Use it for all actions.

## i18n

The i18n block must be outside the class and wrapped exactly with these markers:

\`\`\`typescript
/// **collab_i18n_start**
const message_en = {
  // copy Definition.i18n exactly for Definition.i18nMeta.defaultLocale
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en };
/// **collab_i18n_end**
\`\`\`

The example uses "en". In the actual output, derive the language key from Definition.i18nMeta.defaultLocale:
- "en" -> message_en and messages.en
- "pt-BR" or "pt_BR" -> message_pt and messages.pt

Generate the default locale message object from Definition.i18n exactly.
For the current flat Definition.i18n catalog, generate only that default locale catalog.
Do not invent extra locale catalogs for Definition.i18nMeta.activeLocales unless Definition.i18n already contains per-locale catalogs.
Never declare the message object or messages inside the class.
Never write \`as const\` on message objects.

Inside the class expose this exact getter shape:

\`\`\`typescript
protected get msg(): MessageType {
  const lang: string = this.getMessageKey(messages);
  return messages[lang] || message_en;
}
\`\`\`

Replace message_en in the getter with the actual generated default message object name.

Every render-facing label must come from this shared class through this.msg.

## Action generation

For every action in actions[]:

1. kind === "stateSetter"
- Generate methodName exactly as action.methodName.
- Generate handlerName exactly as action.handlerName when present.
- The method updates the mapped property, calls setState(action.stateKey, value), and requests update if needed.
- The handler reads value from Event target for input/change events and delegates to the method.
- PREFILL: when action.prefill is present (selecting a row must pre-populate a command form), after
  setting this setter's own state and BEFORE returning, look up the selected item and populate the
  command's form inputs:
  - Read the collection from getState(action.prefill.sourceStateKey) (fall back to the mapped
    property for that state). When action.prefill.sourceOutputShape === "paginated", read its .items
    array; when "array", use the value directly. Treat a nullish/empty collection as no match.
  - Find the item where String(item[action.prefill.matchField]) === String(value).
  - If an item is found, for every entry in action.prefill.fields set the target input via
    setState(entry.targetStateKey, item[entry.itemField]) AND update that state's mapped property so
    the form reflects it; skip any entry whose item[entry.itemField] is null or undefined (never
    overwrite a form value with empty).
  - If no item is found (e.g. the selection was cleared or the value is empty), do not clear or
    overwrite the form inputs — leave their current values untouched.
  - Only use the state keys/fields listed in action.prefill; never invent additional field mappings.

2. kind === "query" or kind === "command"
- Generate methodName exactly as action.methodName.
- Generate handlerName exactly as action.handlerName when present.
- Set statusStateKey to "loading" before execBff, then "success" or "error".
- Build params from action.inputStateKeys by reading mapped properties.
- state.presentation === "form" is the only editable input. "selection" comes from the current
  selected entity/context and "route" comes from the URL; never render either as a typed field.
- Before an action call, parse Definition.routePattern against window.location.pathname and put each
  action.routeParamInputStateKeys value into its mapped property/params. Decode URL segments safely.
  Do not overwrite an already supplied contextual value with an empty string.
- If a required route param is absent, do not call execBff. Set the action status to idle, keep the
  query output at its default empty value and expose the existing empty-state UI instead of producing
  a 400. This applies to initialLoads and manual refreshes alike.
- action.selectedEntityInputStateKeys are contextual selection values. Include their mapped state
  values in params when present, but never generate an editable form control for them.
- Call execBff with action.routeKey when present; otherwise use "{moduleName}.{pageId}.{commandRef}". The route key is the first argument, not an option field.
- Use contract input/output interfaces only if they exist in contract .ts context.
- Write response data into action.outputStateKeys by mapping each stateKey to a declared property and calling setState.
- If the response is not ok, preserve/set the error status and expose/log the response error; do not set success.
- If the action has outputStateKeys, write response.data, falling back to the state's defaultValue only when response.data is nullish. Use [] only for array output states and { items: [], total: 0 } only for paginated output states.
- Query actions used in initialLoads must be safe to call without explicit params.
- Command actions may have refreshActionIds. After a successful command response and output-state write, call the referenced query actions by their methodName from Definition.actions. Use the existing query methods so they run with silent BFF mode and update their queryResult states. Set command success only after the refresh calls complete; if a refresh fails, leave the command in error instead of showing success with stale data.
- Command actions may have errorStateKey, feedback and clearInputStateKeys. On a failed response, store the backend AppError message in errorStateKey before setting error. On success, refresh first, then clear every clearInputStateKeys property/state and set success. Do not replace backend error text with a generic label.
- feedback.successMessageKey and feedback.errorMessageKey are the textual, dismissible feedback contract used by page11. The success key describes the completed domain action; the error key is only a fallback when the backend did not provide an AppError message.
- Handler wrappers must use runBlockingUiAction for command actions and may call query methods directly for query actions.

## Lifecycle

Declare connectedCallback and disconnectedCallback with PUBLIC visibility to match CollabLitElement
(they are public there). Write them as "connectedCallback(): void { ... }" /
"disconnectedCallback(): void { ... }" — NEVER "protected connectedCallback" (a narrower visibility than
the base member is a TS2415 "incorrectly extends" compile error). Use "override" if the base declares it.

connectedCallback:
- call super.connectedCallback()
- initialize state from getState where useful, falling back to defaultValue
- subscribe to shared states only if unsubscribe is implemented
- run every initialLoads[] action

disconnectedCallback:
- unsubscribe any subscriptions created
- call super.disconnectedCallback()

State delivery (REQUIRED when the class subscribes itself):
- Implement "handleIcaStateChange(key: string, value: unknown): void" — the notify contract of
  collabState. Assign the value to the class field mapped to that stateKey (same mapping used by
  initStateValue) and call this.requestUpdate(). Without it, data written by setState never
  re-renders the page (102049: BFF returned rows, screen stayed empty).

## Guardrails

- If page11 references a stateKey that is not in Definition.states[], do not invent it.
- If an action references an input/output stateKey that is missing from states[], leave a short TODO comment and keep code compiling.
- Do not create manual input state for technical/runtime context such as workspaceId, actorSession, businessContext, currentWorkspace or systemDefault unless it is explicitly present in Definition.states[]. Route and selected-entity states supplied by Definition are contextual browser inputs, not manual controls.
- Business scope should come from visible company/unit context when the page provides it, or from the backend/session default; do not ask the user to type workspaceId as a business filter.
- No local render state.
- No DOM or HTML.
- No guessed handler names.
- No guessed contract interface names.
`;
