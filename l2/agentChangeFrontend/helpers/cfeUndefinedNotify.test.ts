/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeUndefinedNotify.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { preserveUndefinedStateNotifications, collectUndefinedStateNotificationIssues, normalizeGeneratedCode } from './cfeMaterializeCore.js';
import { skill } from '../../agentDefsL2/skills/genD2SharedTs.js';

const source = `class RenamedVisitBoard {
  rows: unknown = []; mode: unknown = 'idle'; count: unknown = 7;
  handleIcaStateChange(path: string, next: unknown): void {
    switch(path) { case 'rows': this.rows = next; break; case 'mode': this.mode = next; break; case 'count': this.count = next; break; }
  }
}`;

test('renamed generated notify preserves defaults and updates every defined value', () => {
  const normalized = preserveUndefinedStateNotifications(source);
  const javascript = ts.transpile(normalized, { target: ts.ScriptTarget.ES2022 });
  const board = new Function(`${javascript}; return new RenamedVisitBoard();`)();
  for (const key of ['rows', 'mode', 'count']) board.handleIcaStateChange(key, undefined);
  assert.deepEqual(board.rows, []); assert.equal(board.mode, 'idle'); assert.equal(board.count, 7);
  for (const value of [[], [1], null, false, 0, '', 'success']) {
    board.handleIcaStateChange('rows', value);
    assert.equal(board.rows, value);
    board.handleIcaStateChange('rows', undefined);
    assert.equal(board.rows, value);
  }
  assert.equal(preserveUndefinedStateNotifications(normalized), normalized);
  assert.deepEqual(collectUndefinedStateNotificationIssues(normalized), []);
  const item = { type: 'l2_shared' } as Parameters<typeof normalizeGeneratedCode>[0];
  assert.equal(normalizeGeneratedCode(item, {}, source), normalized);
  assert.equal(normalizeGeneratedCode(item, {}, normalized), normalized);
  assert.match(skill, /if \(value === undefined\) return;/);
});

test('renamed notify quality gate rejects unguarded and truthiness-only handlers', () => {
  assert.equal(collectUndefinedStateNotificationIssues(source).length, 1);
  assert.equal(collectUndefinedStateNotificationIssues(source.replace('switch(path)', 'if (!next) return; switch(path)')).length, 1);
  assert.equal(collectUndefinedStateNotificationIssues(source.replace('switch(path)', 'if (next == null) return; switch(path)')).length, 1);
});
