# agentChangeSolution — spec (sem implementação)

Projeto: master frontend (102020). Tipo: **preparador de manutenção** (não gera telas nem backend — só prepara o estado e dispara os workers).
Documento auto-contido (não depende de outros arquivos).

## Propósito

Porta de entrada de **manutenção** de um módulo que **já existe**. Interpreta o pedido do usuário, decide o que muda no modelo de negócio (Workflow / Operation / Rule / Ontology), **calcula o impacto**, opcionalmente apresenta um **clarification**, aplica o patch no `l4` e **marca o `status`** de cada item (incluir / alterar / marcar para excluir). No fim, **chama** os workers (`agentChangeFrontend` / `agentChangeBackend`). Criação de módulo novo NÃO é aqui (é o `agentNewSolution2`).

## Modelo compartilhado (contexto auto-contido)

**Camadas:** `l4` = business; `l5` = dados de projeto (monitoramento/infra). Caminhos:
- `l4/{module}/module.defs.ts` — atores, capabilities, mapa de ontologia.
- `l4/{module}/ontology/{Entity}.defs.ts` — entidades canônicas (fields, enums, lifecycle). **Só substantivos de dados** (nunca use-cases/verbos; nada de `Uc*`).
- `l4/rules/{ruleId}.defs.ts` — regras de negócio (GLOBAL; nunca em trace/_traceTemp).
- `l4/workflows/{workflowId}.defs.ts` — processos (GLOBAL, fora do módulo).
- `l4/operations/{operationId}.defs.ts` — ações diretas (GLOBAL, fora do módulo).

**Owners (donos de tudo que se gera):**
- **Workflow** = comportamento com **estado/gatilho** (processo multi-passo/ator no tempo). Schema: `workflowId, title, trigger, actors[], states[], transitions[], orchestrates[] (operationIds), entities[] (ids de ontologia), rulesApplied[], story{actor,goal,soThat,steps[],outcome}, status`.
- **Operation** = **ação direta** de 1 ator sobre 1 entidade (create/update/delete/query/view). É o **contrato BFF em nível de intenção**. Schema: `operationId, title, actor, entity (id de ontologia), kind, reads[] (ids/campos de ontologia), writes[], rulesApplied[], story{...}, status`.
- **Rule** = regra de negócio. Schema: `ruleId, title, description, scope, status`.

**user stories** são absorvidas no campo `story` de cada Workflow/Operation (não existe artefato `journeys`).

**Espaço de IDs:** referências de entidade usam SEMPRE id canônico de ontologia (qualificado entre módulos, ex.: `cafeFlow:Order`). **Nunca** nomes de agregado (`OrderAggregate`, `menuEntity`) — foi a causa do drift `entity.ref.unknown`.

**Enum de status (único, no próprio item de Workflow/Operation/Rule):**
`toCreate | toUpdate | toRemove | inProgress | done`.

**Guardrails (lições analise10/11/12):** ontologia só com dados; refs por id de ontologia; concerns de plataforma (auth/audit/monitoring/notifications) fora do escopo; determinístico é duro, opinião de LLM é suave (não derruba o fluxo); finalizar a task cedo (resumo opcional).

## Responsabilidade deste agente

1. **Interpretar o pedido** — traduzir "quando X faz Y" → Workflow; "nessa ação/consulta quero Z" → Operation; "mudou o dado/regra" → Ontology/Rule.
2. **Analisar impacto (steps internos — o antigo "impactScope" vive AQUI dentro):** a partir do(s) owner(s) alvo, calcular o blast-radius (quais Operations/Workflows/Rules e quais artefatos downstream — páginas, tabelas, usecases — serão afetados), usando `dependsFiles` do pipeline e/ou o grafo de dependências.
3. **Clarification (opcional):** confirmar escopo/impacto com o usuário ANTES de gravar, para não regenerar demais.
4. **Aplicar patch + marcar status:** criar (`toCreate`), alterar (`toUpdate`) ou marcar para excluir (`toRemove`) os itens em `l4`; propagar `toUpdate`/`toRemove` para os itens impactados.
5. **Despachar:** abrir as tasks dos workers (`agentChangeFrontend` e/ou `agentChangeBackend`) — que rodam depois, lendo só o `l4`.

## Steps (alto nível, sem implementação)

- `interpret-change` — classifica o pedido nos owners afetados.
- `impact-scan` (1+ steps) — calcula o blast-radius determinístico.
- `clarify-change` (opcional) — confirma escopo/impacto.
- `apply-patch` — escreve/atualiza/marca os itens em `l4` e seta `status`.
- `dispatch-workers` — dispara `agentChangeFrontend`/`agentChangeBackend`.

## Entrada / Saída

- **Entrada:** prompt do usuário + estado atual do `l4` do módulo.
- **Saída:** `l4` com itens criados/alterados/marcados e `status` setado; tasks dos workers abertas. **Não** produz telas, bffCommands por página, tabelas nem backend.

## Status (único, no owner)

`agentChangeSolution` é quem **seta a intenção** (`toCreate`/`toUpdate`/`toRemove`). Os workers depois movem para `inProgress` → `done`. Como o status é único por item, a convenção para mudanças que afetam frontend E backend é rodar `agentChangeFrontend` e depois `agentChangeBackend`; o worker terminal marca `done` (mudança de um lado só é marcada `done` pelo próprio lado). *(Detalhe a refinar na implementação.)*

## O que este agente NÃO faz

- Não cria módulo novo (é `agentNewSolution2`, que só roda se o módulo não existe).
- Não gera/edita telas, contratos BFF concretos por página, tabelas, layer_3/4 nem materializa `.ts`.

## Referências de artefato
- Lê/escreve: `l4/{module}/ontology/*`, `l4/workflows/*`, `l4/operations/*`, `l4/rules/*`, `l4/{module}/module.defs.ts`.
- Dispara: `agentChangeFrontend` (102020), `agentChangeBackend` (102021).
