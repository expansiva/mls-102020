# e2e replay fixtures (d2_68)

Frozen, renamed copies of three runtime modules; `helpers/e2eReplay.test.ts` replays the L2 chain over them without an LLM.

| pack | source in mls-102047 | what it covers |
|---|---|---|
| `stock/` | `controleEstoque`, `7b18c88` | the simple module; menu planned before p2_30; a shared recorded before d2_65 |
| `clinic/` | `agendaClinica`, `5cb4b95` | 3 actors, own-registration pages, snake_case page ids |
| `expense/` | `reembolsoDespesas`, `42d8604` plus the uncommitted p4_24 run (3 of 4 page11 approved) | multi-transition, `decide`, own scope |

Each pack has `l4/` (only what is read), `pool/` (menu, needs, backend, effort as the runs delivered them) and `answers/`.
The answers are the ones the real runs accepted, rebuilt from the approved artifacts (page11 + drafts + pages50 receipt;
shared defs). The run traces do not keep the raw LLM answers (step status uses `cleaner: input_output`), so a refused
answer exists only as its refusal text; such cases are encoded from their deterministic cause.
