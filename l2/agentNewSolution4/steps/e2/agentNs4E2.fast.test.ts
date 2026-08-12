import assert from 'node:assert/strict';
import test from 'node:test';

import { isNs4E2FastMode } from '/_102020_/l2/agentNewSolution4/steps/e2/fastMode.js';

test('E2 recognizes the same durable /fast memory used by later automatic checkpoints', () => {
  const context = { task: { iaCompressed: { longMemory: { fastMode: 'true' } } } } as any;
  assert.equal(isNs4E2FastMode(context), true);
});

test('E2 keeps the journey clarification in interactive mode', () => {
  const context = { task: { iaCompressed: { longMemory: {} } } } as any;
  assert.equal(isNs4E2FastMode(context), false);
});
