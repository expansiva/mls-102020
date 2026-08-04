# E1 — initial module contract

E1 owns the first human clarification and writes the first permanent L4 artifact.

Inputs:

- initial prompt;
- clarification answers, or proposed defaults in `/fast` mode.

Outputs:

- `l4/{module}/module.defs.ts`;
- `l4/{module}/pipeline/pipeline.json`.

Persistence order is intentional:

1. write pipeline with E1 `running`;
2. validate and write `module.defs.ts`;
3. mark E1 `approved` in pipeline.

If the run stops after item 1 or 2, `@@newSolution4 <module>` recognizes its own partial pipeline and
reruns E1. A folder with no v4 pipeline marker is never overwritten.

`/fast` applies the LLM-proposed defaults directly in `afterPromptStep`; it does not rely on rendering
the clarification widget.
