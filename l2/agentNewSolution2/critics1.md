# Critica da implementacao de agentNewSolution2/flow.json

## Escopo e premissas

- Tratei `flow.json` como a especificacao do fluxo e comparei com `README.md` e com a implementacao em `agentNewSolution2/*.ts`.
- O `flow.json` e JSON valido, mas ele mesmo se declara `design-spec (not yet reverse-engineered from code)` em `flow.json:6`. Isso explica parte da divergencia, mas tambem significa que ele nao deve ser usado como fonte executavel sem correcao.
- O requisito central avaliado foi: Stage 1 deve congelar apenas o contrato duravel de comportamento em l4: modulo/ontologia/regras/workflows/operacoes, sem telas, BFF concreto ou persistencia.

## Achados

### [P0] O fan-out dinamico perde o seletor e pode salvar artefatos com ids errados

O `flow.json` exige fan-out por `entityId`, `workflowId` e `operationId` em `flow.json:132-139`, `flow.json:200-207` e `flow.json:220-227`. A implementacao, porem, cria o filho paralelo com `prompt: JSON.stringify({ planId })` em `ns2Shared.ts:124-136`. Depois, os agentes de definicao tentam recuperar o seletor por `step.prompt` e ainda sobrescrevem o id retornado pelo modelo:

- `agentNs2EntityDefinition.ts:75-81`
- `agentNs2WorkflowDefinition.ts:69-74`
- `agentPlanOperationDefinition.ts:65-70`

Pelo codigo desta camada, `step.prompt` contem o JSON do `planId`, nao o `entityId`/`workflowId`/`operationId` recebido em `args`. O efeito provavel e grave: todos os filhos de um mesmo fan-out podem ser regravados com o mesmo id artificial, gerar o mesmo arquivo, sobrescrever resultados e deixar as entidades/workflows/operacoes reais sem definicao canonica. Isso quebra diretamente os artefatos prometidos em `flow.json:258-265`.

Recomendacao: guardar o seletor real no step filho, por exemplo em `prompt`, `planning.dynamicSource.currentArg` ou outro campo explicito, e ler esse mesmo campo no `afterPromptStep`. Adicionar teste com dois itens por fan-out verificando que sao gerados dois ids e dois arquivos distintos.

### [P1] O `flow.json` referencia agentes legados enquanto o codigo executa agentes `agentNs2*`

O `flow.json` aponta para nomes como `agentDiscoverSolutionScope`, `agentRecommendImplementations`, `agentSolutionBlueprint`, `agentBlueprintReview`, `agentFinalizeSolutionPlan`, `agentPlanEntityDefinition`, `agentPlanWorkflowIndex` e `agentPlanWorkflowDefinition` em `flow.json:61-76`, `flow.json:98-148` e `flow.json:190-207`.

O codigo real monta a arvore com os agentes regenerados e self-contained:

- `agentNewSolution2.ts:117-145` usa `agentNs2DiscoverScope`, `agentNs2Recommend`, `agentNs2Blueprint`, `agentNs2BlueprintReview`, `agentNs2Finalize`, `agentNs2EntityDefinition`, `agentNs2WorkflowIndex` e `agentNs2WorkflowDefinition`.
- O `README.md` tambem afirma que o fluxo e self-contained e nao importa o agente legado.

Isso e mais que documentacao desatualizada: se algum orquestrador, ferramenta de auditoria ou gerador usar `flow.json` como contrato, ele pode tentar invocar agentes inexistentes/legados ou revisar a implementacao errada.

Recomendacao: atualizar todos os `agentName` do `flow.json` para os nomes reais ou marcar explicitamente que o arquivo e apenas historico e nao e contrato executavel. A convencao em `flow.json:32` dizendo que os demais agentes "reuse existing planning agents" deve ser removida ou reescrita.

### [P1] A especificacao de `dynamicSource` nao bate com o formato real dos resultados

Em `flow.json:137`, `plan-entity-definition` declara `dynamicSource.selectorField = "entityId"` a partir de `plan-finalize-solution-plan`. Mas o resultado congelado descrito em `flow.json:123` e implementado em `agentNs2Finalize.ts` guarda as entidades em um mapa: `ontology.entities`, nao em uma lista com campo `entityId`.

O codigo contorna isso manualmente em `agentNs2Finalize.ts` ao fazer `Object.keys(result.ontology.entities)` e chamar o fan-out. Portanto, o `flow.json` nao e suficiente para um executor generico reproduzir a propria arvore que ele descreve.

Recomendacao: trocar o contrato de `dynamicSource` para representar caminho de mapa, por exemplo `ontology.entities.*`, ou fazer o `finalize` produzir tambem uma lista explicita de seletores. O importante e que o `flow.json` e a implementacao tenham o mesmo modelo.

### [P1] A validacao final nao protege o handoff quando ha erro deterministico

O proprio `flow.json` fica ambiguo: em `flow.json:30` diz que erros deterministicos continuam hard, mas `behavior-validate` em `flow.json:240-246` e descrito como report nao bloqueante. A implementacao escolheu o caminho mais permissivo:

- `agentValidateBehaviorModel.ts:35-44` captura qualquer erro de validacao e mesmo assim completa o step.
- `agentValidateBehaviorModel.ts:95-99` transforma ausencia de definicao de workflows/operacoes em warning, nao erro.
- `agentNewSolution2Final.ts:72-91` tolera falha ao recomputar o report e grava o processo com `healthReport: null`.
- `agentNewSolution2Final.ts:45-47` e `agentNewSolution2Final.ts:77-78` deixam Stage 2 e Stage 3 selecionadas por padrao.

Combinado com o bug de fan-out, o fluxo pode terminar, limpar payloads e oferecer proximas etapas mesmo quando os artefatos duraveis estao incompletos ou com ids errados.

Recomendacao: decidir a regra. Se erros deterministicos devem ser hard, `behavior-validate` precisa falhar ou bloquear `final-resume` quando `passed=false` ou quando a validacao nao consegue rodar. Se a decisao for realmente non-blocking, o `flow.json` deve deixar claro que Stage 2/3 podem receber um handoff com erros e o resumo nao deveria sugerir continuidade como padrao.

### [P2] Responsabilidades de artefato para MDM/horizontais/plugins estao inconsistentes

`flow.json:16` diz que l5 e apenas dados de projeto. Mas os passos depois prometem:

- `plan-mdm` salva `l5/{domainId}/module.defs.ts` em `flow.json:148`.
- `plan-horizontals` salva `l5/{horizontalModuleId}/module.defs.ts` em `flow.json:157`.
- `plan-plugins` salva `l2/{module}/plugins/{pluginId}.defs.ts` e checkpoint em l2 em `flow.json:166-167`.
- `openDecisions` ainda pede confirmacao sobre isso em `flow.json:279`.

O codigo atual nao materializa esses artefatos: `agentNs2Mdm.ts` so mescla dependencia no `project.json` quando usa a infra compartilhada, e `agentNs2Horizontals.ts`/`agentNs2Plugins.ts` apenas validam e salvam trace. Isso deixa incerto onde Stage 2/3 devem encontrar referencias aprovadas de MDM, horizontais e plugins.

Recomendacao: escolher uma unica fonte duravel para essas referencias. A opcao mais simples parece manter tudo em `approvedArtifacts` dentro de `l4/{module}/module.defs.ts` e usar `l5/project.json` apenas para dependencias de infra. Depois, corrigir `savedArtifact` no `flow.json` e remover a decisao aberta.

### [P2] Politica de traces contradiz o comportamento real de finalizacao

`flow.json:254` diz que traces nao sao limpos ao finalizar. O codigo real diz o oposto: `agentNewSolution2Final.ts:3-6` documenta limpeza de traces e `agentNewSolution2Final.ts:96-97` chama `clearRunArtifacts(moduleName)`. Em seguida, `agentNewSolution2Final.ts:99-132` tambem limpa inputs/outputs de steps concluidos.

Impacto: a auditoria pos-run fica imprevisivel. Quem le o `flow.json` espera reter traces; quem executa o codigo perde checkpoints/traces, mantendo apenas o health report e o process record.

Recomendacao: alinhar a politica. Se a limpeza e desejada, corrigir `flow.json:254`. Se a retencao e requisito, remover ou condicionar `clearRunArtifacts`.

### [P2] Referencias cross-module sao aceitas de forma ampla demais

O requisito de ids em `flow.json:26` exige ids canonicos de ontologia e o validador final em `flow.json:245` promete resolver referencias. Mas `ns2Shared.ts:251-255` considera qualquer string com `:` como referencia cross-module valida, sem validar modulo, entidade ou formato.

Isso permite que um typo como `fooInexistente:PedidoErrado` passe pela validacao como se fosse intencional. Para um contrato que sera consumido por Stage 2/3, isso e permissivo demais.

Recomendacao: no minimo validar formato e registrar warning para modulo/entidade cross-module sem catalogo conhecido. Idealmente, consultar o modulo referenciado antes de considerar a referencia resolvida.

## Pontos positivos

- O `flow.json` e JSON valido.
- A fronteira principal de Stage 1 esta bem expressa: nao ha schema para pages, tabelas, metric tables ou BFF concreto em `ns2Schemas.ts`.
- A escrita dos artefatos centrais de dominio em l4 existe para modulo, regras, workflows e operacoes, embora o bug de fan-out comprometa os tres tipos dinamicos.

## Recomendacao geral

Antes de evoluir Stage 2/3, eu corrigiria primeiro o fan-out de seletores e depois atualizaria o `flow.json` para refletir a arvore real. Sem isso, o arquivo funciona mais como rascunho historico do que como especificacao confiavel da implementacao.
