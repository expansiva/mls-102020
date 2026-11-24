/// <mls fileReference="_102020_/l2/helpers/defsInput/writeKey.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { d2WriteBaseKey, d2WriteKey, parseD2WriteKey, type D2Write } from '/_102020_/l2/helpers/defsInput/writeKey.js';

function roundTrip(write: D2Write): void {
  const key = d2WriteKey(write);
  assert.equal(d2WriteKey(parseD2WriteKey(key)), key);
}

void test('d2_216: parseD2WriteKey round-trips a bare key, a transition key and a call suffix', () => {
  roundTrip({ entity: 'AgentTool', operation: 'create' });
  roundTrip({ entity: 'AgentBehavior', operation: 'transition', transitionRef: 'requestBehaviorChange' });
  roundTrip({ entity: 'AgentTool', operation: 'create', calls: ['runAiPrompt', 'readAgent'] });
  const withCalls = d2WriteKey({ entity: 'AgentTool', operation: 'create', calls: ['runAiPrompt', 'readAgent'] });
  assert.equal(withCalls, 'AgentTool.create+readAgent+runAiPrompt');
  assert.deepEqual(parseD2WriteKey(withCalls), { entity: 'AgentTool', operation: 'create', calls: ['readAgent', 'runAiPrompt'] });
  assert.equal(d2WriteBaseKey(withCalls), 'AgentTool.create');
  assert.equal(d2WriteBaseKey('Despesa.enviarParaAprovacao'), 'Despesa.enviarParaAprovacao');
});
