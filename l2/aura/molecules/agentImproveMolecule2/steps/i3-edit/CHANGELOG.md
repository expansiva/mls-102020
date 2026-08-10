# CHANGELOG — i3-edit

## 2026-08-06 — first version

- **Targeted edits instead of rewritten files.** The first design followed `n4-render` and asked
  for the whole new artifact. It is the right shape for creation and the wrong one here: n4-render's
  own history records retries coming back as different, shorter files that failed on something else
  (`nmFs.ts:96-106`), and there the file was disposable. Three invariants — read-before-write,
  header preservation, no foreign write — became structural instead of checked.
- **An ambiguous `find` is rejected, not applied to the first match.** Applying it would silently
  edit a place the model was not looking at.
- **Rollback on a rejected attempt**, against NM2's convention. Recorded here because the
  divergence will look like an oversight later: NM2 keeps the failed file so the retry can see it;
  this agent edits molecules that already work, and a twice-failed run must not leave one worse
  than it found. The retry reads the gate errors and the original files, which is the state its
  `find` strings must match anyway.
- **Delta rule for every detector.** The appearance/discipline checks are imported from
  `n4-render/gate.ts` rather than copied, and each runs on the before and the after. A molecule
  that already hardcodes `bg-black` must not block a padding fix — flow.json's last principle.
- Same rule for compilation, which costs a second compile per touched file. Measured trade: the
  alternative is refusing every edit to a molecule that already has an error, and the repo baseline
  is 193 errors, so those molecules exist.
- **One call, `code` model, for `.ts` and `.less` alike**, though flow.json's goal line says the
  `.less` uses the design model. A step emits one `prompt_ready`, so honouring that would mean
  splitting i3 into two steps or a dispatcher/worker pair. Deferred on purpose: the design model
  earns its keep writing a whole stylesheet (n5-less), and an improve run changes a spacing or a
  token. Revisit if `.less` edits start coming back weak.
- The files are shown with `----- FILE: … -----` delimiters, not fenced with backticks: a
  `.defs.ts` carries a markdown skill full of them and a fence would end mid-file.
- `EDITABLE` excludes `html` and `groupIndex` so the model cannot reach into what i5 and i6 own.

## 2026-08-10 — o `find` exato não sobrevive à indentação colapsada da biblioteca

O segundo run real morreu aqui, nas duas tentativas, com dois `find` que não casavam. Não era o
modelo sendo desatento: era o arquivo.

**MEDIDO: 32 das 153 moléculas do mls-102040 têm INDENTAÇÃO COLAPSADA** — toda linha aninhada com
exatamente UM espaço, em qualquer profundidade. A `ml-hierarchy-tree.ts` é uma delas: 367 linhas com
um espaço, 38 com zero.

Um modelo de código que lê ` private parseNodes() {` e recebe a ordem de copiar verbatim reindenta
para dois ou quatro espaços. É o instinto de normalização mais forte que esse tipo de modelo tem, e
insistência no prompt não vence — as duas tentativas do run queimaram nisso.

O casamento passou a ter dois caminhos:

1. **exato primeiro**, byte a byte, que é o caso comum e o mais preciso;
2. **na falha, ignorando RUNS de espaço em branco** — cada sequência de whitespace do `find` casa
   `\s+`, o resto é literal.

O trecho substituído é o realmente encontrado no arquivo, então **os bytes ao redor continuam os
mesmos** nos dois caminhos, e a indentação do arquivo fica exatamente tão estranha quanto era.
Ambiguidade continua recusada: dois casamentos, mesmo frouxos, são erro.

A mensagem de erro também mudou. Antes dizia *"copy it verbatim, whitespace included"* — instrução
que apontava para o lado errado. Agora, quando falha, diz **"not even ignoring whitespace — the text
itself is not there"**, que é a única coisa que o erro passou a significar.

E os prompts de i3/i5/i6 passaram a dizer que a indentação **não** precisa casar, para o modelo não
gastar tentativa tentando reproduzir espaçamento impossível.

**Nota de honestidade:** o `quote()` da mensagem já colapsava whitespace para exibir, o que ESCONDEU
a causa no relato do usuário — o texto aparecia normalizado, então não havia como ver que o problema
era espaçamento. O `find` exato foi uma escolha minha de 06/08, justificada com "três invariantes de
graça"; ela seguia valendo, mas eu nunca medi se os arquivos suportavam casamento exato. Não
suportavam.

## 2026-08-10 (2) — o run reportou sucesso e não escreveu nada

O terceiro run real percorreu o pipeline inteiro, gravou `edit.json` com `touched: ["ts"]`, e a
`ml-hierarchy-tree.ts` continuou com o timestamp de 05/08. Nenhum arquivo da molécula mudou.

**A causa:** o terceiro argumento do `writeStorTextAtomic` é `needCreateModel`, e o comentário da
própria função diz a regra — **true para artefatos de código, false para arquivos de trabalho l4**.
As **seis** chamadas deste agente passavam `false` (ou `!present`, que é `false` para arquivo que
existe). Eu tratei o `.ts` de uma molécula como um JSON de rascunho. As seis do NM2 passam `true`.

Duas consequências, e a segunda é pior:

1. **o model do editor nunca era atualizado**, então a escrita não chegava onde o Studio persiste;
2. **o gate de compilação ficou CEGO.** O `compileStorTs` compila o *model*, e o model ainda tinha o
   conteúdo antigo — compilou o código velho, não achou erro novo, e passou. Todo veredito de "sem
   erro novo de compilação" daquele run não significava nada.

A segunda é a falha já documentada naquele mesmo comentário: a cegueira do n4-render de 30/07, um
parágrafo abaixo da linha que eu ignorei.

**Conserto:** as seis chamadas passam por `writeImSource()` no `imResolve`, que sempre passa `true`.
O argumento não é exposto de propósito — um booleano que precisa ser sempre `true` em seis lugares é
armadilha, não parâmetro.

**O que o run tinha acertado**, e vale registrar porque foi jogado no lixo pela plumbing: o triage
mandou rota B com o argumento certo, e o modelo diagnosticou o bug corretamente — `render()` chama
`parseNodes()` e `initializeExpandedState()` (linhas 360-361), então cada render zera o
`expandedNodes` que o clique acabou de mudar. O trabalho estava certo; a escrita é que não existia.
