/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { errorIssue, runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';

const schema = {
  type: 'object',
  required: ['id', 'items'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    items: { type: 'array', minItems: 1, items: { type: 'string' } },
  },
};

test('runNs3Gate validates schema and invariants', async () => {
  const result = await runNs3Gate({
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

test('runNs3Gate retries once with gate errors in context', async () => {
  const contexts: string[] = [];
  const result = await runNs3Gate({
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

