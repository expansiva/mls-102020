# CHANGELOG — i5-playground

## 2026-08-18 (tarde) — a rota E regenerou, e a página não servia: o prompt é de EMENDA

Primeiro run da rota E, com o `.html` substituído por `<h1>teste</h1>`. Roteou E, regenerou, terminou.
E a página saiu assim, medida contra a referência da biblioteca:

| | referência (`ml-button-standard`) | o que a rota E escreveu |
|---|---|---|
| tamanho | 21.096 bytes, 262 linhas | **2.131 bytes**, 52 linhas |
| instâncias da molécula | 12 | **4** |
| chaves de exemplo | 6 | **4** |
| `<header>` / Tailwind | 1 / 35 classes | **0 / 0** |
| widget de estado | `<aura--molecules--playground--widget-playground-state-102020>` | **`<widget-playground-state-102020>`** |
| estado | real, montado por código | **nenhum** — 20 bindings vivos sem nada atrás |

**A causa é o prompt, não o modelo.** Este passo é escrito para **emendar**: *"you are adding to it, not
replacing it"*, *"the state widget stays where it is"*, *"do not restyle, renumber or reorder"*. A rota E
lhe entrega um trabalho de **criação**, e o bloco `{{regenerate}}` que eu acrescentei disputava com
quarenta linhas dizendo o contrário. O modelo obedeceu à maioria.

E o contrato de criação **já existia**: `skills/playgroundGenerator`, 10.7KB, injetado pelo `n6-demo` e
pelo `v5-demo`, com a tag registrada 7 vezes e o token do estado 3. O `i5` não o injetava.

### O conserto, sem duplicar contrato

1. **o skill entra — só na regeneração.** Na emenda o próprio arquivo ensina a convenção, que é a lição
   medida do defeito do `<div slot=`: a instrução ambígua só errou onde não havia arquivo para imitar. E
   injetar 10.7KB em todo run empurraria o prompt de emenda (que já carrega uma página de até 21KB) para
   o tamanho que fez o `i3` falhar com `Failed to fetch`;
2. **o estado vem por código.** O modelo devolve `examples[]` e escreve o token literal; o
   `substituteDemoState` — o mesmo helper do `n6` — monta o estado real depois do gate. Um objeto de
   estado escrito à mão é descartado em silêncio, e é por isso que o `n6` nunca deixou o modelo escrevê-lo;
3. **`regeneratedPageIssues`** — a metade cobrável do contrato: widget com a tag registrada, token
   presente, **≥6 cenários**, uma instância por cenário, e as duas checagens de binding morto extraídas
   do gate do `n6` (`demoStateIssues`, agora compartilhada em vez de copiada);
4. **`op: create` sobrescreve**, e só aqui. O `applyEdits` recebe do CHAMADOR quais artefatos podem ser
   sobrescritos; o `i5` passa `['html']` depois de a precondição ter medido a página como quebrada, e o
   `i3` não passa nada. A primeira tentativa inteira do primeiro run se perdeu em *"the file already
   exists — use replace or append, never create"*, que a minha própria instrução mandava fazer.

### Por que nenhum check pegou

Todos os checks deste gate são do **delta de uma edição** — e existem por isso, para não punir um run pela
página que ele herdou. Regeneração não tem delta: `before` estava quebrado, então o check do widget
(*"before tinha e after não"*) nunca dispara. As regras novas valem **só** com `regenerate`, e o teste
pina as duas direções.

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
