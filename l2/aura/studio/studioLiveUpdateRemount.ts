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
//  - an edit to the SHARED BASE. Re-importing the page does not help: `/…/shared/x.js` resolves in
//    the module map to the base ALREADY EVALUATED, so the new base is never reached. Fixing that
//    means rewriting the specifiers of the edited subgraph to versioned URLs — a task of its own,
//    and one that applies to any mechanism. Until then, refusing is the only honest answer. The
//    detection is mechanical rather than a guess about file roles: a module that registers NO custom
//    element has nothing this mode can swap.

import type { ILiveUpdateContext, ILiveUpdateMode, ILiveUpdateResult } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';
import type { IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import {
  captureDefines,
  isElementSwapArmed,
  swapElementImpl,
} from '/_102033_/l2/shared/elementSwapRegistry.js';

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
  if (!url) return { url: null, reason: t('live.notInCache') };
  return { url, reason: '' };
}

/**
 * Copies what can be copied from the old node to the new one.
 *
 * Reads the property list from the NEW implementation: a property added by the edit has no value to
 * carry (the old node never had it) and one deleted by the edit must not be forced back on. Values
 * that are `undefined` are skipped so the new constructor's own default survives.
 */
export function carryOver(from: HTMLElement, to: HTMLElement, impl: CustomElementConstructor): void {
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

    // The define IS the answer to "which class is which tag" — no export-name guessing.
    const captured = new Map<string, CustomElementConstructor>();
    await captureDefines(
      () => import(compiled.url as string) as Promise<unknown>,
      (name, ctor) => { captured.set(name, ctor); },
    );

    if (captured.size === 0) {
      // No `@customElement` anywhere in the edited module: it is a shared base / helper. Its new code
      // is unreachable from here (the page's import of it resolves to the copy already evaluated).
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

    const remounted = remountAll(ctx.pageTag);
    const message = t('live.remounted', { count: remounted, tags: swapped.length });
    return {
      ok: true,
      message: refused.length > 0
        ? `${message} — ${t('live.tagNotArmed', { tag: refused.join(', ') })}`
        : message,
    };
  },
};
