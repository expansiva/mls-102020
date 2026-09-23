# d2_18 — regeneração com contexto completo

Pacote completo da live/no-op do `agentDefsL2` para `102047/agendaClinica`. A supervisão executou
as rodadas vivas; o executor fechou os verificadores e gates sem rodar `collabmsg`, live,
materialização, commit ou push.

## Evidência de entrada

- `preflight.json`: HEADs/status, commits aceitos, plano atual, descoberta 102040 por dependência,
  hashes dos inputs L4, gerador, skill shared, runtime 102029 expandido, design system real,
  skills page11 e catálogo molecular.
- `inventory-before.json`: defs/recibos existentes antes da live. Os manifests ainda são
  `shared-v1`/`pages-v4`; por isso não podem produzir no-op contra `shared-v2`/`pages-v6`.
- `l1-before.json`: inventário completo do L1 concorrente. `verify.mjs` exige hash, bytes e mtime
  idênticos depois da geração.
- `focused-before.log`, `typecheck-before.json`, `runner-before.log`: gates anteriores à live.
- `legacy-rejection.log`: controle positivo; o verificador atual rejeita os recibos antigos.
- `live-failed-v1.json`: primeira rodada viva, task `20260923163335.1001`, custo zero; falha em
  `shared40` ao resolver um arquivo runtime diretamente sob `l2/`.
- `hotfix-shared-context-gates.json`: correção do parser comprovada no adaptador produtivo para
  arquivo runtime na raiz de `l2/` e contrato local em subpasta; focados 14/14 e typecheck zero.
- `live-failed-v2.json`: segunda rodada viva, task `20260923164004.1001`; interação final 0,0859 e
  rodada total 0,8894; cinco das
  seis unidades shared foram escritas e `profissionais` esgotou o reparo por precondições livres.
- `hotfix-shared-preconditions-gates.json`: prompt/schema/gate passam a expor e exigir stateKeys
  determinísticos por ação; reproduz rótulos, `localizarPaciente`, `localizarProfissional` e `base`;
  focados 19/19 e typecheck zero.
- `live-generation-v3.task.json`/`.trace.log`: terceira live terminou `done`; os defs e receipts v1
  ficaram no 102047.
- `molecular-mismatch-v3.json` e `live-generation-v3-diagnosis.json`: comparação integral prova
  38/38 sources byte-iguais e diferença somente em `discoveryHash`/`contextHash`; a preimagem
  produtiva é irrecuperável no v1, enquanto o vetor local usado pelo verificador fica explícito.
- `hotfix-molecular-receipt-v2-gates.json`: receipt v2 inclui e valida
  `directDeps`/`resolvedDeps`/`candidates`; focados 14/14 e typecheck zero. A live v3 é rejeitada
  nominalmente por versão e precisa ser regenerada, não reinterpretada.
- `live-generation-v4.task.json`/`.trace.log` e `live-failed-v4.json`: quarta live falhou antes de
  LLM/escrita porque o runtime incluiu o próprio 102047 em `directDeps`.
- `hotfix-molecular-canonical-vectors-gates.json`: receipt v2 agora sela vetores canônicos; self é
  removido dos dois vetores de dependência e duplicatas são removidas preservando a primeira ordem.
  `candidates` preserva a semântica local e só deduplica. Focados 15/15 e typecheck zero.
- `live-generation-v5.task.json`/`.trace.log`: quinta live terminou `done` com receipts v2.
- `inventory-generation-v5.json`, `verification-generation-v5.json` e
  `molecular-generation-v5.json`: geração completa aprovada — 24 defs, 36 descrições,
  80 recomendações, 18 itens, seis receipts moleculares e L1 preservado. O audit registra grupos
  por device, união canônica e receipt; em `consultas_recepcionista`, desktop usa `groupViewTable`,
  mobile usa `groupViewData` e a união de sete grupos coincide com o receipt da página.
- `live-noop.task.json`/`.trace.log`, `inventory-noop.json`, `verification-noop.json` e
  `molecular-noop.json`: task `20260923171824.1001` done, zero LLM/custo/escrita observada; os 24
  defs, bytes, hashes e mtimes permaneceram invariantes, com seis receipts e L1 preservado.
- `final-review.json`: custos brutos v1–v5/no-op (total 7,0931), comparação GL/SH/PG e exemplos
  concretos shared/page. `verification-noop.json:examples` conserva os exemplos completos.
- `focused-final.log`, `typecheck-final.json`, `runner-final.log` e `final-gates.json`: fechamento
  com 167 focados verdes, typecheck L1/L2/other 0/0/0 e runner 195 arquivos/12 stubs mantendo as
  mesmas 12 falhas externas nominais.
- `integrity-final.json`: HEADs finais, diff-check limpo nos dois repositórios, inventários
  generation/no-op idênticos e registro explícito das áreas preservadas.

## Geração pela supervisão

Guardar nesta pasta o task JSON e trace brutos de cada rodada, incluindo custo. Não editar defs
produzidos. Não materializar `.ts`. Depois da geração, da raiz de `mls-102020`:

```sh
node l2/certificacao/runs/d2_18/verify.mjs \
  inventory-generation.json verification-generation.json '' molecular-generation.json
```

O verificador exige 24 defs, 18 itens acíclicos e nenhum campo `agent`; shared com skill
`genD2SharedTs`, contrato primeiro e runtime lógico `_102029_.d.ts` segundo; page11 com shared
primeiro e `l2/designSystem.ts` segundo. Ele lê conteúdo real da skill, das cinco fontes 102029,
do design system, das categorias e dos usageContracts. Os seis recibos moleculares são
recalculados contra as fontes atuais e devem atribuir o catálogo 102040 à dependência do 102047.

Depois da invocação no-op:

```sh
node l2/certificacao/runs/d2_18/verify.mjs \
  inventory-noop.json verification-noop.json inventory-generation.json molecular-noop.json
```

A segunda forma também exige conteúdo, bytes, hashes e mtimes invariantes. Em ambas, o inventário
L1 deve permanecer byte a byte e mtime a mtime idêntico ao preflight.

## Limite da conclusão

A prova fecha GL-01, SH-01/02/03, PG-01 e a proveniência/reuse de PG-02. Não declara o aplicativo
integralmente aprovado: `attendance-note-requiredness` e a revisão humana dos inputs shared seguem
como decisões separadas.
