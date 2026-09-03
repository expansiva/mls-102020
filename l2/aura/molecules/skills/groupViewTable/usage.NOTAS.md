# Notas de compressão — `usage2.ts`

Rodada de escrita: Fases 2.6/2.7 (compressão ao teto, e esta tabela).
**Reconciliado em 2026-08-24** com a rodada de conserto (E1, E2, E3, D1a, D2) — os
números e a lista de cortes abaixo descrevem o estado **atual** do arquivo, não o da Fase 4.

`usage.ts` → `usage2.ts`: **8.967 → 9.248 caracteres** (Δ +281).

O teto de 9.000 era **estimativa**, não medição — estouro de **+2,8%** aceito pela decisão **D4**
(nota de 24/08 na §2.4 do controle-mãe). O limite medido de verdade é o precedente dos **58 KB** de
prompt (`i3-edit`, 14/08).

A receita **MODO × VALOR** e a ponte `rowActions[]` (o coração desta rodada, §4 do controle) e a
superfície nova (3 slots + 3 atributos + 1 propriedade + 6 eventos) foram pagas comprimindo o bloco
de tokens/`data-class` — a alavanca da §2.3 do controle, quase idêntico nos 31 grupos — e encolhendo
a prosa dos exemplos existentes.

## Tabela por seção, em caracteres

| Seção | Antes | Depois | Δ | O que mudou e por quê |
|---|---:|---:|---:|---|
| **Row actions & the draft row — MODE × VALUE** (nova) | — | 1.954 | **+1.954** | A receita **MODO × VALOR** (§4.3 do controle) em tabela de 2 colunas, no mesmo molde da tabela INTERNAL×EXTERNAL que o arquivo já tinha; o vocabulário de `action`/`when`; a coluna injetada; a linha rascunho; e a **ponte `rowActions[]` → `action`** (§4.4), com o mapeamento explícito e a rota genérica. Único conteúdo do arquivo sem equivalente no `usage.ts` original |
| Examples | 3.053 | 1.890 | **−1.163** | Frases de transição encurtadas nos 3 exemplos; o primeiro perdeu 2 das 4 colunas (menos ruído, mesma lição de ordenação); o exemplo do `sort-value` ficou com 1 linha de código em vez de 3 (a regra sobre datas e rótulos ficou na prosa ao lado); o exemplo de `Detail` foi enxugado para o mínimo que ainda cita a tag real (`groupviewtable--ml-lazy-record-detail-table`, exigida pela correção §3.6c). **+19 em 24/08**: "as a direct child" devolvido (E3) |
| **Customization via data-class** + **Design Tokens** → **Customization** | 421 + 1.449 = 1.870 | 829 | **−1.041** | Alavanca da §2.3: as duas seções finais viraram uma só. A tabela de tokens de 3 colunas virou uma linha inline `nome valor · nome valor`, **sem a coluna "Purpose"** (o nome já é autodescritivo), e o exemplo `.my-container { … }` virou um trecho inline. **Os 19 tokens do `usage.ts` estão todos presentes, com os mesmos valores** |
| Events | 503 | 1.039 | **+536** | 6 eventos novos (`edit`/`save`/`cancel`/`delete`/`newRecord`/`rowAction`), descrições encurtadas ao máximo ("Optional." + 1 frase) |
| Slot Tags | 889 | 1.079 | **+190** | 3 slots novos (`RowActions`/`RowAction`/`NewRecordRow`); `TableRow` ganhou a nota de `key`; descrições existentes tiveram palavras de transição cortadas |
| Properties | 2.285 | 2.101 | **−184** | 2 linhas novas (`editing-rows`, `fit-height`) pagas cortando palavras de transição nas linhas existentes (`value`, `error`, `selectable`, `page`) e no parágrafo "Do not mix them" — **nenhuma regra de paginação foi alterada** |

Soma das seções: **+292**. Os **−11** restantes estão no cabeçalho, reescrito para anunciar a
superfície opcional de CRUD.

## O que a rodada de conserto de 24/08 mudou aqui

| item | o quê |
|---|---|
| **D1(a)** | A compressão da Fase 4 tinha encurtado a lista de tokens de **19 para 12**. Sete foram **devolvidos**: `--ml-surface-dim`, `--ml-on-surface-faint`, `--ml-on-primary`, `--ml-on-error`, `--ml-outline-error`, `--ml-shadow-1`, `--ml-font-weight-medium`. **Revert puro** — a mesma lista boilerplate dos outros 30 grupos, sem "melhorar" o conteúdo |
| **E3** | "as a direct child" tinha caído da instrução do `<Detail>` durante a compressão — devolvido |

### Por que os 7 voltaram — a razão está medida

`genCfePageGenome.ts:147`: um efeito só é "coberto" — e portanto **proibido** de virar classe no slot
tag — quando **(1) a tabela de tokens do USAGE skill tem um token para ele** E (2) o módulo de tokens
do DS o reconcilia. Se qualquer um falhar, estilizar no slot tag **é permitido**.

Ou seja, a tabela é **lista autoritativa** para o agente de página, não material de leitura. Com a
lista curta, a condição (1) falharia para 6 efeitos **realmente consumidos** pelas moléculas deste
grupo (fundo de hover, placeholder, contorno de erro, sombra, peso de fonte, on-primary) e o agente
passaria a pôr classe no slot tag — duplicando e brigando com o tema que o token já aplica.

## O que NÃO foi comprimido

- A tabela INTERNAL × EXTERNAL e o aviso "Do not mix them" — é o molde que a receita MODO × VALOR
  copia (§4.2 do controle: "não invente formato novo")
- O aviso `label`, não `title` (`title` é atributo global do HTML e vira tooltip)
- A regra "Numbers already formatted in pt-BR/en-US sort fine… (`R$ 1.234,50` reads as 1234.5)"
- A nota de que `rowClick` não seleciona sozinho — a seleção é prop controlada

## Micro-diferenças conhecidas, registradas

- `--ml-font-family` aparece como `system-ui`, e no `usage.ts` original era `system-ui, sans-serif`
  (a pilha de fallback encolheu). **Não corrigido** — fica registrado para a análise própria de tokens
- Valores equivalentes escritos em forma curta: `#fff` por `#ffffff`, `rgba(0,0,0,.1)` por
  `rgba(0,0,0,0.1)`, `rgba(59,130,246,.4)` por `rgba(59,130,246,0.4)`
- Dos exemplos de `sort-value`, ficou o de moeda; os de **data** e de **rótulo de status** saíram (a
  regra que os motiva continua na prosa). O exemplo en-US `$1,234.50` também saiu, o pt-BR ficou
- No primeiro exemplo, a coluna `status` — a única `TableHead` **sem** `sortable` do arquivo — saiu junto

## Correções do controle aplicadas

- **§3.6(b) tabela de propriedades quebrada**: as linhas de `disabled`/`loading`/`fit-height` (que no
  `usage.ts` original caíam **depois** da seção "Pagination and sorting", fora da tabela) estão agora
  **dentro** da tabela de Properties, com as demais
- **§3.6(c) as 2 tags de exemplo inválidas**: `molecules--data-table-102020` →
  `groupviewtable--ml-data-table`; `molecules--lazy-record-detail-table-102020` →
  `groupviewtable--ml-lazy-record-detail-table`. Conferido: a superfície de cada exemplo (`Caption`,
  `TableHeader`, `TableRow`, `TableHead`, `TableCell`, `Empty`, `Detail`) é declarada pela
  molécula-alvo correspondente

## Itens do inventário fechado (§3) presentes neste arquivo

3 slots (`RowActions`, `RowAction`, `NewRecordRow`) · 3 atributos (`action`, `when`, `key` em
`TableRow`) · 1 propriedade (`editing-rows`) · 6 eventos (`edit`, `save`, `cancel`, `delete`,
`newRecord`, `rowAction`) · `fit-height` (§3.6a — manter, confirmado pelo Lucas em 24/08) ·
`sort-value` já uniformizado (estava correto no `usage.ts` original, mantido).

## Limite conhecido desta verificação

O lint **pega omissão, não engano** — o L1/L2 checam existência de tag e de slot, não se a prosa está
certa. Esta tabela e a revisão humana são o filtro. Registrado na §9.1 do controle-mãe.

## Rodada D5 — 2026-08-24 (patch do exemplo, +542 caracteres)

Aplicada depois dos **2 defeitos** que o teste A2 achou no playground gerado — os dois nascidos deste
mesmo exemplo de 4 linhas, medidos no playground e no índice do grupo gerados pelo teste.

| edição | o quê | por quê |
|---|---|---|
| **D5(a)** exemplo refeito | a célula passou a conter `groupentertext--ml-enter-text` (componente de entrada **real**, o mesmo que a página de aceite `funcionariosedicao2` usa), e as **quatro** ações aparecem juntas (`edit`·`delete`·`save`·`cancel`) | o gerador **imita a forma** antes de obedecer à prosa: com `edit`+`save` e sem `cancel`, ele produziu linhas sem volta; com texto puro na célula, produziu linhas que não mostram campo nenhum |
| **D5(b)** cláusula da volta | *"A row offering `edit` MUST also offer `save` and `cancel`"* + a razão (a inferência do `when` esconde `edit`/`delete` durante a edição) | a tabela de vocabulário explicava a inferência, mas **não fechava a consequência**: sem o par, `edit` é um beco sem saída |
| **D5(c)** regra do editor | *"the editor is yours — the molecule never creates an input"* | o que existia era oblíquo ("text or web components", "propagates to web components"). Nunca a frase que faltava |

Tamanho: **9.248 → 9.790** caracteres (+542; a estimativa era ~455, e a diferença é a razão técnica
das duas cláusulas, não prosa nova). **+8,8%** sobre a estimativa de 9.000 — estouro coberto pela
decisão D4 (o teto era estimativa; o limite medido é o precedente dos **58 KB** de prompt).

Aceite: L1 **0 inválidas de 3** citadas (a tag nova passa) · L2 **0** · L3 **4** (as mesmas de fora do
inventário) · `tsc --noEmit` exit 0 · parse do template literal ok.

> Dois falsos positivos do **lint** vieram à luz com este exemplo, e foram consertados no
> `harness/lint-groupviewtable-contract.mjs` (não no contrato): o L2 resolvia a molécula sempre na
> pasta do grupo sob lint (e `ml-enter-text` vive em `groupentertext/`), e atribuía os slots do bloco
> à primeira tag custom **mesmo quando ela aparece depois dos slots** — num fragmento sem tag
> hospedeira, a molécula aninhada virava "dona" dos slots ao redor dela.

## Rodada D8 — 2026-08-25 (+280 caracteres)

Origem: o **achado D** do A2 repetido — o `demo-acoes` gerado trazia `editing-rows` no host **e**
`<RowActions>` nas linhas. A receita MODO × VALOR apresentava as duas rotas como alternativas, mas
nunca dizia que são exclusivas numa mesma instância; a receita irmã (INTERNAL × EXTERNAL) tem o aviso
de "não misture". Consequência medida: com o atributo presente, `currentOpen()` lê o modo dele, então
o clique em "Editar" só emite e a linha nunca abre — cenário de CRUD inerte.

| edição | o quê |
|---|---|
| **cláusula de exclusividade** | *"**Pick ONE per instance.** `editing-rows` and `<RowAction action="edit">` in the same table do not add up…"*, logo depois da tabela MODO × VALOR |
| **linha do `is-editing`** | de *"to web components inside cells"* para *"inside the cells of **each editing row** (the whole table when set)"* — a metade voltada ao consumidor do achado C: quem escreve a página precisa saber que o editor recebe o modo **por linha** |

Tamanho: **9.790 → 10.070** caracteres (+11,9% sobre a estimativa de 9.000 — coberto pelo D4). Lint:
L1 **0 inválidas de 3** · L2 **0** · L3 4; `tsc --noEmit` exit 0; parse do template literal ok.

