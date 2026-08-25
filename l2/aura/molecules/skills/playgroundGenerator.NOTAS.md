# `playgroundGenerator.ts` 2.8.0 — o que mudou, e por quê

Escrito em 2026-08-25 como `playgroundGenerator2.ts`, ao lado do original e inerte, no mesmo padrão do
`creation2`/`usage2` do `groupViewTable`. **Adotado no mesmo dia**: o conteúdo passou para
`playgroundGenerator.ts`, o par `2` deixou de existir, e o quarteto do original (`.defs.ts`/`.html`/
`.less`, com o seletor `skills--molecules--playground-generator-102020`) não foi tocado — os do `2` eram
placeholders. O texto que embarca é este; a versão anterior (2.7.0, digital do `skill`
**11.663 · `a0f36218`**) ficou apenas no backup da sessão da troca.

Digital do `skill` desta versão: **13.267 · `a179b0c2`** — o `n6-demo` grava esse par no trace, então dá
para conferir num run qual versão o runtime serviu.

> ⚠️ **Este arquivo é lido por QUATRO agentes**, não três: `n6-demo` (NM2), `v5-demo` (Variant),
> `i5-playground` (IM2) e `agentNewMoleculePlayground` (agentsManageMolecules). Vale para os 31 grupos
> e para toda página de playground futura — é o que torna a troca uma decisão, e não uma correção.

## A origem: um defeito medido três vezes

Nas três gerações de uma tabela com CRUD em linha (24 e 25/08), **nenhuma** célula de **nenhum** dos
cenários recebeu componente de entrada. Todas texto puro — inclusive as células da linha de rascunho,
que saíram com os **rótulos das colunas** como texto. Clicar em "editar" abria a linha e nada mudava na
tela, porque a molécula está proibida por contrato de criar input: ela só propaga `is-editing` para web
components dentro da célula.

A causa não estava no contrato do grupo. Estava aqui, na §6.2:

> *"⚠️ **Slot content is LITERAL TEXT** — `<Label>Copy</Label>`. Bindings resolve on ATTRIBUTES only…"*

**A frase é mais larga que a própria razão dela.** A razão é só sobre **bindings** não resolverem dentro
de slot; a frase afirma que conteúdo de slot é TEXTO, e o gerador aplicou ao pé da letra.

E o gate **não** proíbe o que faltava. Lido em `n6-demo/gate.ts`: ele recusa `{{…}}` dentro de slot
(`slot_binding`) e `slot="nome"` como atributo (`slot_as_attribute`). **Web component dentro de slot
passa.** A capacidade existia, o gate permitia, e era uma frase de prosa que a barrava.

## As cinco edições

| # | onde | o quê |
|---|---|---|
| 1 | §1 Metadata | versão `2.7.0` → `2.8.0` |
| 2 | **§6.2, o bloco ⚠️** | a regra passou a ser **"slot content takes no BINDING"**, com o literal como consequência — e um segundo parágrafo dizendo que **literal não é só texto**: web component é conteúdo de slot válido, com valores literais nos atributos, e é assim que um slot ganha editor. Traz a medição de 25/08 (os três playgrounds seguidos) e fecha com "o gate recusa o BINDING, nunca o componente" |
| 3 | §6.3, a lista do `<demo>` | um item: quando o slot aceita componente — e o contrato do grupo diz quando —, pôr o componente ali |
| 4 | **§6.3, um exemplo novo** | a célula de uma tabela com edição em linha, com `groupentertext--ml-enter-text` dentro do `<TableCell>` e as ações da linha ao lado |
| 5 | §8 Checklist | o item de slot virou dois: "sem binding, valores literais" **e** "slot que aceita componente tem o componente no exemplo (não texto puro)" |

Mais a linha `2.8.0` no changelog da §9.

**A edição 4 é deliberada, e é o aprendizado do experimento anterior.** Medido em 24-25/08 no contrato
do grupo: uma cláusula em prosa nova foi obedecida na geração seguinte, e um exemplo refeito **não**
foi. Aqui a prosa é a correção, e o exemplo é o reforço — os dois, porque nenhum dos dois sozinho tem
histórico de 100%.

⛔ **A linha `2.7.0` do changelog NÃO foi reescrita.** Ela registra o que aquela versão fez, e o
registro histórico continua verdadeiro — quem reescreve changelog apaga a razão de a correção existir.

## Tamanho e verificação

| | |
|---|---|
| tamanho do arquivo | 11.990 → **13.601** caracteres (+1.611) |
| tamanho do `skill` (o que chega ao prompt) | **13.267** caracteres |
| `tsc --noEmit` | exit 0 |
| parse do literal de template | ok |
| inércia | nenhum arquivo importa `playgroundGenerator2` |
| tags do exemplo novo | `groupviewtable--ml-inline-edit-table` e `groupentertext--ml-enter-text` — as duas conferidas contra o `@customElement` real, como a §2 deste próprio arquivo exige |

## O que este arquivo NÃO resolve

O defeito de renderização da 3ª molécula gerada (comparação de `tagName` com hífen) é outro assunto, e
já tem correção no contrato de criação do grupo. Um playground correto sobre uma molécula que não
renderiza continua vazio — **os dois precisam estar de pé para o teste valer.**
