<!-- mls fileReference="_102020_/l2/agentNewSolution/skills/maintenance.md" enhancement="_blank" -->

# agentNewSolution maintenance protocol

Before changing orchestration, read the canonical references in `mls-base/skills/`, especially
`collab_messages.md` and `agentsBestPractices.md`.

Rules:

1. Change `docs/flow.json` before changing runtime behavior.
2. A step owns its prompt, gate, tests, readme and changelog under `steps/<step>/`.
3. Shared helpers contain only cross-step mechanics. They do not contain E1-specific policy.
4. Prompts live in Markdown, never inline in TypeScript.
5. Every implemented compile phase writes a permanent L4 artifact and updates the disk pipeline;
   clarification and result anchors only coordinate those phases.
6. A gate is deterministic. Do not loosen it to absorb a model error.
7. Never overwrite an existing module unless its pipeline identifies this flow and the run is a
   legitimate resume.
8. Console output is not a durable trace or a substitute for a failed step status.
9. Version schemas and update fixtures/tests together.
10. Run the touched tests and `tsc -p tsconfig.frontend.json --noEmit` before delivery.
11. Approved pipeline states are monotonic; a late or duplicate callback must never regress them.
12. Immediate successors receive a bounded approved result handoff and use permanent L4 artifacts
    for resume. Draft files are never approval evidence.
