/// <mls fileReference="_102020_/l2/aura/agentManagePage2/userChangesCore.test.ts" enhancement="_blank" />

// Tests for the userChanges data layer of agentManagePage2: parse/render/upsert of the defs export,
// the deterministic supersede, and the net that keeps the consolidating LLM honest.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  USER_CHANGES_EXPORT, normalizeUserChanges, parseUserChanges, nextChangeId, supersedeDeterministic,
  validateConsolidated, renderUserChangesExport, upsertUserChanges, hasUserChangesExport,
  summarizeUserChanges, detectEol, type UserChange,
} from '/_102020_/l2/aura/agentManagePage2/userChangesCore.js';
import { parseExportJson } from '/_102020_/l2/aura/agentManagePage2/patchCore.js';

const DEFS = `/// <mls fileReference="_102046_/l2/m/web/desktop/page11/p.defs.ts" enhancement="_blank"/>

export const definition = {
  "pageId": "p",
  "dataBindings": [{ "id": "b1", "inputs": [] }]
};

export const pipeline = [
  { "id": "p__l2_page", "type": "l2_page" }
] as const;
`;

const UC1: UserChange = { id: 'uc1', change: 'Alinhar os botões à esquerda', scope: 'renderApproval', intent: 'layout.align', user: 'guilherme@expansiva.com.br', date: '2026-08-26T14:02:11.000Z' };
const UC2: UserChange = { id: 'uc2', change: 'Esconder a coluna de status', scope: 'renderLocate', intent: 'visibility', user: 'guilherme@expansiva.com.br', date: '2026-08-26T15:00:00.000Z' };

// ─── parse / normalize ──────────────────────────────────────────────────────

test('normalizeUserChanges drops entries with no id or no change and defaults the axes', () => {
  const list = normalizeUserChanges([
    { id: 'uc1', change: ' align ' },
    { id: '', change: 'x' },
    { id: 'uc2' },
    { change: 'no id' },
    'garbage',
    { id: 'uc3', change: 'c', scope: 'renderX', intent: 'style.color', user: 'u', date: 'd', styleReference: 'http://x' },
  ]);
  assert.equal(list.length, 2);
  assert.equal(list[0].change, 'align');
  assert.equal(list[0].scope, 'page');
  assert.equal(list[0].intent, 'layout.align');
  assert.equal(list[1].styleReference, 'http://x');
});

test('parseUserChanges tolerates a defs with no export', () => {
  assert.deepEqual(parseUserChanges(DEFS), []);
  assert.equal(hasUserChangesExport(DEFS), false);
});

test('nextChangeId walks past the highest id in use', () => {
  assert.equal(nextChangeId([]), 'uc1');
  assert.equal(nextChangeId([UC1, UC2]), 'uc3');
  assert.equal(nextChangeId([{ ...UC1, id: 'uc9' }, { ...UC2, id: 'custom' }]), 'uc10');
});

// ─── supersede ──────────────────────────────────────────────────────────────

test('supersedeDeterministic replaces the entry on the same axis and keeps the others', () => {
  const centered: UserChange = { ...UC1, id: 'uc3', change: 'Centralizar os botões', date: '2026-08-26T16:00:00.000Z' };
  const list = supersedeDeterministic([UC1, UC2], centered);
  assert.equal(list.length, 2);
  assert.deepEqual(list.map(e => e.id), ['uc2', 'uc3']);
  assert.equal(list[1].change, 'Centralizar os botões');
});

test('supersedeDeterministic keeps both when the axis or the scope differs', () => {
  const otherAxis: UserChange = { ...UC1, id: 'uc3', intent: 'style.emphasis' };
  assert.equal(supersedeDeterministic([UC1], otherAxis).length, 2);
  const otherScope: UserChange = { ...UC1, id: 'uc4', scope: 'renderLocate' };
  assert.equal(supersedeDeterministic([UC1], otherScope).length, 2);
});

// ─── validation net ─────────────────────────────────────────────────────────

test('validateConsolidated accepts a legitimate consolidation', () => {
  const incoming: UserChange = { ...UC1, id: 'uc3', change: 'Centralizar os botões', date: '2026-08-26T16:00:00.000Z' };
  const guard = validateConsolidated([UC1, UC2], [UC2, incoming], [incoming]);
  assert.equal(guard.ok, true);
  assert.equal((guard as { ok: true; value: UserChange[] }).value.length, 2);
});

test('validateConsolidated refuses an invented entry', () => {
  const incoming: UserChange = { ...UC1, id: 'uc3' };
  const guard = validateConsolidated([UC1], [incoming, { ...UC2, id: 'uc7' }], [incoming]);
  assert.equal(guard.ok, false);
  assert.ok((guard as { ok: false; reason: string }).reason.includes('invented'));
});

test('validateConsolidated refuses a rewritten kept entry', () => {
  const incoming: UserChange = { ...UC2, id: 'uc3' };
  const rewritten = { ...UC1, change: 'algo diferente' };
  assert.equal(validateConsolidated([UC1], [rewritten, incoming], [incoming]).ok, false);
  assert.equal(validateConsolidated([UC1], [{ ...UC1, scope: 'outro' }, incoming], [incoming]).ok, false);
  assert.equal(validateConsolidated([UC1], [{ ...UC1, intent: 'style.color' }, incoming], [incoming]).ok, false);
});

test('validateConsolidated refuses dropping the new entry, or an empty list', () => {
  const incoming: UserChange = { ...UC1, id: 'uc3' };
  assert.equal(validateConsolidated([UC1], [UC1], [incoming]).ok, false);
  assert.equal(validateConsolidated([UC1], [], [incoming]).ok, false);
});

test('validateConsolidated refuses a non-array, a malformed entry and a duplicated id', () => {
  const incoming: UserChange = { ...UC1, id: 'uc3' };
  assert.equal(validateConsolidated([], 'nope', [incoming]).ok, false);
  assert.equal(validateConsolidated([], [{ change: 'no id' }], [incoming]).ok, false);
  assert.equal(validateConsolidated([UC1], [incoming, incoming], [incoming]).ok, false);
});

test('validateConsolidated takes authorship from the agent, never from the model', () => {
  // The two hooks stamp at different instants, so the model's echo of user/date is worthless — and
  // must not be able to poison the record either.
  const incoming: UserChange = { ...UC1, id: 'uc3', user: 'agent@x', date: '2026-08-26T16:00:00.000Z' };
  const tampered = { ...incoming, user: 'someone-else@x', date: '1999-01-01T00:00:00.000Z' };
  const guard = validateConsolidated([UC2], [UC2, tampered], [incoming]);
  assert.equal(guard.ok, true);
  const list = (guard as { ok: true; value: UserChange[] }).value;
  assert.equal(list[1].user, 'agent@x');
  assert.equal(list[1].date, '2026-08-26T16:00:00.000Z');
  assert.equal(list[0].user, UC2.user);   // kept entry keeps the authorship in the file
});

test('validateConsolidated lets the model refine the incoming entry, within the allowed axes', () => {
  const incoming: UserChange = { ...UC1, id: 'uc3', change: 'align left', scope: 'page', intent: 'layout.align' };
  const refined = { ...incoming, change: 'Alinhar os botões à esquerda', scope: 'renderApproval', intent: 'layout.order' };
  const guard = validateConsolidated([], [refined], [incoming]);
  assert.equal(guard.ok, true);
  const entry = (guard as { ok: true; value: UserChange[] }).value[0];
  assert.equal(entry.change, 'Alinhar os botões à esquerda');
  assert.equal(entry.scope, 'renderApproval');
  assert.equal(entry.intent, 'layout.order');

  // an axis outside CHANGE_INTENTS falls back to the one the agent assigned
  const bogus = validateConsolidated([], [{ ...incoming, intent: 'vibes' }], [incoming]);
  assert.equal((bogus as { ok: true; value: UserChange[] }).value[0].intent, 'layout.align');
});

// ─── defs write ─────────────────────────────────────────────────────────────

test('upsertUserChanges inserts the export between definition and pipeline', () => {
  const out = upsertUserChanges(DEFS, [UC1]);
  assert.ok(out.indexOf('export const definition') < out.indexOf(`export const ${USER_CHANGES_EXPORT}`));
  assert.ok(out.indexOf(`export const ${USER_CHANGES_EXPORT}`) < out.indexOf('export const pipeline'));
  assert.equal(hasUserChangesExport(out), true);
  // definition and pipeline survive untouched
  assert.deepEqual(parseExportJson(out, 'definition'), parseExportJson(DEFS, 'definition'));
  assert.deepEqual(parseExportJson(out, 'pipeline'), parseExportJson(DEFS, 'pipeline'));
  assert.deepEqual(parseUserChanges(out), [UC1]);
});

test('upsertUserChanges replaces an existing export in place', () => {
  const once = upsertUserChanges(DEFS, [UC1]);
  const twice = upsertUserChanges(once, [UC1, UC2]);
  assert.equal(twice.split(`export const ${USER_CHANGES_EXPORT}`).length - 1, 1);
  assert.deepEqual(parseUserChanges(twice).map(e => e.id), ['uc1', 'uc2']);
  assert.deepEqual(parseExportJson(twice, 'pipeline'), parseExportJson(DEFS, 'pipeline'));
});

test('upsertUserChanges with an empty list drops the export and leaves no double gap', () => {
  const once = upsertUserChanges(DEFS, [UC1]);
  const cleared = upsertUserChanges(once, []);
  assert.equal(hasUserChangesExport(cleared), false);
  assert.ok(!cleared.includes('\n\n\n'));
  assert.equal(upsertUserChanges(DEFS, []), DEFS);
});

test('upsertUserChanges round-trips text with quotes and accents', () => {
  const tricky: UserChange = { ...UC1, change: 'Usar "aspas", apóstrofo \' e barra \\ no texto' };
  const out = upsertUserChanges(DEFS, [tricky]);
  assert.deepEqual(parseUserChanges(out), [tricky]);
});

test('renderUserChangesExport keeps a stable field order and emits styleReference only when set', () => {
  const block = renderUserChangesExport([UC1]);
  assert.ok(block.startsWith(`export const ${USER_CHANGES_EXPORT} = [`));
  assert.ok(block.endsWith('];'));
  assert.ok(!block.includes('styleReference'));
  assert.ok(renderUserChangesExport([{ ...UC1, styleReference: 'http://x' }]).includes('styleReference'));
  const fields = [...block.matchAll(/"(\w+)":/gu)].map(m => m[1]);
  assert.deepEqual(fields, ['id', 'change', 'scope', 'intent', 'user', 'date']);
});

test('upsertUserChanges appends when the defs has no definition export', () => {
  const orphan = '/// <mls fileReference="x" enhancement="_blank"/>\n\nexport const pipeline = [] as const;\n';
  const out = upsertUserChanges(orphan, [UC1]);
  assert.equal(hasUserChangesExport(out), true);
  assert.deepEqual(parseUserChanges(out), [UC1]);
});

test('upsertUserChanges preserves CRLF and stays reversible', () => {
  // The generated defs on Windows are CRLF; emitting LF made insert+clear non-idempotent on all 34
  // real pages of mls-102046 — a unit fixture with LF endings never sees it.
  const crlf = DEFS.split('\n').join('\r\n');
  assert.equal(detectEol(crlf), '\r\n');
  assert.equal(detectEol(DEFS), '\n');
  const written = upsertUserChanges(crlf, [UC1, UC2]);
  assert.ok(!/[^\r]\n/u.test(written), 'no bare LF was introduced');
  assert.deepEqual(parseUserChanges(written), [UC1, UC2]);
  assert.equal(upsertUserChanges(written, []), crlf);
});

test('renderUserChangesExport honours the requested line ending', () => {
  assert.ok(renderUserChangesExport([UC1], '\r\n').includes('\r\n'));
  assert.ok(!renderUserChangesExport([UC1], '\n').includes('\r'));
});

test('summarizeUserChanges is readable and honest about an empty list', () => {
  assert.ok(summarizeUserChanges([]).includes('no user change'));
  const summary = summarizeUserChanges([UC1, UC2]);
  assert.ok(summary.includes('[layout.align @renderApproval]'));
  assert.equal(summary.split('\n').length, 2);
});
