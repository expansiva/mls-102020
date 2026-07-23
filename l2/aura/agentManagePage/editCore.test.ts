/// <mls fileReference="_102020_/l2/aura/agentManagePage/editCore.test.ts" enhancement="_blank" />

// Tests for the pure page-edit core (guards) + the pageAdjustments data layer. Uses node:test so
// the suite runner (scripts/run-tests.mjs) picks it up.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasGenomeLayout, layoutElementIdSet, idDelta, validateEditedDefinition, normalizeOperations, buildDeltaSection,
  reconcileAdjustments, normalizeConsolidatedAdjustments,
} from '/_102020_/l2/aura/agentManagePage/editCore.js';
import {
  scanBalanced, findExportConst, replaceExportConst, removeExportConst, parseExportValue,
  parsePageAdjustments, upsertPageAdjustments, nextAdjustmentId, type PageAdjustment,
} from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';

const genome = {
  pageId: 'res', moduleName: 'petShop', genome: 'page11',
  layout: { sections: [ { organisms: [ { organismName: 'o1', intentions: [
    { intent: 'commandForm', id: 'i1', fields: [ { id: 'f_name', field: 'name', inputType: 'text' }, { id: 'f_phone', field: 'phone', inputType: 'tel' } ], actions: [ { id: 'a_save' } ] },
    { intent: 'queryList', id: 'q1', filters: [], toolbar: [] },
  ] } ] } ] },
};
const mode = { pageId: 'm', moduleName: 'petShop', brief: { uiSpec: { fields: [] } } };

test('editCore: shape detection + element ids', () => {
  assert.equal(hasGenomeLayout(genome), true);
  assert.equal(hasGenomeLayout(mode), false);
  assert.equal(layoutElementIdSet(genome).size, 4);
  assert.equal(layoutElementIdSet(mode).size, 0);
});

test('editCore: idDelta detects removals/additions', () => {
  const edited = JSON.parse(JSON.stringify(genome));
  edited.layout.sections[0].organisms[0].intentions[0].fields =
    edited.layout.sections[0].organisms[0].intentions[0].fields.filter((f: any) => f.id !== 'f_phone');
  const d = idDelta(genome, edited);
  assert.deepEqual(d.removed, ['f_phone']);
  assert.deepEqual(d.added, []);
});

test('editCore: validateEditedDefinition guards', () => {
  const edited = JSON.parse(JSON.stringify(genome));
  edited.layout.sections[0].organisms[0].intentions[0].fields =
    edited.layout.sections[0].organisms[0].intentions[0].fields.filter((f: any) => f.id !== 'f_phone');
  assert.equal(validateEditedDefinition(genome, edited).ok, true);

  const badId = JSON.parse(JSON.stringify(genome)); badId.pageId = 'other';
  assert.equal(validateEditedDefinition(genome, badId).ok, false);

  const dropped = JSON.parse(JSON.stringify(genome)); delete dropped.layout;
  assert.equal(validateEditedDefinition(genome, dropped).ok, false);

  const emptied = JSON.parse(JSON.stringify(genome)); emptied.layout.sections = [];
  assert.equal(validateEditedDefinition(genome, emptied).ok, false);

  const editedMode = JSON.parse(JSON.stringify(mode)); editedMode.brief.uiSpec.fields = [{ stateName: 's' }];
  assert.equal(validateEditedDefinition(mode, editedMode).ok, true);

  assert.equal(validateEditedDefinition(genome, null).ok, false);
});

test('editCore: buildDeltaSection', () => {
  assert.equal(buildDeltaSection('', []), '');
  const s = buildDeltaSection('const x = 1;', [{ request: 'esconda telefone', kind: 'structural', notes: 'removi f_phone' }]);
  assert.match(s, /minimal change/);
  assert.match(s, /esconda telefone/);
  assert.match(s, /removi f_phone/);
  assert.match(s, /const x = 1;/);
  // adjustments only, no code
  const s2 = buildDeltaSection(null, [{ request: 'destaque salvar', kind: 'cosmetic' }]);
  assert.match(s2, /destaque salvar/);
  assert.doesNotMatch(s2, /Current code/);
});

test('editCore: normalizeOperations filters malformed', () => {
  const ops = normalizeOperations([
    { kind: 'structural', target: 'f_phone', description: 'hide phone' },
    { kind: 'cosmetic', description: 'bigger shadow' },
    { kind: 'bogus', description: 'x' },
    { kind: 'structural', description: '' },
  ]);
  assert.equal(ops.length, 2);
  assert.equal(ops[0].target, 'f_phone');
  assert.equal(ops[1].target, '');
});

// ── adjustments consolidation (Opção C) ──────────────────────────────────────

test('editCore: normalizeConsolidatedAdjustments filters malformed', () => {
  const out = normalizeConsolidatedAdjustments([
    { id: 'adj-001', request: 'align left', kind: 'structural' },
    { request: '  ', kind: 'cosmetic' },            // empty request → dropped
    { request: 'bigger shadow', kind: 'bogus' },     // bad kind → dropped
    { request: 'destaque salvar', kind: 'cosmetic', notes: '  ' }, // blank notes → undefined
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'adj-001');
  assert.equal(out[1].id, undefined);
  assert.equal(out[1].notes, undefined);
});

test('editCore: reconcileAdjustments supersedes contradictory (left wins, one item, stable id)', () => {
  // adj-001 = "align right"; consolidation returns only the surviving "align left" reusing adj-001.
  const existing: PageAdjustment[] = [{ id: 'adj-001', at: 'T0', request: 'align buttons right', kind: 'structural' }];
  const out = reconcileAdjustments(existing, [{ id: 'adj-001', request: 'align buttons left', kind: 'structural' }], 'T1');
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'adj-001');
  assert.equal(out[0].at, 'T0');                 // audit continuity preserved
  assert.equal(out[0].request, 'align buttons left');
});

test('editCore: reconcileAdjustments preserves unrelated + mints new', () => {
  const existing: PageAdjustment[] = [
    { id: 'adj-001', at: 'T0', request: 'hide phone', kind: 'structural' },
  ];
  // keep adj-001 as-is, add a new unrelated cosmetic (no id → minted).
  const out = reconcileAdjustments(existing, [
    { id: 'adj-001', request: 'hide phone', kind: 'structural' },
    { request: 'emphasize save', kind: 'cosmetic' },
  ], 'T1');
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'adj-001');
  assert.equal(out[1].id, 'adj-002');            // minted next
  assert.equal(out[1].at, 'T1');
});

test('editCore: reconcileAdjustments carries the current request image onto new items; keeps prior', () => {
  const existing: PageAdjustment[] = [{ id: 'adj-001', at: 'T0', request: 'has own img', kind: 'cosmetic', imageUrl: 'http://old.png' }];
  const out = reconcileAdjustments(existing, [
    { id: 'adj-001', request: 'has own img', kind: 'cosmetic' }, // survives → keeps its own image
    { request: 'format currency like the reference', kind: 'cosmetic' }, // new → inherits current image
  ], 'T1', 'http://ref.png');
  assert.equal(out[0].imageUrl, 'http://old.png');
  assert.equal(out[1].imageUrl, 'http://ref.png');
  // No current image → new item has none.
  const out2 = reconcileAdjustments([], [{ request: 'x', kind: 'cosmetic' }], 'T1');
  assert.equal(out2[0].imageUrl, undefined);
});

test('editCore: reconcileAdjustments mints for unknown ids and multiple new items', () => {
  const existing: PageAdjustment[] = [{ id: 'adj-005', at: 'T0', request: 'x', kind: 'cosmetic' }];
  // an unknown id must NOT be trusted (treated as new); two new items get distinct minted ids.
  const out = reconcileAdjustments(existing, [
    { id: 'adj-999', request: 'forged', kind: 'cosmetic' },
    { request: 'brand new', kind: 'structural' },
  ], 'T1');
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'adj-006');
  assert.equal(out[1].id, 'adj-007');
});

// ── pageAdjustments splicer ──────────────────────────────────────────────────

const defs = [
  '/// <mls fileReference="x"/>', '',
  'export const definition = {',
  '  "pageId": "res",',
  '  "layout": { "sections": [ { "label": "Total {x}", "organisms": [] } ] },',
  '  "note": "a ] and } inside a string"',
  '};', '',
  'export const pipeline = [ { "id": "p1" } ] as const;', '',
  'export const moleculeAssignments = [] as const;', '',
].join('\n');

test('pageAdjustments: string-aware balanced scan + parse', () => {
  const start = defs.indexOf('{', defs.indexOf('definition'));
  const end = scanBalanced(defs, start, '{', '}');
  const obj = JSON.parse(defs.slice(start, end));
  assert.equal(obj.pageId, 'res');
  assert.equal(parseExportValue(defs, 'definition').note, 'a ] and } inside a string');
  assert.equal(parsePageAdjustments(defs).length, 0);
  assert.ok(findExportConst(defs, 'pipeline'));
});

test('pageAdjustments: upsert appends then replaces, preserving other exports', () => {
  const a1: PageAdjustment[] = [{ id: 'adj-001', at: 't', request: 'destaque salvar', kind: 'cosmetic' }];
  const out = upsertPageAdjustments(defs, a1);
  assert.ok(out.includes('export const pageAdjustments'));
  assert.ok(out.includes('export const pipeline'));
  assert.ok(out.includes('export const moleculeAssignments'));
  assert.equal(parsePageAdjustments(out).length, 1);

  const a2 = [...a1, { id: 'adj-002', at: 't', request: 'esconda telefone', kind: 'structural' as const }];
  const out2 = upsertPageAdjustments(out, a2);
  assert.equal((out2.match(/export const pageAdjustments/g) ?? []).length, 1);
  assert.equal(parsePageAdjustments(out2).length, 2);
});

test('pageAdjustments: removeExportConst drops the log, keeps other exports', () => {
  const a1: PageAdjustment[] = [{ id: 'adj-001', at: 't', request: 'align left', kind: 'cosmetic' }];
  const withLog = upsertPageAdjustments(defs, a1);
  assert.equal(parsePageAdjustments(withLog).length, 1);
  const stripped = removeExportConst(withLog, 'pageAdjustments');
  assert.equal(parsePageAdjustments(stripped).length, 0);
  assert.ok(!stripped.includes('export const pageAdjustments'));
  assert.ok(stripped.includes('export const definition'));
  assert.ok(stripped.includes('export const pipeline'));
  assert.ok(stripped.includes('export const moleculeAssignments'));
  // Removing an absent export is a no-op.
  assert.equal(removeExportConst(stripped, 'pageAdjustments'), stripped);
});

test('pageAdjustments: nextAdjustmentId + definition replace', () => {
  assert.equal(nextAdjustmentId([]), 'adj-001');
  assert.equal(nextAdjustmentId([{ id: 'adj-007', at: '', request: '', kind: 'cosmetic' }]), 'adj-008');
  const out = replaceExportConst(defs, 'definition', 'export const definition = { "pageId": "res", "layout": { "sections": [] } };');
  assert.ok(out && out.includes('"sections": []') && out.includes('export const pipeline'));
});
