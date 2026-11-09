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
import { loadPanel, type FetchImpl } from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { resetAuraSeed, seedActiveHeader, seedAuraStateFromHost } from '/_102020_/l2/aura/studio/studioAuraSeed.js';
import { installStudioModuleLock } from '/_102020_/l2/aura/studio/studioModuleLock.js';
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

let editor: StudioEditor | undefined;
let watcher: StudioLiveUpdateWatcher | undefined;
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
 * Bridges edits made through the studio's OWN file editor (ServiceSource) to the running page.
 *
 * Gated on studio mode alone, NOT on the edit level: someone editing exclusively through the file
 * editor never arms the inline overlay, and the hot swap must still reach the running page.
 */
async function syncWatcher(state: IStudioEditHost): Promise<void> {
  if (!state.studioMode) {
    watcher?.stop();
    syncSharedEditNotice(false, false);
    return;
  }
  // The active draft is required for the notice and irrelevant for the live update, so the two gates stay apart.
  syncSharedEditNotice(true, studioDraftOn());
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
