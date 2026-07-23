# CHANGELOG — v2-shell

- 2026-07-23: created (Fase 2 do todo-agents-molecules-modelos-novos.md; spec: flow.json v2-shell).
- 2026-07-23: .defs.ts now REPLICATES the origin contract verbatim (reads the origin
  .defs.ts from mls.stor; swaps only the mls header fileReference + skill TagName)
  instead of emitting a thin generic stub — the previous stub dropped `layoutConfig`
  and the full skill (Responsibilities/Constraints) that other routines consume.
  Gate updated (defs_header + TagName line); missing origin defs fails readable.
