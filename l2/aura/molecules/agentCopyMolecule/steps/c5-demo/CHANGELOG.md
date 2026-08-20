# CHANGELOG — c5-demo

## 2026-08-19 — nasce (Fase 3 do controle)

- **cópia verbatim, sem troca de header**: 0 de 153 `.html` de molécula têm header mls (medido
  19/08) — o esboço da análise §9.2 dizia "com header trocado" e estava errado;
- **único step que não bloqueia**: falha vira aviso por item; os outros itens seguem copiando;
- **âncora emitida também na falha**, com `ok:false` — caminho sem âncora é como um run fica verde
  e pendurado (lição do `i4-inherit`);
- gate confere que a demo menciona a tag da cópia e que **não** ganhou header mls.

## 2026-08-20 — `containsTag` no lugar de `includes`

Mesma correção do c3/c4: a checagem de tag antiga na demo renomeada precisa de fronteira de tag,
senão `ml-x-app` acusa `ml-x`.
