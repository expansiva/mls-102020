# CHANGELOG — i6-index

## 2026-09-08 — o passo passou a receber o contrato do grupo, e o gate ganhou `contract_regressed`

**Motivação: lacuna de inspeção, não falha medida.** Ao verificar o conserto do molde da vitrine
(que alcançou `n7-index`, `s3-indexts` e `v4-index`), notei que este passo ficou de fora — não por
decisão, mas porque a varredura foi feita pelo import do molde `skills/indexGroupPage.ts`, e o
`i6-index` não o importa (ele edita um cartão já existente, não escreve a página do zero). Medido:
0 referências a `usageReference`/`groupUsage` em todos os arquivos do passo, e o `prompt.md` não
menciona atributo, propriedade, contrato ou envelope nenhuma vez. Não existe defeito observado em
run real; é prevenção.

**O que mudou:** `agentIm2Index.ts` passa a carregar a skill de uso do grupo com
`readGroupSkill(ctx.groupSkill.usageReference)` (o mesmo loader que o `i3-edit` já usa), injetada
no `prompt.md` via `{{groupUsageSkill}}`, logo antes de `## The group index today`. A prosa nova
ensina as duas camadas do cartão (envelope de hospedagem vs. contrato da molécula) com um recado de
**preservação**, não de enriquecimento — este passo acompanha o playground, não autora vitrine.

O gate ganhou `contract_regressed`: reprova se a edição **removeu** da página um item do contrato
que ela já tinha (`before` menos `after`, via o detector compartilhado `shared/usageContract.ts` —
`usageContractItems`/`contractItemsUsed`, sem reimplementar). É uma pergunta DIFERENTE da dos outros
três gates de index ("a página demonstra o contrato?", certa para quem escreve a página inteira);
aqui a régua é "a edição tirou algo?", que é a certa para quem mexe num cartão só — uma vitrine já
pobre (3 na biblioteca hoje) não reprova nada, e a regra do delta já sai de graça do próprio desenho
`before`/`after`. Granularidade é a PÁGINA, não o cartão: se um atributo aparece em 3 cartões e a
edição o tira de um só, a página ainda o tem em outro lugar e o check não dispara — limitação
conhecida, registrada no comentário do check para a próxima pessoa não achar que é bug. A mensagem
nomeia os itens removidos na grafia da skill (`data-variant`), nunca a chave normalizada
(`datavariant`) — para isso, `shared/usageContract.ts` ganhou `contractSpellings()`, expondo o mapa
que já existia internamente. Skill de uso vazia (ou o placeholder degradado do loader) não reprova.

Verificado com `harness/probe-i6-regressao.mjs` (protótipo do check) e depois com o gate de verdade,
os 5 cenários batendo exatamente: sem mudança → nada; tira `data-variant` de todos os cartões →
reprova; acrescenta um slot (a edição real deste passo) → 0 falso positivo; remove um cartão inteiro
→ 0 falso positivo; tira de um cartão só → não reprova (limitação conhecida, não bug).

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
