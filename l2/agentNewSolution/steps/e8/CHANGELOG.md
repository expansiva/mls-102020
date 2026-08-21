# Changelog

## 2026-08-21 — dado mestre não deleta: desativar e reativar

O catálogo de uma entidade com `storage.target: 'mdm'` deixa de emitir `delete`. Dado mestre é
referenciado por outros registros, então remover a linha quebra essas referências. No lugar entram
`inactivate<Entity>` e `reactivate<Entity>` (bffCalls `cmdInactivate`/`cmdReactivate`), e o
`recordList` oferece as duas como ação contextual. Entidade `moduleDatabase`, `derived` ou
`external` continua exatamente como antes — o escopo desta onda é só `mdm`.

A `list` de catálogo mdm passa a devolver **só ativos** por default, com um flag de requisição
opcional `includeInactive`; isso torna todo picker de chave estrangeira que reusa a operação de list
compartilhada active-only sem tocar em picker nenhum. Busca por id continua resolvendo registro
inativo: integridade de histórico nunca depende de o registro estar ativo.

A situação é **derivada** do ciclo de vida do registro MDM: a ontologia não ganha campo `active`, e o
modelo não inventa um field ref para ela — declara o membro derivado de resposta no bloco `mdm`.

O par de comandos mantém `accessPattern.kind: 'update'` e carrega o significado no bloco `mdm` novo
(um campo opcional só). O vocabulário de accessPattern do consumidor é fechado, então um kind novo
seria invisível para o gerador de backend; o marcador é aditivo e não quebra consumidor que o ignora.

Backstop determinístico: `NS4_E8_MDM_DELETE` reporta operação `delete` sobre entidade mdm. Com a
regra do catálogo no lugar ele nunca dispara — existe contra regressão e contra caminho futuro que
não passe pelo compilador de catálogos.

Evidência que virou regra: o primeiro petShop entregou `deleteCustomerProfile`, `deletePet`,
`deleteServiceOffering` e `deleteServiceHours` — as quatro sobre `storage.target: 'mdm'`.

## 2026-08-16 — a chave estrangeira ganha de onde escolher (bug_from_backend)

- **O check estava cego.** O `NS4_E8_PICKER_SOURCE` lia o alvo da FK do prefixo de `input.fieldRef`,
  que nomeia a entidade DONA do campo (`ChangeOrder.project`) — comparava a entidade do catálogo com
  ela mesma e nunca disparava. O alvo agora sai do grafo de relacionamentos
  (`helpers/ns4ForeignKeys.ts`, uma resolução para todos os consumidores). Input de use case vindo de
  jornada já nomeia o alvo direto (`Client.clientId`): as duas formas resolvem pelo mesmo helper.
- **O workspace ganha a consulta do pai.** Para todo input `selectedEntity` obrigatório cujo alvo o
  workspace não lê, entra um bffCall LOCAL sobre a operation de lista que o módulo já compila
  (`qry<Entidade>Picker`, mesma operationId, `outputKind` derivado do accessPattern) mais o organism
  `usage: 'picker'`. Operations são compartilhadas, calls são por workspace — o mesmo mecanismo dos
  tiles do hub.
- **O contrato diz de ONDE.** `Ns4E8BffCall.inputSources` liga input → call local, e o E9 emite isso
  como `sourceRef` no input do bffCall clássico. Sem ele o consumidor sabe que um id deve ser
  escolhido e não sabe de qual consulta — foi o que deixou 28 das 32 páginas do run cf3 com um campo
  de id digitável.
- Nada é inventado: sem leitura do pai no módulo, o registrar continua e o run segue.

## 2026-08-15 — a fiação do registro do hub e a doutrina no gate (bug_e8_5)

- **Tiles do hub são chamadas LOCAIS.** O item do catálogo passou a carregar a operation/call do
  workspace que ele lê (`sourceOperationId`/`sourceBffId`), e o hub ganha um bffCall próprio sobre a
  MESMA operation compartilhada. No formato clássico um organism consome chamada do PRÓPRIO
  workspace — "ler a query de outro workspace" nunca existiu.
- **A forma viaja junto com a chamada** (`sourceOutputKind`): o hub fia `qryListWorkTask` como
  `list`, não como `object` — uma lista lida como objeto projetaria um registro só, e nem o
  round-trip do formato clássico nem a igualdade de `operationId` pegariam isso.
- **Jornada é navegação.** Ações de jornada saem das sections e viram `navigation` do workspace
  (`prominence`/`order` da composição), que o E9 emite nas `navigationEdges` do siteMap. Nenhum
  organism novo de "link" foi criado — navegação continua morando no siteMap.
- **O hub derivado já é uma página inteira**: a ordem por score é a composição até uma LLM propor
  outra, então um módulo que não faz call de composição fia os tiles e alcança as jornadas do mesmo
  jeito.
- **Doutrina no desfecho.** `NS4_E8_ORGANISM_SOURCE`/`NS4_E8_ORGANISM_ACTION` detectam exatamente
  como antes e deixam de ser terminais: referência que resolve para uma query de outro workspace é
  auto-fiada, ação que resolve para jornada vira navegação, e o que não resolve para nada perde o
  organism com decisão registrada — o hub degrada, o run segue. Só permanece terminal o modelo que
  não renderiza. Cada reparo acha o próprio organism pela REFERÊNCIA, não pelo índice: o índice
  colhido na validação fica velho assim que o primeiro organism sai da seção.
- Verificado no modelo persistido do run 46 (o que matou o E8): 23 findings — 13 auto-fiados, 10
  migrados para navegação, 0 sem resolver, 0 remanescentes.

## 2026-08-14 — o modelo aprovado é artefato permanente

- `pipeline/` é estado de trabalho de UM run e é descartado depois; por isso o modelo de workspaces
  saiu de `pipeline/e8-workspace-model.draft.json` para `l4/{module}/workspace-model.defs.ts`, na
  raiz do módulo. O E9 e o E10 leem ele como contrato de registro — apagar o pipeline não perde nada
  além do rastro. A raiz é segura: os dois consumidores varrem por PASTA (`/workspaces`,
  `/operations`) e por nome exato na raiz, então o modelo nunca é confundido com um workspace.

## 2026-08-14 — swap: o E8 passa a ser o compilador ligado

- `agentNs4E8.ts` reescrito sobre `deriveNs4E8Model`; **o fan-out de workers de detalhe deixou de
  existir**. Uma única call de LLM (composição do hub) e persistência do modelo aprovado.
- Removidos com o caminho antigo: `deriveNs4E8Skeleton` e toda a derivação de skeleton/scenarios/
  slices, `gate.ts` de skeleton/detail, `dispatch.ts`, `prompt.md`, `promptWorkspace.md`, os schemas
  de apresentação e de worker de detalhe, e as fixtures run35-run43.
- `contracts.ts` ficou com o que o modelo novo usa (`Ns4E8Sources`, `deriveE8HubScore`,
  `Ns4WorkspaceContext`, `Ns4E8Edge`) mais os tipos congelados de compatibilidade de compilação.


## 2026-08-14 — Parte B: E8 compila os três tiers

- `model.ts` é o contrato do modelo de workspaces (tier, bffCalls, sections, operations, catálogo do
  hub) — a forma que o E9 vai transpor para o formato clássico sem tomar nenhuma decisão de tela.
- `tiers.ts` é o compilador determinístico: catálogo por entidade persistida (tier 1), workspace por
  jornada aprovada e não demovida (tier 2), hub da âncora dominante e projeções standalone (tier 3).
  Sem clustering, sem partição inventada. O menu lista LUGARES; jornada nunca é item de menu.
- `hubComposition.ts` é a única call de LLM com julgamento do E8: recebe o catálogo FECHADO e só
  ordena, promove, nomeia e agrupa. Resposta que inventa ou remove id é rejeitada; após o único
  reparo a ordem derivada vence com systemDecision registrada.
- `modelGate.ts` separa o que é referência quebrada (tipo A) do que é evidência sobre o produto
  (registrador tipo B via ns4Resolve). A origem de um registro sem consulta local é registrador.
- Fixture `run44-tier-model.json`: o módulo real do run 44 (E2 já no schema v5) compila inteiro —
  32 workspaces (16 catálogos, 12 jornadas, 3 projeções, 1 hub), 3 jornadas demovidas pelo E2,
  0 achados bloqueantes.


## 2026-08-14 — derived contexts, entity clustering and satellite affinity

- Contexts, the catalog, page contexts and selection contexts all come from
  `helpers/ns4Context.ts`; a contextId is a pure function of its entity.
- Clustering anchors on the step entity. An act/decide scenario of a satellite entity with a required
  `manyToOne` relationship to the hub is hosted by the hub workspace, so a scenario can no longer end
  up alone in a workspace with zero slices. A journey entered by notification keeps its own workspace
  for the actor it reaches.
- Hub selection keeps its dominance rule and falls back to the strict maximum of incoming required
  relationships, because entity-keyed contexts make raw scores flatter than declared ones were.
- Cross-journey edges come from `preferredFromJourneyRef` and from a handoff reaching the event-driven
  journey of its `targetProfile`, replacing the removed prerequisite declarations.
- `NS4_E8_SELECTION_SOURCE` became a recorder: derived provenance is evidence about the journeys, so
  it is resolved through `ns4Resolve` and never fails a run on content.

## 2026-08-13 — run 40 bounded selection repair

- Retarget an invalid selection source deterministically only when its ontology field identifies
  exactly one compatible frozen slice; ambiguous and missing candidates remain blocking.
- Await the deterministic finalizer inside the E8 failure boundary so terminal findings persist
  failed pipeline state instead of leaving the stage marked as running.

## 2026-08-13 — E8 URL-role boundary

- Versioned routed contexts and moved scenario-local selections out of `workspace.pageContext`.
- Derive hub/external path identities and local picker selections mechanically; reserve only viable
  focused-context ambiguity for the strict L1 presentation tool.
- Added one presentation repair followed by non-blocking `selection` fallback with an E8
  `systemDecision`, structural path/selection gates and route previews in the checkpoint widget.
- Added a reduced run 38 fixture covering Project path identity plus assignee/material selections,
  handoff and invalid-L1/default regressions, and the many-cardinality path blocker.

## 2026-08-12 — run 37 cold-start creation gate

- Restrict `NS4_E8_DECISION_WITHOUT_CONTEXT` to reviews, unknown form contracts and commands that
  explicitly declare `contexts.requires`.
- Allow a known context-free command, including the run's cold-start creation, to collect new values
  without inventing a record slice or page context, while preserving the blocker for context-dependent commands.
- Added the reduced run 37 fixture and positive/negative regression coverage.
- Reconciled `docs/flow.json` with the runtime v30 checkpoint so this compatible gate fix does not
  invalidate the failed run's resume authority.

## 2026-08-13 — automatic E8 compilation

- Removed the E8 clarification hook and workspace-review widget/CSS.
- Dispatch the gated skeleton directly to the existing bounded workspace-detail fan-out with
  `approvedBy=auto` in normal and `/fast` runs.
- Preserve duplicate-dispatch protection through the stable workspace-detail plan id.

## 2026-08-12 — run 36 duplicate approval dispatch

- Disable the E8 review controls synchronously on submit and re-enable them only when application
  fails.
- Treat an existing stable workspace-detail `planId` as an already dispatched approval, preventing
  a late or repeated callback from adding another fan-out and finalizer for the same review round.
- Added the reduced four-dispatch run 36 fixture and regression coverage.

## 2026-08-12 — run 36 cross-journey context edge

- Derive E8 candidate edges for exact E2 prerequisite handoffs when the prerequisite explicitly
  names `providesContext` and a provider step emits the same context consumed by the target step.
  Same-journey adjacency remains unchanged and no label/entity heuristic is used.

## 2026-08-12 — run 35 finalizer doctrine

- Changed `fieldsOnly` field projection from an unsatisfiable text-to-field blocker into one
  recorder decision per workspace and authority, without heuristic matching.
- Persist every validation round, including passes, and resolve remaining Type B/C findings through
  the shared resolver before reserving terminal failure for irrecoverable findings.
- Exclude platform entities from hub ranking by ownership/storage markers and warn on truly empty
  menu sections.

## 2026-08-12 — tool-call reader

- Accept the platform tool-call transport around the strict worker envelope as well as direct and
  legacy raw workspace artifacts.

## 2026-08-12 — worker envelope

- Workspace-detail fan-out now submits a strict `flexible` envelope so healthy workers do not
  transiently appear as failed before their result is consumed.

## 2026-08-11 — E8 v1

- Added derived workspace skeleton, human map checkpoint and bounded workspace-detail fan-out.
- Added deterministic gates for workspace partition, context, menu, queues, fields and disclosure.
- Added permanent typed workspace and workspace-index artifacts.
