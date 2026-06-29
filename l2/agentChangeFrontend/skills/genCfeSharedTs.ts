/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfeSharedTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Shared TS Skill

Generate the shared/base TypeScript file for one Stage 2 frontend page.
This file is headless: it owns state, i18n, backend calls and handlers. It never renders and never registers a custom element.

## Input contract

Definition is the shared .defs.ts object:
- pageId, pageName, moduleName, sourceKind, ownerIds, operationIds
- contractRef: points to contract .defs.ts and contract .ts
- layoutRef: points to page11 .defs.ts
- states[]: the complete shared/global state inventory
- actions[]: all BFF actions and all stateSetter actions used by render
- initialLoads[]: query actions to run on connectedCallback
- navigationRefs[]
- i18n: the only place where UI text values live
- automation

Context Files include contract .defs.ts, contract .ts and page11 .defs.ts.

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
  - contract types from /_{project}_/l2/{moduleName}/web/contracts/{pageName}.js, using only interfaces/types that exist in the contract .ts context
- export class {ModulePascal}{PagePascal}Base extends CollabLitElement

Do not use customElement.
Do not implement render().

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
- queryResult collection states default to [] and use the matching contract output type when available.
- input states use string/number/boolean based on the matching contract field when available; otherwise unknown or string.

Maintain a mapping from stateKey to propertyName internally while generating code. Use it for all actions.

## i18n

The i18n block must be outside the class and wrapped exactly with these markers:

\`\`\`typescript
/// **collab_i18n_start**
const message_pt = {
  // copy Definition.i18n exactly for Portuguese
};
const message_en = {
  // same keys translated to English
};
type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = { en: message_en, pt: message_pt };
/// **collab_i18n_end**
\`\`\`

Generate message_pt from Definition.i18n exactly.
Generate message_en by translating the same keys.
Never declare message_pt, message_en or messages inside the class.
Never write \`as const\` on message objects.

Inside the class expose this exact getter shape:

\`\`\`typescript
protected get msg(): MessageType {
  const lang: string = this.getMessageKey(messages);
  return messages[lang] || messages['en'];
}
\`\`\`

Every render-facing label must come from this shared class through this.msg.

## Action generation

For every action in actions[]:

1. kind === "stateSetter"
- Generate methodName exactly as action.methodName.
- Generate handlerName exactly as action.handlerName when present.
- The method updates the mapped property, calls setState(action.stateKey, value), and requests update if needed.
- The handler reads value from Event target for input/change events and delegates to the method.

2. kind === "query" or kind === "command"
- Generate methodName exactly as action.methodName.
- Generate handlerName exactly as action.handlerName when present.
- Set statusStateKey to "loading" before execBff, then "success" or "error".
- Build params from action.inputStateKeys by reading mapped properties.
- Call execBff with action.routeKey when present; otherwise use "{moduleName}.{pageId}.{commandRef}". The route key is the first argument, not an option field.
- Use contract input/output interfaces only if they exist in contract .ts context.
- Write response data into action.outputStateKeys by mapping each stateKey to a declared property and calling setState.
- If the response is not ok, throw or set error state. If the action has outputStateKeys, write response.data, falling back to [] only for array output states.
- Query actions used in initialLoads must be safe to call without explicit params.
- Handler wrappers must use runBlockingUiAction for command actions and may call query methods directly for query actions.

## Lifecycle

connectedCallback:
- call super.connectedCallback()
- initialize state from getState where useful, falling back to defaultValue
- subscribe to shared states only if unsubscribe is implemented
- run every initialLoads[] action

disconnectedCallback:
- unsubscribe any subscriptions created
- call super.disconnectedCallback()

## Guardrails

- If page11 references a stateKey that is not in Definition.states[], do not invent it.
- If an action references an input/output stateKey that is missing from states[], leave a short TODO comment and keep code compiling.
- No local render state.
- No DOM or HTML.
- No guessed handler names.
- No guessed contract interface names.
`;
