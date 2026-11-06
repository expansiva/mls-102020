/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.ts" enhancement="_blank" />
// The editing tools, plugged into the running client app (TASK-102033-studio-to-102020).
//
// This is the half that used to live inside `serviceClientApp` (102033). The app service still owns
// the DECISION — where the app is, whether studio mode is on, which level the user is at — and
// publishes it on a slot. This module owns the TOOLS, and it is loaded because a plugin index
// declares it under the `studioTools` scope, so the master frontend never names this project.
//
//   serviceClientApp (102033) --publishEditHost--> studioEditSlot <--register-- this
//
// It is a MODULE, not a class: there is one app region per window, and a tool that could be
// instantiated twice would arm two editors on the same DOM.

import {
  registerStudioEditTool,
  registerVisibleScreenSwap,
  currentEditHost,
  type IStudioEditHost,
} from '/_102033_/l2/cbe/studioEditSlot.js';
import { activeDraft } from '/_102033_/l2/cbe/studioDraft.js';
import {
  afterDraftSave,
  draftBlockReason,
  dropCapturedDraftText,
  holdCapturedDraftText,
  loadPanel,
  saveToDraft,
  storeCapturedDraftText,
  type FetchImpl,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { resetAuraSeed, seedActiveHeader, seedAuraStateFromHost } from '/_102020_/l2/aura/studio/studioAuraSeed.js';
import { installStudioModuleLock, isModuleLocked } from '/_102020_/l2/aura/studio/studioModuleLock.js';
import {
  autosaveMessage,
  captureModelText,
  createAutoSaver,
  pendingFiles,
  recordSentContent,
} from '/_102020_/l2/aura/studio/studioAutoSave.js';
import type { StudioEditor } from '/_102020_/l2/aura/studio/studioEditor.js';
import type { StudioLiveUpdateWatcher } from '/_102020_/l2/aura/studio/studioLiveUpdateWatcher.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

const fetchImpl: FetchImpl = (input, init) => fetch(input, init);

/** One other person's draft, as `listDrafts` reported it. `owner` is never a slug. */
export interface IOtherDraftTouch {
  owner: string | null;
  files: readonly string[];
}

/** `listDrafts.owner` when it is a non-empty string. A missing owner stays null — never the slug. */
export function listedOwner(item: object): string | null {
  if (!('owner' in item)) return null;
  const raw = (item as { owner?: unknown }).owner;
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  return name === '' ? null : name;
}

export function touchesFromDrafts(drafts: readonly object[]): IOtherDraftTouch[] {
  return drafts.map((item) => {
    const owner = listedOwner(item);
    if (owner === null) console.warn('[studio] listDrafts owner is missing');
    const rawFiles = 'files' in item ? (item as { files?: unknown }).files : undefined;
    const files = Array.isArray(rawFiles)
      ? rawFiles.filter((file): file is string => typeof file === 'string')
      : [];
    return { owner, files };
  });
}

function draftFilePath(file: {
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
}): string {
  const name = file.shortName ?? '';
  const folder = file.folder ?? '';
  const extension = file.extension ?? '';
  if (file.level === undefined && folder === '' && extension === '') return name;
  const levelPart = file.level === undefined ? '' : `l${file.level}/`;
  const folderPart = folder === '' ? '' : `${folder}/`;
  return `${levelPart}${folderPart}${name}${extension}`;
}

function alsoChangingText(person: string | null): string {
  return person ? t('edit.alsoChanging', { person }) : t('edit.alsoChangingUnknown');
}

/**
 * First edit of a file that another draft already lists.
 * Later edits of the same file return null. Does not read the network.
 */
export function sharedEditWarning(
  file: { level?: number; folder?: string; shortName?: string; extension?: string },
  others: readonly IOtherDraftTouch[],
  warned: Set<string>,
): string | null {
  const path = draftFilePath(file);
  if (path === '' || warned.has(path)) return null;
  const names: string[] = [];
  let listed = false;
  for (const other of others) {
    if (!other.files.includes(path)) continue;
    listed = true;
    if (other.owner && !names.includes(other.owner)) names.push(other.owner);
  }
  if (!listed) return null;
  warned.add(path);
  if (names.length === 0) {
    console.warn('[studio] shared file has no owner', path);
    return alsoChangingText(null);
  }
  return alsoChangingText(names.join(', '));
}

/** Warns once when the file is in another draft, then always hands the edit on. */
export function noteSharedFile(
  file: mls.stor.IFileInfo,
  others: readonly IOtherDraftTouch[],
  warned: Set<string>,
  show: (text: string) => void,
  send: (file: mls.stor.IFileInfo) => void,
): void {
  const text = sharedEditWarning(file, others, warned);
  if (text) show(text);
  send(file);
}

/** Other-draft list for this Studio session: which files were already re-read, and which were warned. */
export interface ISharedEditSession {
  refreshed: Set<string>;
  others: readonly IOtherDraftTouch[];
  warned: Set<string>;
}

/**
 * First change of each file in the session re-reads the other-draft list, then warns.
 * Later changes of that file do not query. A throw is logged here; `null` means the caller already logged the failed read. Either way the edit is sent and no warning is shown.
 */
export async function deliverSharedEdit(
  file: mls.stor.IFileInfo,
  session: ISharedEditSession,
  refresh: () => Promise<readonly IOtherDraftTouch[] | null>,
  show: (text: string) => void,
  send: (file: mls.stor.IFileInfo) => void,
): Promise<void> {
  const path = draftFilePath(file);
  if (path !== '' && !session.refreshed.has(path)) {
    session.refreshed.add(path);
    let next: readonly IOtherDraftTouch[] | null = null;
    try {
      next = await refresh();
    } catch (err) {
      console.error('[studio] listDrafts for shared files failed', err);
    }
    if (next === null) {
      send(file);
      return;
    }
    session.others = next;
  }
  noteSharedFile(file, session.others, session.warned, show, send);
}

const AUTO_SAVE_MS = 3000;

/** Same event the module lock records. While it is active, that module's sources stay in the browser. */
const APPLY_EVENT = 'nr-implementation-state';

interface IApplyState {
  project: number;
  moduleName: string;
  active: boolean;
}

/** What the tool starts and stops. Tests pass a fake; the app uses `DraftAutoSave`. */
export interface IDraftAutoSave {
  start(): void;
  stop(): void;
}

/** What the draft panel prints. `error` is the failure reason, already a string. */
export interface IAutoSavePanelState {
  on: boolean;
  lastSentAt: number | null;
  pending: number;
  error: string | null;
  /** An agent chain is open. The send waits until `running` returns to 0. */
  agentWorking: boolean;
}

let createAutoSave: () => IDraftAutoSave = () => new DraftAutoSave();
let autoSave: IDraftAutoSave | undefined;

let panelState: IAutoSavePanelState = { on: false, lastSentAt: null, pending: 0, error: null, agentWorking: false };
const panelListeners = new Set<(state: IAutoSavePanelState) => void>();

function publishPanel(next: IAutoSavePanelState): void {
  panelState = next;
  for (const listener of panelListeners) listener(panelState);
}

export function subscribeAutoSave(listener: (state: IAutoSavePanelState) => void): () => void {
  panelListeners.add(listener);
  listener(panelState);
  return () => {
    panelListeners.delete(listener);
  };
}

/** `null` puts the real auto-saver back and drops the one the test installed. */
export function bindAutoSaveFactory(factory: (() => IDraftAutoSave) | null): void {
  createAutoSave = factory ?? (() => new DraftAutoSave());
  if (factory === null) {
    autoSave?.stop();
    autoSave = undefined;
  }
}

/**
 * Studio mode and an active draft both have to be on.
 * Either one missing stops the saver. The instance stays so the next start keeps its pending batch.
 */
export function syncDraftAutoSave(studioMode: boolean, draftOn: boolean): void {
  if (!studioMode || !draftOn) {
    autoSave?.stop();
    return;
  }
  if (!autoSave) autoSave = createAutoSave();
  autoSave.start();
}

type SiteMode = 'studio' | 'production';

let reportedMissingMode = false;

function siteMode(): SiteMode | undefined {
  const getMode = (mls.sites as { getMode?: () => SiteMode | undefined } | undefined)?.getMode;
  if (typeof getMode !== 'function') {
    if (!reportedMissingMode) {
      reportedMissingMode = true;
      console.error('[studio] mls.sites.getMode is missing');
    }
    return undefined;
  }
  return getMode();
}

/** Auto-save runs only while the site is in studio and this tab has an active draft. */
function studioDraftOn(): boolean {
  if (siteMode() !== 'studio') return false;
  const draft = activeDraft();
  return typeof draft === 'string' && draft.length > 0;
}

function siteProject(): number | null {
  const project = getAuraState()?.actualProject;
  if (typeof project !== 'number' || project <= 0) return null;
  return project;
}

function pendingNow(project: number): mls.stor.IFileInfo[] {
  const files: mls.stor.IFileInfo[] = [];
  for (const file of Object.values(mls.stor.files)) {
    if (file) files.push(file);
  }
  return pendingFiles(files, project);
}

/** Last refusal reason logged per file, so a file that stays refused is not logged on every pass. */
const refusalLogged = new WeakMap<mls.stor.IFileInfo, string | undefined>();

/**
 * Capture each file's text, put that text in the local record, write the batch, then record the captured CRC.
 * A file whose model moved during the write stays pending and is handed back to schedule again.
 * A file whose local record cannot be written is not sent and stays pending.
 */
export async function sendAutoSaveBatch(
  batch: readonly mls.stor.IFileInfo[],
  project: number,
  onStillPending: (file: mls.stor.IFileInfo) => void,
): Promise<void> {
  const captured = new Map<mls.stor.IFileInfo, string>();
  for (const file of batch) {
    const text = captureModelText(file);
    if (text !== undefined) {
      captured.set(file, text);
      holdCapturedDraftText(file, text);
    }
  }
  const toSend: mls.stor.IFileInfo[] = [];
  const heldBack: mls.stor.IFileInfo[] = [];
  for (const file of batch) {
    if (file.status === 'deleted') {
      toSend.push(file);
      continue;
    }
    const text = captured.get(file);
    if (text === undefined) {
      toSend.push(file);
      continue;
    }
    if (await storeCapturedDraftText(file, text)) {
      toSend.push(file);
      continue;
    }
    dropCapturedDraftText(file);
    heldBack.push(file);
  }
  const refused = new Set<mls.stor.IFileInfo>();
  try {
    if (toSend.length > 0) {
      // `saveToDraft` clears `inLocalStorage` before the write. A direct `setContents` would hit the local driver.
      const saved = await saveToDraft(
        toSend,
        autosaveMessage(batch),
        (clean, msg) => mls.stor.setContents(clean, msg),
        (file) => afterDraftSave(file),
      );
      for (const file of saved.blocked) refused.add(file);
    }
  } finally {
    for (const file of batch) dropCapturedDraftText(file);
  }
  for (const file of toSend) {
    if (refused.has(file)) {
      // Not written. A sent CRC here would hide the file from the next pass.
      // The file stays pending and is retried on every pass: log it once, not every few seconds.
      const reason = draftBlockReason(file);
      // The stored reason is a new object on every pass. Compare the fields so a file that stays refused is logged once.
      const mark = reason === undefined
        ? undefined
        : `${reason.kind}\0${reason.path}\0${reason.bytes ?? ''}\0${reason.limit ?? ''}\0${reason.reason ?? ''}`;
      if (refusalLogged.get(file) !== mark) {
        refusalLogged.set(file, mark);
        console.error('[studio] auto-save did not send a file', file.shortName, reason);
      }
      onStillPending(file);
      continue;
    }
    if (file.status === 'deleted' || file.hasError) continue;
    const text = captured.get(file);
    // No open model (a file an agent wrote, a new file nobody opened): it was sent from its local
    // record, and with no model there is no later text to compare, so there is no CRC to keep.
    // Not an error: an agent chain writes hundreds of these, and each one used to log one.
    if (text === undefined) continue;
    // Last-send CRC only. `originalCRC` stays the published baseline.
    recordSentContent(file, text);
    if (pendingFiles([file], project).length === 1) onStillPending(file);
  }
  for (const file of heldBack) onStillPending(file);
}

function storFileFrom(ref: {
  project: number;
  level?: number;
  shortName: string;
  folder: string;
  extension: string;
}): mls.stor.IFileInfo | undefined {
  if (typeof ref.level !== 'number') {
    console.error('[studio] auto-save event has no level', ref.shortName);
    return undefined;
  }
  const key = mls.stor.getKeyToFile({
    project: ref.project,
    level: ref.level,
    shortName: ref.shortName,
    folder: ref.folder,
    extension: ref.extension,
  });
  const file = mls.stor.files[key];
  if (!file) console.error('[studio] auto-save file is not in stor', key);
  return file ?? undefined;
}

function pageEvents(): EventTarget | null {
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.addEventListener !== 'function' || typeof target.removeEventListener !== 'function') {
    console.error('[studio] nr-implementation-state: window.addEventListener is missing');
    return null;
  }
  return target;
}

function layerPath(file: {
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
}): string {
  return draftFilePath(file).replace(/\\/gu, '/');
}

/** `l5/…` belongs to the site, not to one module. Any active Apply holds every one of them. */
function level5File(file: { level?: number }, path: string): boolean {
  return file.level === 5 || path.startsWith('l5/');
}

/** Same prefixes the module lock uses: `l1/<module>/`, `l1/<module>_old/`, `l2/<module>/`, `l4/<module>/`. */
function pathUnderModule(path: string, moduleName: string): boolean {
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

function applyStateOf(ev: Event): IApplyState | null {
  if (!(ev instanceof CustomEvent) || !ev.detail || typeof ev.detail !== 'object') {
    console.error('[studio] nr-implementation-state detail is not { project, moduleName, active }', ev);
    return null;
  }
  const detail = ev.detail as { project?: unknown; moduleName?: unknown; active?: unknown };
  const moduleName = detail.moduleName;
  if (
    typeof detail.project !== 'number' || !Number.isSafeInteger(detail.project)
    || typeof moduleName !== 'string' || moduleName.length === 0 || moduleName.includes('/') || moduleName.includes('\\')
    || typeof detail.active !== 'boolean'
  ) {
    console.error('[studio] nr-implementation-state detail is not { project, moduleName, active }', ev.detail);
    return null;
  }
  return { project: detail.project, moduleName, active: detail.active };
}

/** `collabAgentChain` detail. `null` when the event is not that shape; the cause is logged. */
function agentChainRunning(ev: Event): number | null {
  if (!(ev instanceof CustomEvent)) {
    console.error('[studio] collabAgentChain is not a CustomEvent');
    return null;
  }
  const running = (ev.detail as { running?: unknown } | null)?.running;
  if (typeof running !== 'number' || !Number.isFinite(running) || running < 0) {
    console.error('[studio] collabAgentChain has no running count', ev.detail);
    return null;
  }
  return running;
}

class DraftAutoSave implements IDraftAutoSave {
  private listening = false;
  private chainListening = false;
  /** Open agent chains. Above 0, notifies stay pending and nothing is sent. */
  private agentRunning = 0;
  private applyListening = false;
  /** Modules whose Apply is active, per project. The lock registry is the other reader of the same event. */
  private readonly applying = new Map<number, Set<string>>();
  private readonly sharedEdits: ISharedEditSession = {
    refreshed: new Set<string>(),
    others: [],
    warned: new Set<string>(),
  };
  private readonly saver = createAutoSaver<mls.stor.IFileInfo>({
    debounceMs: AUTO_SAVE_MS,
    now: () => Date.now(),
    hasDraft: () => this.listening && studioDraftOn() && this.agentRunning === 0,
    onError: (reason) => {
      const project = siteProject();
      publishPanel({
        on: this.listening,
        lastSentAt: panelState.lastSentAt,
        pending: project === null ? panelState.pending : pendingNow(project).length,
        error: reason instanceof Error ? reason.message : String(reason),
        agentWorking: this.agentRunning > 0,
      });
    },
    send: async (files) => {
      const project = siteProject();
      if (project === null) {
        console.error('[studio] auto-save has no site project');
        return;
      }
      const batch = pendingFiles(files, project).filter((file) => !this.heldFromApply(project, file));
      if (batch.length === 0) return;
      await sendAutoSaveBatch(batch, project, (file) => this.saver.notify(file));
      publishPanel({
        on: this.listening,
        lastSentAt: Date.now(),
        pending: pendingNow(project).length,
        error: null,
        agentWorking: this.agentRunning > 0,
      });
    },
  });

  public start(): void {
    if (this.listening) return;
    mls.events.addListener(1, 'FileAction', this.onFileAction);
    mls.events.addListener(2, 'FileAction', this.onFileAction);
    mls.events.addListener(3, 'FileAction', this.onFileAction);
    mls.events.addListener(5, 'FileAction', this.onFileAction);
    mls.events.addListener(2, 'styleChanged' as mls.events.TypeEvent, this.onStyleChanged);
    this.listening = true;
    this.listenForAgentChain();
    this.listenForApply();
    const project = siteProject();
    const pending = project === null ? [] : pendingNow(project);
    publishPanel({
      on: true,
      lastSentAt: panelState.lastSentAt,
      pending: pending.length,
      error: panelState.error,
      agentWorking: this.agentRunning > 0,
    });
    // Files already dirty when Studio (or the active draft) comes on never fire a new event.
    for (const file of pending) this.saver.notify(file);
    void this.refreshOthers();
  }

  /** List of other drafts. On enter, when a file opens, and on the first edit of each file — not on later edits of that file. */
  private async refreshOthers(): Promise<readonly IOtherDraftTouch[] | null> {
    const project = siteProject();
    const slug = activeDraft();
    if (project === null || typeof slug !== 'string' || slug.length === 0) {
      console.warn('[studio] shared-file list has no project or draft');
      return null;
    }
    try {
      const panel = await loadPanel(fetchImpl, project, slug);
      this.sharedEdits.others = touchesFromDrafts(panel.others);
      return this.sharedEdits.others;
    } catch (err) {
      console.error('[studio] listDrafts for shared files failed', err);
      return null;
    }
  }

  public stop(): void {
    if (!this.listening) return;
    mls.events.removeEventListener([1, 2, 3, 5], ['FileAction'], this.onFileAction);
    mls.events.removeEventListener([2], ['styleChanged' as mls.events.TypeEvent], this.onStyleChanged);
    this.listening = false;
    this.stopListeningForAgentChain();
    this.stopListeningForApply();
    publishPanel({
      on: false,
      lastSentAt: panelState.lastSentAt,
      pending: panelState.pending,
      error: panelState.error,
      agentWorking: this.agentRunning > 0,
    });
  }

  private listenForAgentChain(): void {
    const target = (globalThis as { window?: EventTarget }).window;
    if (!target || typeof target.addEventListener !== 'function') {
      console.error('[studio] collabAgentChain: window.addEventListener is missing');
      return;
    }
    target.addEventListener('collabAgentChain', this.onAgentChain);
    this.chainListening = true;
  }

  private stopListeningForAgentChain(): void {
    if (!this.chainListening) return;
    const target = (globalThis as { window?: EventTarget }).window;
    if (!target || typeof target.removeEventListener !== 'function') {
      console.error('[studio] collabAgentChain: window.removeEventListener is missing');
      return;
    }
    target.removeEventListener('collabAgentChain', this.onAgentChain);
    this.chainListening = false;
  }

  private readonly onAgentChain = (ev: Event): void => {
    const running = agentChainRunning(ev);
    if (running === null) return;
    const was = this.agentRunning;
    this.agentRunning = running;
    if (running > 0) {
      this.holdForAgent();
      return;
    }
    if (was > 0) this.releaseAfterAgent();
  };

  /** Chain is open. File notices still update the pending count; the saver does not send. */
  private holdForAgent(): void {
    const project = siteProject();
    publishPanel({
      on: this.listening,
      lastSentAt: panelState.lastSentAt,
      pending: project === null ? panelState.pending : pendingNow(project).length,
      error: panelState.error,
      agentWorking: true,
    });
  }

  /** Chain closed (success, error, or cancel). One notify of everything still pending. */
  private releaseAfterAgent(): void {
    const project = siteProject();
    if (project === null) {
      console.error('[studio] auto-save has no site project');
      publishPanel({
        on: this.listening,
        lastSentAt: panelState.lastSentAt,
        pending: panelState.pending,
        error: panelState.error,
        agentWorking: false,
      });
      return;
    }
    const pending = pendingNow(project);
    publishPanel({
      on: this.listening,
      lastSentAt: panelState.lastSentAt,
      pending: pending.length,
      error: panelState.error,
      agentWorking: false,
    });
    for (const file of pending) this.saver.notify(file);
  }

  private listenForApply(): void {
    const target = pageEvents();
    if (!target) return;
    target.addEventListener(APPLY_EVENT, this.onApply);
    this.applyListening = true;
  }

  private stopListeningForApply(): void {
    if (!this.applyListening) return;
    this.applyListening = false;
    const target = pageEvents();
    if (!target) return;
    target.removeEventListener(APPLY_EVENT, this.onApply);
  }

  private readonly onApply = (ev: Event): void => {
    const detail = applyStateOf(ev);
    if (!detail) return;
    const names = this.applying.get(detail.project) ?? new Set<string>();
    if (detail.active) {
      names.add(detail.moduleName);
      this.applying.set(detail.project, names);
      return;
    }
    names.delete(detail.moduleName);
    if (names.size === 0) this.applying.delete(detail.project);
    else this.applying.set(detail.project, names);
    const project = detail.project;
    const moduleName = detail.moduleName;
    queueMicrotask(() => this.releaseModule(project, moduleName));
  };

  /** Apply finished, was cancelled, or was undone. One notify of that module, plus every `l5` when no Apply remains. */
  private releaseModule(project: number, moduleName: string): void {
    if (!this.listening || !studioDraftOn() || this.agentRunning > 0) return;
    const applyStillOn = (this.applying.get(project)?.size ?? 0) > 0;
    const pending = pendingNow(project).filter((file) => {
      const path = layerPath(file);
      if (level5File(file, path)) return !applyStillOn;
      return pathUnderModule(path, moduleName);
    });
    for (const file of pending) this.saver.notify(file);
  }

  private heldFromApply(project: number, file: mls.stor.IFileInfo): boolean {
    const path = layerPath(file);
    const names = this.applying.get(project);
    if (isModuleLocked(project, path)) return true;
    if (!names || names.size === 0) return false;
    if (level5File(file, path)) return true;
    for (const moduleName of names) {
      if (pathUnderModule(path, moduleName)) return true;
    }
    return false;
  }

  private readonly onFileAction = (ev: mls.events.IEvent): void => {
    if ((ev.level !== 1 && ev.level !== 2 && ev.level !== 3 && ev.level !== 5) || ev.type !== 'FileAction' || !ev.desc) return;
    let fileAction: mls.events.IFileAction;
    try {
      fileAction = JSON.parse(ev.desc) as mls.events.IFileAction;
    } catch (err) {
      console.error('[studio] auto-save FileAction is not JSON', err);
      return;
    }
    if (fileAction.action === 'open') {
      void this.refreshOthers();
      return;
    }
    if (fileAction.action !== 'editorChanged' && fileAction.action !== 'statusOrErrorChanged') return;
    this.deliver(storFileFrom(fileAction));
  };

  private readonly onStyleChanged = (ev: mls.events.IEvent): void => {
    if (ev.level !== 2 || !ev.desc) return;
    let parsed: { storFile?: { project: number; level?: number; shortName: string; folder: string } } | null = null;
    try {
      parsed = JSON.parse(ev.desc) as { storFile?: { project: number; level?: number; shortName: string; folder: string } };
    } catch (err) {
      console.error('[studio] auto-save styleChanged is not JSON', err);
      return;
    }
    if (!parsed?.storFile) return;
    this.deliver(storFileFrom({ ...parsed.storFile, extension: '.less' }));
  };

  private deliver(file: mls.stor.IFileInfo | undefined): void {
    if (!file) return;
    void deliverSharedEdit(
      file,
      this.sharedEdits,
      () => this.refreshOthers(),
      showSharedNotice,
      (item) => this.note(item),
    );
  }

  private note(file: mls.stor.IFileInfo | undefined): void {
    if (!file) return;
    const project = siteProject();
    if (project === null) {
      console.error('[studio] auto-save has no site project');
      return;
    }
    publishPanel({
      on: true,
      lastSentAt: panelState.lastSentAt,
      pending: pendingNow(project).length,
      error: panelState.error,
      agentWorking: this.agentRunning > 0,
    });
    if (pendingFiles([file], project).length === 1) this.saver.notify(file);
  }
}

let editor: StudioEditor | undefined;

function showSharedNotice(text: string): void {
  console.warn('[studio]', text);
  editor?.showStatus(text, true);
}
let watcher: StudioLiveUpdateWatcher | undefined;
let armed = false;
/** Guard against re-entrancy: loading the editor is async and the slot can publish again meanwhile. */
let arming = false;

/**
 * Fills the Aura state from the page the app has mounted (studioAuraSeed).
 *
 * Gated on studio mode alone, NOT on the edit level: the state is what the studio SERVICES read (the
 * genome knob, the project knob, the scenario panel, selectPage), and they are on screen whether or
 * not the in-place editor is armed. It is also the FIRST thing done here, so those services never
 * paint an empty panel before the seed lands.
 *
 * Synchronous by design: the panels read the state as they render, and one publish is all the
 * ordering guarantee there is. Only the header (a stor read) is left floating.
 */
function syncAuraState(state: IStudioEditHost): void {
  if (!state.studioMode) return;
  const page = seedAuraStateFromHost(state.host);
  if (page) void seedActiveHeader(page.project);
}

/**
 * Bridges edits made through the studio's OWN file editor (ServiceSource) to the running page.
 *
 * Gated on studio mode alone, NOT on the edit level: someone editing exclusively through the file
 * editor never arms the inline overlay, and the hot swap must still reach the running page.
 */
async function syncWatcher(state: IStudioEditHost): Promise<void> {
  if (!state.studioMode) {
    watcher?.stop();
    syncDraftAutoSave(false, false);
    return;
  }
  // The active draft is required for the save and irrelevant for the live update, so the two gates stay apart.
  syncDraftAutoSave(true, studioDraftOn());
  if (!watcher) {
    const { StudioLiveUpdateWatcher } = await import('/_102020_/l2/aura/studio/studioLiveUpdateWatcher.js');
    watcher = new StudioLiveUpdateWatcher();
  }
  watcher.start(state.host);
}

/**
 * Arms the in-place editor on the edit level, disarms otherwise.
 *
 * Studio mode is already in the state: leaving it (Ctrl+Alt+S) does NOT reset the nav3 level, so
 * without that condition the editor would stay armed in a client session — capturing every pointer
 * event and making the app unusable.
 */
async function syncEditor(state: IStudioEditHost): Promise<void> {
  // The overlay is a fixed layer on the body, so it does not disappear with the panel: switching nav3
  // service used to leave the selection box floating over the other service.
  editor?.setOverlayVisible(state.panelVisible);

  if (!state.editLevel) {
    if (armed) {
      armed = false;
      editor?.setMode('off');
    }
    return;
  }

  if (armed || arming) return;
  arming = true;
  try {
    if (!editor) {
      const { StudioEditor } = await import('/_102020_/l2/aura/studio/studioEditor.js');
      editor = new StudioEditor();
    }
    // Re-read the slot: the level may have changed while the import was in flight.
    const fresh = currentEditHost();
    if (!fresh?.editLevel || fresh.host !== state.host) return;

    editor.attach(fresh.host, fresh.chromeHost);
    armed = true;
    editor.setMode('select');
    // With no button, this is the only signal that clicks now select instead of reaching the app.
    editor.showStatus(t('status.editMode', { level: fresh.level }));
  } finally {
    arming = false;
  }
}

/** The app region is gone (the service disconnected, or studio mode is off): everything comes down. */
function teardown(): void {
  editor?.detach();
  editor = undefined;
  armed = false;
  watcher?.stop();
  watcher = undefined;
  syncDraftAutoSave(false, false);
  autoSave = undefined;
  // The next entry must seed again: the app region coming back can bring another page.
  resetAuraSeed();
}

async function apply(state: IStudioEditHost | null): Promise<void> {
  // Monaco may still be loading on the first publish; install retries until `onDidCreateEditor` exists.
  installStudioModuleLock();
  if (!state) {
    teardown();
    return;
  }
  syncAuraState(state);
  await syncWatcher(state);
  await syncEditor(state);
}

registerStudioEditTool((state) => {
  void apply(state);
});

// The Studio entry (102033) asks for the live swap of the screens the draft changed. The watcher
// owns the "is it the mounted screen or its shared base" decision.
registerVisibleScreenSwap(async (ref) => {
  const { applyChangedOnMounted } = await import('/_102020_/l2/aura/studio/studioLiveUpdateWatcher.js');
  await applyChangedOnMounted(ref);
});

installStudioModuleLock();
