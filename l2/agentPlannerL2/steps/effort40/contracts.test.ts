/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  P2_EFFORT_SCHEMA_VERSION,
  P2_BACKEND_SCHEMA_VERSION,
  P2_EFFORT_STATUSES,
  buildP2EffortFile,
  buildP2EffortMessage,
  parseP2BackendFile,
  parseP2L4DiffFile,
  p2EffortSubject,
  p2EntityRulesMap,
  p2StatusFromMenuAction,
  type P2BackendView,
  type P2BuildEffortCandidate,
  type P2EffortL4DiffFile,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import { validateP2Effort } from '/_102020_/l2/agentPlannerL2/steps/effort40/gate.js';
import { changeEffortFileStatus, mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import {
  CHANGE_EFFORT_SCHEMA_VERSION,
  type ChangeEffortFile,
  type EffortAnswer,
  type EffortUnitRef,
  type L4DiffItem,
  type PoolMenuFile,
  type PoolNeedsFile,
  type PoolNeedsRead,
} from '/_102035_/l2/solution/poolPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MENU_PATH = path.join(HERE, '../needs30/fixtures/menu.json');
const ACTIONS_PATH = path.join(HERE, 'fixtures/menu-actions.json');
const BACKEND_PATH = path.join(HERE, 'fixtures/backend.mensalidadesAcademia.v1.2.json');
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));

void test('menu action maps onto the l1/CB status vocabulary', () => {
  assert.equal(p2StatusFromMenuAction('new'), 'toCreate');
  assert.equal(p2StatusFromMenuAction('change'), 'toUpdate');
  assert.equal(p2StatusFromMenuAction('remove'), 'toRemove');
  assert.equal(p2StatusFromMenuAction('keep'), 'done');
  assert.deepEqual([...P2_EFFORT_STATUSES], ['toCreate', 'toUpdate', 'toRemove', 'done']);
});

void test('mensalidadesAcademia fixture joins every menu page with backend statuses', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  const file = buildP2EffortFile({ menu, backend, now: AT });
  assert.equal(file.schemaVersion, P2_EFFORT_SCHEMA_VERSION);
  assert.equal(file.moduleName, 'mensalidadesAcademia');
  assert.equal(file.device, 'web');
  assert.equal(file.meta.sourceVersion, P2_BACKEND_SCHEMA_VERSION);
  assert.equal(file.meta.sourceBackend, 'pool/l2/web/backend.json');
  assert.deepEqual(file.testSupport, backend.testSupport);
  assert.notEqual(file.testSupport, backend.testSupport);
  assert.deepEqual(file.screens.map(screen => screen.pageId), [
    'minha_matricula',
    'inicio_recepcao',
    'matriculas',
    'mensalidades_pagamentos',
    'planos',
    'inicio_gerencia',
  ]);
  assert.ok(file.screens.every(screen => screen.status === 'toCreate'));
  assert.deepEqual(file.unattributed, []);
  assert.equal(file.totals.screens.toCreate, 6);
  assert.equal(file.totals.endpoints.done, 1);
  assert.equal(file.totals.usecases.done, 1);
  assert.equal(file.removed.length, 1);
  assert.equal(file.removed[0].status, 'toRemove');
  const payments = file.screens.find(screen => screen.pageId === 'mensalidades_pagamentos');
  assert.deepEqual(payments?.endpoints, [
    'mensalidadesAcademia.mensalidades_pagamentos.qryListMensalidade',
    'mensalidadesAcademia.mensalidades_pagamentos.cmdCreatePagamento',
  ]);
  assert.equal(file.usecases.find(item => item.usecaseId === 'listPlano')?.existing, 'l1/mensalidadesAcademia/layer_2_application/usecases/listPlano.defs.ts');
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

void test('the four menu actions become the four effort statuses, including meta.removed', () => {
  const menu = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as PoolMenuFile;
  const backend: P2BackendView = {
    schemaVersion: P2_BACKEND_SCHEMA_VERSION,
    moduleName: 'mensalidadesAcademia',
    device: 'web',
    endpoints: [
      { route: 'mod.created_page.qryList', page: 'created_page', kind: 'qry', usecaseRef: 'listX', status: 'toCreate' },
      { route: 'mod.changed_page.cmdUpdate', page: 'changed_page', kind: 'cmd', usecaseRef: 'updateX', status: 'toUpdate' },
      { route: 'mod.kept_page.qryGet', page: 'kept_page', kind: 'qry', usecaseRef: 'getX', status: 'done' },
    ],
    usecases: [
      { usecaseId: 'listX', entity: 'X', operation: 'list', status: 'toCreate', existing: '' },
      { usecaseId: 'updateX', entity: 'X', operation: 'update', status: 'toUpdate', existing: 'l1/mod/usecases/updateX.defs.ts' },
      { usecaseId: 'getX', entity: 'X', operation: 'get', status: 'done', existing: 'l1/mod/usecases/getX.defs.ts' },
    ],
    tables: [{ tableId: 'x', entity: 'X', status: 'toCreate' }],
    removed: [{ kind: 'endpoint', id: 'mod.removed_page.qryList', status: 'toRemove' }],
    testSupport: [],
  };
  const file = buildP2EffortFile({ menu, backend, now: AT });
  assert.deepEqual(
    Object.fromEntries(file.screens.map(screen => [screen.pageId, screen.status])),
    {
      created_page: 'toCreate',
      changed_page: 'toUpdate',
      kept_page: 'done',
      removed_page: 'toRemove',
    },
  );
  assert.deepEqual(file.totals.screens, { toCreate: 1, toUpdate: 1, toRemove: 1, done: 1 });
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

function needsRead(entity: string): PoolNeedsRead {
  return { entity, family: 'tdm', scope: 'organization', derived: [], from: [] };
}

function needsFile(pages: { pageId: string; entities: string[] }[]): PoolNeedsFile {
  return {
    schemaVersion: '2026-09-21-p2-needs-v1',
    moduleName: 'mensalidadesAcademia',
    device: 'web',
    menuSchema: '2026-09-20-p2-menu-v2.2',
    pages: pages.map(page => ({
      pageId: page.pageId,
      actors: ['recepcao'],
      reads: page.entities.map(needsRead),
      writes: [],
    })),
    meta: { sourceMenu: 'pool/l2/web/menu.json', generatedAt: AT.toISOString() },
  };
}

function emptyBackend(): P2BackendView {
  return {
    schemaVersion: P2_BACKEND_SCHEMA_VERSION,
    moduleName: 'mensalidadesAcademia',
    device: 'web',
    endpoints: [],
    usecases: [],
    tables: [],
    removed: [],
    testSupport: [],
  };
}

void test('backend v1.2 requires testSupport and validates the published item shape', () => {
  const source = JSON.parse(readFileSync(BACKEND_PATH, 'utf8')) as Record<string, unknown>;
  const parsed = parseP2BackendFile(source);
  assert.equal(parsed.schemaVersion, P2_BACKEND_SCHEMA_VERSION);
  assert.equal(parsed.testSupport.length, 1);
  assert.deepEqual(parsed.testSupport[0], {
    id: 'support:matricula',
    actorRefs: ['actor:aluno', ''],
    entityRefs: ['Matricula'],
    sourceRefs: ['l1/agendaClinica/layer_3_domain/entities/matricula.defs.ts'],
    status: 'toCreate',
    owner: 'L1',
    executorRef: '',
    cleanupRef: '',
    gap: 'Verified test executor and cleanup are pending.',
  });
  assert.deepEqual(parseP2BackendFile({ ...source, testSupport: [] }).testSupport, []);

  const missing = Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'testSupport'));
  assert.throws(() => parseP2BackendFile(missing), /testSupport must be an array/);
  assert.throws(() => parseP2BackendFile({ ...source, testSupport: {} }), /testSupport must be an array/);
  assert.throws(() => parseP2BackendFile({ ...source, testSupport: [null] }), /testSupport\[0\] must be an object/);
  assert.throws(() => parseP2BackendFile({ ...source, schemaVersion: '2026-09-21-p1-backend-v1' }), /schemaVersion/);
  assert.throws(() => parseP2BackendFile({ ...source, schemaVersion: undefined }), /schemaVersion/);
  assert.throws(() => parseP2BackendFile({
    ...source,
    testSupport: [{ ...parsed.testSupport[0], actorRefs: 'actor:aluno' }],
  }), /actorRefs must be an array of strings/);
  assert.throws(() => parseP2BackendFile({
    ...source,
    testSupport: [{ ...parsed.testSupport[0], owner: 'runtime-team' }],
  }), /owner must be L1\|runtime/);
  assert.throws(() => parseP2BackendFile({
    ...source,
    testSupport: [{ ...parsed.testSupport[0], status: 'inProgress' }],
  }), /status must be toCreate\|toUpdate\|toRemove\|done/);
});

void test('changing only testSupport changes effort content hash, not effort totals', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  const original = buildP2EffortFile({ menu, backend, now: AT });
  const changed = buildP2EffortFile({
    menu,
    backend: {
      ...backend,
      testSupport: backend.testSupport.map(item => ({ ...item, gap: 'A different explicit gap.' })),
    },
    now: AT,
  });
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.notEqual(hash(original), hash(changed));
  assert.deepEqual(changed.totals, original.totals);
  assert.deepEqual({ ...changed, testSupport: [] }, { ...original, testSupport: [] });
});

function pageUnit(id: string, kind: EffortUnitRef['kind'] = 'page'): EffortUnitRef {
  return { kind, id, path: `l2/mod/web/contracts/${id}.defs.ts` };
}

function effortAnswer(item: string, project: string, patch: Partial<EffortAnswer> = {}): EffortAnswer {
  return {
    master: { project, kind: project === '102021' ? 'l1' : 'l2', device: 'web' },
    item,
    status: 'computed',
    create: [],
    regenerateDefs: [],
    materialize: [],
    remove: [],
    runAgents: [],
    contract: 'keep',
    ...patch,
  };
}

function changeEffort(items: L4DiffItem[], answers: EffortAnswer[]): ChangeEffortFile {
  const perItem = items.map(item => ({
    item: item.changeId,
    answers: answers.filter(answer => answer.item === item.changeId),
  }));
  const masters = [...new Map(answers.map(answer => [answer.master.project, answer.master])).values()];
  return {
    schemaVersion: CHANGE_EFFORT_SCHEMA_VERSION,
    module: 'mensalidadesAcademia',
    base: { baseId: 'base', revisionId: 'rev', candidateRoot: 'mensalidadesAcademia/tobe/plan' },
    request: { text: 'export', items },
    masters,
    perItem,
    merged: mergeChangeEffort(perItem),
    untouched: { count: 0, sealHash: 'seal' },
    status: changeEffortFileStatus(perItem),
  };
}

function diffItem(changeId: string): L4DiffItem {
  return { changeId, kind: 'rule', op: 'changed', entity: '', source: 'rules.defs.ts' };
}

function candidateOf(opts: {
  menu: PoolMenuFile;
  needs: PoolNeedsFile;
  items: P2EffortL4DiffFile['items'];
  rules: readonly { entityId: string; rules?: readonly string[] }[];
  canonicalMenu?: PoolMenuFile | null;
  changeEffort: ChangeEffortFile;
}): P2BuildEffortCandidate {
  return {
    canonicalMenu: opts.canonicalMenu === undefined ? opts.menu : opts.canonicalMenu,
    l4diff: {
      schemaVersion: '2026-09-21-p4-l4diff-v1',
      moduleName: 'mensalidadesAcademia',
      base: 'canonical',
      candidate: 'mensalidadesAcademia/tobe/plan',
      items: opts.items,
    },
    needs: opts.needs,
    entityRules: p2EntityRulesMap(opts.rules),
    changeEffort: opts.changeEffort,
  };
}

void test('candidate: R4 changeEffort marks tarefas_equipe toUpdate even when the rule is outside entity.rules[]', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const page = (id: string) => ({ id, kind: 'page' as const, label: id, organisms: [], action: 'keep' as const });
  menu.tree = [...menu.tree, page('tarefas_equipe')];
  const needs = needsFile(menu.tree.flatMap(node => node.kind === 'page' ? [{ pageId: node.id, entities: ['Other'] }] : []));
  const items = [diffItem('rule:gestorExportaCsv')];
  const effort = changeEffort(items, [
    effortAnswer('rule:gestorExportaCsv', '102020', {
      contract: 'change',
      regenerateDefs: [pageUnit('tarefas_equipe')],
    }),
  ]);
  const file = buildP2EffortFile({
    menu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({
      menu,
      needs,
      rules: [],
      items,
      changeEffort: effort,
    }),
  });
  const byId = Object.fromEntries(file.screens.map(screen => [screen.pageId, screen.status]));
  assert.equal(byId.tarefas_equipe, 'toUpdate');
  assert.ok(Object.entries(byId).filter(([id]) => id !== 'tarefas_equipe').every(([, status]) => status === 'done'));
  assert.deepEqual(file.unattributed, []);
  const gate = validateP2Effort(file, menu, { screenStatusFromAction: false });
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

void test('candidate: front-end answer with no page is unattributed; a 102021 answer does not mark', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const needs = needsFile([
    { pageId: 'mensalidades_pagamentos', entities: ['Mensalidade', 'Pagamento'] },
    { pageId: 'planos', entities: ['Plano'] },
  ]);
  const orphan = diffItem('rule:alunoBloqueadoPorDuasMensalidadesVencidas');
  const backendOnly = diffItem('rule:onlyBackend');
  const items = [orphan, backendOnly];
  const effort = changeEffort(items, [
    effortAnswer(orphan.changeId, '102020'),
    effortAnswer(backendOnly.changeId, '102021', { regenerateDefs: [pageUnit('planos')] }),
    effortAnswer('rule:absent', '102020', { status: 'abend', abend: { reason: 'master stopped' } }),
  ]);
  const file = buildP2EffortFile({
    menu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({
      menu,
      needs,
      rules: [{ entityId: 'Mensalidade', rules: ['situacaoMensalidadeDerivada'] }],
      items,
      changeEffort: effort,
    }),
  });
  assert.ok(file.screens.every(screen => screen.status !== 'toUpdate'));
  assert.deepEqual(file.unattributed, [{
    changeId: orphan.changeId,
    kind: 'rule',
    op: 'changed',
    reason: 'front-end effort names no page',
  }]);
});

void test('candidate: toUpdate and toCreate match planNewReleaseL2 regenerate pages', () => {
  const canonical = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as PoolMenuFile;
  const page = (id: string) => ({ id, kind: 'page' as const, label: id, organisms: [{ kind: 'list', text: id }], action: 'keep' as const });
  canonical.tree = [page('tarefas_equipe'), page('outra'), page('so_material'), page('resto')];
  const menu: PoolMenuFile = {
    ...canonical,
    tree: [...canonical.tree, page('nova')],
    meta: { journeys: {}, processes: {}, removed: [] },
  };
  const cited = diffItem('rule:gestorExportaCsv');
  const quiet = diffItem('rule:quiet');
  const items = [cited, quiet];
  const effort = changeEffort(items, [
    effortAnswer(cited.changeId, '102020', {
      contract: 'change',
      regenerateDefs: [pageUnit('tarefas_equipe'), pageUnit('tarefas_equipe', 'contract')],
      create: [pageUnit('nova')],
      materialize: [pageUnit('outra')],
    }),
    effortAnswer(cited.changeId, '102021', { regenerateDefs: [pageUnit('resto')] }),
    effortAnswer(quiet.changeId, '102020', { materialize: [pageUnit('so_material')], contract: 'keep' }),
  ]);
  const needs = needsFile([]);
  const file = buildP2EffortFile({
    menu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({ menu, canonicalMenu: canonical, needs, rules: [], items, changeEffort: effort }),
  });
  const marked = file.screens
    .filter(screen => screen.status === 'toUpdate' || screen.status === 'toCreate')
    .map(screen => screen.pageId)
    .sort();
  const plan = planNewReleaseL2(effort, '102020');
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.mode, 'regenerate');
  assert.deepEqual(marked, [...plan.pages].sort());
  assert.equal(file.screens.find(screen => screen.pageId === 'so_material')?.status, 'done');
  assert.equal(file.screens.find(screen => screen.pageId === 'resto')?.status, 'done');
});

void test('candidate: screen marks follow master 102020 when mls.actualProject is 102047', () => {
  const previous = (globalThis as { mls?: { actualProject?: number } }).mls;
  (globalThis as { mls?: { actualProject?: number } }).mls = { actualProject: 102047 };
  try {
    const canonical = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as PoolMenuFile;
    const page = (id: string) => ({ id, kind: 'page' as const, label: id, organisms: [{ kind: 'list', text: id }], action: 'keep' as const });
    canonical.tree = [page('tarefas_equipe'), page('outra')];
    const item = diffItem('rule:gestorExportaCsv');
    const marked = changeEffort([item], [
      effortAnswer(item.changeId, '102020', { regenerateDefs: [pageUnit('tarefas_equipe')], contract: 'change' }),
    ]);
    const ignored = changeEffort([item], [
      effortAnswer(item.changeId, '102047', { regenerateDefs: [pageUnit('tarefas_equipe')], contract: 'change' }),
    ]);
    const build = (effort: ChangeEffortFile) => buildP2EffortFile({
      menu: canonical,
      backend: emptyBackend(),
      now: AT,
      candidate: candidateOf({
        menu: canonical,
        needs: needsFile([]),
        rules: [],
        items: [item],
        changeEffort: effort,
      }),
    });
    assert.equal(build(marked).screens.find(screen => screen.pageId === 'tarefas_equipe')?.status, 'toUpdate');
    assert.equal(build(ignored).screens.find(screen => screen.pageId === 'tarefas_equipe')?.status, 'done');
  } finally {
    (globalThis as { mls?: { actualProject?: number } }).mls = previous;
  }
});

void test('candidate: abend reason is unattributed and a removed page is toRemove', () => {
  const canonical = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as PoolMenuFile;
  const page = (id: string) => ({ id, kind: 'page' as const, label: id, organisms: [{ kind: 'list', text: id }], action: 'keep' as const });
  canonical.tree = [page('fica'), page('sai')];
  const menu: PoolMenuFile = { ...canonical, tree: [page('fica')], meta: { journeys: {}, processes: {}, removed: [] } };
  const item = diffItem('rule:parada');
  const effort = changeEffort([item], [
    effortAnswer(item.changeId, '102020', { status: 'abend', abend: { reason: 'master stopped' }, remove: [pageUnit('fica')] }),
  ]);
  const file = buildP2EffortFile({
    menu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({
      menu,
      canonicalMenu: canonical,
      needs: needsFile([]),
      rules: [],
      items: [item],
      changeEffort: effort,
    }),
  });
  assert.equal(file.screens.find(screen => screen.pageId === 'sai')?.status, 'toRemove');
  assert.equal(file.screens.find(screen => screen.pageId === 'fica')?.status, 'done');
  assert.deepEqual(file.unattributed, [{ changeId: item.changeId, kind: 'rule', op: 'changed', reason: 'master stopped' }]);
});

void test('candidate: new page is toCreate, canonical page missing from candidate is toRemove', () => {
  const canonical = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as PoolMenuFile;
  const candidateMenu: PoolMenuFile = {
    ...canonical,
    tree: [
      canonical.tree[0],
      canonical.tree[1],
      {
        id: 'brand_new',
        kind: 'page',
        label: 'Brand new',
        organisms: [{ kind: 'list', text: 'New.' }],
        action: 'new',
      },
    ],
    meta: { journeys: {}, processes: {}, removed: [] },
  };
  const needs = needsFile([
    { pageId: 'created_page', entities: ['X'] },
    { pageId: 'changed_page', entities: ['X'] },
    { pageId: 'brand_new', entities: ['Y'] },
  ]);
  const file = buildP2EffortFile({
    menu: candidateMenu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({
      menu: candidateMenu,
      canonicalMenu: canonical,
      needs,
      rules: [],
      items: [diffItem('rule:tira')],
      changeEffort: changeEffort([diffItem('rule:tira')], [
        effortAnswer('rule:tira', '102020', { remove: [pageUnit('changed_page')] }),
      ]),
    }),
  });
  const byId = Object.fromEntries(file.screens.map(screen => [screen.pageId, screen.status]));
  assert.equal(byId.created_page, 'done');
  assert.equal(byId.changed_page, 'toRemove');
  assert.equal(byId.brand_new, 'toCreate');
  assert.equal(byId.kept_page, 'toRemove');
  assert.equal(byId.removed_page, undefined);
});

void test('parseP2L4DiffFile reads the p4 item shape', () => {
  const parsed = parseP2L4DiffFile({
    schemaVersion: '2026-09-21-p4-l4diff-v1',
    moduleName: 'mensalidadesAcademia',
    base: 'canonical',
    candidate: 'mensalidadesAcademia/tobe/plan',
    items: [{
      changeId: 'rule:alunoBloqueadoPorDuasMensalidadesVencidas',
      kind: 'rule',
      op: 'changed',
      entity: '',
      source: 'rules.defs.ts',
    }],
  });
  assert.equal(parsed.items[0].changeId, 'rule:alunoBloqueadoPorDuasMensalidadesVencidas');
  assert.equal(parsed.items[0].entity, '');
});

void test('without candidate input, menu action still maps screens (p2_22)', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  const file = buildP2EffortFile({ menu, backend, now: AT });
  assert.ok(file.screens.every(screen => screen.status === 'toCreate'));
  assert.deepEqual(file.unattributed, []);
});

void test('effort message is l2→l4 with the effort artifact', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  const file = buildP2EffortFile({ menu, backend, now: AT });
  const message = buildP2EffortMessage({
    file,
    received: { thread: 'mensalidadesAcademia-20260918103000', round: 1, mode: 'implement' },
  });
  assert.equal(message.from, 'l2');
  assert.equal(message.to, 'l4');
  assert.equal(message.subject, p2EffortSubject('mensalidadesAcademia'));
  assert.deepEqual(message.artifacts, ['pool/l2/web/effort.json']);
  assert.match(message.body, /screens toCreate:6/);
});

void test('p2_34: backend removals and operations are read by the pool type', () => {
  const source = JSON.parse(readFileSync(BACKEND_PATH, 'utf8')) as Record<string, unknown> & { removed: unknown[]; usecases: Array<Record<string, unknown>> };
  const withPort = { ...source, removed: [...source.removed, { kind: 'port', id: 'PlanoRepository', status: 'toRemove', reason: 'no usecase uses it' }, { kind: 'table', id: 'planos_antigos', status: 'toRemove', reason: 'unused' }] };
  const backend = parseP2BackendFile(withPort);
  assert.deepEqual(backend.removed.map(item => item.kind), ['usecase', 'port', 'table']);
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8'));
  const file = buildP2EffortFile({ menu, backend, now: new Date(Date.UTC(2026, 9, 4)) });
  // effort.json has no kind for a removed port and counts no removal: the port is left out, the others stay.
  assert.deepEqual(file.removed.map(item => `${item.kind}:${item.id}`), ['usecase:archivePlano', 'table:planos_antigos']);
  assert.throws(() => parseP2BackendFile({ ...source, removed: [{ kind: 'screen', id: 'x', status: 'toRemove' }] }), /P2_EFFORT_BACKEND_REMOVED_KIND: .*usecase\|port\|table/u);
  const usecases = source.usecases.map((item, index) => index === 0 ? { ...item, operation: 'archive' } : item);
  assert.throws(() => parseP2BackendFile({ ...source, usecases }), /P2_EFFORT_BACKEND_OPERATION: backend\.json usecases\[0\]\.operation must be list\|get\|create\|update\|transition\|delete\|custom, not archive/u);
});
