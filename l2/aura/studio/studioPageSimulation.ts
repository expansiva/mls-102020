/// <mls fileReference="_102020_/l2/aura/studio/studioPageSimulation.ts" enhancement="_blank" />
// The simulation of the page on screen (scene + situation), owned OUTSIDE the "States" tab (plugins/pluginPageStates).
//
// WHY NOT IN THE TAB
// The tab is a panel of selectPage, and serviceGenome draws ONE panel per knob: clicking the "Molecules" knob to swap the
// molecule that only shows in the simulated situation removed selectPage from the DOM, the tab restored everything in
// its disconnectedCallback, and the page fell back to the app's state under the person's hands. Unmounting a panel is
// not "I am done simulating". So the simulation lives here and the tab only draws it.
//
// WHEN IT ENDS
//   - the page on screen changes (aura.actualPage) — the simulation belongs to the page it was made on;
//   - studio mode goes off (the edit slot publishes null or studioMode false);
//   - the person asks ("restore everything", or turning a situation off).
//
// While it lasts, a live update (an edit that remounts the page — a class, a text, a molecule swap) puts every simulated
// value back, and keeps doing so for REASSERT_MS: the new element resets its states and its initial queries write over
// the situation being edited.

import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { registerStudioEditTool } from '/_102033_/l2/cbe/studioEditSlot.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { onLiveUpdateApplied } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';
import { PageSimulation, pageIdOf, type ISimulationStore } from '/_102020_/l2/aura/helpers/pageSimulationCore.js';

export { pageIdOf } from '/_102020_/l2/aura/helpers/pageSimulationCore.js';

// ─── The one instance of the window ───────────────────────────────────────────

const collabStore: ISimulationStore = {
  get: getState,
  set: setState,
  watch(keys, onChange) {
    const subscriber = { handleIcaStateChange: onChange };
    subscribe(keys, subscriber);
    return () => unsubscribe(keys, subscriber);
  },
  now: () => Date.now(),
  later: run => { setTimeout(run, 0); },
};

export const pageSimulation = new PageSimulation(collabStore);

subscribe('aura.actualPage', {
  handleIcaStateChange: () => pageSimulation.pageShown(pageIdOf(getAuraState()?.actualPage ?? null)),
});
onLiveUpdateApplied(() => pageSimulation.reapply());
// Leaving studio mode must not leave the app in a simulated situation.
registerStudioEditTool(state => {
  if (!state?.studioMode) pageSimulation.restoreAll();
});
