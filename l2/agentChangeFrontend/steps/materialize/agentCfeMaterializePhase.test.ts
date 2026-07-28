/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYSTEMIC_FAILURE_MIN_PAGES, countPage11Items, isSystemicPageFailure } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeMaterializePhase declares the materialize phase/verify step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCfeMaterializePhase/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCfeMaterializePhase"/);
});

// Verify traces/verdicts must ALWAYS be module-scoped (<module>/trace/...). A project-root fallback
// (l2/trace/...) polluted the project root and the junk ended up committed in mls-102051.
void test('verify trace and verdict are module-scoped with no project-root fallback', () => {
  const src = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  // The caller's moduleName (derived from ALL items) is the first argument of both writers.
  assert.match(src, /export async function saveMaterializeVerifyTrace\(moduleName: string, planId: string/);
  assert.match(src, /export async function saveMaterializeVerifySummary\(moduleName: string, planId: string/);
  // No root fallback: the folder is always `${module}/trace/...`, never a bare 'trace/...'.
  assert.doesNotMatch(src, /folder\s*=\s*module\s*\?/, 'root-fallback ternary must be gone');
  assert.doesNotMatch(src, /:\s*'trace\/frontend-materialize-verify'/, "bare 'trace/...' folder must never be used");
  assert.equal((src.match(/const folder = `\$\{module\}\/trace\/frontend-materialize-verify`/g) || []).length, 2);
  // Without a derivable module both writers skip the write instead of polluting the root.
  assert.equal((src.match(/never write to the project-root l2\/trace/g) || []).length, 2);
  // The phase passes its own moduleName to the trace (not only to the verdict).
  const phase = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(phase, /saveMaterializeVerifyTrace\(moduleName, args\.planId/);
});

// Systemic-failure guard (102051 run01): an unresolved `lit` import broke every file, no repair round
// could fix it, and the budget was spent regressing already-correct pages.
const pageItem = (genome: string, name: string, errors: string[]) => ({
  outputPath: `_102051_/l2/cafeFlow/web/desktop/${genome}/${name}.ts`,
  errors,
});

void test('systemic guard trips when every page11 item fails the first compile', () => {
  const items = ['a', 'b', 'c'].map(name => pageItem('page11', name, ["Cannot find module 'lit'"]));
  assert.equal(items.length, SYSTEMIC_FAILURE_MIN_PAGES);
  assert.equal(isSystemicPageFailure(1, items), true);
  assert.equal(countPage11Items(items), 3);
});

void test('systemic guard ignores page21 and counts only page11', () => {
  // page21 broken + page11 clean must NOT trip: the fault is not systemic.
  const items = [
    ...['a', 'b', 'c'].map(name => pageItem('page11', name, [])),
    ...['a', 'b', 'c'].map(name => pageItem('page21', name, ['boom'])),
  ];
  assert.equal(isSystemicPageFailure(1, items), false);
  assert.equal(countPage11Items(items), 3);
});

void test('systemic guard does not trip below the minimum page count', () => {
  const items = ['a', 'b'].map(name => pageItem('page11', name, ['boom']));
  assert.equal(isSystemicPageFailure(1, items), false);
});

void test('systemic guard does not trip when at least one page11 compiles', () => {
  const items = [pageItem('page11', 'a', []), pageItem('page11', 'b', ['boom']), pageItem('page11', 'c', ['boom'])];
  assert.equal(isSystemicPageFailure(1, items), false);
});

void test('systemic guard only applies to the first compile', () => {
  const items = ['a', 'b', 'c'].map(name => pageItem('page11', name, ['boom']));
  assert.equal(isSystemicPageFailure(2, items), false, 'a repair round must never trip the guard');
  assert.equal(isSystemicPageFailure(4, items), false);
});

void test('systemic guard ignores non-page items (shared/contract phases)', () => {
  const items = ['a', 'b', 'c'].map(name => ({ outputPath: `_102051_/l2/cafeFlow/web/shared/${name}.ts`, errors: ['boom'] }));
  assert.equal(isSystemicPageFailure(1, items), false);
  assert.equal(countPage11Items(items), 0);
});
