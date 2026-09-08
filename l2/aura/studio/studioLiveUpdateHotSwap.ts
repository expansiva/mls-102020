/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateHotSwap.ts" enhancement="_blank" />
// Live-update mode: patch the ALREADY REGISTERED class instead of redefining the tag.
//
// A tag can never be redefined, but the registered constructor is just an object: replacing the
// members of its prototype changes the behaviour of every instance — the ones on screen and the ones
// the shell creates later, which is what makes "navigate away and come back" show the edit.
//
// HOW THE NEW CODE IS OBTAINED
// From the VERSIONED URL of the local cache (`mls.stor.cache.getURL`), which is exactly what the
// compile just wrote there: `compileAndPostProcess(..., saveCache = true)` stores `prodJS` under
// `compilerResults.cacheVersion` ([mls.js:6681](static/libs/mls.js#L6681)). Every compile mints a new
// version, so the URL is unique and the module really re-evaluates.
//
// A BLOB WAS TRIED FIRST AND DOES NOT WORK. `import()` of a blob fails on the very first
// origin-rooted specifier:
//   Failed to resolve module specifier "/_102029_/l2/collabLitElement.js".
//   Invalid relative url or base scheme isn't hierarchical.
// A blob URL is not hierarchical, so there is no base to resolve `/...` against. Rewriting every
// specifier in the emitted JS would be the workaround; using the cache URL removes the problem
// instead — it is hierarchical and same-origin, so `/_1020xx_/...` and bare `lit` (document import
// map) resolve EXACTLY as they do for the app's normal modules, reusing the already-evaluated ones.
// That identity matters: a second copy of Lit would break `elementProperties`/`requestUpdate`.
//
// Note this is NOT the ambiguity fase 1 is about. That one asks whether the SW wins over the dist
// chunk for the UNVERSIONED page URL; this uses the versioned local-cache URL, the cache API's own
// documented purpose and something the whole studio already depends on.
//
// LIMITS (documented on purpose — this mode is chosen for text/i18n edits)
//  - PRIVATE CLASS FIELDS (`#field`) make the patch IMPOSSIBLE, not just imperfect — the guard below
//    refuses instead of breaking the component. See usesPrivateFields.
//  - Copying members is ADDITIVE: a member deleted in the new version stays on the registered class.
//  - `static styles` is not swapped, so a CSS change does not arrive through here.
//  - `document.createElement(tag)` still runs the OLD constructor, so a property ADDED by the edit
//    gets its reactive accessor (via finalize + elementProperties) but no default value.
// For a structural rewrite (an agent redoing the page) the honest mode is `reload`.

import type { ILiveUpdateContext, ILiveUpdateMode, ILiveUpdateResult } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import type { IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';

/** Lit's static surface we touch. `finalize` is protected in the typings but callable at runtime. */
interface LitLikeConstructor extends CustomElementConstructor {
  finalize?: () => void;
  elementProperties?: Map<PropertyKey, unknown>;
}

interface LitLikeElement extends HTMLElement {
  requestUpdate?: () => void;
}

/** Compiled JS of a target — already produced by the compile that precedes every live update. */
function readCompiledJs(target: IStudioEditTarget): string {
  return (target.model as mls.editor.IModelTS).compilerResults?.prodJS || '';
}

/**
 * True when a module's code touches PRIVATE CLASS FIELDS (`#field`).
 *
 * THIS IS WHY THE PATCH HAS TO BE REFUSED. A private field is branded onto the instance by the class
 * that DECLARES it. Installing a member from the freshly evaluated module means installing a function
 * closed over that module's own field storage (a fresh WeakMap once TypeScript downlevels `#`, the
 * class's own brand when it does not) — while every instance was branded by the OLD module: the live
 * ones, and the future ones too, since `document.createElement(tag)` keeps running the OLD
 * constructor. Every access then throws
 *
 *   TypeError: Cannot read private member from an object whose class did not declare it
 *
 * on each render, which stops the component from rendering at all. The generator used to emit exactly
 * this (`#msgLang`/`#msgCache`, the cache of the `msg` getter) on every page — see cfePageSkeleton.ts,
 * which now emits `protected _msgLang`/`_msgCache` instead so hotSwap never has to refuse a generated
 * page. The guard stays: a page generated before that change, or a `#field` a human wrote by hand
 * editing a page, still needs to be refused instead of silently breaking the component.
 *
 * There is no fix from this side: the field storage is module-private, and re-branding would mean
 * reconstructing the instances — which is a remount, not a hot swap.
 */
function usesPrivateFields(js: string): boolean {
  return js.includes('__classPrivateField') || /this\.#/u.test(js);
}

interface IFreshModuleUrl {
  url: string | null;
  /** Why there is no URL, for the status strip. */
  reason: string;
}

/**
 * URL of the just-compiled JS in the local cache, versioned by `cacheVersion`.
 *
 * Null with a reason rather than throwing: a TypeScript error in the edited file is a normal outcome
 * here, and it must be reported as such and not as a crash.
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
  if (!url) return { url: null, reason: t('live.notInCache') };
  return { url, reason: '' };
}

/** The subset of `CustomElementRegistry` the guard needs — narrow so a fake registry in a Node test
 *  does not have to implement the full DOM interface. */
export interface IDefineGuardRegistry {
  define(name: string, ctor: CustomElementConstructor, options?: ElementDefinitionOptions): void;
  get(name: string): CustomElementConstructor | undefined;
}

let guardDepth = 0;
let realDefine: IDefineGuardRegistry['define'] | null = null;

/** Called with every (name, ctor) pair offered to `define` while the guard is up — see the `onDefine`
 *  param of `withDefineGuard`. A `Set` because calls can overlap: each caller's own listener must keep
 *  hearing every define for the whole time its own `fn` is running, not just while it is the only one. */
type DefineListener = (name: string, ctor: CustomElementConstructor) => void;
const defineListeners = new Set<DefineListener>();

/**
 * Runs `fn` with `registry.define` neutralized: a name already registered is silently ignored
 * instead of throwing, so importing a module that re-declares an existing tag does not abort.
 *
 * DEPTH-COUNTED, not save/restore-per-call, because `applyLiveUpdate` has three independent call
 * sites (two in studioEditor.ts, one in the watcher) and none of them wait for one another — two
 * overlapping calls used to race like this:
 *
 *   A patches (saves the REAL define)  ->  B patches (saves what it reads, which is A's guard,
 *   not the real define)  ->  A finishes, restores the real define  ->  B finishes, restores
 *   "the real define" = A's guard  =>  the guard is now permanent on the app's `define`.
 *
 * With a depth counter, only the call that takes the count from 0 to 1 saves the real function, and
 * only the call that takes it back to 0 restores it — an overlapping call in between just leaves the
 * guard in place, which is exactly what it should do. Correct even without a lock serializing the
 * callers (see `serialize` in studioLiveUpdate.ts, which adds one anyway).
 *
 * `onDefine`, if given, hears every (name, ctor) the guard sees while `fn` runs — Lit's `@customElement`
 * decorator never stores the tag name on the class, `customElements.define` is the only place the pair
 * exists, so this is how a caller learns which export was declared under which tag (see
 * `pickElementClass`). Listening rather than reading a single captured value keeps this correct under
 * the same overlap the depth counter handles: an unrelated concurrent import's defines pass through
 * too, but they name classes that are not among the listener's own module exports, so they are ignored
 * where it matters, at the lookup, not here.
 */
export async function withDefineGuard<T>(
  registry: IDefineGuardRegistry,
  fn: () => Promise<T>,
  onDefine?: DefineListener,
): Promise<T> {
  if (onDefine) defineListeners.add(onDefine);
  if (guardDepth === 0) {
    realDefine = registry.define.bind(registry);
    registry.define = (name, ctor, options) => {
      defineListeners.forEach(listener => listener(name, ctor));
      if (registry.get(name)) return;
      return realDefine!(name, ctor, options);
    };
  }
  guardDepth += 1;
  try {
    return await fn();
  } finally {
    guardDepth -= 1;
    if (onDefine) defineListeners.delete(onDefine);
    if (guardDepth === 0 && realDefine) {
      registry.define = realDefine;
      realDefine = null;
    }
  }
}

/**
 * Imports a module URL without letting it register anything.
 *
 * The compiled PAGE module carries `@customElement('tag')`, and `customElements.define` THROWS on a
 * name already in use — so evaluating it would abort. The define is neutralized for the duration
 * (same trick the preview uses in previewModeAura.addJsReference) and restored once nothing else is
 * mid-evaluation: leaving a patched `define` behind would silently swallow every later registration
 * in the app.
 *
 * Also returns which tag each defined export was declared under (see `pickElementClass`).
 */
async function evaluateModule(url: string): Promise<{ mod: Record<string, unknown>; tagByCtor: Map<Function, string> }> {
  const tagByCtor = new Map<Function, string>();
  const mod = await withDefineGuard(
    customElements,
    () => import(url) as Promise<Record<string, unknown>>,
    (name, ctor) => tagByCtor.set(ctor, name),
  );
  return { mod, tagByCtor };
}

/**
 * The custom-element class a module exports.
 *
 * Prefers the export declared under `pageTag` — the module can carry more than one element class (a
 * page importing a molecule it also happens to re-export, for instance), and the tag is the only
 * unambiguous way to tell which one is the page itself. Falls back to the first export whose prototype
 * is an HTMLElement when there is no tag match (today's single-export pages, or a module evaluated
 * outside `evaluateModule` with no `tagByCtor`), warning once when that fallback had more than one
 * candidate to arbitrate between — a silent arbitrary pick there is exactly the latent bug this exists
 * to close off before a module ever exports two.
 */
export function pickElementClass(
  mod: Record<string, unknown>,
  pageTag: string,
  tagByCtor: Map<Function, string> = new Map(),
): LitLikeConstructor | null {
  const candidates = Object.values(mod).filter(
    (value): value is LitLikeConstructor => typeof value === 'function' && value.prototype instanceof HTMLElement,
  );
  const byTag = candidates.find(candidate => tagByCtor.get(candidate) === pageTag);
  if (byTag) return byTag;
  if (candidates.length > 1) {
    console.warn(
      `[studioLiveUpdate] module exports ${candidates.length} element classes and none matched tag "${pageTag}" — picking the first one (order is not guaranteed)`,
    );
  }
  return candidates[0] ?? null;
}

/** Makes Lit build the reactive accessors and populate `elementProperties` of a class. */
function finalize(ctor: LitLikeConstructor): void {
  try {
    ctor.finalize?.();
  } catch (err) {
    console.warn('[studioLiveUpdate] finalize failed:', err);
  }
}

/** Copies the new reactive property declarations into the registered class. */
function mergeElementProperties(registered: LitLikeConstructor, fresh: LitLikeConstructor): void {
  if (!fresh.elementProperties || !registered.elementProperties) return;
  fresh.elementProperties.forEach((options, name) => {
    registered.elementProperties?.set(name, options);
  });
}

/**
 * Replaces the members the page class declares itself.
 *
 * Used when the EDITED file is the page: `render()` and friends live on its own prototype.
 */
function patchOwnMembers(registered: LitLikeConstructor, fresh: LitLikeConstructor): void {
  for (const key of Object.getOwnPropertyNames(fresh.prototype)) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(fresh.prototype, key);
    if (descriptor) Object.defineProperty(registered.prototype, key, descriptor);
  }
}

/**
 * Re-links the registered class to the NEW base class.
 *
 * Used when the edited file is the SHARED base — the usual case, since it owns the i18n catalog.
 * Swapping the chain link (instead of copying the base's members onto the page prototype) keeps the
 * page's own overrides intact: copying would clobber a `render()` the page declares.
 *
 * The static side is relinked too, so `styles`/`elementProperties` lookups that fall through to the
 * base reach the new one.
 */
function relinkBaseClass(registered: LitLikeConstructor, freshBase: LitLikeConstructor): void {
  Object.setPrototypeOf(registered.prototype, freshBase.prototype);
  Object.setPrototypeOf(registered, freshBase);
}

function sameFile(a: IStudioEditTarget, b: IStudioEditTarget): boolean {
  return a.project === b.project && a.shortName === b.shortName && a.folder === b.folder;
}

export const hotSwapMode: ILiveUpdateMode = {
  name: 'hotSwap',
  // English: devtools listing (see studioLiveUpdate).
  description: 'patches the members of the already registered class (keeps the screen state, no reload)',

  async apply(ctx: ILiveUpdateContext): Promise<ILiveUpdateResult> {
    const registered = customElements.get(ctx.pageTag) as LitLikeConstructor | undefined;
    if (!registered) {
      return { ok: false, message: t('live.tagNotRegistered', { tag: ctx.pageTag }) };
    }

    // BEFORE evaluating anything: installing members of a class that declares private fields breaks
    // every instance (see usesPrivateFields). Refusing keeps the app running; the honest way to see
    // the edit is `studioLiveUpdate.set('reload')`.
    if (usesPrivateFields(readCompiledJs(ctx.edited))) {
      return {
        ok: false,
        message: t('live.privateFields'),
      };
    }

    const compiled = await freshModuleUrl(ctx.edited);
    if (!compiled.url) {
      return { ok: false, message: `nada a aplicar: ${compiled.reason}` };
    }

    const { mod, tagByCtor } = await evaluateModule(compiled.url);
    const fresh = pickElementClass(mod, ctx.pageTag, tagByCtor);
    if (!fresh) {
      return { ok: false, message: t('live.noElementClass') };
    }

    finalize(fresh);

    const isPageItself = sameFile(ctx.edited, ctx.page);
    if (isPageItself) patchOwnMembers(registered, fresh);
    else relinkBaseClass(registered, fresh);

    mergeElementProperties(registered, fresh);

    // Relinking the base is inert when the PAGE declares its own `msg`: the current generator copies
    // the shared strings into the page's catalog at module evaluation
    // (`{...fromShared(sharedMessages['pt'])}`), so the page shadows whatever the new base holds.
    // Saying "applied" here would be a lie.
    if (!isPageItself && Object.getOwnPropertyDescriptor(registered.prototype, 'msg')) {
      return {
        ok: false,
        message: t('live.pageOwnCatalog'),
      };
    }

    // Live instances keep their state; they just re-render against the new code.
    let repainted = 0;
    for (const el of Array.from(document.querySelectorAll(ctx.pageTag))) {
      (el as LitLikeElement).requestUpdate?.();
      repainted += 1;
    }

    return {
      ok: true,
      message: isPageItself
        ? t('live.appliedPage', { count: repainted })
        : t('live.appliedBase', { count: repainted }),
    };
  },
};
