/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/listCollectionSummary.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { isOverdueRecord, summarizeCollection } from '/_102020_/l2/agentChangeFrontend/helpers/listCollectionSummary.js';

const now = Date.parse('2026-08-25T15:00:00');

test('overdue is dueDate before today and status not completed or cancelled', () => {
  assert.equal(isOverdueRecord({ status: 'pending', dueDate: '2026-08-24' }, now), true);
  assert.equal(isOverdueRecord({ status: 'inProgress', dueDate: '2026-08-24T23:00:00' }, now), true);
  assert.equal(isOverdueRecord({ status: 'pending', dueDate: '2026-08-25' }, now), false);
  assert.equal(isOverdueRecord({ status: 'completed', dueDate: '2026-08-24' }, now), false);
  assert.equal(isOverdueRecord({ status: 'cancelled', dueDate: '2026-08-24' }, now), false);
  assert.equal(isOverdueRecord({ status: 'pending' }, now), false);
});

test('summarizeCollection counts total, each status and overdue without requiring a selected row', () => {
  const summary = summarizeCollection([
    { status: 'pending', dueDate: '2026-08-20' },
    { status: 'pending', dueDate: '2026-08-28' },
    { status: 'inProgress', dueDate: '2026-08-24' },
    { status: 'completed', dueDate: '2026-08-01' },
    { status: 'cancelled', dueDate: '2026-08-01' },
  ], now);
  assert.equal(summary.total, 5);
  assert.equal(summary.byStatus.pending, 2);
  assert.equal(summary.byStatus.inProgress, 1);
  assert.equal(summary.byStatus.completed, 1);
  assert.equal(summary.byStatus.cancelled, 1);
  assert.equal(summary.overdue, 2);
});
