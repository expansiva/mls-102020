/// <mls fileReference="_102020_/l2/aura/services/preview/previewEditorL3.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { NEW_RELEASE_IMPLEMENTATION_STATE_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';
import { installStudioModuleLock, writeLevel3SourceIfOpen, type ILevel3ModelWrite } from '/_102020_/l2/aura/studio/studioModuleLock.js';

const PROJECT = 42;
const MODULE_NAME = 'comandaRestaurante';
const LOCKED = `l2/${MODULE_NAME}/tela.ts`;
const FREE = 'l2/caixa/tela.ts';
const MESSAGE_EN = 'Apply in progress: wait or cancel it in Review.';
const MESSAGE_PT = 'Aplicar em andamento: espere ou cancele na Revisão.';

interface IFakeModel extends ILevel3ModelWrite {
  setCalls: string[];
  pushCalls: string[];
}

function fakeModel(): IFakeModel {
  const setCalls: string[] = [];
  const pushCalls: string[] = [];
  return {
    setCalls,
    pushCalls,
    getFullModelRange: () => ({ start: 0, end: 1 }),
    setValue: (value) => { setCalls.push(value); },
    pushEditOperations: (_before, edits) => { pushCalls.push(edits[0]?.text ?? ''); },
  };
}

function emit(active: boolean, moduleName = MODULE_NAME): void {
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target) throw new Error('test window is missing');
  target.dispatchEvent(new CustomEvent(NEW_RELEASE_IMPLEMENTATION_STATE_EVENT, {
    detail: { project: PROJECT, moduleName, active },
  }));
}

test('a level-3 edit on a locked module does not write the model and shows the message', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousLang = document.documentElement.lang;
  (globalThis as { window?: EventTarget }).window = new EventTarget();
  installStudioModuleLock();
  const source = readFileSync(fileURLToPath(new URL('./previewEditorL3.ts', import.meta.url)), 'utf8');
  const methodStart = source.indexOf('private async applyTextEditToSource');
  const methodEnd = source.indexOf('private pageWriteTarget', methodStart);
  const method = source.slice(methodStart, methodEnd);

  try {
    emit(true);
    document.documentElement.lang = 'en';
    const locked = fakeModel();
    const refused = writeLevel3SourceIfOpen(PROJECT, LOCKED, locked, 'novo texto');
    assert.equal(refused, MESSAGE_EN);
    assert.deepEqual(locked.setCalls, []);
    assert.deepEqual(locked.pushCalls, []);

    document.documentElement.lang = 'pt';
    const lockedPt = fakeModel();
    assert.equal(writeLevel3SourceIfOpen(PROJECT, LOCKED, lockedPt, 'novo texto'), MESSAGE_PT);
    assert.deepEqual(lockedPt.setCalls, []);
    assert.deepEqual(lockedPt.pushCalls, []);

    document.documentElement.lang = 'en';
    const free = fakeModel();
    assert.equal(writeLevel3SourceIfOpen(PROJECT, FREE, free, 'texto livre'), null);
    assert.deepEqual(free.setCalls, []);
    assert.deepEqual(free.pushCalls, ['texto livre']);

    emit(false);
    const reopened = fakeModel();
    assert.equal(writeLevel3SourceIfOpen(PROJECT, LOCKED, reopened, 'de novo'), null);
    assert.deepEqual(reopened.setCalls, []);
    assert.deepEqual(reopened.pushCalls, ['de novo']);

    assert.match(method, /showDynamicReason\(refused\)/);
    assert.match(method, /writeLevel3SourceIfOpen\(/);
    assert.doesNotMatch(method, /setValue\(/);
    assert.doesNotMatch(method, /pushEditOperations\(/);
  } finally {
    emit(false);
    document.documentElement.lang = previousLang;
    (globalThis as { window?: unknown }).window = previousWindow;
  }
});
