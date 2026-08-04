<!-- mls fileReference="_102020_/l2/agentNewSolution4/skills/maintenance.md" enhancement="_blank" -->

# agentNewSolution4 maintenance protocol

Before changing orchestration, read the canonical references in `mls-base/skills/`, especially
`collab_messages.md` and `agentsBestPractices.md`.

Rules:

1. Change `docs/flow.json` before changing runtime behavior.
2. A step owns its prompt, gate, tests, readme and changelog under `steps/<step>/`.
3. Shared helpers contain only cross-step mechanics. They do not contain E1-specific policy.
4. Prompts live in Markdown, never inline in TypeScript.
5. Every completed step writes a permanent L4 artifact and updates the disk pipeline.
6. A gate is deterministic. Do not loosen it to absorb a model error.
7. Never overwrite an existing module unless its pipeline identifies this flow and the run is a
   legitimate resume.
8. Never use console output as trace or error handling.
9. Version schemas and update fixtures/tests together.
10. Run the touched tests and `tsc -p tsconfig.frontend.json --noEmit` before delivery.
