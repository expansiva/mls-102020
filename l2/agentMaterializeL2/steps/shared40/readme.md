# shared40 — one shared class per accepted page

**Input:** `input.json` from input20. For each accepted page:
- the `shared` unit fingerprint (it includes the L4 slice), the notes and the `methods` table;
- the contract `.defs.ts` (types, and the comment of each route: purpose, input, processing, output), the shared `.defs.ts` and the desktop page11 (organism prose);
- the L4 slice of the page, rebuilt from the ids in `input.json`: entities and field titles, rule texts, journeys, actors.

**Output per page:**
- `web/shared/<pageId>.ts`: class `<Module><Page>Shared extends StateLitElement`;
- `web/shared/<pageId>Dts.txt`: the declaration the Studio compiler emitted, the only thing pages50 reads of the shared;
- `pipeline/agentMaterializeL2/shared40/<pageId>.json`: the receipt, with the **findings** (V5).

**LLM:** one call per page (`parallel_dynamic`), tool `submitSharedTs { source, findings }`, system prompt `prompt.md`, plus the Studio `.d.ts` of the runtime modules.

## What the prompt asks (briefing of 05/10)

- Read the defs as intent and commitments; never infer behavior from a name.
- Nothing computed in the browser; a getter only picks the selected row by id.
- Apply the mode declared in the function description (`replace`, `append`, `upsert`, `remove`); use the command output, reload only when the description says so.
- The selection holds the id; the selected state is the record (from the declared detail query, or the loaded row). The selection wins over the filter.
- Each method's JSDoc carries the purpose of its route and what it redraws: that is how the pages learn what it is for.
- A gap of the defs (a form with no draft state, a selection no function writes) is completed minimally and reported in `findings` (V5).
- `readonly` fields never go into a command input; `version` goes back in the next write.

## Gate (module-independent only)

Header, imports, class, no rendering, every state and function of the defs, every method of `methods`, scene state, routes used and known, entry params, `auraNavigate` only, no user-facing text, no `this[x] =`, **no `any`** (except `handleIcaStateChange`) and **no `!`**. Then the Studio compile, and up to three focused repairs.
