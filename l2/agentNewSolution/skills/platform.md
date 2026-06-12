<!-- mls fileReference="_102020_/l2/agentNewSolution/skills/platform.md" enhancement="_blank" -->

# collab.codes platform baseline

These capabilities are ALREADY PROVIDED by the collab.codes platform. They are NOT part of a
generated solution. When the user's request implies one of them, **reference it** — never plan a
new module, horizontal module, MDM domain, table, page, workflow or agent to (re)build it.

## Provided by the platform (do NOT recreate)

- **Authentication, authorization & RBAC** — login, sessions, OAuth2, users, roles and permissions
  are handled by the platform auth module. Do not create an `auth` / `authRoles` / `users` / `roles`
  module or tables. Reference roles/actors by id; assume the platform enforces access control.
- **Internationalization (i18n) / localization** — multi-language UI and locale handling are built in.
  Declare the supported languages in the module definition (`module.languages`) and write user-facing
  text in those languages. Do not create an `i18n` / `localization` / `translations` module or tables.
- **Multi-tenant isolation** — tenants/organizations and per-tenant data isolation are provided.
  Do not create a `tenant` / `multiTenant` provisioning module; assume every record is tenant-scoped.
- **File / media storage** — uploading and serving files/images is provided. Use placeholder
  references for media; do not create a file-storage module unless the user explicitly asks for a
  domain-specific document workflow (which is the `documents` horizontal, not core storage).
- **LLM / AI proxy** — calling LLMs (text generation, classification, etc.) goes through the platform
  LLM proxy. Plan AI features as usecases/agents that CALL the proxy; do not create an "LLM provider"
  module or credentials table.
- **Messaging / task runtime** — chat threads, tasks and the agent execution runtime are the platform
  itself. Do not model the chat/task engine as part of the solution.

## How to treat them in the plan

- In scope/recommendations/blueprint: list these as **assumptions/platform-provided**, not as
  artifacts to build. If a capability is platform-provided, do not add it to artifacts, horizontals,
  or MDM.
- If a workflow/page/usecase needs one of them, **reference** it (e.g., "uses platform auth roles",
  "uses platform i18n", "calls the LLM proxy") instead of creating supporting modules/tables.
- Horizontal modules to BUILD are only domain capabilities the platform does NOT provide (e.g.
  `finance`, `notifications`, `documents`). `authRoles` and `i18n` are platform-provided references.

Keep the plan focused on the user's domain. Do not infer infrastructure the platform already covers.
