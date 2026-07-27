# CHANGELOG — t3-generate

- 2026-07-27: created (Fase 3 do todo-agent-new-theme.md; spec: flow.json t3-generate).
  Gate strategy decided here: validate the SOURCE statically and feed the reconstructed
  module to the shared validator. Evaluating the generated code (`new Function` / blob
  import) was rejected — it needs TypeScript stripping, is CSP-hostile in the Studio, and
  would run model-written code inside the agent. The prompt pins the exact skeleton, so a
  parse failure is a real defect the single retry can fix.
- 2026-07-27: a 2nd gate failure fails the step (the pipeline stops with nothing written)
  instead of reporting the failure at Checkpoint 2 — a confirmation screen with no theme
  to confirm has nothing to offer the user, and the step trace already carries the errors.
