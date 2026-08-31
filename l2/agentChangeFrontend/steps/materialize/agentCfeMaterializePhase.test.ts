/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SYSTEMIC_FAILURE_MIN_PAGES, contractTsPathOf, countPage11Items, countSharedItems,
  describeVerifyBuckets, firstErrorSignature, isSystemicPageFailure, isSystemicSharedFailure,
  materializePlanIdFromPipelineId, selectRepairedThisRound,
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

// Verify traces/verdicts must ALWAYS be module-scoped under l4/<module>/pipeline/trace.
// A project-root fallback (l2/trace/...) polluted the project root and the junk ended up committed in mls-102051.
void test('verify trace and verdict are module-scoped with no project-root fallback', () => {
  const src = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  const helper = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfePipelineTrace.ts'), 'utf8');
  // The caller's moduleName (derived from ALL items) is the first argument of both writers.
  assert.match(src, /export async function saveMaterializeVerifyTrace\(moduleName: string, planId: string/);
  assert.match(src, /export async function saveMaterializeVerifySummary\(/);
  assert.match(src, /cfePipelineTraceFileInfo\(/);
  assert.match(helper, /pipeline\/trace/);
  // No root fallback: never a bare 'trace/...'.
  assert.doesNotMatch(src, /folder\s*=\s*module\s*\?/, 'root-fallback ternary must be gone');
  assert.doesNotMatch(src, /:\s*'trace\/frontend-materialize-verify'/, "bare 'trace/...' folder must never be used");
  assert.doesNotMatch(src, /const folder = `\$\{module\}\/trace\/frontend-materialize-verify`/);
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
  assert.match(src, /repairArgs = toRepair\.map\(entry => JSON\.stringify\(\{[^)]*itemId: entry\.item\.itemId/);
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

void test('systemic guard does not trip when every shared is broken with a different first error', () => {
  const items = [
    sharedItem('a', ['TS2344 Type "string" is not assignable to sortOrder']),
    sharedItem('b', ['cmdCreateTask error path does not read error.message']),
    sharedItem('c', ['TS2344 Type "" is not assignable to status union']),
  ];
  assert.equal(isSystemicSharedFailure(1, items), false);
  assert.equal(isSystemicPageFailure(1, ['a', 'b', 'c'].map(name => pageItem('page11', name, [`TS2344 ${name} distinct`]))), false);
});

void test('systemic guard still trips when every shared shares the first-error signature', () => {
  const items = ['a', 'b', 'c'].map(name => sharedItem(name, [
    `error TS2792: Cannot find module '/_102046_/l2/buildFlowFsm47/web/contracts/${name}.js' or its corresponding type declarations.`,
  ]));
  assert.equal(firstErrorSignature(items[0].errors), firstErrorSignature(items[1].errors));
  assert.equal(isSystemicSharedFailure(1, items), true);
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
  assert.match(finalize, /released \$\{compiled\.released\} borrowed model\(s\)/u);
});

// ── uma falha de LLM num slot não pode matar a task (rodada 7) ────────────────
// createFanoutStep monta os QUATRO hosts deste agente (materialize, rodada de repair, split de
// organismos e composição da página), então a política vive nele — um lugar só.
void test('todo host de fan-out do materialize nasce com onFailure wait_after_prompt', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /function createFanoutStep\([\s\S]{0,1400}onFailure: 'wait_after_prompt',/);
  // NÃO é 'skip': marcar o slot como failed derruba a task enquanto os irmãos estão ativos
  // (updateStepStatus) e derruba o host quando eles drenam (updateParentStep).
  assert.doesNotMatch(src, /onFailure: 'skip'/);
  // Os 4 call sites continuam passando pelo helper (nenhum host montado à mão).
  assert.equal((src.match(/createFanoutStep\(/g) || []).length, 5); // 4 chamadas + a declaração
});

void test('a .test.ts finding is declared, never blocking, and never queued for repair', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  // O compile do .test.ts nomeia OS DOIS arquivos (o teste importa o .ts embarcado). O split e por
  // ref: o proprio outputPath bloqueia, qualquer outro arquivo declara — despejar a lista inteira em
  // `declared` deixaria passar pagina que nao compila. (review 26/08)
  assert.match(src, /compileErrorRef\(error\) === outputPath\.replace/);
  assert.doesNotMatch(src, /declared\.push\(\.\.\.typecheckErrors\)/);
  assert.doesNotMatch(src, /blocking\.push\(\.\.\.typecheckErrors\)/);
  assert.match(src, /const blocked = checkedItems\.filter\(checked => checked\.blocking\.length > 0\)/);
  assert.match(src, /const toRepair = checkedItems\.filter\(checked => checked\.blocking\.length > 0 \|\| checked\.repairable\.length > 0\)/);
  assert.match(src, /isSystemicSharedFailure\(args\.attempt, blockingView\)/);
  assert.match(src, /isSystemicPageFailure\(args\.attempt, blockingView\)/);
});

void test('quality gates enter repair and are declared after the budget, they never fail the phase', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /repairable\.push\(\.\.\.collectMutationEnvelopeErrorIssues/);
  assert.match(src, /quality findings declared after repair budget/);
  assert.match(src, /describeVerifyBuckets/);
  assert.equal(describeVerifyBuckets({ blocked: 1, repaired: 2, declared: 3 }), 'blocked=1 repaired=2 declared=3');
});

void test('a blocked shared skips only the pages that depend on it', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /async function skipBlockedDependents/);
  assert.match(src, /readBlockedMaterializePlanIds\(mls\.actualProject \|\| 0, \{ finalOnly: true, moduleName: moduleName \|\| undefined \}\)/);
  assert.match(src, /firstCompileBlockedDep\(pipelineItem\?\.dependsOn, blocked\)/);
  assert.match(src, /dependency \$\{blockedDep\} is blocked \(shipped \.ts does not compile\)/);
  assert.match(src, /skipped all \$\{skipped\.length\} item\(s\) whose dependency is blocked/);
  assert.equal(materializePlanIdFromPipelineId('taskHub__l2_shared'), 'materialize-taskhub-l2-shared');
  assert.equal(materializePlanIdFromPipelineId('taskCatalogue__l2_page'), 'materialize-taskcatalogue-l2-page');
});

void test('the phase stays in_progress until fanout+verify+repair finish', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /createUpdateStatusIntent\(context, parentStep, step, hookSequential, 'in_progress', trace\)/);
  assert.match(src, /const final = toRepair\.length === 0 \|\| args\.attempt > MATERIALIZE_REPAIR_ROUNDS \|\| systemic/);
  assert.match(src, /saveMaterializeVerifySummary\(\s*moduleName, args\.planId, args\.attempt, passed, blocked\.map\(item => toBrokenTrace\(item, 'blocked'\)\),\s*\{ declared: declaredTraces, repaired \},\s*final/s);
});

void test('T1: a stuck item is recorded as a degradation and the phase still writes a final verdict', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /recordCfeDegradation\(/);
  assert.match(src, /'materialize-item-failed'/);
  assert.match(src, /args\.attempt > MATERIALIZE_REPAIR_ROUNDS/);
  assert.match(src, /MATERIALIZE-CLI-PENDING/);
  assert.match(src, /function itemsInModule/);
  assert.match(src, /itemsInModule\(args\.items, moduleName\)/);
});

void test('the verify summary writes blocked, repaired and declared counts', () => {
  const src = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  assert.match(src, /blockedCount: broken\.length/);
  assert.match(src, /repairedCount: repaired\.length/);
  assert.match(src, /declaredCount: declared\.length/);
  assert.match(src, /severity: 'blocked' as const/);
  assert.match(src, /severity: 'declared' as const/);
});

void test('R1: repaired counts a finding that cleared, not only an item that was blocked', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /selectRepairedThisRound\(args\.attempt, passedNow, previous\?\.passed\)/);
  // monitorAndUpdateTaskStatus no run01: finding na rodada 1, limpo na 2, nunca esteve em `broken`.
  const passedNow = [{ planId: 'materialize-monitorandupdatetaskstatus-l2-page', typecheck: 'passed' }];
  assert.deepEqual(selectRepairedThisRound(2, passedNow, []), passedNow);
  assert.deepEqual(selectRepairedThisRound(2, passedNow, [{ planId: 'other' }]), passedNow);
  // primeira rodada não conta geração limpa como reparo
  assert.deepEqual(selectRepairedThisRound(1, passedNow, null), []);
  // ainda quebrado (não está em passedNow) não entra
  assert.deepEqual(selectRepairedThisRound(2, [], [{ planId: 'materialize-taskcatalogue-l2-page' }]), []);
  // já estava em passed: não é transição
  assert.deepEqual(selectRepairedThisRound(2, passedNow, passedNow), []);
});

// ── split repair: residual plan + attempt reset (cf_split_reparo_em_loop) ─────
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

const SPLIT_PROJECT = 1;
const SPLIT_MODULE = 'mod';
const SPLIT_PAGE = 'landing';
const SPLIT_GENOME = 'page11';
const SPLIT_DEF = `_${SPLIT_PROJECT}_/l2/${SPLIT_MODULE}/web/desktop/${SPLIT_GENOME}/${SPLIT_PAGE}.defs.ts`;
const SPLIT_OUT = `_${SPLIT_PROJECT}_/l2/${SPLIT_MODULE}/web/desktop/${SPLIT_GENOME}/${SPLIT_PAGE}.ts`;
const SPLIT_PLAN = `_${SPLIT_PROJECT}_/l4/${SPLIT_MODULE}/pipeline/trace/l2/frontend-page-split/${SPLIT_GENOME}/${SPLIT_PAGE}.json`;

function parseMlsPathForStub(mlsPath: string) {
  const match = /^_(\d+)_\/l(\d+)\/(.+)$/.exec(mlsPath);
  if (!match) return null;
  const rest = match[3];
  const lastSlash = rest.lastIndexOf('/');
  const folder = lastSlash >= 0 ? rest.slice(0, lastSlash) : '';
  const filename = lastSlash >= 0 ? rest.slice(lastSlash + 1) : rest;
  const extension = filename.endsWith('.defs.ts') ? '.defs.ts' : filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
  return {
    project: Number(match[1]),
    level: Number(match[2]),
    folder,
    shortName: filename.slice(0, filename.length - extension.length),
    extension,
  };
}

function installSplitStor(files: Record<string, string>): void {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'en' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  const storFiles: Record<string, any> = {};
  for (const [mlsPath, source] of Object.entries(files)) {
    const info = parseMlsPathForStub(mlsPath)!;
    storFiles[`${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`] = {
      ...info, status: 'active', getContent: async () => source,
    };
  }
  g.mls = {
    actualProject: SPLIT_PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: storFiles,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      convertFileReferenceToFile: (mlsPath: string) => parseMlsPathForStub(mlsPath),
    },
  };
}

function residualSplitFiles(): Record<string, string> {
  return {
    [SPLIT_DEF]: [
      'export const definition = `',
      `page: ${SPLIT_PAGE}`,
      'uxExperience: contentLanding',
      'The page extends the shared base class of this workspace.` as const;',
      'export const pipeline = [{ id: "landing__l2_page", type: "l2_page", outputPath: "' + SPLIT_OUT + '" }] as const;',
    ].join('\n'),
    [SPLIT_PLAN]: JSON.stringify({
      organisms: [
        { n: 1, organism: 'hero' },
        { n: 2, organism: 'richText' },
      ],
    }),
  };
}

function brokenLanding() {
  return [{
    item: { planId: 'materialize-landing-l2-page', defPath: SPLIT_DEF, itemId: 'landing__l2_page' },
    outputPath: SPLIT_OUT,
    errors: ['output cap'],
    blocking: ['output cap'],
    repairable: [] as string[],
    declared: [] as string[],
    warnings: [] as string[],
    typecheck: 'failed' as const,
  }];
}

function splitContext() {
  return {
    message: { orderAt: 1, threadId: 't' },
    task: { PK: 'task' },
  } as any;
}

function splitAnchor() {
  return { type: 'agent', stepId: 1 } as any;
}

async function loadPhase(): Promise<typeof import('/_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.js')> {
  installSplitStor({});
  return import('/_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializePhase.js');
}

function splitVerifyAttempt(intents: { type: string; step?: { agentName?: string; prompt?: string } }[]): number | null {
  const verify = intents.find(intent => intent.type === 'add-step' && intent.step?.agentName === 'agentCfeMaterializePhase');
  if (!verify?.step?.prompt) return null;
  const parsed = JSON.parse(verify.step.prompt) as { attempt?: number };
  return typeof parsed.attempt === 'number' ? parsed.attempt : null;
}

void test('T3.1: residual split plan with recipe off does not create split steps', async () => {
  const { planSplitSteps } = await loadPhase();
  installSplitStor(residualSplitFiles());
  const got = await planSplitSteps(
    splitContext(),
    splitAnchor(),
    { planId: 'materialize-phase-pages-verify', items: brokenLanding().map(entry => entry.item), attempt: 1, module: SPLIT_MODULE },
    brokenLanding(),
  );
  assert.equal(got, null);
});

void test('T3.2: recipe with split still divides from a stored plan', async () => {
  const { planSplitSteps } = await loadPhase();
  installSplitStor(residualSplitFiles());
  const got = await planSplitSteps(
    splitContext(),
    splitAnchor(),
    { planId: 'materialize-phase-pages-verify', items: brokenLanding().map(entry => entry.item), attempt: 1, module: SPLIT_MODULE },
    brokenLanding(),
    { splitByOrganism: true },
  );
  assert.ok(got);
  assert.ok(got.some(intent => intent.type === 'add-step' && JSON.stringify(intent).includes('-split-organisms')));
  assert.equal(splitVerifyAttempt(got), 2);
});

void test('T3.3: split re-verify carries attempt and the verdict is final past the budget', async () => {
  const { planSplitSteps, MATERIALIZE_REPAIR_ROUNDS } = await loadPhase();
  installSplitStor(residualSplitFiles());
  const origin = MATERIALIZE_REPAIR_ROUNDS;
  const got = await planSplitSteps(
    splitContext(),
    splitAnchor(),
    { planId: 'materialize-phase-pages-verify', items: brokenLanding().map(entry => entry.item), attempt: origin, module: SPLIT_MODULE },
    brokenLanding(),
    { splitByOrganism: true },
  );
  assert.ok(got);
  const next = splitVerifyAttempt(got);
  assert.equal(next, origin + 1);
  assert.ok(next! > MATERIALIZE_REPAIR_ROUNDS);
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  assert.match(src, /const final = toRepair\.length === 0 \|\| args\.attempt > MATERIALIZE_REPAIR_ROUNDS \|\| systemic/);
});

void test('T3.4: no re-verify path hardcodes attempt: 1', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializePhase.ts'), 'utf8');
  const afterSplit = src.match(/Verify materialization \(after split\)[\s\S]{0,400}attempt:\s*([^,\n]+)/);
  assert.ok(afterSplit, 'split re-verify must exist');
  assert.equal(afterSplit[1].trim(), 'args.attempt + 1');
  const afterRepair = src.match(/Verify materialization \(after repair\)[\s\S]{0,400}attempt:\s*([^,\n]+)/);
  assert.ok(afterRepair, 'repair re-verify must exist');
  assert.equal(afterRepair[1].trim(), 'nextAttempt');
  const hardcoded = [...src.matchAll(/mode: 'verify'[\s\S]{0,220}attempt:\s*1/g)];
  assert.equal(hardcoded.length, 1, 'only the initial phase verify starts the budget at 1');
  assert.match(hardcoded[0][0], /items: runnable/);
});

