/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approveNs3Step,
  computeInputsHash,
  createNs3Pipeline,
  markNs3DownstreamDirty,
  nextNs3UnapprovedStep,
  recordNs3GateResult,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';

test('computeInputsHash is stable for object key order', () => {
  assert.equal(computeInputsHash({ b: 2, a: 1 }), computeInputsHash({ a: 1, b: 2 }));
});

test('recordNs3GateResult marks a failed gate without approving the step', () => {
  const pipeline = createNs3Pipeline('Cafe Flow', ['e1-draft']);
  const failed = recordNs3GateResult(pipeline, 'e1-draft', { ok: false, errors: ['bad'], warnings: [] }, { prompt: 'x' });
  assert.equal(failed.steps['e1-draft'].status, 'gate_failed');
  assert.equal(failed.steps['e1-draft'].lastGate?.ok, false);
  assert.ok(failed.steps['e1-draft'].inputsHash);
});

test('approval and downstream dirty propagation are explicit', () => {
  let pipeline = createNs3Pipeline('cafeFlow', ['e1-draft', 'e2-journeys']);
  pipeline = approveNs3Step(pipeline, 'e1-draft', 'human');
  pipeline = approveNs3Step(pipeline, 'e2-journeys', 'human');
  pipeline = markNs3DownstreamDirty(pipeline, 'e1-draft', ['e1-draft', 'e2-journeys']);
  assert.equal(pipeline.steps['e1-draft'].dirty, false);
  assert.equal(pipeline.steps['e2-journeys'].dirty, true);
  assert.equal(nextNs3UnapprovedStep(pipeline, ['e1-draft', 'e2-journeys']), 'e2-journeys');
});

