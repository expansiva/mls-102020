<!-- mls fileReference="_102020_/l2/agentNewSolution2/devJourney.md" enhancement="_blank" -->

# Jornadas do desenvolvedor × cobertura dos 4 agentes (manutenção do MÓDULO como um todo)

Objetivo: confirmar se os 4 agentes bastam para **manter um módulo inteiro** (não uma tela específica)
e mapear funções que teremos e que não teremos (gaps).

> As porcentagens são **estimativas de cobertura automática** (quanto da jornada o dev resolve via
> agentes, sem código manual), assumindo que cada agente de mudança faça **bem a sua camada**. São um
> instrumento de priorização, não medição.

## Referencias dos agentes 

- agentNewSolution: /Volumes/WagnerSSD1/collab/mls-base/mls-102020/l2/agentNewSolution2/flow.json
- agentChangeSolution: /Volumes/WagnerSSD1/collab/mls-base/mls-102020/l2/agentChangeSolution/spec.md
- agentChangeFrontend: /Volumes/WagnerSSD1/collab/mls-base/mls-102020/l2/agentChangeFrontend/spec.md
- agentChangeBackend: /Volumes/WagnerSSD1/collab/mls-base/mls-102021/l2/agentChangeBackend/spec.md


## Os 4 agentes e a camada que cada um governa

| Agente | Camada / artefatos | Papel | Status hoje |
|---|---|---|---|
| **agentNewSolution** | greenfield (l4 comportamento → materializa l1/l2/l3) | Criar módulo/solução do zero | **Existe** (evoluído em `agentNewSolution2` = Etapa 1 do split) |
| **agentChangeSolution** | l4 = negócio (ontology, rules, workflows, operations, actors) + l5 | Manter o **modelo durável** | **Stub** (pasta vazia) |
| **agentChangeFrontend** | l2 = páginas, BFF, componentes, design system | Manter a **experiência** | **Stub** (pasta vazia) |
| **agentChangeBackend** | l1 = tabelas/persistência, l3 = usecases, materialização | Manter o **backend** | **Não existe** |
| (apoio) agentMaterializeSolution, agentAddLanguage | l1/l2 geração; i18n | Materialização e idioma | Existem |

**Observação estrutural:** os 4 agentes são organizados **por camada**. A maioria das manutenções
reais de módulo é **transversal** (uma mudança atravessa comportamento + backend + frontend). Os
agentes sabem *executar* cada camada; falta quem **decomponha o pedido, roteie para as camadas,
sequencie e valide a consistência entre elas**.

## A "espinha" de uma mudança de módulo (e quem é dono de cada passo)

```
pedido em linguagem natural
  → [1] entender + impacto (o que muda, o que quebra)        ← GAP (sem dono)
  → [2] mudar o modelo de negócio (l4)                        ← agentChangeSolution
  → [3] mudar o backend (l1/l3) + migração de dados           ← agentChangeBackend (+ GAP migração)
  → [4] mudar o frontend (l2)                                 ← agentChangeFrontend
  → [5] validar consistência l1↔l2↔l4 + testes                ← GAP (validador só de comportamento)
```

Os passos **[2][3][4]** têm dono (os change*). Os passos **[1] e [5]** — decomposição/impacto e
validação transversal — **não têm dono**. É aí que mora o maior risco para "o módulo como um todo".

---

## Jornadas do desenvolvedor

### A. Modelo de negócio (dono: agentChangeSolution)

| # | Jornada | Descrição | Agente | % auto | Gap |
|---|---|---|---|---|---|
| A1 | Adicionar entidade ao domínio | Nova entidade + campos + relationships na ontologia | changeSolution | ~80% | migração de dados; propagação a tabela/telas |
| A2 | Adicionar/alterar campo de entidade | Campo novo, enum, lifecycle | changeSolution | ~75% | migração; re-gerar form/tabela (frontend+backend) |
| A3 | Mudar regra de negócio | Validação/cálculo/lifecycle | changeSolution | ~85% | se exigir dado novo → backend |
| A4 | Criar/alterar workflow | Novo estado/transição/operação orquestrada | changeSolution | ~80% | tracker no frontend + handlers no backend |
| A5 | Criar/alterar operação (contrato BFF) | Nova intenção CRUD/query | changeSolution | ~80% | wiring frontend + impl backend |
| A6 | Referência MDM / dado mestre | Novo domínio MDM ou reaproveitar 102034 | changeSolution | ~75% | governança/sync |
| A7 | Ator/role/permissão (authz) | Novo ator + roleScope; permissões por operação | changeSolution | ~65% | enforcement e mapeamento op→permissão |
| A8 | Agente operacional (IA) | Nova capability de IA (proxy LLM) | changeSolution + backend | ~55% | impl do agente + dados |

### B. Experiência / Frontend (dono: agentChangeFrontend)

| # | Jornada | Descrição | Agente | % auto | Gap |
|---|---|---|---|---|---|
| B1 | Nova página para workflow/operação | Tela derivada do l4 | changeFrontend | ~85% | — (fora do escopo de preocupação agora) |
| B2 | Dashboard/relatório | Tela de consulta/agregação | changeFrontend + backend | ~65% | query/agregação no backend |
| B3 | Reestruturar navegação/IA do módulo | Menu, agrupamento por ator | changeFrontend | ~65% | decisão de UX cross-page |
| B4 | Design system / tema | Aplicar/atualizar DS | changeFrontend / agentImplementsDesignSystem2 | ~75% | — |
| B5 | Adicionar idioma (i18n) | Traduções | agentAddLanguage (existe) | ~90% | revisão linguística |

### C. Backend (dono: agentChangeBackend — a criar)

| # | Jornada | Descrição | Agente | % auto | Gap |
|---|---|---|---|---|---|
| C1 | Criar/alterar tabela de persistência | Tabela transacional do módulo | changeBackend | ~75% | **migração de dados existentes** |
| C2 | Usecase/command (l3) | Implementar/alterar comando | changeBackend | ~75% | testes |
| C3 | Métrica/hypertable + dashboard data | TimescaleDB + agregação | changeBackend | ~65% | retenção/perf |
| C4 | Tuning de performance/índices | Diagnóstico + índice | changeBackend | ~40% | profiling/observabilidade |
| C5 | **Migração/backfill de dados** | Evoluir schema sem perder dados | — | **~20%** | **sem dono** |

### D. Transversal / ciclo de vida (os grandes gaps)

| # | Jornada | Descrição | Agente | % auto | Gap |
|---|---|---|---|---|---|
| D1 | **Feature transversal** ("adicionar fidelidade/pontos") | Atravessa l4+l1/l3+l2; precisa decompor, sequenciar e propagar ids | os 3 change* | **~50%** | **orquestrador/decompositor (G1)** |
| D2 | **Refactor/rename em cascata** (Order→Ticket) | Renomear id/entidade em l1/l2/l4 coerentemente | — | **~30%** | refactor cross-layer + impacto (G1/G2) |
| D3 | **Remover/depreciar** feature/entidade | Remoção segura com análise de impacto | — | **~30%** | impacto + cascata (G2/G4) |
| D4 | **Diagnóstico de bug (RCA)** | Achar a causa entre camadas e corrigir | change* (após saber a camada) | **~35%** | sem agente de RCA cross-layer (G5) |
| D5 | **Testes** | Gerar/manter testes do módulo | — | **~20%** | sem agente de testes (G6) |
| D6 | **Versionamento/rollback** de mudança | Reverter um conjunto de mudanças | — | **~20%** | sem dono (G7) |
| D7 | Mudança em dependência cross-módulo | Alterar MDM/horizontal compartilhado | — | ~40% | impacto entre módulos (G2) |
| D8 | Re-especificar a partir de novo prompt | Re-gerar comportamento (scoped) | changeSolution / newSolution | ~70% | merge com o que já existe |
| D9 | **Validação de consistência do módulo inteiro** | Lint l1↔l2↔l4 (refs, cobertura) | parcial (validador é só de comportamento) | **~40%** | validador full-stack (G2) |

---

## Veredito

**Os 4 agentes são necessários, mas NÃO suficientes para manter o módulo como um todo.** Eles cobrem
bem a **execução por camada** (mudanças atômicas: A1–A6, B1–B5, C1–C3 ficam ~75–85%). O que falta é o
**nível de módulo**: as jornadas transversais e de ciclo de vida (D1–D9) ficam ~20–50% porque não há
quem decomponha o pedido, analise impacto, sequencie as camadas e valide a consistência do conjunto.

Cobertura agregada estimada da manutenção real de um módulo: **~60–70%** (a parte por-camada), com os
**30–40%** restantes (transversal/ciclo de vida) hoje manuais.

## Gaps (funções que NÃO teremos só com os 4 agentes)

- **G1 — Orquestrador de manutenção (o mais importante).** Um 5º agente (ex.: `agentChangeModule` /
  `agentMaintainModule`) que: recebe o pedido em linguagem natural → faz **análise de impacto** →
  **roteia** para changeSolution/Frontend/Backend → **sequencia** (negócio → backend → frontend) →
  dispara a **validação transversal**. É o análogo, para manutenção, do que o `agentNewSolution2`
  orquestra na criação. Sem ele, D1/D2/D3 ficam manuais.
  Resposta: esta função será do agentChangeSolution, análise de impacto, clarification, preparação mudanças e disparar outros agentes.
  
- **G2 — Impacto / blast-radius + validação full-stack.** Responder "o que usa `Order.status`?" e
  validar refs l1↔l2↔l4 após a mudança. Há o grafo (`code-review-graph` no CLAUDE.md) e os refs por id
  do l4 — falta transformá-los em uma função consumível pelo orquestrador (pode ser ferramenta
  determinística, não precisa ser LLM).
- **G3 — Migração/evolução de schema (dados).** Quando entidade/campo muda, migrar/backfill dados
  existentes. Hoje sem dono (C5/A2).
- **G4 — Remoção/depreciação com cascata.** Apagar com segurança (D3).
- **G5 — RCA de bug cross-layer.** Diagnosticar a causa entre camadas antes de corrigir (D4).
- **G6 — Testes.** Gerar/manter testes do módulo (D5).
- **G7 — Versionamento/rollback.** Reverter um conjunto coeso de mudanças (D6) — possivelmente
  plataforma/tooling, não agente.

## Recomendação

1. **Priorizar G1 (orquestrador de manutenção).** É o que destrava "o módulo como um todo": decompõe,
   roteia para os 3 change*, sequencia e valida. Os change* continuam donos da execução por camada.
2. **G2 como ferramenta determinística** (impacto + validação full-stack) consumida pelo orquestrador —
   barato e de alto valor, aproveitando os refs por id que o l4 já garante.
3. **G3 (migração)** logo em seguida, pois quase toda mudança de modelo com dados em produção depende
   dela; sem isso, A1/A2/C1 ficam incompletas em runtime.
4. G5/G6/G7 podem ser uma fase posterior (qualidade/operação), e G7 talvez seja plataforma.

Com **G1 + G2 + G3**, a cobertura de manutenção de módulo sobe de ~60–70% para ~85–90%; os 4 agentes
por-camada permanecem como os executores.
