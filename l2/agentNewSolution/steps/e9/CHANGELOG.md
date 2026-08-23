# E9 changelog

## 2026-08-21 — o bloco `mdm` atravessa para o formato clássico

`Ns4ClassicOperation` ganha `mdm?` opcional, copiado verbatim do modelo quando a operação é de
catálogo de dado mestre. É o que permite ao gerador de backend rotear `cmdInactivate`/`cmdReactivate`
para a fachada de ciclo de vida do MDM e honrar a list active-only.

Diferente de `pagination` — emitido deliberadamente como `none` porque o módulo nunca projeta meta de
página — este filtro é real e **precisa** sobreviver até o consumidor. O campo é opcional, então
consumidor que o ignora não muda de comportamento: `classic.test.ts` prova isso rodando os parsers
PRÓPRIOS do agentChangeBackend e do agentChangeFrontend sobre a emissão nova.

## 2026-08-14 — Parte C: transpilador do formato clássico

- `classic.ts` transpõe o modelo aprovado do E8 para o formato clássico: `workspaces/*.defs.ts`,
  `operations/*.defs.ts`, `contracts/<ws>--<bff>.defs.ts` e `siteMap.defs.ts`. Zero decisão de tela.
- O caminho `"<operationId>.<inputId>"` é a única coisa que precisa estar exata: os DOIS consumidores
  rastreiam a origem de um input e a união literal de um campo por ele.
- A origem que a tela renderiza sai em `operations[].inputs[].source`, no vocabulário de fronteira
  do cliente (`userInput`/`selectedEntity`/`routeParam` renderizam; o resto é resolvido em runtime).
- Uma call carrega no máximo uma coleção; composição é várias calls na mesma página.
- Paginação sai declarada como `none` enquanto nenhuma call projetar o meta da página — declarar uma
  forma que o módulo não emite só faria o contrato mentir sobre si mesmo.
- `classic.test.ts` roda os PARSERS DOS PRÓPRIOS CONSUMIDORES sobre a emissão
  (`parseWorkspaceDefs` e `resolveBffProjection` do 102021; `parseWorkspaceBffCalls`,
  `bffCallCommandShape`, `parseWorkspaceSections` e `frontendOutputShapeForOperation` do CFE).
- `ns4Fs.ts` ganhou os caminhos e escritores de `operations/`, `siteMap.defs.ts`, contrato clássico
  e o rascunho do modelo do E8.


## 2026-08-14 — notifications compile from the handoff itself

- A notification is compiled from the handoff `targetProfile` and the sending step entity instead of
  matching declared context names between an event-driven journey and its provider. Delivery remains
  a notification and never a navigation edge; deep links are still validated through `routeOf`.


## 2026-08-13 — run 40 shared identifier field

- Route-selection validation now uses context identity as its authority.
- A selection context may share an `idFieldRef` such as `projectId` with a legitimate routed page
  context without being falsely reported as part of the URL.
- Unique, unowned selection-field segments and selection context ids in `pathContextIds` remain
  blocking findings.

## 2026-08-13

- Added the deterministic E9 navigation compiler and structural gate.
- Added canonical route, tab-scoped store, notification and typed BFF contract artifacts.
- Added E3 access realization by compiled operation.
- Added source-hash propagation and timestamp-free idempotent output.
- Added Run 38, orphan-context, synthetic notification, field-contract and rerun fixtures/tests.
- Integrated E9 into the NS4 pipeline; structural failures repair through E8 and successful completion unlocks E10.
