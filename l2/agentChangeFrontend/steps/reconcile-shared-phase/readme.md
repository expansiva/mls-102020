<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/reconcile-shared-phase/readme.md" enhancement="_blank" -->

# reconcile-shared-phase

Sequential barrier after the nested layout fan-out. It starts `reconcile-shared-fanout` only after
the preceding phase has drained and delays `verify-create-layouts` until reconciliation has drained.
