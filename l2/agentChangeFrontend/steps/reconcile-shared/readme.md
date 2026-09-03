<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/reconcile-shared/readme.md" enhancement="_blank" -->

# reconcile-shared

After all layout items finish, this deterministic fan-out merges every saved variant for a page into its
single shared defs artifact. A missing primary `page11` layout is an error; skipped extra variants are
not included.
