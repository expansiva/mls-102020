# input20 — gate of the defs and L4 context

Deterministic, no LLM. For every page of the module it reads the four L2 defs, decides whether code can be generated, resolves the names the pages and forms use, slices the L4 for that page, and fingerprints the units of the later steps. Output: `l2/<module>/pipeline/agentMaterializeL2/input.json`.

## What refuses a page (only what makes generation impossible)

| code | when |
|---|---|
| `M4_INPUT_DEFS_MISSING` / `_FORMAT` / `_LOCATION` | a defs file is missing, does not follow the grammar, or names another page |
| `M4_INPUT_ROUTE_MISSING` | a request of the shared has no route in the contract |
| `M4_INPUT_FUNCTION_REF` | a function calls something that is not a request |
| `M4_INPUT_NAVIGATE_TARGET` | a function or intent navigates to a page that does not exist |
| `M4_INPUT_UNRESOLVED` | a form submit or an intent names no function, request or request trigger |
| `M4_INPUT_DEFS_PIPELINE_INCOMPLETE` | (module) agentDefsL2 has not completed |

Everything else is a **note** (`warning`): a fact for the generators, never a code prescription (the contract wins on types).

## Outputs per accepted page

- `methods`: intent and submit names → the shared method that serves them (`createMesa → criarMesa`).
- `l4`: the L4 slice of the page: entities it writes, its journeys touch or its types name; the rules of its routes and entities; its journeys; its actors; module title and product languages.
- `units`: `shared`, `desktop`, `mobile`, `tests`, each with an input hash that includes the L4 slice.
