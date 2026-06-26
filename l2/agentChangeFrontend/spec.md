# agentChangeFrontend — spec (sem implementação)

Projeto: master frontend (102020). Tipo: **worker (reconciliador) de frontend**.
Documento auto-contido (não depende de outros arquivos).

## Propósito

Olhar o `statusFrontend` dos owners no `l4` e **fazer só o que está pendente** (um "to-be"): criar/atualizar/remover as **telas** + parte **shared** + **contrato BFF** + **layout** da página, chamar a **materialização** (`.defs.ts → .ts`) e registrar no **menu** (`config.json`). No fim, muda o `statusFrontend`. Pode ser chamado **a qualquer momento** e fazer **um único item** (uma tela, um arquivo). É idempotente: re-rodar só toca no que ainda não está `done`.

## Modelo compartilhado (contexto auto-contido)

**Camadas:** `l4` = business; `l5` = dados de projeto. Caminhos relevantes:
- Lê de `l4`: `l4/{module}/ontology/*`, `l4/workflows/*`, `l4/operations/*`, `l4/rules/*`, `l4/{module}/module.defs.ts`.
- Escreve em `l2`: `l2/{module}/{page}.defs.ts` (página), shared e contratos BFF; e materializa para `.ts`.
- Registra no menu: `l0/config.json` (mecanismo de menu já existente).

**Owners (de onde a tela nasce):**
- **Workflow** = processo com estado/gatilho → telas de processo (1 tela por estado/passo) + BFF de transição.
- **Operation** = ação direta sobre 1 entidade (create/update/delete/query/view) → tela de gestão/consulta + BFF da ação. A Operation já traz a assinatura (entidades de ontologia que lê/escreve) = **contrato BFF de intenção**; aqui ela vira `bffCommands` concretos da página.

**Status de reconciliação (DOIS campos independentes no item de Workflow/Operation):**
`statusFrontend` e `statusBackend`, cada um com o enum `toCreate | toUpdate | toRemove | inProgress | done`.
Este worker lê/escreve **apenas `statusFrontend`**; o `agentChangeBackend` cuida do `statusBackend`.
São independentes — sem ordem obrigatória entre os dois workers nem ambiguidade de status único.

**Espaço de IDs:** as referências de entidade nas páginas/bffCommands usam SEMPRE id de ontologia (qualificado entre módulos). **Nunca** nomes de agregado (`OrderAggregate`, `menuEntity`).

**Guardrails (lições analise10/11/12):**
- bffCommands devem carregar **tipo resolvido** via ontologia (status como enum literal, ids como `uuid`), para o backend não adivinhar (T1/T5).
- Não referenciar concerns de plataforma (auth/audit/monitoring/notifications) — são da plataforma.
- Evitar **fragmentação**: guardas/confirmações/erros de um processo são **estados do Workflow** (uma página com estados/modais), não dezenas de micro-páginas.
- Determinístico é duro; opinião de LLM é suave (não derruba o fluxo). Finalizar a task cedo.

## Responsabilidade deste agente

1. **Varrer** o `l4` em busca de owners (Operations/Workflows) com `statusFrontend` ≠ `done` — ou processar **um item específico** recebido como argumento.
2. Para cada item pendente:
   - `toCreate` / `toUpdate`: gerar/atualizar a(s) página(s) do owner (def + shared + bffCommands tipados por ontologia + layout); **materializar** (`.defs.ts → .ts` via materialização L2 existente); **registrar no menu** (`config.json`).
   - `toRemove`: remover página + shared + `.ts` materializado + entrada no menu (remoção em cascata do que era só daquele owner).
3. **Mudar o `statusFrontend`** do item ao concluir.

## Steps (alto nível, sem implementação)

- `scan-pending` — lista owners com `statusFrontend` pendente (ou recebe 1 item).
- `derive-pages` — do owner, decide as páginas (estado de Workflow / Operation).
- `generate-page` — por página: def + shared + BFF + layout (reusa o conceito do antigo agentGeneratePage).
- `materialize` — chama a materialização L2 existente (`.defs.ts → .ts`).
- `register-menu` — atualiza `config.json`.
- `flip-status` — marca `statusFrontend = inProgress` ao iniciar e `statusFrontend = done` ao concluir.

## Entrada / Saída

- **Entrada:** `l4` do módulo (owners + `statusFrontend`). Opcional: um `operationId`/`workflowId`/página específico para processar só ele.
- **Saída:** páginas/shared/contratos BFF criados/atualizados/removidos em `l2`, materializados em `.ts`, menu atualizado, e `statusFrontend` dos itens processados atualizado.

## Status (statusFrontend)

Pega itens com `statusFrontend` ≠ `done`; ao iniciar um item seta `statusFrontend = inProgress`; ao concluir a parte de frontend, marca `statusFrontend = done`. **Independente do backend:** o `agentChangeBackend` controla o `statusBackend` separadamente, então não há ordem obrigatória entre os dois workers nem a antiga ambiguidade do status único. Owners semeados pela Etapa 1 (`agentNewSolution2`) nascem com `statusFrontend = toCreate` e `statusBackend = toCreate`.

## O que este agente NÃO faz

- Não decide O QUE muda (isso é `agentChangeSolution`/`agentNewSolution2`); só executa o que já está marcado no `l4`.
- Não gera backend (tabelas, layer_3/4, persistência) — isso é `agentChangeBackend` (que controla o `statusBackend`).
- Não cria/edita a ontologia, workflows, operations ou rules.

## Referências de artefato
- Lê: `l4/...` (owners + ontologia + rules).
- Escreve: `l2/{module}/...` (páginas, shared, contratos BFF) + `.ts` materializado + `l0/config.json`.
- Reusa: materialização L2 já existente (agentMaterializeL2 / agentMaterializeGen).
