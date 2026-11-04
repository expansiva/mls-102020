/// <mls fileReference="_102020_/l2/aura/studio/studioModuleLock.ts" enhancement="_blank" />
// One registry for "Apply is running on this module" (st48).
//
// New Release emits `nr-implementation-state` with `{ project, moduleName, active }`. While that
// module is active, every Monaco editor whose model is a file of that module (l1, l1 _old, l2, l4)
// is read-only. `l5/config.json` belongs to every module and stays editable. Level-3 writes that
// bypass Monaco's readOnly are a separate step.

import { NEW_RELEASE_IMPLEMENTATION_STATE_EVENT } from '/_102035_/l2/newRelease/helpers/context.js';
import { getRuntimeLanguage } from '/_102033_/l2/shared/languageRuntime.js';

const MESSAGES = {
  en: 'Apply in progress: wait or cancel it in Review.',
  pt: 'Aplicar em andamento: espere ou cancele na Revisão.',
  es: 'Aplicación en curso: espere o cancele en Revisión.',
} as const;

const LANGUAGES = ['en', 'pt', 'es'] as const;

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
  const requested = typeof document === 'undefined' ? 'en' : (document.documentElement?.lang || 'en');
  const language = getRuntimeLanguage(LANGUAGES, requested) ?? 'en';
  return MESSAGES[language as keyof typeof MESSAGES] ?? MESSAGES.en;
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
  if (listening) return;
  const target = browserWindow();
  if (!target) return;
  target.addEventListener(NEW_RELEASE_IMPLEMENTATION_STATE_EVENT, onImplementationState);
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
