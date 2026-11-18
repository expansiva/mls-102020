/// <mls fileReference="_102020_/l2/aura/studio/pageTreeDock.ts" enhancement="_blank" />
// Where the page tree panel (pageTreePanel, inside the Pages plugin) and the editor find each other.
//
// The same meeting point as classPickerDock, for the same reason: the editor is created lazily by
// studioEditTool and the plugin is mounted by the side panel, in no particular order and with no
// reference to each other. The panel docks while it is connected, the editor subscribes when it
// attaches, and whoever arrives second still finds the first. One dock at a time; the last one wins.
//
// NOT collabState: the tree is rebuilt on every remount and every edit, and the state keeps a log of
// every value it is handed — a page-sized object per keystroke would fill it with stale pages.

import type { IPageTree } from '/_102020_/l2/aura/studio/pageTreeCore.js';

/** What the editor writes into the panel. */
export interface IPageTreeSink extends HTMLElement {
  /** The page on screen; null while the editor is off or there is no page. */
  tree: IPageTree | null;
  /** The node of the current selection, or null. */
  selectedId: number | null;
}

/** Events the panel sends, and their details. */
export const TREE_SELECT = 'page-tree-select';
export const TREE_HOVER = 'page-tree-hover';
export const TREE_MOVE = 'page-tree-move';

export interface ITreeMoveDetail {
  moved: number;
  target: number;
  side: 'before' | 'after';
}

type DockListener = (panel: IPageTreeSink | null) => void;

let docked: IPageTreeSink | null = null;
const listeners = new Set<DockListener>();

function notify(): void {
  for (const listener of [...listeners]) listener(docked);
}

export function dockPageTree(panel: IPageTreeSink): void {
  if (docked === panel) return;
  docked = panel;
  notify();
}

export function undockPageTree(panel: IPageTreeSink): void {
  if (docked !== panel) return;
  docked = null;
  notify();
}

export function getDockedPageTree(): IPageTreeSink | null {
  return docked;
}

/** Called now with the current dock, and on every change. Returns the unsubscribe. */
export function onPageTreeDockChange(listener: DockListener): () => void {
  listeners.add(listener);
  listener(docked);
  return () => { listeners.delete(listener); };
}
