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
