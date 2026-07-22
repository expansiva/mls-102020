/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e1-draft/agentNsDraft.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import {
  prepareE1DraftArtifact,
  validateE1DraftInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e1-draft/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitNsDraft';
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentNsDraft tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(buildTool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentNsDraft live @ ${modelType}: schema accepted + E1 gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'prompt.md'), 'utf8').split('{{toolName}}').join(TOOL_NAME)}\n\n${buildToolInstruction()}`,
      human: [
        '## Initial prompt',
        'Create a module for cafe orders, kitchen preparation and pickup.',
        '',
        '## Clarification 1',
        JSON.stringify({ userLanguage: 'en', answers: { scope: 'counter orders first', users: 'attendant and cook' } }, null, 2),
      ].join('\n'),
      tool: buildTool(),
    });
    assertLiveResponse(r);
    const artifact = prepareE1DraftArtifact(r.args, { requestedModuleFallback: 'Create a module for cafe orders.' });
    const errors = validateE1DraftInvariants(artifact).issues.filter(issue => issue.severity === 'error');
    assert.equal(errors.length, 0, errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  });
}

function buildTool(): { type: 'function'; function: { name: string; description: string; parameters: unknown } } {
  const resultSchema = JSON.parse(readFileSync(path.join(HERE, '../../schemas/e1-draft.schema.json'), 'utf8'));
  return {
    type: 'function',
    function: {
      name: TOOL_NAME,
      description: 'Submit the E1 understanding draft.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'result', 'questions', 'trace'],
        properties: {
          status: { type: 'string', enum: ['ok', 'needs_input', 'failed'] },
          result: resultSchema,
          questions: { type: 'array', items: { type: 'string' } },
          trace: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  };
}

function buildToolInstruction(): string {
  return `
Call the "${TOOL_NAME}" tool with only these top-level arguments:
{
  "status": "ok" | "needs_input" | "failed",
  "result": artifact matching the JSON schema,
  "questions": [],
  "trace": []
}

Do not include "type", "toolName", or "arguments" in the tool arguments.
Use "needs_input" only when there is a blocking question.
`;
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}
