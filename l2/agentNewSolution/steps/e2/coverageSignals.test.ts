import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  analyzeNs4E2MechanicalCoverage,
  NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL,
} from '/_102020_/l2/agentNewSolution/steps/e2/coverageSignals.js';

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
  assert.deepEqual(result.findings, [{ signalId: NS4_E2_MODULE_WITHOUT_DECIDE_SIGNAL, severity: 'registrar' }]);
});

test('a module with at least one decide step emits no S1 finding', () => {
  const result = analyzeNs4E2MechanicalCoverage({
    journeys: [{ business: { steps: [{ kind: 'locate' }, { kind: 'decide' }] } }],
  });
  assert.equal(result.stepKindHistogram.decide, 1);
  assert.deepEqual(result.findings, []);
});

test('touched E2 files stay English in comments and identifiers', () => {
  const files = [
    fileURLToPath(new URL('./coverageSignals.ts', import.meta.url)),
    fileURLToPath(new URL('./coverageJudge.ts', import.meta.url)),
    fileURLToPath(new URL('./agentNs4E2.ts', import.meta.url)),
    fileURLToPath(new URL('./gate.ts', import.meta.url)),
    fileURLToPath(new URL('./prompt.md', import.meta.url)),
    fileURLToPath(new URL('./coverageJudge.md', import.meta.url)),
  ];
  // Named leftover from the 2026-08-29 persona rule; not rewritten in this spec.
  const legacyLatinExceptions = [
    { file: 'coverageJudge.md', includes: 'responsável', since: '2026-08-29' },
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, file);
    const base = file.split('/').pop() || file;
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('<!--');
      if (!isComment) continue;
      if (legacyLatinExceptions.some(item => item.file === base && trimmed.includes(item.includes))) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, `${file}: ${trimmed}`);
    }
    let stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    for (const item of legacyLatinExceptions) {
      if (item.file === base) stripped = stripped.replaceAll(item.includes, '');
    }
    assert.doesNotMatch(stripped, /[À-ÿ]/, file);
  }
  const agent = readFileSync(fileURLToPath(new URL('./agentNs4E2.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(agent, /allowNoOp/);
  const prompt = readFileSync(fileURLToPath(new URL('./prompt.md', import.meta.url)), 'utf8');
  assert.match(prompt, /A decision is not a confirmation/);
  assert.match(prompt, /<MasterDataEntity>/);
  assert.match(prompt, /<FactEntity>/);
  const judgePrompt = readFileSync(fileURLToPath(new URL('./coverageJudge.md', import.meta.url)), 'utf8');
  assert.doesNotMatch(judgePrompt, /emit exactly one blocking issue/);
});
