<!-- mls fileReference="_102020_/l2/agentNewSolution3/steps/e1-draft/readme.md" enhancement="_blank" -->

# E1 - Draft

This step turns the initial user prompt and clarification 1 into a short understanding contract.

Inputs:
- Original user prompt.
- Answers from `e1-clarification`.
- Optional adjustment request from `checkpoint-draft`.

Outputs:
- `l4/{module}/pipeline/e1-draft.json`
- `l4/{module}/pipeline/e1-draft.md`
- `l4/{module}/pipeline/pipeline.json`
- Trace files under `l4/{module}/pipeline/trace/`

Rules:
- Do not create ontology, pages, tables, workflows or operations.
- Do not silently assume answers for blocking questions.
- The gate normalizes ids and module name before writing.
- The widget never writes artifacts; adjustments always rerun this step.

