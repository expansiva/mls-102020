/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPageMarks.test.ts" enhancement="_blank"/>

// Marks on the page (Studio annotation): the entry, the limits, the plan's `mark`, the methods narrowed per mark and
// the prompt section. The lone selected element of before is one mark without a note, and reads as before.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EDIT_PAGE_MAX_MARKED_ELEMENTS,
  EDIT_PAGE_MAX_MARKS,
  focusList,
  methodsForOperationFocused,
  normalizeEditMarks,
  normalizeOperations,
  parseEditPageEntry,
  parseEditPageStepArgs,
  type MethodOutline,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import { editPageGateSchema, markedLines, selectedElementLines } from '/_102020_/l2/aura/agentEditPage/editPagePrompts.js';

const element = (tag: string, organism: string | null = 'grafico') => ({ tag, organism, organismPath: tag, anchorPath: null, literal: 'p-4' });
const base = { module: 'sampleModule', page: 'painel', request: 'melhore' };

test('marks are accepted, renumbered, and a note is trimmed', () => {
  const parsed = parseEditPageEntry(JSON.stringify({ ...base, marks: [
    { n: 7, note: '  mais alto ', elements: [element('section')] },
    { note: '', elements: [element('div', 'canais'), element('span', 'canais')] },
  ] }));
  assert.equal(parsed.kind, 'entry');
  if (parsed.kind !== 'entry') return;
  assert.deepEqual(parsed.entry.marks.map(mark => [mark.n, mark.note, mark.elements.length]), [[1, 'mais alto', 1], [2, null, 2]]);
});

test('the lone selected element of before is one mark without a note', () => {
  const parsed = parseEditPageEntry(JSON.stringify({ ...base, element: element('button') }));
  assert.ok(parsed.kind === 'entry');
  if (parsed.kind !== 'entry') return;
  assert.deepEqual(parsed.entry.marks, [{ n: 1, note: null, elements: [parsed.entry.element] }]);
  const args = parseEditPageStepArgs(JSON.stringify({ ...parsed.entry, project: 999999, attempt: 1, marks: undefined }));
  assert.equal(args.marks.length, 1, 'the steps rebuild it from the element too');
});

test('over the limits, or malformed, is refused — never silently cut', () => {
  const many = Array.from({ length: EDIT_PAGE_MAX_MARKS + 1 }, () => ({ elements: [element('div')] }));
  assert.equal(parseEditPageEntry(JSON.stringify({ ...base, marks: many })).kind, 'refusal');
  const heavy = [{ elements: Array.from({ length: EDIT_PAGE_MAX_MARKED_ELEMENTS + 1 }, () => element('div')) }];
  assert.equal(normalizeEditMarks(heavy).ok, false);
  assert.equal(normalizeEditMarks([{ elements: [] }]).ok, false);
  assert.equal(normalizeEditMarks([{ elements: [{ tag: '<script>' }] }]).ok, false);
  assert.equal(normalizeEditMarks('x').ok, false);
});

test('an operation keeps its mark only when the request had that mark', () => {
  const raw = [
    { organism: 'grafico', aspect: 'layout.size', change: 'taller', mark: 1 },
    { organism: 'canais', aspect: 'style.emphasis', change: 'bold', mark: 3 },
  ];
  const aspects = normalizeOperations([{ organism: 'x', aspect: 'nope', change: 'y' }]).dropped;
  assert.ok(aspects.length, 'the vocabulary still applies');
  const valid = normalizeOperations(raw.map(op => ({ ...op, aspect: 'layout.size', organism: op.organism })), undefined, 2).valid;
  assert.deepEqual(valid.map(op => op.mark), [1, null]);
  // The approved operations come back through the entry: their marks survive when the marks are there.
  const parsed = parseEditPageEntry(JSON.stringify({ ...base, marks: [{ elements: [element('section')] }], operations: [{ organism: 'grafico', aspect: 'layout.size', change: 'taller', mark: 1 }] }));
  assert.ok(parsed.kind === 'entry' && parsed.entry.operations?.[0].mark === 1);
});

test('the plan tool asks which mark each operation answers', () => {
  const schema = editPageGateSchema(['grafico']) as { properties: { operations: { items: { required: string[]; properties: Record<string, unknown> } } } };
  assert.ok(schema.properties.operations.items.required.includes('mark'));
  assert.ok('mark' in schema.properties.operations.items.properties);
});

test('several marks on one organism let the operation touch each marked method', () => {
  const outline: MethodOutline[] = [
    { name: 'render', organisms: [], keys: [], molecules: [], calls: [] },
    { name: 'renderGrafico', organisms: ['grafico'], keys: [], molecules: [], calls: [] },
    { name: 'renderLegenda', organisms: [], keys: [], molecules: [], calls: [] },
  ] as unknown as MethodOutline[];
  const foci = [
    { organism: 'grafico', method: 'renderGrafico', molecule: null },
    { organism: 'grafico', method: 'renderLegenda', molecule: null },
    { organism: 'canais', method: 'renderCanais', molecule: null },
  ];
  assert.deepEqual(methodsForOperationFocused(outline, { organism: 'grafico' }, foci), ['renderGrafico', 'renderLegenda']);
  assert.deepEqual(methodsForOperationFocused(outline, { organism: 'grafico' }, foci[0]), ['renderGrafico'], 'one focus as before');
  assert.deepEqual(focusList(null), []);
});

test('the prompt section lists every mark, its note and its elements', () => {
  const located = { method: 'renderGrafico', snippet: '<section data-organism-id="grafico"></section>', renders: 1 };
  const lines = markedLines([
    { n: 1, note: 'mais alto', elements: [{ element: element('section'), located, molecule: null }] },
    { n: 2, note: null, elements: [{ element: element('div', 'canais'), located: null, molecule: null }] },
  ]).join('\n');
  assert.match(lines, /^# Marked on the page/u);
  assert.match(lines, /## Mark 1 — note: "mais alto"/u);
  assert.match(lines, /## Mark 2 — no note \(it says where\)/u);
  assert.match(lines, /in method renderGrafico/u);
  assert.match(lines, /could not be located/u);
  assert.equal(markedLines([]).length, 0);
  // The lone selection keeps the prompt it always had.
  assert.match(selectedElementLines({ element: element('section'), located, molecule: null }).join('\n'), /^# The selected element/u);
});
