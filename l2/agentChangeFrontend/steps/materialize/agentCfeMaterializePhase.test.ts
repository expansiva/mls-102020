/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SYSTEMIC_FAILURE_MIN_PAGES, contractTsPathOf, countPage11Items, countSharedItems,
  isSystemicPageFailure, isSystemicSharedFailure,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

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

// ---------------------------------------------------------------------------
// itemId atravessa o verify (paginaDividida.md). Sem ele, o repair de um organismo reescreveria o
// arquivo do PRIMEIRO item do defs, e a divisao teria de reconstruir o id a partir do planId — que
// passa por safe() e é lossy.

void test('the verify carries itemId end to end', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  // sobrevive ao parse dos items do step
  assert.match(src, /const itemId = readString\(value\.itemId\);/);
  assert.match(src, /return itemId \? \{ planId, defPath, itemId \} : \{ planId, defPath \};/);
  // vai junto em cada rodada de repair
  assert.match(src, /repairArgs = broken\.map\(entry => JSON\.stringify\(\{[^)]*itemId: entry\.item\.itemId/);
  // e a divisao deriva os ids dos organismos do itemId da pagina, sem reconstruir do planId
  assert.match(src, /const basePipeline = pageItemId\.slice\(0, -'__l2_page'\.length\);/);
  assert.ok(!src.includes('basePipelineId'), 'a reconstrucao lossy a partir do planId foi removida');
});

void test('the split fan-out of the page waits for the organisms', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  // a pagina importa o que os organismos exportam: nao pode comecar antes deles.
  assert.match(src, /createFanoutStep\(pagePlanId,[^)]*\[organismsPlanId\]\)/s);
  assert.match(src, /status: dependsOn\.length \? 'waiting_dependency' : 'in_progress'/);
});

// ── the shared phase (run cf2) ───────────────────────────────────────────────
const sharedItem = (name: string, errors: string[]) => ({
  outputPath: `_102046_/l2/buildFlowFsm47/web/shared/${name}.ts`,
  errors,
});

void test('systemic guard trips when every shared item fails the first compile', () => {
  // Run cf2: all 34 shared files broke with the SAME first error (a false TS2792 — the contract model
  // had been disposed) and the repair fan-out started anyway, rewriting 34 correct files.
  const items = ['a', 'b', 'c'].map(name => sharedItem(name, ["TS2792 Cannot find module '/_102046_/l2/buildFlowFsm47/web/contracts/x.js'"]));
  assert.equal(isSystemicSharedFailure(1, items), true);
  assert.equal(countSharedItems(items), 3);
  // Only on the first attempt, and never below the minimum.
  assert.equal(isSystemicSharedFailure(2, items), false);
  assert.equal(isSystemicSharedFailure(1, items.slice(0, 2)), false);
  // One shared that compiles means the fault is not systemic.
  assert.equal(isSystemicSharedFailure(1, [sharedItem('a', []), ...items]), false);
});

void test('the two systemic guards never count each other', () => {
  const mixed = [
    ...['a', 'b', 'c'].map(name => sharedItem(name, ['boom'])),
    ...['a', 'b', 'c'].map(name => pageItem('page11', name, [])),
  ];
  assert.equal(isSystemicSharedFailure(1, mixed), true);
  assert.equal(isSystemicPageFailure(1, mixed), false);
  assert.equal(countSharedItems(mixed), 3);
  assert.equal(countPage11Items(mixed), 3);
  // A defs is never an output of this phase and must not be counted as a shared item.
  assert.equal(countSharedItems([{ outputPath: '_102046_/l2/buildFlowFsm47/web/shared/a.defs.ts' }]), 0);
});

// The contract model is disposed as soon as the contract phase compiled it, so a shared that imports
// it saw an unresolvable import (TS2792 on all 34 in run cf2). Both the scaffold gate and the verify
// must load it back first.
void test('a shared verifies with its contract preloaded, not only a page', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /pipelineItem\.type === 'l2_shared'[\s\S]{0,200}preloadTypecheckDeps\(\[contractTsPathOf\(defsContent\)\]\)/);
  const gen = readFileSync(path.join(HERE, 'agentCfeMaterializeGen.ts'), 'utf8');
  assert.match(gen, /getCompiledDtsByMlsPath\(contractTsPath\)[\s\S]{0,200}compileAndGetErrors/);
});

void test('contractTsPathOf reads the contract the defs declares, and never throws', () => {
  const defs = (body: string) => `export const x = ${body} as const;\n\nexport const pipeline = [] as const;\n`;
  assert.equal(contractTsPathOf(defs(JSON.stringify({ data: { contractRef: { tsPath: '_102046_/l2/m/web/contracts/p.ts' } } }))), '_102046_/l2/m/web/contracts/p.ts');
  assert.equal(contractTsPathOf(defs(JSON.stringify({ data: { componentName: 'x' } }))), '');
  assert.equal(contractTsPathOf('not a defs file at all'), '');
  assert.equal(contractTsPathOf(null), '');
});

// T1: the server matches the waiting slot by EXACT string (`q.args === args`), so the slot's args must
// travel verbatim. Re-serializing the parsed object reordered the keys on a repair and the fan-out
// slot was never found — the round hung in waiting_human_input and the task never finished.
void test('the repair args string is never rebuilt on the way to prompt_ready', () => {
  const queued = JSON.stringify({ planId: 'materialize-x-l2-shared', defPath: '_102046_/l2/m/a.defs.ts', itemId: 'item1', attempt: 2 });
  // What the old code sent back, after parse + spread: the same data, a different string.
  const parsed = JSON.parse(queued);
  const rebuilt = JSON.stringify({ planId: parsed.planId, defPath: parsed.defPath, attempt: parsed.attempt, itemId: parsed.itemId });
  assert.notEqual(rebuilt, queued, 'the reorder is what broke the match');

  const gen = readFileSync(path.join(HERE, 'agentCfeMaterializeGen.ts'), 'utf8');
  // The raw string reaches the intent factory and is used as-is.
  assert.match(gen, /createPromptReadyIntent\(context, parentStep, hookSequential, args, genContext/);
  assert.match(gen, /rawArgs: string/);
  assert.match(gen, /const args = rawArgs;/);
  assert.doesNotMatch(gen, /const args = JSON\.stringify\(compactArgs\)/);
});

// T8: the borrowed-model count is a fact about the run and belongs where the run is read (step trace /
// verdict), not in the browser console — a console.info here printed on every verify of every phase.
void test('the verify reports released models in the step trace, never in the console', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  const finalize = readFileSync(path.join(HERE, '..', 'finalize', 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.ok(!/console\.(info|log)\([^)]*released/u.test(src), 'the verify must not print the released count');
  assert.ok(!/console\.(info|log)\([^)]*released/u.test(finalize), 'the module gate must not print the released count');
  assert.match(src, /released \$\{released\} borrowed model\(s\)/u);
  assert.match(finalize, /released \$\{closure\.released\} borrowed model\(s\)/u);
});
