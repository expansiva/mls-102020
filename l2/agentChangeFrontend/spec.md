# agentChangeFrontend — spec (sem implementação)

Projeto: master frontend (102020). Tipo: **worker (reconciliador) de frontend**.
Documento auto-contido (não depende de outros arquivos).

## Propósito

Olhar o `statusFrontend` dos owners no `l4` e **fazer só o que está pendente** (um "to-be"): criar/atualizar/remover as **telas** + parte **shared** + **contrato BFF** + **layout** da página, chamar a **materialização** (`.defs.ts → .ts`) e registrar no **menu** (`config.json`). No fim, muda o `statusFrontend`. Pode ser chamado **a qualquer momento** e fazer **um único item** (uma tela, um arquivo). É idempotente: re-rodar só toca no que ainda não está `done`.

## Modelo compartilhado (contexto auto-contido)

**Camadas:** `l4` = business; `l5` = dados de projeto. Caminhos relevantes:
- Lê de `l4`: `l4/{module}/ontology/*`, `l4/workflows/*`, `l4/operations/*`, `l4/rules/*`, `l4/{module}/module.defs.ts`.
- Escreve direto nos `.defs.ts` finais de frontend: `l2/{module}/web/contracts/{page}.defs.ts`, `l2/{module}/web/shared/{page}.defs.ts` e `l2/{module}/web/{device}/{layout}/{page}.defs.ts`; e materializa para `.ts`.
- Registra no menu: `l0/config.json` (mecanismo de menu já existente).

**Owners (de onde a tela nasce):**
- **Workflow** = processo com estado/gatilho → telas de processo (1 tela por estado/passo) + BFF de transição.
- **Operation** = ação direta sobre 1 entidade (create/update/delete/query/view) → tela de gestão/consulta + BFF da ação. A Operation já traz a assinatura (entidades de ontologia que lê/escreve) = **contrato BFF de intenção**; aqui ela vira `bffCommands` concretos da página.

**Status de reconciliação (DOIS campos independentes no item de Workflow/Operation):**
`statusFrontend` e `statusBackend`, cada um com o enum `toCreate | toUpdate | toRemove | inProgress | done`.
Este worker lê/escreve **apenas `statusFrontend`**; o `agentChangeBackend` cuida do `statusBackend`.
São independentes — sem ordem obrigatória entre os dois workers nem ambiguidade de status único.

**Espaço de IDs:** as referências de entidade usadas para derivar páginas/layout vêm SEMPRE do id de ontologia (qualificado entre módulos). **Nunca** nomes de agregado (`OrderAggregate`, `menuEntity`). O contrato frontend não deve publicar esses ids; eles ficam no L4 e são lidos diretamente pelo `agentChangeBackend`.

**Guardrails (lições analise10/11/12):**
- bffCommands devem carregar **tipo frontend resolvido** via ontologia (status como enum literal), mas sem metadados de backend como entidade, tabela, usecase, layer contract, regras ou campo de origem.
- Não referenciar concerns de plataforma (auth/audit/monitoring/notifications) — são da plataforma.
- Evitar **fragmentação**: guardas/confirmações/erros de um processo são **estados do Workflow** (uma página com estados/modais), não dezenas de micro-páginas.
- Determinístico é duro; opinião de LLM é suave (não derruba o fluxo). Finalizar a task cedo.

## Responsabilidade deste agente

1. **Varrer** o `l4` em busca de owners (Operations/Workflows) com `statusFrontend` em `toCreate | toUpdate | toRemove` — ou processar **um item específico** recebido como argumento.
2. Para cada item pendente:
   - `toCreate` / `toUpdate`: gerar/atualizar a(s) página(s) do owner (contract + shared + page/layout com bffCommands tipados por ontologia); **materializar** (`.defs.ts → .ts` via materialização L2 existente); **registrar no menu** (`config.json`).
   - `toRemove`: remover página + shared + `.ts` materializado + entrada no menu (remoção em cascata do que era só daquele owner).
3. **Mudar o `statusFrontend`** do item ao concluir.

## Steps (alto nível, sem implementação)

- `scan-pending` — lista owners com `statusFrontend` pendente (ou recebe 1 item).
- `derive-pages` — do owner, decide as páginas (estado de Workflow / Operation).
- `generate-page-defs` — por página: gera os três `.defs.ts` finais (`contract`, `shared`, `page/layout`) com pipeline.
- `materialize` — chama a materialização L2 existente (`.defs.ts → .ts`).
- `register-menu` — atualiza `config.json`.
- `flip-status` — marca `statusFrontend = inProgress` ao iniciar e `statusFrontend = done` ao concluir.

## Entrada / Saída

- **Entrada:** `l4` do módulo (owners + `statusFrontend`). Opcional: um `operationId`/`workflowId`/página específico para processar só ele.
- **Saída:** páginas/shared/contratos BFF criados/atualizados/removidos em `l2`, materializados em `.ts`, menu atualizado, e `statusFrontend` dos itens processados atualizado.

## Status (statusFrontend)

Pega itens com `statusFrontend` em `toCreate | toUpdate | toRemove`; ao iniciar um item seta `statusFrontend = inProgress`; ao concluir a parte de frontend, marca `statusFrontend = done`. Não toca em owners `done` nem em owners `inProgress`, salvo se existir uma rotina explícita de recuperação. **Independente do backend:** o `agentChangeBackend` controla o `statusBackend` separadamente, então não há ordem obrigatória entre os dois workers nem a antiga ambiguidade do status único. Owners semeados pela Etapa 1 (`agentNewSolution2`) nascem com `statusFrontend = toCreate` e `statusBackend = toCreate`.

## O que este agente NÃO faz

- Não decide O QUE muda (isso é `agentChangeSolution`/`agentNewSolution2`); só executa o que já está marcado no `l4`.
- Não gera backend (tabelas, layer_3/4, persistência) — isso é `agentChangeBackend` (que controla o `statusBackend`).
- Não cria/edita a ontologia, workflows, operations ou rules.

## Referências de artefato
- Lê: `l4/...` (owners + ontologia + rules).
- Escreve: `l2/{module}/web/contracts`, `l2/{module}/web/shared`, `l2/{module}/web/{device}/{layout}` + `.ts` materializado + `l0/config.json`.
- Reusa: materialização L2 já existente (agentMaterializeL2 / agentMaterializeGen).

## Análise geral — agentPrepareDefsL2 e novo pipeline a partir do L4

Data da análise: 2026-06-26.

### Assunções

- O `agentPreparaDefsL2` citado é o agente existente `agentPrepareDefsL2` em `l2/agentMaterializeSolution/agentPrepareDefsL2.ts`, junto com o executor filho `agentMaterializeL2Def`.
- O objetivo novo do `agentChangeFrontend` não é materializar uma página geral já planejada em `l2/{module}/{page}.defs.ts`; esse arquivo geral era do modelo antigo e não será criado no modelo novo. O agente deve criar/atualizar/remover a experiência frontend diretamente a partir dos owners do `l4` (`workflows` e `operations`) que têm `statusFrontend` acionável.
- Como o foco aqui é frontend, os três arquivos `.defs.ts` principais são: contrato frontend, shared/base e página/layout. O fluxo atual também gera um quarto `.defs.ts` em `l1/{module}/layer_2_controllers/{page}.defs.ts`, que é o controller BFF. Se o backend/controller continuar separado no `agentChangeBackend`, esta fronteira precisa ficar explícita.

### Como o fluxo atual funciona

O fluxo atual não lê `l4`. Ele parte de uma página original em `l2/{module}/{shortName}.defs.ts`, que já contém `data.pageDefinition` e `data.bffCommands`.

O `agentPrepareDefsL2` faz apenas a preparação/orquestração:

- lê `l5/project.json`;
- varre módulos e arquivos `l2/{module}/*.defs.ts`;
- ignora páginas que já têm `pipeline`;
- cria passos para `agentMaterializeL2Def`;
- garante singletons como `l2/{module}/module.ts`, `l1/{module}/layer_2_controllers/router.ts`, `l1/{module}/layer_1_external/persistence.ts` e `l0/config.json`.

O `agentMaterializeL2Def` é quem divide a página original em arquivos derivados:

- `l1/{module}/layer_2_controllers/{page}.defs.ts` — controller BFF;
- `l2/{module}/web/contracts/{page}.defs.ts` — contrato TypeScript consumido pelo frontend;
- `l2/{module}/web/shared/{page}.defs.ts` — estado, actions, chamadas BFF e navegação compartilhada;
- `l2/{module}/web/desktop/page11/{page}.defs.ts` — implementação de layout/dispositivo/design-system.

Depois cada `.defs.ts` recebe um `pipeline` com `agentMaterializeGen`, `skills`, `dependsFiles` e hooks como `registerFrontEnd.ts?registerPage`.

### Implicação para o modelo novo

No modelo novo, o `agentChangeFrontend` precisa ocupar a etapa que antes já vinha pronta no `l2/{module}/{page}.defs.ts`: transformar `l4/workflows` e `l4/operations` diretamente nos três `.defs.ts` finais por página.

Fluxo sugerido:

1. Ler `l4/{module}/module.defs.ts`, `l4/{module}/ontology/*.defs.ts`, `l4/workflows/*.defs.ts`, `l4/operations/*.defs.ts`, `l4/rules/*.defs.ts`, `l4/actors/{module}Actors.defs.ts` e `l5/{module}/process.defs.ts`.
2. Validar o modelo antes de gerar: owners pendentes, operações referenciadas por workflows existentes, entidades e campos resolvíveis, regras existentes e `healthReport` sem erro fatal.
3. Agrupar owners em páginas. Operações simples podem virar páginas de CRUD/query; workflows devem virar páginas orientadas a estado/processo, evitando uma página por micro-transição.
4. Derivar `bffCommands` concretos por página a partir de operations/workflows + ontologia, publicando apenas o contrato frontend:
   - `commandName`: preferir `operationId` ou uma composição estável `workflowId.transition`;
   - `kind`: mapear `operation.kind` (`query/view` => query, `create/update/delete` => command);
   - `input/output`: resolver campos pela ontologia, incluindo enum literal quando existir;
   - não emitir `readsEntities`, `writesEntities`, `readsTables`, `writesTables`, `usecaseRefs`, `layerContract`, `rulesApplied`, `sourceEntity`, `sourceField`, `sourceType` ou `lifecycleStates`.
5. Gerar os três `.defs.ts` frontend:
   - `web/contracts/{page}.defs.ts`;
   - `web/shared/{page}.defs.ts`;
   - `web/{device}/{layout}/{page}.defs.ts`.
6. Chamar a materialização existente e deixar `registerFrontEnd` atualizar `l0/config.json`.
7. Só marcar `statusFrontend = done` depois de todos os arquivos e o registro de menu passarem.

### Uso do master frontend 102033

O projeto `mls-102033` já fornece shell, rotas e runtime compartilhado. O gerador não deve duplicar isso.

O que já existe para reuso:

- shell SPA/PWA via `l2/shared/spa/index.html` e `l2/shared/pwa/index.html`;
- layout base (`aura-header`, `aura-aside`, `aura-contents`);
- runtime de rota em `l2/shared/routeRuntime.ts`;
- runtime de interação reexportado por `l2/shared/interactionRuntime.ts`;
- contratos bootstrap reexportados por `l2/shared/contracts/bootstrap.ts`.

Portanto a geração deve ficar restrita às páginas do módulo, seus contratos, shared/base e registro no menu/config. Shell, roteamento base, bootstrap e padrões de interação devem ser dependência, não saída nova.

### Os dados do L4 do projeto 102050 são suficientes?

Parcialmente.

Eles são suficientes para iniciar um pipeline determinístico de frontend porque trazem:

- owners com `statusFrontend`/`statusBackend`;
- operations com `operationId`, `kind`, `actor`, `entity`, `reads`, `writes`, `rulesApplied`, `story` e `capability`;
- workflows com `states`, `transitions`, `operationIds`, atores, entidades e story;
- ontologia com campos, tipos, obrigatoriedade, enums/status e relacionamentos;
- atores com `roleScope`;
- regras globais;
- `designContext` com prompt original, idioma e estilo visual.

Eles ainda não são suficientes para uma geração precisa e sem inferência em todos os casos, porque faltam ou estão ambíguos:

- definição explícita de páginas: quais owners entram na mesma página, quais viram páginas separadas e qual navegação liga essas páginas;
- assinatura concreta de cada comando BFF (`inputShape`/`outputShape` ou equivalente). Hoje `operations` declaram intenção (`reads/writes`), não payload por tela;
- política de campos por operação: quais campos entram no formulário, quais entram em filtros, tabela, detalhe, resumo ou retorno;
- mapeamento de `operation.kind` para experiência visual esperada (`manage*` sugere CRUD composto, mas isso ainda é convenção);
- dados de layout/device/design-system por página além do default `web/desktop/page11`;
- menu/agrupamento/ordem por ator ou prioridade;
- resolução de conflitos quando uma capability aparece em vários owners;
- contrato entre frontend e backend deve ficar limitado à assinatura BFF consumida pelo frontend; o vínculo com usecase/tabela/regra deve ser resolvido pelo `agentChangeBackend` diretamente no L4.

Além disso, o próprio exemplo `mls-102050` ainda não está íntegro: `l4/trace/behavior-health-report.json` marca `passed: false` porque o workflow `closeDailyShift` referencia `updateDailyShiftStatus` e `recordClosingCashMovement`, mas essas operações não existem. O `agentChangeFrontend` deve bloquear ou marcar como pendente com erro claro quando o owner tem referências quebradas, em vez de inventar operações.

### Sugestões

- Tratar o L4 como fonte de verdade, mas adicionar uma etapa interna `derive-page-plan` antes dos três `.defs.ts`. Se precisar persistir auditoria, salvar em `l2/{module}/trace`, não como o antigo `l2/{module}/{page}.defs.ts` canônico.
- Normalizar um schema único para comandos BFF antes da materialização. O ideal é `commands[]` com `commandName`, `kind`, `inputShape` e `outputShape`, sem metadados de backend. Isso evita o problema atual de tipos frouxos, como `OrderItem[]` virar `string` no contrato gerado quando não há shape resolvido.
- Resolver tipos sempre pela ontologia. Campo `Order.status` deve virar união literal (`'draft' | 'sentToKitchen' | ...`) no contrato, não `string` genérico.
- Separar claramente responsabilidades:
  - `agentChangeFrontend`: experiência, contrato frontend, shared, layout e menu;
  - `agentChangeBackend`: usecases, controller BFF real, persistência e tabelas;
  - integração: ambos podem compartilhar `operationId`/`commandName`, mas não devem marcar o status um do outro.
- Usar validação determinística antes de chamar LLM: refs quebradas, campos inexistentes, enums ausentes, owners duplicados, workflow sem operação e operação sem entidade devem virar erro/aviso estruturado.
- Reusar `agentMaterializeGen` e o registro existente, mas com skills próprios do `agentChangeFrontend` (`genCfeContractTs`, `genCfeSharedTs`, `genCfePage11RenderTs`) sempre que o schema gerado for compatível.

### Dúvidas abertas

- O controller BFF (`l1/{module}/layer_2_controllers/{page}.defs.ts`) deve continuar sendo criado junto com o frontend ou deve migrar para o `agentChangeBackend`?
Resposta: o l1 será gerado por outro agente.
- Se houver plano intermediário, ele deve ser só trace/auditoria ou também entrada recuperável para `toUpdate`?
Reposta: inicialmente só criação de telas novas

- Qual regra oficial de agrupamento: uma página por operation, uma página por workflow, ou consolidação por capability/ator?
Resposta: uma página pode ter vários organismos, no workflow ou operations, tem o story, a LLM deve decidir, 
também deve ser atualizado o config, com a página que irá aparecer no menu, 
ref: /Volumes/WagnerSSD1/collab/mls-base/mls-102043/config.json

- Como escolher `device/layout/designSystem` quando o L4 só traz estilo visual geral?
Resposta: o page11 é o estilo 'simples', outros estilos serão complementados por outro agente 
este formato é chamado de page genome, 
ref: /Volumes/WagnerSSD1/collab/mls-base/mls-102043/l2/cafeFlow/module.ts

- Quem define menu, ordem e agrupamento por ator: `agentChangeFrontend` por convenção, ou um campo novo no L4/process?
Resposta: explicado acima, no config.json

- Para `toUpdate`, qual diff é considerado seguro: regenerar tudo, preservar edições manuais do layout, ou aplicar patch seletivo por owner?
Resposta: inicialmente só create, deixar previsto para o futuro.

## Coleta complementar — novo agente sem `.defs.ts` geral

Data da coleta: 2026-06-26.

### Fonte Stage 1 (`agentNewSolution2`)

O `flow.json` do `agentNewSolution2` deixa a fronteira clara:

- Stage 1 produz somente o contrato de negócio durável em `l4` e dados de execução em `l5`.
- Stage 1 explicitamente não produz telas, BFF por página, tabelas, persistência, `layer_3`, `layer_4`, métricas ou capabilities como artefato separado.
- Workflows e operations são os owners do Stage 2. Cada owner tem `statusFrontend` e `statusBackend`.
- `statusFrontend`/`statusBackend` usam exatamente `toCreate | toUpdate | toRemove | inProgress | done`.
- `agentChangeFrontend` lê/escreve só `statusFrontend`; `agentChangeBackend` lê/escreve só `statusBackend`.

Arquivos que o `agentChangeFrontend` precisa ler:

- `l4/{module}/module.defs.ts` — `designContext`, `module.visualStyle`, mapa de ontologia e relacionamentos.
- `l4/{module}/ontology/{Entity}.defs.ts` — campos, tipos, obrigatoriedade, enum/status e lifecycle.
- `l4/operations/{operationId}.defs.ts` — owner de operações, `kind`, `reads`, `writes`, story, capability e status.
- `l4/workflows/{workflowId}.defs.ts` — owner de workflows, estados, transições, `operationIds`, story, capabilities e status.
- `l4/rules/{module}Rules.defs.ts` — regras globais.
- `l4/actors/{module}Actors.defs.ts` — actorId e `roleScope`.
- `l5/{module}/process.defs.ts` — run record, next steps e health report.

### Regra de status

O agente só deve processar owners com `statusFrontend` acionável:

- `toCreate`: criar os três `.defs.ts`, materializar e registrar.
- `toUpdate`: atualizar os três `.defs.ts`, rematerializar e atualizar registro.
- `toRemove`: remover `.defs.ts`, `.ts`, `.html` se houver e registro em `config.json`.

Owners com `statusFrontend = done` não podem ser alterados. Owners com `statusFrontend = inProgress` devem ser ignorados por padrão para evitar corrida; recuperação de `inProgress` antigo precisa ser uma regra separada.

Fluxo de status:

1. Validar que o owner está em `toCreate | toUpdate | toRemove`.
2. Alterar para `inProgress`.
3. Executar geração/materialização/registro.
4. Alterar para `done` somente se todas as saídas obrigatórias forem criadas/removidas com sucesso.

Ainda falta uma decisão para falha, porque o enum não tem `failed`: restaurar o status anterior, manter `inProgress` com trace, ou adicionar um mecanismo externo de erro.

### Padrão dos três `.defs.ts` finais

Exemplo analisado: `mls-102043/l2/cafeFlow/web/desktop/page11/cardapioEstoque.defs.ts` e seus pares `web/contracts` e `web/shared`.

#### 1. Contract

Caminho:

`l2/{module}/web/contracts/{page}.defs.ts`

Shape:

- `export const definition = [...]`
- `definition` é um array de comandos BFF.
- Cada comando contém:
  - `commandName`;
  - `purpose`;
  - `kind`: `query` ou `command`;
  - `input`: array de `{ name, type, required?, enum?, description? }`;
  - `output`: array de `{ name, type, required?, enum?, description? }`.

O contrato é puro BFF/frontend. Não publicar nele metadados de backend/L4 como entidade, tabela, usecase, layer contract, regras, campo de origem ou lifecycle interno.

Pipeline:

- `id`: `{page}__l2_contract`;
- `type`: `l2_contract`;
- `outputPath`: `_{project}_/l2/{module}/web/contracts/{page}.ts`;
- `defPath`: `_{project}_/l2/{module}/web/contracts/{page}.defs.ts`;
- `dependsFiles`: `[]`;
- `skills`: `["_102020_/l2/agentChangeFrontend/skills/genCfeContractTs.ts"]`;
- `agent`: `agentMaterializeGen`.

#### 2. Shared

Caminho:

`l2/{module}/web/shared/{page}.defs.ts`

Shape:

- `export const definition = { pageId, pageName, moduleName, contractRef, layoutRef, states, actions, initialLoads, navigationRefs, i18n, automation }`
- `contractRef` aponta para `web/contracts/{page}.defs.ts` e `web/contracts/{page}.ts`; o shared não duplica `bffCommands`.
- `states[]` contém todos os estados globais da página: filtros, campos de formulário, dados carregados, status de action e status geral.
- `actions[]` contém tanto chamadas BFF quanto setters/handlers de state usados pelo render.
- `initialLoads[]` lista queries que o shared carrega ao conectar.
- `navigationRefs` contém navegação `inbound`/`outbound` da página.

Pipeline:

- `id`: `{page}__l2_shared`;
- `type`: `l2_shared`;
- `outputPath`: `_{project}_/l2/{module}/web/shared/{page}.ts`;
- `defPath`: `_{project}_/l2/{module}/web/shared/{page}.defs.ts`;
- `dependsFiles`: contract `.defs.ts`, contract `.ts` e page11 `.defs.ts`;
- `skills`: [`_102020_/l2/agentChangeFrontend/skills/genCfeSharedTs.ts`];
- `rulesApplied`: opcional, somente quando houver regra de frontend/materialização; não deve vir do contrato BFF;
- `rulesPath`: opcional, somente quando houver regra de frontend em shape aceito pelo materializador;
- `agent`: `agentMaterializeGen`.

#### 3. Page/Layout

Caminho:

`l2/{module}/web/{device}/{layout}/{page}.defs.ts`

No exemplo atual:

`l2/cafeFlow/web/desktop/page11/cardapioEstoque.defs.ts`

Shape:

- `export const definition = { pageId, pageName, actor, purpose, capabilities, flowRefs, pluginRefs, mdmRefs, pageInputs, navigationRefs, sections, layout, dataBindings }`
- `i18n` fica somente no `web/shared/{page}.defs.ts`; o page11 referencia chaves (`titleKey`, `labelKey`, `emptyKey`) sem duplicar os valores.
- `layout.sections[]` é a fonte da verdade e contém:
  - `sectionName`;
  - `mode`;
  - `organisms[]`.
- Cada organism contém:
  - `organismName`;
  - `purpose`;
  - `userActions`;
  - `requiredEntities`;
  - `readsFields`;
  - `writesFields`;
- `rulesApplied`.
- `sections[]` no topo é apenas um resumo de compatibilidade, sem duplicar a árvore completa de intenções.

Pipeline:

- `id`: `{page}__l2_page`;
- `type`: `l2_page`;
- `outputPath`: `_{project}_/l2/{module}/web/{device}/{layout}/{page}.ts`;
- `defPath`: `_{project}_/l2/{module}/web/{device}/{layout}/{page}.defs.ts`;
- `dependsFiles`: shared `.defs.ts`, shared `.ts`, contract `.defs.ts` e contract `.ts`;
- `skills`: `_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts`;
- `afterSaveFrontEnd`: `_102020_/l2/agentMaterializeSolution/registerFrontEnd.ts?registerPage`;
- `visualStyle`: pode vir de `l4/{module}/module.defs.ts.module.visualStyle` ou de default do projeto;
- `agent`: `agentMaterializeGen`.

### Defs com layout

O `.defs.ts` final da página deve carregar um **layout funcional** suficiente para o materializador gerar uma tela previsível e para um humano fazer pequenas manutenções sem perder essas alterações ao rematerializar o `.ts`.

Esse layout não é CSS, DOM bruto, design system nem pacote de moléculas. Ele descreve a intenção semântica da página: página, seções, abas quando existirem, organismos e intenções de UI. O `page11` é a implementação simples ("feijão com arroz") e deve renderizar controles HTML/Lit básicos. Implementações com moléculas existentes, por exemplo `page12`, ficam para o agente de genome/design system.

Regras do layout no `.defs.ts` da página:

- cada item de layout deve ter `id` estável; o HTML gerado deve refletir esse id em `data-id`, para o Studio conseguir selecionar e alterar o item certo na tela;
- a árvore deve ser rasa e previsível: `page -> sections | sectionTabs -> organisms -> intentions`;
- um organismo representa uma função de tela, como "listar pedidos na fila da cozinha" ou "editar dados do cliente";
- um organismo não pode conter outro organismo;
- uma seção ou uma aba pode conter vários organismos;
- intenções descrevem o que a página precisa renderizar, como lista de consulta, formulário de comando, resumo, status de workflow ou bloco de ações; elas não são web components nem moléculas;
- o layout deve referenciar `shared`, `contracts`, actions e i18n por chave, sem duplicar suas definições;
- todo texto exibido deve entrar como `labelKey`, `titleKey`, `emptyKey` ou campo equivalente de i18n;
- todo comportamento deve referenciar actions já definidas no shared, como `action`, `rowAction`, `submitAction` ou equivalente;
- todo binding de dados deve apontar para fontes do shared/BFF/global state, sem declarar payloads novos dentro do layout;
- ordenação editável por humano deve ser explícita com `order`, especialmente em seções, abas, organismos, colunas, filtros e ações;
- alterações pequenas esperadas incluem trocar ordem de coluna, renomear chave de i18n, mover organismo entre seções compatíveis e trocar uma intenção por outra compatível;
- alterações que criam campo, action, binding ou comando BFF novo devem voltar para LLM/pipeline, porque exigem mudança em shared/contracts.

Formato recomendado para intenções:

- usar `intent` semântico, por exemplo `intent: "queryList"`, `intent: "commandForm"`, `intent: "summary"`, `intent: "workflowStatus"` ou `intent: "actionList"`;
- preferir propriedades estruturadas de alto nível, como `columns`, `toolbar`, `filters`, `rowActions`, `fields` e `emptyKey`, em vez de slots HTML no `.defs.ts` da página;
- o materializador do `page11` traduz essas intenções para HTML/Lit simples, sem importar moléculas;
- cada item interno também deve ter `id`, `order` e referências por chave, para permitir edição pontual;
- `displayHint` pode existir como string opcional para intenção visual ou animação, por exemplo "destacar status atrasado de forma discreta"; o materializador pode transformar isso em comentário ou orientação para LLM, mas não deve depender desse campo para regra de negócio.

Exemplo mínimo:

```ts
export const definition = {
  pageId: "posRapido",
  layout: {
    id: "page.posRapido",
    type: "page",
    sections: [
      {
        id: "section.pedidosDia",
        type: "section",
        titleKey: "pedidosDiaTitle",
        order: 10,
        organisms: [
          {
            id: "organism.listaPedidosDia",
            type: "orderQueueList",
            source: "state.pedidosDia",
            order: 10,
            intentions: [
              {
                id: "intent.listaPedidosDiaGrid",
                intent: "queryList",
                emptyKey: "emptyPedidosLabel",
                columns: [
                  { id: "col.orderId", field: "orderId", labelKey: "orderIdLabel", order: 10 },
                  { id: "col.status", field: "status", labelKey: "statusLabel", format: "statusBadge", order: 20 }
                ],
                rowActions: [
                  { id: "rowAction.visualizarResumo", action: "visualizarResumo", labelKey: "visualizarResumoLabel", order: 10 }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
} as const;
```

O materializador deve tratar o layout como fonte de verdade para a disposição da página. Em `toUpdate`, ele deve preservar IDs conhecidos e aplicar mudanças por identidade, não por posição textual. Se uma referência apontar para i18n, action, binding ou contrato inexistente, o correto é reportar erro/aviso estruturado e não inventar a dependência dentro da página.

### Ordem de materialização

O `agentMaterializeL2` varre subpastas de `l2/{module}` que tenham `.defs.ts` com `export const pipeline`; ele ignora o folder top-level `l2/{module}`.

A ordem é:

1. contratos (`web/contracts`) sem dependência;
2. shared (`web/shared`) esperando todos os contratos;
3. páginas (`web/desktop/...`) esperando todos os shared, ou contratos se não houver shared.

Detecção atual de página em `agentMaterializeL2` só reconhece `web/desktop`. Se o novo agente gerar mobile ou outro device, o detector precisa ser ampliado.

### Gap técnico: regras L4

O pipeline tem `rulesPath`, mas o loader atual `loadRulesForIds` espera um arquivo com:

- `export const rulesPlan = ... as const`;
- regras em `plan.data.rules`.

O `agentNewSolution2` gera regras em outro shape:

- `export const cafeFlowRules = ... as const`;
- regras em `rules`.

Então, apontar `rulesPath` direto para `l4/rules/{module}Rules.defs.ts` hoje não resolve regras. Há três opções:

- atualizar `loadRulesForIds` para aceitar o shape novo do L4;
- gerar um adapter `l5/{module}/rules.defs.ts` no shape antigo;
- remover dependência de `rulesPath` até o materializador entender L4.

A opção mais simples e coerente com o novo modelo é atualizar `loadRulesForIds` para aceitar ambos os shapes.

### Como derivar comandos do L4

Para cada página derivada, gerar `bffCommands` concretos a partir dos owners:

- `operation.kind = query | view` vira comando `kind: "query"`;
- `operation.kind = create | update | delete` vira comando `kind: "command"`;
- `reads` e `writes` devem resolver entidades/campos na ontologia;
- `input` de command deve vir de `writes` + campos obrigatórios da entidade, removendo campos gerados pelo sistema quando aplicável (`createdAt`, `updatedAt`, ids se forem server-generated);
- `input` de query deve vir de filtros úteis inferidos de `reads`, lifecycle/status e relações;
- `output` deve vir dos campos da entidade principal que a tela precisa exibir;
- enum da ontologia deve ser preservado como tipo literal/union, não `string`;
- metadados de backend/L4 não devem ser publicados no contrato frontend; o `agentChangeBackend` lê diretamente o L4.

Esta derivação ainda exige heurística ou LLM porque o L4 não diz exatamente quais campos aparecem em filtro, tabela, formulário e detalhe.

### Diferença entre exemplo 102043 e dados 102050

O `cardapioEstoque` do `102043` é bom como padrão de arquivo/pipeline, não como mapa direto de domínio.

Exemplo:

- `102043` usa `StockItem`, `UnitOfMeasure`, `StockMovement`, `LowStockAlert`.
- `102050` usa `InventoryItem`, `StockAdjustment`, `StockConsumption`, `RecipeComponent`.

Logo, o novo agente não deve copiar entidades/comandos do exemplo. Ele deve copiar somente o padrão estrutural dos três `.defs.ts` e derivar nomes, campos e comandos do L4 do projeto alvo.

## Atualização do fluxo v1 — defs + config

O `flow.json` v1 passa a ser **create-only, com `.defs.ts` + `config.json`, sem materialização**. Isto corrige/sobrescreve as partes anteriores desta spec que ainda citavam materialização ou entrada manual:

- o agente não recebe `module`, `owner`, `page` ou outro input operacional; ele varre o `l4` e processa somente owners com `statusFrontend = toCreate`;
- se não houver `toCreate`, encerra sem escrever arquivos nem alterar status;
- gera os três `.defs.ts` finais por página: `web/contracts`, `web/shared` e `web/desktop/page11`;
- atualiza `l0/config.json` com a página que aparecerá no menu;
- não gera `.ts`, não gera `.html`, não chama `agentMaterializeL2`/`agentMaterializeGen` e não executa `registerFrontEnd` nesta v1;
- a geração de layout é uma etapa LLM importante e deve seguir as regras de layout semântico desta spec;
- a geração por página deve tentar paralelismo: um item paralelo por página com filhos `contract -> layout -> shared -> validate`; como ainda não há exemplo confirmado de `parallel_dynamic` com filhos, o fluxo registra fallback para um único agente paralelo por página que executa essas quatro ações internamente;
- agentes LLM devem seguir o padrão do `agentNewSolution2`: saída via JSON schema/tool strict (`collab-llm`) e validação local antes de gravar;
- aliases de modelo e recomendação por tipo de agente ficam registrados no `flow.json`.

## Versão 0.1 para teste

Antes de gerar arquivos, a implementação inicial criada para teste faz somente:

- `agentChangeFrontend` inicia o fluxo v0.1;
- `agentCfeV01ScanL4` lê `l4`, encontra owners com `statusFrontend = toCreate` e monta páginas candidatas;
- cria um fan-out `parallel_dynamic` com `executionMode: { type: "parallel" }`, que deve gerar `progress`; cada página paralela cria filhos `contract -> layout -> shared -> config`;
- `agentCfeV01PageConsole` imprime no console a página que seria criada;
- `agentCfeV01PageChildConsole` imprime no console cada fase por página;
- `agentCfeV01FinalConsole` imprime o resumo após a barreira final;
- não grava `.defs.ts`, não grava `config.json`, não altera `statusFrontend` e não materializa nada.

## Implementação create-v1

Após validar o paralelo, a implementação real inicial para `toCreate` está dividida assim:

- `agentChangeFrontend` inicia o fluxo create-only;
- `agentCfeCreateScanL4` lê o `l4`, encontra owners com `statusFrontend = toCreate`, cria o fan-out real `create-page-fanout` e agenda a finalização;
- `agentCfeCreatePage` gera `web/contracts/{page}.defs.ts` de forma determinística, chama LLM com JSON schema/tool strict para o layout semântico, grava `web/desktop/page11/{page}.defs.ts` e depois gera `web/shared/{page}.defs.ts` a partir de `contractRef + layout`;
- `agentCfeCreatePage` também grava `l2/{module}/trace/frontend-create-pages/{page}.json` como `inProgress` no início e `done` só depois de layout e shared validados, para evitar que uma página antiga seja aceita por engano;
- `agentCfeCreateFinalize` atualiza `l0/config.json`, grava `l2/{module}/trace/frontend-create-report.json` e muda os owners gerados para `statusFrontend = done`;
- `cfeCreateShared` concentra leitura do L4, geração determinística dos comandos, schema/validação do layout, gravação dos `.defs.ts`, merge do config e atualização de status.

O layout LLM deve manter a estrutura de `sections -> organisms` e enriquecer cada organismo com `intentions`, `id` estável, `order`, `labelKey/titleKey/emptyKey`, referências a actions do shared, campos do contrato/ontologia e `dataBindings`. O `page11` não deve referenciar moléculas, grupos, tags ou pacotes de componentes. Se a saída falhar no schema ou na validação semântica, a página não é marcada como concluída.

Os campos do contrato BFF são gerados mecanicamente a partir da ontologia. Quando um campo da entidade tiver `enum`, `description` ou `statusEnum`, esses metadados frontend devem ser preservados no `input`/`output` do contrato para o materializador não degradar status/tipos fechados para `string` livre. Não preservar `lifecycleStates`, `sourceEntity`, `sourceField` ou `sourceType` no contrato.

O `page11` materializado deve apenas renderizar. Toda variável editável ou observável precisa estar em `shared.states[]`, e toda mudança de campo deve chamar handler/setter do shared para manter `collabState` atualizado e permitir automação da página.
