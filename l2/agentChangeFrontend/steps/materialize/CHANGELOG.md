<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-28 (verify trace/verdict: no project-root fallback) — follow-up to the 22/jul module-scoping fix
  (todo/geracao/bug_trace.md). Two residual defects let the project root be polluted again:
  `saveMaterializeVerifyTrace` did not receive the caller's module (it re-derived one from the BROKEN items
  only, while `runVerify` already computes `moduleName` from ALL items and passed it to the verdict), and
  BOTH writers fell back to the bare `trace/frontend-materialize-verify` folder at the l2 root when no
  module could be derived. Fixes: the trace signature now mirrors the verdict —
  `saveMaterializeVerifyTrace(moduleName, planId, attempt, broken)` with `deriveTraceModule(broken)` kept
  only as a fallback for callers without it; and the root fallback is REMOVED from both — with no derivable
  module the write is skipped (`console.warn` + `return null`, already a tolerated best-effort outcome)
  instead of polluting `l2/trace`. Guard test asserts both signatures, the absence of the bare-root folder
  in either writer, and that the phase passes its moduleName to the trace. Also cleaned the committed junk
  in mls-102051 (`git rm -r l2/trace`, staged): the 3 pre-fix JSONs (savedAt 2026-07-23T01:0xZ) all had an
  identical module-scoped copy under `cafeFlow/trace/frontend-materialize-verify`, so nothing was lost —
  `obj/source.zip` still carries them until `pnpm buildCI` is re-run in that project.

- 2026-07-27 (systemic-failure guard: stop instead of repairing an environment fault) — 102051 run01: the
  Studio compiler could not resolve the bare `lit` import (TS2792), so EVERY generated file was "broken"
  on every round. Consequences: the broken set never shrank (pages 12->12->12->11, shared 6->6->6->5), the
  whole repair budget was spent regenerating files that were ALREADY CORRECT, and the rounds REGRESSED
  them — page21 kitchenWorkspace/dashboardWorkspace had ZERO real errors at attempt 1 and finished with 6
  (invented `updatedAt`) and 1 (wrong `alert` shape); stockManagement gained `.id`; and two shared files
  had their `lit` import rewritten by the repair LLM to Studio-only paths (`/_102029_/l2/lit/decorators.js`,
  `/_102029_/node_modules/lit/decorators.js`) that break the real tsc. In other words the repair loop was
  the CAUSE of the surviving tsc errors, not a failed cure. New guard `isSystemicPageFailure`
  (cfeMaterializeCore): when the FIRST compile (attempt 1) finds EVERY page11 item broken and there are at
  least SYSTEMIC_FAILURE_MIN_PAGES (3) of them, runVerify returns `failed` with MATERIALIZE-SYSTEMIC-FAILURE
  and does NOT start repair rounds — 3+ primary pages failing at once is an environment/config fault, not N
  independent code bugs. Deliberately narrow: only attempt 1 (a repair round never trips it), only page11
  (page21 is the experimental genome), min 3 pages (a 1-2 page module never trips), non-page phases
  ignored. The trace + verdict files are still written first, so the diagnosis survives the stop. Verified:
  6 unit tests for the guard's boundaries + replay of run01's REAL attempt-1 data (12 items / 6 page11 ->
  guard trips; same data as a repair round -> does not trip; run20's all-clear -> does not trip).

- 2026-07-23 (verify: reliable cross-file typecheck + always-written verdict + 3 rounds) — 102051 run19:
  shiftWorkspace passed the in-run verify yet failed `tsc -p` (TS2554/TS2352/TS2339). Root cause: the
  Studio per-file `compile` resolves an import to `any` when the dep model is not loaded, so cross-file
  errors vanish — and because the verify item set only SHRINKS (each round gets only the prior `broken`),
  a false-negative in round 1 is dropped forever. Fixes (agentCfeMaterializePhase + cfeCreateShared):
  (1) `verifyItem` now force-compiles a page's dependency .d.ts (shared base .ts + contract .ts, via
  getCompiledDtsByMlsPath) BEFORE compiling the page, so the per-file compile resolves cross-file types
  like `tsc` — reliable from attempt 1 (NOT weak-first/strong-last, which the shrinking set makes unsafe).
  (2) `saveMaterializeVerifySummary` ALWAYS writes one stable-named `<phase>-verify-summary.json`
  (module-scoped, overwritten each round) listing passed + still-broken — so "was it resolved?" has one
  place to look instead of inferring from absent per-round trace files. (3) MATERIALIZE_REPAIR_ROUNDS 2->3
  (Studio now diverges from the CLI's 2 on purpose — see the comment). CAVEAT: all new code runs only in
  the Studio in-browser compiler; it compiles + passes the unit suite here but its EFFICACY (does priming
  a dep's .d.ts actually make the page compile resolve it?) is confirmable only by re-running (run20).
  Watch-list if it still leaks: getCompiledDtsByMlsPath skips recompile when prodDTS is cached (may be
  stale/pre-repair); pages-phase dependsOn is the shared FANOUT, not shared verify/repairs (a page can be
  verified before the shared base is final). Escape hatch: use compileAll(project) at exhaustion to
  populate the summary's broken-list authoritatively.

- 2026-07-22 (generated typecheck tests: alias imports + unprefixed contract types) — 102051 run18: the
  deterministic typecheck tests (buildContractTypecheckTest/buildSharedTypecheckTest in cfeMaterializeCore)
  emitted RELATIVE imports (`./x.js`, `../contracts/x.js`) which the mls runtime/tsc cannot resolve, and
  referenced MODULE-PREFIXED contract DTO types (`CafeFlowListMenuItemsInput`) while the contract .ts
  (genCfeContractTs) and every runtime consumer (shared re-exports, page renders) use UNPREFIXED names
  (`ListMenuItemsInput`). Result: web/shared/*.test.ts failed to compile (relative-import resolution +
  42 "no exported member" errors); the runtime .ts had 0 errors, confirming unprefixed is canonical.
  Fixes (all in agentChangeFrontend): new `aliasJsImport` builds `/_<project>_/l2/...js` from the mls
  path for the self-import and the contracts import (replaces relativeJsImportPath); contract DTO type
  names dropped the module prefix (Base class name stays prefixed — it is exported prefixed and compiles);
  genCfeContractTs skill doc updated to mandate unprefixed `{CommandPascal}Input/Output/OutputItem`. Guard
  test added (cfeL4Contract.test.ts) asserting generated imports are alias-form + non-relative. The 6 stale
  102051 shared tests were regenerated deterministically → whole 102051 now compiles (0 errors).
- 2026-07-22 (materialize-verify trace is module-scoped) — saveMaterializeVerifyTrace wrote to the project
  root `l2/trace/frontend-materialize-verify` (rationale: "a phase spans every module"), but a run now
  processes ONE module, so the trace escaped the module folder (102051 run18: mls-102051/l2/trace/...).
  It now derives the module from the broken items' paths and writes under `<module>/trace/...`.

- 2026-07-16 (fix — contract typecheck drift + repair fan-out + prompt-as-data): (1) buildContractTypecheckTest now honors canonicalOutputShape when present (kind object/list/paginated; OutputItem asserted only for kind 'list') and fieldType builds nested object types from field.item.fields instead of unknown[] — the run16jul_b failure mode: the skill (genCfeContractTs, updated 16/jul) instructs typed named-interface arrays while the test expected unknown[] under exact Equal<>, so ALL contract repairs were unwinnable (12x TS2344 + 2x TS2724 left red in mls-102049 petShop; tests regenerated, mls-base tsc clean). (2) Repair rounds are now parallel fan-outs (repair1/repair2, planId `{verifyPlanId}-repair{round}`) whose args carry ONLY {planId, defPath, attempt}; agentCfeMaterializeGen recomputes the compiler errors from disk (computeRepairHint, attempt >= 2) and the hint travels in the LLM input (stripped by the interaction cleaner) — the old shape persisted repairHint in step prompts, which the cleaner keeps, risking the DynamoDB 400KB task cap; prompt_ready args are likewise stripped of any legacy repairHint. Fan-out slots are also deleted on completion, unlike the old per-item repair steps. (3) Context diet extended: _102029_ runtime deps of shared items are sent as compiled .d.ts (buildRuntimeDtsSection; raw sources were ~8k tokens per shared call), and trimDefinitionForPrompt now drops 'origin' for l2_shared too (~13% of the shared definition). Analysis: todo/generate/changeFrontend_run16jul_b.md.
- 2026-07-16 (perf — parallel slots 5 -> 10): raised the fan-out `maxParallel` default from 5 to 10 across agentChangeFrontend (materialize dispatcher `agentCfeMaterializeL2.ts`, phase `agentCfeMaterializePhase.ts`, and the `createAddStepIntent` default in `helpers/cfeCreateShared.ts`), plus the four fan-out declarations and the note in `flow.json`. Matches agentChangeBackend (already 10 in cbShared). Studio-declared per-step overrides still win (agentCfeMaterializePhase parses an explicit maxParallel).
- 2026-07-13: documented current dispatcher/phase/worker behavior, dynamic planId conventions, and moved the materialization agents into this step folder.
- 2026-07-16 (v5 context diet — flow.json materializationContextPolicy): the page-materialization context was cut from ~80KB to ~18KB per page. (1) The shared base class is now sent as its compiled .d.ts INSTEAD of the raw .ts — persisted to trace/frontend-shared-dts/{page}.txt right after the shared materializes (persistSharedDtsArtifact); readers use fresh artifact -> compile-on-demand (Studio) -> raw .ts (CLI fallback). (2) Definition payload is trimmed for the prompt only (trimDefinitionForPrompt drops the 'sections' summary and 'origin'; the .defs.ts file keeps both). (3) designSystem.ts is summarized to its token-name list (buildContextSection; ~16KB -> ~1KB, state suffixes folded). (4) page dependsFiles no longer carry shared/contracts .defs.ts (see create-layout CHANGELOG). (5) genCfeSharedTs now emits one-line JSDoc per member (state/action mapping, feedback keys, outputShape) and re-exports contract types, making the .d.ts self-sufficient; render skills read the mapping from JSDoc instead of shared .defs.ts and import DTO types from the shared re-exports. Both runtimes (agentCfeMaterializeGen and nodejsMaterializeL2) share the section builders in cfeMaterializeCore so the prompts do not drift. Verified: mls-base tsc clean; token extraction tested against 102051 designSystem.ts (110 keys -> 56 bases, 1004 bytes). Generation path NOT exercised — requires a full checkpoint run.
- 2026-07-16: page items now get the shared base class compiled .d.ts in context (msg-key closed vocabulary). 102051 run left strict-tsc errors in 3 generated pages: renders used this.msg keys that do not exist in the shared MessageType — invented ('lane.registered', 'empty.review') or abbreviated ('organism.dashboard.empty' vs 'organism.dashboardSummary.empty'). The raw shared .ts source was already in context but the LLM still guessed keys, and the Studio-side compile of the page did not always resolve the base class strictly enough to reject them (mls-base tsc, strict, does). Fix: (a) buildGenContext appends, for l2_page items, the compiled .d.ts (prodDTS) of every dependsFiles web/shared/*.ts via new cfeMaterializeStudio.getCompiledDtsByMlsPath — compiling the shared model on demand (mls.editor model -> mls.l2.typescript.compile) when prodDTS is absent; (b) page defs now carry msgKeys (sorted keys of the layout i18n) written by savePageLayoutDefs — a deterministic closed vocabulary that also reaches the CLI runtime, mirroring the fieldCatalog pattern that eliminated invented fields; (c) genCfePage11RenderTs/genCfePage21RenderTs now state that msgKeys is the closed key set and the .d.ts section is authoritative; labels without a key render from the data value, not a guessed key. CLI note: nodejsMaterializeL2 gets (b)+(c) only — (a) is Studio-only (needs the editor compiler); acceptable because msgKeys carries the same information deterministically.
