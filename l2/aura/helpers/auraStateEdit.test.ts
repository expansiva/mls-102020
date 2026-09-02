/// <mls fileReference="_102020_/l2/aura/helpers/auraStateEdit.test.ts" enhancement="_blank" />
// The projection the in-place editor publishes (TASK-102020-picker-state-lit).
//
// Three properties, and each of them is the reason `edit` is a SIBLING of actualPage instead of
// living inside it: it is plain data, it is not persisted, and switching module does not take it.
import assert from 'node:assert/strict';
import test from 'node:test';

// The browser globals go in FIRST: imports are hoisted, so the stubbing has to be an import of its
// own (auraStateEdit.stub) or it would run after the module it is stubbing for.
import { localStorageStub } from '/_102020_/l2/aura/helpers/auraStateEdit.stub.js';
import {
  AuraInitState,
  EMPTY_AURA_EDIT,
  addEditDirty,
  getAuraEdit,
  getAuraState,
  saveAuraProject,
  setAuraState,
  setEditHistory,
  setEditSelection,
} from '/_102020_/l2/aura/helpers/auraState.js';

const SELECTION = {
  tag: 'button',
  file: { project: 102046, shortName: 'changeOrderCatalogue', folder: 'buildFlowFsm/web/desktop/page11' },
  literal: 'rounded-md p-3 text-sm',
  editable: true,
};

test('the state starts with an empty projection, not with undefined', () => {
  AuraInitState();
  assert.deepEqual(getAuraEdit(), EMPTY_AURA_EDIT);
  assert.equal(getAuraState().edit.selection, null, 'a consumer can read the field before any edit');
});

test('everything published survives a round trip through JSON', () => {
  // The point of the whole shape. `setState` keeps every value it is handed in a 10.000-entry log, so
  // an element, a WeakRef or a Monaco model parked here would be pinned for the session — and would
  // defeat the WeakRef the undo stack uses precisely to avoid holding dead DOM.
  setEditSelection(SELECTION);
  setEditHistory({ undo: 2, redo: 1, nextUndo: 'p-3 → p-4', nextRedo: 'sombra' });
  addEditDirty('102046:buildFlowFsm/web/desktop/page11/changeOrderCatalogue');

  const edit = getAuraEdit();
  assert.deepEqual(JSON.parse(JSON.stringify(edit)), edit, 'nothing here is a live object');
  assert.deepEqual(edit.selection, SELECTION);
  assert.equal(edit.history.undo, 2);
  assert.deepEqual(edit.dirty, ['102046:buildFlowFsm/web/desktop/page11/changeOrderCatalogue']);
});

test('the same file dirtied twice is still one entry', () => {
  const before = getAuraEdit().dirty.length;
  addEditDirty(getAuraEdit().dirty[0]);
  assert.equal(getAuraEdit().dirty.length, before);
});

test('an editing session is never persisted', () => {
  // It is a live projection: restoring a selection into a page that may not even be mounted would
  // hand every consumer a ghost.
  setAuraState('actualProject', 102046);
  setEditSelection(SELECTION);
  saveAuraProject();

  const written = JSON.parse(localStorageStub.get('AuraProjects') ?? '{}');
  assert.ok(written['102046'], 'the project entry was written');
  assert.equal('edit' in written['102046'], false, 'and it carries no editing session');
});

test('switching module keeps the selection — unlike the page', () => {
  // `setAuraState('actualModule')` resets actualPage on purpose. Nesting `edit` in there would have
  // made the selection vanish through a mechanism nobody reads in the editor.
  setAuraState('actualModule', 'buildFlowFsm');
  setEditSelection(SELECTION);

  setAuraState('actualModule', 'anotherModule');
  assert.equal(getAuraState().actualPage, null, 'the page belongs to the module');
  assert.deepEqual(getAuraEdit().selection, SELECTION, 'the selection does not');
});

test('a null selection clears it without clearing the rest', () => {
  setEditHistory({ undo: 5, redo: 0, nextUndo: 'algo', nextRedo: '' });
  setEditSelection(null);
  assert.equal(getAuraEdit().selection, null);
  assert.equal(getAuraEdit().history.undo, 5, 'the history is not part of the selection');
});
