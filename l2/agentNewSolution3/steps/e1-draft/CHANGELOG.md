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
