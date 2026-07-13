# e6-journey-map CHANGELOG

- 2026-07-07 — created (single call + e6-done anchor; schema e6-journey-map v1; gate with
  workspace/operation/workflow/actor/entity resolution, operation coverage, landing checks and
  advisory-edge warnings; moduleName/note attached deterministically after the call).
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
- 2026-07-08 — interaction cleaner ('input_output') on completed runs with artifacts on disk (DynamoDB 400KB).
- 2026-07-08 — repairE6WorkflowIds: kind='workflow' workspaces without workflowId get it inferred deterministically from the classification (both LLM attempts omitted it in the cafeFlow run — 'workspace.workflow.missing'); prompt reinforced; ambiguity still gates.
- 2026-07-11 — workspace kind canonical + derived (UX research on 102051, ImproveChangeFrontend2 task 1): kind enum gains 'entityManagement' (schema + gate). New deterministic attach deriveE6WorkspaceKinds (runs before repairE6WorkflowIds): workflow-owned operations -> 'workflow'; all-standalone create+update on the workspace entity -> 'entityManagement' (workflowId cleared); otherwise 'operation'. The LLM label is no longer trusted (the 102051 run labeled entity CRUDs as 'workflow', which rejected the list-first CRUD template downstream by construction). Gate: entityManagement workspace declaring a workflowId = error. prompt.md updated (management workspaces are entityManagement, list-first).
- 2026-07-11 — deriveE6WorkspaceKinds refinement (validated against the real 102052 run): auxiliary READ-ONLY operations on another entity (e.g. queryLowStockAlerts on the stockManagement page) no longer demote a management page to 'operation'. Rule: create+update on the WORKSPACE entity + foreign operations restricted to query/view => entityManagement. The 102052 journeys defs were patched accordingly (deterministic output of the fixed rule).
