/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildP2EffortFile,
  parseP2BackendFile,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import { validateP2Effort } from '/_102020_/l2/agentPlannerL2/steps/effort40/gate.js';
import type { PoolEffortFile, PoolMenuFile } from '/_102035_/l2/solution/poolPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MENU_PATH = path.join(HERE, '../needs30/fixtures/menu.json');
const BACKEND_PATH = path.join(HERE, 'fixtures/backend.mensalidadesAcademia.v1.2.json');
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));

function sample(): { menu: PoolMenuFile; file: PoolEffortFile } {
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const backend = parseP2BackendFile(JSON.parse(readFileSync(BACKEND_PATH, 'utf8')));
  return { menu, file: buildP2EffortFile({ menu, backend, now: AT }) };
}

void test('gate accepts the mensalidadesAcademia fixture', () => {
  const { menu, file } = sample();
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('gate fails when a menu page is missing from screens', () => {
  const { menu, file } = sample();
  file.screens = file.screens.filter(screen => screen.pageId !== 'planos');
  file.totals.screens.toCreate -= 1;
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'P2_EFFORT_SCREEN_MISSING'));
});

void test('gate fails when an endpoint usecaseRef is missing', () => {
  const { menu, file } = sample();
  file.endpoints[0].usecaseRef = 'missingUsecase';
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'P2_EFFORT_USECASE_REF'));
});

void test('gate fails when totals do not match the lists', () => {
  const { menu, file } = sample();
  file.totals.endpoints.toCreate += 1;
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'P2_EFFORT_TOTALS'));
});

void test('gate rejects invalid testSupport owner and status', () => {
  const { menu, file } = sample();
  file.testSupport[0].owner = 'runtime-team' as never;
  file.testSupport[0].status = 'inProgress' as never;
  const gate = validateP2Effort(file, menu);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some(issue => issue.code === 'P2_EFFORT_TEST_SUPPORT_OWNER'));
  assert.ok(gate.issues.some(issue => issue.code === 'P2_EFFORT_STATUS'));
});
