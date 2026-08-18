# E1 — initial module contract

E1 owns the first human clarification and writes the first permanent L4 artifact.

The task root calls the planning LLM first. Its strict result contains the prompt language, friendly
localized titles for every planned phase and the initial clarification proposal. The complete E1–E9
roadmap is created before execution begins and its presentation metadata is later persisted in L4.

`e1-clarification` refines that proposal and owns the widget lifecycle. Approval publishes the
`e1-clarification-answer` result and completes only the clarification step. The already-planned
`e1-compile` step depends on that result, so `collab-messages` unlocks it naturally. Compilation is
deterministic: it validates and persists the module contract and pipeline, then publishes `e1-result`,
which unlocks E2. No callback modifies IndexedDB, emits a task-change event or manufactures a second
copy of the future plan.

Inputs:

- initial prompt;
- clarification answers, including the product language list, or proposed defaults in `/fast` mode.

Outputs:

- `l4/{module}/module.defs.ts`;
- `l4/{module}/pipeline/pipeline.json`.

Persistence order is intentional:

1. write pipeline with E1 `running`;
2. validate and write `module.defs.ts`;
3. mark E1 `approved` in pipeline.

If the run stops after item 1 or 2, `@@newSolution <module>` recognizes its own partial pipeline and
continues its next incomplete step. A folder with no v4 pipeline marker is never overwritten, and an
older flow version is not silently migrated. A single-token invocation is normalized before the root
planner (`BuildFlowFsm23` resolves to `buildFlowFsm23`), preventing a valid resume from opening a new
E1 tree because of capitalization alone.

`/fast` uses the normal widget contract with automatic acceptance. The interactive and automatic paths
therefore publish the same answer anchor and unlock the same compile step.

`userLanguage` controls the clarification language only. The editable `productLanguages` answer owns
the application's complete language list and is normalized into unique BCP-47 tags in
`module.languages` (for example `pt-br, en, es` becomes `pt-BR`, `en`, `es`).

The LLM controls presentation text only. Stable plan IDs (`e1-clarification`, `e1-compile`, `e1-result`,
and `e2-result`) remain language-independent and are the sole dependency anchors.
