/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import {
  P2_EFFORT_SCHEMA_VERSION,
  P2_EFFORT_STATUSES,
  buildP2EffortFile,
  buildP2EffortMessage,
  parseP2BackendFile,
  p2EffortSubject,
  p2StatusFromMenuAction,
  type P2BackendFile,
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
