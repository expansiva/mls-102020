# CHANGELOG — t1-plan

- 2026-07-27: created (Fase 3 do todo-agent-new-theme.md; spec: flow.json t1-plan).
  Decision recorded in flow.json: the plan call lives in the ROOT (as flow.json's
  treeOverview already described) instead of a separate `agentNtPlan` step agent —
  the root already has to make one cheap call to create the task, and doubling it
  would cost a second LLM round-trip for the same classification.
