/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.ts" enhancement="_blank" />
// The editing tools, plugged into the running client app.
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
  currentEditHost,
  type IStudioEditHost,
} from '/_102033_/l2/cbe/studioEditSlot.js';
import { armPreviewTabUpdates } from '/_102020_/l2/aura/studio/studioLiveUpdateRemount.js';
import { activeDraft, isVmDriver } from '/_102033_/l2/cbe/studioDraft.js';
import { COLLAB_DRAFT_RECOUNT, draftEntrySeedPending } from '/_102033_/l2/cbe/studioDraftFiles.js';
import {
  afterDraftSave,
  COLLAB_DRAFT_SAVED,
  collectEditedFiles,
  draftSaveTotals,
  explainUnsavedRows,
  loadPanel,
  rememberOpenedDraftText,
  saveToDraft,
  type FetchImpl,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { resetAuraSeed, seedActiveHeader, seedAuraStateFromHost } from '/_102020_/l2/aura/studio/studioAuraSeed.js';
import { installStudioModuleLock, lockedDraftWrite } from '/_102020_/l2/aura/studio/studioModuleLock.js';
import type { StudioEditor } from '/_102020_/l2/aura/studio/studioEditor.js';
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

const DRAFT_FILE_LEVELS = [1, 2, 3, 5] as const;

type DraftFileListener = () => void;

const draftFileListeners = new Set<DraftFileListener>();
let draftFileListening = false;

const onDraftFileEvent = (_ev: mls.events.IEvent): void => {
  for (const listener of draftFileListeners) listener();
};

function listenDraftFiles(): void {
  if (draftFileListening) return;
  const events = mls.events;
  if (!events || typeof events.addListener !== 'function') {
    console.error('[studio] draft file count: mls.events.addListener is missing');
    return;
  }
  for (const level of DRAFT_FILE_LEVELS) events.addListener(level, 'FileAction', onDraftFileEvent);
  events.addListener(2, 'styleChanged' as mls.events.TypeEvent, onDraftFileEvent);
  draftFileListening = true;
}

function stopDraftFiles(): void {
  if (!draftFileListening) return;
  const events = mls.events;
  if (!events || typeof events.removeEventListener !== 'function') {
    console.error('[studio] draft file count: mls.events.removeEventListener is missing');
    draftFileListening = false;
    return;
  }
  events.removeEventListener([...DRAFT_FILE_LEVELS], ['FileAction'], onDraftFileEvent);
  events.removeEventListener([2], ['styleChanged' as mls.events.TypeEvent], onDraftFileEvent);
  draftFileListening = false;
}

/**
 * The draft panel recounts "still to save" when a source file changes.
 * The listener never writes. The last subscriber removes it.
 */
export function subscribeDraftFiles(listener: DraftFileListener): () => void {
  draftFileListeners.add(listener);
  listenDraftFiles();
  listener();
  return () => {
    draftFileListeners.delete(listener);
    if (draftFileListeners.size === 0) stopDraftFiles();
  };
}

/** Window event with how many files of the site project still need Save. */
export const COLLAB_DRAFT_PENDING = 'collabDraftPending';

export interface ICollabDraftPendingDetail {
  project: number;
  count: number;
  /** Pending files Save refuses: compile error, and not a deletion. */
  blocked: number;
}

/** Window event after Save asked from outside the draft panel. */
export const COLLAB_DRAFT_SAVE_RESULT = 'collabDraftSaveResult';

export interface ICollabDraftSaveResultDetail {
  project: number;
  /** True when at least one file was written. */
  saved: boolean;
  blocked: number;
  /** Failure only. Catalog text for the document language. */
  message?: string;
}

/** Window event from the preview layer. Same Save as the draft panel. */
export const COLLAB_DRAFT_SAVE_REQUEST = 'collabDraftSaveRequest';

interface ICollabDraftSaveRequestDetail {
  project: number;
}

let pendingUnsub: (() => void) | undefined;
let pendingProject: number | null = null;
let pendingCount: number | null = null;
let pendingBlocked: number | null = null;
let pendingRefreshOn = false;
let pendingEpoch = 0;
/** One local-text read at a time. A recount that arrives mid-read runs once more at the end. */
let localNote: Promise<void> | null = null;
let localNoteAgain = false;
let saveRequestOn = false;
let draftBridgeOn = false;

function siteProjectId(): number | null {
  const project = mls.actualProject;
  if (typeof project !== 'number' || project <= 0) return null;
  return project;
}

function pendingTotals(project: number): { count: number; blocked: number } {
  const files = mls.stor?.files;
  if (!files) {
    console.error('[studio] collabDraftPending: mls.stor.files is missing');
    return { count: 0, blocked: 0 };
  }
  return draftSaveTotals(files, project);
}

/**
 * Read every local copy before the cover counts. A saved file with no noted text
 * would count as unsaved (`fileNeedsSave`) and the footer would stay up.
 * Callers that arrive while a read is in flight share it and cause one more read at the end.
 */
function noteLocalsForPending(): Promise<void> {
  if (localNote) {
    localNoteAgain = true;
    return localNote;
  }
  let resolveFlight: () => void = () => {};
  const flight = new Promise<void>((resolve) => {
    resolveFlight = resolve;
  });
  localNote = flight;
  const run = async (): Promise<void> => {
    do {
      localNoteAgain = false;
      try {
        await rememberLocalDraftText();
      } catch (err) {
        console.error('[studio] could not read the local draft text', err);
      }
    } while (localNoteAgain);
  };
  void run().finally(() => {
    if (localNote === flight) localNote = null;
    resolveFlight();
  });
  return flight;
}

function emitDraftPending(project: number, force: boolean): void {
  const totals = pendingTotals(project);
  if (
    !force
    && pendingProject === project
    && pendingCount === totals.count
    && pendingBlocked === totals.blocked
  ) return;
  pendingProject = project;
  pendingCount = totals.count;
  pendingBlocked = totals.blocked;
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.dispatchEvent !== 'function') {
    console.error('[studio] collabDraftPending was not dispatched: window is missing');
    return;
  }
  const detail: ICollabDraftPendingDetail = {
    project,
    count: totals.count,
    blocked: totals.blocked,
  };
  try {
    target.dispatchEvent(new CustomEvent(COLLAB_DRAFT_PENDING, { detail }));
  } catch (err) {
    console.error('[studio] collabDraftPending was not dispatched:', err);
  }
}

/** Note the local text first. Do not publish the conservative count while that read is in flight. */
function publishDraftPending(force: boolean): void {
  const project = siteProjectId();
  if (project === null) {
    console.error('[studio] collabDraftPending: mls.actualProject is missing');
    return;
  }
  const epoch = pendingEpoch;
  void noteLocalsForPending().then(() => {
    if (epoch !== pendingEpoch || !pendingUnsub) return;
    if (draftEntrySeedPending()) return;
    const current = siteProjectId();
    if (current === null) {
      console.error('[studio] collabDraftPending: mls.actualProject is missing');
      return;
    }
    emitDraftPending(current, force);
  });
}

function onDraftPendingRefresh(): void {
  publishDraftPending(false);
}

/** Recount while Studio is on. Undo, discard and the seeded CRC emit `collabDraftRecount`. */
function armDraftPendingRefresh(): void {
  if (pendingRefreshOn) return;
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(COLLAB_DRAFT_SAVED, onDraftPendingRefresh);
  target.addEventListener(COLLAB_DRAFT_SAVE_RESULT, onDraftPendingRefresh);
  target.addEventListener(COLLAB_DRAFT_RECOUNT, onDraftPendingRefresh);
  pendingRefreshOn = true;
}

function disarmDraftPendingRefresh(): void {
  const target = (globalThis as { window?: EventTarget }).window;
  if (pendingRefreshOn && target && typeof target.removeEventListener === 'function') {
    target.removeEventListener(COLLAB_DRAFT_SAVED, onDraftPendingRefresh);
    target.removeEventListener(COLLAB_DRAFT_SAVE_RESULT, onDraftPendingRefresh);
    target.removeEventListener(COLLAB_DRAFT_RECOUNT, onDraftPendingRefresh);
  }
  pendingRefreshOn = false;
}

function startDraftPending(): void {
  if (pendingUnsub) return;
  pendingUnsub = subscribeDraftFiles(() => { publishDraftPending(false); });
  armDraftPendingRefresh();
}

function stopDraftPending(): void {
  pendingEpoch += 1;
  disarmDraftPendingRefresh();
  pendingUnsub?.();
  pendingUnsub = undefined;
  pendingProject = null;
  pendingCount = null;
  pendingBlocked = null;
}

/** After Save, the count may change without a file event. No-op outside Studio. */
export function noteDraftPending(): void {
  if (!pendingUnsub) return;
  publishDraftPending(false);
}

function readSaveProject(ev: Event): number {
  const detail = (ev as CustomEvent<unknown>).detail;
  if (!detail || typeof detail !== 'object' || !('project' in detail)) return 0;
  const project = (detail as ICollabDraftSaveRequestDetail).project;
  return typeof project === 'number' && project > 0 ? project : 0;
}

function closedPanelFailure(outcome: IDraftSaveOutcome, blocked: number): string | undefined {
  if (outcome.kind === 'error') return outcome.message;
  if (outcome.kind === 'failed') return t('draft.saveFailed');
  if (blocked > 0) return t('draft.blocked', { n: blocked });
  return undefined;
}

function publishDraftSaveResult(project: number, outcome: IDraftSaveOutcome, wrote: boolean): void {
  const blocked = outcome.kind === 'saved' ? outcome.blocked.length : 0;
  const detail: ICollabDraftSaveResultDetail = {
    project,
    saved: outcome.kind === 'saved' && wrote,
    blocked,
  };
  const message = closedPanelFailure(outcome, blocked);
  if (message) detail.message = message;
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.dispatchEvent !== 'function') {
    console.error('[studio] collabDraftSaveResult was not dispatched: window is missing');
    return;
  }
  try {
    target.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVE_RESULT, { detail }));
  } catch (err) {
    console.error('[studio] collabDraftSaveResult was not dispatched:', err);
  }
}

async function onDraftSaveRequest(ev: Event): Promise<void> {
  const project = readSaveProject(ev);
  if (!project) {
    console.error('[studio] collabDraftSaveRequest has no project');
    return;
  }
  let panelOpen = false;
  try {
    const host = currentDraftSaveHost();
    panelOpen = host !== null && host.project() === project;
    const outcome = await runDraftSave(
      project,
      panelOpen && host ? host.messages() : draftSaveMessages(),
      panelOpen && host ? host.driver() : undefined,
      !panelOpen,
    );
    if (panelOpen && host) await host.apply(outcome);
  } catch (err) {
    console.error('[studio] collabDraftSaveRequest failed:', err);
    if (!panelOpen) {
      publishDraftSaveResult(project, { kind: 'failed', message: t('draft.saveFailed') }, false);
    }
  }
}

function startSaveRequest(): void {
  if (saveRequestOn) return;
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.addEventListener !== 'function') {
    console.error('[studio] collabDraftSaveRequest was not armed: window is missing');
    return;
  }
  target.addEventListener(COLLAB_DRAFT_SAVE_REQUEST, onDraftSaveRequest);
  saveRequestOn = true;
}

function stopSaveRequest(): void {
  if (!saveRequestOn) return;
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.removeEventListener !== 'function') {
    console.error('[studio] collabDraftSaveRequest was not removed: window is missing');
    saveRequestOn = false;
    return;
  }
  target.removeEventListener(COLLAB_DRAFT_SAVE_REQUEST, onDraftSaveRequest);
  saveRequestOn = false;
}

/** Pending count and the Save request. Both run while Studio is on, panel open or not. */
function syncStudioDraftBridge(studioMode: boolean): void {
  if (!studioMode) {
    if (!draftBridgeOn) return;
    draftBridgeOn = false;
    stopDraftPending();
    stopSaveRequest();
    return;
  }
  if (draftBridgeOn) return;
  draftBridgeOn = true;
  startDraftPending();
  startSaveRequest();
}

export interface IDraftSaveMessages {
  noFiles: string;
}

export type IDraftSaveOutcome =
  | { kind: 'idle' }
  | { kind: 'failed'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'saved'; blocked: mls.stor.IFileInfo[]; refused: string | null };

export interface IDraftSaveHost {
  project(): number | undefined;
  driver(): { driverVersion?: string } | null;
  messages(): IDraftSaveMessages;
  apply(outcome: IDraftSaveOutcome): Promise<void>;
}

const idleSave: IDraftSaveOutcome = { kind: 'idle' };
let draftSaveHost: IDraftSaveHost | null = null;

export function bindDraftSaveHost(host: IDraftSaveHost): void {
  draftSaveHost = host;
}

export function releaseDraftSaveHost(host: IDraftSaveHost): void {
  if (draftSaveHost === host) draftSaveHost = null;
}

export function currentDraftSaveHost(): IDraftSaveHost | null {
  return draftSaveHost;
}

/** Language for a Save that runs with the draft panel closed. Same catalog as the rest of Studio. */
export function draftSaveMessages(): IDraftSaveMessages {
  return {
    noFiles: t('draft.noFiles'),
  };
}

function draftFileLabel(file: mls.stor.IFileInfo): string {
  return `${file.folder}/${file.shortName}${file.extension}`;
}

/** Git commit message for a manual Save. Technical English; up to three paths. */
function draftSaveComment(files: readonly mls.stor.IFileInfo[]): string {
  const listed = files.slice(0, 3).map((file) => {
    const folder = file.folder ?? '';
    const name = file.shortName ?? '';
    const extension = file.extension ?? '';
    return folder === '' ? `${name}${extension}` : `${folder}/${name}${extension}`;
  });
  return `save: ${files.length} file(s): ${listed.join(', ')}`;
}

async function rememberLocalDraftText(): Promise<void> {
  const files = mls.stor?.files;
  if (!files) {
    console.error('[studio] mls.stor.files is missing');
    return;
  }
  const opened: mls.stor.IFileInfo[] = [];
  for (const file of Object.values(files)) {
    if (file) opened.push(file);
  }
  await rememberOpenedDraftText(opened);
}

/**
 * The panel Save and `collabDraftSaveRequest` both come here.
 * `knownDriver === undefined` reads the driver (the panel is closed). A passed driver is not read again.
 */
export async function runDraftSave(
  project: number,
  panelMessages: IDraftSaveMessages,
  knownDriver: { driverVersion?: string } | null | undefined,
  reportClosedPanel = false,
): Promise<IDraftSaveOutcome> {
  const done = (outcome: IDraftSaveOutcome, wrote = false): IDraftSaveOutcome => {
    if (reportClosedPanel && outcome.kind !== 'idle') publishDraftSaveResult(project, outcome, wrote);
    return outcome;
  };
  if (!project) {
    console.error('[studio] save has no project');
    return done(idleSave);
  }
  const driverWasKnown = knownDriver !== undefined;
  let driver = knownDriver;
  if (!driverWasKnown) {
    try {
      driver = await mls.stor.others.getDefaultDriver(project);
    } catch (err) {
      console.error('[studio] getDefaultDriver failed:', err);
      return done({ kind: 'failed', message: err instanceof Error ? err.message : String(err) });
    }
  }
  if (!isVmDriver(driver)) {
    if (!driverWasKnown) console.error('[studio] save request is not a VM project', project);
    return done(idleSave);
  }
  await rememberLocalDraftText();
  const storFiles = mls.stor.files;
  if (!storFiles) {
    console.error('[studio] mls.stor.files is missing');
    return done({ kind: 'failed', message: panelMessages.noFiles });
  }
  const files = collectEditedFiles(storFiles, project) as mls.stor.IFileInfo[];
  const skipped = explainUnsavedRows(storFiles, project);
  if (skipped.length > 0) console.info('[draftPanel] save skipped rows', skipped);
  if (files.length === 0) {
    console.warn('[studio] no edited files to save');
    return done({ kind: 'error', message: panelMessages.noFiles });
  }
  const open: mls.stor.IFileInfo[] = [];
  let refused: string | null = null;
  for (const file of files) {
    const message = lockedDraftWrite(file);
    if (message) {
      refused = message;
      continue;
    }
    open.push(file);
  }
  if (open.length === 0) {
    return done({ kind: 'error', message: refused ?? panelMessages.noFiles });
  }
  try {
    const saved = await saveToDraft(
      open,
      draftSaveComment(open),
      (clean, text) => mls.stor.setContents(clean, text),
      (file) => afterDraftSave(file),
    );
    if (saved.blocked.length > 0) {
      console.warn('[studio] blocked files:', saved.blocked.map(draftFileLabel));
    }
    noteDraftPending();
    const wrote = open.length - saved.blocked.length > 0;
    return done({ kind: 'saved', blocked: saved.blocked as mls.stor.IFileInfo[], refused }, wrote);
  } catch (err) {
    console.error('[studio] save failed:', err);
    return done({ kind: 'failed', message: err instanceof Error ? err.message : String(err) });
  }
}

let editor: StudioEditor | undefined;
let watcher: { stop(): void } | undefined;
let armed = false;
/** Guard against re-entrancy: loading the editor is async and the slot can publish again meanwhile. */
let arming = false;

/**
 * Other-draft list for this Studio session. Kept across a draft toggle, dropped when the app region goes away.
 * The notice never writes: `send` is empty.
 */
const sharedEdits: ISharedEditSession = {
  refreshed: new Set<string>(),
  others: [],
  warned: new Set<string>(),
};
let sharedListening = false;

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

/** The notice runs only while the site is in studio and this tab has an active draft. */
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

function emptySend(_file: mls.stor.IFileInfo): void {}

function showSharedNotice(text: string): void {
  console.warn('[studio]', text);
  editor?.showStatus(text, true);
}

/** List of other drafts. Re-read on the first change of each file, not on later edits of that file. */
async function refreshOthers(): Promise<readonly IOtherDraftTouch[] | null> {
  const project = siteProject();
  const slug = activeDraft();
  if (project === null || typeof slug !== 'string' || slug.length === 0) {
    console.warn('[studio] shared-file list has no project or draft');
    return null;
  }
  try {
    const panel = await loadPanel(fetchImpl, project, slug);
    sharedEdits.others = touchesFromDrafts(panel.others);
    return sharedEdits.others;
  } catch (err) {
    console.error('[studio] listDrafts for shared files failed', err);
    return null;
  }
}

function storFileFrom(ref: {
  project: number;
  level?: number;
  shortName: string;
  folder: string;
  extension: string;
}): mls.stor.IFileInfo | undefined {
  if (typeof ref.level !== 'number') {
    console.error('[studio] shared-edit event has no level', ref.shortName);
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
  if (!file) console.error('[studio] shared-edit file is not in stor', key);
  return file ?? undefined;
}

function resetSharedEditSession(): void {
  sharedEdits.refreshed.clear();
  sharedEdits.others = [];
  sharedEdits.warned.clear();
}

const onSharedFileAction = (ev: mls.events.IEvent): void => {
  if ((ev.level !== 1 && ev.level !== 2 && ev.level !== 3 && ev.level !== 5) || ev.type !== 'FileAction' || !ev.desc) return;
  let fileAction: mls.events.IFileAction;
  try {
    fileAction = JSON.parse(ev.desc) as mls.events.IFileAction;
  } catch (err) {
    console.error('[studio] shared-edit FileAction is not JSON', err);
    return;
  }
  if (fileAction.action !== 'editorChanged' && fileAction.action !== 'statusOrErrorChanged') return;
  const file = storFileFrom(fileAction);
  if (!file) return;
  void deliverSharedEdit(file, sharedEdits, () => refreshOthers(), showSharedNotice, emptySend);
};

function startSharedEditNotice(): void {
  if (sharedListening) return;
  const events = mls.events;
  if (!events || typeof events.addListener !== 'function') {
    console.error('[studio] shared-edit: mls.events.addListener is missing');
    return;
  }
  for (const level of DRAFT_FILE_LEVELS) events.addListener(level, 'FileAction', onSharedFileAction);
  sharedListening = true;
}

function stopSharedEditNotice(): void {
  if (!sharedListening) return;
  const events = mls.events;
  if (!events || typeof events.removeEventListener !== 'function') {
    console.error('[studio] shared-edit: mls.events.removeEventListener is missing');
    sharedListening = false;
    return;
  }
  events.removeEventListener([...DRAFT_FILE_LEVELS], ['FileAction'], onSharedFileAction);
  sharedListening = false;
}

/**
 * Studio mode and an active draft both have to be on. Either one missing stops the notice.
 * Same places the draft sender used to start and stop. This path never writes.
 */
export function syncSharedEditNotice(studioMode: boolean, draftOn: boolean): void {
  if (!studioMode || !draftOn) {
    stopSharedEditNotice();
    return;
  }
  startSharedEditNotice();
}

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
 * Studio mode used to start the live-update watcher so a file edit reached the preview before Save.
 * That swap is off. Level 3 still updates the screen from the in-place editor.
 * Leaving Studio stops a watcher if one was started.
 */
async function syncWatcher(state: IStudioEditHost): Promise<void> {
  if (!state.studioMode) {
    watcher?.stop();
    syncSharedEditNotice(false, false);
    return;
  }
  // The active draft is required for the notice. The preview is not swapped from this path.
  syncSharedEditNotice(true, studioDraftOn());
  watcher?.stop();
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

  if (arming) return;
  // Another nav3 tab on screen is another host: the editor moves to it (attach detaches from the old one first).
  if (armed && editor && !editor.isAttachedTo(state.host)) armed = false;
  if (armed) return;
  arming = true;
  try {
    if (!editor) {
      const { StudioEditor } = await import('/_102020_/l2/aura/studio/studioEditor.js');
      editor = new StudioEditor();
    }
    // Re-read the slot: the level, or the tab on screen, may have changed while the import was in flight.
    const fresh = currentEditHost();
    if (!fresh?.editLevel) return;

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
  syncStudioDraftBridge(false);
  syncSharedEditNotice(false, false);
  resetSharedEditSession();
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
  syncStudioDraftBridge(state.studioMode);
  syncAuraState(state);
  await syncWatcher(state);
  await syncEditor(state);
}

registerStudioEditTool((state) => {
  void apply(state);
});

armPreviewTabUpdates();

installStudioModuleLock();
