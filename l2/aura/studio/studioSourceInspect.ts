/// <mls fileReference="_102020_/l2/aura/studio/studioSourceInspect.ts" enhancement="_blank" />
// "Inspect" of the serviceSource (level 2): hover the running app, click an element, and the source
// editor jumps to the line of the PAGE that writes it.
//
// NOT the in-place editor (studioEditor): that one arms only on level 3 and carries the whole editing
// flow. This is read-only — it outlines, it answers an offset, and it never touches the source. What
// it shares with the editor is the part that has to agree with it, all pure and already exported:
//
//   - ownerChain: a click INSIDE a molecule (or any other component the page mounts) collapses to the
//     molecule's own tag, which is the line of the page where it is used. Content the page passes
//     into a molecule's slot stays the page's, through the projection anchors;
//   - scanTemplateTree + resolveStructuralAnchor: the path from the page element down to the selection
//     -> the element of the template that renders it.
//
// The path builder below mirrors `studioEditor.domPathOf` (same steps, same tiebreakers). It is a copy
// and not a shared call because the editor's version is a private method pinned by its own source
// guards; if the two ever disagree, this one only points at a wrong line — it writes nothing.
//
// Everything is listened on the DOCUMENT, in the capture phase, and the page is looked up again on every
// event: it may live in the "app" tab or in a module tab of its own (pageOnScreen), and the shell can
// remount it — listeners bound to a stale element would go silent.

import { currentEditHost } from '/_102033_/l2/cbe/studioEditSlot.js';
import { currentLanguage } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { convertFileToTag } from '/_102020_/l2/utils.js';
import {
  ownerChain,
  resolveStructuralAnchor,
  scanTemplateTree,
  type IDomPathStep,
  type IOwnerTree,
} from '/_102020_/l2/aura/studio/studioClassEdit.js';
import { findAllI18nMatches } from '/_102020_/l2/aura/studio/studioTextEdit.js';
import { t, tr } from '/_102020_/l2/aura/studio/studioMessages.js';

/** The page file open in the serviceSource. */
export interface IInspectFile {
  project: number;
  folder: string;
  shortName: string;
}

export interface ISourceInspectOptions {
  file: IInspectFile;
  /** The page source the offsets refer to — the model the editor shows. */
  source: () => string;
  /** Checked on every event; false stops the inspect (e.g. the user left level 2). */
  isActive: () => boolean;
  /** Offset (0-based) of the `<` of the element's open tag in `source()`. */
  onPick: (offset: number) => void;
  onRefuse: (message: string) => void;
  /** Called once, whatever stopped it (Esc, the caller, the app leaving the page). */
  onStop: () => void;
}

export type SourceInspectStart =
  | { ok: true; stop: () => void }
  | { ok: false; message: string };

/** Studio mode is on: the app service publishes its region host only then. */
function inStudioMode(): boolean {
  return !!currentEditHost()?.host;
}

/**
 * The VISIBLE page element of the file open in the source; null when no tab is showing it.
 *
 * Looked up by tag in the whole document, not inside the published host: a page of the app's own
 * module renders in the "app" tab (the region host), but a page of ANOTHER module is mounted by
 * `openModuleTab` in a div of its own, in another nav3 tab, which never goes through that slot.
 * The tab behind keeps its page mounted and hidden, so only an element with a box counts.
 */
export function pageOnScreen(file: IInspectFile): HTMLElement | null {
  const tag = convertFileToTag(file);
  if (!tag) return null;
  for (const el of Array.from(document.getElementsByTagName(tag))) {
    if (el instanceof HTMLElement && el.parentElement && el.getClientRects().length > 0) return el;
  }
  return null;
}

// --- Ownership (same accessors as studioEditor.ownerTree) ---

/** Nearest STRICT ancestor that is a custom element — the molecule a node was rendered by. */
function owningComponent(el: HTMLElement, host: HTMLElement): HTMLElement | null {
  let current = el.parentElement;
  while (current && current !== host) {
    if (current.tagName.includes('-')) return current;
    current = current.parentElement;
  }
  return null;
}

/** The element whose children a projection anchor is holding, scoped to the molecule that rendered it. */
function liveSlotSource(anchor: HTMLElement, key: string, host: HTMLElement): HTMLElement | null {
  const molecule = owningComponent(anchor, host);
  if (!molecule) return null;
  return Array.from(molecule.querySelectorAll<HTMLElement>('[data-ml-live-source]'))
    .find((candidate) => candidate.dataset.mlLiveSource === key
      && owningComponent(candidate, host) === molecule) ?? null;
}

function pageOwnerTree(host: HTMLElement, pageTag: string): IOwnerTree<HTMLElement> {
  return {
    parent: (el) => el.parentElement,
    slotAnchor: (el) => el.dataset.mlLiveHeld ?? null,
    slotSource: (el, key) => liveSlotSource(el, key, host),
    component: (el) => {
      const tag = el.tagName.toLowerCase();
      return tag.includes('-') && tag !== pageTag ? tag : null;
    },
  };
}

/**
 * The chain from the page down to what a click on `target` selects: everything below a molecule
 * collapses to the molecule. Empty when the target is not inside the page.
 */
function selectedChain(target: HTMLElement, host: HTMLElement, page: HTMLElement): HTMLElement[] {
  const { chain, ownerBreak } = ownerChain(target, page, pageOwnerTree(host, page.tagName.toLowerCase()));
  return ownerBreak < 0 ? chain : chain.slice(0, ownerBreak + 1);
}

// --- Structural path (mirror of studioEditor.domPathOf) ---

function i18nKeysOf(node: Element, source: string): string[] {
  const text = Array.from(node.childNodes)
    .filter((child) => child.nodeType === Node.TEXT_NODE)
    .map((child) => child.textContent ?? '')
    .join('')
    .trim();
  if (!text) return [];
  return findAllI18nMatches(text, source, currentLanguage()).map((match) => match.key);
}

function domPathOfChain(chain: HTMLElement[], source: string): IDomPathStep[] {
  const path: IDomPathStep[] = [];
  for (const node of chain) {
    const parent = node.parentElement;
    if (!parent) return [];
    const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === node.tagName);
    const index = siblings.indexOf(node);
    if (index < 0) return [];

    const literal = node.getAttribute('class');
    const sameLiteral = siblings.filter((sibling) => sibling.getAttribute('class') === literal);
    const i18nKeys = i18nKeysOf(node, source);
    path.push({
      tag: node.tagName.toLowerCase(),
      index,
      count: siblings.length,
      literal,
      literalIndex: sameLiteral.indexOf(node),
      literalCount: sameLiteral.length,
      ...(i18nKeys.length ? { i18nKeys } : {}),
    });
  }
  return path;
}

// --- Overlay ---

function createOverlay(): { box: HTMLDivElement; label: HTMLDivElement } {
  const box = document.createElement('div');
  box.setAttribute('data-source-inspect', '');
  Object.assign(box.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483000',
    outline: '2px solid #3b82f6',
    background: 'rgba(59, 130, 246, 0.12)',
    display: 'none',
  });
  const label = document.createElement('div');
  label.setAttribute('data-source-inspect', '');
  Object.assign(label.style, {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: '2147483001',
    background: '#1e3a8a',
    color: '#fff',
    font: '12px/1.4 monospace',
    padding: '1px 6px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    display: 'none',
  });
  document.body.append(box, label);
  return { box, label };
}

/**
 * Arms the inspect over the running app. Refuses (with the reason) when the app is not showing the
 * page open in the source.
 */
export function startSourceInspect(options: ISourceInspectOptions): SourceInspectStart {
  if (!inStudioMode()) return { ok: false, message: t('inspect.noApp') };
  if (!pageOnScreen(options.file)) {
    return { ok: false, message: t('inspect.otherPage') };
  }

  const { box, label } = createOverlay();
  let hovered: HTMLElement | null = null;
  let stopped = false;

  /** The selection under the pointer, or null when the event is not over this page. */
  const resolve = (e: Event): HTMLElement[] | null => {
    if (!options.isActive()) {
      stop();
      return null;
    }
    const page = pageOnScreen(options.file);
    if (!page) {
      // The app left the page (or swapped variation): the lines would belong to another file.
      stop();
      return null;
    }
    // The page's container is the boundary: the region host in the "app" tab, the module tab's div otherwise.
    const host = page.parentElement;
    const target = e.target;
    if (!host || !(target instanceof HTMLElement) || !host.contains(target)) return null;
    const chain = selectedChain(target, host, page);
    return chain.length ? chain : null;
  };

  const hide = () => {
    box.style.display = 'none';
    label.style.display = 'none';
    hovered = null;
  };

  const onMove = (e: MouseEvent) => {
    const chain = resolve(e);
    const el = chain ? chain[chain.length - 1] : null;
    if (!el) return hide();
    if (el === hovered) return;
    hovered = el;
    const rect = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    label.textContent = el.tagName.toLowerCase();
    Object.assign(label.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${Math.max(0, rect.top - 20)}px`,
    });
  };

  /** Swallows the gestures the app would otherwise react to (buttons, links, focus, drag). */
  const swallow = (e: Event) => {
    if (!resolve(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  const onClick = (e: MouseEvent) => {
    const chain = resolve(e);
    if (!chain) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const source = options.source();
    if (!source) return options.onRefuse(t('inspect.noSource'));
    const path = domPathOfChain(chain, source);
    const anchor = resolveStructuralAnchor(scanTemplateTree(source), path);
    if (!anchor.ok) return options.onRefuse(t('inspect.refused', { reason: tr(anchor.reason) }));
    // A pick that landed ends the inspect; a refusal keeps it on so the user can try another element.
    options.onPick(anchor.element.openStart);
    stop();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') stop();
  };

  const swallowed = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'auxclick', 'contextmenu'] as const;

  function stop(): void {
    if (stopped) return;
    stopped = true;
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    for (const type of swallowed) document.removeEventListener(type, swallow, true);
    box.remove();
    label.remove();
    options.onStop();
  }

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  for (const type of swallowed) document.addEventListener(type, swallow, true);

  return { ok: true, stop };
}
