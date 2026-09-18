# shared40

## 2026-09-18 (p2_04)

- Shared defs per workspace in the 102039 form (20 keys). Code writes the derived keys; the model writes judgment (`scenaries` / `states` / `dataBindings` / `initialLoads` / `actions` / `destructiveCommandIds` / `pageName`).
- Gate: cited calls exist; command scenes cite `cmd*`; preconditions are declared stateKeys; destructive ⊆ commands; no key without a page11/page21 reader.
- Emitter writes `web/shared/{workspaceId}.defs.ts` (`export const definition = { … } as const`). No class, no page.
- Fixture: mensalidadesAcademia.
