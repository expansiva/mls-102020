# interpret — the model call

- **Input:** `longMemory.userText` and `longMemory.project`, plus the catalog built by `asStor` +
  `asCatalog`.
- **Call:** `prompt.md` (modelType `code`, strict tool) + the tool `submitAssistantPlan`
  (`schemas/interpret.schema.json`). The human message is the sentence plus `catalogForPrompt`.
  That view leaves out `version` inputs and keeps `refEntity` on record inputs.
- **Gate (`gate.ts`):** drops an unknown or unregistered route, a duplicate, a value on a path that
  is not a value input (ids included), a lookup that does not list the referenced entity, and a
  filter the lookup does not accept. Issues go to the step trace. Nothing is repaired.
- **After:** `planNext` with the real BFF. A `reply` result ends the task, or `ask-1` is planted
  under the root BEFORE this step is closed.

Known traps:
- The prompt must stay domain-free: the test asserts that no fixture vocabulary is in it.
- A lookup error (no session, no grant, Studio without `/execBff`) ends the task with a
  `failed: <code> <message>` result. It does not loop.
