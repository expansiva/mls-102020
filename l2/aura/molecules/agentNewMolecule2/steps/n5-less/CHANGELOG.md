# n5-less — CHANGELOG

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
