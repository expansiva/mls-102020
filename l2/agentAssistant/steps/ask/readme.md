# ask-<n> — one human round

Mechanics (skills/collab_messages.md, "Rendering a checkpoint"):
1. `beforePromptStep` makes a cheap call (`prompt.md`, modelType `general`) whose only output is
   `{ type: 'clarification', json: { planId: 'ask-<n>' } }`.
2. `afterPromptStep` checks the envelope and returns `[]`. Keeping the payload is what keeps the
   widget mounted.
3. `beforeClarificationStep` reads `state.pending` from longMemory, refuses a stale round
   (`roundOfPlanId(planId) !== state.round`) and mounts `widget-decision-clarification-102020`
   inside the `helpers/asBusy` host. After a click the widget is read-only, under a loading overlay
   that stays until the task has been updated.
4. On the answer (`applyAnswers`):
   - confirmed → `buildWireInput` + `/execBff`, then a `done`/`error` result;
   - otherwise → `planNext`, then `ask-<n+1>` is added under the root FIRST, followed by the
     completed `ask-<n>-answer` and the clarification close;
   - cancel → a `Cancelado` result. Nothing is sent.

Question ids: `__route` (which action), `ref:<path>` (a record: an option is a row, typed notes run
a new search), `val:<path>` (a value: an option for enums/booleans, notes otherwise),
`__confirm`.
