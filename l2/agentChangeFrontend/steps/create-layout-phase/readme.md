<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout-phase/readme.md" enhancement="_blank" -->

# create-layout-phase

Sequential barrier after contract/shared creation. It creates the `parallel_dynamic`
`create-layout-fanout` only when this phase runs, so `addParallelArgs` cannot dispatch layouts
before the dependency is complete. Its deferred completion includes every layout child.
