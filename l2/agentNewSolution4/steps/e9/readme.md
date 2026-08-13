# E9 — deterministic navigation compiler

E9 consumes only the approved permanent E2–E8 artifacts. It does not call an LLM and does not open a checkpoint. Its output is a mechanical projection of the approved workspace graph.

## Inputs

- E2 journey review;
- E3 access matrix;
- E4 ontology index and entity artifacts;
- E7 compiled use cases and workflows;
- E8 workspace index and every workspace artifact referenced by it.

The workspace index is authoritative for the module name, workspace set, menu graph, context catalog and `skeletonHash`. Each referenced workspace must match its indexed `workspaceHash`.

## Outputs

- `navigation/index.defs.ts`: canonical routes and actor-traversable navigation edges;
- `navigation/store.defs.ts`: tab-scoped hydration cache schema with URL-first identity;
- `navigation/notifications.defs.ts`: handoff/event-driven delivery contracts;
- `contracts/<workspace>.<function>.defs.ts`: one composed view contract per workspace and one command contract per declared command;
- a V4 access matrix with operation-to-authority realization.

All artifacts carry their source hashes and omit timestamps. Recompiling unchanged inputs therefore produces byte-identical payloads.

## Gate and repair boundary

The gate checks path provenance, local selection sources, edge profile compatibility, carried-context providers, actor journey reachability, compiled-workflow queues, route ownership, typed field references, notification deep links and access realization.

Structural findings fail E9 and return repair to E8. JSON ontology fields remain valid but compile as `unknown` with a warning. Missing field labels fall back to the E4 ontology title; a missing ontology title produces a non-blocking warning.

Handoff/event-driven relationships compile to notifications and are excluded from the navigation edge set. Contexts classified by E8 as `selection` never become URL parameters.
