/// <mls fileReference="_102020_/l2/aura/services/serviceDraftLock.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { NEW_RELEASE_IMPLEMENTATION_STATE_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';
import { installStudioModuleLock, lockedDraftWrite, type IDraftLockFile } from '/_102020_/l2/aura/studio/studioModuleLock.js';

const PROJECT = 42;
const MODULE_NAME = 'comandaRestaurante';
const MESSAGE_EN = 'Apply in progress: wait or cancel it in Review.';

function file(folder: string, shortName: string, extension: string, level = 2): IDraftLockFile {
  return { project: PROJECT, level, folder, shortName, extension };
}

function emit(active: boolean): void {
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target) throw new Error('test window is missing');
  target.dispatchEvent(new CustomEvent(NEW_RELEASE_IMPLEMENTATION_STATE_EVENT, {
    detail: { project: PROJECT, moduleName: MODULE_NAME, active },
  }));
}

/** What the panel does with one file: a lock returns the message and does not write. */
function writeIfOpen(item: IDraftLockFile, write: () => void): string | null {
  const message = lockedDraftWrite(item);
  if (message) return message;
  write();
  return null;
}

test('undo and save of a locked file refuse with the Apply message', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousLang = document.documentElement.lang;
  (globalThis as { window?: EventTarget }).window = new EventTarget();
  installStudioModuleLock();
  const source = readFileSync(fileURLToPath(new URL('./serviceDraft.ts', import.meta.url)), 'utf8');
  const tool = readFileSync(fileURLToPath(new URL('../studio/studioEditTool.ts', import.meta.url)), 'utf8');
  const saveStart = tool.indexOf('export async function runDraftSave');
  const saveEnd = tool.indexOf('let editor:', saveStart);
  const save = tool.slice(saveStart, saveEnd);
  const undoStart = source.indexOf('private async _onUndoLocal');
  const undoEnd = source.indexOf('\n    private async ', undoStart + 1);
  const undo = source.slice(undoStart, undoEnd);

  try {
    emit(true);
    document.documentElement.lang = 'en';
    const writes: string[] = [];
    const locked = file(`${MODULE_NAME}/web`, 'tela', '.ts');
    assert.equal(writeIfOpen(locked, () => { writes.push('locked'); }), MESSAGE_EN);
    assert.deepEqual(writes, []);

    const other = file('caixa/web', 'tela', '.ts');
    assert.equal(writeIfOpen(other, () => { writes.push('free'); }), null);
    assert.deepEqual(writes, ['free']);

    const config = file('', 'config', '.json', 5);
    assert.equal(writeIfOpen(config, () => { writes.push('config'); }), null);
    assert.deepEqual(writes, ['free', 'config']);

    emit(false);
    assert.equal(writeIfOpen(locked, () => { writes.push('open'); }), null);
    assert.deepEqual(writes, ['free', 'config', 'open']);

    const lockAt = save.indexOf('lockedDraftWrite(');
    const saveAt = save.indexOf('saveToDraft(');
    assert.ok(lockAt !== -1 && saveAt > lockAt, 'save checks the lock before saveToDraft');
    assert.match(save, /saveToDraft\(\s*open/);
    const undoLock = undo.indexOf('lockedDraftWrite(');
    const confirmAt = undo.indexOf('confirm(');
    const setAt = undo.indexOf('setContent(');
    assert.ok(undoLock !== -1 && undoLock < confirmAt && confirmAt < setAt, 'undo checks the lock before confirm and setContent');
  } finally {
    emit(false);
    document.documentElement.lang = previousLang;
    (globalThis as { window?: unknown }).window = previousWindow;
  }
});
