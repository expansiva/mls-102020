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
