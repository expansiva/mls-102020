# agentNewSolution4

Initial implementation of the L4 v4 product compiler. This delivery contains E1 and E2.

Invocation:

- `@@newSolution4 petShop` — create a module or resume its next incomplete v4 step;
- `@@newSolution4 petShop /fast` — accept the clarification defaults automatically;
- an existing module without an `agentNewSolution4` pipeline is rejected.

E1 writes:

- `l4/<module>/module.defs.ts` — partial permanent module contract;
- `l4/<module>/pipeline/pipeline.json` — resumable build state.

The task root is a deterministic bootstrap; a dedicated E1 child agent owns the clarification. This
keeps the widget lifecycle isolated from the root and lets the screen close normally after submission.

Run the same command after E1 approval to start E2. E2 first writes a review draft, then opens a
journey widget where the user can approve or request changes. Approval writes:

- `l4/<module>/journeys/<journeyId>.defs.ts` — permanent business source of truth;
- `l4/<module>/journeys/index.defs.ts` — journey/feature discovery index;
- updated module and pipeline status with `e3-ontology` as the next step.

`/fast` auto-approves both E1 and E2 proposals. Without `/fast`, neither permanent E2 journey nor E2
approval state is written before the checkpoint is approved.

The flow contract lives in `docs/flow.json`. Canonical agent-engine guidance lives in
`mls-base/skills/collab_messages.md`, `agentsBestPractices.md` and `modelTypes.md`.
