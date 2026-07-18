/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsGate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { errorIssue, runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';

const schema = {
  type: 'object',
  required: ['id', 'items'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    items: { type: 'array', minItems: 1, items: { type: 'string' } },
  },
};

test('runNsGate validates schema and invariants', async () => {
  const result = await runNsGate({
    stepId: 'x',
    schema,
    artifact: { id: 'ok', items: ['a'] },
    validate: artifact => ({
      artifact,
      issues: artifact.items.includes('a') ? [] : [errorIssue('missing_a', 'items must include a')],
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test('runNsGate retries once with gate errors in context', async () => {
  const contexts: string[] = [];
  const result = await runNsGate({
    stepId: 'x',
    schema,
    artifact: { id: '', items: [] },
    retry: (context) => {
      contexts.push(context);
      return { id: 'fixed', items: ['a'] };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
  assert.match(contexts[0], /schema/);
});

