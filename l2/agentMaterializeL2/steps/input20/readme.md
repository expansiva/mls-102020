# input20 — gate of the defs and L4 context

Deterministic, no LLM. For every page of the module it reads the four L2 defs, decides whether code can be generated, resolves the names the page intents use, slices the L4 for that page, and fingerprints the units of the later steps. Output: `l2/<module>/pipeline/agentMaterializeL2/input.json`.

## What refuses a page (only what makes generation impossible)

| code | when |
|---|---|
| `M4_INPUT_DEFS_MISSING` / `_FORMAT` / `_LOCATION` | a defs file is missing, does not follow the grammar, or names another page |
| `M4_INPUT_ROUTE_MISSING` | a request of the shared has no route in the contract |
| `M4_INPUT_NAVIGATE_TARGET` | an intent navigates to a page that does not exist |
| `M4_INPUT_UNRESOLVED` | an intent names no request or request trigger |
| `M4_INPUT_DEFS_PIPELINE_INCOMPLETE` | (module) agentDefsL2 has not completed |

Everything else is a **note** (`warning`): a fact for the generators, never a code prescription (the contract wins on types).

## Outputs per accepted page

- `methods`: intent and submit names → the shared method that serves them (`createMesa → criarMesa`).
- `l4`: the L4 slice of the page: entities it writes, its journeys touch or its types name; the rules of its routes and entities; its journeys; its actors; module title and product languages.
- `units`: `shared`, `desktop`, `mobile`, `tests`, each with an input hash that includes the L4 slice.

## UX variants (page12…page99)

A variant reuses the page's shared. It is left out (warning `M4_INPUT_VARIANT_REFUSED`, the page is never refused) when a device is missing or does not parse at its folder, an intent is not one of page11, a navigation reaches no page, a molecule is not in the catalog (`M4_INPUT_VARIANT_MOLECULE_UNKNOWN`), a molecule is of a group the template forbids (`M4_INPUT_VARIANT_MOLECULE_FORBIDDEN`, `## Molecule rules` → `groups.forbid`), or the template rules cannot be read (`M4_INPUT_VARIANT_TEMPLATE_RULES`). Accepted variants get a unit per device, hashed with the defs and the template text.
