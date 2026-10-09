## 2026-10-08 — groupViewData: o calendário lê a data da `<Row date>`

A `ml-calendar-view` achava um evento procurando `AAAA-MM-DD` no texto de cada `<Cell>`. Essa convenção não estava
escrita em lugar nenhum, e o `field` das `<Column>` era ignorado.

Nas páginas consultas e agenda_diaria do agendaClinica, geradas pelo agentMaterializeL2v4, as células mostravam a data
como a pessoa lê (`07/10/2026 17:00`, ou só `17:00`). Nenhum chip era desenhado e não havia nada para clicar. O clique no
dia vazio dava `index: -1`, que a página não tratava.

**Na molécula** (`mls-102040/l2/molecules/groupviewdata/ml-calendar-view.ts`):
- a `<Row>` diz quando acontece no atributo `date` (ISO 8601, data ou data-hora), e o texto das células fica só como
  texto;
- o chip mostra o atributo `title` da `<Row>`, ou o texto das células;
- as linhas são relidas a cada render, e não só quando `loading` muda, então `?selected` e linhas novas aparecem;
- sem `date`, a busca antiga no texto continua, para não quebrar páginas antigas.

As regras puras ficam em `calendarViewLogic.ts`, com teste. Só ISO 8601 é aceito: o `new Date('07/10/2026 17:00')` do
JavaScript lê esse texto como 10 de julho.

**Na skill:** a seção *Calendar*, os atributos `date` e `title` na tabela de slots e o aviso sobre `index: -1`.

**Nos `.defs.ts`** do 102040, que também vão para a LLM, a descrição foi alinhada ao código, apesar do cabeçalho "Do not
change". Uma descrição errada da molécula é pior que uma descrição editada à mão (decisão do Guilherme, 08/10):
- `ml-calendar-view.defs.ts`: a `date` da `<Row>`, o `title`, a releitura a cada render e o `index -1` do dia vazio;
- `ml-vertical-record-list.defs.ts`: sem `selectable`, o destaque segue o `selected` de cada `<Row>` (a correção de 07/10).

Se esses `.defs.ts` forem regerados, estas frases precisam voltar.

## 2026-10-07 — groupViewData: `selectable` é seleção múltipla

A tabela de propriedades dizia só *"`selectable` — Enables row/item selection"*, e o exemplo misturava `.selectable` com
`<Row selected>`. A página de atendimento do comandaRestaurante, gerada pelo agentMaterializeL2v4, usou
`.selectable=${true}` com `<Row ?selected=${row.id === this.selectedComanda}>` para destacar a comanda aberta. Na
`ml-card-grid`, `selectable` alterna cada item clicado num conjunto interno, e esse conjunto passa a valer mais que o
atributo das `<Row>`. Por isso todas as comandas clicadas antes continuavam destacadas.

A skill agora diz que `selectable` é seleção múltipla mantida pela molécula. O exemplo foi separado em dois:
- **um registro selecionado**: sem `selectable`; a página trata `row-click` e marca a linha com `?selected`;
- **várias linhas**: com `selectable` e `selection-change`.

A `ml-vertical-record-list` lia `Row selected` só na primeira exibição, então nela o destaque não acompanhava a seleção
da página. Isso foi corrigido na molécula (`mls-102040/l2/molecules/groupviewdata/ml-vertical-record-list.ts`) e não
virou exceção na skill: sem `selectable`, ela agora lê o atributo a cada render, como a `ml-card-grid`.

## 2026-10-06 — groupViewData: `<Column header>` não pode ser vazio

O exemplo "Rich cell content" do `usage.ts` ensinava `<Column field="actions" header="" …>` numa `ml-vertical-record-list`, e essa molécula recusa coluna sem `header` (`missingColumnHeader`). A página de atendimento do comandaRestaurante, gerada pelo agentMaterializeL2v4, copiou o padrão em duas colunas e quebrou a busca.
O exemplo agora usa `header="Actions"`. A tabela de slots diz que `field` e `header` são atributos simples, sem `.header`, e não podem ser vazios.
Das moléculas do grupo, só a `ml-vertical-record-list` valida; as outras aceitam vazio. O exemplo com texto funciona para todas.

## 2026-09-11 — `adopt.ts`: a segunda metade escrita à mão de cada grupo

O `usage.ts` já tinha estabelecido que a metade escrita à mão do catálogo mora aqui, e não nos
`.defs.ts` do 102040 ("Do not change"). O editor in-place agora troca um controle cru pela molécula
do grupo (TASK-102020-adopt-molecules), e essa conversão é conhecimento do GRUPO — que `@click` vira
`@action` não é convenção, é o que estas moléculas disparam. Então cada grupo ganha um irmão do
`usage.ts`:

    skills/<grupo>/adopt.ts  →  candidate(shape) e convert(shape, cand, target), puros

Nesta fase existem dois (`groupTriggerAction`, `groupEnterText`). O studio DESCOBRE quais grupos têm
o arquivo lendo o `mls.stor` — não há lista para manter em sincronia, e um grupo novo é um arquivo
novo aqui e nada mais.

Duas regras que valem para todo `adopt.ts` novo, e que os testes guardam: a tag escrita é
`catalog.tag` **verbatim** (derivada por convenção ela nomeia um elemento que nunca renderiza, e a
falha é muda), e atributo que a tabela não conhece **recusa** a conversão nomeando o atributo — nunca
descarta em silêncio.


## 2026-07-31 — §9 reescrita: `nothing` (e por que ela sozinha NÃO resolve)

A §9 era um cabeçalho de PROIBIÇÃO ("Do NOT return `nothing` directly...") com a "Solution 1"
truncada, sem exemplo, sem Solution 2, e **sem uma palavra sobre posição de atributo** — que é
justamente onde o modelo precisava dela. Reescrita: abre com a linha de import completa, trata
ATRIBUTO primeiro (3 exemplos reais da biblioteca), e dá as duas formas aceitas em posição de retorno
com a contagem real (`return html``` em 116 moléculas; `TemplateResult | typeof nothing` em 14).

**Resultado do teste no Studio: a reescrita NÃO impediu a invenção.** O modelo gerou
`function nothingAttr(): undefined { return undefined; }` mesmo com a §9 dizendo "NEVER build your own
sentinel". Medição que explica por quê isso não é problema de prompt: o fluxo ANTIGO produziu a mesma
invenção e ela está EM PRODUÇÃO —

- `ml-number-range-slider.ts:917` → `function nothingAttr(): string { return ''; }`
- `ml-number-interval-inputs.ts:664` → `function nothingAttr(): any { return undefined; }`

São as **duas únicas** funções top-level de 231 moléculas, e as duas são o defeito. Cinco gerações,
três prompts diferentes, dois fluxos: `null`, `undefined`, `''`, `any`, e `require('lit')`. As quatro
primeiras COMPILAM e todas renderizam `attr=""` em vez de omitir o atributo.

Por isso a §9 fica (melhora a chance na primeira tentativa e agora está correta), mas quem garante é o
gate `helper_outside_class` do n4-render. Instrução não é mecanismo.
