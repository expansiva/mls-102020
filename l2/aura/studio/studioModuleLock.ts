/// <mls fileReference="_102020_/l2/aura/studio/studioModuleLock.ts" enhancement="_blank" />
// One registry for "Apply is running on this module" (st48).
//
// New Release emits `nr-implementation-state` with `{ project, moduleName, active }`. While that
// module is active, every Monaco editor whose model is a file of that module (l1, l1 _old, l2, l4)
// is read-only. `l5/config.json` belongs to every module and stays editable. Level-3 writes that
// bypass Monaco's readOnly are a separate step.

import { NEW_RELEASE_IMPLEMENTATION_STATE_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

/** File reference `_100111_/l2/folder/file.ts` — project, then the layer path Monaco models use. */
const PROJECT_FILE = /(?:^|\/)_(\d+)_\/(.*)$/;

export interface IModuleLockTarget {
  project: number;
  path: string;
}

interface IImplementationState {
  project: number;
  moduleName: string;
  active: boolean;
}

interface ILockOptions extends monaco.editor.IEditorOptions {
  readOnlyMessage?: { readonly value: string } | null;
}

interface IWatchedEditor {
  editor: monaco.editor.ICodeEditor;
  forced: boolean;
  previousReadOnly: boolean;
}

const locked = new Map<number, Set<string>>();
const watched: IWatchedEditor[] = [];
let listening = false;
let monacoHooked = false;
let waitingForMonaco = false;
let listenedOn: EventTarget | null = null;

/** Layer path (`l2/<module>/…`) of a locked module in that project. The project prefix is ignored here. */
export function isModuleLocked(project: number, path: string): boolean {
  const names = locked.get(project);
  if (!names || names.size === 0) return false;
  const normalized = path.replace(/\\/gu, '/');
  for (const moduleName of names) {
    if (pathLocksModule(normalized, moduleName)) return true;
  }
  return false;
}

/** `_42_/l2/comandaRestaurante/tela.ts` → project 42 and `l2/comandaRestaurante/tela.ts`. */
export function moduleLockTarget(filePath: string): IModuleLockTarget | null {
  const match = PROJECT_FILE.exec(filePath.replace(/\\/gu, '/'));
  if (!match) return null;
  const project = Number(match[1]);
  if (!Number.isSafeInteger(project)) return null;
  return { project, path: match[2] };
}

/**
 * Listens for the Apply state and for Monaco editors.
 * Safe to call again: the Studio host can publish before Monaco has finished loading.
 * Node tests import the Studio tool module with no `window`; that is not a browser failure.
 */
export function installStudioModuleLock(): void {
  ensureEventListener();
  ensureMonacoHook();
}

export function lockMessage(): string {
  return t('lock.applyInProgress');
}

/** The model write level 3 uses. `setValue` is here so a test can see that a lock does not use it. */
export interface ILevel3ModelWrite {
  getFullModelRange(): unknown;
  pushEditOperations(
    beforeCursorState: readonly unknown[] | null,
    editOperations: readonly { range: unknown; text: string }[],
    cursorStateComputer: () => null,
  ): unknown;
  setValue?(value: string): void;
}

/** `l2/<folder>/file.ts`. The lock matches `l2/<module>/` inside this path. */
export function level3LayerPath(level: number, folder: string, shortName: string, extension: string): string {
  const clean = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `l${level}/${clean ? `${clean}/` : ''}${shortName}${ext}`;
}

/** The i18n line when Apply holds this file. Null when the write may proceed. */
export function level3WriteRefusal(project: number, layerPath: string): string | null {
  if (!isModuleLocked(project, layerPath)) return null;
  const message = lockMessage();
  console.error('[TextEdit] Apply in progress; the source was not written', layerPath);
  return message;
}

/**
 * Writes the new source, or refuses while Apply holds the module.
 * The free path is `pushEditOperations` on the model (the same write as before). It does not call `setValue`.
 */
export function writeLevel3SourceIfOpen(
  project: number,
  layerPath: string,
  model: ILevel3ModelWrite,
  newSource: string,
): string | null {
  const refused = level3WriteRefusal(project, layerPath);
  if (refused) return refused;
  model.pushEditOperations(
    [],
    [{ range: model.getFullModelRange(), text: newSource }],
    () => null,
  );
  return null;
}

/** A stor file the panel can undo or save. The layer path is what the module lock matches. */
export interface IDraftLockFile {
  project: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
}

/** The i18n line when Apply holds this file. Null when the panel may undo or save it. */
export function lockedDraftWrite(file: IDraftLockFile): string | null {
  if (
    file.level === undefined
    || file.folder === undefined
    || file.shortName === undefined
    || file.extension === undefined
  ) {
    console.error('[serviceDraft] file has no layer path; the lock was not checked', file.shortName);
    return null;
  }
  const layerPath = level3LayerPath(file.level, file.folder, file.shortName, file.extension);
  if (!isModuleLocked(file.project, layerPath)) return null;
  const message = lockMessage();
  console.error('[serviceDraft] Apply in progress; the file was not written', layerPath);
  return message;
}

function pathLocksModule(path: string, moduleName: string): boolean {
  const markers = [
    `l1/${moduleName}/`,
    `l1/${moduleName}_old/`,
    `l2/${moduleName}/`,
    `l4/${moduleName}/`,
  ];
  for (const marker of markers) {
    let from = 0;
    while (from <= path.length) {
      const at = path.indexOf(marker, from);
      if (at < 0) break;
      if (at === 0 || path[at - 1] === '/') return true;
      from = at + 1;
    }
  }
  return false;
}

function readDetail(value: unknown): IImplementationState | null {
  if (!value || typeof value !== 'object') return null;
  const detail = value as { project?: unknown; moduleName?: unknown; active?: unknown };
  if (typeof detail.project !== 'number' || !Number.isSafeInteger(detail.project)) return null;
  if (typeof detail.moduleName !== 'string' || detail.moduleName.length === 0 || detail.moduleName.includes('/') || detail.moduleName.includes('\\')) return null;
  if (typeof detail.active !== 'boolean') return null;
  return { project: detail.project, moduleName: detail.moduleName, active: detail.active };
}

function setLocked(project: number, moduleName: string, active: boolean): void {
  if (active) {
    const names = locked.get(project) ?? new Set<string>();
    names.add(moduleName);
    locked.set(project, names);
    return;
  }
  const names = locked.get(project);
  if (!names) return;
  names.delete(moduleName);
  if (names.size === 0) locked.delete(project);
}

function onImplementationState(ev: Event): void {
  const detail = readDetail((ev as CustomEvent<unknown>).detail);
  if (!detail) {
    console.error('[studio] nr-implementation-state detail is not { project, moduleName, active }', (ev as CustomEvent<unknown>).detail);
    return;
  }
  setLocked(detail.project, detail.moduleName, detail.active);
  refreshEditors();
}

function browserWindow(): (Window & { monacoReady?: Promise<void> }) | null {
  const target = (globalThis as { window?: Window & { monacoReady?: Promise<void> } }).window;
  if (!target || typeof target.addEventListener !== 'function') return null;
  return target;
}

function ensureEventListener(): void {
  const target = browserWindow();
  if (!target) return;
  // A second call can see another window. Follow that one, or the event is heard by a window that is gone.
  if (listening && listenedOn === target) return;
  if (listenedOn && listenedOn !== target) {
    listenedOn.removeEventListener(NEW_RELEASE_IMPLEMENTATION_STATE_EVENT, onImplementationState);
  }
  target.addEventListener(NEW_RELEASE_IMPLEMENTATION_STATE_EVENT, onImplementationState);
  listenedOn = target;
  listening = true;
}

function editorApi(): typeof monaco.editor | undefined {
  const host = globalThis as { monaco?: typeof monaco };
  return host.monaco?.editor;
}

function ensureMonacoHook(): void {
  if (monacoHooked) return;
  const api = editorApi();
  if (api?.onDidCreateEditor) {
    api.onDidCreateEditor((editor) => watchEditor(editor));
    for (const editor of api.getEditors()) watchEditor(editor);
    monacoHooked = true;
    return;
  }
  const ready = browserWindow()?.monacoReady;
  if (!ready || waitingForMonaco || typeof ready.then !== 'function') return;
  waitingForMonaco = true;
  void ready.then(() => {
    waitingForMonaco = false;
    ensureMonacoHook();
  }, (err: unknown) => {
    waitingForMonaco = false;
    console.error('[studio] module lock: monaco failed to load', err);
  });
}

function textModel(editor: monaco.editor.ICodeEditor): monaco.editor.ITextModel | null {
  const model = editor.getModel();
  if (!model || !('uri' in model)) return null;
  return model;
}

function applyToEditor(row: IWatchedEditor): void {
  const model = textModel(row.editor);
  const target = model ? moduleLockTarget(model.uri.path || model.uri.toString()) : null;
  const lockedNow = target ? isModuleLocked(target.project, target.path) : false;
  if (lockedNow) {
    if (!row.forced) {
      const api = editorApi();
      const optionId = api?.EditorOption.readOnly;
      row.previousReadOnly = typeof optionId === 'number' ? row.editor.getOption(optionId) : false;
      row.forced = true;
    }
    const options: ILockOptions = { readOnly: true, readOnlyMessage: { value: lockMessage() } };
    row.editor.updateOptions(options);
    return;
  }
  if (!row.forced) return;
  row.forced = false;
  const options: ILockOptions = { readOnly: row.previousReadOnly, readOnlyMessage: null };
  row.editor.updateOptions(options);
}

function watchEditor(editor: monaco.editor.ICodeEditor): void {
  if (watched.some((row) => row.editor === editor)) return;
  const row: IWatchedEditor = { editor, forced: false, previousReadOnly: false };
  watched.push(row);
  editor.onDidChangeModel(() => applyToEditor(row));
  editor.onDidDispose(() => {
    const index = watched.indexOf(row);
    if (index >= 0) watched.splice(index, 1);
  });
  applyToEditor(row);
}

function refreshEditors(): void {
  ensureMonacoHook();
  for (const row of watched) applyToEditor(row);
}
