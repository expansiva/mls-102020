<!-- mls fileReference="_102020_/l2/agentNewSolution2/skills/platform.md" enhancement="_blank" -->

# collab.codes platform baseline (Stage 1)

These capabilities are ALREADY PROVIDED by the collab.codes platform. They are NOT part of the
business model you produce. When the user's request implies one of them, **reference it** — never
plan a module, horizontal, MDM domain, ontology entity, workflow or operation to (re)build it.

## Provided by the platform (do NOT recreate)

- **Authentication, authorization & RBAC** — login, sessions, OAuth2, users, roles and permissions.
  Do not model `auth` / `users` / `roles` entities. Reference actors by id; assume access control.
- **Internationalization (i18n)** — multi-language UI is built in. Declare languages in
  `module.languages`; do not model a translations entity/module.
- **Multi-tenant isolation** — tenants and per-tenant data isolation are provided. Assume every
  record is tenant-scoped; do not model a tenant provisioning entity.
- **Business context** — UI workspace/tenant is not the business company. When operations need the
  primary company or active unit, use `businessContext.activeCompanyId` / `businessContext.activeUnitId`
  in L4 context resolution and model other companies/branches/units as MDM relationships.
- **File / media storage** — uploading and serving files is provided. Reference media; do not model
  a file-storage module.
- **LLM / AI proxy** — calling LLMs goes through the platform proxy. Plan AI behavior as
  operations/agents that CALL the proxy; do not model an "LLM provider" entity.
- **Messaging / task runtime** — chat threads, tasks and the agent runtime are the platform itself.

## How to treat them

- In scope/recommendations/blueprint: list these as **platform-provided assumptions**, not artifacts.
- If a workflow or operation needs one, **reference** it ("uses platform auth roles", "calls the LLM
  proxy") instead of creating supporting entities.
- Horizontal modules to BUILD are only domain capabilities the platform does NOT provide (e.g.
  `finance`, `notifications`, `documents`). `authRoles` and `i18n` are platform-provided references.

Keep the model focused on the user's domain. Do not infer infrastructure the platform already covers.
