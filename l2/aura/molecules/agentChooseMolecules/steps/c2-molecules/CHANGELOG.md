# CHANGELOG — c2-molecules

## 2026-08-19 (b) — o `import()` não lê catálogo não publicado

**Primeiro run no Studio.** O c1 passou; os c2 morreram em
`Failed to fetch dynamically imported module: https://on.collab.codes/_102040_/l2/molecules/groupenterdate/index.defs`.
Causa: **import dinâmico é servido pelo projeto PUBLICADO**, e os `index.defs.ts` dos grupos existiam só
no editor (o nível 1 importou porque já estava publicado).

Correção em `helpers/chCatalog.ts` — a leitura virou escada, e **qual degrau respondeu fica registrado**
(`catalogVia` no artefato do grupo, `catalog.groupsViaLocalCache` no `run.json`, observação no resumo):

1. `await import(reference)` — o gesto do `readGroupSkill`, e o único degrau que um consumidor fora do
   editor tem;
2. o mesmo arquivo compilado para o cache do browser (`compileAndPostProcess(model, false, true)` +
   `mls.stor.cache.AddMfileIfNeed`) e importado de lá;
3. falha legível que **nomeia o conserto** ("salve e publique o arquivo"), distinguindo três casos: não
   existe no projeto, existe e não compila, existe e não é servido.

⚠️ Não é só conserto de infra: é achado sobre o desenho da §10. Um `index.defs.ts` escrito pelos passos de
índice é **ilegível para qualquer consumidor até ser publicado** — publicar faz parte de gerar catálogo, e
o `page12` vai ter só o degrau 1.

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
