import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102020_/l2/agentNewSolution4/helpers/ns4WorkerTools.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT = path.resolve(HERE, '..');

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(AGENT, relativePath), 'utf8')) as Record<string, unknown>;
}

test('NS4 worker tools use strict flexible envelopes with root-level $defs', () => {
  for (const schemaFile of [
    'schemas/e4-entity-worker.schema.json',
    'schemas/e7-usecase-worker.schema.json',
    'schemas/e8-workspace-detail-worker.schema.json',
  ]) {
    const tool = createNs4FlexibleWorkerTool('submitFixture', 'Fixture tool.', readJson(schemaFile));
    const parameters = tool.function.parameters as Record<string, unknown>;
    assert.equal(parameters.type, 'object');
    assert.equal(parameters.additionalProperties, false);
    assert.deepEqual(parameters.required, ['type', 'result']);
    assert.deepEqual(parameters.properties && (parameters.properties as Record<string, unknown>).type,
      { type: 'string', const: 'flexible' });
    const result = (parameters.properties as Record<string, Record<string, unknown>>).result;
    assert.equal(result.$defs, undefined);
    assert.equal(result.$id, undefined);
    assert.ok(parameters.$defs, `${schemaFile} must hoist $defs to parameters`);
    assert.equal(lintToolSchema(JSON.stringify(parameters)), null, schemaFile);
  }
});

test('NS4 worker fixtures unwrap the new flexible envelope and retain raw-run compatibility', () => {
  const e4 = readJson('steps/e4/fixtures/flexible-entity-envelope.json');
  const e7 = readJson('steps/e7/fixtures/flexible-usecase-envelope.json');
  const e8 = readJson('steps/e8/fixtures/flexible-workspace-envelope.json');
  const e4ToolCall = readJson('steps/e4/fixtures/tool-call-flexible-entity.json');
  const rawE7 = readJson('steps/e7/fixtures/raw-usecase-legacy.json');

  assert.equal((unwrapNs4FlexibleWorkerPayload(e4) as Record<string, unknown>).entityId, 'Project');
  assert.equal((unwrapNs4FlexibleWorkerPayload(e7) as Record<string, unknown>).useCaseId, 'locateProject');
  assert.equal((unwrapNs4FlexibleWorkerPayload(e8) as Record<string, unknown>).workspaceId, 'projectWorkspace');
  assert.equal((unwrapNs4FlexibleWorkerPayload(e4ToolCall) as Record<string, unknown>).entityId, 'Project');
  assert.deepEqual(unwrapNs4FlexibleWorkerPayload(rawE7), rawE7);
});
