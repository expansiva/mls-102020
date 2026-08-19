# CHANGELOG — c2-molecules

## 2026-08-19 — nascimento

Primeira versão. O que já veio decidido:

- **tag completa, obrigatória** (decisão 4, 19/08). O gate recusa o nome curto e devolve a tag inteira
  na mensagem, mas **não completa o prefixo por código**: completar esconderia se o catálogo ensina a
  tag, que é metade do que o piloto mede.
- **três códigos para tag errada.** `tag_invented`, `tag_short` e `tag_case` são achados diferentes e o
  critério de aceite (`tag inventada = zero`) fala de um só. Um relatório que os somasse reprovaria o
  critério errado.
- **`ok:false` em vez de falhar.** O passo planta a âncora mesmo sem resposta aceita — senão o `c3`
  nunca roda e o run não deixa relatório. O produto da sonda é a medição.
- **exemplo de tag substituído do próprio grupo.** Um exemplo escrito à mão no prompt ensinaria o erro
  que o gate recusa. O `helpers/chPrompts.test.ts` falha se qualquer `ml-...` aparecer num prompt.
- **`tag: none` é resposta legal**, e a tabela de cenários do `groupEnterNumber` já garante que o caso
  vai aparecer: duas linhas dela recomendam `ml-number-range-slider`, que é de outro grupo (achado 2 da
  semeadura). A resposta certa ali é `none` apontando o outro grupo.
