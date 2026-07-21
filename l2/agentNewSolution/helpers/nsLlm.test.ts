/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsLlm.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { createNsToolSchema } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';

// Mirrors the e5-operation shape that broke Grok/xAI (run06/run07): a recursive `$defs.outputField`
// referenced via `#/$defs/outputField`, both at the top level and nested inside `item.fields`.
const RESULT_SCHEMA = {
  $id: 'https://collab.codes/agentNewSolution/e5-operation/x',
  type: 'object',
  additionalProperties: false,
  required: ['outputShape'],
  $defs: {
    outputField: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'type', 'required'],
      properties: {
        name: { type: 'string' },
        type: { enum: ['string', 'number', 'boolean', 'array', 'object'] },
        required: { type: 'boolean' },
        item: {
          type: 'object',
          additionalProperties: false,
          required: ['fields'],
          properties: {
            fields: { type: 'array', items: { $ref: '#/$defs/outputField' } },
          },
        },
      },
    },
  },
  properties: {
    outputShape: {
      type: 'object',
      properties: { fields: { type: 'array', items: { $ref: '#/$defs/outputField' } } },
    },
  },
} as Record<string, unknown>;

function params(tool: unknown): Record<string, any> {
  return (tool as any).function.parameters;
}

void test('createNsToolSchema hoists result.$defs to the parameters root so #/$defs refs resolve at the wrapper root', () => {
  const p = params(createNsToolSchema('submitNsOperation', 'desc', RESULT_SCHEMA));
  // $defs now live at the tool-parameters root (where the provider resolves `#/$defs/...` from).
  assert.ok(p.$defs && p.$defs.outputField, 'parameters.$defs.outputField must exist');
  // result no longer carries $defs or the nested $id.
  assert.equal(p.properties.result.$defs, undefined);
  assert.equal(p.properties.result.$id, undefined);
  // refs are untouched (still #/$defs/outputField) and now resolvable from the root.
  assert.equal(p.properties.result.properties.outputShape.properties.fields.items.$ref, '#/$defs/outputField');
  assert.equal(p.$defs.outputField.properties.item.properties.fields.items.$ref, '#/$defs/outputField');
  // wrapper invariants preserved.
  assert.equal(p.additionalProperties, false);
  assert.deepEqual(p.required, ['status', 'result', 'trace']);
});

void test('createNsToolSchema leaves a $defs-free schema unchanged (no empty $defs added)', () => {
  const p = params(createNsToolSchema('submitNsModel', 'desc', { type: 'object', properties: { a: { type: 'string' } } }));
  assert.equal(p.$defs, undefined);
  assert.deepEqual(p.properties.result, { type: 'object', properties: { a: { type: 'string' } } });
});

void test('createNsToolSchema does not mutate the caller schema', () => {
  const original = JSON.parse(JSON.stringify(RESULT_SCHEMA));
  createNsToolSchema('submitNsOperation', 'desc', RESULT_SCHEMA);
  assert.deepEqual(RESULT_SCHEMA, original, 'input schema must be untouched (shallow copy)');
});
