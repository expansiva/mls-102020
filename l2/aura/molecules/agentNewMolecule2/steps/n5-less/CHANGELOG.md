# n5-less — CHANGELOG

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
