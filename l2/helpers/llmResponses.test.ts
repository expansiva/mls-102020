/// <mls fileReference="_102020_/l2/helpers/llmResponses.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { d2LlmModelOf, d2LlmResponseInfo, recordD2LlmResponse, recordD2LlmVerdict } from '/_102020_/l2/helpers/llmResponses.js';

void test('d2_69: the raw answer is written as received, then with its verdict; a failed write is a named error', async () => {
  const writes: unknown[] = [];
  const writer = { writeJson: async (_info: unknown, value: unknown) => { writes.push(structuredClone(value)); } };
  const info = d2LlmResponseInfo(102047, 'mod/pipeline/agentDefsL2/shared60/responses', 'pageA', '2');
  assert.equal(`${info.folder}/${info.shortName}${info.extension}`, 'mod/pipeline/agentDefsL2/shared60/responses/pageA-2.json');
  const raw = { type: 'flexible', result: { toolName: 'submitD2Shared', arguments: '{"states":[]}' } };
  const record = await recordD2LlmResponse(info, { attempt: '2', model: d2LlmModelOf({ interaction: { trace: ['provider: x model:openai/gpt-5 alias:reasoning'] } }), promptChars: 10, receivedAt: 'now', raw }, writer);
  await recordD2LlmVerdict(info, record, 'D2_SHARED_V2_LIST_STATE: ...', writer);
  assert.deepEqual(writes, [
    { attempt: '2', model: 'openai/gpt-5', promptChars: 10, receivedAt: 'now', raw },
    { attempt: '2', model: 'openai/gpt-5', promptChars: 10, receivedAt: 'now', raw, verdict: 'D2_SHARED_V2_LIST_STATE: ...' },
  ]);
  assert.equal(d2LlmModelOf({ interaction: null }), '');
  await assert.rejects(() => recordD2LlmResponse(info, record, { writeJson: async () => { throw new Error('disk full'); } }),
    /D2_LLM_RESPONSE_RECORD_FAILED: mod\/pipeline\/agentDefsL2\/shared60\/responses\/pageA-2\.json: disk full/u);
});
