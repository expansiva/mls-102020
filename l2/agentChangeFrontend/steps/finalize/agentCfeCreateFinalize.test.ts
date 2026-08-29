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
  assert.match(src, /describeCompilerFidelity/);
  assert.match(src, /saveCfRunReport/);
  assert.match(src, /buildCfRunReport/);
  assert.match(src, /cfeRunReport/);
  assert.match(src, /final: true/);
  assert.match(src, /final: !repairing/);
  assert.match(src, /collectRunStepRecords/);
  assert.match(src, /cfeRunSteps/);
  assert.match(src, /no blocking Monaco errors/);
  assert.match(src, /partitionModuleCompileErrors/);
  assert.match(src, /declared \$\{partitioned\.declared\.length\} \.test\.ts finding\(s\) \(never blocking\)/);
  assert.doesNotMatch(src, /file\(s\) clean/);
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
  assert.match(src, /no blocking Monaco errors\$\{declaredNote\}\$\{verdictNote\}/u);
});

void test('R2: o finalize reescreve o veredito do item que reparou antes de ler pagesDone', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  assert.match(src, /rewriteMaterializeVerdictsNowClean/u);
  assert.match(src, /readFinalizeRepairing/u);
  assert.match(src, /repairing: slots\.map\(slot => slot\.ref\)/u);
  // o slot do finalize usa o planId da RODADA — a reescrita casa por outputPath, não por esse planId
  assert.match(src, /compileRepairSlotArgs\(slot, repairPlanId, attempt \+ 1\)/u);
  assert.match(src, /await rewriteMaterializeVerdictsNowClean\(repairModule[\s\S]{0,400}await finalizeGeneratedPages\(\)/u);
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
  // e a REGISTRAÇÃO continua com todas as páginas válidas: o que se perde é a alegação de 'done'
  assert.match(src, /saveFrontendWorkspaceConfig\(context, validPages\)/u);
  // addLanguage só traduz o que ficou pronto
  assert.match(src, /buildAddLanguageMessage\(context, donePages\)/u);
});
