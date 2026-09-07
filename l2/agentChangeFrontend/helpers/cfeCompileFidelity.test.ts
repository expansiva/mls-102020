/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeCompilerFidelity, describeModuleCompileClean, MONACO_GATE_DEFAULTS, BUILD_TSC_DEFAULTS,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.js';

test('monaco branch does not claim tsc-equivalence: skipLibCheck and noEmitOnError differ, strict matches', () => {
  assert.equal(MONACO_GATE_DEFAULTS.strict, BUILD_TSC_DEFAULTS.strict);
  assert.equal(MONACO_GATE_DEFAULTS.noImplicitAny, BUILD_TSC_DEFAULTS.noImplicitAny);
  assert.notEqual(MONACO_GATE_DEFAULTS.skipLibCheck, BUILD_TSC_DEFAULTS.skipLibCheck);
  assert.notEqual(MONACO_GATE_DEFAULTS.noEmitOnError, BUILD_TSC_DEFAULTS.noEmitOnError);
  const line = describeCompilerFidelity('monaco');
  assert.match(line, /Monaco/);
  assert.match(line, /skipLibCheck=false vs tsc true/);
  assert.doesNotMatch(line, /\bclean\b/);
  assert.equal(describeModuleCompileClean('monaco'), 'with no blocking Monaco errors');
});

test('project-tsc branch names the certification compiler and does not say Monaco', () => {
  const line = describeCompilerFidelity('project-tsc');
  assert.match(line, /project tsc/);
  assert.match(line, /tsconfig\.frontend\.json/);
  assert.doesNotMatch(line, /Monaco/);
  assert.equal(describeModuleCompileClean('project-tsc'), 'with no blocking compile errors');
  assert.doesNotMatch(describeModuleCompileClean('project-tsc'), /Monaco/);
});

test('unavailable branch is a state, not a clean compile, and does not say Monaco', () => {
  const line = describeCompilerFidelity('unavailable');
  assert.match(line, /NOT compiled/);
  assert.match(line, /tscGate=unavailable/);
  assert.doesNotMatch(line, /Monaco/);
  assert.doesNotMatch(describeModuleCompileClean('unavailable'), /Monaco/);
});
