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
