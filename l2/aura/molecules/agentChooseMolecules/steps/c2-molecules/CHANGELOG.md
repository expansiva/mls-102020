# CHANGELOG — c2-molecules

## 2026-08-19 (b) — o `import()` não lê catálogo não publicado; o stor passou a ser o primeiro degrau

**Primeiro run no Studio.** O c1 passou; os c2 morreram em
`Failed to fetch dynamically imported module: https://on.collab.codes/_102040_/l2/molecules/groupenterdate/index.defs`.
Causa medida: **import dinâmico é servido pelo projeto PUBLICADO**, e os `index.defs.ts` dos grupos
existiam só no editor (o nível 1 importou porque já estava publicado).

O `await import()` tinha vindo do plano do piloto (é o gesto do `readGroupSkill`). Mas o resto desta
família **não lê por import — lê pelo stor** (`nmFs`), e é assim que o `agentNewMolecule2` escreve uma
molécula e a lê de volta no mesmo run sem publicar; o `readGroupSkill` é exceção porque lê skills do
próprio 102020, publicado. Então a ordem inverteu:

1. **stor** — texto do arquivo no projeto, convertido em valores pelo `helpers/chExtract` (puro; extrai só
   o que os gates precisam — tags, a marca `defs: null`, os cenários, o `skill` — e **não avalia nada**);
2. **módulo publicado** (`await import`) — único degrau de quem não é o editor, e o que não precisa de
   parser;
3. falha legível dizendo qual degrau falhou como: ausente do projeto é problema diferente de presente,
   ilegível e não publicado.

Por que o stor primeiro, e não só como fallback: o import não vê catálogo não publicado, **e** num
catálogo publicado com edição não salva ele devolve o conteúdo velho **sem avisar**. `catalogVia` grava
qual degrau respondeu, e o resumo avisa quando a leitura veio do editor.

⚠️ Não é só conserto de infra: um `index.defs.ts` escrito pelos passos de índice é **ilegível para
qualquer consumidor até ser publicado** — publicar faz parte de gerar catálogo, e o `page12` vai ter só o
degrau 2.

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
