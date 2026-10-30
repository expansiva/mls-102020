/// <mls fileReference="_102020_/l2/helpers/defsHistory/defsHistory.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defsHistoryKey, findDefsHistory, indexOfDefsHistory, recordDefsHistory, removeDefsHistory, restoreDefsHistory, splitDefsHistory, withDefsHistory,
  type DefsHistoryEntry,
} from '/_102020_/l2/helpers/defsHistory/defsHistory.js';

// 999999/sampleModule are fictitious on purpose: no test depends on a real project.
const DEFS = '/// <mls fileReference="_999999_/l2/sampleModule/web/desktop/page11/pessoas.defs.ts" enhancement="_blank"/>\n\n'
  + 'export const definition = {\n  "intent": "x"\n} as const;\n';

const swap = (to: string, at = '2026-10-27T10:00:00Z'): DefsHistoryEntry => ({
  kind: 'molecule', organism: 'cadastroPessoa', target: 'groupentertext--ml-enter-text#0',
  from: 'groupentertext--ml-enter-text', to, at, scope: 'all',
});
const cls = (from: string, to: string): DefsHistoryEntry => ({
  kind: 'class', organism: 'pessoasEquipe', target: 'div>button#1', from, to, at: '2026-10-27T10:00:00Z', attribute: 'class',
});
const text = (lang: string, to: string): DefsHistoryEntry => ({
  kind: 'text', organism: null, target: 'nomeLabel', from: 'Nome', to, at: '2026-10-27T10:00:00Z', attribute: null, lang,
});

test('a defs without history splits into itself and an empty list', () => {
  assert.deepEqual(splitDefsHistory(DEFS), { base: DEFS, history: [] });
});

test('write then read returns the entries and the producer text byte for byte', () => {
  const entries = [swap('groupentertext--ml-floating-text-input'), cls('px-3', 'px-4'), text('pt-br', 'Nome completo'), { ...text('pt-br', 'Título'), lang: null } as DefsHistoryEntry];
  const written = withDefsHistory(DEFS, entries);
  assert.ok(written.startsWith(DEFS));
  assert.match(written, /\nexport const history = \[\n[\s\S]*\] as const;\n$/u);
  assert.deepEqual(splitDefsHistory(written), { base: DEFS, history: entries });
  assert.equal(withDefsHistory(written, []), DEFS);
  assert.equal(withDefsHistory(withDefsHistory(written, entries), entries), written);
});

const prop = (from: string | null, to: string | null): DefsHistoryEntry => ({
  kind: 'prop', organism: 'cadastroPessoa', target: 'div>groupentertext--ml-enter-text', at: '2026-10-27T10:00:00Z', from, to, attribute: 'size',
});

test('a property keeps absent (null) apart from a bare attribute ("")', () => {
  const entries = [prop(null, 'sm'), { ...prop('', null), attribute: 'disabled' } as DefsHistoryEntry];
  assert.deepEqual(splitDefsHistory(withDefsHistory(DEFS, entries)).history, entries);
  let history = recordDefsHistory([], prop(null, 'sm'));
  history = recordDefsHistory(history, prop('sm', 'lg'));
  assert.deepEqual(history, [prop(null, 'lg')]);
  assert.deepEqual(recordDefsHistory(history, prop('lg', null)), []);
  assert.notEqual(defsHistoryKey(prop(null, 'sm')), defsHistoryKey({ ...prop(null, 'sm'), attribute: 'variant' } as DefsHistoryEntry));
  const bad = `${DEFS}\nexport const history = ${JSON.stringify([{ ...prop(null, 'sm'), to: 3 }])} as const;\n`;
  assert.throws(() => splitDefsHistory(bad), /value/u);
});

test('CRLF files keep CRLF', () => {
  const crlf = DEFS.replace(/\n/gu, '\r\n');
  const written = withDefsHistory(crlf, [cls('a', 'b')]);
  assert.ok(!/[^\r]\n/u.test(written));
  assert.deepEqual(splitDefsHistory(written), { base: crlf, history: [cls('a', 'b')] });
});

test('a history that is not the last block, or not JSON, is refused', () => {
  const written = withDefsHistory(DEFS, [cls('a', 'b')]);
  assert.throws(() => splitDefsHistory(`${written}\nexport const other = 1;\n`), /DEFS_HISTORY_FORMAT/u);
  assert.throws(() => splitDefsHistory(`${DEFS}\nexport const history = [oops] as const;\n`), /DEFS_HISTORY_FORMAT/u);
});

test('the entry grammar is exact', () => {
  const bad = (entry: unknown) => `${DEFS}\nexport const history = ${JSON.stringify([entry])} as const;\n`;
  assert.throws(() => splitDefsHistory(bad({ ...cls('a', 'b'), extra: 1 })), /forbidden field extra/u);
  assert.throws(() => splitDefsHistory(bad({ ...swap('x'), scope: 'some' })), /scope/u);
  assert.throws(() => splitDefsHistory(bad({ ...text('pt', 'x'), lang: '' })), /lang/u);
  const { attribute: _, ...noAttribute } = cls('a', 'b') as Extract<DefsHistoryEntry, { kind: 'class' }>;
  assert.throws(() => splitDefsHistory(bad(noAttribute)), /missing field attribute/u);
  assert.throws(() => splitDefsHistory(bad({ ...cls('a', 'b'), kind: 'move' })), /kind/u);
});

test('A→B, other edits, then B→C is one entry A→C, moved to the end: the list follows the last change', () => {
  let entries = recordDefsHistory([], text('pt-br', 'B'));
  entries = recordDefsHistory(entries, cls('px-3', 'px-4'));
  entries = recordDefsHistory(entries, swap('groupentertext--ml-floating-text-input'));
  entries = recordDefsHistory(entries, { ...text('pt-br', 'C'), from: 'B' } as DefsHistoryEntry);
  assert.deepEqual(entries, [cls('px-3', 'px-4'), swap('groupentertext--ml-floating-text-input'), text('pt-br', 'C')]);
});

test('undo puts the entry back where it was; redo puts it last again', () => {
  const start = [text('pt-br', 'B'), cls('px-3', 'px-4')];
  const key = defsHistoryKey(text('pt-br', 'B'));
  const before = findDefsHistory(start, key);
  const beforeIndex = indexOfDefsHistory(start, key);
  const edited = recordDefsHistory(start, { ...text('pt-br', 'C'), from: 'B' } as DefsHistoryEntry);
  assert.deepEqual(restoreDefsHistory(edited, key, before, beforeIndex), start);
  assert.deepEqual(restoreDefsHistory(start, key, findDefsHistory(edited, key)), edited);
  assert.equal(indexOfDefsHistory(start, defsHistoryKey(cls('x', 'y'))), 1);
  assert.equal(indexOfDefsHistory([], key), -1);
});

test('an edit back to the original removes the entry; a no-op edit records nothing', () => {
  let entries = recordDefsHistory([], swap('groupentertext--ml-floating-text-input'));
  entries = recordDefsHistory(entries, { ...swap('groupentertext--ml-enter-text'), from: 'groupentertext--ml-floating-text-input' });
  assert.deepEqual(entries, []);
  assert.deepEqual(recordDefsHistory([], cls('a', 'a')), []);
});

test('the key separates attribute and language', () => {
  assert.notEqual(defsHistoryKey(text('pt-br', 'x')), defsHistoryKey(text('en', 'x')));
  assert.notEqual(defsHistoryKey(text('pt-br', 'x')), defsHistoryKey({ ...text('pt-br', 'x'), lang: null } as DefsHistoryEntry));
  assert.notEqual(defsHistoryKey(cls('a', 'b')), defsHistoryKey({ ...cls('a', 'b'), attribute: 'data-class' } as DefsHistoryEntry));
});

test('restore puts a target back to exactly what it was', () => {
  const first = recordDefsHistory([], cls('px-3', 'px-4'));
  const key = defsHistoryKey(cls('px-3', 'px-4'));
  const before = findDefsHistory(first, key);
  const second = recordDefsHistory(first, cls('px-4', 'px-6'));
  assert.deepEqual(restoreDefsHistory(second, key, before), first);
  assert.deepEqual(restoreDefsHistory(first, key, null), []);
  assert.deepEqual(restoreDefsHistory([], key, second[0]), second);
});

const ask = (target: string, change: string, organism: string | null = 'listaTarefas'): DefsHistoryEntry => ({
  kind: 'request', organism, target, at: '2026-10-29T10:00:00Z', change, request: 'pedido do usuário',
} as DefsHistoryEntry);

test('a request entry round-trips and its grammar is exact', () => {
  const entries = [cls('px-3', 'px-4'), ask('layout.align', 'Center the buttons.')];
  const written = withDefsHistory(DEFS, entries);
  assert.deepEqual(splitDefsHistory(written), { base: DEFS, history: entries });
  const read = (row: Record<string, unknown>) => () => splitDefsHistory(`${DEFS}\nexport const history = ${JSON.stringify([row])} as const;\n`);
  const good = { kind: 'request', organism: 'x', target: 'text', at: 'a', change: 'c', request: 'r' };
  assert.doesNotThrow(read(good));
  assert.throws(read({ ...good, target: 'layout.magic' }), /target/u);
  assert.throws(read({ ...good, from: 'a' }), /forbidden field from/u);
  assert.throws(read({ ...good, change: ' ' }), /value/u);
  assert.throws(read({ kind: 'request', organism: 'x', target: 'text', at: 'a', change: 'c' }), /missing field request/u);
});

test('a request on the same organism and aspect replaces the earlier one and moves to the end', () => {
  let entries = recordDefsHistory([], ask('layout.align', 'Center the buttons.'));
  entries = recordDefsHistory(entries, cls('px-3', 'px-4'));
  entries = recordDefsHistory(entries, ask('layout.align', 'Align the buttons to the left.'));
  assert.deepEqual(entries, [cls('px-3', 'px-4'), ask('layout.align', 'Align the buttons to the left.')]);
  entries = recordDefsHistory(entries, ask('style.color', 'Make the title use the accent color.'));
  entries = recordDefsHistory(entries, ask('layout.align', 'Center the buttons.', null));
  assert.equal(entries.length, 4, 'another aspect, and the page level, are other targets');
});

test('removing a request takes only its target out', () => {
  const entries = [ask('layout.align', 'Center.'), ask('style.color', 'Accent.')];
  assert.deepEqual(removeDefsHistory(entries, defsHistoryKey(ask('layout.align', 'whatever'))), [ask('style.color', 'Accent.')]);
});
