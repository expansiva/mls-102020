# agentDefsL2

Deterministic entry and declared flow for producing L2 definition sources from an approved L4 plan.

Invocation: `@@agentDefsL2 <lowerCamel>` or `/help`. An existing task may add an `agent` step with
JSON args `{ "project": 102047, "module": "agendaClinica" }`. Both forms plant the same six-step
plan; only the message entry creates an `add-message-ai` intent.

Current delivery implements `entry10`, deterministic `input20` and deterministic `contracts30`.
The input phase freezes coherent L4/planner inputs with content hashes, exact page destinations and
structured review findings. The contracts phase gates and reconciles one typed contract per selected
create/update page and publishes a hash-verified barrier. `shared40` through `finalize60` remain
unavailable. No LLM call, materialization, publication, room message or L5 mutation exists here.

State belongs only to `l2/<module>/pipeline/agentDefsL2/`.
