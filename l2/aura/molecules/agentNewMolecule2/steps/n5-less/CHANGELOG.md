# n5-less — CHANGELOG

## 2026-09-03 (b) — o fallback passou a ser CONSULTADO, e a escala de tamanho entrou no vocabulário

Três correções vindas do 2º run do Studio (o mesmo em que o conserto de família foi validado).

**1. `fallback_divergence` — código de gate novo.** O run leu `--border-subtle` como `#d1d5db`
numa linha e `#e5e7eb` **nove linhas depois, no mesmo arquivo**. A regra "um papel, um fallback"
já estava escrita em `skills/tokenVocabulary`, mas prosa não sustentou — e dentro de UMA folha
isso é totalmente decidível. `divergentTokenFallbacks()` (em `shared/moleculeInspect.ts`, com
`tokenFallbacks()` e `normalizeTokenValue()`) compara por VALOR, não por grafia (`#fff` ==
`#ffffff`). Verificado: pega o defeito real do `ml-button-group` e não gera falso positivo no
`ml-notify-modal`.

**2. A tabela de fallbacks canônicos entra no prompt (ramo NEUTRAL).** Antes a skill dava o
vocabulário e **não os valores**, então cada run inventava sua paleta neutra: as duas moléculas
do run divergiram em 6 papéis (`text-default` `#37323d` vs `#374151`). Agora
`canonicalFallbackTable()` lê o `DEFAULT_TOKENS_TEMPLATE` — a mesma constante que GERA o
`designSystem.ts` de um projeto — e injeta 80 linhas `papel → fallback`. Isso fecha a lição A7
(2026-07-31): era o ramo NEUTRAL exigindo "todo valor por token" sem nunca receber a tabela de
valores, enquanto o THEMED recebia a do tema.

⚠️ **Armadilha resolvida no caminho:** as escalas do template carregam expressão LESS
(`calc(@space-base-unit * 2)`). O runtime reescreve `@token` em `var(--token)` quando compila o
design system, mas a folha da molécula é compilada sozinha — `@space-base-unit` não existe lá.
Verificado: `var(--font-size-12, calc(@font-base-unit * 3))` **não compila**
(`NameError: variable @font-base-unit is undefined`). O `resolveScale()` resolve contra a unidade
base e entrega valor concreto (`font-size-12` → `0.75rem`, `space-8` → `0.5rem`); os
`*-base-unit` saem da tabela, por serem interno da escala.

**3. `font-size-*`, `line-height-*`, `space-*` e `breakpoint-*` entraram na skill.** Estavam
omitidos de propósito (layout é Tailwind no `.ts`), e o run mostrou o custo: o `ml-button-group`
**cunhou** `--ml-button-group-{xs,sm,md,lg}-font-size` para uma escala que o
`font-size-12/16/20/24` já cobria — token cunhado só se ajusta por CSS na mão, papel do DS segue
o tema do projeto. A skill agora lista os quatro grupos, com a ressalva de quando são
necessários: quando o RENDER põe o tamanho numa classe (`.ml-button-size-sm`) e o valor tem de
sair da folha.

**Achado colateral, NÃO corrigido:** o check novo encontrou uma divergência **pré-existente** em
`mls-102040/.../ml-pagination-control.less` — `--ml-pagination-press-shadow` vale
`rgba(0,0,0,0.08)` no nav e `rgba(0,0,0,0.1)` na página (confirmado no git, anterior à
migração). São duas intensidades deliberadas sob um token só, o que é erro de modelagem do
autor: precisaria de dois tokens. Fica para decisão de quem mantém a molécula.

## 2026-09-03 — classe de FAMÍLIA interpolada (achado no run do Studio)

O run de 03/09 (`ml-modal-alert`, sincronizado em `mls-102053-temp`) expôs um defeito do
`extractMlClassesFromTs` que **degradou o resultado**, e o seu espelho.

O render constrói três famílias por interpolação:

```ts
`ml-modal-alert-${this.presentationState}`   // -entering, -closing, -visible
`ml-modal-alert-type-${kind}`                // -error, -info, -success, -warning
`ml-modal-alert-position-${this.position}`
```

O regex `ml-[a-z0-9]+(?:-[a-z0-9]+)*` para no `$`, então cada família contribuía o **prefixo
sem o hífen final** — `ml-modal-alert-type` — que passa a parecer classe literal. Resultado: o
inventário ficou errado nos DOIS sentidos, e ele é ao mesmo tempo o `{{mlInventory}}` mostrado
ao modelo E a lista que o check `unknown_classes` cobra.

- **continha** `ml-modal-alert` e `ml-modal-alert-type`, que o render nunca emite;
- **omitia** `ml-modal-alert-type-error`, `-entering` e as outras 4, que ele emite.

O que custou, medido nos artefatos do run: a tentativa 1 estilizou as 6 classes corretamente, o
gate a reprovou como "inventadas", e a tentativa 2 trocou por
`.ml-modal-alert-panel[aria-label="info notification"]` — **seletor ancorado em prosa em inglês
traduzível**, num projeto com decisão de i18n por cópia — e perdeu o styling dos estados
`entering`/`closing`. E o espelho passou: o arquivo final tem `.ml-modal-alert { … }`, regra
morta que o check aceitou porque o prefixo estava no inventário.

**O conserto:**

- `moleculeInspect.ts` — novo `extractMlClassPrefixes()` devolve as famílias **com o hífen
  final** (é o que distingue família de classe literal). O `extractMlClassesFromTs()` passa a
  remover o artefato de prefixo, a menos que o mesmo nome ocorra também como literal de verdade
  (`occursAsLiteralClass()`).
- `gate.ts` — `unknown_classes` aceita literal **ou** variante de família; e o código novo
  `family_prefix` reprova quem estiliza o prefixo pelado, que é a regra morta.
- `agentNm2Less.ts` — o `{{mlInventory}}` passa a listar as famílias como
  `` `.ml-modal-alert-type-*` (family: the render appends the variant) ``, para o modelo saber
  que a família existe E que o sufixo é dinâmico.

**Verificado contra os artefatos reais do run:** reavaliando a tentativa 1, `unknown_classes`
cai de 6 para **0** e o `family_prefix` pega `ml-modal-alert` — ou seja, ela seria reprovada
pelo motivo certo (uma regra morta) em vez do errado. Reavaliando o arquivo final,
`family_prefix` pega a regra morta que ficou gravada.

**Não resolve a interpolação para valores concretos** (`${this.presentationState}` → as 4
variantes). Daria inventário exato, mas exige ler a união de tipos do campo — e o `${kind}` vem
do retorno de um método. É type-checking do render: frágil e desproporcional. O risco residual
da abordagem por prefixo é aceitar `.ml-modal-alert-type-banana`, que é inofensivo (a regra só
não faz nada).

Compatibilidade: o `n4-render/gate.ts` só usa `mlClasses.length`, e a amostra `GOOD` do teste
não tem interpolação — mesma saída.

## 2026-09-02 — o vocabulário do modo NEUTRAL virou os PAPÉIS do design system

A folha base passou a consumir os papéis que o `designSystem.ts` do projeto define
(`--surface-bg`, `--text-strong`, `--button-primary-bg`, `--status-error-bg`…) em vez do
vocabulário `--ml-*`. Motivo: o `--ml-*` não tem lugar no `designSystem.ts`, então uma folha
escrita só nele **nunca respeita o tema do cliente** — o `getCssVars()` do runtime emite
`--<papel>` em `:root`, e nada emitia `--ml-*`. Medições e evidência em `todo/moleculetokens/`.

**O que mudou aqui:**

- `NM_NEUTRAL_TOKEN_VOCABULARY` (a tabela `--ml-*` com contagens) foi **removida** e substituída
  pela skill compartilhada `skills/tokenVocabulary`, que o `agentImproveMolecule2/i3-edit` também
  recebe — criar e consertar passam a seguir uma regra só.
- O exemplo do modo NEUTRAL virou `var(--text-strong, #1c1b1f)` / `var(--surface-bg, #ffffff)`.
- **Gate, `token_consumption`:** exigia `var(--ml-`. Isso **reprovaria uma folha correta** — dos
  2 grupos já migrados, o `groupnotifyuser` tem 122 sítios de papel do DS e só 24 de `--ml-*`, e
  uma molécula sem holdout nenhum teria zero. Passou a exigir `var(--<qualquer token>`, que é o
  que o check sempre quis defender ("aparência vem de token, não de literal"). Verificado nos 4
  casos: folha migrada real ✅, folha só-DS ✅ (antes reprovava), cor literal solta 🔴, token
  nenhum 🔴 — o check **não** afrouxou.
- `color_literal` **não precisou mudar**: o `bareColorLiterals()` já removia `var(--<qualquer>)`,
  não só `var(--ml-`.

O modo THEMED segue intacto: a variante define os próprios `--ml-*` com os valores do tema, é
auto-contida e vive sob outra tag (`...-brutal`), então os dois vocabulários coexistem de propósito.

O nome do papel é validado fora do gate, por `harness/check-ds-tokens.mjs` (papel fora do
`DEFAULT_TOKENS_TEMPLATE` é reprovado como `DESCONHECIDO`).

## 2026-07-29 — created (control item 3.7)

Gate covers 15 codes with 22 tests, and is SPLIT in two halves because the two validated corpora
disagree. Both halves were measured before the code was written.

**The finding that shaped the step:** applying the neutral "every colour goes through a token" rule to
a themed sheet would reject **84 of the 84** validated themed sheets of mls-102054/102055 — a themed
sheet writes `box-shadow: 4px 4px 0 #000000` because those are the theme's values. So `color_literal`
and `token_consumption` apply only when the project has NO theme, while `tokens` and `motion` (the same
two checks the sibling `v3-less` gate enforces in production) apply only when it HAS one.

Neutral corpus (147 base sheets of mls-102040):

| fact | measured | consequence |
|---|---|---|
| DEFINE `--ml-*` tokens | 0 / 147 | THEMED-only rule |
| CONSUME `var(--ml-…)` | 146 / 147 | `token_consumption` in neutral mode |
| `transition` | 51 / 147 | THEMED-only rule |
| colour literal outside a token | 10 / 147 | a defect (mostly one hardcoded red focus ring) → rejected in neutral mode |
| `!important` | 41 / 147 | a PATTERN → **not** a gate code, and the shared skill was corrected |
| universal selector / `:host` | 1 and 0 / 147 | bans stand |

**A bug a test caught in the shared detector:** `bareColorLiterals` flagged a themed sheet's own token
DEFINITIONS (`--ml-surface: rgba(255,255,255,.08)`) — the one place a literal obviously belongs. Custom
property definitions are now excluded, alongside `var()` fallbacks, and the neutral calibration was
re-run afterwards (still 10/147).

Also in this batch (shared, decision D3/Q6 discipline):

- `shared/moleculeInspect.ts` created with the pure inspectors both stylesheet gates need —
  `extractMlClassesFromLess`, `extractMlClassesFromTs`, `hasUniversalSelector`,
  `setsPositionOrOverflow`, `balancedBlockBody`, `bareColorLiterals`, `extractAbsoluteMlClasses`,
  `declaresPortal`. Each carries a subtlety that must not diverge between copies (the nested-block
  selector regex, `::before`/`::after` overlays being allowed to position themselves, quoted-strings-
  and-flat-arrays-only for the absolute heuristic).
- `agentNewMoleculeVariant` migrated in the SAME batch: `vOrigin` re-exports
  `extractMlClassesFromLess`/`extractAbsoluteMlClasses` from shared and its `v3-less` gate imports
  `hasUniversalSelector`/`setsPositionOrOverflow`. Its 32 tests stayed green.
- `n4-render`'s `collectMlClasses` is now the shared `extractMlClassesFromTs`, so the subset check here
  and the discipline check there cannot disagree about what the render emits.

## 2026-07-30 — `&.classe` no nível 1 é CSS morto (A4), e o `.less` passou a compilar (A5b)

**`host_anchored_class`.** A folha gerada escreveu
`groupviewtable--ml-data-grid-33 { &.ml-disabled { opacity: … } }`. `&` no primeiro nível é o
próprio host — e o Lit renderiza DENTRO do host, então uma classe que o render emite cai num
elemento interno e a regra nunca casa: o estado `disabled` ficou sem nenhum efeito visual.

A medição me corrigiu no caminho. Eu havia afirmado que 12 moléculas temáticas tinham o mesmo CSS
morto; ao contar profundidade, são **0 no nível 1** e **49 no nível 2+**, onde `&` é o seletor
interno que envolve (`.ml-input-container { &.ml-disabled { … } }`) e é perfeitamente legítimo. Por
isso a regra é só de nível 1. Escape hatch: se o render põe a classe no host via
`classList.add/toggle`, a folha está certa e a regra não dispara — nenhuma molécula faz isso hoje
(0 de 231), mas o invariante é "o host recebe essa classe?", não "nunca use `&`".

**Compilação.** O `.less` era escrito às cegas. Erro de sintaxe em LESS compila para nada e a
molécula renderiza sem estilo — falha que sobrevive a uma revisão visual. Agora escreve, chama
`compileStorLess` (novo em `helpers/nmFs.ts`, via `mls.l2.less.compileStyle` → `styleResults.errors`)
e os erros entram no gate como código `compile`.

## 2026-07-31 — o modo NEUTRO ganhou o vocabulário de tokens (A7)

**O que parou o pipeline.** `n5-less failed after retry: color_literal: rgba(59,130,246,0.06),
rgba(59,130,246,0.08), rgba(59,130,246,0.13)`. O gate estava CERTO — testei `bareColorLiterals` contra
8 formas (dentro de `var`, `var` dentro de `var`, `linear-gradient`, `box-shadow` multi-valor, `var`
com segundo argumento composto) e nenhuma acusa; só literal genuinamente fora de token acusa. O modelo
escreveu os `rgba()` crus.

**Causa: assimetria entre os dois modos do `buildModeSection`.** O ramo TEMÁTICO recebe a tabela de
tokens do tema via `loadThemeSkill`. O ramo NEUTRO exigia "todo valor de aparência passa por um token"
e mostrava DOIS exemplos, sem nunca dar o vocabulário. Conformidade por sorte, e os dois runs de 31/07
mostram as duas faces: um inventou `var(--ml-primary-dim-bg, rgba(...))` e PASSOU (envolver é tudo o
que o gate checa), o seguinte escreveu cru e reprovou duas vezes.

O token que faltava já existe: `--ml-primary-container`, que é o que
`groupselectmany/ml-table-multi-select.less:19` usa para linha selecionada. Não existe nenhum
`--ml-primary-dim*` — a convenção da biblioteca é `<papel>-container` / `<papel>-dim`.

**Aplicado:** `NM_NEUTRAL_TOKEN_VOCABULARY` em `agentNm2Less.ts`, injetado no ramo neutro. Tabela
agrupada por papel, com o número de ARQUIVOS que usam cada token, e `--ml-primary-container` marcado
explicitamente como "o fundo tingido de linha/item SELECIONADO". Todos os 39 nomes citados foram
verificados: existem de fato nas folhas base.

**Uma questão que estava aberta no controle ficou resolvida pela medição: o vocabulário NÃO pode ser
fechado.** Contando por arquivo, a cauda são tokens usados em UM arquivo só, e são específicos por
molécula de propósito — `--ml-nrs-*` do number-range-slider, `--ml-gradient-1..7` dos gráficos,
`--ml-spinner-duration`. Um gate rejeitando token fora de lista reprovaria molécula boa. Então o gate
segue aceitando token inventado, agora com justificativa medida em vez de dúvida, e o prompt ensina a
convenção: use o token do papel quando existir; se precisar de algo novo, prefixe com a molécula
(`var(--ml-nrs-knob-size, 20px)`).

**Ressalva.** É a quinta instrução adicionada a este prompt, e o A10 acabou de mostrar que instrução
não é mecanismo (o modelo inventou o `nothingAttr` DEPOIS de a skill proibir explicitamente). Aqui a
expectativa é melhor fundamentada, porque o problema é falta de INFORMAÇÃO — ele não sabia que
`--ml-primary-container` existe — e não desobediência. A rede continua sendo o `color_literal`.
