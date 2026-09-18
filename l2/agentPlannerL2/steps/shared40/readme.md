# shared40 — one shared `.defs.ts` per workspace

LLM step. Derived keys come from the workspace cut and the contracts; the model writes judgment (`scenaries`, `states`, `dataBindings`, `initialLoads`, `actions`, `destructiveCommandIds`, `pageName`).

## Input

- `l2/<mod>/pipeline/workspaces20-draft.json`
- `l2/<mod>/pipeline/contracts30-draft.json`
- Module l4 journeys (origin owners)

## Output

`l2/<mod>/web/shared/{workspaceId}.defs.ts` plus draft `l2/<mod>/pipeline/shared40-draft.json`.
Done-anchor `shared40-done` unlocks `requests50`.

## Invariants

- Same 20 keys as `mls-102039/.../atendenteCatalogue.defs.ts`. A key without a page11/page21 reader does not enter.
- Code writes `pageId`, `moduleName`, `baseClassName`, `routePattern`, `sourceKind`, `ownerIds`, `operationIds`, `origin`, `contractRef`, `layoutRef`, `businessContextRefs`, `navigationRefs`, `automation`.
- Gate: every `operationId` / `contract:` cites an existing call; every command scene cites an existing `cmd*`; `preconditions` are declared `stateKey`s; `destructiveCommandIds` ⊆ commands.
- Emitted file is `export const definition = { … } as const` plus the mls header. No class, no page.
- Bounded repair (2) and one transport retry, NS5 pattern.
