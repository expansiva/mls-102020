import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  analyzeNs4E2MechanicalCoverage,
  NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL,
} from '/_102020_/l2/agentNewSolution4/steps/e2/coverageSignals.js';

interface Fixture {
  journeys: Array<{ business: { steps: Array<{ kind: string }> } }>;
  expectedStepKindHistogram: Record<string, number>;
}

test('run 38 whole-module replay emits S1 and records the complete step-kind histogram', () => {
  const fixture = JSON.parse(readFileSync(
    new URL('fixtures/run38-module-without-decide.json', import.meta.url), 'utf8',
  )) as Fixture;
  const result = analyzeNs4E2MechanicalCoverage(fixture);
  assert.deepEqual(result.stepKindHistogram, fixture.expectedStepKindHistogram);
  assert.deepEqual(result.findings, [{ signalId: NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL }]);
});

test('a module with at least one decide step emits no S1 finding', () => {
  const result = analyzeNs4E2MechanicalCoverage({
    journeys: [{ business: { steps: [{ kind: 'locate' }, { kind: 'decide' }] } }],
  });
  assert.equal(result.stepKindHistogram.decide, 1);
  assert.deepEqual(result.findings, []);
});
