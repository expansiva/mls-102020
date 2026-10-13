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

import { registerStudioEditTool, currentEditHost, type IStudioEditHost } from '/_102033_/l2/cbe/studioEditSlot.js';
import { readDraftCookie } from '/_102033_/l2/cbe/studioDraft.js';
import { saveToDraft } from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { resetAuraSeed, seedActiveHeader, seedAuraStateFromHost } from '/_102020_/l2/aura/studio/studioAuraSeed.js';
import {
  autosaveMessage,
  createAutoSaver,
  pendingFiles,
} from '/_102020_/l2/aura/studio/studioAutoSave.js';
import type { StudioEditor } from '/_102020_/l2/aura/studio/studioEditor.js';
import type { StudioLiveUpdateWatcher } from '/_102020_/l2/aura/studio/studioLiveUpdateWatcher.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

const AUTO_SAVE_MS = 3000;

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
}

let createAutoSave: () => IDraftAutoSave = () => new DraftAutoSave();
let autoSave: IDraftAutoSave | undefined;

let panelState: IAutoSavePanelState = { on: false, lastSentAt: null, pending: 0, error: null };
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
 * Studio mode and the `collab-draft` cookie both have to be on.
 * Either one missing stops the saver. The instance stays so the next start keeps its pending batch.
 */
export function syncDraftAutoSave(studioMode: boolean, hasCookie: boolean): void {
  if (!studioMode || !hasCookie) {
    autoSave?.stop();
    return;
  }
  if (!autoSave) autoSave = createAutoSave();
  autoSave.start();
}

function draftCookieOn(): boolean {
  const raw = typeof document === 'undefined' ? '' : (document.cookie ?? '');
  return readDraftCookie(raw) !== undefined;
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

/** The model listener compares against `originalCRC`. Only a model that already exists needs moving. */
function moveCrcBaseline(file: mls.stor.IFileInfo): void {
  let key: string;
  try {
    key = mls.editor.getKeyModel(file.project, file.shortName, file.folder, file.level);
  } catch (err) {
    console.error('[studio] auto-save could not read the model key', file.shortName, err);
    return;
  }
  const models = mls.editor.models[key];
  if (!models) return;
  const list = [models.ts, models.test, models.html, models.style, models.defs];
  for (const model of list) {
    if (!model) continue;
    try {
      model.originalCRC = mls.common.crc.crc32(model.model.getValue()).toString(16);
    } catch (err) {
      console.error('[studio] auto-save could not move the CRC baseline', file.shortName, err);
    }
  }
}

class DraftAutoSave implements IDraftAutoSave {
  private listening = false;
  private readonly saver = createAutoSaver<mls.stor.IFileInfo>({
    debounceMs: AUTO_SAVE_MS,
    now: () => Date.now(),
    hasDraft: () => this.listening && draftCookieOn(),
    onError: (reason) => {
      const project = siteProject();
      publishPanel({
        on: this.listening,
        lastSentAt: panelState.lastSentAt,
        pending: project === null ? panelState.pending : pendingNow(project).length,
        error: reason instanceof Error ? reason.message : String(reason),
      });
    },
    send: async (files) => {
      const project = siteProject();
      if (project === null) {
        console.error('[studio] auto-save has no site project');
        return;
      }
      const batch = pendingFiles(files, project);
      if (batch.length === 0) return;
      // `saveToDraft` clears `inLocalStorage` before the write. A direct `setContents` would hit the local driver.
      await saveToDraft(
        batch,
        autosaveMessage(batch),
        (clean, msg) => mls.stor.setContents(clean, msg),
        (file) => mls.stor.localStor.setContent(file, { content: null }),
      );
      for (const file of batch) {
        if (file.hasError && file.status !== 'deleted') continue;
        moveCrcBaseline(file);
      }
      publishPanel({
        on: this.listening,
        lastSentAt: Date.now(),
        pending: pendingNow(project).length,
        error: null,
      });
    },
  });

  public start(): void {
    if (this.listening) return;
    mls.events.addListener(1, 'FileAction', this.onFileAction);
    mls.events.addListener(2, 'FileAction', this.onFileAction);
    mls.events.addListener(3, 'FileAction', this.onFileAction);
    mls.events.addListener(2, 'styleChanged' as mls.events.TypeEvent, this.onStyleChanged);
    this.listening = true;
    const project = siteProject();
    const pending = project === null ? [] : pendingNow(project);
    publishPanel({
      on: true,
      lastSentAt: panelState.lastSentAt,
      pending: pending.length,
      error: panelState.error,
    });
    // Files already dirty when Studio (or the cookie) comes on never fire a new event.
    for (const file of pending) this.saver.notify(file);
  }

  public stop(): void {
    if (!this.listening) return;
    mls.events.removeEventListener([1, 2, 3], ['FileAction'], this.onFileAction);
    mls.events.removeEventListener([2], ['styleChanged' as mls.events.TypeEvent], this.onStyleChanged);
    this.listening = false;
    publishPanel({
      on: false,
      lastSentAt: panelState.lastSentAt,
      pending: panelState.pending,
      error: panelState.error,
    });
  }

  private readonly onFileAction = (ev: mls.events.IEvent): void => {
    if ((ev.level !== 1 && ev.level !== 2 && ev.level !== 3) || ev.type !== 'FileAction' || !ev.desc) return;
    let fileAction: mls.events.IFileAction;
    try {
      fileAction = JSON.parse(ev.desc) as mls.events.IFileAction;
    } catch (err) {
      console.error('[studio] auto-save FileAction is not JSON', err);
      return;
    }
    if (fileAction.action !== 'editorChanged' && fileAction.action !== 'statusOrErrorChanged') return;
    this.note(storFileFrom(fileAction));
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
    this.note(storFileFrom({ ...parsed.storFile, extension: '.less' }));
  };

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
    });
    if (pendingFiles([file], project).length === 1) this.saver.notify(file);
  }
}

let editor: StudioEditor | undefined;
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
  // The cookie is required for the save and irrelevant for the live update, so the two gates stay apart.
  syncDraftAutoSave(true, draftCookieOn());
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
