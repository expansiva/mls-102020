# E8 — Workspaces

E8 derives the workspace skeleton mechanically from approved E2–E7 artifacts. The single human
checkpoint approves the map; the parallel workers only add field-level organisms and command input
sources. Permanent output is `workspaces/<workspaceId>.defs.ts` and `workspaces/index.defs.ts`.
Workspace-detail workers submit the strict internal `{type:"flexible",result:{…}}` envelope to avoid
provisional failed status for healthy artifacts.

The gate rejects unhosted use cases, empty workspaces, unresolved page context, unbounded menu
sections, invalid queues, skeleton drift, invented fields and disclosure violations.
