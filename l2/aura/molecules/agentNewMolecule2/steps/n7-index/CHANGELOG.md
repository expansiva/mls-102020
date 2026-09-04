# n7-index — CHANGELOG

## 2026-07-29 — created (control item 3.9)

Gate covers 8 codes with 8 tests. Decisions:

- **D5 honored**: the `indexGroupPage` skill is reused in this step; no agent invocation
  (`agentUpdateIndexGroupPage` fans out — lesson P4).
- **`molecule_missing`** checks the OTHER molecules of the group, not just the new one. A showcase that
  silently drops a molecule makes it invisible to whoever browses the library, and the old flow had no
  check at all.
- **`index.html` is deterministic** (`renderGroupIndexHtml`): it is only the group index element, so
  there is nothing for a model to get wrong.
- The molecule list comes from a stor scan, filtering out `index`, `.defs` companions and `.test`
  files — the `.defs` filter matters because those share the `.ts` extension.
- **Never blocks**: a second failure emits `n7-done` with `ok:false`.

## 2026-07-30 — o `index.ts` do grupo passou a compilar (A5b)

Dos três artefatos escritos às cegas, este era o perigoso: o índice é arquivo COMPARTILHADO do grupo,
reescrito com linha de `import` nova e um componente Lit inteiro, então uma quebra derruba a página
de todas as moléculas do grupo, não só a nova. Agora escreve, chama `compileStorTs` e os erros entram
no gate como código `compile`. A falha continua NÃO bloqueando o pipeline (âncora com ok:false e o
n8-summary reporta), que é a decisão D5.

## 2026-09-04 — `contract_not_demonstrated`

Medido num run real: a vitrine gerada de `grouptriggeraction` trouxe 6 instâncias da molécula e ZERO
`data-variant` — a propriedade que o `usage.ts` do grupo chama de "the only way to change how the
button looks". O molde (`skills/indexGroupPage.ts`) entrega uma tag fechada, com atributos e comentário
de slot, e nunca menciona que existe uma segunda camada (o contrato do `usage.ts`) — então o modelo
nunca chega lá.

O gate agora reprova se a página usa **zero** itens do contrato do grupo (tabelas `Properties`/`Events`
do usage skill) fora do envelope que o próprio molde entrega (`name`/`value`/`isEditing`/`@change`). O
parsing e a normalização (`icon-position` → `iconposition`, para casar com `.iconPosition`) vivem em
`shared/usageContract.ts`, compartilhado com o `s3-indexts` e o `v4-index` — os três importam o mesmo
molde e não podem divergir na detecção. Medido nos 31 `index.ts` de grupo da biblioteca: 28 passam, 3
reprovam (`groupviewtable`, `groupenterboolean`, `groupnavigatesection` — ver o todo para por que os dois
últimos são discutíveis). Uma skill de uso vazia ou degradada nunca reprova.
