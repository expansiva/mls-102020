import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  applyNs4E2CoveragePatch,
  normalizeNs4E2CoveragePatch,
  validateNs4E2CoveragePatch,
} from '/_102020_/l2/agentNewSolution4/steps/e2/coverageRepair.js';

const previous = normalizeNs4E2Review({
  moduleName: 'buildFlowFsm', reviewRound: 1,
  journeys: [
    { journeyId: 'firstJourney', business: { actorRef: 'manager', title: 'First', goal: 'First goal', prerequisites: [], entry: { mode: 'coldStart', carries: [] }, steps: [], outcome: { statement: 'First outcome', evidence: ['First evidence'] }, useRules: [] } },
    { journeyId: 'secondJourney', business: { actorRef: 'worker', title: 'Second', goal: 'Second goal', prerequisites: [], entry: { mode: 'coldStart', carries: [] }, steps: [], outcome: { statement: 'Second outcome', evidence: ['Second evidence'] }, useRules: [] } },
  ],
  features: [
    { featureId: 'firstFeature', title: 'First feature', priority: 'now', journeyStepRefs: [] },
    { featureId: 'secondFeature', title: 'Second feature', priority: 'next', journeyStepRefs: [] },
  ],
});

test('E2 coverage patch replaces named contracts, appends new contracts and preserves everything omitted', () => {
  const patch = normalizeNs4E2CoveragePatch({
    moduleName: 'buildFlowFsm', reviewRound: 1,
    journeyUpserts: [
      { journeyId: 'secondJourney', business: { actorRef: 'supervisor', title: 'Second repaired', goal: 'Repair second', prerequisites: [], entry: { mode: 'coldStart', carries: [] }, steps: [], outcome: { statement: 'Repaired', evidence: ['Visible'] }, useRules: [] } },
      { journeyId: 'thirdJourney', business: { actorRef: 'client', title: 'Third', goal: 'Add third', prerequisites: [], entry: { mode: 'coldStart', carries: [] }, steps: [], outcome: { statement: 'Third outcome', evidence: ['Visible'] }, useRules: [] } },
    ],
    featureUpserts: [
      { featureId: 'secondFeature', title: 'Second repaired', priority: 'now', journeyStepRefs: [] },
    ],
  });
  assert.deepEqual(validateNs4E2CoveragePatch(patch, 'buildFlowFsm', 1), { ok: true, errors: [] });
  const merged = applyNs4E2CoveragePatch(previous, patch);
  assert.deepEqual(merged.journeys.map(item => item.journeyId), ['firstJourney', 'secondJourney', 'thirdJourney']);
  assert.equal(merged.journeys[0], previous.journeys[0]);
  assert.equal(merged.journeys[1].business.title, 'Second repaired');
  assert.deepEqual(merged.features.map(item => item.title), ['First feature', 'Second repaired']);
});

test('E2 coverage patch rejects empty and duplicate upserts', () => {
  const empty = normalizeNs4E2CoveragePatch({}, 'buildFlowFsm', 1);
  assert.equal(validateNs4E2CoveragePatch(empty, 'buildFlowFsm', 1).ok, false);

  const duplicate = normalizeNs4E2CoveragePatch({
    moduleName: 'buildFlowFsm', reviewRound: 1,
    journeyUpserts: [
      { journeyId: 'sameJourney', business: {} },
      { journeyId: 'sameJourney', business: {} },
    ],
  });
  assert.ok(validateNs4E2CoveragePatch(duplicate, 'buildFlowFsm', 1).errors.some(error => error.includes('duplicates')));
});
