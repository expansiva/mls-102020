# agentDefsL2

Deterministic entry and declared flow for producing L2 definition sources from an approved L4 plan.

Invocation: `@@agentDefsL2 <lowerCamel>` or `/help`. An existing task may add an `agent` step with
JSON args `{ "project": 102047, "module": "agendaClinica" }`. Both forms plant the same six-step
plan; only the message entry creates an `add-message-ai` intent.

Current delivery implements `entry10`. `input20` through `finalize60` are deliberately unavailable:
their execution records `awaitingStep` in the owned pipeline and fails with an English diagnostic.
No generation, materialization, publication, room message or L5 mutation exists in this delivery.

State belongs only to `l2/<module>/pipeline/agentDefsL2/`.
