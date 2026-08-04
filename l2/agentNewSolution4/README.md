# agentNewSolution4

Initial implementation of the L4 v4 product compiler. This delivery contains only E1.

Invocation:

- `@@newSolution4 petShop` — create a module or resume the v4 module named `petShop`;
- `@@newSolution4 petShop /fast` — accept the clarification defaults automatically;
- an existing module without an `agentNewSolution4` pipeline is rejected.

E1 writes:

- `l4/<module>/module.defs.ts` — partial permanent module contract;
- `l4/<module>/pipeline/pipeline.json` — resumable build state.

The flow contract lives in `docs/flow.json`. Canonical agent-engine guidance lives in
`mls-base/skills/collab_messages.md`, `agentsBestPractices.md` and `modelTypes.md`.
