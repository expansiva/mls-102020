<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout-phase/readme.md" enhancement="_blank" -->

# create-layout-phase

Sequential barrier after contract/shared creation. It creates the `parallel_dynamic`
`create-layout-fanout` only when this phase runs, so `addParallelArgs` cannot dispatch layouts
before the dependency is complete. Its deferred completion includes every layout child.

O host do fan-out nasce com `onFailure: 'wait_after_prompt'` (os filhos herdam). Uma falha de
transporte/provider num slot então NÃO mata a task: o slot vai para
`waiting_after_prompt_with_error`, o `afterPromptStep` do `agentCfeCreateLayout` ainda roda e conclui
com `CREATE-LAYOUT-FAILED`, e quem decide continua sendo o gate sequencial `verify-create-layouts`.
Ver `flow.json → engineInvariants`.
