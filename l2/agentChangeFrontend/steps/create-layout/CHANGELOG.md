<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-07-14: replaced the multi-variant create-page call with one LLM call per pinned page/genome/template.
- 2026-07-15: added shared.fieldCatalog to the layout prompt context and a closed-vocabulary prompt rule. The reduced context had no query output/entity field names, so the LLM invented column fields (orderNumber, currentLevel...) and every 102051 page11 failed strict validation. Unknown fields are now also dropped by repairUnknownLayoutFields with a warning instead of failing the variant.
