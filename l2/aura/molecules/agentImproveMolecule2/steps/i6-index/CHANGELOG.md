# CHANGELOG — i6-index

## 2026-08-14 — `index_stale` era falso positivo, e travou o primeiro run que chegou aqui

O T1 foi o primeiro run da história do agente a alcançar este passo com o playground alterado — e
falhou. `ml-currency-input`: o `i5` mudou o playground (`playgroundChanged: true`), o import da
molécula **já estava** no índice e **nenhum slot foi acrescentado** (`addedSlots: []`).

O `planIndexWork` concluiu, corretamente, `needsModel: false`. O ramo determinístico
(`agentIm2Index.ts:103-119`) então produz `after === before` — não havia o que fazer — e chamava o gate
com `indexUpdated: false`. A regra era `playgroundChanged ⇒ o índice mudou`, sem exceção, então o gate
acusou o defeito de 05/08.

**Não era.** O playground pode mudar por um motivo que não toca o índice: aqui, um exemplo novo usando
propriedades. O ramo das linhas 103-119 pode legitimamente terminar sem escrever, e nesse caso ele
falhava **sempre**.

Conserto: o gate recebe `workExpected`, que o plano já sabe — `missingImport` ou `missingSlots`. Falha
se havia trabalho e o índice não mudou; passa se não havia. A proteção de 05/08 fica intacta onde se
aplica, e o segundo ponto de chamada (depois do modelo) passa `workExpected: true`, porque ali o modelo
só foi chamado porque havia card a escrever.


## 2026-08-06 — first version

- **flow.json said "deterministic, no LLM" and that was wrong.** Corrected here and in the spec.
  The import is derivable; the showcase card is hand-written Lit with chosen sample data and is
  not. Leaving the claim in place would have produced a step that reports "index updated" after
  fixing only an import — the 2026-08-05 failure wearing a different hat.
- Three exits instead of one: no-op, import-only (deterministic, no model), card work (model).
- **The import is written BEFORE the model is called**, so the page it reads is the page it edits
  and it never has to reason about imports. It also survives a failed attempt, being derivable and
  correct on its own.
- `playgroundChanged` is read from i5's artifact, never recomputed — see the readme.
- Added a `shrunk` check (>10% smaller): the plausible catastrophic failure here is the model
  "tidying" a 782-line page it was asked to extend by four lines.
- Imports are counted by PATH, with or without a `.js` extension: the library writes them without,
  a hand-edited index could carry one, and both are the same import.
