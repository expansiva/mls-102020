/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeCreateFinalize declares the finalize step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCfeCreateFinalize/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCfeCreateFinalize"/);
});

void test('the finalize gate declares Monaco vs tsc fidelity and writes a cf-run dossier', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.match(src, /describeCompilerFidelity\(compiled\.trace\.path\)/);
  assert.match(src, /saveCfRunReport/);
  assert.match(src, /buildCfRunReport/);
  assert.match(src, /cfeRunReport/);
  assert.match(src, /final: true/);
  assert.match(src, /final: !repairing/);
  assert.match(src, /collectRunStepRecords/);
  assert.match(src, /cfeRunSteps/);
  assert.match(src, /describeModuleCompileClean\(compiled\.trace\.path\)/);
  assert.match(src, /partitionModuleCompileErrors/);
  assert.match(src, /declared \$\{partitioned\.declared\.length\} \.test\.ts finding\(s\) \(never blocking\)/);
  assert.match(src, /tscGateOf\(compiled\.trace\.path\)/);
  assert.match(src, /path: compiled\.trace\.path/);
  assert.doesNotMatch(src, /file\(s\) clean/);
  assert.doesNotMatch(src, /typeof Deno/);
  assert.doesNotMatch(src, /"Deno" in globalThis/);
});

// D3/D2 (run01 do 102047, 28/ago) — o run fechou `completed` com `pagesDone` listando as 3 páginas
// enquanto o próprio veredito da materialização registrava 3 itens `blocked`; o `tsc` acha 5 erros
// exatamente nesses arquivos. O gate roda em Monaco e não os reproduziu.
void test('D3: o gate responde pelos vereditos da materialização e nomeia o que não reproduziu', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.match(src, /readUnresolvedMaterializeItems\(result\.moduleName\)/u);
  // suspeitos, não veredito: só entra na nota o que o compile do módulo NÃO reproduziu
  assert.match(src, /\.filter\(item => !compiled\.errors\.some\(/u);
  assert.match(src, /MATERIALIZE-VERDICT-UNREPRODUCED/u);
  // e a nota tem de aparecer nos TRÊS desfechos do gate, inclusive no limpo
  const notes = src.match(/\$\{verdictNote\}/gu) ?? [];
  assert.equal(notes.length, 3, `verdictNote aparece ${notes.length}x`);
  assert.match(src, /describeModuleCompileClean\(compiled\.trace\.path\)\}\$\{declaredNote\}\$\{verdictNote\}/u);
});

void test('R2: o finalize reescreve o veredito do item que reparou antes de ler pagesDone', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.match(src, /rewriteMaterializeVerdictsNowClean/u);
  assert.match(src, /readFinalizeRepairing/u);
  assert.match(src, /repairing: slots\.map\(slot => slot\.ref\)/u);
  // o slot do finalize usa o planId da RODADA — a reescrita casa por outputPath, não por esse planId
  assert.match(src, /compileRepairSlotArgs\(slot, repairPlanId, attempt \+ 1\)/u);
  assert.match(src, /await rewriteMaterializeVerdictsNowClean\(repairModule[\s\S]{0,400}await finalizeGeneratedPages\(runModule\)/u);
  // UNREPRODUCED permanece: só entra na nota o que o compile NÃO reproduziu
  assert.match(src, /MATERIALIZE-VERDICT-UNREPRODUCED/u);
});

void test('D2: uma página com item bloqueado não entra em pagesDone', () => {
  const src = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  assert.match(src, /const donePages = validPages\.filter\(page => !incompletePages\.some\(/u);
  assert.match(src, /pagesDone: donePages\.map\(page => page\.pageId\)/u);
  assert.match(src, /updateOwnerStatuses\(context, donePages\.flatMap/u);
  // o relatório registra a página incompleta com o motivo, em vez de omitir
  assert.match(src, /incompletePages: incompletePages\.filter\(item => item\.page\.moduleName === moduleName\)/u);
  // página que não materializou não entra no config; as que passaram, sim
  assert.match(src, /saveFrontendWorkspaceConfig\(context, validPages, incompletePages\.map\(entry => entry\.page\.pageId\)\)/u);
  assert.match(src, /function configPageIdOmitted/);
  assert.match(src, /filter\(item => !configPageIdOmitted\(readString\(item\.pageId\), omit\)\)/);
  const finalize = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.match(finalize, /excludeErrorsOnRefs\(compiled\.errors, unresolvedRefs\)/u);
  // addLanguage só traduz o que ficou pronto
  assert.match(src, /buildAddLanguageMessage\(context, donePages\)/u);
});

void test('scan-warning notices land on runNN_changefrontend.json as scanWarnings, not as degradations', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.match(src, /item\.kind === 'scan-warning'/);
  assert.match(src, /scanWarnings,/);
  assert.match(src, /item\.kind !== 'scan-warning'/);
});

void test('F1: finalize takes the run module from the step prompt, never the create-run cache', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  const shared = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  const materialize = readFileSync(path.join(HERE, '..', 'materialize', 'agentCfeMaterializeL2.ts'), 'utf8');
  assert.match(src, /readFinalizeModule\(step\.prompt\)/u);
  assert.match(src, /finalizeGeneratedPages\(runModule\)/u);
  assert.match(src, /repairing: slots\.map\(slot => slot\.ref\), module: moduleName/u);
  assert.match(materialize, /planId: 'finalize-create', materialized: todo\.length, module: moduleName/u);
  assert.match(shared, /export async function finalizeGeneratedPages\(runModule = ''\)/u);
  assert.doesNotMatch(shared, /function currentCreateRunModule/u);
  assert.doesNotMatch(src, /getCreateRuns\(\)/u);
});

const g = globalThis as unknown as Record<string, any>;
const TSC2367 = "mls-102047/l2/controleEstoque4/web/desktop/page31/stockMovementCatalogue.ts(42,729): error TS2367: This comparison appears to be unintentional because the types '\"idle\" | \"success\" | \"error\"' and '\"loading\"' have no overlap.\nmls-102051/l5/runtimeConfig.ts(1,1): error TS2322: Type '\"x\"' is not assignable to type 'RuntimeConfig'.";

function installHostMls(diskPath: ((info: { project: number; shortName: string }) => string) | null): void {
  const folder = 'controleEstoque4/web/desktop/page31';
  const shortName = 'stockMovementCatalogue';
  const fileKey = `102047:2:${folder}:${shortName}:.ts`;
  g.mls = {
    actualProject: 102047,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files: {
        [fileKey]: { project: 102047, level: 2, folder, shortName, extension: '.ts', status: 'changed' },
      },
      getKeyToFile: (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      ...(diskPath ? { diskPath } : {}),
    },
    editor: {},
    l2: {},
  };
}

void test('compileModuleClosure without Monaco and with injected tsc keeps the filtered error', async () => {
  installHostMls(() => '/Volumes/x/collab/mls-base/mls-102047/l2/controleEstoque4/web/desktop/page31/stockMovementCatalogue.ts');
  const { compileModuleClosure } = await import('/_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.js');
  const { describeCompilerFidelity } = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.js');
  const { tscGateOf } = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeProjectTsc.js');
  const result = await compileModuleClosure('controleEstoque4', { runTsc: async () => TSC2367 });
  assert.equal(result.trace.path, 'project-tsc');
  assert.equal(result.trace.rawDiagnostics, 2);
  assert.equal(result.trace.afterFilter, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /stockMovementCatalogue\.ts: TS2367/);
  assert.equal(tscGateOf(result.trace.path), 'ran');
  assert.doesNotMatch(describeCompilerFidelity(result.trace.path), /Monaco/);
});

void test('compileModuleClosure without Monaco and without spawn is unavailable, not clean-Monaco', async () => {
  installHostMls(() => '/Volumes/x/collab/mls-base/mls-102047/l2/controleEstoque4/web/desktop/page31/stockMovementCatalogue.ts');
  const { compileModuleClosure } = await import('/_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.js');
  const { describeCompilerFidelity, describeModuleCompileClean } = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.js');
  const { tscGateOf } = await import('/_102020_/l2/agentChangeFrontend/helpers/cfeProjectTsc.js');
  const result = await compileModuleClosure('controleEstoque4', { runTsc: async () => null });
  assert.equal(result.trace.path, 'unavailable');
  assert.equal(result.trace.reason, 'no-child-process');
  assert.deepEqual(result.errors, []);
  assert.equal(tscGateOf(result.trace.path), 'unavailable');
  assert.doesNotMatch(describeCompilerFidelity(result.trace.path), /Monaco/);
  assert.doesNotMatch(describeModuleCompileClean(result.trace.path), /Monaco/);
});
