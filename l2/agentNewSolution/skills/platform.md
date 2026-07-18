<!-- mls fileReference="_102020_/l2/agentNewSolution/skills/platform.md" enhancement="_blank" -->

# collab.codes platform baseline

These capabilities are already provided by the collab.codes platform. They must not become a module,
entity, workflow, operation, MDM, or horizontal capability recreated by agentNewSolution.

## Do Not Recreate

- Authentication, authorization, and RBAC: login, sessions, OAuth2, users, roles, and permissions.
- i18n: UI multi-language support. Declare language when needed, but do not model translations.
- Multi-tenant isolation: tenant isolation already exists.
- Business context: the active company/unit comes from runtime context. Model companies only when
  the domain actually manages companies as customers, suppliers, branches, or partners.
- File/media storage: file upload and delivery are platform capabilities.
- LLM/AI proxy: LLM calls go through the platform proxy.
- Messaging/task runtime: threads, messages, tasks, and agent runtime are the platform itself.
- Monitoring, auditing, and basic operational metrics.

## How To Treat

- Mention as a platform assumption or reference.
- Do not create artifacts to rebuild these capabilities.
- Horizontals to build are only domain capabilities that the platform does not provide.

The model must stay focused on the user's domain.
