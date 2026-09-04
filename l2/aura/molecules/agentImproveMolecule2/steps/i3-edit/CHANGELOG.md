# CHANGELOG — i3-edit

## 2026-09-04 — a tabela canônica de fallbacks chegou ao prompt, e o `fallback_divergence` ao gate

**O IM2 escrevia `.less` de molécula base sem receber os VALORES dos papéis do design system.** Ele e
o `n5-less` do NM2 seguem a mesma skill (`skills/tokenVocabulary`), que dá os NOMES dos papéis e as
regras — mas só o NM2 recebia a tabela de valores (`canonicalFallbackTable()`). O IM2 tirava os
valores da seção `## Design System Roles` da `usage.ts` do grupo, uma tabela que vai ser removida;
sem este ajuste a remoção o deixaria cego.

**A medição que motivou:** o run do Studio de 03/09. Duas moléculas geradas na mesma sessão
discordaram do fallback de 6 papéis (`--text-default` `#37323d` vs `#374151`), e uma folha discordou
**de si mesma** sobre `--border-subtle` — `#d1d5db` na linha 126, `#e5e7eb` na 135. Depois de injetar
a tabela canônica no NM2, o run seguinte deu **0 divergência** em 92 sítios `var()`. O IM2 não tinha
nem a tabela nem o check.

**O que mudou:**

- `skills/canonicalFallbacks.ts` (novo) — `canonicalFallbackRows()`, a tabela `papel -> fallback` lida
  do `DEFAULT_TOKENS_TEMPLATE` (a mesma constante que GERA o `designSystem.ts` de um projeto). Saiu do
  `agentNm2Less.ts` para cá em vez de ser duplicada: os dois agentes escrevem o mesmo tipo de folha e
  divergir sobre "como a biblioteca é sem design system" é justamente o defeito que estamos consertando.
  Resolve as expressões LESS do template (`calc(@font-base-unit * 3)` -> `0.75rem`, porque uma folha de
  molécula compila sozinha e `@font-base-unit` é indefinido lá) e omite as variantes
  `-hover`/`-focus`/`-disabled` e as chaves `_dark-`. Verificado: 80 linhas (44 papéis de cor + 20
  `global` + 19 `typography` − 3 `*-base-unit`, que são internos da escala);
- `agentNm2Less.ts` — passa a importar de lá; a prosa dele fica onde estava e o texto injetado é
  byte-a-byte o de antes;
- `agentIm2Edit.ts` — `canonicalFallbackTable()` local (só a prosa) + `{{canonicalFallbacks}}` na
  cadeia de substituição, ao lado de `{{tokenVocabulary}}`;
- `prompt.md` — `{{canonicalFallbacks}}` depois de `{{tokenVocabulary}}`, na seção
  `### The token vocabulary of the appearance`;
- `gate.ts` — código de erro `fallback_divergence`, num bloco irmão do `if (file.kind === 'ts')`.

**⚠️ A PROSA DO IM2 É O INVERSO DA DO NM2, e é por isso que só a tabela é compartilhada.** O NM2 cria
a folha: não há nada a preservar, o valor do template é o certo. O IM2 edita uma folha que já existe,
e a regra deste agente é o DELTA — "corrigir" o fallback de um papel que a folha já lê é mudança
visual que ninguém pediu, por mais canônico que seja o valor novo. O texto do IM2 diz, em inglês,
que a tabela vale só para um papel que a edição está INTRODUZINDO.

**O gate julga o DELTA, e a ordenação é o que faz isso funcionar.** O detector
(`shared/moleculeInspect.divergentTokenFallbacks`, já existia e é o mesmo do NM2) devolve objetos, e o
`introduced()` compara strings — então cada achado é dobrado numa chave estável por token, com os
valores **ordenados e normalizados**. Sem ordenar, o `divergentTokenFallbacks` devolve os valores em
ordem de aparição: inserir um sítio no topo do arquivo inverte a chave, o `introduced()` vê string
nova e reprova uma divergência **pré-existente**. Provado nos dois lados na
`grouptriggeraction/ml-pagination-control.less`, que já lê `--ml-pagination-press-shadow` com
`rgba(0,0,0,0.08)` e `rgba(0,0,0,0.1)`:

| caso | esperado | resultado |
|------|----------|-----------|
| arquivo inalterado (divergência pré-existente) | 0 | 0 ✅ |
| edição insere um sítio no topo, invertendo a ordem da chave | 0 | 0 ✅ (sem ordenar: 1 ❌) |
| edição introduz divergência nova em `--border-default` | 1 | 1 ✅ |
| edição acrescenta um 3º valor ao token que já divergia | 1 | 1 ✅ |

**Verificação.** O `gate.test.ts` deste passo não roda fora do Studio (importa pelo alias
`/_102020_/…` e falha na resolução de módulo, antes e depois desta mudança). Os 4 arquivos tocados
parseiam (`esbuild transformSync`, `loader: 'ts'` — o `tsc` do mls-base não serve, 1847 erros de
sintaxe em `l4` abortam a análise semântica), o `prompt.md` não tem placeholder órfão, e a tabela dos
4 casos acima foi produzida rodando o `runImEditGate` real com os módulos vizinhos stubados.

**Fora de escopo, por decisão explícita:** a seção `## Design System Roles` da `usage.ts` **não** foi
removida — é o passo seguinte, e dependia deste. O `mls-102029/l2/designSystemBase.ts` não foi tocado
(o template não é nosso para alterar — decisão do Lucas, 02/09). Nenhuma `usage.ts` foi regenerada, e
o registro de tokens de geometria (`--ml-spinner-*`) continua com a forma em aberto.

## 2026-09-01 — o contrato da BASE entrou no prompt (segundo capítulo de 17/08)

**O mesmo defeito da entrada abaixo, num artefato diferente.** A de 17/08 registrou que o IM2 herdou
as *referências* do `context.json` e parou de injetar o *conteúdo* dos contratos de grupo — medido
pela `ml-currency-input`, que ganhou duas propriedades públicas em vez dos slots `Label`/`Helper` que
o grupo já exigia. Esta entrada é a mesma causa, um nível acima: o contrato da **plataforma**
(`moleculeGeneration` + a classe base `_102033_/moleculeBase.ts`) nunca chegou a este prompt, embora o
NM2 já os injete há tempos em `n4-render` (`agentNm2Render.ts:17,91,101-102`).

**O caso que motivou:** 6 runs do `agentImproveMolecule2` na `ml-record-form-table`
(`mls-102040-temp`), entre 28/08 e 01/09. Os 5 primeiros consertaram de verdade; o 6º tentou consertar
"campos abrem editáveis, deveriam abrir em leitura" varrendo `renderRoot` (este projeto não tem Shadow
DOM — a varredura é inerte) e trocando `setAttribute('is-editing', ...)` por `toggleAttribute` (que
REMOVE o atributo no caso `false`, reproduzindo exatamente o defeito). Os dois fatos que decidem o
conserto certo — sem Shadow DOM, e a projeção de slot vivo move os nós em `update()`, antes de
`updated()` rodar — vivem só em `moleculeBase.ts` e `stateLitElement.ts`, fora da janela do modelo.

**O que mudou:**

- `prompt.md` — nova seção `### The BASE`, inserida antes do contrato do grupo (a base é mais geral):
  nomeia as duas consequências no vocabulário de quem está consertando, depois injeta
  `{{moleculeGeneration}}` e `{{moleculeBase}}` na íntegra;
- `agentIm2Edit.ts` — importa `moleculeGenerationSkill` (mesmo import direto do NM2) e lê
  `moleculeBase` via o helper novo; as duas substituições entram na cadeia ao lado de `{{groupUsage}}`;
- `helpers/imResolve.ts` — `readMoleculeBaseSource()`, no mesmo estilo defensivo de `readGroupSkill`
  (best-effort, `''` em falha, nunca escreve);
- **digital no trace**, nos dois pontos onde `trace-i3-edit-NN.json` é gravado (erro de apply e
  resultado do gate): `skills: { moleculeGeneration: {loaded,chars,hash}, moleculeBase:
  {loaded,chars,hash} }`, mesmo padrão FNV-1a que o `i2-triage` já usa para o contrato do grupo — sem
  isso não dá para distinguir "a injeção não ajudou" de "a injeção não chegou".

**Fora de escopo, por decisão explícita:** `i2-triage` e `i2a-definition` não recebem nada disto — a
pergunta do triage é de roteamento, não de mecanismo. `moleculeGeneration.ts` e `moleculeBase.ts`
continuam só-leitura: são contrato mantido à mão em `mls-102033`/`mls-102020`, igual à regra de 17/08.

**Custo — pendente de medição real.** A adição é ~67 KB de prosa (42 KB `moleculeGeneration` + 25 KB
`moleculeBase`) em todo run de rota B/C do `i3-edit`, sempre — inclusive num conserto de uma linha de
`.less`. O código foi verificado localmente (typecheck escopado sem `l4` limpo nos arquivos tocados,
`node scripts/run-tests.mjs --all l2` sem regressão nova — as falhas pré-existentes em
`agentChangeFrontend`, `agentNewSolution`, `agentManageHeader` e `agentSyncMoleculeCatalog` foram
confirmadas idênticas com e sem esta mudança, via `git stash`), mas os runs de aceite A1–A3 — que
precisam do `mls-102020` publicado e de uma execução real no Studio — não foram executados nesta
sessão. Os números de tokens/custo desta entrada ficam em aberto até essa medição.

## 2026-08-17 — os contratos do grupo voltaram ao prompt

**Decisão registrada:** os agentes **leem** os contratos de criação e de uso do grupo e **nunca os
alteram**. Alterar contrato de grupo é trabalho manual em `mls-102020` — é onde a superfície pública de
todas as moléculas daquele grupo é definida, e um agente que pudesse editá-lo poderia alargar em
silêncio o que um grupo inteiro promete.

**E ler não é desenho novo: é restaurar o que o fluxo anterior fazia.** O
`agentImproveMoleculeMaterialize` — o passo que escrevia código no agente antigo — injetava três skills
no prompt: o overview do Aura, o `moleculeGeneration` e o **contrato de criação do grupo**, resolvido
pelo `skills/index`. O IM2 herdou as *referências* no `context.json` e deixou de injetar o conteúdo.

**O que a ausência custou, medido em 14/08:** pediram "um rótulo e um texto de ajuda" na
`ml-currency-input`. O grupo `groupEnterMoney` define rótulo e ajuda como os slots `Label` e `Helper`.
Sem as tabelas do grupo, o editor criou duas **propriedades públicas** `label` e `helper` — mudança de
definição na rota que não as faz, com o `slotTags` continuando ausente. O gate passou a recusar a
invenção no mesmo dia; ele não sabia qual era o acerto.

**A divisão entre os dois contratos segue a semântica dos arquivos:**

| passo | recebe | por quê |
|---|---|---|
| `i2-triage` | **uso** | a primeira pergunta dele é "o contrato já promete isto?", e uso é o que o grupo oferece a quem consome |
| `i3-edit` | **criação + uso** | ele escreve o código: precisa de como se constrói e do que se promete |
| `i7-summary` | **criação** | já usava, para o relatório de coerência |

`readGroupSkill` (em `imResolve`) passou a ser o único leitor — havia três cópias da mesma função em
três passos. O gate do `i3` recebe a **união** dos dois textos como vocabulário: um nome que qualquer um
dos dois declara é sancionado pelo grupo.

**A regra nova no prompt do triage:** *o silêncio do `.defs.ts` da molécula não é permissão para tratar o pedido como novo* — o nome pode já existir no grupo, e aí é o nome do grupo que se usa.

⚠️ **E uma ressalva medida em 17/08, que impede o excesso oposto:** o contrato do grupo é a **união das variantes**, não uma exigência por molécula. Das 26 moléculas que não declaram todos os slots do grupo, 15 só não têm slots de variante-tabela e outras 10 não têm o `Detail`, de expansão de linha. `Cell` pertence à tabela do grupo de seleção, não ao dropdown. Então o grupo é **evidência, não prova** — o prompt diz isso, senão o triage passaria a rotear "adicione Cell ao ml-dial-select" como defeito.

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
