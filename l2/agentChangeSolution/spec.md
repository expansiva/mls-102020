# agentChangeSolution — spec (sem implementação)

Projeto: master frontend (102020). Tipo: **preparador de manutenção** (não gera telas nem backend — só prepara o estado e dispara os workers).
Documento auto-contido (não depende de outros arquivos).

## Propósito

Porta de entrada de **manutenção** de um módulo que **já existe**. Interpreta o pedido do usuário, decide o que muda no modelo de negócio (Workflow / Operation / Rule / Ontology), **calcula o impacto**, opcionalmente apresenta um **clarification**, aplica o patch no `l4` e **marca os status de reconciliação** (`statusFrontend` e/ou `statusBackend`) de cada item afetado. No fim, **chama** os workers (`agentChangeFrontend` / `agentChangeBackend`). Criação de módulo novo NÃO é aqui (é o `agentNewSolution2`).

## Modelo compartilhado (contexto auto-contido)

**Camadas:** `l4` = business; `l5` = dados de projeto (monitoramento/infra). Caminhos:
- `l4/{module}/module.defs.ts` — atores, capabilities, mapa de ontologia.
- `l4/{module}/ontology/{Entity}.defs.ts` — entidades canônicas (fields, enums, lifecycle). **Só substantivos de dados** (nunca use-cases/verbos; nada de `Uc*`).
- `l4/rules/{ruleId}.defs.ts` — regras de negócio (GLOBAL; nunca em trace/_traceTemp).
- `l4/workflows/{workflowId}.defs.ts` — processos (GLOBAL, fora do módulo).
- `l4/operations/{operationId}.defs.ts` — ações diretas (GLOBAL, fora do módulo).

**Owners (donos de tudo que se gera):**
- **Workflow** = comportamento com **estado/gatilho** (processo multi-passo/ator no tempo). Schema: `workflowId, title, trigger, actors[], states[], transitions[], operationIds[], entities[] (ids de ontologia), rulesApplied[], story{actor,goal,soThat,steps[],outcome}, capabilities[], statusFrontend, statusBackend`.
- **Operation** = **ação direta** de 1 ator sobre 1 entidade (create/update/delete/query/view). É o **contrato BFF em nível de intenção**. Schema: `operationId, title, actor, entity (id de ontologia), kind, reads[] (ids/campos de ontologia), writes[], rulesApplied[], story{...}, capability, statusFrontend, statusBackend`.
- **Rule** = regra de negócio. Schema: `ruleId, title, description, appliesTo[]`. Regras são **aplicadas pelos owners** que as referenciam (não têm eixo de reconciliação próprio).

**user stories** são absorvidas no campo `story` de cada Workflow/Operation (não existe artefato `journeys`; há um `l4/{module}/journeys.defs.ts` apenas **derivado** das stories).

**Espaço de IDs:** referências de entidade usam SEMPRE id canônico de ontologia (qualificado entre módulos, ex.: `cafeFlow:Order`). **Nunca** nomes de agregado (`OrderAggregate`, `menuEntity`) — foi a causa do drift `entity.ref.unknown`.

**Status de reconciliação (DOIS campos independentes no próprio item de Workflow/Operation):**
`statusFrontend` e `statusBackend`, cada um com o enum `toCreate | toUpdate | toRemove | inProgress | done`.
`agentChangeFrontend` cuida do `statusFrontend`; `agentChangeBackend` cuida do `statusBackend`.

**Guardrails (lições analise10/11/12):** ontologia só com dados; refs por id de ontologia; concerns de plataforma (auth/audit/monitoring/notifications) fora do escopo; determinístico é duro, opinião de LLM é suave (não derruba o fluxo); finalizar a task cedo (resumo opcional).

## Responsabilidade deste agente

1. **Interpretar o pedido** — traduzir "quando X faz Y" → Workflow; "nessa ação/consulta quero Z" → Operation; "mudou o dado/regra" → Ontology/Rule.
2. **Analisar impacto (steps internos — o antigo "impactScope" vive AQUI dentro):** a partir do(s) owner(s) alvo, calcular o blast-radius (quais Operations/Workflows/Rules e quais artefatos downstream — páginas, tabelas, usecases — serão afetados), usando `dependsFiles` do pipeline e/ou o grafo de dependências.
3. **Clarification (opcional):** confirmar escopo/impacto com o usuário ANTES de gravar, para não regenerar demais.
4. **Aplicar patch + marcar status por camada:** criar/alterar/marcar-para-excluir os itens em `l4` e setar `statusFrontend` e/ou `statusBackend` conforme a camada afetada:
   - mudança que afeta a tela → `statusFrontend = toCreate|toUpdate|toRemove`;
   - mudança que afeta persistência/implementação → `statusBackend = toCreate|toUpdate|toRemove`;
   - mudança que afeta as duas → setar **ambos**.
   Propagar o status apropriado para os itens impactados (blast-radius).
5. **Despachar:** abrir as tasks dos workers (`agentChangeFrontend` e/ou `agentChangeBackend`) conforme quais status ficaram pendentes — rodam depois, lendo só o `l4`, e cada um vira **só o seu** status para `done`.

## Steps (alto nível, sem implementação)

- `interpret-change` — classifica o pedido nos owners afetados.
- `impact-scan` (1+ steps) — calcula o blast-radius determinístico.
- `clarify-change` (opcional) — confirma escopo/impacto.
- `apply-patch` — escreve/atualiza/marca os itens em `l4` e seta `statusFrontend`/`statusBackend` por camada.
- `dispatch-workers` — dispara `agentChangeFrontend`/`agentChangeBackend` conforme os status pendentes.

## Entrada / Saída

- **Entrada:** prompt do usuário + estado atual do `l4` do módulo.
- **Saída:** `l4` com itens criados/alterados/marcados e `statusFrontend`/`statusBackend` setados por camada; tasks dos workers abertas. **Não** produz telas, bffCommands por página, tabelas nem backend.

## Status (statusFrontend / statusBackend)

`agentChangeSolution` é quem **seta a intenção** (`toCreate`/`toUpdate`/`toRemove`) no eixo certo: `statusFrontend` para mudanças de tela, `statusBackend` para mudanças de persistência, **ambos** quando a mudança atravessa as duas camadas. Cada worker depois move **só o seu** eixo `inProgress → done`, de forma **independente** (sem ordem obrigatória entre frontend e backend, sem a antiga ambiguidade do status único). Itens não afetados ficam `done` nos dois eixos e os workers os ignoram.

## O que este agente NÃO faz

- Não cria módulo novo (é `agentNewSolution2`, que só roda se o módulo não existe).
- Não gera/edita telas, contratos BFF concretos por página, tabelas, layer_3/4 nem materializa `.ts`.

## Referências de artefato
- Lê/escreve: `l4/{module}/ontology/*`, `l4/workflows/*`, `l4/operations/*`, `l4/rules/*`, `l4/{module}/module.defs.ts`.
- Dispara: `agentChangeFrontend` (102020), `agentChangeBackend` (102021).
