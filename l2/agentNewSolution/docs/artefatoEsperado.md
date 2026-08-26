# artefatoEsperado — o que um módulo gerado pelo ns DEVE ter no l4 (e no l5)

> Modelo de expectativa para validação "expectativa × realidade". Escrito 24/08/2026 a partir do
> código real (`helpers/ns4Fs.ts` + call-sites), não do `flow.json` — o bloco `artifacts` do
> `docs/flow.json` está desatualizado (ver §5). Par deste arquivo no módulo gerado:
> `l4/<moduleName>/README.md` do projeto validado.

## 1. O que o agente é

O ns transforma um prompt em linguagem natural num grafo L4 **permanente** de contratos de produto
(jornadas → acesso → ontologia → regras → composição → usecases/workflows → telas → formato
clássico), com 6 checkpoints humanos (E1–E6) e 4 etapas automáticas (E7–E10; E9 e E10 são
zero-LLM). O E10 fecha emitindo os contratos de entrega L5. O l4 é a intenção congelada que o CB
(backend) e o CF (frontend) consomem.

## 2. Inventário esperado — `l4/<moduleName>/`

### Permanentes tipados (formato A: `import type` + `as const satisfies Ns4X`)

| arquivo | dono | conteúdo |
|---|---|---|
| `module.defs.ts` | E1 | identidade, estratégia, escopo, `productLanguages` |
| `journeys/<journeyId>.defs.ts` + `journeys/index.defs.ts` | E2 (E7 reescreve realized) | jornadas com steps `{stepId, kind, entity, ...}` |
| `access/access-matrix.defs.ts` | E3 (E7 reescreve realized) | perfis, authorities `domain:code`, grants |
| `ontology/<EntityId>.defs.ts` + `ontology/index.defs.ts` | E4 | entidades: campos, enums, lifecycle, `storage.target`, `enumLabels`/`lifecycleLabels` |
| `rules/rules.defs.ts` | E5 | uma descrição humana por ruleId referenciado |
| `composition/additional-capabilities.defs.ts` | E6 | capacidades horizontais (lista vazia é válida) |
| `usecases/<ucId>.defs.ts` + `index` | E7 | usecases N→1 dos steps de jornada |
| `workflows/<wfId>.defs.ts` + `index` | E7 | workflows por lifecycle alcançável |

### Permanentes clássicos (formato B: JSON `as const` SEM import de tipo)

| arquivo | dono | conteúdo |
|---|---|---|
| `workspace-model.defs.ts` (raiz) | E8 | O MODELO: única fonte de decisão de tela |
| `workspaces/<wsId>.defs.ts` | E9 | transposição fiel por workspace |
| `operations/<opId>.defs.ts` | E9 | uma operação por arquivo, com `accessPattern`, `inputs`, bloco `mdm?` |
| `siteMap.defs.ts` (raiz) | E9 | navegação |

### Contratos TS (formato C: TS de verdade, não JSON)

- `contracts/<workspaceId>--<bffId>.defs.ts` — `export interface <Bff>Input/Output` +
  `export const <bffId>Route = '<module>.<ws>.<bff>' as const`. Separador é `--` (nunca ponto).

### Efêmeros — `pipeline/`

`pipeline.json` (estado + **auditoria `useCases`/`useCasesDropped`**, ver §4.8), drafts de
e2/e3/e4/e5/e6/e7/e8, `e4-entities/`, `e7-usecases/`, relatórios de validação. Descartável, exceto:
a auditoria do E9 lê `e7-usecases/*-draft.json` — sem pipeline, a auditoria fica ausente (não
`degraded`).

### L5 (E10)

`l5/config.json` · `l5/<module>/todoFrontend.defs.ts` · `todoBackend.defs.ts` · `process.defs.ts` ·
`l5/project.json` (só complementa chaves ausentes). E10 **não** escreve `publish*.conf` nem
`.conf.example` — a config de publish local/remoto fica fora do `l5`.

## 2b. Modo de acompanhamento (`reviewPolicy.mode`, escolhido na primeira tela)

Fica no artefato do módulo e vale para os checkpoints **E2–E6** (o E1 sempre abre). Default `smart`.

| modo | comportamento |
|---|---|
| `guided` | abre todos |
| `smart` | abre quando há finding A, decisão Type B / relevante, **ou quando a etapa não tem sinal** |
| `automatic` | não abre nenhum (equivale ao `/fast` no prompt) |

Decisão única em `helpers/ns4ReviewPolicy.ts`. Regra dura: **sem sinal, abre** — ausência de
vocabulário A/B numa etapa não é prova de que não há o que revisar. Hoje só o E2 tem sinal de
verdade; E3, E4, E5 e E6 abrem por ausência. Quando `smart` pula, o motivo é gravado ao lado de
`approvedBy: 'auto'` — nunca pula em silêncio.

## 3. Contagens de sanidade (como conferir rápido)

- nº de `workspaces/*.defs.ts` = nº de workspaces do `workspace-model.defs.ts`;
- nº de `operations/*.defs.ts` = nº de operações do modelo E8 (jornada + síntese de catálogo);
- nº de `contracts/*` = nº de `bffCalls` do modelo;
- **toda entidade de catálogo tem 5+ operações**: `list`, `get` (novo 24/08, `kind: getById`),
  `create`, `update`, e `delete` OU o par `inactivate`/`reactivate` (se `storage.target: mdm`);
- todo `operationId` do `usecases/index` aprovado no E7 aparece em `operations/` OU está declarado
  em `pipeline.json → useCasesDropped.notEmitted` com motivo.

## 4. Invariantes que o CB e o CF esperam (as que quebram geração quando violadas)

1. **shortName nunca tem ponto** (`assertNs4ShortName`) — por isso `--` e `-draft`.
2. **`from` projetado = `"<operationId>.<inputId>"`** — único caminho rastreado pelos dois
   consumidores; em lista, membro vira `$items.<fieldId>`.
2b. **`inputId` = `fieldId`** do `fieldRef` (`taskId`, não `taskTaskId`). A forma
    `<entidade><Campo>` só quando dois inputs da mesma operação compartilham o fieldId.
3. **`mdmType` = `<lowerCamelModule>.<PascalEntity>`**, só em entidade `storage.target: mdm`.
4. **`storage.target` fechado**: `mdm | moduleDatabase | derived | external | embedded`. `mdm` ⇒
   nunca `delete`; nasce `inactivate/reactivate`.
5. **Bloco `mdm` da operação**: `{ lifecycle?, activeFilterInput?, situationOutput? }`; `getById`
   de MDM resolve registro inativo (integridade de histórico).
6. **`accessPattern.kind` fechado**: `list | getById | create | update | delete | transition |
   commandInput`. Lifecycle MDM mantém `kind: update` de propósito.
7. **`get<Entity>` por entidade de catálogo** (24/08): `qryGet<Entity>`, id obrigatório, registro
   completo, mesmo sem consumidor (é para o harness de consulta via LLM). Jornada vence empate de
   `operationId`.
8. **Auditoria E7→operations** (24/08): perda vira `useCases: 'degraded'` +
   `useCasesDropped {notEmitted[], approved, emitted, reasons}` no `pipeline.json`; cobertura
   total NÃO deixa campo nenhum. Nunca falha o step.
9. **Enums**: valores são códigos `en` estáveis (`^[a-z][a-zA-Z0-9]*$`, gate anti-pt no E4);
   tradução vai em `enumLabels` (campo, não-lifecycle) / `lifecycleLabels` (entidade), `{code,label}[]`.
   Campo enum sem rótulo no e4 novo é preenchido por backfill (`inProgress` → `In progress`) +
   `systemDecision` não-bloqueante. Status não duplica: só `lifecycleLabels`. O fio carrega o
   CÓDIGO, nunca o rótulo.
10. **Emissão canônica**: rerun sem mudança é byte-idêntico (sem timestamps).
11. `actors` (ids E1/E2) ≠ `profileRefs` (perfis E3) — trocar fabrica scope que o collab-auth
    nunca emitiu.
12. **Dono do registro = `actorSession`** (24/08): input cujo fieldRef é o handle de dono
    (`ownerUserId` / `ownerId` / …) de entidade com grant E3 `dataScope.mode: 'own'` nasce
    `source: 'actorSession'`. A tela não pede id de usuário; o gerador de testes não inventa
    literal. Pessoa que o ator escolhe (atribuir a outra) continua `userInput`.

## 5. Onde a documentação MENTE (conferido 24/08 — não usar como expectativa)

- `docs/flow.json → artifacts` promete `navigation/index|store|notifications.defs.ts` e
  `workspaces/index.defs.ts`: **não existem writers**. `steps/e9/readme.md` está obsoleto inteiro.
- `flow.json` usa separador `.` nos nomes (`contracts/{ws}.{fn}`, `e2-journeys.draft.json`); o
  código usa `--` e `-draft`.
- `steps/e9/gate.ts` não existe (validação inline); `steps/e8/gate.ts` chama-se `modelGate.ts`.
