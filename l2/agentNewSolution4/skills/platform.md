<!-- mls fileReference="_102020_/l2/agentNewSolution4/skills/platform.md" enhancement="_blank" -->

# collab.codes platform baseline

Canonical agent-development references:

- `mls-base/skills/collab_messages.md`
- `mls-base/skills/agentsBestPractices.md`
- `mls-base/skills/modelTypes.md`

The following capabilities are supplied by the platform. Do not create module entities, journeys,
operations or rules that rebuild them:

- authentication, sessions, OAuth2, users, roles and base RBAC;
- tenant isolation and active organization/business context;
- frontend internationalization infrastructure;
- file/media storage and delivery;
- the LLM proxy;
- messages, tasks and the agent runtime;
- monitoring, audit plumbing and basic operational telemetry.

Mention them as assumptions or external references only when relevant. The generated module must stay
focused on the user's business domain.
