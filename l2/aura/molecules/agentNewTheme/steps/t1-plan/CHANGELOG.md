# CHANGELOG — t1-plan

- 2026-07-27: created (Fase 3 do todo-agent-new-theme.md; spec: flow.json t1-plan).
  Decision recorded in flow.json: the plan call lives in the ROOT (as flow.json's
  treeOverview already described) instead of a separate `agentNtPlan` step agent —
  the root already has to make one cheap call to create the task, and doubling it
  would cost a second LLM round-trip for the same classification.
- 2026-07-27 (1ª rodada no Studio, 102053): the gate demanded "2+ options" from EVERY
  question and failed the plan for `name`, `primary` and `border.color` — fields with
  nothing to enumerate, which t1 had (correctly) emitted as free text. The rule is now
  split: CLOSED fields (the enum ones, plus `typography.uppercaseLabels`) still need 2+
  options with enum ids; OPEN fields (`name`, `primary`, `border.color`, `background.css`)
  may carry no options at all, as long as `allowNotes: true` — otherwise the widget could
  never mark them answered (new code `question_unanswerable`). prompt.md now states the
  two kinds explicitly and shows an open question in the output example.
