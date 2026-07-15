<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/readme.md" enhancement="_blank" -->

# create-layout

One dynamic item is `{ pageId, genome, templateId, runId }`. It reuses the execution cache created by
scan, supplies only the pinned template plus page/shared/user-journey/i18n context, and makes one LLM
call that saves exactly one page layout. `page11` is strict; extra UX variants complete with a warning.
