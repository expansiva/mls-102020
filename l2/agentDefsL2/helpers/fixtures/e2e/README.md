# e2e replay fixtures (d2_68)

Frozen, renamed copies of three runtime modules; `helpers/e2eReplay.test.ts` replays the L2 chain over them without an LLM.

| pack | source in mls-102047 | what it covers |
|---|---|---|
| `stock/` | `controleEstoque`, `7b18c88` | the simple module; menu planned before p2_30; a shared recorded before d2_65 |
| `clinic/` | `agendaClinica`, `5cb4b95` | 3 actors, own-registration pages, snake_case page ids |
| `expense/` | `reembolsoDespesas`, `42d8604` plus the uncommitted p4_24 run (3 of 4 page11 approved) | multi-transition, `decide`, own scope |
| `dining/` | `comandaRestaurante`, `7bbdd86` | a create with nothing to type, a transition without payload, two selections of one entity (d2_72) |
| `expenseR2/` | `reembolsoDespesas`, `71cca1d`, only `despesas_da_equipe` | approve (no payload) and reject (reason) on one page (d2_72) |

Each pack has `l4/` (only what is read), `pool/` (menu, needs, backend, effort as the runs delivered them) and `answers/`.
The answers are the ones the real runs accepted, rebuilt from the approved artifacts (page11 + drafts + pages50 receipt;
shared defs). The run traces do not keep the raw LLM answers (step status uses `cleaner: input_output`), so a refused
answer exists only as its refusal text; such cases are encoded from their deterministic cause.

## Adding a case from a new run (d2_69)

Since d2_69 every LLM call keeps its raw answer, with the gate verdict, before validation:
- defs L2: `l2/<module>/pipeline/agentDefsL2/{pages50,shared60}/responses/<pageId>-<attempt>.json` (pages50 attempts are
  `groups-<n>` and `decision-<n>`);
- planner L2: `l4/<module>/pool/l2/responses/menu20/menu-<attempt>.json` (planning writes only in the pool).

When a real run finds a new defect, copy the refused `raw` (the tool arguments) into `answers/` of the module pack and
assert its expected refusal in `e2eReplay.test.ts`, in the same task that fixes the defect.
