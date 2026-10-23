/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asDates.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDateForUser, formatTimestampForUser, isDateType, parseDateInput, parseTimestampInput, todayInfo } from '/_102020_/l2/agentAssistant/helpers/asDates.js';

test('only the ontology date types are dates', () => {
  assert.equal(isDateType('date'), true);
  assert.equal(isDateType('timestamp'), true);
  assert.equal(isDateType('string'), false);
});

test('days: ISO and day-first, real calendar days only', () => {
  assert.equal(parseDateInput('2026-10-21'), '2026-10-21');
  assert.equal(parseDateInput('21/10/2026'), '2026-10-21');
  assert.equal(parseDateInput('21-10-2026'), '2026-10-21');
  assert.equal(parseDateInput('29/02/2028'), '2028-02-29');
  assert.equal(parseDateInput('29/02/2027'), null);
  assert.equal(parseDateInput('10/21/2026'), null, 'month-first is not guessed');
  assert.equal(parseDateInput('tomorrow'), null);
});

test('instants: zoned ISO kept, local date-time converted, a bare day is its start', () => {
  assert.equal(parseTimestampInput('2026-10-21T12:00:00-03:00'), '2026-10-21T15:00:00.000Z');
  assert.equal(parseTimestampInput('2026-10-21T08:15'), new Date(2026, 9, 21, 8, 15).toISOString());
  assert.equal(parseTimestampInput('21/10/2026'), new Date(2026, 9, 21).toISOString());
  assert.equal(parseTimestampInput('21/10/2026 24:00'), null);
});

test('today is local, with the weekday the model needs for "next Friday"', () => {
  assert.deepEqual(todayInfo(new Date(2026, 9, 21, 9, 5)), { date: '2026-10-21', weekday: 'Wednesday', time: '09:05' });
});

test('the confirmation shows dates the way the user writes them', () => {
  assert.equal(formatDateForUser('2026-10-22', 'pt-BR'), '22/10/2026');
  assert.equal(formatDateForUser('2026-10-22', 'en'), '2026-10-22');
  assert.equal(formatTimestampForUser(new Date(2026, 9, 22, 14, 30).toISOString(), 'pt-BR'), '22/10/2026 14:30');
});
