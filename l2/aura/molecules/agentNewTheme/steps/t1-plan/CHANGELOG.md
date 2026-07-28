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
- 2026-07-28 (item 2 do plano do checkpoint, todo 12.7): CONFIRM THE INFERENCE. The user could
  not fix a theme name they never saw: the plan inferred `brutalismo` from "tema brutalismo",
  put it in `known`, and the gate FORBADE asking a known field (`question_known`) — so the
  suffix shipped as `-brutalismo` on every molecule, and the only moment to edit it was after
  the file existed. Three changes: (1) prompt.md — `known` is ONLY what the request STATES;
  anything inferred becomes a question with the inference pre-selected; (2) identity (`name` +
  `displayName`) is asked whenever the checkpoint runs, as a single recommended option plus
  free text, with a note that `name` is the molecule suffix so it must stay short; (3) the gate
  rule flipped: `question_known` (reject) became `question_not_preselected` (a decided value
  may be asked, but must arrive pre-selected). NT_MAX_QUESTIONS 8 -> 14, because the worst case
  is now 7 closed + 2 identity + 3 open + the slot = 13 and the cap silently drops the tail.
