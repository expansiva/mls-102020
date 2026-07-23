# CHANGELOG — v4-index

- 2026-07-23: created (Fase 2 do todo-agents-molecules-modelos-novos.md; spec: flow.json v4-index).
- 2026-07-23: reworked from a deterministic import-inserter into an LLM step that
  regenerates the full group showcase (hero + cards + reference table) reusing the
  `indexGroupPage` skill — the index now looks like what `agentUpdateIndexGroupPage`
  produces, instead of only registering an import. Added v4-index.schema.json,
  prompt.md, best-effort compile + agentNewMoleculeFix chaining, and ok:false
  resilience so index failure never blocks the pipeline. Removed the obsolete
  `renderNewGroupIndexTs`/`insertIndexImport` renderers.
