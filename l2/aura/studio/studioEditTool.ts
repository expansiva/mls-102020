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
import { resetAuraSeed, seedActiveHeader, seedAuraStateFromHost } from '/_102020_/l2/aura/studio/studioAuraSeed.js';
import type { StudioEditor } from '/_102020_/l2/aura/studio/studioEditor.js';
import type { StudioLiveUpdateWatcher } from '/_102020_/l2/aura/studio/studioLiveUpdateWatcher.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

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
    return;
  }
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
