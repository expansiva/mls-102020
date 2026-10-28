/// <mls fileReference="_102020_/l2/aura/studio/studioDefsHistory.ts" enhancement="_blank" />
// The ONE door through which a Studio edit reaches the `history` export of the page defs
// (TASK-102020-defs-edit-history). Molecule swaps (serviceGenome), class, text and molecule property edits
// (studioEditor) all come through here, so the defs file is located, read and written in one place.
//
// The defs is written like the page `.ts`: Monaco model + local copy, never the disk (studio-edit-stops-at-local).
//
// GATED BY PROJECT. agentMaterializeL2 and agentDefsL2 do not read the `history` export yet: the materializer refuses
// a page11 that has it (M4_INPUT_DEFS_FORMAT) and agentDefsL2 rebuilds the defs and drops it. Until those two
// agents take it, only the projects listed below write it.

import {
  defsHistoryKey, findDefsHistory, indexOfDefsHistory, recordDefsHistory, restoreDefsHistory, splitDefsHistory, withDefsHistory,
  type DefsHistoryEntry,
} from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import { persistLocalEdit, targetForFile } from '/_102020_/l2/aura/studio/studioEditTarget.js';

/**
 * Projects whose Studio edits are written to the defs history. Empty = off everywhere.
 * 102047 is the smoke project (27/10/2026). Remove the list once both agents read the export.
 */
export const DEFS_HISTORY_PROJECTS: readonly number[] = [102047];

export interface IDefsHistoryPage {
  project: number;
  shortName: string;
  folder: string;
}

/** What one recorded edit did to one target: its undo puts `before` back, its redo `after`. */
export interface IDefsHistoryMark {
  page: IDefsHistoryPage;
  key: string;
  before: DefsHistoryEntry | null;
  /** Where `before` sat in the list (-1 = nowhere): an edit moves its entry to the end, an undo moves it back. */
  beforeIndex: number;
  after: DefsHistoryEntry | null;
}

/** Only a generated page folder has a page defs (`<module>/web/<device>/page<NN>`). */
const PAGE_FOLDER = /^[a-z][A-Za-z0-9]*\/web\/(?:desktop|mobile)\/page\d\d$/u;
/** How far up a path is spelled when the element is in no organism: a hint, not an address. */
const MAX_PATH_STEPS = 8;

export function defsHistoryEnabled(page: IDefsHistoryPage | null | undefined): page is IDefsHistoryPage {
  return Boolean(page && DEFS_HISTORY_PROJECTS.includes(page.project) && PAGE_FOLDER.test(page.folder));
}

/** The minimal element shape the two DOM readers below need — what makes them testable without a DOM. */
export interface IHistoryElement {
  tagName: string;
  parentElement: IHistoryElement | null;
  previousElementSibling: IHistoryElement | null;
  getAttribute(name: string): string | null;
}

/** `data-organism-id` of the closest organism wrapper above (or on) the element; null outside every organism. */
export function organismOf(el: IHistoryElement): string | null {
  for (let node: IHistoryElement | null = el; node; node = node.parentElement) {
    const id = node.getAttribute('data-organism-id');
    if (id) return id;
  }
  return null;
}

/**
 * Where the element sits inside its organism, as tags: `div>button#1` = the second button of the div. The wrapper
 * itself is left out; `#n` counts earlier siblings with the same tag and is omitted at 0.
 */
export function pathWithinOrganism(el: IHistoryElement): string {
  const steps: string[] = [];
  for (let node: IHistoryElement | null = el; node && steps.length < MAX_PATH_STEPS; node = node.parentElement) {
    if (node !== el && node.getAttribute('data-organism-id')) break;
    const tag = node.tagName.toLowerCase();
    let index = 0;
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (sibling.tagName.toLowerCase() === tag) index++;
    }
    steps.unshift(index ? `${tag}#${index}` : tag);
    if (node.getAttribute('data-organism-id')) break;
  }
  return steps.join('>');
}

/**
 * Records one edit in the page defs. Returns what it did (for undo/redo), or null when nothing was written: the
 * project is not enabled, the folder has no defs, the edit changed nothing, or the defs history does not parse —
 * the last one is warned about and left alone, never overwritten.
 */
export async function recordEditInDefs(page: IDefsHistoryPage | null | undefined, edit: DefsHistoryEntry): Promise<IDefsHistoryMark | null> {
  if (!defsHistoryEnabled(page)) return null;
  const opened = await openDefs(page);
  if (!opened) return null;
  const { history } = opened.split;
  // A swap of a molecule that was already swapped continues ITS entry: the tag in the target changed with the
  // first swap, and the original one is what the entry is about.
  const continued = edit.kind === 'molecule'
    ? history.find(entry => entry.kind === 'molecule' && entry.organism === edit.organism && entry.scope === edit.scope && entry.to === edit.from)
    : undefined;
  const entry = continued ? { ...edit, target: continued.target } as DefsHistoryEntry : edit;
  const key = defsHistoryKey(entry);
  const before = findDefsHistory(history, key);
  const beforeIndex = indexOfDefsHistory(history, key);
  const next = recordDefsHistory(history, entry);
  const after = findDefsHistory(next, key);
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  await writeDefs(opened, next);
  return { page, key, before, beforeIndex, after };
}

/** The undo of an edit: its target goes back to `mark.before`, at the place it had in the list. */
export async function undoEditInDefs(mark: IDefsHistoryMark): Promise<boolean> {
  return restoreEditInDefs(mark, mark.before, mark.beforeIndex);
}

/** The redo of an edit: its target goes back to `mark.after`, last in the list, as the edit itself left it. */
export async function redoEditInDefs(mark: IDefsHistoryMark): Promise<boolean> {
  return restoreEditInDefs(mark, mark.after, -1);
}

async function restoreEditInDefs(mark: IDefsHistoryMark, entry: DefsHistoryEntry | null, at: number): Promise<boolean> {
  if (!defsHistoryEnabled(mark.page)) return false;
  const opened = await openDefs(mark.page);
  if (!opened) return false;
  await writeDefs(opened, restoreDefsHistory(opened.split.history, mark.key, entry, at));
  return true;
}

interface IOpenedDefs {
  storFile: mls.stor.IFileInfo;
  model: mls.editor.IModelBase;
  source: string;
  split: ReturnType<typeof splitDefsHistory>;
}

async function openDefs(page: IDefsHistoryPage): Promise<IOpenedDefs | null> {
  const storFile = mls.stor.files[mls.stor.getKeyToFiles(page.project, 2, page.shortName, page.folder, '.defs.ts')];
  if (!storFile) {
    console.debug(`[studioDefsHistory] no defs for ${page.folder}/${page.shortName}: the edit is not recorded`);
    return null;
  }
  try {
    // The model, not the file: it holds the local copy, which is where an earlier unsaved edit already is.
    const model = await storFile.getOrCreateModel();
    const source = model.model.getValue();
    return { storFile, model, source, split: splitDefsHistory(source) };
  } catch (err) {
    console.warn(`[studioDefsHistory] ${page.folder}/${page.shortName}.defs.ts left untouched:`, err);
    return null;
  }
}

async function writeDefs(opened: IOpenedDefs, entries: DefsHistoryEntry[]): Promise<void> {
  const newSource = withDefsHistory(opened.source, entries);
  if (newSource === opened.source) return;
  const { model } = opened.model;
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text: newSource }], () => null);
  await persistLocalEdit(targetForFile(opened.storFile, opened.model), newSource);
}
