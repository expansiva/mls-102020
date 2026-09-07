/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsPipelineRun.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNsRunSummary, nextPipelineRunNn } from '/_102020_/l2/agentNewSolution/helpers/nsPipelineRun.js';
import type { Ns4PipelineState } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';

void test('nextPipelineRunNn increments only the matching agent slug', () => {
  assert.equal(nextPipelineRunNn(['run01_newsolution', 'run01_changefrontend', 'pipeline'], 'newsolution'), '02');
  assert.equal(nextPipelineRunNn([], 'newsolution'), '01');
});

void test('NS run summary records skipped clarification defaults as a degradation', () => {
  const pipeline = {
    schemaVersion: 'test',
    flowId: 'agentNewSolution',
    flowVersion: 'test',
    moduleName: 'petShop',
    sourcePrompt: 'pet shop in pt-BR',
    presentation: { userLanguage: 'pt-BR' },
    status: 'complete',
    steps: {
      e1: {
        status: 'approved',
        approvedAt: '2026-08-29T00:00:00.000Z',
        updatedAt: '2026-08-29T00:00:00.000Z',
        skippedDefaults: { productLanguages: ['pt-BR'], defaultLanguage: 'pt-BR', moduleName: 'petShop' },
      },
      e10: { status: 'approved', updatedAt: '2026-08-29T01:00:00.000Z' },
    },
    updatedAt: '2026-08-29T01:00:00.000Z',
  } as unknown as Ns4PipelineState;
  const summary = buildNsRunSummary({
    pipeline,
    moduleName: 'petShop',
    longMemory: { fastMode: 'true' },
    verdict: 'completed',
    reason: 'E10 validation passed',
  });
  assert.equal(summary.verdict, 'degraded');
  assert.match(summary.command, /\/fast/);
  assert.equal(summary.degradations.length, 1);
  assert.equal(summary.degradations[0].kind, 'clarification-skip-default');
  assert.match(summary.degradations[0].reason, /productLanguages=pt-BR/);
  assert.equal(summary.counts.skippedClarification, true);
});

void test('NS run summary records discarded languages as a languages-provenance degradation', () => {
  const pipeline = {
    schemaVersion: 'test',
    flowId: 'agentNewSolution',
    flowVersion: 'test',
    moduleName: 'controleEstoque2',
    sourcePrompt: 'criar o módulo controleEstoque2. controle de estoque',
    presentation: { userLanguage: 'pt-BR' },
    status: 'complete',
    steps: {
      e1: {
        status: 'approved',
        approvedAt: '2026-09-06T21:01:53.066Z',
        updatedAt: '2026-09-06T21:01:53.066Z',
        skippedDefaults: {
          productLanguages: ['pt-BR'],
          defaultLanguage: 'pt-BR',
          moduleName: 'controleEstoque2',
          i18nWarnings: ['localization.productLanguages: discarded en, es — languages are a user decision and the user did not cite them in the clarification answer or in the original prompt; kept pt-BR.'],
        },
      },
    },
    updatedAt: '2026-09-06T21:01:53.066Z',
  } as unknown as Ns4PipelineState;
  const summary = buildNsRunSummary({
    pipeline,
    moduleName: 'controleEstoque2',
    longMemory: { fastMode: 'true' },
    verdict: 'completed',
    reason: 'E1 compiled',
  });
  const provenance = summary.degradations.find(item => item.kind === 'languages-provenance');
  assert.ok(provenance);
  assert.match(provenance?.reason || '', /discarded en, es/);
  assert.equal(summary.degradations[0].kind, 'clarification-skip-default');
  assert.match(summary.degradations[0].reason, /productLanguages=pt-BR/);
});

void test('NS run summary records /nochain on the command and does not degrade for it', () => {
  const pipeline = {
    schemaVersion: 'test',
    flowId: 'agentNewSolution',
    flowVersion: 'test',
    moduleName: 'petShop',
    sourcePrompt: 'pet shop in pt-BR',
    presentation: { userLanguage: 'pt-BR' },
    status: 'complete',
    steps: { e10: { status: 'approved', updatedAt: '2026-08-29T01:00:00.000Z' } },
    updatedAt: '2026-08-29T01:00:00.000Z',
  } as unknown as Ns4PipelineState;
  const summary = buildNsRunSummary({
    pipeline,
    moduleName: 'petShop',
    longMemory: { fastMode: 'true', nochainMode: 'true' },
    verdict: 'completed',
    reason: 'E10 validation passed; handoff: suppressed by /nochain — next: @@agentChangeBackend /rebuild all petShop',
  });
  assert.equal(summary.verdict, 'completed');
  assert.match(summary.command, /\/fast/);
  assert.match(summary.command, /\/nochain/);
  assert.equal(summary.degradations.length, 0);
  assert.match(summary.reason, /handoff: suppressed by \/nochain — next: @@agentChangeBackend \/rebuild all petShop/);
});

void test('a failed handoff is recorded as a degradation and degrades a completed run', () => {
  const pipeline = {
    schemaVersion: 'test',
    flowId: 'agentNewSolution',
    flowVersion: 'test',
    moduleName: 'listaAssinatura',
    sourcePrompt: 'lista',
    presentation: { userLanguage: 'pt-BR' },
    status: 'complete',
    steps: { e10: { status: 'approved', updatedAt: '2026-08-29T01:00:00.000Z' } },
    updatedAt: '2026-08-29T01:00:00.000Z',
  } as unknown as Ns4PipelineState;
  const summary = buildNsRunSummary({
    pipeline,
    moduleName: 'listaAssinatura',
    verdict: 'completed',
    reason: 'E10 validation passed',
    extraDegradations: [{
      at: '2026-08-29T01:00:01.000Z',
      kind: 'fast-handoff-dispatch',
      reason: 'Parent step cannot be modified — re-send manually: @@agentChangeBackend /fast /rebuild all listaAssinatura',
    }],
  });
  assert.equal(summary.verdict, 'degraded');
  assert.equal(summary.degradations[0].kind, 'fast-handoff-dispatch');
});

void test('NS run summary records /rebuild all wipe counts as a degradation entry', () => {
  const pipeline = {
    schemaVersion: 'test',
    flowId: 'agentNewSolution',
    flowVersion: 'test',
    moduleName: 'listaAssinatura',
    sourcePrompt: 'Crie um módulo listaAssinatura',
    presentation: { userLanguage: 'pt-BR' },
    status: 'complete',
    rebuiltAt: '2026-08-29T12:00:00.000Z',
    rebuildAll: {
      at: '2026-08-29T12:00:00.000Z',
      deleted: { l1: 4, l2: 7, l4: 20, l5: 3 },
      sanitized: { projectJsonRemoved: 1, configJsonRemoved: 2 },
    },
    steps: {
      e1: { status: 'approved', updatedAt: '2026-08-29T12:01:00.000Z' },
      e10: { status: 'approved', updatedAt: '2026-08-29T13:00:00.000Z' },
    },
    updatedAt: '2026-08-29T13:00:00.000Z',
  } as unknown as Ns4PipelineState;
  const summary = buildNsRunSummary({
    pipeline,
    moduleName: 'listaAssinatura',
    verdict: 'completed',
    reason: 'E10 validation passed',
  });
  assert.equal(summary.verdict, 'completed');
  assert.match(summary.command, /\/rebuild all/);
  const wipe = summary.degradations.find(item => item.kind === 'rebuild-all-wipe');
  assert.ok(wipe);
  assert.match(wipe?.reason || '', /l1=4 l2=7 l4=20 l5=3/);
  assert.deepEqual(summary.counts.rebuildAllDeleted, { l1: 4, l2: 7, l4: 20, l5: 3 });
});
