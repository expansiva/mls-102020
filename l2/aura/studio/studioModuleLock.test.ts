/// <mls fileReference="_102020_/l2/aura/studio/studioModuleLock.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { NEW_RELEASE_IMPLEMENTATION_STATE_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';
import { installStudioModuleLock, isModuleLocked, lockMessage } from '/_102020_/l2/aura/studio/studioModuleLock.js';

const PROJECT = 42;
const MODULE_NAME = 'comandaRestaurante';
const LOCKED = `/_${PROJECT}_/l2/${MODULE_NAME}/tela.ts`;
const OTHER = `/_${PROJECT}_/l2/caixa/tela.ts`;
const OTHER_PROJECT = `/_99_/l2/${MODULE_NAME}/tela.ts`;

interface ILockCall {
  readOnly?: boolean;
  readOnlyMessage?: { value: string } | null;
}

interface IFakeEditor {
  calls: ILockCall[];
  getModel(): { uri: { path: string; toString(): string } };
  updateOptions(options: ILockCall): void;
  getOption(): boolean;
  onDidChangeModel(listener: () => void): { dispose(): void };
  onDidDispose(listener: () => void): { dispose(): void };
  setModelPath(next: string): void;
}

function fakeEditor(path: string): IFakeEditor {
  let current = path;
  let readOnly = false;
  const calls: ILockCall[] = [];
  const modelListeners: Array<() => void> = [];
  return {
    calls,
    getModel: () => ({ uri: { path: current, toString: () => current } }),
    updateOptions: (options) => {
      calls.push(options);
      if (typeof options.readOnly === 'boolean') readOnly = options.readOnly;
    },
    getOption: () => readOnly,
    onDidChangeModel: (listener) => {
      modelListeners.push(listener);
      return { dispose() { /* listener lives until the test ends */ } };
    },
    onDidDispose: () => ({ dispose() { /* the test does not dispose editors */ } }),
    setModelPath: (next) => {
      current = next;
      for (const listener of modelListeners) listener();
    },
  };
}

function last(editor: IFakeEditor): ILockCall | undefined {
  return editor.calls[editor.calls.length - 1];
}

function emit(active: boolean, moduleName = MODULE_NAME, project = PROJECT): void {
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target) throw new Error('test window is missing');
  target.dispatchEvent(new CustomEvent(NEW_RELEASE_IMPLEMENTATION_STATE_EVENT, {
    detail: { project, moduleName, active },
  }));
}

test('a locked module is read-only in Monaco and the others stay editable', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousMonaco = (globalThis as { monaco?: unknown }).monaco;
  const previousLang = document.documentElement.lang;
  const created: Array<(editor: IFakeEditor) => void> = [];
  const existing = fakeEditor(LOCKED);
  const editors = [existing];
  (globalThis as { window?: EventTarget }).window = new EventTarget();
  (globalThis as { monaco?: unknown }).monaco = {
    editor: {
      EditorOption: { readOnly: 86 },
      onDidCreateEditor: (listener: (editor: IFakeEditor) => void) => {
        created.push(listener);
        return { dispose() { /* one hook for the test */ } };
      },
      getEditors: () => editors,
    },
  };

  try {
    installStudioModuleLock();
    assert.equal(existing.calls.length, 0, 'an editor is left alone before Apply');

    emit(true);
    assert.equal(isModuleLocked(PROJECT, `l2/${MODULE_NAME}/tela.ts`), true);
    assert.equal(isModuleLocked(PROJECT, `l1/${MODULE_NAME}/usecase.ts`), true);
    assert.equal(isModuleLocked(PROJECT, `l1/${MODULE_NAME}_old/usecase.ts`), true);
    assert.equal(isModuleLocked(PROJECT, `l4/${MODULE_NAME}/screen.ts`), true);
    assert.equal(isModuleLocked(PROJECT, 'l2/caixa/tela.ts'), false);
    assert.equal(isModuleLocked(PROJECT, `l2/${MODULE_NAME}Extra/tela.ts`), false);
    assert.equal(isModuleLocked(PROJECT, 'l5/config.json'), false);
    assert.equal(isModuleLocked(99, `l2/${MODULE_NAME}/tela.ts`), false);
    assert.equal(last(existing)?.readOnly, true);
    assert.equal(last(existing)?.readOnlyMessage?.value, 'Apply in progress: wait or cancel it in Review.');
    assert.equal(lockMessage(), last(existing)?.readOnlyMessage?.value);

    const other = fakeEditor(OTHER);
    const foreign = fakeEditor(OTHER_PROJECT);
    assert.equal(created.length, 1);
    created[0](other);
    created[0](foreign);
    assert.equal(other.calls.length, 0, 'another module stays editable');
    assert.equal(foreign.calls.length, 0, 'the same module in another project stays editable');

    const switching = fakeEditor(LOCKED);
    created[0](switching);
    assert.equal(last(switching)?.readOnly, true);
    switching.setModelPath(OTHER);
    assert.equal(last(switching)?.readOnly, false);
    assert.equal(last(switching)?.readOnlyMessage, null);
    switching.setModelPath(LOCKED);
    assert.equal(last(switching)?.readOnly, true);

    document.documentElement.lang = 'pt';
    emit(true);
    assert.equal(last(switching)?.readOnlyMessage?.value, 'Aplicar em andamento: espere ou cancele na Revisão.');
    document.documentElement.lang = 'es';
    emit(true);
    assert.equal(last(switching)?.readOnlyMessage?.value, 'Aplicación en curso: espere o cancele en Revisión.');

    document.documentElement.lang = 'en';
    emit(false);
    assert.equal(isModuleLocked(PROJECT, `l2/${MODULE_NAME}/tela.ts`), false);
    assert.equal(last(existing)?.readOnly, false);
    assert.equal(last(switching)?.readOnly, false);
    assert.equal(other.calls.length, 0);
  } finally {
    emit(false);
    document.documentElement.lang = previousLang;
    (globalThis as { window?: unknown }).window = previousWindow;
    (globalThis as { monaco?: unknown }).monaco = previousMonaco;
  }
});
