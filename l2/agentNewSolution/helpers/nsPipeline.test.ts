/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsPipeline.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveNsStep,
  computeInputsHash,
  createNsPipeline,
  markNsDownstreamDirty,
  nextNsUnapprovedStep,
  recordNsGateResult,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';

test('computeInputsHash is stable for object key order', () => {
  assert.equal(computeInputsHash({ b: 2, a: 1 }), computeInputsHash({ a: 1, b: 2 }));
});

test('recordNsGateResult marks a failed gate without approving the step', () => {
  const pipeline = createNsPipeline('Cafe Flow', ['e1-draft']);
  const failed = recordNsGateResult(pipeline, 'e1-draft', { ok: false, errors: ['bad'], warnings: [] }, { prompt: 'x' });
  assert.equal(failed.steps['e1-draft'].status, 'gate_failed');
  assert.equal(failed.steps['e1-draft'].lastGate?.ok, false);
  assert.ok(failed.steps['e1-draft'].inputsHash);
});

test('approval and downstream dirty propagation are explicit', () => {
  let pipeline = createNsPipeline('cafeFlow', ['e1-draft', 'e2-journeys']);
  pipeline = approveNsStep(pipeline, 'e1-draft', 'human');
  pipeline = approveNsStep(pipeline, 'e2-journeys', 'human');
  pipeline = markNsDownstreamDirty(pipeline, 'e1-draft', ['e1-draft', 'e2-journeys']);
  assert.equal(pipeline.steps['e1-draft'].dirty, false);
  assert.equal(pipeline.steps['e2-journeys'].dirty, true);
  assert.equal(nextNsUnapprovedStep(pipeline, ['e1-draft', 'e2-journeys']), 'e2-journeys');
});

