<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-contract-shared/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-16 (fix — multi-selection key input is a list): contractFieldFromOperationInput
  (helpers/cfeCreateShared.ts) now emits `<type>[]` when the l4 operation has
  `accessPattern.selection: 'multiple'` and the input's fieldRef equals `accessPattern.keyField`
  (new isMultiSelectionKeyInput). petShop setProductHighlights declared `productIds: string` while
  both the backend usecase and the generated shared send `string[]` — the l4 judge flagged it
  (trace 027) but the derivation ignored selection. Current 102049 defs/test hand-aligned;
  regenerates identically on the next run.
- 2026-07-16 (item 2a — generated BFF page tests): the step now also writes a deterministic
  `web/desktop/page11/<page>.test.ts` per page (`savePageTestsFile`/`buildPageTestCases` in
  helpers/cfeCreateShared.ts) — declarative `pageTests` (no LLM, no node:test, no .defs.ts, like
  seeds.ts). Coverage: 1 `ok` case per BFF routine (queries assert minItems for lists) + 1 validation
  case per required command field (omit one, expect VALIDATION_ERROR). Required params use the
  `<seedRef>` marker resolved at run time by the monitor runner from parameterless-query output. The
  config composers (saveFrontendWorkspaceConfig + nodejsSaveConfigJson.ts) publish the on-disk test
  files to `modules[].frontend.pageTests` (resolver `_<id>_/....test.js` form); the ProjectModuleFrontendConfig
  type in 102029 gained `pageTests?: string[]`. Runner/UI/env-gate live in mls-102034 (monitor). No
  frontend orphan/validateAll check exists, so no allowlist was needed. tsc clean (both configs); live
  validation on next devenv regen.
- 2026-07-16 (item 1 — manage-form prefill): shared defs now emit a declarative `prefill` on the
  selector's stateSetter action (`sharedActions`/`buildManagePrefills` in helpers/cfeCreateShared.ts).
  When a command has a route/selection selector field whose id also appears in a same-page query
  result, and the command's form inputs match that query's output columns by name, the selector setter
  carries `{ sourceStateKey, sourceOutputShape, matchField, fields[] }`. genCfeSharedTs materializes
  the row lookup + form pre-population; validateSharedLayoutRefs asserts the prefill source/target
  states exist. Fixes run-16/07 bug: /cafeFlow/stockManagement "Editar" set only stockItemId, leaving
  name/unit/minimumLevel empty -> 400 VALIDATION_ERROR on save. Verified via defs shape against the
  generated 102051 stockManagement/menuManagement; live validation on next regen.
- 2026-07-14: introduced the deterministic contract/shared barrier before layout generation.
