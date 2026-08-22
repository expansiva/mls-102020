/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { describeCompilerFidelity, MONACO_GATE_DEFAULTS, BUILD_TSC_DEFAULTS } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.js';

test('the gate does not claim tsc-equivalence: skipLibCheck and noEmitOnError differ, strict matches', () => {
  assert.equal(MONACO_GATE_DEFAULTS.strict, BUILD_TSC_DEFAULTS.strict);
  assert.equal(MONACO_GATE_DEFAULTS.noImplicitAny, BUILD_TSC_DEFAULTS.noImplicitAny);
  assert.notEqual(MONACO_GATE_DEFAULTS.skipLibCheck, BUILD_TSC_DEFAULTS.skipLibCheck);
  assert.notEqual(MONACO_GATE_DEFAULTS.noEmitOnError, BUILD_TSC_DEFAULTS.noEmitOnError);
  const line = describeCompilerFidelity();
  assert.match(line, /Monaco/);
  assert.match(line, /skipLibCheck=false vs tsc true/);
  assert.doesNotMatch(line, /\bclean\b/);
});
