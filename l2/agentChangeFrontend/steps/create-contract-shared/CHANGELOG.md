<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-contract-shared/CHANGELOG.md" enhancement="_blank" -->

- 2026-07-28 (state-name dedup vs action members): the derived input-state name `<actionId><FieldPascal>`
  could equal ANOTHER command's methodName — real case (mls-102045 projectDetail): updateWorkTask.status ->
  `updateWorkTaskStatus`, the methodName of operation updateWorkTaskStatus. State properties, action methods
  and handlers share one class namespace, so NO generation (LLM or deterministic scaffold) compiles past it —
  the typecheck test asserts both names. New pure helper `helpers/cfeMemberNames.ts`
  (commandMemberNames + dedupeSharedStateNames, 5 tests): `sharedDefinition` now dedupes state names against
  the reserved action members BEFORE sharedActions derives the setter pair from them; collisions get a
  deterministic `Value`/`Value2`... suffix (the mls-102045 defs was hand-patched to the same
  `updateWorkTaskStatusValue` this rule produces). Input states also reserve their derived
  `set<Name>`/`handle<Name>Change` pair (a command named `setPrice` would collide with the setter of a state
  named `price`). Backstop: cfeSharedScaffold.validateModel bails with "defs naming collision" on any
  residual case at materialize time.

- 2026-07-28 (page tests that can actually assert): the emitted `page11/<page>.test.ts` cases marked EVERY
  required param as `<seedRef>`, so on 102051 the measured coverage was 8 of 55 cases (20 of 24
  inconclusive; 29 more "passed" for the wrong reason — the backend rejected a different unresolved field
  before the one under test). `<seedRef>` means "take this from a page read", which only works for an
  entity id the page actually reads. Fixes, all derived from l4 (no LLM, no project-specific literal):
  (1) each required input is classified — `<seedRef>` ONLY for an entity id produced by ANOTHER read of
  the same page (a routine cannot feed itself: a getById query whose output repeats its own key used to
  look satisfiable), every other field gets a deterministic literal for its declared type (number->1,
  boolean->true, date->ISO date, datetime->ISO instant, free string->"teste"), and an enum/state field
  takes the SECOND declared value — the next valid transition, where `<seedRef>` resolved to the row's
  CURRENT state and a state-machine rule rejected it. To make this possible the wire now carries what it
  always knew but dropped: `commandFromBffCall` resolves each input's TS type + raw `l4Type` + `enum`
  (it hardcoded `type: 'string'`) and exposes `producedFields` / `collectionField`.
  (2) `expect.itemsKey` names the collection a paginated wire really returns (menuItems, orders…) instead
  of letting the runner assume `items`; absent itemsKey keeps the old assumption, so already-generated
  .test.ts files stay valid until regenerated.
  (3) a case whose required client-supplied id no read of the page produces is NOT emitted (it could never
  pass under any runner — permanent panel noise).
  (4) runtime-resolved inputs (actorSession, businessContext, activeLifecycleInstance, systemDefault) are
  omitted from params AND get no `.required` case: the backend derives them, so "omitting" one would send
  params identical to the ok case and the call would succeed while the case claims VALIDATION_ERROR.
  (5) the emitted header documents the real contract (harvest is every read, not just parameterless ones;
  TESTS_ENABLED, not "devenv only") and the `<seedRef>` rule, since humans read the file when a case fails.
  Verified on BOTH generated apps (the generator serves every client project): 102051 cafeFlow 6 pages ->
  48 cases, 31% seedRef / 69% literals (was 100% seedRef), 3/3 paginated with itemsKey, exactly one routine
  skipped (getShiftClosingReport — the D4 case, self-fed id) and every domain field the analysis listed
  (quantity, direction, reason, paymentMethod, shiftDate, totalAmount, unit, currentBalance, minimumLevel,
  orderType) now a valid literal; 102049 petShop 2 pages -> 12 cases, 45%/55%, 1/1 itemsKey, none skipped.
  7 unit tests cover the branches + determinism. NOT done (needs the contract x controller decision in
  changeBackend): a contract that declares a session-derived field required still declares it required —
  the generator now simply does not test it.

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
