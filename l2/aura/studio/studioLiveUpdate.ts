/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdate.ts" enhancement="_blank" />
// How an applied edit reaches the RUNNING app (TASK-102033-app-como-preview, fase 3.5).
//
// THE PROBLEM THIS EXISTS FOR
// A custom element tag can be defined once and never redefined or removed — there is no API for it.
// The text edit itself shows up immediately (the contenteditable span leaves the new text in the
// DOM), but navigating away and back makes the shell do `document.createElement(tag)`, which builds
// an instance of the class registered at boot: the old text is back. The preview never had this
// problem because it throws the whole realm away — every createPreview builds a NEW iframe, with a
// fresh custom element registry. The app has a single realm.
//
// WHY A PLUGGABLE MODE
// There is more than one defensible answer (patch the registered class, reload the page, do
// nothing and let the user reload), each with different fidelity/cost, and the right one depends on
// what was edited. So the policy lives behind this contract: one function to call, one file per mode.
//
// Switch at runtime from devtools:
//   studioLiveUpdate.list()          -> available modes
//   studioLiveUpdate.set('reload')   -> persisted in localStorage
//   studioLiveUpdate.get()

import type { IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

export interface ILiveUpdateContext {
  /** File that was edited — often the SHARED base class, not the page. */
  edited: IStudioEditTarget;
  /** The mounted page, whose tag is the one registered in the custom element registry. */
  page: IStudioEditTarget;
  /** Tag currently mounted in the region host. */
  pageTag: string;
}

export interface ILiveUpdateResult {
  ok: boolean;
  /** Short sentence for the editor status strip. */
  message: string;
}

export interface ILiveUpdateMode {
  readonly name: LiveUpdateModeName;
  /** One-line description, shown by studioLiveUpdate.list(). */
  readonly description: string;
  apply(ctx: ILiveUpdateContext): Promise<ILiveUpdateResult>;
}

export type LiveUpdateModeName = 'hotSwap' | 'reload' | 'off';

const STORAGE_KEY = 'studioLiveUpdateMode';

/**
 * OFF for now, on purpose (2026-09-02).
 *
 * The hot swap is inconsistent and throwing in the running app, and an edit that reports "applied
 * live" while the screen disagrees is worse than one that says nothing happened. The edit itself is
 * unaffected: the class/text is already on the element, the file is written and the module is
 * recompiled — what is suspended is only re-registering the compiled class in the custom element
 * registry, which is what a remount would have needed.
 *
 * To put it back: `DEFAULT_MODE = 'hotSwap'` and drop `SUSPENDED_MODES`.
 */
const DEFAULT_MODE: LiveUpdateModeName = 'off';

/**
 * Modes a PERSISTED choice cannot resurrect.
 *
 * `getLiveUpdateMode` reads localStorage first, so anyone who ever ran
 * `studioLiveUpdate.set('hotSwap')` would keep the broken behaviour across reloads — which is not
 * what "disabled for now" means. Switching it on from devtools in the current session still works
 * (setLiveUpdateMode assigns directly); only the stored value is ignored.
 */
const SUSPENDED_MODES = new Set<LiveUpdateModeName>(['hotSwap']);

/**
 * Does nothing but tell the truth — the baseline. Inline because nobody needs to edit it; the modes
 * that carry real policy live in their own files.
 */
const offMode: ILiveUpdateMode = {
  name: 'off',
  // English: `studioLiveUpdate.list()` is a devtools listing, not panel copy.
  description: 'does nothing; the change shows on the next reload',
  async apply() {
    return { ok: true, message: t('live.off') };
  },
};

const LOADERS: Record<LiveUpdateModeName, () => Promise<ILiveUpdateMode>> = {
  hotSwap: async () => (await import('/_102020_/l2/aura/studio/studioLiveUpdateHotSwap.js')).hotSwapMode,
  reload: async () => (await import('/_102020_/l2/aura/studio/studioLiveUpdateReload.js')).reloadMode,
  off: async () => offMode,
};

export function listLiveUpdateModes(): LiveUpdateModeName[] {
  return Object.keys(LOADERS) as LiveUpdateModeName[];
}

export function isLiveUpdateMode(name: string): name is LiveUpdateModeName {
  return Object.prototype.hasOwnProperty.call(LOADERS, name);
}

let activeMode: LiveUpdateModeName | undefined;

/**
 * Which mode a stored choice resolves to — the suspension rule, on its own so it can be tested.
 *
 * Pure because `getLiveUpdateMode` memoises: once it has answered, no stored value is read again, so
 * a test of the getter can only ever see the first answer.
 */
export function resolveStoredMode(stored: string | null): LiveUpdateModeName {
  if (!stored || !isLiveUpdateMode(stored) || SUSPENDED_MODES.has(stored)) return DEFAULT_MODE;
  return stored;
}

export function getLiveUpdateMode(): LiveUpdateModeName {
  if (activeMode) return activeMode;
  // Read once, lazily: the `reload` mode reloads the page, so a choice that did not survive the
  // reload would silently bounce back to the default.
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode / blocked storage — the default is fine.
  }
  activeMode = resolveStoredMode(stored);
  if (stored && activeMode !== stored) {
    console.warn(`[studioLiveUpdate] stored mode "${stored}" is not usable; using "${activeMode}"`);
  }
  return activeMode;
}

export function setLiveUpdateMode(name: string): LiveUpdateModeName {
  if (!isLiveUpdateMode(name)) {
    throw new Error(`invalid mode "${name}". Valid: ${listLiveUpdateModes().join(', ')}`);
  }
  activeMode = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch { /* not fatal */ }
  return activeMode;
}

async function applyLiveUpdateNow(ctx: ILiveUpdateContext): Promise<ILiveUpdateResult> {
  const name = getLiveUpdateMode();
  try {
    const mode = await LOADERS[name]();
    return await mode.apply(ctx);
  } catch (err) {
    return { ok: false, message: t('live.failed', { mode: name, error: (err as Error).message }) };
  }
}

/** Chain used to serialize `applyLiveUpdate` calls — never rejects, so one caller's failure never
 *  breaks the chain for the callers queued behind it (see `serialize`). */
let queue: Promise<void> = Promise.resolve();

/**
 * Runs `fn` after every previously queued call has settled, one at a time.
 *
 * Exported (not just inlined into `applyLiveUpdate`) so a test can prove the serialization itself,
 * with fake work standing in for a real live-update mode.
 */
export function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Applies an already-persisted edit to the running app, using the active mode.
 *
 * Never throws: a failure here means the edit is in the source but the screen may show the old text
 * on a remount — worth reporting, never worth breaking the edit flow over.
 *
 * SERIALIZED: there are three independent call sites (two in studioEditor.ts, one in the watcher)
 * and `import()` inside hotSwap is async, so two calls used to be able to interleave — see
 * `withDefineGuard` in studioLiveUpdateHotSwap.ts for what that raced. Serializing is safe for every
 * mode: `reload` throws the page away and `off` is instantaneous, so neither has anything to overlap.
 */
export function applyLiveUpdate(ctx: ILiveUpdateContext): Promise<ILiveUpdateResult> {
  return serialize(() => applyLiveUpdateNow(ctx));
}

// Devtools handle. Assigned at import time so it exists as soon as anything armed the editor.
(window as unknown as { studioLiveUpdate?: unknown }).studioLiveUpdate = {
  get: getLiveUpdateMode,
  set: setLiveUpdateMode,
  list: listLiveUpdateModes,
};
