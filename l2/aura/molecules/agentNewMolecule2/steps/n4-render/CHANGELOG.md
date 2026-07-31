# n4-render — CHANGELOG

## 2026-07-29 — created (control item 3.6)

Gate covers 12 codes with 17 tests. The appearance rules were **measured over the 147 real
`ml-*.ts` molecules of mls-102040** before being written, not asserted:

| detector | fails | why that is the right calibration |
|---|---|---|
| `discipline` (no `ml-*` class) | 0 / 147 | it IS the library's discipline |
| `appearance_style` | 0 / 147 | `style=` appears in 28 molecules, always geometry or data-driven |
| `appearance_class` | 5 / 147 | `text-white` ×2, `border-white`, `bg-black`, `bg-black/70` — genuinely unthemeable spots |

What measuring changed versus what `flow.json` originally said ("no inline style with
color/background/border/shadow, no hex/rgb literal in the markup"):

- **`style=` is NOT banned** — 28 of 147 molecules use it for geometry. The ban became
  property-level AND literal-only, so `background-color:${item.color}` (the one data-driven colour in
  the library) stays legal.
- **hex is NOT banned outright** — all 5 molecules carrying hex are charts keeping a `palette` data
  array. Hex is rejected only where it styles markup.

**A bug the tests caught in my own detector:** `collectMlClasses` matched `ml-<name>` inside the
file's own path and inside its own tag, so the `discipline` check could never fail — a molecule with
zero semantic classes still had two "matches". The library calibration said 0/147, which read like
confirmation but was the bug. Fixed with a lookbehind `(?<![\w/-])`; the pinning test strips the
classes and asserts the failure, and the calibration was re-run afterwards (still 0/147, this time
for the right reason).

Other decisions:

- The file is written to disk BEFORE the gate, because compiling needs a model; a failed attempt
  leaves the content for the retry to read.
- The retry context carries `compilerResults.errors` **plus** the `prodDTS` of the molecule's `./`
  imports — the same assembly the old `agentNewMoleculeFix` did.
- A second failure fails the step, so `n5-less` and `n6-demo` never run against a molecule that does
  not compile.

## 2026-07-30 — o gate estava cego por corrida de compilação (primeiro run no Studio)

O primeiro run entregou uma molécula que **não compilava** — o modelo escreveu `const text A = ...`,
com espaço no identificador — e o `.less` e o demo foram gerados em cima dela. O retry nunca foi
acionado, porque o gate leu zero erros.

Não era compilador permissivo: `getDiagnostics` (`static/libs/mls.js:6803`) chama
`getSyntacticDiagnostics` **primeiro** e retorna já nesses erros. Era corrida.

`compile()` (`static/libs/mls.js:6527`) curto-circuita em
`modelVersion === model.getVersionId() && !modelNeedCompile`, e `initCompilerResults` (linha 6730)
grava exatamente esse estado — com `errors: []` — no **início** da compilação, antes de os
diagnósticos chegarem. Enquanto isso, `writeStorTextAtomic` passava `awaitCompile=false` ao
`createStorFile`, e `createModel` dispara `compileAndPostProcess` **sem await**. Resultado: duas
compilações concorrentes do mesmo model; a que o `compileMolecule` esperava caía no curto-circuito e
devolvia `true` com `errors` vazio.

Corrigido em `helpers/nmFs.ts`: `awaitCompile` passa a acompanhar `needCreateModel`, serializando a
primeira compilação — a mesma sequência que o fluxo antigo já usava
(`agentNewMoleculeMaterialize.ts:271` passa `(true, true, true)`), e que era o motivo de o
`hasErrors` dele ser confiável.

Só a PRIMEIRA tentativa corria risco: no retry, `writeStorTextAtomic` usa `model.setValue(content)`,
o version id do monaco muda e o curto-circuito não dispara. Casa com o observado.

Sem cobertura por unit test (depende do `mls.l2.typescript`). O aceite é injetar um erro de sintaxe
deliberado no retorno do modelo e verificar que o passo reprova em vez de escrever `.less` e demo.
