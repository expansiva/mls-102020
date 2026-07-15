<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/verify-create-layouts/readme.md" enhancement="_blank" -->

# verify-create-layouts

This sequential barrier enforces the strict `page11` requirement only after every parallel layout
and reconciliation child has completed. It blocks materialization on missing primary layouts without
invalidating a still-active `parallel_dynamic` parent.
