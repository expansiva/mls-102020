# CHANGELOG — t2-clarify

- 2026-07-27: created (Fase 3 do todo-agent-new-theme.md; spec: flow.json t2-clarify).
  The answer result carries planId `t2-done` directly (it IS the anchor), instead of a
  separate `t2-answer` result plus a `t2-done` emitted by the agent — one completed
  result both completes the emitting step and unlocks t3.
