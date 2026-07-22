# e7-validation CHANGELOG

- 2026-07-07 — created (deterministic no-LLM step: cross-consistency health report with v2-style
  codes written to l4/{module}/trace/behavior-health-report.json; closing artifacts module.defs.ts,
  l5 todoFrontend/todoBackend (single owners list) and process.defs.ts; e7-validation.md summary;
  e7-done anchor). No JSON schema and no prompt.md (no LLM output); no retry step — E7 errors are
  upstream bugs and the user reruns after fixing the producing step.
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-18 — contract emission moved here (newSolution_10 N4): the mechanical contracts are now emitted as the LAST artifact of the flow (was e5-finalize — run-9 staleness), one file per bffCall (the page-shaped wire view declared in e6 workspaces), l4 ONLY (the l1/l2 mirrors are gone in this phase). helpers/nsContractsEmit.emitNsBffContracts(moduleName, workspaces, operations) → helpers/nsContracts.buildNsBffContractSet; A4.7: an empty projected Output throws and fails the step (never emit a silent {}). Reads the full workspace + operation defs already loaded by the health report.
- 2026-07-22 — handoff now PARALLEL: dispatchNsHandoff fires @@changeBackend and @@changeFrontend concurrently and races them against a 1000ms grace window instead of awaiting each in series. sendThreadMessage runs the spawned task inline, so the old serial await made newSolution block until the whole backend task finished (then the frontend). Both child tasks now run in parallel; newSolution returns promptly. Per-dispatch errors are still traced and never fail the already-persisted spec.
