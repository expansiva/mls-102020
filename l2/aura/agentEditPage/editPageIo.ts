/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPageIo.ts" enhancement="_blank"/>

// Studio I/O of agentEditPage (TASK-102020-agent-edit-page).
//
// The page `.ts` is written EXACTLY like the Studio's own editor writes it (studioEditor.commitSource, the path the
// class picker and "move" use): the target resolved from the running app (resolveEditTarget, a libModel.createModel
// model), the text pushed into that model, the local copy (persistLocalEdit), then compileAndApplyLiveUpdate, which
// compiles into the service worker cache and swaps the screen. Three home-made variants failed on 29/10/2026 (the
// model reloaded from the project, the screen not refreshed, the JS not in the cache); none is left here.
// The defs history goes through the Studio's door (studioDefsHistory). Nothing reaches the disk before a save.

import { formatCompilerDiagnostic } from '/_102035_/l2/solution/studioCompile.js';
import { writeJson } from '/_102035_/l2/solution/fs.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { splitDefsHistory, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import { defsHistoryEnabled, updateDefsHistory } from '/_102020_/l2/aura/studio/studioDefsHistory.js';
import {
  compileAfterEdit, findPageElement, persistLocalEdit, resolveEditTarget, targetForFile, type IStudioEditTarget,
} from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { compileAndApplyLiveUpdate } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';
import { currentEditHost } from '/_102033_/l2/cbe/studioEditSlot.js';
import { resolveStructuralAnchor, scanTemplateTree, type IDomPathStep } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import {
  catalogueLocales, designSystemColorTokens, editPageFolder, methodAtOffset, moleculeOfElement, organismAnchors, pageOutline, readPageDefinition, slotInDocs,
  type EditElement, type EditFocus, type EditPageEntry, type MethodOutline, type PageDefinitionDigest,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';

export interface EditPageContext {
  folder: string;
  label: string;
  /** The page `.ts` text the agent starts from: the editor model (an unsaved Studio edit included). */
  source: string;
  definition: PageDefinitionDigest;
  /** False when the folder has no `.defs.ts` (or it does not parse): the organisms come from the page anchors. */
  hasDefs: boolean;
  history: DefsHistoryEntry[];
  outline: MethodOutline[];
  organisms: string[];
  sharedDeclaration: string;
  tokens: string[];
  locales: string[];
  /** The element the person selected, located in the source when its anchor resolves; null without one. */
  selected: SelectedElementContext | null;
}

export interface SelectedElementContext {
  element: EditElement;
  /** The element in the source: its markup and the method holding it; null = identified by tag/organism/class only. */
  located: { method: string | null; snippet: string; renders: number } | null;
  focus: EditFocus;
  /** The catalog molecule selected (or holding the selection), with what its documentation says it accepts. */
  molecule: { tag: string; slot: string | null; skill: string; usage: string } | null;
}

/** Longest markup excerpt sent: a selected organism wrapper can be a whole page section. */
const MAX_SNIPPET = 4000;

function storFileOf(project: number, folder: string, shortName: string, extension: string): mls.stor.IFileInfo | null {
  const file = mls.stor.files[mls.stor.getKeyToFiles(project, 2, shortName, folder, extension)];
  return file && file.status !== 'deleted' ? file : null;
}

/** The editor model of a file, through the same libModel.createModel the Studio editor uses (no compile here). */
async function editorModel(project: number, folder: string, shortName: string, extension: string): Promise<IStudioEditTarget | null> {
  const storFile = storFileOf(project, folder, shortName, extension);
  if (!storFile) return null;
  const model = await createModel(storFile, false);
  return model ? targetForFile(storFile, model) : null;
}

/** A plain text file (the shared declaration, the design system): local copy first, then the stor content. */
async function readText(project: number, folder: string, shortName: string, extension: string): Promise<string> {
  const file = storFileOf(project, folder, shortName, extension) as (mls.stor.IFileInfo & { getValueInfo?: () => Promise<{ content?: unknown } | undefined> }) | null;
  if (!file) return '';
  try {
    const local = await file.getValueInfo?.();
    if (typeof local?.content === 'string') return local.content;
  } catch { /* stor content next */ }
  try {
    const content = await file.getContent();
    return typeof content === 'string' ? content : '';
  } catch {
    return '';
  }
}

/** Everything the gate and the patch read. Throws `EDIT_PAGE_NOT_FOUND` when the page `.ts` is not in the project. */
export async function loadEditPageContext(project: number, entry: Pick<EditPageEntry, 'module' | 'page' | 'device' | 'genome'> & { element?: EditElement | null }): Promise<EditPageContext> {
  const folder = editPageFolder(entry);
  const page = await editorModel(project, folder, entry.page, '.ts');
  if (!page) throw new Error(`EDIT_PAGE_NOT_FOUND: _${project}_/l2/${folder}/${entry.page}.ts`);
  const source = page.model.model.getValue();
  const anchors = organismAnchors(source);
  let definition: PageDefinitionDigest | null = null;
  let history: DefsHistoryEntry[] = [];
  const defs = await editorModel(project, folder, entry.page, '.defs.ts');
  if (defs) {
    try {
      const split = splitDefsHistory(defs.model.model.getValue());
      history = split.history;
      definition = readPageDefinition(split.base);
    } catch (error) {
      console.warn(`[agentEditPage] ${folder}/${entry.page}.defs.ts history left aside:`, error);
    }
  }
  const digest = definition ?? { intent: '', organisms: anchors.map(id => ({ id, kind: '', text: '', section: '', purpose: '' })) };
  return {
    folder,
    label: `${entry.module}/${entry.page} (${entry.device}, ${entry.genome})`,
    source,
    definition: digest,
    hasDefs: Boolean(definition),
    history,
    outline: pageOutline(source),
    // The defs organisms AND the anchors found: a page without wrappers still has the organisms its defs names.
    organisms: [...new Set([...digest.organisms.map(item => item.id), ...anchors])],
    sharedDeclaration: await readText(project, `${entry.module}/web/shared`, `${entry.page}Dts`, '.txt'),
    tokens: designSystemColorTokens(await readText(project, '', 'designSystem', '.ts')),
    locales: catalogueLocales(source),
    selected: entry.element ? await selectedElementContext(source, entry.element, new Set([...digest.organisms.map(item => item.id), ...anchors])) : null,
  };
}

/**
 * The selected element on this page: located by its structural anchor (the class picker's own resolution,
 * studioClassEdit), and, for a catalog molecule, its skill and its group's usage contract read as data (the files
 * agentMaterializeL2 pages50 reads; nothing of that agent is imported). An organism this page does not have makes
 * the selection worthless here: it is ignored.
 */
async function selectedElementContext(source: string, element: EditElement, organisms: ReadonlySet<string>): Promise<SelectedElementContext | null> {
  if (element.organism !== null && !organisms.has(element.organism)) {
    console.warn(`[agentEditPage] selection ignored: organism ${element.organism} is not on this page`);
    return null;
  }
  let located: SelectedElementContext['located'] = null;
  if (element.anchorPath) {
    try {
      const anchor = resolveStructuralAnchor(scanTemplateTree(source), element.anchorPath as IDomPathStep[]);
      if (anchor.ok) {
        const snippet = source.slice(anchor.element.openStart, anchor.element.end);
        located = {
          method: methodAtOffset(source, anchor.element.openStart),
          snippet: snippet.length > MAX_SNIPPET ? `${snippet.slice(0, MAX_SNIPPET)}\n…(cut)` : snippet,
          renders: anchor.renders,
        };
      }
    } catch (error) {
      console.warn('[agentEditPage] selection not located:', error);
    }
  }
  const found = moleculeOfElement(element);
  let molecule: SelectedElementContext['molecule'] = null;
  if (found) {
    const folder = `molecules/${found.group}`;
    const index = await readText(102040, folder, 'index', '.defs.ts');
    const ref = /usageContract\s*=\s*'\/_(\d+)_\/l2\/([^']+)\/([^'/]+)'/u.exec(index);
    const usage = ref ? await readText(Number(ref[1]), ref[2], ref[3], '.ts') : '';
    const defs = await readText(102040, folder, found.name, '.defs.ts');
    const skill = /export const skill = `([\s\S]*?)`;/u.exec(defs)?.[1]?.trim() ?? '';
    molecule = { tag: found.tag, slot: slotInDocs(found.slotCandidate, `${skill}\n${usage}`), skill, usage };
  }
  return {
    element,
    located,
    focus: { organism: element.organism, method: located?.method ?? null, molecule: molecule?.tag ?? null },
    molecule,
  };
}

export interface CommitResult {
  /** Compiler diagnostics of the written text; empty = compiled clean. */
  errors: string[];
  /** null = the running app shows the new text; else why it does not (a reload shows it). */
  live: string | null;
}

/**
 * Writes the page `.ts` exactly as studioEditor.commitSource does (class picker, move): model, local copy, then
 * compileAndApplyLiveUpdate. When the page is the one on screen, the target is the one the running app resolves;
 * otherwise the editor model of the file, compiled so a reload or a navigation serves the new build.
 */
export async function commitPageSource(project: number, folder: string, shortName: string, text: string): Promise<CommitResult> {
  const host = currentEditHost()?.host ?? null;
  const pageEl = host ? findPageElement(host) : null;
  const resolved = host ? await resolveEditTarget(host) : null;
  const mounted = resolved?.ok ? resolved.target : null;
  const onScreen = Boolean(pageEl && mounted && mounted.project === project && mounted.folder === folder && mounted.shortName === shortName);
  const file = onScreen ? mounted! : await editorModel(project, folder, shortName, '.ts');
  if (!file) throw new Error(`EDIT_PAGE_NOT_FOUND: _${project}_/l2/${folder}/${shortName}.ts`);

  const model = file.model.model;
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  // Straight to the local store, ahead of libModel's own debounced listener (as commitSource does).
  await persistLocalEdit(file, text);

  let live: string | null;
  if (onScreen) {
    const result = await compileAndApplyLiveUpdate({ edited: file, page: mounted!, pageTag: pageEl!.tagName.toLowerCase() });
    live = result.ok ? null : `${result.message} — ${await compileDiagnosis(file)}`;
  } else {
    await compileAfterEdit(file);
    live = host ? 'another page is on screen' : 'no running app';
  }
  const errors: unknown[] = (file.model as mls.editor.IModelTS).compilerResults?.errors ?? [];
  return { errors: errors.map(formatCompilerDiagnostic), live };
}

/**
 * What the last compile of `file` left, for a live update that refused: the remount reads the JS of
 * `compilerResults.cacheVersion` from the service worker, and mls.js `saveCacheAfterCompile` gives up silently when
 * there is no JS (emit skipped). The trace says which: `emit files:N` and `cache saved: <url>`.
 */
async function compileDiagnosis(file: IStudioEditTarget): Promise<string> {
  const results = (file.model as mls.editor.IModelTS).compilerResults;
  if (!results) return 'no compiler results';
  let cached = 'unknown';
  try {
    cached = results.cacheVersion && await mls.stor.cache.getURL(file.project, file.folder, file.shortName, '.js', results.cacheVersion) ? 'yes' : 'no';
  } catch (error) {
    cached = `lookup failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  return `version ${results.cacheVersion || '(none)'}, js ${results.prodJS?.length ?? 0} chars, errors ${results.errors?.length ?? 0}, `
    + `in cache now: ${cached}, same model as the app: ${file.model === (mls.editor.getModels(file.project, file.shortName, file.folder, 2)?.ts ?? null)}, `
    + `trace: ${(results.trace ?? []).slice(-6).join(' / ')}`;
}

/** Records the applied requests in the page defs history (enabled projects only). */
export async function recordInDefsHistory(
  project: number,
  folder: string,
  page: string,
  update: (history: DefsHistoryEntry[]) => DefsHistoryEntry[],
): Promise<'written' | 'unchanged' | 'disabled' | 'unavailable'> {
  const target = { project, shortName: page, folder };
  if (!defsHistoryEnabled(target)) return 'disabled';
  return updateDefsHistory(target, update);
}

/** One JSON per run in `<module>/pipeline/agentEditPage/`: request, plan, what changed, the file before. */
export async function writeEditPageTrace(project: number, entry: Pick<EditPageEntry, 'module' | 'page' | 'device' | 'genome'>, stamp: string, trace: unknown): Promise<string> {
  const unit = `${entry.page}${entry.device === 'mobile' ? 'Mobile' : 'Desktop'}${entry.genome === 'page11' ? '' : entry.genome.replace(/^p/u, 'P')}`;
  return writeJson({ project, level: 2, folder: `${entry.module}/pipeline/agentEditPage`, shortName: `${unit}${stamp}`, extension: '.json' }, trace);
}

/** `20261029T140501`: a shortName-safe timestamp. */
export function editPageStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/gu, '').replace(/\.\d+Z$/u, '');
}
