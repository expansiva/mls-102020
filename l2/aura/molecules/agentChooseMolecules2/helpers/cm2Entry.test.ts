/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Entry.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { cm2ContractFileFromTarget, cm2ParseEntry, cm2StripMention } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Entry.js';

void test('strips the @@ mention prefix, case-insensitively', () => {
  assert.equal(cm2StripMention('@@agentChooseMolecules2 {"a":1}'), '{"a":1}');
  assert.equal(cm2StripMention('@@AGENTCHOOSEMOLECULES2  {"a":1}'), '{"a":1}');
  assert.equal(cm2StripMention('{"a":1}'), '{"a":1}');
});

void test('parses a valid { catalogProject, target } argument', () => {
  const entry = cm2ParseEntry('@@agentChooseMolecules2 {"catalogProject": 102040, "target": "_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs"}');
  assert.equal(entry.error, '');
  assert.equal(entry.catalogProject, 102040);
  assert.equal(entry.target, '_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs');
  assert.deepEqual(entry.targetFile, {
    project: 102046,
    level: 2,
    folder: 'buildFlowFsm/web/desktop/page11',
    shortName: 'approveChangeOrder',
    extension: '.defs.ts',
  });
});

void test('rejects prose instead of an object', () => {
  assert.notEqual(cm2ParseEntry('Cadastro de cliente: nome completo, CPF').error, '');
});

void test('rejects invalid JSON (unquoted keys are not accepted — the mention has no free prose to justify a looser parser)', () => {
  const entry = cm2ParseEntry('{catalogProject: 102040, target: "x"}');
  assert.notEqual(entry.error, '');
});

void test('requires catalogProject as a number', () => {
  assert.notEqual(cm2ParseEntry('{"target": "_102046_/l2/a/b/c.defs"}').error, '');
  assert.notEqual(cm2ParseEntry('{"catalogProject": "abc", "target": "_102046_/l2/a/b/c.defs"}').error, '');
});

void test('requires target, and rejects a materialized .ts instead of .defs.ts', () => {
  assert.notEqual(cm2ParseEntry('{"catalogProject": 102040}').error, '');
  assert.notEqual(cm2ParseEntry('{"catalogProject": 102040, "target": "_102046_/l2/a/b/c"}').error, '');
});

void test('derives the sibling contract path from a device/layout page path', () => {
  const contract = cm2ContractFileFromTarget({ project: 102046, level: 2, folder: 'buildFlowFsm/web/desktop/page11', shortName: 'approveChangeOrder', extension: '.defs.ts' });
  assert.deepEqual(contract, { project: 102046, level: 2, folder: 'buildFlowFsm/web/contracts', shortName: 'approveChangeOrder', extension: '.defs.ts' });
});

void test('returns null when the target has no "web" segment to anchor on', () => {
  assert.equal(cm2ContractFileFromTarget({ project: 102046, level: 2, folder: 'buildFlowFsm/l4stuff', shortName: 'x', extension: '.defs.ts' }), null);
});
