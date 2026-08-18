# CHANGELOG — i5-playground

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
