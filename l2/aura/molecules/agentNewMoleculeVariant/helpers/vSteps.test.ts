/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractVToolOutput } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';

const TOOL = 'submitVariantLess';
const LESS = 'collab-x { color: red; }';

// The real failure locus in the Studio: the provider forces the tool call
// (name matches) but does not enforce the strict {status,result,trace} schema,
// so the model intermittently collapses the envelope. Each shape below is one
// way the payload arrived; all must yield result.lessContent === LESS.

test('canonical envelope (tool wrapper) is extracted', () => {
  const payload = { toolName: TOOL, arguments: { status: 'ok', result: { lessContent: LESS }, trace: [] } };
  const out = extractVToolOutput(payload, TOOL, ['lessContent']);
  assert.equal(out.status, 'ok');
  assert.equal(out.result.lessContent, LESS);
});

test('collapse A — artifact flattened to arguments root { lessContent }', () => {
  const payload = { toolName: TOOL, arguments: { lessContent: LESS } };
  const out = extractVToolOutput(payload, TOOL, ['lessContent']);
  assert.equal(out.status, 'ok');
  assert.equal(out.result.lessContent, LESS);
});

test('collapse B — single-field value put directly in result as a string', () => {
  const payload = { toolName: TOOL, arguments: { status: 'ok', result: LESS, trace: [] } };
  const out = extractVToolOutput(payload, TOOL, ['lessContent']);
  assert.equal(out.status, 'ok');
  assert.equal(out.result.lessContent, LESS);
});

test('collapse A via OpenAI tool_calls with stringified arguments', () => {
  const payload = { tool_calls: [{ function: { name: TOOL, arguments: JSON.stringify({ lessContent: LESS }) } }] };
  const out = extractVToolOutput(payload, TOOL, ['lessContent']);
  assert.equal(out.result.lessContent, LESS);
});

test('v5-demo flattened multi-field { html, examples } is accepted', () => {
  const html = '<div>'.padEnd(220, 'x') + '</div>';
  const examples = [{ name: 'a', state: [] }];
  const payload = { toolName: 'submitVariantDemo', arguments: { html, examples } };
  const out = extractVToolOutput(payload, 'submitVariantDemo', ['html', 'examples']);
  assert.equal(out.result.html, html);
  assert.deepEqual(out.result.examples, examples);
});

test('collapse B does NOT fire for a multi-field schema (bare string stays invalid)', () => {
  // a 2-field artifact can never legitimately be a bare string
  const payload = { toolName: 'submitVariantDemo', arguments: { status: 'ok', result: 'just a string', trace: [] } };
  assert.throws(() => extractVToolOutput(payload, 'submitVariantDemo', ['html', 'examples']));
});

test('explicit model failure with no body surfaces as failed, not extract error', () => {
  const payload = { toolName: TOOL, arguments: { status: 'failed', trace: ['insufficient context'] } };
  const out = extractVToolOutput(payload, TOOL, ['lessContent']);
  assert.equal(out.status, 'failed');
  assert.deepEqual(out.trace, ['insufficient context']);
});

test('unrelated payload still throws', () => {
  const payload = { toolName: TOOL, arguments: { somethingElse: 1 } };
  assert.throws(() => extractVToolOutput(payload, TOOL, ['lessContent']));
});

test('without resultKeys the strict behavior is preserved (flatten rejected)', () => {
  const payload = { toolName: TOOL, arguments: { lessContent: LESS } };
  assert.throws(() => extractVToolOutput(payload, TOOL));
});
