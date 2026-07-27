# t2-clarify — CHECKPOINT 1

Collects the theme fields the initial prompt did not pin down. Planted ONLY when
`plan.questions` is non-empty.

Mechanics (skills/collab_messages.md "Rendering a checkpoint"):
1. `beforePromptStep` emits a clarification into THIS step's own payload — a cheap call
   whose only job is returning `{ type: 'clarification', json: { planId: 't2-clarify' } }`.
   The questions are NOT in that payload: they come from `plan.json` (already gated).
2. `afterPromptStep` validates the envelope and returns `[]` — keeping the payload is what
   keeps the checkpoint mounted.
3. `beforeClarificationStep` mounts the shared `widget-decision-clarification-102020`
   (recommended options pre-selected, free-text notes where useful).
4. The answer is written to `l4/agentNewTheme/answers.json` and emitted as the completed
   result `t2-done` — the anchor `t3-generate` depends on. "Cancel" fails the step and the
   pipeline stops with nothing written.

Never a flat clarification in `nextSteps` (deadlock) and never a wrapper+child step.
Intent order on answer: the completed `t2-done` result lands BEFORE the `update-status`.
