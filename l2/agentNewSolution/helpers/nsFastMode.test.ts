/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsFastMode.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNsFastMode,
  isNsL4OnlyMode,
  isNsRebuildMode,
  isNsSoftMode,
  parseNsFastMode,
  parseNsL4OnlyMode,
  parseNsRebuildMode,
  parseNsSoftMode,
} from '/_102020_/l2/agentNewSolution/helpers/nsFastMode.js';

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

void test('parseNsRebuildMode detects /rebuild, strips it, and stacks with /fast', () => {
  assert.deepEqual(parseNsRebuildMode('/rebuild build me a petshop'), { rebuild: true, prompt: 'build me a petshop' });
  assert.deepEqual(parseNsRebuildMode('build me a petshop /rebuild'), { rebuild: true, prompt: 'build me a petshop' });
  // whole-word only
  assert.deepEqual(parseNsRebuildMode('run /rebuilder now'), { rebuild: false, prompt: 'run /rebuilder now' });
  // stacks with /fast (both stripped by chaining the parsers, as beforePromptImplicit does)
  const fast = parseNsFastMode('/fast /rebuild build me a petshop');
  const both = parseNsRebuildMode(fast.prompt);
  assert.equal(fast.fast, true);
  assert.equal(both.rebuild, true);
  assert.equal(both.prompt, 'build me a petshop');
});

void test('isNsRebuildMode is true only when longMemory carries rebuild === "true"', () => {
  assert.equal(isNsRebuildMode({ rebuild: 'true' }), true);
  assert.equal(isNsRebuildMode({ taskName: 'newSolution', rebuild: 'true', fastMode: 'true' }), true);
  assert.equal(isNsRebuildMode({ rebuild: 'false' }), false);
  assert.equal(isNsRebuildMode({ taskName: 'newSolution' }), false);
  assert.equal(isNsRebuildMode(undefined), false);
});

void test('/l4only is parsed like its siblings and stops the handoff, nothing else', () => {
  assert.deepEqual(parseNsL4OnlyMode('gestão de obras /l4only'), { l4Only: true, prompt: 'gestão de obras' });
  assert.deepEqual(parseNsL4OnlyMode('/l4only gestão de obras'), { l4Only: true, prompt: 'gestão de obras' });
  // Whole word only — the same guard /fast has, so a module named "l4onlyThing" is not a flag.
  assert.deepEqual(parseNsL4OnlyMode('build the /l4onlyThing module'), { l4Only: false, prompt: 'build the /l4onlyThing module' });
  assert.equal(isNsL4OnlyMode({ l4Only: 'true' }), true);
  assert.equal(isNsL4OnlyMode({ l4Only: true }), false, 'longMemory carries strings');
  assert.equal(isNsL4OnlyMode({}), false);
  assert.equal(isNsL4OnlyMode(undefined), false);
});

void test('the three flags compose in one prompt and leave it clean', () => {
  const fast = parseNsFastMode('/fast /rebuild /l4only gestão de obras');
  const rebuild = parseNsRebuildMode(fast.prompt);
  const l4Only = parseNsL4OnlyMode(rebuild.prompt);
  assert.equal(fast.fast && rebuild.rebuild && l4Only.l4Only, true);
  assert.equal(l4Only.prompt, 'gestão de obras');
});

void test('/soft is a diagnostic flag, parsed like its siblings', () => {
  assert.deepEqual(parseNsSoftMode('gestão de obras /soft'), { soft: true, prompt: 'gestão de obras' });
  assert.deepEqual(parseNsSoftMode('build the /software module'), { soft: false, prompt: 'build the /software module' });
  assert.equal(isNsSoftMode({ soft: 'true' }), true);
  assert.equal(isNsSoftMode({}), false);
});

void test('the four flags compose in one prompt and leave it clean', () => {
  const fast = parseNsFastMode('/fast /rebuild /l4only /soft gestão de obras');
  const rebuild = parseNsRebuildMode(fast.prompt);
  const l4Only = parseNsL4OnlyMode(rebuild.prompt);
  const soft = parseNsSoftMode(l4Only.prompt);
  assert.equal(fast.fast && rebuild.rebuild && l4Only.l4Only && soft.soft, true);
  assert.equal(soft.prompt, 'gestão de obras');
});
