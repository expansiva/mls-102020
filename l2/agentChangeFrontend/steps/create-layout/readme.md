<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/readme.md" enhancement="_blank" -->

# create-layout

One dynamic item is `{ pageId, genome, templateId, runId }`. It reuses the execution cache created by
scan and makes one LLM call that saves exactly one page layout. Every page produces exactly two
genomes:

- **page11** — baseline. `templateId` is a real pinned uxTemplate; context supplies that single
  template plus page/shared/user-journey/i18n. Prompt: `prompt.md`. Enforced by `verify-create-layouts`.
- **page21** — goal-first. `templateId` is `goal_first`; context supplies NO pinned template — all
  scored candidates ride in `templateCatalog` as inspiration plus a `renderVocabulary` of composite
  patterns. Prompt: `promptGoalFirst.md` (selected by templateId in `buildSystemPrompt`). The call
  first synthesizes a page objective, then designs the layout; the objective is returned in
  `result.objective`, embedded as page21 `defs.pageObjective`, and written to
  `trace/frontend-page-objective/{page}.json`. page21 is best-effort (not gated).

Render skills differ by genome (`pageRenderSkillPath`): page11 → `genCfePage11RenderTs`, page21 →
`genCfePage21RenderTs` (master-detail, contextual transition buttons, card board).

Every child completes com trace; a rejected item also writes
`trace/frontend-create-layout-errors/{page}--{genome}.json`. The sequential `verify-create-layouts`
barrier reports every current-run rejection in the task failure trace (page11 only).
