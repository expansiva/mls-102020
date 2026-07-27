# CHANGELOG — t3-generate

- 2026-07-27: created (Fase 3 do todo-agent-new-theme.md; spec: flow.json t3-generate).
  Gate strategy decided here: validate the SOURCE statically and feed the reconstructed
  module to the shared validator. Evaluating the generated code (`new Function` / blob
  import) was rejected — it needs TypeScript stripping, is CSP-hostile in the Studio, and
  would run model-written code inside the agent. The prompt pins the exact skeleton, so a
  parse failure is a real defect the single retry can fix.
- 2026-07-27 (1ª rodada no Studio, 102053): prompt.md had NO `<!-- modelType: ... -->`
  marker, so the platform fell back to a cost-based selection and the call died with
  `404 Model alias not found or inactive: cost`. Added `<!-- modelType: design -->`
  (flow.json's "generation" alias; same marker v3-less uses to author theme CSS).
- 2026-07-27 (ajuste A1, todo Fase 9): the confirmation checkpoint was removed from the
  flow, so THIS step became the writer: on a green gate it writes theme.ts + theme.html,
  compiles the .ts best-effort and emits the terminal t3-done with { theme, files[],
  compiled }. Gained `openStepView` mounting the shared Theme Confirmation widget in
  `readonly` mode (a view, not a gate). The draft.json write was KEPT: the structured
  summary is not deterministically recoverable from theme.ts.
- 2026-07-27: a 2nd gate failure fails the step (the pipeline stops with nothing written)
  instead of reporting the failure at Checkpoint 2 — a confirmation screen with no theme
  to confirm has nothing to offer the user, and the step trace already carries the errors.
