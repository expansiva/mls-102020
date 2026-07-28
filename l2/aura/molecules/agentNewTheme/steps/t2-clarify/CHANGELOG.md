# CHANGELOG — t2-clarify

- 2026-07-27: created (Fase 3 do todo-agent-new-theme.md; spec: flow.json t2-clarify).
  The answer result carries planId `t2-done` directly (it IS the anchor), instead of a
  separate `t2-answer` result plus a `t2-done` emitted by the agent — one completed
  result both completes the emitting step and unlocks t3.

- 2026-07-28 (aproximar o prompt curto do longo): the checkpoint now ends with a FREE-TEXT
  SLOT (question field `extra`, no options) and can ask `displayName`. Reason: the canonical
  fields are coarse enums, so a short request could not reach the precision of a long one —
  `border.style: thick` cannot say `3px`, nothing could express the kinetic hover, and
  prohibitions ("no blur") had no home. The slot's text plus every per-question note are
  merged by helpers/ntAnswers into one guidance block that reaches generation verbatim and
  overrides the coarse choices. The widget's notes placeholder is now localized and, for the
  slot (which has no options), example-rich — `notesPlaceholder` was added to the shared
  Decision Clarification widget. `suffix` stays derived ('-' + name): the t3 gate requires it,
  so exposing it as an editable field would contradict the gate.
