/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/agentNsJourneys.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import {
  prepareE2JourneysArtifact,
  validateE2JourneysInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitNsJourneys';
const MODEL_TYPES = ['code', 'design'] as const;
const E1_ACTOR_IDS = ['attendant', 'cook'];

void test('agentNsJourneys tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(buildTool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentNsJourneys live @ ${modelType}: schema accepted + E2 gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'prompt.md'), 'utf8').split('{{toolName}}').join(TOOL_NAME)}\n\n${buildToolInstruction()}`,
      human: [
        '## E1 draft (only source)',
        JSON.stringify({
          moduleName: 'cafeFlow',
          moduleTitle: 'Cafe Flow',
          userLanguage: 'en',
          actors: E1_ACTOR_IDS.map(actorId => ({ actorId, name: actorId })),
          problem: 'Cafe orders need to be registered and prepared without losing status.',
          scope: { in: ['Counter order entry', 'Kitchen queue'], out: ['Fiscal accounting'] },
        }, null, 2),
      ].join('\n'),
      tool: buildTool(),
    });
    assertLiveResponse(r);
    const artifact = prepareE2JourneysArtifact(r.args);
    const errors = validateE2JourneysInvariants(artifact, { e1ActorIds: E1_ACTOR_IDS }).issues.filter(issue => issue.severity === 'error');
    assert.equal(errors.length, 0, errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  });
}

function buildTool(): { type: 'function'; function: { name: string; description: string; parameters: unknown } } {
  const resultSchema = JSON.parse(readFileSync(path.join(HERE, '../../schemas/e2-journeys.schema.json'), 'utf8'));
  return {
    type: 'function',
    function: {
      name: TOOL_NAME,
      description: 'Submit the E2 journeys and feature catalog.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'result', 'trace'],
        properties: {
          status: { type: 'string', enum: ['ok', 'failed'] },
          result: resultSchema,
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
  "status": "ok" | "failed",
  "result": artifact matching the JSON schema,
  "trace": []
}

Do not include "type", "toolName", or "arguments" in the tool arguments.
Use status "failed" only when the E1 draft is missing or unusable.
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
