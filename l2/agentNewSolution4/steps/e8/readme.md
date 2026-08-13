# E8 — Workspaces

E8 derives the workspace skeleton mechanically from approved E2–E7 artifacts. The single human
checkpoint approves the map; the parallel workers only add field-level organisms and command input
sources. Permanent output is `workspaces/<workspaceId>.defs.ts` and `workspaces/index.defs.ts`; every
finalizer round also writes the diagnostic history to `pipeline/e8-validation-report.json`.
Candidate context edges come from adjacent steps and exact E2 prerequisite handoffs whose
`providesContext` matches a provider step and a consuming target step.
Workspace-detail workers submit the strict internal `{type:"flexible",result:{…}}` envelope to avoid
provisional failed status for healthy artifacts.

The gate rejects unhosted use cases, empty workspaces, unresolved page context, unbounded menu
sections, invalid queues, skeleton drift and invented fields. Until E3 binds its business-language
`allowedInformation` to ontology field refs, `fieldsOnly` projections are recorder warnings and
durable system decisions; the backend remains responsible for enforcing the E3 projection.
