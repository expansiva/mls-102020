# Workspaces

A workspace is the cut of the l4 journeys that later becomes one `web/contracts` file and one `web/shared` file.

- Group by the entity a step names and the actor of its journey.
- `catalogue` when the actor locates and maintains records of that entity.
- `hub` when the entity is a `ddm` panel (time series / `aggregate.byWindow`) or the journey only inspects.
- `command` when the journey is only `act` and has no `locate`.
- The model names the workspace and may merge candidates of one outcome. It does not invent entities or actors.
- Every journey belongs to exactly one workspace.
