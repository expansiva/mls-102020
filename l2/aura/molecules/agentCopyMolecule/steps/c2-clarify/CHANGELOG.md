# CHANGELOG — c2-clarify

## 2026-08-19 — nasce (Fase 3 do controle)

- **sempre plantado, auto-completa sem colisão** (decisão nova 4): a alternativa (c1 emitindo
  `add-step`) criava duas formas de plano para o mesmo pipeline;
- **sem widget novo**: usa o `shared/widgetDecisionClarification`, precedente `t2-clarify` — o
  item 4.4 do controle caiu por causa disso;
- **duas listas de opções**, por modo (decisão nova 1): single com `rename`, lote com
  `ignore-existing`; renomear em lote não aparece e a opção diz que exige rodar item a item;
- **cancelar = cancela tudo, nada escrito** (decisão nova 5) — o botão de cancelar do widget e a
  opção `cancel` terminam no mesmo lugar;
- **a consequência está escrita na opção**: "substituir DESCARTA as alterações locais, INCLUSIVE
  traduções", com a data do `copiedFrom` da cópia em risco no intro;
- o novo nome do rename vem do **campo de texto livre** do widget (`allowNotes`), validado contra
  colisão nova — renomear para cima de outra molécula existente não resolveria nada;
- **única exceção ao "contexto escrito uma vez pelo c1"**: `rename` e `skip`.

## 2026-08-20 — cancelar tem de ANCORAR (falha T2 no Studio)

O usuário escolheu "Cancelar a operação", clicou em Continue, e **nada aconteceu visualmente** — nem
com o botão Cancelar do widget. O caminho de cancelamento marcava o step como `failed` e voltava, sem
emitir a âncora `c2-done`. Como c3/c4/c5/c6 são plantados na raiz e dependem dessa âncora, os quatro
ficaram em `waiting_dependency` para sempre: o run não terminou, não falhou e não produziu mensagem.

É a MESMA lição do `i4-inherit` (2026-08-10) que este step já aplicava ao caminho "sem colisão" e não
aplicava ao cancelamento. O que prova o diagnóstico: T3 (substituir) e T4 (renomear) percorrem o mesmo
`applyAnswer` → `cApplyIntentsAndRefresh` e funcionaram — a maquinaria de intents estava boa; faltava a
âncora.

Agora cancelar: marca `cancelled: true` no contexto (com todos os itens em `skip`), grava
`answers.json` + trace, **emite `c2-done`** e completa o step com o aviso; c3/c4/c5 fazem no-op **com
suas âncoras** e o c6 fecha o run dizendo que nada foi copiado. Zero arquivo escrito, como a decisão 5
manda — mas visível.
