# Shared

One `web/shared/{workspaceId}.defs.ts` per workspace. The file is `export const definition = { … } as const` plus the mls header and the uiScenary contract comment. No class. No page.

The 20 keys and the named reader of each (page11 / page21 / genCfeSharedTs). A key without a reader does not enter.

| key | who reads it |
|---|---|
| `pageId` | genCfeSharedTs Input contract; genCfePage21 import path |
| `pageName` | genCfeSharedTs Input contract; genCfePage21 `{pageName}.js` |
| `moduleName` | genCfeSharedTs Input contract; genCfePage21 import path |
| `baseClassName` | genCfeSharedTs class name; genCfePage21 `extends Definition.baseClassName` |
| `routePattern` | genCfeSharedTs parses it against the URL |
| `sourceKind` | genCfeSharedTs Input contract |
| `ownerIds` | genCfeSharedTs Input contract |
| `operationIds` | genCfeSharedTs Input contract |
| `origin` | genCfeSharedTs page origin from the workspace cut |
| `contractRef` | genCfeSharedTs `tsPath` + `contracts[]` `{ commandName, routeConst }` |
| `layoutRef` | genCfeSharedTs (page11 defs path; pages are a later step) |
| `states` | genCfeSharedTs `states[]`; page11/21 JSDoc `state <stateKey>` |
| `actions` | genCfeSharedTs `actions[]`; page11/21 JSDoc `action <actionId>` |
| `scenaries` | page11/21 skeleton: one `<Scene value>` per `scenaries[].value` |
| `destructiveCommandIds` | page11/21 / uiScenary: never become scenes (stay a modal) |
| `initialLoads` | genCfeSharedTs `connectedCallback` |
| `dataBindings` | genCfePage21 `Definition.dataBindings[]` is the structure source |
| `businessContextRefs` | genCfeSharedTs; page21 businessContext badge |
| `navigationRefs` | genCfeSharedTs Input contract |
| `automation` | genCfeSharedTs Input contract |

Reuse the CF shared skill rules for the keys the model writes:

- `states[]` is the only reactive inventory. `actions[]` is the only method/handler inventory.
- Scene `{ value, kind: "base"|"detail"|"command", commandName, preconditions: stateKey[] }`. `preconditions` are required route/selection inputs, never form fields.
- Always emit a `base` scene. Detail exists when a list and a get-by-id share the page. Each non-destructive command is its own scene, named without the `cmd` prefix.
- `destructiveCommandIds` are `cmd*` that stay a confirmation modal (`delete*` / `cancel*`). They are not scenes.
- Query `initialLoads` must be safe without user/selection params. Required route params are filled before they run.
- `state.presentation === "form"` is the only editable input. `"selection"` comes from the selected entity; `"route"` from the URL.
- queryResult `outputShape`: `paginated` for list (collection field `{entity}Items`, never `items`); `object` for get/ddm.
- Command actions may declare `refreshActionIds`, `errorStateKey`, `feedback`, `clearInputStateKeys`.

This planner adds:

- Code writes `pageId`, `moduleName`, `baseClassName`, `routePattern`, `sourceKind`, `ownerIds`, `operationIds`, `origin`, `contractRef`, `layoutRef`, `businessContextRefs`, `navigationRefs`, `automation`. Do not resubmit those.
- `sourceKind` / `origin.workspaceKind`: catalogue or command → `operation`; hub → `landing`.
- `ownerIds`: `workspace:{id}` plus `contract:{module}.{workspace}.{callName}` per call.
- `operationIds` are the call names of that workspace's contract.
- `baseClassName` is `ModulePascalPagePascalBase`.
- `routePattern` is `/{module}/{pageId}`.
- One file `web/shared/{workspaceId}.defs.ts`. No `web/shared/*.ts` class in this step.
