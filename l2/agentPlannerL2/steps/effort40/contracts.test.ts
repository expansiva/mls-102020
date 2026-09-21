/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import type { P2NeedsFile, P2NeedsRead } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import {
  P2_EFFORT_SCHEMA_VERSION,
  P2_EFFORT_STATUSES,
  buildP2EffortFile,
  buildP2EffortMessage,
  parseP2BackendFile,
  parseP2L4DiffFile,
  p2EffortSubject,
  p2EntityRulesMap,
  p2StatusFromMenuAction,
  type P2BackendFile,
  type P2BuildEffortCandidate,
  type P2EffortL4DiffFile,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import { validateP2Effort } from '/_102020_/l2/agentPlannerL2/steps/effort40/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MENU_PATH = path.join(HERE, '../needs30/fixtures/menu.json');
const ACTIONS_PATH = path.join(HERE, 'fixtures/menu-actions.json');
const BACKEND_PATH = path.join(HERE, 'fixtures/backend.mensalidadesAcademia.json');
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));

void test('menu action maps onto the l1/CB status vocabulary', () => {
  assert.equal(p2StatusFromMenuAction('new'), 'toCreate');
  assert.equal(p2StatusFromMenuAction('change'), 'toUpdate');
  assert.equal(p2StatusFromMenuAction('remove'), 'toRemove');
  assert.equal(p2StatusFromMenuAction('keep'), 'done');
  assert.deepEqual([...P2_EFFORT_STATUSES], ['toCreate', 'toUpdate', 'toRemove', 'done']);
});

void test('mensalidadesAcademia fixture joins every menu page with backend statuses', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as P2MenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  const file = buildP2EffortFile({ menu, backend, now: AT });
  assert.equal(file.schemaVersion, P2_EFFORT_SCHEMA_VERSION);
  assert.equal(file.moduleName, 'mensalidadesAcademia');
  assert.equal(file.device, 'web');
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
  const menu = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as P2MenuFile;
  const backend: P2BackendFile = {
    schemaVersion: '2026-09-21-p1-backend-v1',
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

function needsRead(entity: string): P2NeedsRead {
  return { entity, family: 'tdm', scope: 'organization', derived: [], from: [] };
}

function needsFile(pages: { pageId: string; entities: string[] }[]): P2NeedsFile {
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

function emptyBackend(): P2BackendFile {
  return {
    schemaVersion: '2026-09-21-p1-backend-v1',
    moduleName: 'mensalidadesAcademia',
    device: 'web',
    endpoints: [],
    usecases: [],
    tables: [],
    removed: [],
  };
}

function candidateOf(opts: {
  menu: P2MenuFile;
  needs: P2NeedsFile;
  items: P2EffortL4DiffFile['items'];
  rules: readonly { entityId: string; rules?: readonly string[] }[];
  canonicalMenu?: P2MenuFile | null;
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
  };
}

void test('candidate: situacaoMensalidadeDerivada updates pages that read Mensalidade; others stay done', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as P2MenuFile;
  const needs = needsFile([
    { pageId: 'minha_matricula', entities: ['Matricula'] },
    { pageId: 'inicio_recepcao', entities: ['Mensalidade'] },
    { pageId: 'matriculas', entities: ['Aluno', 'Matricula'] },
    { pageId: 'mensalidades_pagamentos', entities: ['Mensalidade', 'Pagamento'] },
    { pageId: 'planos', entities: ['Plano'] },
    { pageId: 'inicio_gerencia', entities: ['IndicadoresAcademia'] },
  ]);
  const file = buildP2EffortFile({
    menu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({
      menu,
      needs,
      rules: [{ entityId: 'Mensalidade', rules: ['situacaoMensalidadeDerivada'] }],
      items: [{
        changeId: 'rule:situacaoMensalidadeDerivada',
        kind: 'rule',
        op: 'changed',
        entity: '',
        source: 'ontology/Mensalidade.defs.ts',
      }],
    }),
  });
  assert.deepEqual(
    Object.fromEntries(file.screens.map(screen => [screen.pageId, screen.status])),
    {
      minha_matricula: 'done',
      inicio_recepcao: 'toUpdate',
      matriculas: 'done',
      mensalidades_pagamentos: 'toUpdate',
      planos: 'done',
      inicio_gerencia: 'done',
    },
  );
  assert.deepEqual(file.unattributed, []);
  assert.deepEqual(file.totals.screens, { toCreate: 0, toUpdate: 2, toRemove: 0, done: 4 });
  const gate = validateP2Effort(file, menu, { screenStatusFromAction: false });
  assert.equal(gate.ok, true, gate.issues.map(issue => issue.message).join('\n'));
});

void test('candidate: orphan rule alunoBloqueadoPorDuasMensalidadesVencidas lands in unattributed', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as P2MenuFile;
  const needs = needsFile([
    { pageId: 'mensalidades_pagamentos', entities: ['Mensalidade', 'Pagamento'] },
    { pageId: 'planos', entities: ['Plano'] },
  ]);
  const file = buildP2EffortFile({
    menu,
    backend: emptyBackend(),
    now: AT,
    candidate: candidateOf({
      menu,
      needs,
      rules: [{ entityId: 'Mensalidade', rules: ['situacaoMensalidadeDerivada'] }],
      items: [{
        changeId: 'rule:alunoBloqueadoPorDuasMensalidadesVencidas',
        kind: 'rule',
        op: 'changed',
        entity: '',
        source: 'rules.defs.ts',
      }],
    }),
  });
  assert.ok(file.screens.every(screen => screen.status === 'done' || screen.status === 'toCreate' || screen.status === 'toUpdate'));
  assert.ok(file.screens.every(screen => screen.status !== 'toUpdate'));
  assert.equal(file.unattributed.length, 1);
  assert.equal(file.unattributed[0].changeId, 'rule:alunoBloqueadoPorDuasMensalidadesVencidas');
  assert.equal(file.unattributed[0].kind, 'rule');
  assert.equal(file.unattributed[0].op, 'changed');
  assert.match(file.unattributed[0].reason, /not in any entity\.rules\[\]/);
  assert.equal(file.unattributed[0].reason.includes('Workshop'), false);
  assert.equal(file.unattributed[0].reason.includes('bloqueado'), false);
});

void test('candidate: new page is toCreate, canonical page missing from candidate is toRemove', () => {
  const canonical = JSON.parse(readFileSync(ACTIONS_PATH, 'utf8')) as P2MenuFile;
  const candidateMenu: P2MenuFile = {
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
      items: [],
    }),
  });
  const byId = Object.fromEntries(file.screens.map(screen => [screen.pageId, screen.status]));
  assert.equal(byId.created_page, 'done');
  assert.equal(byId.changed_page, 'done');
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
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as P2MenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  const file = buildP2EffortFile({ menu, backend, now: AT });
  assert.ok(file.screens.every(screen => screen.status === 'toCreate'));
  assert.deepEqual(file.unattributed, []);
});

void test('effort message is l2→l4 with the effort artifact', () => {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as P2MenuFile;
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
