/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateRemount.ts" enhancement="_blank" />
// Live-update mode: swap the IMPLEMENTATION behind the registered stand-in, then build the element
// again (TASK-102020-live-update-stand-in).
//
// WHAT MAKES IT DIFFERENT FROM hotSwap
// hotSwap patches the class that is already registered — it can only ever reach the prototype, so
// `#private` fields (refused outright), the constructor body, `static styles` and members DELETED in
// the new version all stay behind, and the result is PARTIALLY applied: the screen disagrees with the
// source and nobody can tell which of the two is right.
//
// Here nothing is patched. `elementSwapRegistry` (mls-102033/l2/shared) registered a STAND-IN for
// every tag at boot, and the stand-in redirects construction to whatever implementation is current.
// Pointing it at the new class and calling `document.createElement(tag)` runs THE NEW CONSTRUCTOR
// for real, so the instance is a genuine instance of the new version — fields, private brands,
// styles, everything.
//
// WHY REMOUNTING IS PART OF THE MODE AND NOT AN EXTRA
// The moment the implementation is swapped, the nodes on screen are straddling two versions: their
// own fields and private brands came from the OLD constructor while their prototype chain now
// reaches the NEW code. A `#private` read from a new method would throw on such a node. So the swap
// and the remount are one operation, not two.
//
// WHAT IS COPIED OVER, AND WHAT IS LOST (said out loud, because the user sees it happen)
// Attributes and the DECLARED reactive properties move to the new node. Anything else — scroll
// position, an open dialog, text typed and not submitted, a molecule's internal state — is gone.
// That is the honest price of building the element again, and the status message says so.
//
// WHAT IT REFUSES
//  - a tag that was never armed (this session never went through a studio boot): the only fix is one
//    reload, and claiming "applied" would be a lie;
//  - an edit whose reimported page still registers NO custom element. A shared base used to fail
//    this test on its own file. The page is now loaded from the preview graph, so the refusal stays
//    only when that page import also registers nothing.
//
// WHAT IS REMOUNTED
//  Only the page node inside the preview tab div. The rest of the document (header, other tabs)
//  stays put.

import type { ILiveUpdateContext, ILiveUpdateMode, ILiveUpdateResult } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';
import type { IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import {
  captureDefines,
  isElementSwapArmed,
  markRebuiltByStudio,
  swapElementImpl,
} from '/_102033_/l2/shared/elementSwapRegistry.js';
import { registerPreviewTabsUpdate } from '/_102033_/l2/cbe/studioEditSlot.js';
import { activeDraft } from '/_102033_/l2/cbe/studioDraft.js';
import {
  previewTabSlots,
  replaceTabPage,
  type PreviewTabSlot,
} from '/_102033_/l2/shared/moduleTab.js';
import {
  buildPreviewGraph,
  previewGraphRequest,
  previewModule,
  type PreviewModuleRecord,
  type PreviewModuleUrl,
} from '/_102033_/l2/shared/previewGraph.js';

/** Lit's static surface used for the carry-over. */
interface ILitLikeConstructor extends CustomElementConstructor {
  elementProperties?: Map<PropertyKey, unknown>;
}

/** The two properties the shell hands a region element AS PROPERTIES, not attributes — see
 *  `mountRegion` in mls-102033/l2/shared/shell.ts. A content page does not declare them reactive, so
 *  they would not survive the carry-over on their own, and the shell only reassigns them on its next
 *  render. Named explicitly because this is a contract, not a guess. */
const SHELL_HANDOFF_PROPS = ['bootConfig', 'regionProps'] as const;

interface IFreshModuleUrl {
  url: string | null;
  /** Why there is no URL, for the status strip. */
  reason: string;
}

/**
 * URL of the just-compiled JS in the local cache, versioned by `cacheVersion`.
 *
 * COPIED from studioLiveUpdateHotSwap, deliberately and not imported: that file is frozen while this
 * mode is proven in real use (the task's regression guard is that it ends with no diff at all), and a
 * new import into it would be a diff. The duplication goes away with the hotSwap itself.
 *
 * Null with a reason rather than throwing: a TypeScript error in the edited file is a normal outcome
 * here and has to read as one.
 */
async function freshModuleUrl(target: IStudioEditTarget): Promise<IFreshModuleUrl> {
  const model = target.model as mls.editor.IModelTS;
  const results = model.compilerResults;
  if (!results) return { url: null, reason: t('live.notCompiled') };
  if (results.errors && results.errors.length > 0) {
    return { url: null, reason: t('live.tsErrors', { count: results.errors.length }) };
  }
  if (!results.cacheVersion) return { url: null, reason: t('live.noCacheVersion') };

  const { project, folder, shortName } = target.storFile;
  const url = await mls.stor.cache.getURL(project, folder, shortName, '.js', results.cacheVersion);
  if (url) return { url, reason: '' };
  // In studio mode with a draft the service worker stores the JS under the draft (`inicio.js~team-102047?v=…`, seen
  // 29/10/2026 in the compile trace), and the plain `getURL` above does not find it: every remount answered "not in
  // the local cache" (the class picker hid it, its edit is already in the DOM). `addIfNeed` returns the URL the worker
  // actually serves for this version, draft included; for a version already stored it only answers where it is.
  if (results.prodJS && typeof mls.stor.cache.addIfNeed === 'function') {
    const served = await mls.stor.cache.addIfNeed({ project, folder, shortName, version: results.cacheVersion, content: results.prodJS, extension: '.js' });
    if (served) return { url: served, reason: '' };
  }
  return { url: null, reason: t('live.notInCache') };
}

/**
 * Copies what can be copied from the old node to the new one.
 *
 * Reads the property list from the NEW implementation: a property added by the edit has no value to
 * carry (the old node never had it) and one deleted by the edit must not be forced back on. Values
 * that are `undefined` are skipped so the new constructor's own default survives.
 */
export function carryOver(from: HTMLElement, to: HTMLElement, impl: CustomElementConstructor): void {
  // Before replaceWith: connectedCallback of `to` runs on insert and must already see the mark.
  markRebuiltByStudio(to);
  for (const attribute of Array.from(from.attributes)) {
    to.setAttribute(attribute.name, attribute.value);
  }

  const declared = (impl as ILitLikeConstructor).elementProperties;
  const source = from as unknown as Record<string, unknown>;
  const destination = to as unknown as Record<string, unknown>;
  if (declared) {
    for (const key of declared.keys()) {
      if (typeof key !== 'string') continue;
      const value = source[key];
      if (value === undefined) continue;
      destination[key] = value;
    }
  }
  for (const key of SHELL_HANDOFF_PROPS) {
    if (source[key] !== undefined) destination[key] = source[key];
  }
}

/**
 * Builds every element of `tag` again, in place.
 *
 * ONLY THE PAGE ELEMENT IS EVER REPLACED, and that is a correctness rule, not a shortcut: the shell
 * mounts the page imperatively (`host.replaceChildren(element)` in mountRegion), so its node belongs
 * to nobody's template. A node lit-html committed — every molecule inside the page — is tracked by a
 * part in the parent's template, and swapping it out from under lit breaks the parent's next update.
 * Rebuilding the page rebuilds its whole subtree anyway, and each molecule inside comes back through
 * ITS OWN stand-in, already on the new version. That is the decisive gain over minting a new tag per
 * version, where a nested molecule could never be reached.
 */
function remountAll(tag: string): number {
  const impl = customElements.get(tag);
  if (!impl) return 0;
  let count = 0;
  for (const element of Array.from(document.querySelectorAll(tag))) {
    const fresh = document.createElement(tag);
    carryOver(element as HTMLElement, fresh, impl);
    element.replaceWith(fresh);
    count += 1;
  }
  return count;
}

function remountTab(div: HTMLElement, tag: string): void {
  replaceTabPage(div, tag, (previous, next) => {
    if (!previous) return;
    const impl = customElements.get(tag);
    if (!impl) return;
    carryOver(previous, next, impl);
  });
}

function previewFail(message: string): never {
  console.error(`[remount] ${message}`);
  throw new Error(`[remount] ${message}`);
}

function importedSpecifiers(source: string): string[] {
  const found: string[] = [];
  const pattern = /\b(?:from|import)\s*(?:\(\s*)?(['"])([^'"]+)\1/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match) {
    found.push(match[2]);
    match = pattern.exec(source);
  }
  return found;
}

function rewrittenDataUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source).replaceAll('\'', '%27')}`;
}

/** A bare package name (`lit`, `@scope/pkg`). A path or a URL is not one. */
function isBarePackage(spec: string): boolean {
  return spec.length > 0 && !spec.startsWith('/') && !spec.startsWith('.') && !/^[a-z][a-z0-9+.-]*:/iu.test(spec);
}

/**
 * A `data:` module has no hierarchical base, so a leftover `/…` specifier does not resolve.
 * The absolute URL is the same module the document already loaded (`new URL(spec, origin)`).
 */
function absoluteSpecifier(spec: string, origin: string | undefined): string {
  if (!origin) previewFail(`origin is required to resolve ${spec}`);
  try {
    return new URL(spec, origin).href;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    previewFail(`cannot resolve ${spec} against ${origin}: ${detail}`);
  }
}

/** What dynamic import receives: an absolute URL, or a bare package name. */
function assertDeliverable(source: string): void {
  for (const spec of importedSpecifiers(source)) {
    if (isBarePackage(spec)) continue;
    try {
      new URL(spec);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      previewFail(`specifier is not absolute: ${spec} (${detail})`);
    }
  }
}

async function loadRewritten(
  key: string,
  owned: ReadonlyMap<string, PreviewModuleUrl>,
  cache: Map<string, string>,
  stack: string[],
  origin: string | undefined,
): Promise<string> {
  const cached = cache.get(key);
  if (cached) return cached;
  if (stack.includes(key)) previewFail(`circular import at ${key}`);
  const record = owned.get(key);
  if (!record) {
    const url = key.startsWith('/') ? absoluteSpecifier(key, origin) : key;
    cache.set(key, url);
    return url;
  }
  stack.push(key);
  const deps = new Map<string, string>();
  for (const specifier of importedSpecifiers(record.source)) {
    deps.set(specifier, await loadRewritten(specifier, owned, cache, stack, origin));
  }
  stack.pop();
  let cursor = 0;
  let rewritten = '';
  const pattern = /\b(?:from|import)\s*(?:\(\s*)?(['"])([^'"]+)\1/g;
  let match: RegExpExecArray | null = pattern.exec(record.source);
  while (match) {
    const specifier = match[2];
    const mapped = deps.get(specifier);
    if (mapped === undefined) previewFail(`missing import ${specifier}`);
    const start = match.index + match[0].lastIndexOf(specifier);
    rewritten += record.source.slice(cursor, start);
    rewritten += mapped;
    cursor = start + specifier.length;
    match = pattern.exec(record.source);
  }
  rewritten += record.source.slice(cursor);
  assertDeliverable(rewritten);
  const url = rewrittenDataUrl(rewritten);
  cache.set(record.url, url);
  cache.set(record.specifier, url);
  cache.set(key, url);
  return url;
}

export interface PreviewTabUpdate {
  modules: readonly PreviewModuleRecord[];
  changed: readonly string[];
  tabs: readonly PreviewTabSlot[];
  draftSlug: string | null;
  /** Document origin. A `/…` specifier left outside the subgraph is resolved against it. */
  origin: string;
  /** Sees each module URL before it is imported. The test reads the source; production omits it. */
  importModule?: (url: string) => Promise<unknown>;
}

/**
 * Reimports each open page that sits on the changed subgraph and rebuilds only that tab's div.
 * Returns null when no open page imports a changed file, so the caller can keep its other path.
 * A page import that registers no element is still a refusal.
 */
export async function updateOpenPreviewTabs(input: PreviewTabUpdate): Promise<ILiveUpdateResult | null> {
  const known = new Set(input.modules.map((item) => item.specifier));
  const tabs = input.tabs.filter((tab) => known.has(tab.page));
  const graph = buildPreviewGraph(previewGraphRequest(
    input.modules,
    input.changed,
    tabs.map((tab) => tab.page),
    input.draftSlug,
  ));
  if (graph.modules.length === 0) return null;

  const owned = new Map<string, PreviewModuleUrl>();
  for (const item of graph.modules) {
    owned.set(item.specifier, item);
    owned.set(item.url, item);
  }
  const selected = new Set(graph.modules.map((item) => item.specifier));
  const cache = new Map<string, string>();
  const pageUrls = new Map<string, string>();
  for (const tab of tabs) {
    if (!selected.has(tab.page) || pageUrls.has(tab.page)) continue;
    pageUrls.set(tab.page, await loadRewritten(tab.page, owned, cache, [], input.origin));
  }

  const importModule = input.importModule ?? ((url: string) => import(url));
  const captured = new Map<string, CustomElementConstructor>();
  await captureDefines(async () => {
    for (const url of pageUrls.values()) await importModule(url);
  }, (name, ctor) => { captured.set(name, ctor); });

  if (captured.size === 0) {
    return { ok: false, message: t('live.noElementDefine') };
  }

  const swapped: string[] = [];
  const refused: string[] = [];
  for (const [tag, impl] of captured) {
    if (swapElementImpl(tag, impl)) swapped.push(tag);
    else refused.push(tag);
  }
  if (swapped.length === 0) {
    return { ok: false, message: t('live.tagNotArmed', { tag: refused.join(', ') }) };
  }

  const swappedTags = new Set(swapped);
  let count = 0;
  for (const tab of tabs) {
    if (!selected.has(tab.page) || !swappedTags.has(tab.tag)) continue;
    remountTab(tab.div, tab.tag);
    count += 1;
  }
  if (count === 0) {
    console.error('[remount] swapped the page class but no tab div held that tag');
    return { ok: false, message: t('live.nothingToApply', { reason: t('live.tagNotArmed', { tag: swapped.join(', ') }) }) };
  }
  const message = t('live.remounted', { count, tags: swapped.length });
  return {
    ok: true,
    message: refused.length > 0
      ? `${message} — ${t('live.tagNotArmed', { tag: refused.join(', ') })}`
      : message,
  };
}

interface ICompiledModule {
  errors?: readonly unknown[];
  cacheVersion?: string;
  prodJS?: string;
}

function compiledModule(target: IStudioEditTarget): ICompiledModule | null {
  const model = target.model as { compilerResults?: ICompiledModule };
  return model.compilerResults ?? null;
}

function bareSpecifier(target: IStudioEditTarget): string {
  const { project, folder, shortName } = target.storFile;
  const middle = folder ? `${folder}/` : '';
  return `/_${project}_/${middle}${shortName}.js`;
}

function previewModules(ctx: ILiveUpdateContext): { modules: PreviewModuleRecord[]; changed: string } | null {
  const edited = compiledModule(ctx.edited);
  if (!edited?.prodJS || !edited.cacheVersion) return null;
  if (edited.errors && edited.errors.length > 0) return null;
  const editedSpecifier = bareSpecifier(ctx.edited);
  const modules = [previewModule(editedSpecifier, edited.prodJS, edited.cacheVersion)];
  const page = compiledModule(ctx.page);
  const pageSpecifier = bareSpecifier(ctx.page);
  if (page?.prodJS && page.cacheVersion && pageSpecifier !== editedSpecifier && !(page.errors && page.errors.length > 0)) {
    modules.push(previewModule(pageSpecifier, page.prodJS, page.cacheVersion));
  }
  return { modules, changed: editedSpecifier };
}

export const remountMode: ILiveUpdateMode = {
  name: 'remount',
  // English: devtools listing (see studioLiveUpdate).
  description: 'swaps the implementation behind the registered stand-in and builds the element again (faithful; loses undeclared screen state)',

  async apply(ctx: ILiveUpdateContext): Promise<ILiveUpdateResult> {
    if (!isElementSwapArmed(ctx.pageTag)) {
      return { ok: false, message: t('live.notArmed', { tag: ctx.pageTag }) };
    }

    const compiled = await freshModuleUrl(ctx.edited);
    if (!compiled.url) {
      return { ok: false, message: t('live.nothingToApply', { reason: compiled.reason }) };
    }

    const planned = previewModules(ctx);
    if (planned) {
      const viaGraph = await updateOpenPreviewTabs({
        modules: planned.modules,
        changed: [planned.changed],
        tabs: previewTabSlots(),
        draftSlug: null,
        origin: location.origin,
      });
      if (viaGraph) return viaGraph;
    }

    // The define IS the answer to "which class is which tag" — no export-name guessing.
    // Used when the edited file is itself the page and the graph had no open tab to rebuild.
    const captured = new Map<string, CustomElementConstructor>();
    await captureDefines(
      () => import(compiled.url as string) as Promise<unknown>,
      (name, ctor) => { captured.set(name, ctor); },
    );

    if (captured.size === 0) {
      // The edited module and the reimported page (when the graph had one) registered nothing.
      return { ok: false, message: t('live.noElementDefine') };
    }

    const swapped: string[] = [];
    const refused: string[] = [];
    for (const [tag, impl] of captured) {
      if (swapElementImpl(tag, impl)) swapped.push(tag);
      else refused.push(tag);
    }

    if (swapped.length === 0) {
      return { ok: false, message: t('live.tagNotArmed', { tag: refused.join(', ') }) };
    }

    const slots = previewTabSlots().filter((slot) => slot.tag === ctx.pageTag);
    const remounted = slots.length > 0
      ? slots.reduce((total, slot) => {
        remountTab(slot.div, slot.tag);
        return total + 1;
      }, 0)
      : remountAll(ctx.pageTag);
    const message = t('live.remounted', { count: remounted, tags: swapped.length });
    return {
      ok: true,
      message: refused.length > 0
        ? `${message} — ${t('live.tagNotArmed', { tag: refused.join(', ') })}`
        : message,
    };
  },
};

/** `l2/<path>.ts` of this project, as the page import writes it. Anything else is not a preview module. */
export function draftPathSpecifier(project: number, path: string): string | null {
  if (!Number.isInteger(project) || project <= 0) return null;
  if (!path.startsWith('l2/') || !path.endsWith('.ts') || path.endsWith('.d.ts') || path.endsWith('.test.ts')) return null;
  const rest = path.slice(3, -3);
  if (rest.length === 0 || rest.startsWith('/') || rest.endsWith('/')) return null;
  return `/_${project}_/l2/${rest}.js`;
}

interface ICompiledPreview {
  source: string;
  version: string;
}

export interface IPreviewTabsDeps {
  tabs?: readonly PreviewTabSlot[];
  readModule?: (specifier: string) => ICompiledPreview | null;
  draftSlug?: string | null;
  origin?: string;
  importModule?: (url: string) => Promise<unknown>;
}

interface IEditorModel {
  compilerResults?: { prodJS?: string; cacheVersion?: string };
}

function modelKey(specifier: string): { project: number; folder: string; shortName: string } | null {
  const match = /^\/_(\d+)_\/l2\/(.+)\.js$/.exec(specifier);
  if (!match) return null;
  const rest = match[2];
  const slash = rest.lastIndexOf('/');
  const folder = slash === -1 ? '' : rest.slice(0, slash);
  const shortName = slash === -1 ? rest : rest.slice(slash + 1);
  if (!shortName) return null;
  return { project: Number(match[1]), folder, shortName };
}

function readCompiledModule(specifier: string): ICompiledPreview | null {
  const key = modelKey(specifier);
  const editor = (globalThis as { mls?: { editor?: { getModels?: (project: number, shortName: string, folder: string, level: number) => { ts?: IEditorModel } | undefined } } }).mls?.editor;
  if (!key || !editor?.getModels) {
    console.error(`[remount] ${specifier}: compiled module is unavailable`);
    return null;
  }
  const model = editor.getModels(key.project, key.shortName, key.folder, 2)?.ts;
  const source = model?.compilerResults?.prodJS;
  const version = model?.compilerResults?.cacheVersion;
  if (!source || !version) return null;
  return { source, version };
}

/**
 * Rebuilds the open tabs whose page imports one of these draft paths.
 * `null` when none of them is an l2 module an open page imports.
 */
export async function updateOpenTabsForFiles(
  project: number,
  files: readonly string[],
  deps: IPreviewTabsDeps = {},
): Promise<ILiveUpdateResult | null> {
  const changed = files
    .map((path) => draftPathSpecifier(project, path))
    .filter((item): item is string => item !== null);
  if (changed.length === 0) return null;
  const tabs = deps.tabs ?? previewTabSlots();
  const readModule = deps.readModule ?? readCompiledModule;
  const modules = new Map<string, PreviewModuleRecord>();
  const pending = [...changed, ...tabs.map((tab) => tab.page)];
  const seen = new Set<string>();
  const missingChanged: string[] = [];
  while (pending.length > 0) {
    const specifier = pending.pop();
    if (specifier === undefined || seen.has(specifier)) continue;
    seen.add(specifier);
    if (!/^\/_\d+_\/.+\.js$/.test(specifier)) continue;
    const compiled = readModule(specifier);
    if (!compiled) {
      if (changed.includes(specifier)) missingChanged.push(specifier);
      continue;
    }
    modules.set(specifier, previewModule(specifier, compiled.source, compiled.version));
    for (const imported of importedSpecifiers(compiled.source)) {
      if (!seen.has(imported)) pending.push(imported);
    }
  }
  if (missingChanged.length > 0) {
    console.error(`[remount] preview tabs were not updated: not compiled: ${missingChanged.join(', ')}`);
    return { ok: false, message: t('live.notCompiled') };
  }
  const draftSlug = deps.draftSlug !== undefined ? deps.draftSlug : (activeDraft() ?? null);
  const origin = deps.origin ?? (typeof location !== 'undefined' ? location.origin : '');
  return updateOpenPreviewTabs({
    modules: [...modules.values()],
    changed,
    tabs,
    draftSlug,
    origin,
    importModule: deps.importModule,
  });
}

/** The Studio tool registers itself. Save and Discard ask through the slot. */
export function armPreviewTabUpdates(): void {
  registerPreviewTabsUpdate(async (project, files) => {
    const result = await updateOpenTabsForFiles(project, files);
    if (result && !result.ok) {
      console.error(`[remount] preview tabs were not updated: ${result.message}`);
      throw new Error(result.message);
    }
  });
}
