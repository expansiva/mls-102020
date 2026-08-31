/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeFinalizeVerdict.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * D3/D2 do run01 (102047, 28/ago).
 *
 * `materialize-phase-pages-verify-summary.json` fechou com `allClear: false` e três itens `blocked`
 * (`materialize-taskcatalogue-l2-page`, `-page21-`, `-page31-`), e mesmo assim o run terminou
 * `completed` com `pagesDone` listando `taskCatalogue`. O `tsc` acha 5 erros exatamente nesses três
 * arquivos. Este teste prova o elo que faltava: o veredito é legível pelo fechamento, com o outputPath
 * e o erro, e cada item sabe dizer de que página é.
 */

const PROJECT = 102047;
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

// Recorte VERBATIM do veredito que o run01 deixou em
// _102047_/l2/todo/trace/frontend-materialize-verify/materialize-phase-pages-verify-summary.json.
const RUN01_PAGES_VERDICT = {
  savedAt: '2026-08-28T00:33:26.884Z',
  phase: 'materialize-phase-pages-verify',
  lastRoundPlanId: 'materialize-phase-pages-verify-v2-v3-v4',
  attempt: 4,
  allClear: false,
  blockedCount: 3,
  repairedCount: 0,
  declaredCount: 6,
  passedCount: 0,
  passed: [],
  repaired: [],
  declared: [],
  brokenCount: 3,
  broken: [
    {
      planId: 'materialize-taskcatalogue-l2-page',
      outputPath: '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts',
      errorCount: 1,
      warningCount: 3,
      firstError: 'file://server/_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts - TS2554 - Expected 1 arguments, but got 0.',
      severity: 'blocked',
    },
    {
      planId: 'materialize-taskcatalogue-page21-l2-page',
      outputPath: '_102047_/l2/todo/web/desktop/page21/taskCatalogue.ts',
      errorCount: 3,
      warningCount: 3,
      firstError: "file://server/_102047_/l2/todo/web/desktop/page21/taskCatalogue.ts - TS2741 - Property 'createError' is missing",
      severity: 'blocked',
    },
    {
      planId: 'materialize-taskcatalogue-page31-l2-page',
      outputPath: '_102047_/l2/todo/web/desktop/page31/taskCatalogue.ts',
      errorCount: 4,
      warningCount: 3,
      firstError: 'file://server/_102047_/l2/todo/web/desktop/page31/taskCatalogue.ts - TS2554 - Expected 1 arguments, but got 0.',
      severity: 'blocked',
    },
  ],
  agent: 'agentCfeMaterializePhase',
};

// O veredito do shared do mesmo run: allClear true, um item apenas `declared`. Nada aqui acusa ninguém.
const RUN01_SHARED_VERDICT = {
  phase: 'materialize-phase-shared-verify',
  attempt: 4,
  allClear: true,
  broken: [],
  declared: [{ planId: 'materialize-taskcatalogue-l2-shared', outputPath: '_102047_/l2/todo/web/shared/taskCatalogue.ts', severity: 'declared' }],
};

function storFile(folder: string, shortName: string, content: unknown): Record<string, unknown> {
  const file: Record<string, unknown> = { project: PROJECT, level: 4, folder, shortName, extension: '.json', status: 'changed' };
  file.source = JSON.stringify(content);
  file.getContent = async () => String(file.source);
  return file;
}

const keyOf = (info: { folder: string; shortName: string; extension: string }): string => `${info.folder}/${info.shortName}${info.extension}`;

async function loadModule(): Promise<any> {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'en' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  const files: Record<string, any> = {};
  const put = (file: Record<string, unknown>): void => { files[keyOf(file as any)] = file; };
  put(storFile('todo/pipeline/trace/l2/frontend-materialize-verify', 'materialize-phase-pages-verify-summary', RUN01_PAGES_VERDICT));
  put(storFile('todo/pipeline/trace/l2/frontend-materialize-verify', 'materialize-phase-shared-verify-summary', RUN01_SHARED_VERDICT));
  // outro módulo do mesmo projeto: não pode contaminar a leitura de `todo`
  put(storFile('outro/pipeline/trace/l2/frontend-materialize-verify', 'materialize-phase-pages-verify-summary', RUN01_PAGES_VERDICT));
  // o arquivo de achados que o verify grava para o slot de repair (pré-criado: o writer só cria quando
  // não existe, e criar de verdade puxaria o libStor do Studio)
  put(storFile('todo/pipeline/trace/l2/frontend-materialize-findings', 'materialize-taskcatalogue-l2-page', {}));
  g.mls = {
    ...(g.mls ?? {}),
    actualProject: PROJECT,
    events: g.mls?.events ?? { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      ...(g.mls?.stor ?? {}),
      files,
      getKeyToFile: keyOf,
      localStor: { setContent: async (file: any, payload: { content: string }) => { file.source = payload.content; } },
    },
  };
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
}

void test('D3: o fechamento lê os 3 itens ainda bloqueados do run01, com outputPath e erro', async () => {
  const { readUnresolvedMaterializeItems } = await loadModule();
  const items = await readUnresolvedMaterializeItems('todo');
  assert.deepEqual(items.map((item: any) => item.planId).sort(), [
    'materialize-taskcatalogue-l2-page',
    'materialize-taskcatalogue-page21-l2-page',
    'materialize-taskcatalogue-page31-l2-page',
  ]);
  assert.equal(items[0].outputPath, '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts');
  assert.match(items[0].firstError, /TS2554/u);
  // o veredito do shared está allClear: um `declared` nunca acusa
  assert.equal(items.some((item: any) => item.planId.endsWith('-l2-shared')), false);
  // e outro módulo não entra
  assert.deepEqual(await readUnresolvedMaterializeItems('inexistente'), []);
  assert.equal((await readUnresolvedMaterializeItems('outro')).length, 3);
});

void test('R1/R2: item limpo pelo finalize sai de broken; o que continua quebrado não', async () => {
  const { absolveCleanItemsFromVerdict, rewriteMaterializeVerdictsNowClean, readUnresolvedMaterializeItems, unresolvedItemBelongsToPage } = await loadModule();
  const page11 = '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts';
  const page21 = '_102047_/l2/todo/web/desktop/page21/taskCatalogue.ts';
  // só o page11 foi de fato reparado nesta rodada — page21/page31 continuam blocked (D2)
  const next = absolveCleanItemsFromVerdict({ ...RUN01_PAGES_VERDICT }, new Set([page11]));
  assert.equal(next.brokenCount, 2);
  assert.equal(next.allClear, false);
  assert.equal(next.repairedCount, 1);
  assert.deepEqual((next.repaired as { planId: string }[]).map(item => item.planId), ['materialize-taskcatalogue-l2-page']);
  assert.equal((next.broken as { planId: string }[]).some(item => item.planId === 'materialize-taskcatalogue-l2-page'), false);
  // um ref que o gate NÃO tentou reparar (fidelidade Monaco) não é absolvido
  const untouched = { ...RUN01_PAGES_VERDICT };
  const unreproduced = absolveCleanItemsFromVerdict(untouched, new Set());
  assert.equal(unreproduced.brokenCount, 3);
  assert.equal(unreproduced, untouched);

  assert.equal(await rewriteMaterializeVerdictsNowClean('todo', new Set([page11])), 1);
  const leftover = await readUnresolvedMaterializeItems('todo');
  assert.deepEqual(leftover.map((item: { planId: string }) => item.planId).sort(), [
    'materialize-taskcatalogue-page21-l2-page',
    'materialize-taskcatalogue-page31-l2-page',
  ]);
  assert.equal(leftover.some((item: { outputPath: string | null }) => unresolvedItemBelongsToPage(item.outputPath, 'todo', 'taskCatalogue')), true);
  // page21 sozinho não tira a página de incompletePages: os outros genomas ainda bloqueiam
  assert.equal(leftover.some((item: { outputPath: string | null }) => item.outputPath === page21), true);
});

void test('R2: os três itens reparados pelo finalize esvaziam o veredito — a página volta a pagesDone', async () => {
  const { rewriteMaterializeVerdictsNowClean, readUnresolvedMaterializeItems, unresolvedItemBelongsToPage } = await loadModule();
  const nowClean = new Set([
    '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts',
    '_102047_/l2/todo/web/desktop/page21/taskCatalogue.ts',
    '_102047_/l2/todo/web/desktop/page31/taskCatalogue.ts',
  ]);
  assert.equal(await rewriteMaterializeVerdictsNowClean('todo', nowClean), 3);
  const leftover = await readUnresolvedMaterializeItems('todo');
  assert.equal(leftover.length, 0);
  assert.equal(unresolvedItemBelongsToPage('_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts', 'todo', 'taskCatalogue'), true);
});

void test('D2: cada item bloqueado sabe de que página é — taskCatalogue sai de pagesDone, taskHub não', async () => {
  const { readUnresolvedMaterializeItems, unresolvedItemBelongsToPage } = await loadModule();
  const items = await readUnresolvedMaterializeItems('todo');
  const belongs = (pageId: string): boolean => items.some((item: any) => unresolvedItemBelongsToPage(item.outputPath, 'todo', pageId));
  assert.equal(belongs('taskCatalogue'), true);
  assert.equal(belongs('taskHub'), false);
  assert.equal(belongs('monitorAndUpdateTaskStatus'), false);
  // um organismo de página dividida pertence à sua página; outro módulo, não
  assert.equal(unresolvedItemBelongsToPage('_102047_/l2/todo/web/desktop/page11/taskCatalogue_O2.ts', 'todo', 'taskCatalogue'), true);
  assert.equal(unresolvedItemBelongsToPage('_102047_/l2/todo/web/shared/taskCatalogue.ts', 'todo', 'taskCatalogue'), true);
  assert.equal(unresolvedItemBelongsToPage('_102047_/l2/outro/web/desktop/page11/taskCatalogue.ts', 'todo', 'taskCatalogue'), false);
  assert.equal(unresolvedItemBelongsToPage(null, 'todo', 'taskCatalogue'), false);
});

// D4.3 — o mecanismo que impede um hint vazio de virar uma geração de primeira passada. Um slot de
// repair carrega só {planId, defPath, itemId, attempt} e o gen só consegue recomputar compilador +
// higiene de template; os detectores de defs (sortBy, enum, selection control, bloco i18n, tag,
// contrato, tokens) chegam por este arquivo. Se o par save/read devolvesse [] em produção, o D4.3
// seria inerte e as guardas textuais continuariam verdes — por isso o round-trip real.
void test('T1: veredito intermediário allClear:false não barra; o final repaired tampouco', async () => {
  const { readBlockedMaterializePlanIds, saveMaterializeVerifySummary } = await loadModule();
  const shared = 'materialize-signercatalogue-l2-shared';
  await saveMaterializeVerifySummary(
    'todo',
    'materialize-phase-shared-verify',
    1,
    [],
    [{ planId: shared, defPath: '', outputPath: '_102047_/l2/todo/web/shared/signerCatalogue.ts', typecheck: 'failed', errors: ['does not compile'], warnings: [], severity: 'blocked' as const }],
    { declared: [], repaired: [] },
    false,
  );
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true })).has(shared), false);
  assert.equal((await readBlockedMaterializePlanIds(PROJECT)).has(shared), true);
  await saveMaterializeVerifySummary(
    'todo',
    'materialize-phase-shared-verify-v2-v3-v4',
    4,
    [{ planId: shared, typecheck: 'passed' }],
    [],
    { declared: [], repaired: [{ planId: shared, typecheck: 'passed' }] },
    true,
  );
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true })).has(shared), false);
  assert.equal((await readBlockedMaterializePlanIds(PROJECT)).has(shared), false);
});

void test('T1: três itens, um nunca converge — veredito final, dois passam, um blocked', async () => {
  const { saveMaterializeVerifySummary, readMaterializeVerifySummary, readUnresolvedMaterializeItems, readBlockedMaterializePlanIds } = await loadModule();
  const passed = [
    { planId: 'materialize-petitionlanding-l2-page', typecheck: 'passed' },
    { planId: 'materialize-signercatalogue-l2-page', typecheck: 'passed' },
  ];
  const broken = [{
    planId: 'materialize-taskcatalogue-l2-page',
    defPath: '_102047_/l2/todo/web/desktop/page11/taskCatalogue.defs.ts',
    outputPath: '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts',
    typecheck: 'failed',
    errors: ['TS2554 Expected 1 arguments, but got 0.'],
    warnings: [],
    severity: 'blocked' as const,
  }];
  await saveMaterializeVerifySummary(
    'todo',
    'materialize-phase-pages-verify',
    1,
    passed.slice(0, 1),
    [...broken, { ...broken[0], planId: 'materialize-signercatalogue-l2-page', outputPath: '_102047_/l2/todo/web/desktop/page11/signerCatalogue.ts' }],
    { declared: [], repaired: [] },
    false,
  );
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true, moduleName: 'todo' })).size, 0);
  await saveMaterializeVerifySummary(
    'todo',
    'materialize-phase-pages-verify-v2-v3-v4',
    4,
    passed,
    broken,
    { declared: [], repaired: [{ planId: 'materialize-signercatalogue-l2-page', typecheck: 'passed' }] },
    true,
  );
  const summary = await readMaterializeVerifySummary('todo', 'materialize-phase-pages-verify-v2-v3-v4');
  assert.equal(summary?.passed.map((item: { planId: string }) => item.planId).sort().join(','), passed.map(item => item.planId).sort().join(','));
  const unresolved = await readUnresolvedMaterializeItems('todo');
  assert.equal(unresolved.some((item: { planId: string }) => item.planId === 'materialize-taskcatalogue-l2-page'), true);
  assert.equal(unresolved.some((item: { planId: string }) => item.planId === 'materialize-petitionlanding-l2-page'), false);
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true, moduleName: 'todo' })).has('materialize-taskcatalogue-l2-page'), true);
});

void test('T2: veredito de outro módulo não entra no skip set deste run', async () => {
  const { readBlockedMaterializePlanIds, saveMaterializeVerifySummary } = await loadModule();
  const neighbour = 'materialize-taskcatalogue-l2-shared';
  await saveMaterializeVerifySummary(
    'todo',
    'materialize-phase-shared-verify',
    4,
    [],
    [{ planId: neighbour, defPath: '', outputPath: '_102047_/l2/todo/web/shared/taskCatalogue.ts', typecheck: 'failed', errors: ['does not compile'], warnings: [], severity: 'blocked' as const }],
    { declared: [], repaired: [] },
    true,
  );
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true, moduleName: 'listaAssinatura' })).has(neighbour), false);
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true, moduleName: 'todo' })).has(neighbour), true);
});

void test('T2: declared de qualidade não entra no conjunto que skipBlockedDependents consulta', async () => {
  const { readBlockedMaterializePlanIds, saveMaterializeVerifySummary } = await loadModule();
  const shared = 'materialize-petitionlanding-l2-shared';
  await saveMaterializeVerifySummary(
    'todo',
    'materialize-phase-shared-verify',
    4,
    [],
    [],
    { declared: [{
      planId: shared,
      defPath: '',
      outputPath: '_102047_/l2/todo/web/shared/petitionLanding.ts',
      typecheck: 'passed',
      errors: ['cmdCaptureSignature error path does not read error.message (nor an i18n map keyed by error.code)'],
      warnings: [],
      severity: 'declared' as const,
    }], repaired: [] },
    true,
  );
  assert.equal((await readBlockedMaterializePlanIds(PROJECT, { finalOnly: true })).has(shared), false);
});

void test('D4.3: os achados do verify chegam ao slot de repair, e só na tentativa para a qual foram gravados', async () => {
  const { saveMaterializeItemFindings, readMaterializeItemFindings } = await loadModule();
  const findings = [
    'qryListTask.sortBy is collection wiring (pagination/sorting) but is bound to a form control',
    "catalogue 'pageMessage_en' is frozen with `as const`",
  ];
  assert.equal(await saveMaterializeItemFindings('todo', 'materialize-taskcatalogue-l2-page', 2, findings), true);
  assert.deepEqual(await readMaterializeItemFindings('todo', 'materialize-taskcatalogue-l2-page', 2), findings);
  // rodada seguinte: a lista da rodada anterior é stale e não vaza
  assert.deepEqual(await readMaterializeItemFindings('todo', 'materialize-taskcatalogue-l2-page', 3), []);
  // outro item / outro módulo / arquivo ausente: silêncio, nunca os achados de um vizinho
  assert.deepEqual(await readMaterializeItemFindings('todo', 'materialize-taskhub-l2-page', 2), []);
  assert.deepEqual(await readMaterializeItemFindings('outro', 'materialize-taskcatalogue-l2-page', 2), []);
  // e a rodada 3 sobrescreve a 2 no MESMO arquivo (o slot nunca vê duas listas)
  assert.equal(await saveMaterializeItemFindings('todo', 'materialize-taskcatalogue-l2-page', 3, ['TS2551']), true);
  assert.deepEqual(await readMaterializeItemFindings('todo', 'materialize-taskcatalogue-l2-page', 3), ['TS2551']);
  assert.deepEqual(await readMaterializeItemFindings('todo', 'materialize-taskcatalogue-l2-page', 2), []);
});
