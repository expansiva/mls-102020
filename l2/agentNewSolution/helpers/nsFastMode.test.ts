/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsFastMode.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNsFastMode, isNsFastMode } from '/_102020_/l2/agentNewSolution/helpers/nsFastMode.js';

void test('parseNsFastMode detects /fast and strips it from the prompt', () => {
  assert.deepEqual(parseNsFastMode('/fast build me a petshop'), { fast: true, prompt: 'build me a petshop' });
  assert.deepEqual(parseNsFastMode('build me a petshop /fast'), { fast: true, prompt: 'build me a petshop' });
  assert.deepEqual(parseNsFastMode('build /fast me a petshop'), { fast: true, prompt: 'build me a petshop' });
});

void test('parseNsFastMode leaves a prompt without /fast untouched (interactive path stays default)', () => {
  assert.deepEqual(parseNsFastMode('build me a petshop'), { fast: false, prompt: 'build me a petshop' });
  // whole-word only: /fastlane and refast do NOT trigger fast mode
  assert.deepEqual(parseNsFastMode('deploy to /fastlane'), { fast: false, prompt: 'deploy to /fastlane' });
  assert.equal(parseNsFastMode('').fast, false);
});

void test('isNsFastMode is true only when longMemory carries fastMode === "true"', () => {
  assert.equal(isNsFastMode({ fastMode: 'true' }), true);
  assert.equal(isNsFastMode({ taskName: 'newSolution', flowName: 'agentNewSolution', fastMode: 'true' }), true);
});

void test('isNsFastMode is false for the interactive default (no flag)', () => {
  assert.equal(isNsFastMode({ taskName: 'newSolution', flowName: 'agentNewSolution' }), false);
  assert.equal(isNsFastMode({ fastMode: 'false' }), false);
  assert.equal(isNsFastMode({ fastMode: true }), false); // string 'true' only, not boolean
  assert.equal(isNsFastMode(undefined), false);
  assert.equal(isNsFastMode(null), false);
  assert.equal(isNsFastMode('fastMode'), false);
});
