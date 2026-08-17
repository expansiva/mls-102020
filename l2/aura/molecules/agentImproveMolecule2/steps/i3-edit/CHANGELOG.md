# CHANGELOG — i3-edit

## 2026-08-14 — a rota B mudou a definição pública, e nada barrava

Medido no T1, `ml-currency-input`. O pedido: *"não consigo colocar um rótulo nem um texto de ajuda no
campo"*. O contrato do grupo `groupEnterMoney` define rótulo e ajuda como os **slots** `Label` e
`Helper`, e o triage acertou — *"o contrato já prevê os slots Label e Helper, portanto é um defeito de
implementação"*, rota B.

O `i3` então adicionou **duas propriedades públicas**, `label` e `helper`, com `@propertyDataSource`. O
`slotTags` continua ausente; o código lê `hasSlot('Label')` sem declarar o slot. E o `.defs.ts` não foi
tocado, então a molécula terminou com duas propriedades públicas que o contrato dela não menciona.

**Isso é mudança de definição feita na rota que não as faz** — sem checkpoint, sem humano — e nenhum
gate viu.

### A regra, e por que ela não pode ser "rota B não move a superfície"

Essa versão simples estaria errada, e barraria justamente o caso que faz este passo valer: **27
moléculas não declaram um slot que o grupo delas exige**, e consertar uma move a superfície e é o run
de rota B que finalmente alcança o `i5` e o `i6`.

O que separa os dois casos é o **contrato do grupo**. Declarar o que ele já exige é conserto de
defeito; inventar o que ele nunca nomeia é mudança de definição. `groupVocabulary` (em `imSurface`) lê
os identificadores entre crases do `creation.ts` do grupo — a maiúscula é o que discrimina: o grupo
nomeia `Label` e `Helper`, nunca `label` nem `helper`.

- `definition_changed` — adiciona slot/propriedade/evento público que o grupo não declara;
- `definition_removed` — remove qualquer um deles. Remoção nunca é reparo: quebra toda página já
  escrita, e é rota A com checkpoint, qualquer que fosse a intenção;
- na **rota A** a checagem não roda: mover a superfície é o que ela faz, com um humano tendo confirmado;
- **sem o contrato do grupo legível, admite tudo.** Recusar sobre medição ausente é o modo de falha
  contra o qual este agente já decidiu três vezes.

Verificado contra os arquivos reais do run: o diff medido é `addedProperties: ['label','helper']`, e a
regra recusa os dois — com o rollback do gate devolvendo o arquivo ao estado anterior.

⚠️ **O que este conserto NÃO resolve:** o `i3` continua sem ver as tabelas do contrato do grupo, só a
descrição. Ele agora é impedido de inventar, mas não é ensinado a acertar — pedir rótulo e ajuda ainda
não o leva a `slotTags = ['Label','Helper']`. Isso é decisão à parte, porque muda o tamanho do prompt.

## 2026-08-14 — the override that overrode nothing

Measured in the Studio, `ml-copy-button-glass` (102055), runKey `copy-confirmation-delay`. Asked for a
3-second copy confirmation, this step wrote into the shell:

```ts
export class MlCopyButtonMoleculeGlass extends MlCopyButtonMolecule {
  protected copiedDurationMs = 3000;
}
```

The parent holds that duration in `const COPY_CONFIRM_MS = 2000` — module scope — and declares no such
member. **Nothing read the field.** The button went on confirming for 2000ms, the file compiled, every
detector here was silent, and the run reported success.

**Why the model wrote it, and this is the part that matters.** The parent's source reached the prompt
under one condition: `choice?.where === 'override'` — route C only. On route B the shell's inheritance
block said, with the parent nowhere in the prompt:

> The fix goes in this molecule's own files: the `.less` first, and **a local override of a parent
> member** second.

The step was ordered to override a parent it could not see. A member that would have to exist is the
only thing a model can produce from that. It is the week's pattern in a new place — not prose losing an
argument to code this time, but **an instruction whose precondition was never supplied**.

**What this cost beyond one wrong file.** The same run also edited the shell's `.defs.ts` to promise
three seconds. The NEXT run read that contract, found the code doing 2000ms, and concluded — correctly,
from what it was shown — that there was an implementation defect to fix. The agent had written the
premise that then absolved it. A dead member is not only inert; it is evidence for the next run.

Two changes, and they are deliberately of different kinds:

- **the prompt now has the precondition.** `readParentSourceFor` prints the parent on EVERY shell
  (`less` excepted — that decision is about the stylesheet, and the `.ts` is not even offered to
  `applyEdits`), and the route-B inheritance block now carries the unreachable-member list plus the
  conclusion that follows from it: a name the parent does not declare is not an override, and when the
  change lives in an unreachable member the correct answer is to report the failure and write nothing;
- **`dead_member` in the gate**, because the prompt is the half that can lose an argument. A member the
  shell declares that is absent from the parent AND read by no one — not in the shell, not in the
  parent — is refused, which rolls the edit back.

`deadShellMembers` is pure and lives in `helpers/imInherit.ts`, next to the facts it needs. A name the
parent so much as mentions is left alone: the question is "did this come out of nowhere", not "is this a
valid override" — the compiler already answers the second.

**The delta rule applies, at line granularity.** A shell that already carried a dead member does not
block an unrelated fix; an edit that DECLARES one, or that writes to one, is refused. Both halves are
needed, and the second is not hypothetical: the run of 14/08 added only
`constructor() { super(); this.copiedDurationMs = 3000; }` over a field that already existed. Judged by
declaration alone it would have passed a second time.

**A member-list bug this uncovered:** `collectOwnMembers` reported `super` as a member of any shell
whose constructor calls it. Harmless while the list only fed a clarification; a false `dead_member` the
moment a gate started judging it.

Verified against the real files in `mls-102040-temp` / `mls-102055-temp`: `copiedDurationMs` is reported
dead in both the state 13/08 left and the state 14/08 left.

## 2026-08-13 — the written block came out flush left

Measured twice in one molecule (`ml-copy-button`, runs of 18:56 and 19:06):

```ts
  private getCopyText(): string {
return this.getLabelText();      // ← column 0
}                                // ← column 0
```

**The mechanism.** A match starts at the first non-whitespace character, so the anchor line's own
indentation is never inside the matched span: it stays in the file, and line 1 of the result looks
correct. Lines 2..n were written exactly as the model sent them — flush.

**Why the model sent them flush, and this is the part worth remembering.** `prompt.md` said
"indentation does not have to match". True, and about `find` — whitespace runs are matched flexibly
because 32 of 153 molecules have collapsed indentation. The model generalised it to `content`, which
is a fair reading of what was written. The second occurrence happened with *"keep the file's
indentation"* in the user's own request, so this is the week's pattern once more: **prose asks, code
imposes.**

**`alignReplacement` (new, pure, in `applyEdits`).** The replaced span is expanded to the start of the
anchor's line; line 1 of the content is placed at that line's indentation, read from the FILE; every
line after it shifts by the same amount, so the block's relative structure arrives untouched. Both
paths use it — the exact match and the whitespace-tolerant one.

Three boundaries, each with a test:

- **idempotent for well-formed content** — a block that already carries its indentation is written
  byte-identical. This is the common case and must not be disturbed;
- **relative structure is preserved, never invented** — a flush block comes out uniformly at the
  anchor's depth. Consistent, and it no longer poisons the next run's exact match. Guessing one level
  deeper for a method body is a formatter's job, and this is a text writer;
- **a mid-line match is left alone** — `compute(oldValue)` with only `oldValue` quoted. There the
  surrounding whitespace is code, not indentation.

**A bug of my own, caught by the idempotence test and kept as a test:** the base indentation was first
read from the gap *before* the match. A `find` that quotes its own leading spaces starts at the line
break, that gap is empty, and the whole block would have been shifted to column 0 — the very defect,
reintroduced by the fix. The base is the anchor LINE's indentation.

**No gate.** The invariant holds by construction, so there is nothing left to check: a gate here would
be unreachable code with a test that proves only itself.

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

## 2026-08-10 (3) — a escolha do humano na rota C não estava sendo aplicada

Dois defeitos no mesmo run, e a raiz é a mesma: eu **pedia** ao modelo o que deveria **impor** em
código.

**Escolha `less` → o modelo editou o `.ts`.** O prompt dizia "não toque no `.ts`", e o
`expectedArtifacts` do triage dizia `ts`, e o triage venceu. Resultado: dois erros de compilação
sobre `updated` ser `protected` na casca e `public` no pai.

> Uma instrução com a qual o modelo pode perder uma discussão não é instrução. Um `Map` que ele não
> alcança, é.

Agora o `fileStates()` recebe a escolha e, em `less`, só oferece o `.less`. O `renderFiles()` mostra
só o `.less` também — a escolha do humano ganha da previsão do triage, porque foi feita num
checkpoint com o custo de cada opção na tela.

**Escolha `override` → o modelo referenciou `this.open`, membro privado do pai.** Duas tentativas
queimadas num erro de compilação. A causa é banal: **o prompt nunca mostrava o código do pai.**
Sobrescrever um membro é ler o membro, e o modelo não lê o que não recebe.

Agora, e só quando a escolha é `override`, o prompt inclui o `.ts` do pai como somente-leitura, com
três regras que os dois erros deste run produziram:

- casar a assinatura do pai **exatamente**, incluindo a visibilidade — `public` não pode virar
  `protected` (foi o TS2415 deste run);
- os membros `private` do pai **não existem** para esta classe; se o comportamento depende de um
  deles, o override não funciona e o modelo deve dizer isso no `why` em vez de tentar;
- chamar `super.<membro>(...)` quando o comportamento do pai ainda deve acontecer.

**Nota positiva:** os três erros foram pegos pelo **gate de compilação** — que é o mesmo gate que
estava cego dois dias atrás por causa do `needCreateModel`. Ele funcionou, recusou, tentou de novo e
falhou de forma legível. Nenhum arquivo quebrado foi salvo.
