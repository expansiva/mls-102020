# Notas de compressão — `creation2.ts`

Rodada de escrita: Fases 1.4/1.5 (compressão ao teto, e esta tabela).
**Reconciliado em 2026-08-24** com a rodada de conserto (E1, E2, E3, D1a, D2) — os
números e a lista de cortes abaixo descrevem o estado **atual** do arquivo, não o da Fase 4.

`creation.ts` → `creation2.ts`: **18.995 → 19.313 caracteres** (Δ +318).

O teto de 19.000 era **estimativa**, não medição — estouro de **+1,6%** aceito pela decisão **D4**
(nota de 24/08 na §2.4 do controle-mãe). O limite medido de verdade é o precedente dos **58 KB** de
prompt (`i3-edit`, 14/08).

A superfície nova da §3 do controle (3 slots + 3 atributos + 1 propriedade + 6 eventos, mais
`fit-height` e a uniformização do `sort-value`) foi paga com compressão de **forma** — nenhum aviso
que cita uma medição foi removido ou alterado no que afirma.

## Tabela por seção (`## <n>`), em caracteres

| Seção | Antes | Depois | Δ | O que mudou e por quê |
|---|---:|---:|---:|---|
| §12 Design Tokens | 2.223 | 1.121 | **−1.102** | Maior alavanca (§2.3 do controle): bloco quase idêntico nos 31 grupos. A lista de tokens virou uma linha inline `nome valor · nome valor`, sem a prosa de "purpose" por token (o nome já é autodescritivo); a explicação de `data-class` e das classes semânticas perdeu frases de transição. **Nenhum token, valor ou classe foi removido** — os 25 continuam presentes |
| §9 Pagination | 3.132 | 2.662 | **−470** | Frases de transição entre os dois modos e entre bullets encurtadas ("Then the molecule owns…" → "The molecule owns…"). Os dois avisos medidos (2026-08-05 e 2026-08-04, com os números exatos: 8 linhas / `page-size="5"` / 3 inalcançáveis; a ordem emite-antes-de-renderizar) ficaram **verbatim**; só a pontuação em volta encolheu |
| §2 Slot Tags (líquido) | 4.615 | 5.944 | **+1.329** | Seção que recebe a superfície nova: 3 slots na tabela, 1 nota de rodapé no lugar de repetir "see Row Actions…" 3×, a hierarquia com `RowActions`/`NewRecordRow`, e a subseção inteira **Row Actions & Draft Row** (regras de posição, vocabulário de `action`/`when`, coluna injetada, MODO×VALOR). **+350 em 24/08**: a razão técnica do controle escondido (E2) e a frase do `groupExpandContent` (D2), detalhadas abaixo. Pago em parte por remover a subseção "TableHead Attributes" (redundante — a mesma informação está na célula `TableHead` da tabela de slots) e por comprimir a prosa do "Detail Slot" (frases-ponte encurtadas, exemplo "AK Ana Silva…" removido) |
| §5 Events | 753 | 1.341 | **+588** | 6 eventos novos na tabela (`edit`/`save`/`cancel`/`delete`/`newRecord`/`rowAction`). Pago em parte cortando um dos dois exemplos de `dispatchEvent` (eram `sort` e `pageChange`, mesma forma — ficou só `sort`, com uma frase substituindo o segundo) |
| §3 Properties | 1.774 | 2.126 | **+352** | 2 propriedades novas (`editingRows`, `fitHeight`), descrições no mesmo estilo tabular das demais |
| §2.9 Live slots | 1.550 | 1.353 | **−197** | Cortada a duplicação do bloco `cellSortKey(cell, this.getLiveText(cell))`, idêntico ao de §7.1 — ficou o ponteiro. **Corrigido em 24/08 (E1)**: `RowAction` entrou na linha "LIVE, by ELEMENT" e `RowActions`/`NewRecordRow` foram para "structure" — ver abaixo |
| §11 Accessibility | 672 | 540 | **−132** | Tabela de 11 linhas virou parágrafo denso — nenhum requisito removido, só o formato |
| §13 Changelog | 221 | 341 | **+120** | Linha nova para o draft, apontando a origem (medição off `ml-inline-edit-table`) |
| §6 isEditing Propagation | 450 | 360 | **−90** | Frase de abertura mais direta; os 3 bullets originais intactos |
| §7 Sorting | 2.054 | 1.973 | **−81** | Frases de transição em 7.1/7.2 encurtadas. Os dois avisos medidos (comparação quebrada 3× em `R$ 1.234,50`; `sort-value`) ficaram **verbatim** |
| §1, §4, §8, §10 | — | — | 0 | Sem alteração de tamanho (§1 teve só `Version` 1.0.0 → 1.1.0) |

Soma das seções: **+317**. O `+1` restante está no cabeçalho, fora das seções.

## O que a rodada de conserto de 24/08 mudou aqui

| item | o quê |
|---|---|
| **E1** | §2.9 tinha a classificação de live slot **invertida**: `RowActions`/`NewRecordRow` (containers) estavam marcados como live-por-elemento, e `RowAction` (a ação individual) nem aparecia. Corrigido contra o código: `renderLiveSlotFrom` é chamado em `col.headEl` (l.1148), `actionEl` (l.1265, l.1395) e `cell` (l.1275, l.1372); `getLiveSlot` em `TableHeader` (l.266), `TableBody` (l.292), `NewRecordRow` (l.324) e `TableFooter` (l.1349) |
| **E2** | a palavra "disabled" estava errada — o `.less` real usa `.ml-table-action.ml-row-action-hidden { display: none; }` (l.160), não desabilitação. Trocada por "hidden", **com a razão** que só existia em comentário de código: tornar a âncora condicional devolveria o nó do consumidor à origem e o removeria/reinseriria a cada troca de modo — a família do defeito de âncora dupla |
| **D2** | a frase *"Not a general accordion. To expand arbitrary content that is not a record inside a table, the group is `groupExpandContent`."* tinha sido cortada do Detail Slot como "ponteiro de baixo valor". **Reavaliada e devolvida**: é a única regra do arquivo que diz o que **não** pertence a este grupo |

## O que NÃO foi comprimido (regra de ouro)

Todo aviso com "medido em"/"measured on" ficou **verbatim** no que afirma:

- `ml-lazy-record-detail-table`, 2026-08-05 — paginação interna esconde linhas (8 linhas, `page-size="5"`, 3 inalcançáveis)
- `ml-lazy-record-detail-table`, 2026-08-05 — slot `Detail` ausente do playground abre vazio
- `mls-102053/l2/demo/tabela-responsiva`, 2026-08-04 — reordenação local em modo externo carrega valor antigo
- as três reescritas quebradas de `R$ 1.234,50` (`1.234`, `1.2345`, `1`) que motivam o helper `tableSort`
- o defeito da âncora dupla no Detail Slot (duas âncoras, uma chave, a segunda rouba os nós)

## O que foi cortado por ser redundante (não por ser "porquê")

- Subseção "TableHead Attributes": duplicava a célula `TableHead` da tabela de slots
- Bloco `cellSortKey(…getLiveText…)` repetido em §2.9 (idêntico ao de §7.1)
- Um dos dois exemplos de `dispatchEvent` em §5 (mesma forma, `sort` e `pageChange`)
- Exemplo `"AK Ana Silva ana@…"` no Detail Slot (a regra da primeira célula composta ficou)
- Exemplos de data `01/12/2025` / `02/01/2026` em §9.2 (a regra ficou)
- Exemplos de sintaxe de `data-class` (`<component data-class="w-full mt-4">`, `<Label data-class="uppercase tracking-wide">`) — a regra ficou em §12, e o `usage2.ts` mantém um exemplo
- Frases avulsas: "Prefer it in demo and internal pages" (§9.1), "The fallback ensures…" e "Group-specific semantic classes…" (§12)
- Caminho do arquivo do controle na linha de changelog do draft

> ⚠️ **A frase "Not a general accordion → `groupExpandContent`" esteve nesta lista até 24/08 e saiu
> dela — foi devolvida ao arquivo (D2).**

## Decisões do controle aplicadas

- **§3.6(a) `fit-height`**: default do controle aplicado — subiu para o `creation2.ts` (§3.3, opcional,
  "1 de 12 hoje"), sem forçar as outras 11 moléculas. **Confirmado pelo Lucas em 24/08**: manter,
  "já temos um caso de uso rodando"
- **§3.6(d) `sort-value`**: uniformizado — aparece na linha `TableCell` da tabela de slots (§2), com
  ponteiro para §7.2, onde já vivia

## Limite conhecido desta verificação

O lint (`harness/lint-groupviewtable-contract.mjs`) **pega omissão, não engano**: o L3 checa presença
de nome. Os dois erros corrigidos em 24/08 (E1 e E2) passavam pelo lint sem alarme, porque os nomes
*existiam* no arquivo — só estavam ditos errado. Esta tabela e a revisão humana são o filtro; o lint é
a rede contra o que falta. Registrado na §9.1 do controle-mãe.

## Rodada D6 — 2026-08-24 (+174 caracteres)

Uma linha na §6 (isEditing Propagation): **"Never create an input."** O editor é o componente do
consumidor dentro da célula; a propagação é tudo o que a molécula faz, então uma `<TableCell>` de
texto puro **deve** mesmo não mostrar nada de novo.

Motivo: grepado em 24/08, a frase não existia em **nenhum** dos dois contratos. No `usage2.ts` o
D5(c) resolveu; aqui era um silêncio que uma molécula futura poderia preencher errado, criando o
próprio input. Fora do inventário fechado da §3 — entrou por decisão explícita do Lucas (D6).

Tamanho: **19.313 → 19.487** caracteres. Lint inalterado (L3 = 4); `tsc --noEmit` exit 0.

## Rodada D7 — 2026-08-25 (+846 caracteres)

Origem: o **achado C** do A2 repetido — a §6 falava só da propriedade global `isEditing`, e a
propagação de `is-editing` **por linha** não estava em contrato nenhum. Duas moléculas geradas do
mesmo texto: a de 24/08 propagou por linha (por conta própria), a de 25/08 propagou global — as duas
"conformes", só uma funcional. Detalhe em
conferido linha a linha contra a molécula de referência `ml-inline-edit-table`.

| edição | o quê |
|---|---|
| **§6 reescrita** | título passou a `is-editing Propagation — the unit is the ROW`. A unidade é a linha, carregando o modo daquela linha; o `isEditing` global é o **caso degenerado**. Acrescentados: o rascunho **sempre** em edição; propagar a cada mudança de modo (linha aberta por `edit`, chave entrando/saindo de `editing-rows`), não só quando `isEditing` vira; e o **guard de intenção**, com a medição de 2026-08-04 — marcar sem condição estampa `is-editing="false"` em toda célula e desfaz um consumidor que dirige o modo célula a célula, porque o `updated()` da tabela roda depois do binding da página |
| **ponteiro na seção de MODO** | *"Opening a row is only half of it: the open row's cells must receive `is-editing` (§6)…"* — conserta o erro de desenho do D6, que pôs uma regra de propagação numa seção que só conhecia o modo global |

A linha do **D6** ficou, reancorada na linha: *"a plain-text `<TableCell>` is expected to show nothing
new **when its row opens**"*.

⛔ **Deliberadamente fora:** o `(child as any).requestUpdate?.()` da `ml-inline-edit-table`. É remendo
do bug do converter Boolean do `@propertyDataSource`, já corrigido no
`mls-102029/l2/collabDecorators.ts` pelo guard `hasUpdated` (l.184 e l.200, conferido em 25/08).

Tamanho: **19.487 → 20.333** caracteres (+7,0% sobre a estimativa de 19.000 — coberto pelo D4; o
limite medido é o precedente dos 58 KB de prompt). Lint inalterado (L3 = 4); `tsc --noEmit` exit 0.

## Rodada D9 — 2026-08-25 (+352 caracteres)

Uma nota na §2.9, do bug que fez a 3ª molécula gerada não renderizar nada: ela lia os filhos de slot
comparando `tagName` contra `'TABLE-ROW'`, `'TABLE-HEAD'`, `'TABLE-CELL'`. **No DOM `<TableRow>` é
`TABLEROW`** — nenhum hífen é inserido —, então as três comparações não casavam com nada, em silêncio,
e `bodyRows()`/`headerHeads()`/`rowCells()` devolviam sempre `[]`: cabeçalho sem colunas e `<tbody>` no
ramo `Empty`.

Prova no `mls-102033/l2/moleculeBase.ts`: `_findSlotChild` faz `tagName === tag.toUpperCase()`, e é
assim que as 6 moléculas migradas encontram `TableBody` hoje.

A nota prescreve o idioma **e** diz por que o outro falha: `row.querySelectorAll(':scope > TableCell')`,
que é seletor de tipo e portanto insensível a caixa aqui. A §2.9 já mostrava esse idioma na tabela e
omitia a armadilha; as duas moléculas geradas antes desta usavam o seletor e funcionavam.

**A correção durável é mecânica, não prosa:** um gate no `n4-render` recusando `tagName === '…-…'`
comparado contra nome de slot pega isto sempre. Fica como frente própria — é gate de outro step.

