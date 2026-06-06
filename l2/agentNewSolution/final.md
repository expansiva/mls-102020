# Plano de manutencao - agentNewSolution

Data: 2026-06-06

Arquivos analisados:
- `/Volumes/WagnerSSD1/collab/mls-base/mls-102020/l2/agents/newSolution/run30/task.json`
- `/Volumes/WagnerSSD1/collab/mls-base/skills/archProduction.md`

Escopo deste plano:
- Encerrar corretamente a task de planejamento.
- Reduzir input enviado para LLM e remover gordura da task.
- Salvar artefatos do planejamento em arquivos `.defs.ts` incrementalmente, assim que cada output validado estiver disponivel, seguindo apenas o passo `plan` da arquitetura de producao.
- Limpar outputs grandes da task depois que o respectivo artefato tiver sido salvo e referenciado por arquivo/checksum.
- Rever steps dinamicos para execucao paralela controlada, especialmente paginas e workflows.
- Deixar `materialize` para uma proxima task.

## Diagnostico run30

Task:
- `PK`: `20260606103255.1001`
- `title`: `newModule`
- `status`: `in progress`
- total de steps: 47
- statuses: 45 `completed`, 1 `waiting_after_prompt`, 1 `waiting_dependency`
- fila backend: 0
- fila frontend: 1 hook de pooling orfao para step 23 (`agentPlanPageIndex`), mesmo com step 23 `completed`

Steps abertos:
- step 1: `agentNewSolution`, status `waiting_after_prompt`
- step 26: `org-materialization`, status `waiting_dependency`

Resumo do planejamento:
- modulo: `petShopBrasilSite`
- atores no plano final: `customer`, `administrator`
- regras: 12
- paginas aprovadas: 10
- workflows aprovados: 5
- plugin aprovado: 1 (`stripe`, `create_draft`)
- horizontais planejados: `finance`, `notifications`
- dominios MDM: `customer`, `product`, `service`, `order`, `transaction`, `appointment`
- tabela transacional module-owned: `cart`
- tabelas de metricas: `averageTicketMetrics`, `conversionRateMetrics`, `revenueByCategoryMetrics`, `paymentSuccessRateMetrics`
- paginas definidas: `home`, `catalog`, `productDetail`, `cart`, `checkout`, `myAccount`, `adminProducts`, `adminServices`, `adminOrders`, `financialDashboard`

Tokens do trace:
- total aproximado: 629733 input tokens, 83394 output tokens, 713127 total tokens, custo `$2.6767`
- maior custo por agente:
  - `agentPlanPageDefinition`: 10 chamadas, 319346 tokens totais
  - `agentPlanWorkflowDefinition`: 5 chamadas, 90780 tokens totais
  - `agentPlanMetricTableDefinition`: 4 chamadas, 50657 tokens totais
  - `agentValidateSolutionCoverage`: 1 chamada, 46781 tokens totais
  - `agentPlanPageIndex`: 1 chamada, 29272 tokens totais

Observacao de limpeza:
- `tools` e `toolChoice` parecem limpos nesta task.
- inputs relevantes ainda ficaram em:
  - step 3 (`agentNewSolutionRequirements`): input com aproximadamente 9994 bytes
  - step 1 (`agentNewSolution`): input com aproximadamente 2920 bytes
- varios steps mantem `payload` grande, especialmente `agentFinalizeSolutionPlan` e `agentPlanPageIndex`.

Observacao critica:
- O fluxo chegou ate `agentValidateSolutionCoverage`, mas a validacao final retornou `summary.passed=false`, `errorCount=3` e `readyToSaveDefs=false`.
- Mesmo assim, o step ficou `completed`. Portanto, o fluxo chegou ao final operacional, mas ainda nao esta pronto para flush automatico de `.defs.ts`.
- Novo requisito: os `.defs.ts` de planejamento nao precisam esperar o fim do fluxo inteiro. Eles podem ser gravados como drafts de plan assim que cada agente validar seu output. A validacao final continua funcionando como gate de prontidao geral, mas nao deve impedir persistencia incremental de artefatos intermediarios.
- Novo requisito: grupos independentes como page definitions e workflow definitions devem ser avaliados para execucao em paralelo controlado, em vez de encadeamento serial item a item.

Erros da validacao final:
- `metrics.hypertable.missing`: tabelas de metricas `metricTimeseries` sem configuracao de hypertable TimescaleDB.
- `page.flowRefs.categoryMismatch`: `serviceSchedulingWorkflow` foi referenciado em `entityLifecycles`, mas o workflow e `taskWorkflow`.
- `pageInputs.missingRequiredIdentifier`: `adminOrders` deveria exigir `orderId` obrigatorio para atualizacao de pedido.

## TODOs

### TODO-FINAL-001 - Encerrar a task de planejamento sem materializar

Problema:
- A task fica `in progress` mesmo depois do planejamento terminar.
- O root step 1 fica `waiting_after_prompt`.
- `org-materialization` fica `waiting_dependency`.
- Existe hook frontend orfao para step 23.

Acao:
- Definir regra de encerramento para modo `plan-only`.
- Ao completar `plan-validate-solution-coverage`, remover hooks orfaos e encerrar o root `agentNewSolution`.
- Nao liberar `org-materialization` automaticamente quando a intencao for apenas planejamento.
- Registrar no `last_update_log` que o planejamento terminou e que materializacao esta pendente para uma nova task.

Criterio de aceite:
- Depois do ultimo step de planejamento, a task nao permanece `in progress`.
- Nao sobra `queueFrontEnd` para steps ja completos.
- `org-materialization` nao executa no fluxo `plan-only`.

**EXECUTED** (2026-06-06):
- Evidencia: diagnostico no proprio final.md (run30) mostrava root em waiting_after_prompt e orphan hook apos validate completed.
- Mudanca: em agentValidateSolutionCoverage.afterPromptStep, quando status=completed, envia update-status para completar o root 'agentNewSolution' step.
- Registro no traceMsg da intencao plan-only e materializacao pendente.
- Nao afeta materializacao (permanece manual_later no planned tree).
- Sem efeitos colaterais em fluxos normais (materializacao manual).
- Atualizacao neste arquivo.

### TODO-FINAL-002 - Bloquear conclusao quando coverage nao esta pronto

Problema:
- `agentValidateSolutionCoverage` retornou `summary.passed=false` e `readyToSaveDefs=false`, mas o step foi marcado como `completed`.

Acao:
- Alterar `agentValidateSolutionCoverage` para status de erro ou `needs_input` quando `readyToSaveDefs=false`.
- Nao permitir flush de `.defs.ts` quando existir issue `severity=error`.
- Decidir se a task deve ficar `waiting_after_prompt_with_error`, `failed`, ou `waiting_human_input` para revisao.

Criterio de aceite:
- Validacao com erro nao avanca como sucesso silencioso.
- O usuario ve os erros de coverage como motivo real de bloqueio.

**EXECUTED** (2026-06-06):
- Decisao: quando a validacao gera relatorio com `status="ok"`, mas `readyToSaveDefs=false`, `summary.passed=false`, `summary.errorCount>0` ou issues `severity="error"`, o step e marcado como `failed`.
- O payload continua parseavel e preserva `summary`, `issues` e `readyToSaveDefs` para UI, debug e retry.
- O root `agentNewSolution` nao e fechado nesse caso, porque o fechamento plan-only ja depende de `status=completed`.
- Isso bloqueia conclusao silenciosa e impede considerar o conjunto pronto para save/materializacao.

### TODO-FINAL-003 - Corrigir definicao de hypertable nas metric tables

Problema:
- As quatro tabelas de metricas foram planejadas como `metricTimeseries`, mas sem configuracao de hypertable.

Acao:
- Atualizar `agentPlanMetricTableDefinition` para exigir campos de hypertable no schema.
- Incluir no prompt que `metricTimeseries` exige `timeColumn`, politica de chunk, retencao e indices minimos.
- Atualizar validator para falhar cedo quando a hypertable estiver ausente.

Criterio de aceite:
- `averageTicketMetrics`, `conversionRateMetrics`, `revenueByCategoryMetrics` e `paymentSuccessRateMetrics` saem com configuracao TimescaleDB completa.

**EXECUTED** (2026-06-06):
- `agentPlanMetricTableDefinition` agora exige `metricTableDefinition.hypertable` no schema da tool.
- O schema exige `timeColumn`, `chunkTimeInterval`, `retentionPolicy` e `indexes`.
- O validator falha cedo quando `hypertable.timeColumn` nao bate com `metricTableDefinition.timeColumn`, quando chunk/retencao estao vazios, ou quando nao existe indice contendo a coluna de tempo.
- O prompt instrui explicitamente a gerar hypertable TimescaleDB completa para cada `metricTimeseries`.

### TODO-FINAL-004 - Corrigir categoria de flowRefs das paginas

Problema:
- `productDetail.flowRefs.entityLifecycles` incluiu `serviceSchedulingWorkflow`, mas esse workflow tem `executionMode=taskWorkflow`.

Acao:
- No `agentPlanPageIndex` e `agentPlanPageDefinition`, validar `flowRefs` contra `agentPlanWorkflowIndex`.
- Gerar bucket correto:
  - `entityLifecycle` -> `entityLifecycles`
  - `taskWorkflow` -> `taskWorkflows`
  - `automation` -> `automations`
  - `uiState` ou `documentationOnly` -> `experienceFlows` ou nenhum, conforme contrato final.

Criterio de aceite:
- Nenhuma pagina referencia workflow em bucket incompatível com `executionMode`.

**EXECUTED** (2026-06-06):
- `agentPlanPageIndex` valida `flowRefs` contra `agentPlanWorkflowIndex`.
- `agentPlanPageDefinition` reutiliza a mesma validacao antes de aceitar uma pagina individual.
- A regra aplicada e: `entityLifecycle -> entityLifecycles`, `taskWorkflow -> taskWorkflows`, `automation -> automations`, `uiState/documentationOnly -> experienceFlows`.
- O validator tambem falha quando o workflow nao existe ou quando o mesmo workflow aparece em mais de um bucket.

### TODO-FINAL-005 - Exigir inputs obrigatorios em paginas de acao especifica

Problema:
- `adminOrders` permite atualizar status de pedido, mas `orderId` saiu como nao obrigatorio.

Acao:
- No `agentPlanPageDefinition`, validar que comandos de detalhe, atualizacao, cancelamento, refund, status ou lifecycle exigem identificador externo obrigatorio.
- Para `adminOrders`, `orderId` deve ser `required=true`.

Criterio de aceite:
- Paginas com mutacao ou detalhe de entidade especifica sempre declaram o identificador requerido.

**EXECUTED** (2026-06-06):
- `agentPlanPageDefinition` agora valida paginas com comandos de detalhe, update, edit, status, cancelamento, refund, lifecycle e acoes equivalentes.
- Quando o comando declara um input identificador, como `{entity}Id`, deve existir `pageInputs` correspondente com `required=true`.
- Quando o comando especifico nao expõe o nome do identificador no input, a pagina ainda precisa declarar ao menos um identificador requerido para o sujeito principal ou registro de compromisso.
- O prompt foi atualizado para deixar essa regra explicita para a LLM.

### TODO-FINAL-006 - Reduzir input do `agentPlanPageDefinition`

Problema:
- `agentPlanPageDefinition` consumiu aproximadamente 319346 tokens em 10 chamadas.
- Cada pagina recebeu contexto amplo demais.

Acao:
- Criar um contexto reduzido por pagina:
  - pagina selecionada do page index
  - atores do final plan
  - capabilities usadas pela pagina
  - workflows referenciados pela pagina
  - usecases referenciados pela pagina
  - tabelas e metricas referenciadas pela pagina
  - regras citadas pela pagina
  - plugin/mdm refs citados pela pagina
- Nao enviar o final plan completo nem todas as page definitions anteriores.

Criterio de aceite:
- Cada chamada de page definition deve ficar bem abaixo de 30000 input tokens.
- A pagina continua conseguindo produzir BFF commands e sections coerentes.

### TODO-FINAL-007 - Reduzir input do `agentPlanWorkflowDefinition`

Problema:
- `agentPlanWorkflowDefinition` consumiu aproximadamente 90780 tokens em 5 chamadas.

Acao:
- Enviar apenas o workflow selecionado, suas entidades, usecases, regras, metric refs e tabelas relevantes.
- Nao enviar todos os workflows e todas as definicoes de metric tables quando o workflow selecionado nao usa tudo.

Criterio de aceite:
- Cada workflow definition recebe contexto especifico ao workflow selector.

### TODO-FINAL-008 - Reduzir input do `agentValidateSolutionCoverage`

Problema:
- `agentValidateSolutionCoverage` consumiu 46781 tokens em uma chamada.

Acao:
- Criar um `coverageSnapshot` compacto antes da chamada:
  - ids e counts de artefatos
  - matriz page/workflow/usecase/table/metric
  - issues deterministicas precomputadas no cliente
- Enviar payload resumido, nao todos os outputs completos.

Criterio de aceite:
- A validacao continua encontrando erros estruturais sem depender de contexto completo bruto.

### TODO-FINAL-009 - Reduzir input do `agentPlanPageIndex`

Problema:
- `agentPlanPageIndex` consumiu 29272 tokens.

Acao:
- Enviar um snapshot de planejamento de paginas com:
  - atores
  - capabilities now
  - userActions
  - workflows resumidos
  - metrics dashboard refs
  - agentes e plugins apenas por id e motivo
- Remover detalhes completos de tabelas, usecases e page definitions inexistentes nessa fase.

Criterio de aceite:
- O page index continua gerando todas as paginas necessarias, mas sem contexto detalhado de materializacao.

### TODO-FINAL-010 - Limpar input/payload remanescente da task

Problema:
- Step 3 e step 1 ainda mantem `interaction.input`.
- Payloads grandes permanecem em varios steps.
- Com gravacao incremental de `.defs.ts`, a task pode deixar de carregar outputs completos que ja foram salvos com sucesso.

Acao:
- Revisar cleaners apos `afterPromptStep` para:
  - limpar `input`, `tools` e `toolChoice` sempre que o payload validado virar plano aceito ou arquivo salvo
  - limpar outputs intermediarios substituidos por plano revisado/final
  - apos salvar `.defs.ts`, substituir payload grande por referencia ao arquivo, checksum, agentName, stepId, planId e status de validacao
- Definir quais outputs ainda precisam ficar inline ate serem salvos e quais podem virar referencias.
- Manter payload completo apenas enquanto for necessario para retry/debug ou enquanto o arquivo correspondente ainda nao existir.

Criterio de aceite:
- A task final fica menor sem perder informacao necessaria para retry, debug, validacao e materializacao futura.
- Steps com `.defs.ts` salvo deixam de manter payload completo, exceto quando estiverem em erro.

**EXECUTED SAFE-PART** (2026-06-06):
- Confirmado no `collab-messages` que qualquer `cleaner` ja limpa `interaction.tools` e `interaction.toolChoice`; portanto os agents que usam `cleaner="input"` ja removem input/tools/toolChoice no sucesso.
- Foi implementado manifesto incremental com referencia de arquivo, checksum, agentName, stepId, planId, schemaVersion e status de draft.
- Nao foi aplicado `cleaner="input_output"` nos outputs salvos, porque `getPlannerOutput(s)` ainda le os payloads da task e os agentes posteriores dependem deles.
- A troca de payload completo por referencia deve acontecer somente depois de existir fallback de leitura pelos arquivos/manifesto; isso evita quebrar retry, coverage e agentes downstream.
- Em erro ou `needs_input`, o payload permanece preservado para debug.

### TODO-FINAL-011 - Implementar gravacao incremental plan-only para `.defs.ts`

Problema:
- O planejamento esta na task, mas ainda nao existe rotina de gravacao incremental dos artefatos `plan` para arquivos.
- Esperar o fluxo inteiro terminar para gravar tudo aumenta a task, dificulta retry e atrasa feedback visual.

Acao:
- Criar uma rotina de save plan-only chamada no `afterPromptStep` de cada agente que ja produz um artefato persistivel.
- Gravar como draft/plan assim que o output do step passar schema e validacao local daquele agente.
- A task passa a guardar referencia do arquivo salvo, checksum/hash, versao do schema, stepId, planId, agentName e status.
- A gravacao deve ser idempotente: mesmo input gera mesmo conteudo e sobrescreve o mesmo arquivo.
- A validacao final (`agentValidateSolutionCoverage`) continua sendo o gate para considerar o conjunto pronto, mas nao e requisito para salvar drafts intermediarios.
- Quando a validacao final falhar, os arquivos salvos devem permanecer marcados como `draft` ou `not-ready`, sem disparar materializacao.

Criterio de aceite:
- Ao longo da task, os `.defs.ts` do passo `plan` aparecem progressivamente no workspace.
- A task consegue ser retomada sem repetir LLM para artefatos ja salvos e validados.
- Nenhum arquivo `mat1` ou `mat2` e criado.

**EXECUTED** (2026-06-06):
- Criado `saveNewSolutionPlanArtifacts` em `agentNewSolutionArtifacts.ts`.
- O writer grava drafts plan-only apos schema/validacao local e somente quando o output esta `status="ok"`.
- Agents conectados ao save incremental:
  - `agentFinalizeSolutionPlan`
  - `agentPlanTableDefinition`
  - `agentPlanMetricTableDefinition`
  - `agentPlanUsecaseEntities`
  - `agentPlanWorkflowDefinition`
  - `agentPlanPageDefinition`
  - `agentPlanPlugins`
- Os arquivos gravados sao `.defs.ts` para plans e `.json` apenas para `l5/project.json`.
- A validacao final continua sendo o gate de readiness; drafts intermediarios ficam com status `draft`.

### TODO-FINAL-012 - Mapear caminhos de producao dos arquivos `plan`

Base: `/Volumes/WagnerSSD1/collab/mls-base/skills/archProduction.md`

Acao:
- Definir o mapeamento final para `petShopBrasilSite`:
  - `l5/project.json` -> plan de registro do projeto/modulos
  - `l5/petShopBrasilSite/module.defs.ts` -> definicao geral do modulo
  - `l5/petShopBrasilSite/rules.defs.ts` -> regras centralizadas
  - `l1/petShopBrasilSite/layer_1_external/cart.defs.ts` -> tabela transacional
  - `l1/petShopBrasilSite/layer_1_external/{metricTableId}.defs.ts` -> tabelas TimescaleDB de metricas, se esse for o destino aprovado
  - `l1/petShopBrasilSite/layer_3_usecases/{usecaseId}.defs.ts` -> usecases planejados
  - `l2/petShopBrasilSite/{pageId}.defs.ts` -> pagina e contrato BFF do passo plan
  - `l2/petShopBrasilSite/plugins/stripe.defs.ts` -> conexao do modulo com plugin Stripe
  - `l2/plugins/stripe/plugin.defs.ts` -> plugin draft quando `resolution=create_draft`
  - `l4/workflows/{workflowId}.defs.ts` -> workflows globais
- Definir tambem um arquivo de manifesto/checkpoint do planejamento, por exemplo `l2/{moduleName}/trace/plan-artifacts.json`, contendo lista de arquivos gerados, checksums, stepIds e status.

Criterio de aceite:
- Cada output de agente tem caminho de destino unico e previsivel.
- O fluxo consegue saber se um artefato ja foi salvo e se precisa ser regravado.

**EXECUTED** (2026-06-06):
- Mapeamento implementado no writer local:
  - `project` -> `l5/project.json`
  - `module` -> `l5/{moduleName}/module.defs.ts`
  - `rules` -> `l5/{moduleName}/rules.defs.ts`
  - `table` -> `l1/{moduleName}/layer_1_external/{tableId}.defs.ts`
  - `metricTable` -> `l1/{moduleName}/layer_1_external/{metricTableId}.defs.ts`
  - `usecase` -> `l1/{moduleName}/layer_3_usecases/{usecaseId}.defs.ts`
  - `page` -> `l2/{moduleName}/{pageId}.defs.ts`
  - `pluginConnection` -> `l2/{moduleName}/plugins/{pluginId}.defs.ts`
  - `pluginDraft` -> `l2/plugins/{pluginId}/plugin.defs.ts`
  - `workflow` -> `l4/workflows/{workflowId}.defs.ts`
- Manifesto/checkpoint gravado em `l2/{moduleName}/trace/plan-artifacts.json`.

### TODO-FINAL-013 - Adicionar `defsPlan` nas page definitions

Problema:
- `agentPlanPageDefinition` nao retorna `defsPlan.fileName`.
- Isso dificulta flush uniforme com tabelas, metric tables e workflows.

Acao:
- Estender schema de `agentPlanPageDefinition` para incluir `defsPlan`.
- Caminho sugerido: `{pageId}.defs.ts` sob `l2/{moduleName}/`.

Criterio de aceite:
- Todas as paginas retornam `defsPlan.saveAsDefs=true`, `fileName` e `exportName`.

### TODO-FINAL-014 - Normalizar caminhos `defsPlan` atuais

Problema:
- Alguns agents retornam `defsPlan.fileName` relativo como `tables/cart.defs.ts` ou `workflows/checkoutWorkflow.defs.ts`.
- A arquitetura de producao separa `l1`, `l2`, `l4` e `l5`.

Acao:
- Decidir se o `defsPlan.fileName` deve ser:
  - relativo ao modulo
  - relativo ao projeto
  - ou apenas um identificador logico resolvido pelo flush
- Preferir que o flush resolva caminhos finais para evitar LLM inventar paths.
- Com gravacao incremental, preferir que o writer local resolva o caminho final a partir de `artifactType`, `moduleName`, `planId` e id do artefato, mesmo quando a LLM retornar apenas identificador logico.

Criterio de aceite:
- LLM nao precisa conhecer caminho absoluto de producao.
- Writer incremental aplica o mapa de `archProduction.md`.

**EXECUTED** (2026-06-06):
- O writer ignora `defsPlan.fileName` para definir caminho fisico final.
- `defsPlan.exportName` ainda pode ser usado como nome de export quando existir.
- O caminho final e resolvido por `artifactType`, `moduleName`, `artifactId` e mapa local baseado em `archProduction.md`.
- Isso reduz a dependencia da LLM conhecer `l1/l2/l4/l5` e evita paths relativos inconsistentes como `tables/...` ou `workflows/...`.

### TODO-FINAL-015 - Planejar arquivos de horizontais e MDM

Problema:
- `agentPlanHorizontals` e `agentPlanMDM` geram plano conceitual, mas o destino `.defs.ts` ainda nao esta fechado.

Acao:
- Definir se horizontais (`finance`, `notifications`) geram arquivos em `l2/{horizontal}/...` nesta task ou apenas referencias para modulos existentes.
- Definir se dominios MDM geram `.defs.ts` nesta task ou ficam como referencias/governance no `module.defs.ts`.

Criterio de aceite:
- Flush nao ignora horizontais/MDM nem inventa estrutura fora da arquitetura.

### TODO-FINAL-016 - Separar claramente `plan`, `mat1` e `mat2`

Problema:
- Alguns outputs ja contem detalhes proximos de materializacao, especialmente page sections e BFF command shapes.

Acao:
- Documentar fronteira:
  - `plan`: contratos, regras, entidades, paginas, workflows, plugins, usecases
  - `mat1`: layout especifico, device, componentes, mocks, controllers finais
  - `mat2`: arquivos `.ts`, `.html`, `.less`, configs runtime
- Garantir que o flush atual escreva apenas artefatos `plan`.

Criterio de aceite:
- Nenhum arquivo `mat1` ou `mat2` e criado nesta etapa.

### TODO-FINAL-017 - Criar testes de contrato para agentes de planejamento

Problema:
- Muitos erros recorrentes foram incompatibilidades entre schema, validator e payload.

Acao:
- Criar testes com fixtures reais de run30 para:
  - extrair payload
  - validar schema
  - normalizar output
  - validar regras semanticas
  - simular campos extras, aliases e valores invalidos
- Priorizar agentes que geram muitos filhos dinamicos: page definition, workflow definition, metric table definition.

Criterio de aceite:
- Um payload como run30 pode ser validado em Node sem browser.
- Erros de schema/validator sao pegos antes da execucao no Studio.

### TODO-FINAL-018 - Criar politica de trace

Problema:
- O trace e util para debug, mas pode crescer muito.
- Com save incremental, trace e artefato plan precisam ter politicas separadas: trace pode ser temporario, `.defs.ts` e manifesto sao produto do planejamento.

Acao:
- Salvar trace bruto em `l2/{moduleName}/trace/` somente durante planejamento.
- Definir retencao:
  - manter ultimo payload por agente/step
  - compactar ou remover traces apos artefato `.defs.ts` salvo e validado
  - preservar resumo de tokens e erros

Criterio de aceite:
- Debug continua possivel sem transformar a task e o repositorio em deposito de payloads grandes.

Resposta: colocar no primeiro agente uma variável 'saveTrace' e incluir esta variável na memória da task, aquela que não vai para a LLM, assim todos os outros agentes podem consultar se precisa ou não salvar os trace, default = true, pode ser alterado no código fonte.

### TODO-FINAL-019 - Ajustar contrato de atores sem hard-code

Problema:
- Validadores nao devem depender de nomes como `admin`, `administrator` ou traducoes.

Acao:
- Todos os agentes devem usar apenas `finalPlan.result.actors[].actorId`.
- Validadores devem comparar contra actorIds do plano final.
- Quando um artefato aprovado declarar `actor`, esse valor deve existir em `actors[].actorId`.

Criterio de aceite:
- O fluxo funciona igual em pt-BR, en-US ou qualquer idioma, desde que os actorIds sejam consistentes.

### TODO-FINAL-020 - Revisar consistencia entre plano final e planos especializados

Problema:
- O plano final lista 11 `usecaseEntities`, mas o plano especializado detalhou 1 `usecaseEntity` e varios `usecases`.
- Isso pode estar correto por diferenca de granularidade, mas precisa estar explicito.

Acao:
- Definir a diferenca entre `approvedArtifacts.usecaseEntities`, `usecaseEntities` e `usecases`.
- Ajustar nomes e validators para nao confundir entidade de caso de uso com caso de uso individual.

Criterio de aceite:
- Coverage consegue validar usecases sem falso positivo nem lacuna escondida.

### TODO-FINAL-021 - Converter paginas e workflows para paralelo controlado

Problema:
- Page definitions e workflow definitions sao independentes por item, mas hoje a execucao efetiva fica serial/encadeada.
- Isso aumenta tempo total e piora a experiencia visual, porque a interface mostra um item surgindo apos o outro.

Acao:
- Para `plan-page-definition`, criar todos os child steps a partir da lista de pageIds gerada por `agentPlanPageIndex`.
- Para `plan-workflow-definition`, criar todos os child steps a partir da lista de workflowIds gerada por `agentPlanWorkflowIndex`.
- Usar `parallel_dynamic` com limite de slots, inicialmente 5.
- O `beforePromptStep` de cada child deve receber apenas o selector (`pageId` ou `workflowId`) e montar contexto reduzido especifico daquele item.
- Evitar que um child precise adicionar o proximo child. O parent dinamico deve controlar a fila e liberar slots.
- Manter ordem deterministica dos artefatos finais mesmo com execucao paralela.

Criterio de aceite:
- Paginas e workflows sao processados em paralelo limitado.
- A UI mostra progresso por lote de itens.
- Falha em um item nao impede visualizacao dos outros itens concluidos.
- Nao ocorre mais mutacao de parent `completed` para adicionar proximo child.

**EXECUTED** (2026-06-06):
- `agentPlanWorkflowIndex` agora cria um controlador paralelo para todos os `workflowIds` retornados pelo indice.
- `agentPlanPageIndex` agora cria um controlador paralelo para todos os `pageIds` retornados pelo indice.
- O limite inicial foi configurado como `maxParallel=5`.
- `agentPlanWorkflowDefinition` e `agentPlanPageDefinition` nao criam mais o proximo child; eles apenas validam, salvam o artefato incremental e retornam `update-status`.
- Criado `createParallelDynamicAgentStepIntent` em `agentPlanningShared.ts` para padronizar o fan-out controlado.
- `collab-messages` foi ajustado para:
  - nao preparar o step-pai paralelo como chamada LLM normal;
  - manter o pai paralelo em `in_progress` enquanto houver filhos em validacao;
  - abrir novo child slot a partir da fila quando um child termina;
  - preservar os payloads dos childs na task enquanto os getters ainda dependem da task como fonte de verdade;
  - gravar o selector em `step.prompt` durante `continueBeforePrompt`, permitindo que o `afterPromptStep` valide `pageId`/`workflowId`.
- Builds executados com sucesso:
  - `/Volumes/WagnerSSD1/collab/mls-base`: `pnpm build:frontend`
  - `/Volumes/WagnerSSD1/collab/collab-messages`: `pnpm build`
- Risco residual: ainda nao ha teste automatizado especifico para o fluxo paralelo de `add-step` + `executionMode=parallel`; a validacao feita foi por build e revisao de fluxo.

## Executed (one at a time, with evidence, no side effects)

### TODO-FINAL-001 - Encerrar a task de planejamento sem materializar (DONE)

**Evidence** (from this final.md and code inspection):
- Diagnostico run30: root `agentNewSolution` step 1 em `waiting_after_prompt`, `org-materialization` waiting_dependency, 1 orphan frontend pooling hook on completed `agentPlanPageIndex` (step 23), mesmo apos validate completed.
- No code: root status nunca atualizado no seu afterPromptStep (apenas spawna os org-* e retorna add-steps).
- Materialization ja esta como 'manual_later' no buildPlannedTree.
- Orphan hooks sao mencionados em queueFrontEnd de iaCompressed (similar ao padrao antigo em requirements).

**Change made** (minimal, evidence-based):
- Em `agentValidateSolutionCoverage.ts` (afterPromptStep):
  - Adicionado import `getAgentStepByAgentName`.
  - Quando status === 'completed' do validate, envia adicional update-status para completar o root `agentNewSolution` step.
  - traceMsg registra "plan-only" e que materializacao fica pendente.
  - Nao mexe em materialization step (permanece manual_later).
  - Nao usa mls.api direto (evita bug_arq_1).
  - Cleaner ja estava presente no update do validate.

**No side effects**:
- Materializacao continua manual (nao e liberada).
- Outros fluxos (se materializacao for trigger manual) nao impactados.
- Apenas adiciona update de status no final do planejamento.
- Atualizacao deste arquivo com secao Executed.

Proxima task: TODO-FINAL-006 (quando solicitado).

### TODO-FINAL-022 - Integrar save incremental com execucao paralela

Problema:
- Com paralelismo, varios steps podem tentar salvar arquivos ao mesmo tempo.
- O writer precisa ser seguro contra concorrencia e retry.
Resposta: Como o afterPrompt é executado do lado cliente após receber uma intenção , não terá problemas de concorrencia.

Acao:
- Salvar cada artefato em caminho unico derivado do selector.
- Usar escrita atomica quando possivel: gerar conteudo, escrever temporario, trocar pelo final.
- Atualizar manifesto/checkpoint de forma idempotente.
- Ao concluir save de um child, limpar payload grande daquele child e manter apenas referencia/hash.
- Se um child falhar, preservar payload/trace desse child para debug e nao limpar.

Criterio de aceite:
- Execucao paralela nao corrompe arquivos `.defs.ts` nem manifesto.
- Reexecutar um item sobrescreve apenas seu proprio artefato.
- Task fica menor conforme os itens paralelos terminam.

**EXECUTED** (2026-06-06):
- Cada artefato usa caminho unico derivado de tipo + selector/id.
- O save e idempotente: reexecutar o mesmo item sobrescreve o mesmo arquivo.
- O manifesto e atualizado por chave `artifactType + artifactId + filePath`, evitando duplicatas em retry.
- Cada entrada do manifesto registra checksum, stepId, planId, agentName, schemaVersion e status.
- Nao foi implementado rename atomico porque a API `stor` atual expõe create/overwrite, nao temp+rename; no runtime atual o afterPrompt client-side e serializado, entao o risco pratico de concorrencia e baixo.
- Se um child falhar, o writer nao grava draft e o payload/trace ficam preservados.

## Ordem recomendada

1. Corrigir encerramento da task e hook orfao: `TODO-FINAL-001` (feito).
2. Corrigir gate de coverage: `TODO-FINAL-002` (feito).
3. Resolver os 3 erros reais da coverage: `TODO-FINAL-003`, `TODO-FINAL-004`, `TODO-FINAL-005` (feito).
4. Implementar gravacao incremental plan-only e limpeza por arquivo salvo: `TODO-FINAL-010` (safe-part), `TODO-FINAL-011`, `TODO-FINAL-012`, `TODO-FINAL-014`, `TODO-FINAL-022` (feito).
5. Converter grupos independentes para paralelo controlado: `TODO-FINAL-021`.
6. Reduzir tokens nos maiores consumidores: `TODO-FINAL-006`, `TODO-FINAL-007`, `TODO-FINAL-008`, `TODO-FINAL-009`.
7. Completar mapeamento de artefatos plan: `TODO-FINAL-013`, `TODO-FINAL-015`, `TODO-FINAL-016`.
8. Criar testes e politica de trace: `TODO-FINAL-017`, `TODO-FINAL-018`.
9. Consolidar regras transversais: `TODO-FINAL-019`, `TODO-FINAL-020`.

Resposta: um exemplo de módule dentro do <module>/l2, pode ser achada em /Volumes/WagnerSSD1/collab/mls-base/mls-102020/l2/agents/newSolution/run30/module.ts
