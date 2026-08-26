/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syEntry.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syParseEntry } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syEntry.js';

void test('empty mention means all groups, no index.ts', () => {
  const entry = syParseEntry('');
  assert.equal(entry.wantsAll, true);
  assert.deepEqual(entry.groupTokens, []);
  assert.equal(entry.includeIndexTs, false);
  assert.equal(entry.error, '');
});

void test("'all' means all groups", () => {
  for (const raw of ['all', 'todos', 'ALL', ' todos ']) {
    const entry = syParseEntry(raw);
    assert.equal(entry.wantsAll, true, raw);
    assert.equal(entry.includeIndexTs, false, raw);
  }
});

void test('a single group, verb only', () => {
  const entry = syParseEntry('atualizar groupEnterText');
  assert.equal(entry.wantsAll, false);
  assert.deepEqual(entry.groupTokens, ['groupEnterText']);
  assert.equal(entry.includeIndexTs, false);
});

void test('a bare group name with no verb at all', () => {
  const entry = syParseEntry('groupEnterText');
  assert.deepEqual(entry.groupTokens, ['groupEnterText']);
});

void test('a comma+e separated list, tolerating grupos/verb', () => {
  const entry = syParseEntry('atualizar grupos groupEnterText, groupSelectOne e groupViewTable');
  assert.deepEqual(entry.groupTokens, ['groupEnterText', 'groupSelectOne', 'groupViewTable']);
  assert.equal(entry.includeIndexTs, false);
});

void test('G2: "incluindo o arquivo index.ts" opts into the index.ts', () => {
  const entry = syParseEntry('atualizar grupo groupEnterText incluindo o arquivo index.ts');
  assert.deepEqual(entry.groupTokens, ['groupEnterText']);
  assert.equal(entry.includeIndexTs, true);
  assert.equal(entry.error, '');
});

void test('G2: "com todos os arquivos" also opts in', () => {
  const entry = syParseEntry('atualizar grupo groupEnterText com todos os arquivos');
  assert.deepEqual(entry.groupTokens, ['groupEnterText']);
  assert.equal(entry.includeIndexTs, true);
});

void test('the index phrase is removed from the group list on both sides', () => {
  const entry = syParseEntry('atualizar grupos groupEnterText e groupSelectOne incluindo o arquivo index.ts');
  assert.deepEqual(entry.groupTokens, ['groupEnterText', 'groupSelectOne']);
  assert.equal(entry.includeIndexTs, true);
});

void test('an unrecognized way of naming the index page is refused, not guessed', () => {
  for (const raw of [
    'atualizar grupo groupEnterText e a página do grupo',
    'atualizar grupo groupEnterText com o showcase',
  ]) {
    const entry = syParseEntry(raw);
    assert.equal(entry.includeIndexTs, false, raw);
    assert.match(entry.error, /index\.ts/, raw);
    assert.match(entry.error, /incluindo o arquivo index\.ts/, raw);
  }
});

void test('a plain group list never trips the index refusal', () => {
  const entry = syParseEntry('atualizar grupos groupEnterText, groupSelectOne e groupViewTable');
  assert.equal(entry.error, '');
});

void test('leading/trailing whitespace and repeated spaces do not break the split', () => {
  const entry = syParseEntry('  atualizar   grupos   groupEnterText ,  groupSelectOne  ');
  assert.deepEqual(entry.groupTokens, ['groupEnterText', 'groupSelectOne']);
});
