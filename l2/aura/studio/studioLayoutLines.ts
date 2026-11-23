/// <mls fileReference="_102020_/l2/aura/studio/studioLayoutLines.ts" enhancement="_blank" />
// The layout lines over the page on screen: outlines, spacing and grid (studioAdvancedMode gates them).
//
// Owned by the editor (studioEditor creates one when it arms and the advanced mode has a line on, and
// destroys it with everything else). What it touches in the client app, and how it gives it back:
//
//  - OUTLINES are a stylesheet in the head, scoped to the region host through an attribute the layer
//    sets on it (`data-se-lines`). No element of the page is touched; removing the attribute and the
//    stylesheet is the whole undo.
//  - SPACING and GRID are drawn in a layer of their own on the body — NOT in the editor's marking layer,
//    which is rewritten on every hover (`drawHover` replaces its innerHTML) — one z-index BELOW the
//    marking, so the selection stays readable over the lines. `pointer-events: none` and the editor's
//    control class: never selectable, never counted by the page tree.
//
// Only what crosses the visible part of the region is measured, once per animation frame per burst of
// events (scroll, resize, remount, mutation, hover). The rules of what to draw are pure
// (studioLayoutLinesCore).

import {
  gridRects,
  intersects,
  outlineCss,
  parseTracks,
  spacingRects,
  twelveColumnRects,
  type IBox,
  type ILineRect,
} from '/_102020_/l2/aura/studio/studioLayoutLinesCore.js';
import { activeLines, type IAdvancedPrefs, type LayoutLine } from '/_102020_/l2/aura/studio/studioAdvancedMode.js';

/** The attribute on the region host that scopes the outline stylesheet. */
export const LINES_ATTRIBUTE = 'data-se-lines';
const STYLE_ID = 'se-layout-lines-style';

/** Measuring stops here: past it a page is a list of hundreds of rows, and the lines say nothing more. */
const MAX_MEASURED = 1500;

const LAYER_CSS = `
.se-layout-lines { position: fixed; overflow: hidden; pointer-events: none; z-index: 99989; }
.se-layout-lines .sll { position: absolute; box-sizing: border-box; }
.se-layout-lines .sll-margin { background: rgba(249,115,22,0.28); }
.se-layout-lines .sll-padding { background: rgba(34,197,94,0.25); }
.se-layout-lines .sll-gap { background: rgba(168,85,247,0.30); background-image: repeating-linear-gradient(45deg, rgba(168,85,247,0.35) 0 2px, transparent 2px 6px); }
.se-layout-lines .sll-column { background: rgba(236,72,153,0.10); border-left: 1px solid rgba(236,72,153,0.6); border-right: 1px solid rgba(236,72,153,0.6); }
.se-layout-lines .sll-twelve { background: rgba(14,165,233,0.08); border-left: 1px dashed rgba(14,165,233,0.5); border-right: 1px dashed rgba(14,165,233,0.5); }
.se-layout-lines .sll-baseline { background-image: repeating-linear-gradient(to bottom, rgba(14,165,233,0.25) 0 1px, transparent 1px 8px); }
.se-layout-lines .sll-label { position: absolute; transform: translate(-50%, -50%); font: 600 10px/1 ui-monospace, Consolas, monospace; color: #fff; padding: 2px 3px; border-radius: 3px; white-space: nowrap; }
.se-layout-lines .sll-label-margin { background: #ea580c; }
.se-layout-lines .sll-label-padding { background: #16a34a; }
.se-layout-lines .sll-label-gap { background: #9333ea; }
.se-layout-lines .sll-label-column { background: #db2777; transform: translate(-50%, 0); }
`;

export interface ILayoutLinesHost {
  /** The region host the page is mounted in. */
  host: HTMLElement;
  /** The page's own element (the host's page child), for the reference grid. */
  page: () => HTMLElement | null;
  /** The editor's own markup in the page (a text edit in flight) — never measured. */
  isControl: (el: Element) => boolean;
  /** The class the editor marks its chrome with. */
  controlClass: string;
}

export class LayoutLines {
  private prefs: IAdvancedPrefs | null = null;
  private lines: LayoutLine[] = [];
  private layer: HTMLDivElement | null = null;
  private hovered: Element | null = null;
  private hidden = false;
  private frame: number | null = null;
  private observer: MutationObserver | null = null;
  private listening = false;

  constructor(private readonly ctx: ILayoutLinesHost) {}

  /** Applies the preferences: what is on, and how. Turning everything off gives the page back. */
  public setPrefs(prefs: IAdvancedPrefs): void {
    this.prefs = prefs;
    this.lines = activeLines(prefs);
    this.applyOutline();
    const measuring = this.lines.includes('spacing') || this.lines.includes('grid');
    if (measuring) this.start();
    else this.stopMeasuring();
    this.schedule();
  }

  /** The element under the pointer: its values (and its children's) are the ones written. */
  public setHovered(el: Element | null): void {
    if (el === this.hovered) return;
    this.hovered = el;
    if (this.lines.includes('spacing') && !this.prefs?.valuesAlways) this.schedule();
  }

  /** The region went away (another service, a collapsed panel): nothing is drawn over nothing. */
  public setVisible(visible: boolean): void {
    this.hidden = !visible;
    this.schedule();
  }

  public isActive(): boolean {
    return this.lines.length > 0;
  }

  /** Everything off and removed: the attribute, the stylesheet, the layer, the listeners. */
  public destroy(): void {
    this.lines = [];
    this.applyOutline();
    this.stopMeasuring();
    document.getElementById(STYLE_ID)?.remove();
  }

  // ─── Outlines ───────────────────────────────────────────────────────────

  private applyOutline(): void {
    const on = this.lines.includes('outline');
    const host = this.ctx.host;
    if (on) host.setAttribute(LINES_ATTRIBUTE, 'outline');
    else host.removeAttribute(LINES_ATTRIBUTE);
    const css = on ? outlineCss(`[${LINES_ATTRIBUTE}~="outline"]`, Boolean(this.prefs?.outlineMono)) : '';
    this.ensureStyle(css);
  }

  /** One stylesheet for the layer's looks and, when on, the outlines. */
  private ensureStyle(outline: string): void {
    const needed = Boolean(outline) || this.layer !== null || this.lines.length > 0;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!needed) {
      style?.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `${LAYER_CSS}\n${outline}`;
  }

  // ─── Spacing and grid ───────────────────────────────────────────────────

  private start(): void {
    if (!this.layer) {
      this.layer = document.createElement('div');
      this.layer.className = `${this.ctx.controlClass} se-layout-lines`;
      document.body.appendChild(this.layer);
    }
    if (this.listening) return;
    this.listening = true;
    // Capture: the page scrolls inside the nav3 panel, and an inner scroll only passes through on capture.
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
    this.observer = new MutationObserver(this.schedule);
    this.observer.observe(this.ctx.host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'data-class'],
    });
  }

  private stopMeasuring(): void {
    if (this.listening) {
      window.removeEventListener('scroll', this.schedule, true);
      window.removeEventListener('resize', this.schedule);
      this.observer?.disconnect();
      this.observer = null;
      this.listening = false;
    }
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.layer?.remove();
    this.layer = null;
  }

  private readonly schedule = (): void => {
    if (!this.layer || this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.draw();
    });
  };

  private draw(): void {
    const layer = this.layer;
    if (!layer) return;
    const region = this.visibleRegion();
    if (this.hidden || !region) {
      layer.innerHTML = '';
      return;
    }
    // The layer IS the visible part of the region, and clips: a box half scrolled out of the page must
    // not be painted over the Studio's own header, tabs or side panel.
    layer.style.left = `${region.x}px`;
    layer.style.top = `${region.y}px`;
    layer.style.width = `${region.w}px`;
    layer.style.height = `${region.h}px`;
    const spacing = this.lines.includes('spacing');
    const grid = this.lines.includes('grid');
    const valuesAlways = Boolean(this.prefs?.valuesAlways);
    const rects: ILineRect[] = [];

    let measured = 0;
    for (const el of Array.from(this.ctx.host.querySelectorAll('*'))) {
      if (measured >= MAX_MEASURED) break;
      if (this.ctx.isControl(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const box: IBox = { x: r.left, y: r.top, w: r.width, h: r.height };
      if (!intersects(box, region)) continue;
      measured += 1;
      const cs = getComputedStyle(el);
      if (spacing) {
        const values = valuesAlways || (this.hovered !== null && (el === this.hovered || el.parentElement === this.hovered));
        const children = Array.from(el.children)
          .filter((kid) => !this.ctx.isControl(kid))
          .map((kid) => kid.getBoundingClientRect())
          .filter((kr) => kr.width > 0 || kr.height > 0)
          .map((kr) => ({ x: kr.left, y: kr.top, w: kr.width, h: kr.height }));
        rects.push(...spacingRects({
          box,
          margin: withoutAuto(el, sides(cs, 'margin')),
          padding: sides(cs, 'padding'),
          display: cs.display,
          rowGap: num(cs.rowGap),
          columnGap: num(cs.columnGap),
          children,
        }, values));
      }
      if (grid && cs.display.includes('grid')) {
        const left = num(cs.paddingLeft) + num(cs.borderLeftWidth);
        rects.push(...gridRects(box, left, parseTracks(cs.gridTemplateColumns), num(cs.columnGap)));
      }
    }

    if (grid && (this.prefs?.twelveColumns || this.prefs?.baseline)) {
      const page = this.ctx.page();
      const pr = page?.getBoundingClientRect();
      if (pr && pr.width > 0) {
        const box = { x: pr.left, y: pr.top, w: pr.width, h: pr.height };
        if (this.prefs?.twelveColumns) rects.push(...twelveColumnRects(box));
        if (this.prefs?.baseline) rects.push({ kind: 'baseline', ...box });
      }
    }

    layer.innerHTML = rects.map((rect) => renderRect(rect, region)).join('');
  }

  private visibleRegion(): IBox | null {
    return visibleRegionOf(this.ctx.host);
  }
}

/**
 * The part of the region on screen, in viewport coordinates; null when nothing of it shows.
 *
 * The host's own box is not enough: in the Studio it scrolls INSIDE the nav3 panel, so its top goes
 * above the panel and, clamped only to the window, the lines would cover the Studio's header and tabs.
 * Every ancestor that clips its content (overflow other than visible) cuts the region too.
 */
export function visibleRegionOf(host: HTMLElement, clips: readonly Element[] = clippingAncestors(host)): IBox | null {
  const r = host.getBoundingClientRect();
  let left = Math.max(r.left, 0);
  let top = Math.max(r.top, 0);
  let right = Math.min(r.right, window.innerWidth);
  let bottom = Math.min(r.bottom, window.innerHeight);
  for (const node of clips) {
    const clip = node.getBoundingClientRect();
    left = Math.max(left, clip.left);
    top = Math.max(top, clip.top);
    right = Math.min(right, clip.right);
    bottom = Math.min(bottom, clip.bottom);
  }
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * The ancestors of `host` that clip their content (overflow other than visible). Reading styles is what costs; a
 * caller that asks for the region every frame computes this once and passes it in.
 */
export function clippingAncestors(host: HTMLElement): Element[] {
  const clips: Element[] = [];
  for (let node = host.parentElement; node && node !== document.body; node = node.parentElement) {
    const cs = getComputedStyle(node);
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
    clips.push(node);
  }
  return clips;
}

function num(value: string): number {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

function sides(cs: CSSStyleDeclaration, prop: 'margin' | 'padding'): { top: number; right: number; bottom: number; left: number } {
  return {
    top: Math.max(0, num(cs.getPropertyValue(`${prop}-top`))),
    right: Math.max(0, num(cs.getPropertyValue(`${prop}-right`))),
    bottom: Math.max(0, num(cs.getPropertyValue(`${prop}-bottom`))),
    left: Math.max(0, num(cs.getPropertyValue(`${prop}-left`))),
  };
}

/** A rect in viewport coordinates, drawn inside the layer (whose origin is the region's corner). */
/**
 * An `auto` margin is the browser centring the box (`mx-auto`), not space anyone wrote: painted, a centred
 * container shows two orange walls hundreds of px wide. `getComputedStyle` answers the USED value (px)
 * and cannot tell; the typed computed value (`computedStyleMap`) still says `auto`. Where it is not
 * available, the margin is kept.
 */
function withoutAuto(el: Element, margin: { top: number; right: number; bottom: number; left: number }): { top: number; right: number; bottom: number; left: number } {
  const map = (el as Element & { computedStyleMap?: () => { get: (prop: string) => unknown } }).computedStyleMap?.();
  if (!map) return margin;
  const isAuto = (prop: string): boolean => {
    try {
      return String(map.get(prop)) === 'auto';
    } catch {
      return false;
    }
  };
  return {
    top: isAuto('margin-top') ? 0 : margin.top,
    right: isAuto('margin-right') ? 0 : margin.right,
    bottom: isAuto('margin-bottom') ? 0 : margin.bottom,
    left: isAuto('margin-left') ? 0 : margin.left,
  };
}

function renderRect(rect: ILineRect, origin: IBox): string {
  const left = rect.x - origin.x;
  const top = rect.y - origin.y;
  const box = `<div class="sll sll-${rect.kind}" style="left:${left}px;top:${top}px;width:${rect.w}px;height:${rect.h}px"></div>`;
  if (!rect.label) return box;
  const x = left + rect.w / 2;
  const y = rect.kind === 'column' ? top + 2 : top + rect.h / 2;
  return `${box}<span class="sll-label sll-label-${rect.kind}" style="left:${x}px;top:${y}px">${rect.label}</span>`;
}
