# CHANGELOG — ask

- 2026-10-14: created. Reuses the shared Decision Clarification widget. Each round is a new agent
  step (`ask-<n>`) so that every planId stays unique.
- 2026-10-14: loading overlay (helpers/asBusy). On a click the widget turns read-only and an overlay
  ("Executando..." on the confirmation round, "Processando..." on the others) covers it until the
  task has been updated. Reason: in the first VM test the confirmation looked frozen while the
  command was going through /execBff, and the button could be clicked again. A second click while
  the first answer is still running is ignored. If the intents themselves cannot be applied, the
  round is handed back (overlay off, widget enabled).
- 2026-10-15: the task view now refreshes when the task ends inside the widget callback. Cause: the
  callback applied intents with msgApplyIntents directly and never persisted the task or emitted
  'task-change', and for a task that is already 'done' continuePoolingTask returns at once. So the
  confirmation screen stayed on screen under the overlay. helpers/asSteps.applyIntentsAndResume
  now follows the orchestration's sequence: thread pending tasks, then addOrUpdateTask in
  IndexedDB, then notifyTaskChange.
- 2026-10-15: answers go through `asPlan.advance`, so one answer can run several actions of a
  sequence. The closed round's title lists the actions it ran. The overlay says "Executando..."
  in any round of an authorized sequence, and cancelling reports how many actions already ran.
- 2026-10-15: when the run ends in something to read (an answer or a message, via
  `asPlan.finalFor`), the round opens the `answer` step instead of closing the task with a result.
