<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-14: aligned strict tool validation with best-effort extra variants: an incomplete `pageVariants[]` entry no longer rejects a valid primary layout; flattened valid variants are recovered and incomplete extras are skipped with trace.
- 2026-07-14: replaced the invalid inline `prompt_ready` retry from the parallel worker with a `create-pages` phase, deterministic `create-page-review`, one sequential repair round and final review. The phase is now the materialization dependency barrier.
- 2026-07-13: repair duplicate section/organism/intention ids from the LLM (suffix rename + warning in `cfeCreateShared.repairDuplicateLayoutIds`) instead of failing the page; prompt now requires unique ids per layout. Seen in 102049 (petShop pages petManagement/schedulingCapacity).
- 2026-07-13: extracted the layout system prompt into `prompt.md` and moved `agentCfeCreatePage.ts` plus `cfePromptFiles.ts` into this step folder.
