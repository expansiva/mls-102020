/// <mls fileReference="_102020_/l2/aura/studio/studioTour.ts" enhancement="_blank" />
// The guided tours on screen (the rules are in studioTourCore, the tours in studioTours).
//
// One layer over the Studio document: a welcome card the first time, then one step at a time — the element of the
// step in a lit cut-out over a dimmed screen, and a bubble beside it. The layer never takes the clicks away from the
// page (a step may ask the person to click there); only the bubble and the welcome card take them.
//
// The anchor is searched in the document and in the open shadow roots, and followed every frame: the page can
// scroll, resize or be rebuilt by a live update under the tour.

import { subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import { markSeen, parseSeen, placeBubble, revealMode, shouldOffer, stepPosition, type TourDef, type TourStep, type ToursSeen } from '/_102020_/l2/aura/studio/studioTourCore.js';

/** A preference of the person, like the advanced mode: kept in this browser. */
const STORAGE_KEY = 'studio.tours';
/**
 * How long a step waits for its element to SHOW (a tab that opens, a panel that renders) before it is skipped. A step
 * whose element is not in the page at all, and that opens no tab, is skipped at once: it belongs to another view.
 */
const ANCHOR_WAIT_MS = 1000;
const LAYER_ID = 'studio-tour-layer';
const STYLE_ID = 'studio-tour-style';

const CSS = `
#${LAYER_ID} { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font: 13px/1.45 Inter, system-ui, sans-serif; color: #e5e7eb; }
#${LAYER_ID} .st-dim { position: absolute; inset: 0; background: rgba(3,6,12,.55); pointer-events: auto; }
#${LAYER_ID} .st-spot { position: absolute; border-radius: 10px; box-shadow: 0 0 0 9999px rgba(3,6,12,.55); outline: 2px solid #818cf8; outline-offset: 3px; transition: left .15s, top .15s, width .15s, height .15s; }
#${LAYER_ID} .st-card { position: absolute; pointer-events: auto; background: #121a2c; border: 1px solid #2f3a55; border-radius: 12px; box-shadow: 0 16px 40px rgba(0,0,0,.5); display: flex; flex-direction: column; gap: 9px; }
#${LAYER_ID} .st-welcome { left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(400px, calc(100vw - 32px)); padding: 20px; gap: 12px; }
#${LAYER_ID} .st-bubble { width: min(300px, calc(100vw - 16px)); padding: 14px; }
#${LAYER_ID} .st-kicker { font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: .08em; }
#${LAYER_ID} .st-title { margin: 0; font-size: 16px; font-weight: 600; color: #fff; }
#${LAYER_ID} .st-bubble .st-title { font-size: 13px; }
#${LAYER_ID} .st-head { display: flex; align-items: center; gap: 8px; }
#${LAYER_ID} .st-count { margin-left: auto; font-size: 11px; color: #6b7280; }
#${LAYER_ID} .st-text { margin: 0; color: #d1d5db; font-size: 12.5px; }
#${LAYER_ID} .st-try { font-size: 11.5px; color: #a5b4fc; background: rgba(99,102,241,.16); border-radius: 7px; padding: 6px 8px; }
#${LAYER_ID} ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
#${LAYER_ID} li { display: flex; gap: 9px; color: #d1d5db; font-size: 12.5px; }
#${LAYER_ID} li b { width: 20px; height: 20px; border-radius: 6px; background: rgba(99,102,241,.16); color: #c7d2fe; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
#${LAYER_ID} .st-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
#${LAYER_ID} .st-dots { display: flex; gap: 4px; margin-right: auto; }
#${LAYER_ID} .st-dots i { width: 6px; height: 6px; border-radius: 999px; background: #2f3a55; }
#${LAYER_ID} .st-dots i.on { background: #818cf8; width: 16px; }
#${LAYER_ID} button { border: 0; border-radius: 8px; padding: 7px 13px; font: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; }
#${LAYER_ID} .st-primary { background: #6366f1; color: #fff; }
#${LAYER_ID} .st-primary:hover { background: #4f46e5; }
#${LAYER_ID} .st-ghost { background: transparent; color: #9ca3af; border: 1px solid #263044; }
#${LAYER_ID} .st-link { background: transparent; color: #6b7280; padding: 7px 4px; white-space: nowrap; }
#${LAYER_ID} .st-hint { font-size: 11px; color: #6b7280; margin-left: auto; }
`;

function readSeen(): ToursSeen {
  try { return parseSeen(localStorage.getItem(STORAGE_KEY)); } catch { return {}; }
}

function remember(tour: TourDef, how: 'done' | 'skipped'): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(markSeen(readSeen(), tour, how))); } catch { /* the "?" still works */ }
}

function visible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/** The first match of the selector (the first VISIBLE one by default), in the document and in every open shadow root. */
function deepFind(selector: string, root: Document | ShadowRoot = document, mustShow = true): Element | null {
  for (const match of root.querySelectorAll(selector)) if (!mustShow || visible(match)) return match;
  for (const host of root.querySelectorAll('*')) {
    const shadow = (host as Element).shadowRoot;
    if (!shadow) continue;
    const found = deepFind(selector, shadow, mustShow);
    if (found) return found;
  }
  return null;
}

/** The nearest ancestor that scrolls (across shadow roots), or null for the page itself. */
function scrollArea(element: Element): Element | null {
  let node: Node | null = element.parentNode;
  while (node) {
    if (node instanceof ShadowRoot) { node = node.host; continue; }
    if (node instanceof Element) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|overlay)/u.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    }
    node = node.parentNode;
  }
  return null;
}

/** Scrolls the step's element into sight: centered, or from its top when it is taller than its scroll area. */
function reveal(element: Element): void {
  const area = scrollArea(element);
  const box = area ? area.getBoundingClientRect() : { top: 0, height: window.innerHeight };
  const rect = element.getBoundingClientRect();
  const mode = revealMode({ top: rect.top, height: rect.height }, { top: box.top, height: box.height });
  if (mode !== 'none') element.scrollIntoView({ block: mode, inline: 'nearest', behavior: 'smooth' });
}

/** The step's element is in the page (maybe in a closed tab), or the step opens the tab that renders it. */
function present(step: TourStep): boolean {
  return !!deepFind(step.anchor, document, false);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', cls, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

/** The tour on screen, if any: one at a time. */
let current: TourRun | null = null;

class TourRun {
  private layer: HTMLDivElement;
  private index = -1;
  private anchor: Element | null = null;
  private spot: HTMLDivElement | null = null;
  private bubble: HTMLDivElement | null = null;
  private frame = 0;
  private lastFind = 0;
  private token = 0;
  private readonly onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    this.close('skipped');
  };
  // The selection of an element in the page completes a step that asks for it (collabState calls this).
  private readonly selectionWatch = {
    handleIcaStateChange: (_key: string, value: unknown) => {
      if (value && this.tour.steps[this.index]?.advanceOn === 'selection') void this.go(this.index + 1, 1);
    },
  };

  get id(): string { return this.tour.id; }

  constructor(private readonly tour: TourDef) {
    if (!document.getElementById(STYLE_ID)) {
      const style = el('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.layer = el('div');
    this.layer.id = LAYER_ID;
    document.body.appendChild(this.layer);
    document.addEventListener('keydown', this.onKey, true);
    subscribe('aura.edit.selection', this.selectionWatch);
  }

  welcome(): void {
    const card = el('div', 'st-card st-welcome');
    card.setAttribute('role', 'dialog');
    card.append(el('span', 'st-kicker', t(this.tour.welcome.kickerKey)), el('h2', 'st-title', t(this.tour.welcome.titleKey)));
    const list = el('ol');
    this.tour.welcome.lineKeys.forEach((key, i) => {
      const item = el('li');
      item.append(el('b', undefined, String(i + 1)), el('span', undefined, t(key)));
      list.append(item);
    });
    const actions = el('div', 'st-actions');
    actions.append(
      button('st-primary', t('tour.start'), () => { this.layer.replaceChildren(); void this.go(0, 1); }),
      button('st-ghost', t('tour.notNow'), () => this.close('skipped')),
      el('span', 'st-hint', t('tour.reopenHint')),
    );
    card.append(list, actions);
    this.layer.replaceChildren(el('div', 'st-dim'), card);
  }

  /** Shows step `index`, or the next showable one going `dir`; past the ends the tour is done. */
  async go(index: number, dir: 1 | -1): Promise<void> {
    const token = ++this.token;
    for (let i = index; i >= 0 && i < this.tour.steps.length; i += dir) {
      const step = this.tour.steps[i];
      if (!step.openTab && !present(step)) continue;
      if (step.openTab) window.dispatchEvent(new CustomEvent('studio-tour-open-tab', { detail: { tab: step.openTab } }));
      const found = await this.waitFor(step.anchor);
      if (token !== this.token) return;
      if (!found) continue;
      this.index = i;
      this.anchor = found;
      reveal(found);
      this.draw();
      return;
    }
    if (dir === 1) this.close('done');
    else void this.go(0, 1);
  }

  private async waitFor(selector: string): Promise<Element | null> {
    const until = Date.now() + ANCHOR_WAIT_MS;
    for (;;) {
      const found = deepFind(selector);
      if (found || Date.now() >= until) return found;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private draw(): void {
    const step = this.tour.steps[this.index];
    const at = stepPosition(this.tour.steps.map(present), this.index);
    this.spot = el('div', 'st-spot');
    this.bubble = el('div', 'st-card st-bubble');
    this.bubble.setAttribute('role', 'dialog');
    const head = el('div', 'st-head');
    head.append(el('span', 'st-title', t(step.titleKey)), el('span', 'st-count', t('tour.count', { n: at.n, total: at.total })));
    this.bubble.append(head, el('p', 'st-text', t(step.textKey)));
    if (step.tryKey) this.bubble.append(el('div', 'st-try', t(step.tryKey)));
    const dots = el('div', 'st-dots');
    for (let i = 0; i < at.total; i++) dots.append(el('i', i === at.n - 1 ? 'on' : undefined));
    const actions = el('div', 'st-actions');
    actions.append(dots, button('st-link', t('tour.skip'), () => this.close('skipped')));
    if (!at.first) actions.append(button('st-ghost', t('tour.back'), () => void this.go(this.index - 1, -1)));
    actions.append(button('st-primary', t(at.last ? 'tour.finish' : 'tour.next'), () => void this.go(this.index + 1, 1)));
    this.bubble.append(actions);
    this.layer.replaceChildren(this.spot, this.bubble);
    cancelAnimationFrame(this.frame);
    this.follow();
  }

  /** Every frame: the element moved, resized or was rebuilt (a live update replaces the page node). */
  private follow = (): void => {
    if (!this.spot || !this.bubble) return;
    const now = Date.now();
    if ((!this.anchor?.isConnected || !visible(this.anchor)) && now - this.lastFind > 300) {
      this.lastFind = now;
      this.anchor = deepFind(this.tour.steps[this.index].anchor);
    }
    if (this.anchor) {
      const rect = this.anchor.getBoundingClientRect();
      Object.assign(this.spot.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, display: '' });
      const box = this.bubble.getBoundingClientRect();
      const at = placeBubble({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }, { width: box.width, height: box.height }, { width: window.innerWidth, height: window.innerHeight });
      Object.assign(this.bubble.style, { left: `${at.left}px`, top: `${at.top}px` });
    } else {
      this.spot.style.display = 'none';
    }
    this.frame = requestAnimationFrame(this.follow);
  };

  close(how: 'done' | 'skipped'): void {
    this.token++;
    cancelAnimationFrame(this.frame);
    document.removeEventListener('keydown', this.onKey, true);
    unsubscribe('aura.edit.selection', this.selectionWatch);
    this.layer.remove();
    remember(this.tour, how);
    if (current === this) current = null;
  }
}

/**
 * Offers the tour the first time (per version): the welcome card, from which the person starts it or says "not now".
 * Never over something the person is doing, never over another tour.
 */
export function offerTour(tour: TourDef, context: { busy: boolean }): void {
  if (!shouldOffer(tour, readSeen(), { busy: context.busy, open: !!current })) return;
  current = new TourRun(tour);
  current.welcome();
}

/**
 * A panel the tour of another one led to (e.g. the editor that "Edit" opens): when that tour is on screen, it ends
 * as done and this one goes on from its first step, with no second welcome. Otherwise this one is offered as usual.
 */
export function continueTour(from: TourDef, tour: TourDef, context: { busy: boolean }): void {
  if (current && current.id === from.id) {
    current.close('done');
    current = new TourRun(tour);
    void current.go(0, 1);
    return;
  }
  offerTour(tour, context);
}

/** Starts the tour now, from its first step (the "?" button): whatever was on screen closes first. */
export function startTour(tour: TourDef): void {
  current?.close('skipped');
  current = new TourRun(tour);
  void current.go(0, 1);
}
