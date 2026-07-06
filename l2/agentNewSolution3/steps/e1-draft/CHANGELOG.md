<!-- mls fileReference="_102020_/l2/agentNewSolution3/steps/e1-draft/CHANGELOG.md" enhancement="_blank" -->

# E1 Draft Changelog

- 2026-07-05: Created E1 with schema, gate, separated prompt, fixture and checkpoint widget.
- 2026-07-05: C01 saved partial E1 artifacts before blocking clarification and added `e1-clarification-extra` handling with E1 rerun.
- 2026-07-05: C02 connected gate retry as a controlled second E1 attempt with retry context and attempt 2 trace.
- 2026-07-05: C03 made invalid root prompts fail early while still opening clarification 1.
- 2026-07-05: C04 added `checkpoint-draft` to the initial tree and reopens the existing checkpoint after E1 reruns.
- 2026-07-05: C05 moved checkpoint labels to root-plan `uiLabels` with local English fallback only.
- 2026-07-05: C06 aligned `flow.json` with the implemented root clarification, dynamic blocking clarification, and `uiLabels`.
- 2026-07-05: C07 hardened required prompt reads, pipeline fallback, trace fallback, description text, and unused imports.
- 2026-07-05: Aligned initial clarification with agentNewSolution2 format: `agentNs3Draft` now emits the runtime clarification payload instead of the root adding a ready-made clarification step.
- 2026-07-06: Tolerate structured `.json` content from `mls.stor.getContent()` when reading E1 schema and artifacts in the collab.codes runtime.
- 2026-07-06: Apply clarification results through a non-terminal parent step so completed agent containers are not modified by `add-step` intents.
- 2026-07-06: Let dependency unlocking move E1 from `waiting_dependency` to `waiting_human_input`; removed manual `pending` promotion and made rerun steps start as `waiting_human_input`.
- 2026-07-06: Enforced the E1 tool-call envelope with `x-tool-strict` and made `status` control whether blocking questions open a human clarification.
- 2026-07-06: Fixed the "checkpoint shows as another clarification / never renders" bug. `checkpoint-draft` is now a no-LLM wrapper agent step (mirroring `agentNewSolutionFinal`) whose child clarification `checkpoint-draft-view` renders `widgetNs3Draft`. A clarification placed as a flat sibling in `nextSteps` cannot be resolved by the frontend (`getInteractionStepId` walks `interaction.payload`), so it must be nested under an agent. `agentNs3Draft.beforePromptStep` completes the wrapper without an LLM call; `e1-draft` no longer calls `activateCheckpointClarification` (the wrapper auto-runs via its dependency on `e1-draft`); `beforeClarificationStep` now renders on planId `checkpoint-draft-view`. `e2-journeys` now depends on `checkpoint-draft-view` (the step that completes on human approval).
- 2026-07-06: SUPERSEDED the wrapper approach — it deadlocked (verified in msgtask3: `checkpoint-draft` stuck `in_progress`). An agent step with a child clarification is a "container": the parent cannot complete until the child finishes, and the child (`dependsOn` the parent) cannot start until the parent completes. New approach matches the working `e1-clarification` / `agentNewSolution2Requirements` pattern: `checkpoint-draft` is a plain agent step that EMITS the review clarification into its OWN `interaction.payload` via `prompt_ready` (`checkpointSystemPrompt`, codefast); `afterPromptStep` keeps the payload (`handleCheckpointDraftPayload`); `beforeClarificationStep` renders `widgetNs3Draft` on planId `checkpoint-draft`. On approve, `widgetNs3Draft` writes a completed `checkpoint-draft-answer` result (which completes `checkpoint-draft` via children and unlocks `e2-journeys`, now depending on `checkpoint-draft-answer`). Rule: never use an agent step as a passive container for a child step.
