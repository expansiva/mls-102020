<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-13: repair duplicate section/organism/intention ids from the LLM (suffix rename + warning in `cfeCreateShared.repairDuplicateLayoutIds`) instead of failing the page; prompt now requires unique ids per layout. Seen in 102049 (petShop pages petManagement/schedulingCapacity).
- 2026-07-13: extracted the layout system prompt into `prompt.md` and moved `agentCfeCreatePage.ts` plus `cfePromptFiles.ts` into this step folder.
