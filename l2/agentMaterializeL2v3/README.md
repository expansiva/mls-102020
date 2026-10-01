# agentMaterializeL2v3

Novo materializador L2 (ver `todo/agent-materializel2-v3/00_leiaPrimeiro.md`).

Estado: `helpers/` implementado; root, `entry10`, `input20` (itens 1, 2, 3 e 5), `contracts30` e `finalize90` implementados (m3_02, 01/10); `shared40` e `pages50` ainda não; `spec.md` e `flow.json` seguem em rascunho v0 para o resto.

## Proveniência (origem = `mls-102020/l2/agentMaterializeL2/helpers/` no commit `301a76dc`)

| arquivo v3 | origem | tipo |
|---|---|---|
| `m3MlsImports.ts` + teste | `cfeMlsImports.ts` + teste, inteiros | copiado |
| `m3CompileRepair.ts` + teste | `cfeCompileRepair.ts` + teste (tipos `Cfe*` viram `M3*`) | copiado |
| `m3ProjectTsc.ts` + teste | `cfeProjectTsc.ts` + teste (lista do teste de inglês trocada) | copiado |
| `m3TsLineBreaks.ts` + teste | `cfeMaterializeCore.ts:2221-2435`; teste de `nodejsFormatTs.test.ts:30,51` | copiado |
| `m3MlsHeader.ts` + teste | `cfeMaterializeCore.ts:2437-2443,2601-2609` | copiado |
| `m3WriteIfChanged.ts` + teste | `cfeWorkspaceArtifacts.ts` (sem a varredura de órfãos) | parcial |
| `m3Studio.ts` + teste | `cfeMaterializeStudio.ts` (sem mtime, pageTests, DTS, preload v1) | parcial |
| `m3Receipt.ts` + teste | `cfeMaterializeReceipt.ts`, sem `PipelineItem` | adaptado |
| `m3Trace.ts` + teste | `cfePipelineTrace.ts` (`describeAgentCommand`, `writeJsonStor`), resto segundo D-006/D-007 | novo |
| `m3Intents.ts` | `agentDefsL2/helpers/d2Intents.ts` @ `301a76dc` (nomes `D2` viram `M3`) | copiado |
| `m3Invocation.ts` + teste | `agentDefsL2/helpers/d2Core.ts:88-160` @ `301a76dc` (parse de mensagem e de step; flags novas) | adaptado |
| `m3CompileProof.ts` + teste | `agentDefsL2/steps/finalize60/compile.ts` (`compileD2FinalSources`) @ `301a76dc` | copiado |
| `m3CompileProof.readStor` | cai para `getContent()` em arquivo novo (D-012); difere do `compileD2FinalSources` original | adaptado |
| `agentMaterializeL2v3.ts` | estrutura de `agentDefsL2/agentDefsL2.ts` @ `301a76dc` | adaptado |

## Decisões que valem aqui

- D-002: o que vem do agente atual é copiado para esta pasta, nunca promovido a `l2/helpers/`.
- D-004: só se importam helpers que já existem (`l2/helpers/*`, `mls-102035/l2/solution/*`); helper novo não se cria fora desta pasta.
- D-007: o trace nunca apaga nada; cada run tem a sua pasta `run_<UTC>`.
