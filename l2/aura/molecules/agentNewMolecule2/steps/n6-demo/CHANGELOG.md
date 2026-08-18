# n6-demo — CHANGELOG

## 2026-08-18 (noite) — binding dentro de slot, e a mensagem do órfão que convidava a apagar

Duas correções que vieram de um run do IM2 e valem igualmente aqui, porque este passo escreve a mesma página.

**`slot_binding`.** `<Label>{{playground.basic.label}}</Label>` imprime o token na tela: binding resolve em
**atributo**, dentro de slot é texto puro. Medido: **0** ocorrências nas 196 páginas dos três projetos.
O prompt já dizia *"slot content goes in the markup, never in the state"* — prosa pede, código impõe. A
função é `findSlotBindings`, vizinha da `findAttributeSlots`, mesma família de defeito.

**A mensagem de `state_binding` passou a apontar o conserto.** Ela nomeava o sintoma ("estes bindings não
têm estado correspondente"), e no IM2 o retry a satisfez **apagando** — página 5KB menor, cinco painéis de
`Properties` a menos. Agora diz para declarar as entradas em `examples` e que apagar bindings, cartões ou
controles não é conserto.

Este passo nunca produziu o defeito: as páginas do `n6` saem com controles para 6/6 exemplos e zero
bindings em slot. As duas regras protegem o que ele já faz.

## 2026-08-18 (tarde) — a tag do widget de estado era conferida pelo SUFIXO, e 5 páginas foram publicadas mortas

`NM_STATE_WIDGET` era `'widget-playground-state-102020'` — o **sufixo** — e o check era
`content.includes(...)`. A tag truncada satisfaz um `includes` do sufixo. A mensagem de erro logo abaixo
escrevia o nome completo em prosa, o que deixava a divergência visível o tempo todo.

**Medido nos seis projetos:** **398** páginas com a tag registrada
(`aura--molecules--playground--widget-playground-state-102020`) contra **8** com a truncada. Cinco das 8
saíram deste passo, e são estruturalmente **perfeitas** — 12 instâncias, 6 chaves de exemplo, estado real,
header, 8 a 20KB. Só a tag do widget está truncada, e `<widget-playground-state-102020>` **não é elemento
registrado**: não renderiza, e todo `{{playground.*}}` da página fica morto.

É a mesma espécie do `slotIsExercised` aceitando `slot="X"`: **o check media um pedaço**, então a medição
que o abençoou (*"146/146 carregam o widget"*) não conseguia ver o prefixo. A constante agora é uma só,
em `shared/moleculeTemplates.ts`, comparada **como tag** por `pageHasStateWidget` — e as 196 páginas reais
da biblioteca passam, zero falso positivo.

Também saiu daqui, extraída e compartilhada: `demoStateIssues(html, examples)` — as duas formas de um
binding morrer em silêncio (`stateName` malformado, chave que nenhum exemplo declara). O `i5-playground`
passa a rodar a mesma regra quando a rota E cria uma página do zero, onde antes não havia regra nenhuma.

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

## 2026-07-29 — created (control item 3.8)

Gate covers 12 codes with 14 tests, calibrated over the 146 real playground pages of mls-102040
(146/146 carry the state widget; 0 contain a document tag or `<script>`; 1 has a `<footer>`; tag uses
median 12, minimum 6, none below 6).

Decisions worth not undoing:

- **The gate runs BEFORE the state substitution.** Requiring `playgroundDinamicState` only means
  something at that moment — in the finished files the token is already replaced (0 of 146 contain it).
- **`tag_uses` is tied to the declared examples** (floor 6), not a flat 3 as in the Variant: it catches
  the real failure of declaring 6 scenarios and rendering 4 cards.
- **`state_binding`** rejects a `{{playground.<key>.…}}` binding no example declares. That binding
  renders empty on the page, and nothing else would notice.
- **`state_shape`** rejects a state name outside `playground.<key>.<property>`, because
  `substituteDemoState` drops those silently.
- **`<head[\s>]` not `<head`**: every real page opens with a `<header>`, so the loose form would reject
  all 146. Same class of bug as the `<!DOCTYPE|<html|<head|<body` regex that matched `<header` during
  the theme work — pinned by a test here.
- **No appearance rules on this artifact.** It is a page, not a component; the library's own pages use
  `bg-white dark:bg-slate-900`.
- **A persistent failure does not block the pipeline** — `n6-done` is emitted with `ok:false`.
