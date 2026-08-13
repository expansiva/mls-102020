# E8 — Workspaces

E8 derives the workspace skeleton mechanically from approved E2–E7 artifacts. The single human
checkpoint approves the map; the parallel workers only add field-level organisms and command input
sources. Permanent output is `workspaces/<workspaceId>.defs.ts` and `workspaces/index.defs.ts`; every
finalizer round also writes the diagnostic history to `pipeline/e8-validation-report.json`.
Candidate context edges come from adjacent steps and exact E2 prerequisite handoffs whose
`providesContext` matches a provider step and a consuming target step.
Workspace-detail workers submit the strict internal `{type:"flexible",result:{…}}` envelope to avoid
provisional failed status for healthy artifacts.
The review widget becomes non-interactive before emitting its event. The approval hook also checks
the flattened task tree for the stable detail `planId`, so a re-mounted widget or late callback
cannot enqueue another fan-out/finalizer pair for the same review round.

Every exposed context now carries `urlRole: path|selection`. Hub anchors and external handoff/event
entries are deterministic path identities; local locate slices and form pickers stay inside their
scenario as selections. Only structurally viable middle cases reach the strict L1 presentation
tool. An invalid presentation gets one constrained repair and then falls back to `selection` with a
durable E8 system decision, so presentation variance never blocks the run. The checkpoint previews
the resulting route shapes and displays each choice and justification.

The gate rejects unhosted use cases, empty workspaces, unresolved page context, unbounded menu
sections, invalid queues, skeleton drift and invented fields. Until E3 binds its business-language
`allowedInformation` to ontology field refs, `fieldsOnly` projections are recorder warnings and
durable system decisions; the backend remains responsible for enforcing the E3 projection.
A review or a form backed by a command with declared `contexts.requires` still needs a frozen slice,
workspace path or scenario context. A recognized context-free command, including a cold-start creation, may render a
form from user-entered values; E8 does not invent a pre-existing record solely to satisfy the gate.
