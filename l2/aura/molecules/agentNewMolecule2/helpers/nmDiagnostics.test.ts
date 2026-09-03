/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmDiagnostics.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  flattenMessageText,
  formatCompileDiagnostics,
  resolvePosition,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmDiagnostics.js';

// The real tail of the molecule that failed on 2026-07-31, which is what motivated this module.
const SOURCE = [
  'import { html, TemplateResult } from \'lit\';',
  '',
  'export class X {}',
  '',
  'function nothingAttr(): typeof import(\'lit\').nothing {',
  '  const { nothing } = require(\'lit\') as typeof import(\'lit\');',
  '  return nothing;',
  '}',
].join('\n');

test('resolvePosition gives 1-based line/column and the line text', () => {
  assert.deepEqual(resolvePosition(SOURCE, 0), { line: 1, column: 1, text: 'import { html, TemplateResult } from \'lit\';' });
  const requireOffset = SOURCE.indexOf('require(');
  const at = resolvePosition(SOURCE, requireOffset);
  assert.equal(at.line, 6);
  assert.equal(at.text, '  const { nothing } = require(\'lit\') as typeof import(\'lit\');');
  assert.equal(at.text.slice(at.column - 1, at.column - 1 + 7), 'require');
});

test('an offset past the end does not throw', () => {
  const at = resolvePosition(SOURCE, 999999);
  assert.equal(at.line, SOURCE.split('\n').length);
});

test('the byte offset becomes line, column, the source line and a caret', () => {
  const [formatted] = formatCompileDiagnostics(
    [{ start: SOURCE.indexOf('require('), length: 7, code: 2580, messageText: "Cannot find name 'require'." }],
    SOURCE,
  );
  assert.ok(formatted.startsWith('line 6, col 23 — TS2580: '));
  assert.ok(formatted.includes("Cannot find name 'require'."));
  assert.ok(formatted.includes("const { nothing } = require('lit')"));
  assert.ok(formatted.includes('^^^^^^^'));
  // the caret must sit under `require`
  const lines = formatted.split('\n');
  assert.equal(lines[2].indexOf('^'), lines[1].indexOf('require'));
});

test('a nested DiagnosticMessageChain is flattened', () => {
  assert.equal(flattenMessageText('plain'), 'plain');
  assert.equal(
    flattenMessageText({ messageText: 'Type A is not assignable to type B.', next: [{ messageText: 'Types of property x are incompatible.' }] }),
    'Type A is not assignable to type B. -> Types of property x are incompatible.',
  );
  assert.equal(flattenMessageText(undefined), '');
});

test('a diagnostic without an offset still formats, without a fake position', () => {
  assert.deepEqual(
    formatCompileDiagnostics([{ code: 2322, messageText: 'Type mismatch.' }], SOURCE),
    ['TS2322: Type mismatch.'],
  );
  assert.deepEqual(
    formatCompileDiagnostics([{ start: 10, messageText: 'No source available.' }], ''),
    ['No source available.'],
  );
});

test('a very long line is truncated so it cannot flood the retry prompt', () => {
  const long = `const x = '${'a'.repeat(500)}';`;
  const [formatted] = formatCompileDiagnostics([{ start: 5, length: 1, code: 1005, messageText: 'x' }], long);
  assert.ok(formatted.includes('…'));
  assert.ok(formatted.length < 400);
});

test('the caret never runs past the end of the line', () => {
  const source = 'const a = 1;';
  const [formatted] = formatCompileDiagnostics([{ start: 11, length: 50, code: 1, messageText: 'x' }], source);
  const lines = formatted.split('\n');
  assert.ok(lines[2].trim().length <= source.length);
});
