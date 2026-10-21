/// <mls fileReference="_102020_/l2/aura/studio/classPickerDock.ts" enhancement="_blank" />
// Where a DOCKED class picker announces itself to the editor (pageClassPickerPanel, inside the Pages
// plugin).
//
// The editor is created lazily by studioEditTool and the plugin is mounted by the side panel, in no
// particular order and with no reference to each other — so neither can hand itself to the other. This
// module is the meeting point: the panel docks while it is connected, the editor subscribes when it
// attaches, and whoever arrives second still finds the first.
//
// One dock at a time: the last one connected wins, and undocking an element that is not the current
// dock is a no-op (a re-render can connect the new element before the old one disconnects).
//
// It also holds the MODE: the docked panel has a button that sends the editing to the floating panel
// and back (the floating one has the way back). Only one picker is active at a time - the docked one
// while the mode is 'docked' and a dock is on screen, the floating one otherwise.
//
// The mode is REMEMBERED in localStorage: it is a preference of the person, not of the session. Read
// and written defensively - storage can be blocked, and then the mode simply lasts the session.

import type {
  IPickerAdopt,
  IPickerProps,
  IPickerTarget,
} from '/_102020_/l2/aura/studio/classPickerPanel.js';

/** What the editor writes into a picker — the same feed as the floating panel's. */
export interface IClassPickerSink extends HTMLElement {
  target?: IPickerTarget;
  builtClasses: Set<string>;
  dsRoles: string[];
  resolveVar: (cssVar: string) => string;
  jitLive: boolean;
  adopt?: IPickerAdopt;
  adoptPreview: HTMLElement | null;
  /** The Properties tab's answer; absent until the tab is opened. */
  props?: IPickerProps;
}

export type ClassPickerMode = 'docked' | 'floating';

type DockListener = (panel: IClassPickerSink | null) => void;

let docked: IClassPickerSink | null = null;
const MODE_KEY = 'aura.studio.classPickerMode';

function readMode(): ClassPickerMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'floating' ? 'floating' : 'docked';
  } catch {
    return 'docked';
  }
}

function writeMode(next: ClassPickerMode): void {
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch { /* storage blocked: the mode lasts the session */ }
}

let mode: ClassPickerMode = readMode();
const listeners = new Set<DockListener>();

function notify(): void {
  for (const listener of [...listeners]) listener(docked);
}

export function dockClassPicker(panel: IClassPickerSink): void {
  if (docked === panel) return;
  docked = panel;
  notify();
}

export function undockClassPicker(panel: IClassPickerSink): void {
  if (docked !== panel) return;
  docked = null;
  notify();
}

export function getDockedClassPicker(): IClassPickerSink | null {
  return docked;
}

export function getClassPickerMode(): ClassPickerMode {
  return mode;
}

/** Switches where the editing happens. Listeners are told even though the dock itself did not change. */
export function setClassPickerMode(next: ClassPickerMode): void {
  if (mode === next) return;
  mode = next;
  writeMode(next);
  notify();
}

/** Called now with the current dock, and on every change of dock or mode. Returns the unsubscribe. */
export function onDockedClassPickerChange(listener: DockListener): () => void {
  listeners.add(listener);
  listener(docked);
  return () => { listeners.delete(listener); };
}
