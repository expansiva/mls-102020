# CHANGELOG — i5-playground

## 2026-08-18 — rota E: regenerar o playground, porque nenhuma rota existente podia

Pediram *"o playground não foi gerado"* numa molécula cujo `.html` havia sido substituído por
`<h1>teste</h1>`. O run morreu no `i3-edit`, duas tentativas, com o modelo dizendo a verdade: *"o html e o
groupIndex não foram incluídos, não consigo fazer edições pontuais"*.

**Nenhuma rota estava errada — todas eram inadequadas.** O triage respondeu **B** com
`expectedArtifacts: ['html','groupIndex']`, leitura correta do pedido: nada da superfície se move. Mas B
roda o editor, e o editor escreve `defs`, `ts` e `less`. O pedido nomeava só artefatos que nenhum passo do
ramo escreve.

### A distinção que a rota nova carrega

**Derivado × autorado.** O playground e o índice do grupo são **derivados**: dada a superfície da
molécula existe forma correta, e é justamente por isso que o `i5` e o `i6` conseguem produzi-los do zero.
O `.defs.ts`, o `.ts` e o `.less` são **autorados** — regenerá-los descartaria decisões que ninguém
recupera. É o mesmo argumento que manteve a rota A como edição no lugar, e não reconstrução.

Por isso o `.less` ficou **fora** da rota E, de propósito: *"atualize o `.less`"* é rota B, edição
pontual, e criar um que falta já funciona lá.

### A precondição, que é o que impede o botão de destruir demo boa

`playgroundIntegrityIssues(html, tag)` — pura, extraída das invariantes que este gate já cobrava: página
vazia, sem a tag da molécula, sem o widget de estado, documento HTML completo, ou slot como atributo.

**O pedido não decide; a medição decide.** Um playground carrega exemplos autorados, então reescrever um
saudável joga trabalho fora. Página íntegra → o run termina dizendo isso **antes de gastar chamada de
modelo**. Pinado com a página do experimento: `<h1>teste</h1>` acusa duas razões, a página real acusa zero.

O prompt recebe `{{regenerate}}` com **os motivos medidos**, em vez de "escreva de novo". O `i5` já sabia
criar (`op: "create"`, `IM_CREATABLE_ARTIFACTS` inclui `html`), então o caminho veio de graça — e é
exatamente o caminho latente que o registro do slot-como-atributo apontava como nunca exercitado.

### Limitação registrada

A rota E entra pelo `i5`. Um pedido **só sobre o índice** regenera o playground primeiro, e se ele estiver
íntegro o run termina sem tocar no índice. Uma segunda entrada pelo `i6` não foi construída; está anotada
no `flow.json` como a forma a acrescentar se pedidos só-de-índice se mostrarem comuns.

## 2026-08-18 — slot como atributo: a convenção errada estava instruída, abençoada e pinada por teste

`<div slot="Label">` **não faz nada nesta biblioteca.** Não há Shadow DOM: `moleculeBase.getSlotContent(tag)`
é `getSnapshot().querySelector(tag)`, e o MutationObserver compara `tagName` contra `slotTags`. A
marcação renderiza, não quebra, e o slot fica vazio.

**Medido.** Duas moléculas geradas em dias e grupos diferentes saíram com **68 ocorrências** da forma de
atributo e **zero** tags nomeadas. Nos 671 índices e playgrounds dos seis projetos, essas duas são as
**únicas** — as outras **22.903** usos são tag nomeada. Os 31 contratos de grupo têm zero. **A fonte de
verdade estava certa; os agentes divergiram dela.**

### Três camadas, e a terceira é a que fazia o defeito atravessar gerações

1. **a instrução** — `n6-demo/prompt.md` dava `<div slot="Label">Revenue</div>` como exemplo, afirmativo.
   O `i5-playground/prompt.md` do IM2 oferecia as duas formas **com a errada primeiro**;
2. **a verificação** — `slotIsExercised`, que decide se uma página exercita um slot, **aceitava**
   `slot="X"`, com essa alternativa listada primeiro e o comentário dizendo que as duas valiam. Ou seja:
   nenhum gate dos dois agentes podia pegar o defeito. No `i5` uma página errada passava; no `i6` um card
   errado contava como exercitado;
3. **os testes** — as fixtures de três gates usavam `<div slot=>` como forma **esperada**, e uma asserção
   fixava `slotIsExercised('<div slot="Detail">x</div>')` como `true`. Quem consertasse o prompt quebraria
   os testes, olharia os testes e concluiria que o prompt estava certo.

### A origem, e ela é um padrão conhecido deste projeto

`slot="name"` é a prática padrão de web components **com** Shadow DOM — e esta biblioteca não usa, o que é
a primeira regra do `CLAUDE.md`. Mesma forma do sentinela `nothing` que reapareceu em cinco gerações:
hábito de plataforma chegando numa base que não o usa. A diferença é que aqui ele entrou na **ferramenta
que gera**, então se replicava a cada molécula nova.

### O conserto, nas quatro camadas

- **`slotIsExercised` só aceita a tag** — é a peça central, porque é ela que tornava qualquer detector
  cego. Medido antes de estreitar: **nenhum** índice de grupo usa a forma de atributo, então o
  estreitamento não muda nada do que existe — só acusa os dois arquivos defeituosos;
- **`findAttributeSlots`**, no gate do `n6-demo`, e reusado pelo gate do `i5` (mesma direção de
  dependência que o IM2 já usa para o `n4-render`). Código `slot_as_attribute` nos dois;
- **no `i5` vale a regra do delta**: só o que a edição introduziu é erro. Página que já carregava a forma
  errada não bloqueia um conserto que ninguém pediu ali;
- **as duas linhas de prompt**, agora dizendo o porquê — "renderiza vazio" — e não só o quê.

Verificado contra os arquivos reais: recusa a `ml-copy-button` e a `ml-kpi-indicator` (as duas geradas),
aprova a `ml-combobox` — que o próprio `i5` escreveu certo — e a biblioteca.

### Por que o `i5` acertou e o gerador errou

Com a **mesma** instrução ambígua. O `i5` **editava** um playground que já mostrava a convenção certa e
seguiu o arquivo; o gerador cria do zero e não tem o que imitar. **Uma instrução ambígua só produz defeito
onde não há exemplo para copiar** — e o `i5` pode criar playground do zero, caminho que nunca foi
exercitado. Era latente, e agora tem gate.

## 2026-08-06 — first version

- **The staleness decision is deterministic and the model is skipped entirely when it says no.**
  flow.json asked for "a no-op that says so"; making it a no-*call* rather than a no-op answer is
  what keeps the common improve run (a colour, a spacing) at zero LLM cost for this step.
- `surface.ts` moved from `steps/i2-triage/` to `helpers/imSurface.ts` when this step became its
  second consumer — agentsBestPractices §2 makes `helpers/` mandatory at exactly that point. Added
  `diffSurface` there rather than here for the same reason.
- `slotIsExercised` also moved to `helpers/`, after i6-index needed it. Deliberate: i5 asks it of
  the playground and i6 of the group index, and **the two must agree**. 2026-08-05 was the
  playground being fixed and the index left behind; two subtly different readings of "exercised" is
  how that recurs.
- Reuses `applyEdits` from i3 instead of regenerating the page like `n6-demo` does. n6-demo is
  creating a page; here someone wrote the examples and a developer relies on them.
- Nothing is written before the gate passes, so no rollback is needed — unlike i3, which must
  compile the file to judge it and therefore has to write first.
