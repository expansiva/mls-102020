# agentNewSolution4 skills

These local skills are the runtime context specific to the generator. Agent-engine rules are not
copied here; the canonical references are:

- `mls-base/skills/collab_messages.md` — hooks, intents, clarification rendering, scheduling and
  task-tree traps;
- `mls-base/skills/agentsBestPractices.md` — spec-first flow, one folder per step, persistence,
  gates, fan-out and maintenance boundaries;
- `mls-base/skills/modelTypes.md` — prompt model markers.

Read those files before changing orchestration. Keep `docs/flow.json` true before changing code.

Local skills:

- `platform.md` — capabilities supplied by collab.codes that generated modules must not recreate;
- `maintenance.md` — boundaries and verification protocol for this agent.
