# agentNewSolution4

L4 product compiler with E1 and E2 implemented and the complete build roadmap visible from the
start of the task.

Invocation:

- `@@newSolution4 petShop` — create a module or resume its next incomplete v4 step;
- `@@newSolution4 petShop /fast` — auto-accept the proposed clarification and E2 review;
- an existing module without an `agentNewSolution4` pipeline is rejected.

The root planner reads the prompt language, validates the request and translates the friendly titles
for E1 through E9. It creates the complete dependency graph before E1 starts, so the user can see what
will be delivered next. The titles and detected language are persisted in both permanent artifacts;
the orchestration does not translate or infer them again in later steps.

E1 writes:

- `l4/<module>/module.defs.ts` — partial permanent module contract;
- `l4/<module>/pipeline/pipeline.json` — resumable build state.

E1 is split into two dependency-driven steps. `e1-clarification` owns the LLM proposal and widget. Its
callback writes only the durable `e1-clarification-answer` result. `e1-compile` is then unlocked and
deterministically validates and writes the artifacts. This is the same proven lifecycle used by the
stable agent and requires no local UI cache synchronization.

After E1 approval, the already-planned E2 step is unlocked automatically. E2 first writes a review
draft, then opens a journey widget where the user can approve or request changes. If a run is
interrupted between steps, the same command resumes from the pipeline. Approval writes:

- `l4/<module>/journeys/<journeyId>.defs.ts` — permanent business source of truth;
- `l4/<module>/journeys/index.defs.ts` — journey/feature discovery index;
- updated module and pipeline status with `e3-ontology` as the next step.

`/fast` auto-approves both E1 and E2 proposals through the same durable answer/result contracts used by
the interactive flow. Without `/fast`, neither the E1 compile nor permanent E2 journeys can proceed
before the respective checkpoint is approved.

The flow contract lives in `docs/flow.json`. Canonical agent-engine guidance lives in
`mls-base/skills/collab_messages.md`, `agentsBestPractices.md` and `modelTypes.md`.
