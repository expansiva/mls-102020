<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-14: replaced the multi-variant create-page call with one LLM call per pinned page/genome/template.
- 2026-07-15: added the explicit userActions coverage rule to the prompt and repairMissingOperationUserActions. The validator only counts organism.userActions, but the LLM represented browse* queries as queryList intentions without repeating the actionId in userActions (102051: menuManagement/stockManagement page11 failed with "layout does not represent operation"). An operation referenced by an organism's intentions is now added to that organism's userActions with a warning.
- 2026-07-15: added shared.fieldCatalog to the layout prompt context and a closed-vocabulary prompt rule. The reduced context had no query output/entity field names, so the LLM invented column fields (orderNumber, currentLevel...) and every 102051 page11 failed strict validation. Unknown fields are now also dropped by repairUnknownLayoutFields with a warning instead of failing the variant.
