/// <mls fileReference="_102020_/l2/aura/studio/studioAnnotate.ts" enhancement="_blank" />
// Annotating the page on screen. Two tools, two kinds of annotation:
//  - the RECTANGLE marks ELEMENTS: what it encloses becomes the elements of the code (studioAnnotateCore), numbered,
//    with a note. Those go to agentEditPage, which plans and patches only their methods. The stroke disappears; a
//    dashed box follows each element.
//  - the PEN draws FREELY. Each time the pen is taken up is a NEW DRAWING (a story of its own): its strokes stay on
//    the page, anchored to the page element so they scroll with it, and the drawn area becomes an IMAGE — the page
//    with the strokes over it — listed in the AI tab. Images do NOT go to the agent yet (the agents cannot receive
//    images); the panel says so.
//
// While the pen is in hand, everything else is hidden (the boxes of the marks, the earlier drawings): the person is
// telling one story. Leaving the pen (rectangle, Done, Esc) brings the rest back.
//
// Owned by the editor: created when it arms, destroyed with everything else. What it puts in the client app, and
// gives back: ONE layer on the body, the size of the visible part of the region (it clips, like the layout lines),
// and one stylesheet in the head (`san-` classes). While annotating, the drawing surface takes the pointer: the page
// under it gets no click, so nothing is selected. Out of annotation only the boxes, the strokes and an open balloon
// show, and every event goes through.
//
// The image is WHAT WAS ON SCREEN when the drawing was made — the visible part of the page — with the drawing over
// it. It is taken with html-to-image, loaded from jsdelivr on the first capture with its version pinned (the way the
// Studio loads the Tailwind JIT), rendering only the smallest part of the page that holds that view. A capture that
// fails or takes too long says WHY in the AI tab; there is no stand-in image.

import {
  beautifyStroke,
  markLimitRefusal,
  mergeArrowHead,
  MAX_MARKED_ELEMENTS,
  MAX_MARKS,
  resolveStroke,
  strokeArea,
  strokePath,
  type AnnotateTool,
  type IAnnotBox,
  type IPoint,
} from '/_102020_/l2/aura/studio/studioAnnotateCore.js';
import { publishAnnotState, type AnnotCommand, type IAnnotDrawing, type IAnnotElement, type IAnnotMark } from '/_102020_/l2/aura/studio/studioAnnotateStore.js';
import { clippingAncestors, visibleRegionOf } from '/_102020_/l2/aura/studio/studioLayoutLines.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

const STYLE_ID = 'se-annotate-style';

/** The page-to-image library, pinned (a moving tag would change the capture under us). */
export const IMAGE_LIB_URL = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm';
/** Widest image kept, in image pixels: sharp on a high-density screen, not a screenshot archive. */
const IMAGE_MAX_WIDTH = 1920;
/** Densest capture: the screen's own density, up to 2x (beyond it the image grows and nobody sees the difference). */
const MAX_PIXEL_RATIO = 2;
/** Largest side of the rendered canvas (px): browsers refuse canvases much bigger, and the capture would fail. */
const MAX_CANVAS_SIDE = 16000;
// The image of a drawing is made when the drawing ENDS (Done, Esc, the rectangle) — never while the pen is in hand.
// Rendering the page holds the browser for a moment; started mid-drawing (after a pause), it froze the next stroke.
/** A capture still running after this is given up: the image keeps the strokes alone. */
export const CAPTURE_TIMEOUT_MS = 15000;
const INK = '#ef4444';
/** A small V drawn this soon after a straight line, near one of its ends, is that line's arrow head. */
const ARROW_HEAD_WINDOW_MS = 2500;

interface IImageLib {
  toCanvas: (node: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
}

let imageLib: Promise<IImageLib> | null = null;

function loadImageLib(): Promise<IImageLib> {
  if (!imageLib) {
    imageLib = (import(/* @vite-ignore */ IMAGE_LIB_URL) as Promise<IImageLib>).catch((error) => {
      imageLib = null;
      throw error;
    });
  }
  return imageLib;
}

/** Rejects after `ms`: a capture must END, one way or the other. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`capture took more than ${ms}ms`)), ms);
    work.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

/** The box of what an element SHOWS — its text and children — not the whole block (a title is as wide as its row). */
function contentBox(el: HTMLElement): IAnnotBox {
  const r = el.getBoundingClientRect();
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const c = range.getBoundingClientRect();
    if (c.width > 0 && c.height > 0) {
      const x = Math.max(r.left, c.left);
      const y = Math.max(r.top, c.top);
      const w = Math.min(r.right, c.right) - x;
      const h = Math.min(r.bottom, c.bottom) - y;
      if (w > 0 && h > 0) return { x, y, w, h };
    }
  } catch { /* the element box, then */ }
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/**
 * The smallest element under `root` whose box holds `area` (viewport coordinates): what is rendered for a drawing's
 * image. Walks down while one child still holds the whole area.
 */
function smallestHolder(root: HTMLElement, area: IAnnotBox): HTMLElement {
  let node = root;
  for (let guard = 0; guard < 64; guard += 1) {
    const next = Array.from(node.children).find((child): child is HTMLElement => {
      if (!(child instanceof HTMLElement)) return false;
      const r = child.getBoundingClientRect();
      return r.left <= area.x && r.top <= area.y && r.right >= area.x + area.w && r.bottom >= area.y + area.h;
    });
    if (!next) break;
    node = next;
  }
  return node;
}

/**
 * The color behind an element as the person sees it: its own background or the first ancestor's that is not
 * transparent. A page is usually transparent and takes the app's dark or light background from around it — rendered
 * alone, it came out on white and the light text of a dark theme disappeared.
 */
function backdropOf(el: Element): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== 'transparent' && !/rgba\([^)]*,\s*0\)$/u.test(color)) return color;
  }
  return '#ffffff';
}

const CSS = `
.san-layer { position: fixed; overflow: hidden; pointer-events: none; z-index: 99993; }
.san-surface { position: absolute; inset: 0; pointer-events: auto; cursor: crosshair; }
.san-surface svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.san-ink { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.san-box { position: absolute; border: 2px dashed #ec4899; border-radius: 8px; background: rgba(236,72,153,0.05); pointer-events: none; }
.san-box.san-focused { border-style: solid; background: rgba(236,72,153,0.10); }
.san-num { position: absolute; top: -11px; left: -11px; width: 20px; height: 20px; border-radius: 9999px; background: #ec4899; color: #fff; font: 700 11px/20px system-ui, sans-serif; text-align: center; pointer-events: auto; cursor: pointer; }
.san-bar { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 9999px; background: #fff; color: #111827; border: 1px solid #e5e7eb; box-shadow: 0 6px 20px rgba(0,0,0,0.18); font: 12px system-ui, sans-serif; pointer-events: auto; white-space: nowrap; }
.san-bar .san-dot { width: 22px; height: 22px; border-radius: 9999px; background: #ec4899; color: #fff; display: grid; place-items: center; }
.san-bar button { border: 0; background: transparent; padding: 4px 8px; border-radius: 9999px; cursor: pointer; font: inherit; color: inherit; }
.san-bar button:hover { background: #f3f4f6; }
.san-bar button.san-on { background: #fce7f3; color: #be185d; }
.san-bar button.san-done { background: #4f46e5; color: #fff; }
.san-bar .san-sep { width: 1px; height: 16px; background: #d1d5db; margin: 0 2px; }
.san-msg { position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%); padding: 4px 10px; border-radius: 6px; background: #111827; color: #fff; font: 11px system-ui, sans-serif; pointer-events: none; white-space: nowrap; }
.san-pop { position: absolute; width: 260px; padding: 8px; border-radius: 8px; background: #fff; color: #111827; border: 1px solid #e5e7eb; box-shadow: 0 10px 30px rgba(0,0,0,0.2); font: 12px system-ui, sans-serif; pointer-events: auto; }
.san-pop .san-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-weight: 600; }
.san-pop .san-head .san-num { position: static; display: inline-block; flex: 0 0 20px; }
.san-pop .san-head span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.san-pop .san-row { display: flex; gap: 4px; margin-bottom: 6px; }
.san-pop button { border: 1px solid #d1d5db; background: #fff; border-radius: 4px; padding: 1px 6px; cursor: pointer; font: inherit; }
.san-pop button:disabled { opacity: 0.4; cursor: default; }
.san-pop textarea { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 4px; padding: 4px 6px; font: inherit; resize: vertical; }
.san-pop .san-warn { color: #b45309; margin-bottom: 6px; }
.san-pop .san-foot { display: flex; justify-content: space-between; margin-top: 6px; }
.san-pop .san-remove { border: 0; color: #dc2626; padding: 0; background: transparent; }
.san-pop .san-ok { background: #4f46e5; color: #fff; border-color: #4f46e5; }
`;

export interface IAnnotateContext {
  host: HTMLElement;
  /** What a click could select, with a box, in document order (the page's own element excluded). */
  candidates: () => HTMLElement[];
  /** The element as the agent takes it, plus the panel's label and whether it is an item of a list. */
  describe: (el: HTMLElement) => IAnnotElement & { repeated: boolean };
  /** The selectable element around this one (not the page itself); null at the top. */
  parentOf: (el: HTMLElement) => HTMLElement | null;
  /** The page the marks belong to; a different answer means the page changed under them. */
  pageKey: () => string;
  /** The file of that page, as the panel identifies pages. */
  pageFile: () => { project: number; folder: string; shortName: string } | null;
  /** The editor's chrome class: the layer is never selectable, never counted. */
  controlClass: string;
  /** The page's own element: the pen's strokes are anchored to it, and the images are taken of it. */
  page: () => HTMLElement | null;
}

interface IDrawing {
  id: number;
  /** In the anchor's own coordinates (see `anchor`), so they move with the page. */
  strokes: IPoint[][];
  /** What was on screen at the last stroke, in the same coordinates: the image is of this. */
  view: IAnnotBox | null;
  note: string;
  image: string;
  capturing: boolean;
  failed: boolean;
  /** Why the image could not be made, as the browser said it. */
  error: string;
  /** Changed since its image was made: the image is retaken when the drawing ends. */
  pending: boolean;
  timer: number | null;
  /** Which capture is the current one: an older one finishing late is ignored. */
  token: number;
}

interface IMark {
  n: number;
  note: string;
  els: HTMLElement[];
}

type UndoStep = { kind: 'mark' } | { kind: 'stroke'; drawing: IDrawing };

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export class StudioAnnotate {
  private active = false;
  private tool: AnnotateTool = 'pen';
  private marks: IMark[] = [];
  private focused: number | null = null;
  private stroke: IPoint[] | null = null;
  private message = '';
  private messageTimer: number | null = null;
  private layer: HTMLDivElement | null = null;
  private frame: number | null = null;
  /** The box drawn over each marked element (rebuilt when the marks change, moved every frame). */
  private boxes: { el: HTMLElement; box: HTMLDivElement }[] = [];
  private page = '';
  private origin: IAnnotBox = { x: 0, y: 0, w: 0, h: 0 };
  /** The balloon takes the keyboard only when it OPENS — a repaint while the panel's copy is typed must not. */
  private focusNote = false;
  /** Every drawing of the page, oldest first. */
  private drawings: IDrawing[] = [];
  /** The drawing the pen is telling now; null until the first stroke after the pen is taken up. */
  private penDrawing: IDrawing | null = null;
  private nextDrawingId = 1;
  /** What each undo takes back, last first: a mark, or a stroke of a drawing. */
  private undoStack: UndoStep[] = [];
  private ink: SVGSVGElement | null = null;
  /** Bumped on every change of what the strokes show; the ink is redrawn only when it (or the page offset) moves. */
  private inkVersion = 0;
  private inkKey = '';
  /** The ancestors that clip the region, read once per layer: reading styles every frame was what cost. */
  private clips: Element[] = [];
  /** When the last pen stroke ended: a V right after a line is its arrow head. */
  private lastPenStrokeAt = 0;

  constructor(private readonly ctx: IAnnotateContext) {
    this.page = ctx.pageKey();
    this.publish();
  }

  public isActive(): boolean {
    return this.active;
  }

  /** The AI tab's commands (studioAnnotateStore). */
  public command(command: AnnotCommand): void {
    switch (command.kind) {
      case 'start': this.start(); break;
      case 'stop': this.stop(); break;
      case 'clear': this.clear(); break;
      case 'note': this.setNote(command.n, command.note, false); break;
      case 'remove': this.remove(command.n); break;
      case 'focus': this.focus(command.n); break;
      case 'drawingNote': {
        const drawing = this.drawings.find((each) => each.id === command.id);
        if (drawing) {
          drawing.note = command.note.slice(0, 500);
          this.publish();
        }
        break;
      }
      case 'removeDrawing': this.removeDrawing(command.id); break;
    }
  }

  /**
   * The annotation's own ear for its keys, on the window in capture, while annotating. The editor forwards them too
   * (and first, so its own Ctrl+Z never undoes a class edit meanwhile); when it did, the event is marked handled and
   * this one stands back — one key, one undo. When the key never reaches the editor, this one is the way.
   */
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;
    if (this.handleKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  public start(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.onKey, true);
    // Taking the pen up again is a new story.
    this.penDrawing = null;
    this.inkVersion += 1;
    this.ensureLayer();
    this.renderChrome();
    this.publish();
  }

  /** Leaves the annotation; the marks and drawings stay (on the page, and in the AI tab). */
  public stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.onKey, true);
    this.stroke = null;
    this.focused = null;
    this.endPenStory();
    this.renderChrome();
    this.publish();
    if (!this.marks.length && !this.drawings.length) this.removeLayer();
  }

  public clear(): void {
    this.marks = [];
    this.focused = null;
    this.dropDrawings();
    this.undoStack = [];
    this.renderChrome();
    this.publish();
    if (!this.active) this.removeLayer();
  }

  public undo(): void {
    const last = this.undoStack.pop();
    if (last?.kind === 'stroke') {
      const drawing = last.drawing;
      drawing.strokes.pop();
      if (drawing.strokes.length) this.drawingChanged(drawing);
      else this.forgetDrawing(drawing);
    } else if (last?.kind === 'mark') {
      this.marks.pop();
    }
    this.renumber();
    this.focused = null;
    this.renderChrome();
    this.publish();
  }

  /** The keys while annotating: Esc leaves (or closes the balloon), Ctrl+Z undoes the last mark or stroke. */
  public handleKey(e: KeyboardEvent): boolean {
    if (!this.active) return false;
    // A field (the balloon's note, the AI tab's inputs) keeps its own undo.
    const tag = (e.composedPath?.()[0] as HTMLElement | undefined)?.tagName;
    const typing = tag === 'TEXTAREA' || tag === 'INPUT';
    if (e.key === 'Escape') {
      if (this.focused !== null) this.focusNone();
      else this.stop();
      return true;
    }
    if (!typing && (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
      this.undo();
      return true;
    }
    return false;
  }

  /** The page under the marks changed (navigation, another nav3 tab): they belong to the old one. */
  public pageChanged(): void {
    const key = this.ctx.pageKey();
    if (key === this.page) return;
    this.page = key;
    this.marks = [];
    this.focused = null;
    this.dropDrawings();
    this.undoStack = [];
    this.stop();
    this.removeLayer();
    this.publish();
  }

  public destroy(): void {
    this.active = false;
    window.removeEventListener('keydown', this.onKey, true);
    this.marks = [];
    this.dropDrawings();
    this.removeLayer();
    if (this.messageTimer !== null) clearTimeout(this.messageTimer);
    document.getElementById(STYLE_ID)?.remove();
  }

  // ─── Tools ────────────────────────────────────────────────────────────────

  /** The pen in hand hides the rest; leaving it brings the rest back, and the next pen is a new drawing. */
  private setTool(tool: AnnotateTool): void {
    if (tool === this.tool) return;
    this.tool = tool;
    this.endPenStory();
    this.focused = null;
    this.renderChrome();
    this.publish();
  }

  /** In the pen's story, only its own strokes show. */
  private penOnly(): boolean {
    return this.active && this.tool === 'pen';
  }

  /**
   * What the drawings are anchored to and taken of: the page's own element when it has a box, else the region host.
   * In the Studio the page can be a custom element with no box of its own (`display: contents`): anchored there, a
   * drawing had no area, and its image could not even be attempted.
   */
  private anchor(): HTMLElement {
    const page = this.ctx.page();
    const r = page?.getBoundingClientRect();
    return page && r && r.width > 0 && r.height > 0 ? page : this.ctx.host;
  }

  // ─── Marks (rectangle) ────────────────────────────────────────────────────

  private addStroke(points: IPoint[]): void {
    const area = strokeArea(points, this.tool);
    if (!area) return;
    if (this.tool === 'pen') {
      this.addPenStroke(points);
      return;
    }
    // The stroke is in layer coordinates; the boxes are measured in the viewport.
    const viewportArea = { x: area.x + this.origin.x, y: area.y + this.origin.y, w: area.w, h: area.h };
    const els = resolveStroke(viewportArea, this.ctx.candidates(), {
      box: contentBox,
      contains: (outer, inner) => outer !== inner && outer.contains(inner),
    });
    if (!els.length) {
      this.say(t('annot.nothing'));
      return;
    }
    const refusal = markLimitRefusal(this.marks.map((mark) => ({ elements: mark.els })), els.length);
    if (refusal) {
      this.say(refusal === 'marks' ? t('annot.limitMarks', { max: MAX_MARKS }) : t('annot.limitElements', { max: MAX_MARKED_ELEMENTS }));
      return;
    }
    this.marks.push({ n: this.marks.length + 1, note: '', els });
    this.undoStack.push({ kind: 'mark' });
    this.focused = this.marks.length;
    this.focusNote = true;
    this.renderChrome();
    this.publish();
  }

  private setNote(n: number, note: string, fromBalloon: boolean): void {
    const mark = this.marks.find((each) => each.n === n);
    if (!mark) return;
    mark.note = note.slice(0, 500);
    // Typing in the balloon must not rebuild it (the caret would be lost); the panel's copy re-renders.
    if (!fromBalloon) this.renderChrome();
    this.publish();
  }

  private remove(n: number): void {
    this.marks = this.marks.filter((mark) => mark.n !== n);
    this.renumber();
    this.focused = null;
    this.renderChrome();
    this.publish();
    if (!this.active && !this.marks.length && !this.drawings.length) this.removeLayer();
  }

  private focus(n: number): void {
    if (!this.marks.some((mark) => mark.n === n)) return;
    // A mark is looked at outside the pen's story.
    if (this.penOnly()) this.setTool('rect');
    this.focused = n;
    this.focusNote = true;
    this.ensureLayer();
    const first = this.marks.find((mark) => mark.n === n)?.els[0];
    if (first?.isConnected && first.getClientRects().length) first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.renderChrome();
    this.publish();
  }

  private focusNone(): void {
    this.focused = null;
    this.renderChrome();
    this.publish();
  }

  /** ↑ bigger: the element around; ↓ smaller: the selectable elements directly inside. */
  private regrow(n: number, way: 'up' | 'down'): void {
    const mark = this.marks.find((each) => each.n === n);
    if (!mark || mark.els.length !== 1) return;
    const el = mark.els[0];
    let next: HTMLElement[] = [];
    if (way === 'up') {
      const parent = this.ctx.parentOf(el);
      if (parent) next = [parent];
    } else {
      next = this.ctx.candidates().filter((each) => this.ctx.parentOf(each) === el);
    }
    if (!next.length) return;
    const others = this.marks.filter((each) => each !== mark).map((each) => ({ elements: each.els }));
    if (markLimitRefusal(others, next.length) === 'elements') {
      this.say(t('annot.limitElements', { max: MAX_MARKED_ELEMENTS }));
      return;
    }
    mark.els = next;
    this.renderChrome();
    this.publish();
  }

  private renumber(): void {
    this.marks.forEach((mark, i) => { mark.n = i + 1; });
  }

  // ─── Drawings (pen) ───────────────────────────────────────────────────────

  /** A pen stroke joins the drawing being told (a new one after the pen is taken up), anchored to the page. */
  private addPenStroke(points: IPoint[]): void {
    const ar = this.anchor().getBoundingClientRect();
    const raw = points.map((point) => ({ x: point.x + this.origin.x - ar.left, y: point.y + this.origin.y - ar.top }));
    // A small V right after a straight line, near one of its ends: the line becomes an arrow to that end.
    const drawing = this.penDrawing;
    const previous = drawing?.strokes[drawing.strokes.length - 1];
    if (drawing && previous && Date.now() - this.lastPenStrokeAt <= ARROW_HEAD_WINDOW_MS) {
      const arrow = mergeArrowHead(previous, raw);
      if (arrow) {
        drawing.strokes[drawing.strokes.length - 1] = arrow;
        this.lastPenStrokeAt = 0;
        this.drawingChanged(drawing);
        this.publish();
        return;
      }
    }
    // A closed loop becomes the clean ellipse or rectangle it means, a one-stroke arrow a clean arrow, a nearly
    // straight stroke a straight line; anything else stays as drawn.
    const anchored = beautifyStroke(raw);
    this.lastPenStrokeAt = Date.now();
    if (!this.penDrawing) {
      this.penDrawing = { id: this.nextDrawingId++, strokes: [], view: null, note: '', image: '', capturing: false, failed: false, error: '', timer: null, token: 0, pending: false };
      this.drawings.push(this.penDrawing);
    }
    this.penDrawing.strokes.push(anchored);
    // The image is of what the person is looking at while drawing.
    this.penDrawing.view = { x: this.origin.x - ar.left, y: this.origin.y - ar.top, w: this.origin.w, h: this.origin.h };
    this.undoStack.push({ kind: 'stroke', drawing: this.penDrawing });
    this.drawingChanged(this.penDrawing);
    this.publish();
  }

  private removeDrawing(id: number): void {
    const drawing = this.drawings.find((each) => each.id === id);
    if (!drawing) return;
    this.forgetDrawing(drawing);
    this.renderChrome();
    this.publish();
    if (!this.active && !this.marks.length && !this.drawings.length) this.removeLayer();
  }

  /** Takes a drawing out: its capture is cancelled, its strokes leave the undo stack. */
  private forgetDrawing(drawing: IDrawing): void {
    if (drawing.timer !== null) clearTimeout(drawing.timer);
    drawing.token += 1;
    this.drawings = this.drawings.filter((each) => each !== drawing);
    this.undoStack = this.undoStack.filter((step) => step.kind !== 'stroke' || step.drawing !== drawing);
    if (this.penDrawing === drawing) this.penDrawing = null;
    this.inkVersion += 1;
  }

  private dropDrawings(): void {
    for (const drawing of [...this.drawings]) this.forgetDrawing(drawing);
    this.penDrawing = null;
  }

  /**
   * A drawing changed: its image is out of date. The drawing still in the pen's hand waits for its story to end; any
   * other (an undo after Done) is retaken right away.
   */
  private drawingChanged(drawing: IDrawing): void {
    drawing.pending = true;
    this.inkVersion += 1;
    if (drawing !== this.penDrawing) this.requestCapture(drawing);
  }

  /** The pen's story ends (Done, Esc, the rectangle): its image is made now, once. */
  private endPenStory(): void {
    const drawing = this.penDrawing;
    this.penDrawing = null;
    this.inkVersion += 1;
    if (drawing?.pending) this.requestCapture(drawing);
  }

  private requestCapture(drawing: IDrawing): void {
    drawing.pending = false;
    drawing.capturing = true;
    if (drawing.timer !== null) clearTimeout(drawing.timer);
    // On the next task, so the gesture that ended the story (a click, a key) is painted before the capture runs.
    drawing.timer = window.setTimeout(() => {
      drawing.timer = null;
      void this.capture(drawing);
    }, 50);
  }

  /**
   * The image of a drawing: what was on screen when it was made (its `view`) with the drawing over it. The smallest
   * part of the page that holds that view is rendered (html-to-image) and cut to it. ALWAYS ends: a failure or a
   * timeout records the browser's reason, which the AI tab shows.
   */
  private async capture(drawing: IDrawing): Promise<void> {
    const token = ++drawing.token;
    const finish = (image: string, error: string): void => {
      // A newer capture of the same drawing, or the drawing went away, while this one ran.
      if (token !== drawing.token || !this.drawings.includes(drawing)) return;
      drawing.image = image;
      drawing.capturing = false;
      drawing.failed = Boolean(error);
      drawing.error = error;
      this.publish();
    };
    const view = drawing.view;
    if (!view || view.w < 1 || view.h < 1) {
      finish('', 'nothing of the page was on screen');
      return;
    }
    const anchor = this.anchor();
    const ar = anchor.getBoundingClientRect();
    // The part of the page to render: the smallest element that holds the view (viewport coordinates).
    const holder = smallestHolder(anchor, { x: ar.left + view.x, y: ar.top + view.y, w: view.w, h: view.h });
    const hr = holder.getBoundingClientRect();
    const offset = { x: hr.left - ar.left, y: hr.top - ar.top, w: hr.width, background: backdropOf(holder) };
    // The screen's density (sharp text on a 2x screen), lowered when the part to render is so tall that the canvas
    // would pass what the browser accepts.
    const density = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    const pixelRatio = Math.max(0.5, Math.min(density, MAX_CANVAS_SIDE / Math.max(1, hr.width), MAX_CANVAS_SIDE / Math.max(1, hr.height)));
    try {
      const lib = await withTimeout(loadImageLib(), CAPTURE_TIMEOUT_MS);
      const control = this.ctx.controlClass;
      const options = {
        pixelRatio,
        cacheBust: false,
        backgroundColor: offset.background,
        // An image that cannot be fetched becomes a blank pixel instead of failing (or hanging) the capture.
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
        // Our own chrome never goes into the picture.
        filter: (node: unknown) => !(node instanceof Element && node.classList.contains(control)),
      };
      // With the page's own fonts first (what is on screen); fonts that do not come in time are left out on a second
      // try, so a slow font costs fidelity, never the image.
      let shot: HTMLCanvasElement;
      try {
        shot = await withTimeout(lib.toCanvas(holder, options), CAPTURE_TIMEOUT_MS / 2);
      } catch (error) {
        console.warn('[studioAnnotate] capture with the page fonts failed or was slow; trying without them', error);
        shot = await withTimeout(lib.toCanvas(holder, { ...options, skipFonts: true }), CAPTURE_TIMEOUT_MS / 2);
      }
      const image = this.drawImage({ canvas: shot, ...offset }, view, drawing.strokes, pixelRatio);
      finish(image, image ? '' : 'the captured image could not be read (an image of another site in the page)');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn('[studioAnnotate] the page could not be captured:', error);
      finish('', reason || 'unknown error');
    }
  }

  /**
   * Cuts the rendered part of the page to `bounds` and draws the strokes over it: a PNG data URL, or '' when the
   * canvas cannot be read. `bounds` and the strokes are in the anchor's coordinates; the shot starts at `shot.x/y`.
   */
  private drawImage(shot: { canvas: HTMLCanvasElement; x: number; y: number; w: number; background: string }, bounds: IAnnotBox, strokes: IPoint[][], density: number): string {
    // Image pixels per page pixel: the captured density, never upscaled, and only reduced past the widest image kept.
    const scale = Math.min(density, IMAGE_MAX_WIDTH / bounds.w);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bounds.w * scale));
    canvas.height = Math.max(1, Math.round(bounds.h * scale));
    const g = canvas.getContext('2d');
    if (!g) return '';
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.fillStyle = shot.background;
    g.fillRect(0, 0, canvas.width, canvas.height);
    // The shot may be in device pixels: page px → shot px.
    const k = shot.canvas.width / Math.max(1, shot.w);
    g.drawImage(shot.canvas, (bounds.x - shot.x) * k, (bounds.y - shot.y) * k, bounds.w * k, bounds.h * k, 0, 0, canvas.width, canvas.height);
    g.strokeStyle = INK;
    g.lineWidth = Math.max(2, 3 * scale);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const stroke of strokes) {
      g.beginPath();
      stroke.forEach((point, i) => {
        const x = (point.x - bounds.x) * scale;
        const y = (point.y - bounds.y) * scale;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
    }
    try {
      return canvas.toDataURL('image/png');
    } catch {
      // A tainted canvas: an image of another origin in the page.
      return '';
    }
  }

  // ─── Feedback and state ───────────────────────────────────────────────────

  private say(text: string): void {
    this.message = text;
    if (this.messageTimer !== null) clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => {
      this.messageTimer = null;
      this.message = '';
      this.renderChrome();
    }, 3500);
    this.renderChrome();
  }

  /** The marks and drawings as data, for the AI tab. A mark whose elements all left the page is dropped here. */
  private publish(): void {
    this.marks = this.marks.filter((mark) => mark.els.some((el) => el.isConnected));
    this.renumber();
    const marks: IAnnotMark[] = this.marks.map((mark) => {
      const described = mark.els.filter((el) => el.isConnected).map((el) => this.ctx.describe(el));
      return {
        n: mark.n,
        note: mark.note,
        elements: described.map(({ repeated: _repeated, ...element }) => element),
        repeated: described.some((element) => element.repeated),
      };
    });
    const drawings: IAnnotDrawing[] = this.drawings.map((drawing) => ({
      id: drawing.id,
      image: drawing.image,
      note: drawing.note,
      strokes: drawing.strokes.length,
      capturing: drawing.capturing,
      failed: drawing.failed,
      error: drawing.error,
      pending: drawing.pending,
    }));
    publishAnnotState({ available: true, active: this.active, marks, focused: this.focused, page: this.page, file: this.ctx.pageFile(), drawings });
  }

  // ─── The layer ────────────────────────────────────────────────────────────

  private ensureLayer(): void {
    if (this.layer) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.layer = document.createElement('div');
    this.layer.className = `${this.ctx.controlClass} san-layer`;
    document.body.appendChild(this.layer);
    this.clips = clippingAncestors(this.ctx.host);
    // Followed EVERY FRAME, not on events: in the Studio the page moves in ways no single event reports — a
    // scroll inside another container, a remount, content that loads later, an animation. Events left the boxes
    // behind the page; at most ten boxes, a frame-by-frame look is cheap and always right.
    this.frame = requestAnimationFrame(this.follow);
  }

  private removeLayer(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.boxes = [];
    this.layer?.remove();
    this.layer = null;
  }

  private readonly follow = (): void => {
    this.frame = null;
    if (!this.layer) return;
    this.place();
    if (this.layer) this.frame = requestAnimationFrame(this.follow);
  };

  /** Rebuilds the bar, the balloon and the drawing surface (state changed), then places everything. */
  private renderChrome(): void {
    const layer = this.layer;
    if (!layer) return;
    layer.innerHTML = '';
    if (this.active) layer.appendChild(this.renderSurface());
    this.ink = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.ink.setAttribute('class', 'san-ink');
    this.inkKey = '';
    layer.appendChild(this.ink);
    layer.appendChild(this.renderBoxes());
    const balloon = this.penOnly() ? null : this.renderBalloon();
    if (balloon) layer.appendChild(balloon);
    if (this.active) layer.appendChild(this.renderBar());
    if (this.active && this.message) layer.appendChild(Object.assign(document.createElement('div'), { className: 'san-msg', textContent: this.message }));
    this.place();
  }

  /** One box per marked element, built when the marks change; `place` only moves them. */
  private renderBoxes(): HTMLElement {
    const container = Object.assign(document.createElement('div'), { className: 'san-boxes' });
    this.boxes = [];
    for (const mark of this.marks) {
      mark.els.forEach((el, i) => {
        const box = document.createElement('div');
        box.className = `san-box${mark.n === this.focused ? ' san-focused' : ''}`;
        if (i === 0) {
          const num = Object.assign(document.createElement('span'), { className: 'san-num', textContent: String(mark.n) });
          num.addEventListener('click', (e) => {
            e.stopPropagation();
            this.focus(mark.n);
          });
          box.appendChild(num);
        }
        container.appendChild(box);
        this.boxes.push({ el, box });
      });
    }
    return container;
  }

  /** Positions the layer over the visible region, and every box and stroke over the page. Runs every frame. */
  private place(): void {
    const layer = this.layer;
    if (!layer) return;
    // The page under the marks changed: they belong to the old one.
    if (this.ctx.pageKey() !== this.page) {
      this.pageChanged();
      return;
    }
    const region = visibleRegionOf(this.ctx.host, this.clips);
    if (!region) {
      layer.style.display = 'none';
      return;
    }
    layer.style.display = '';
    this.origin = region;
    Object.assign(layer.style, { left: `${region.x}px`, top: `${region.y}px`, width: `${region.w}px`, height: `${region.h}px` });
    const penOnly = this.penOnly();

    // The strokes follow the page element they are anchored to. With the pen in hand, only its own drawing.
    if (this.ink) {
      const pr = this.anchor().getBoundingClientRect();
      const dx = pr ? pr.left - region.x : 0;
      const dy = pr ? pr.top - region.y : 0;
      const shown = penOnly ? (this.penDrawing ? [this.penDrawing] : []) : this.drawings;
      // Redrawn only when something it shows changed — a stroke, an undo, the tool — or the page moved.
      const key = `${Math.round(dx)},${Math.round(dy)},${penOnly},${this.inkVersion}`;
      if (key !== this.inkKey) {
        this.inkKey = key;
        this.ink.innerHTML = pr
          ? shown.flatMap((drawing) => drawing.strokes).map((stroke) => `<path d="${strokePath(stroke.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })), 'pen')}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`).join('')
          : '';
      }
    }
    for (const { el, box } of this.boxes) {
      const r = el.isConnected ? el.getBoundingClientRect() : null;
      if (penOnly || !r || (!r.width && !r.height)) {
        box.style.display = 'none';
        continue;
      }
      box.style.display = '';
      box.style.left = `${r.left - region.x - 4}px`;
      box.style.top = `${r.top - region.y - 4}px`;
      box.style.width = `${r.width + 8}px`;
      box.style.height = `${r.height + 8}px`;
    }

    const balloon = layer.querySelector<HTMLDivElement>('.san-pop');
    const mark = this.marks.find((each) => each.n === this.focused);
    if (balloon && mark) {
      const rects = mark.els.filter((el) => el.isConnected).map((el) => el.getBoundingClientRect());
      const bottom = rects.length ? Math.max(...rects.map((r) => r.bottom)) - region.y : 40;
      const left = rects.length ? Math.min(...rects.map((r) => r.left)) - region.x : 40;
      const top = bottom + 10 + 170 > region.h ? Math.max(8, bottom - 190) : bottom + 10;
      Object.assign(balloon.style, { left: `${Math.max(8, Math.min(left, region.w - 270))}px`, top: `${top}px` });
    }
  }

  private renderSurface(): HTMLElement {
    const surface = document.createElement('div');
    surface.className = 'san-surface';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    surface.appendChild(svg);
    const point = (e: PointerEvent): IPoint => ({ x: e.clientX - this.origin.x, y: e.clientY - this.origin.y });
    // The stroke in progress is ONE path whose `d` is updated — no markup parsed on every pointer move.
    const live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    for (const [name, value] of [['fill', 'none'], ['stroke', INK], ['stroke-width', '3'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['opacity', '0.9']]) {
      live.setAttribute(name, value);
    }
    svg.appendChild(live);
    const draw = (): void => {
      live.setAttribute('d', this.stroke ? strokePath(this.stroke, this.tool) : '');
    };
    surface.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      // Keeps the stroke when the pointer leaves the region mid-draw; a pointer that is not really pressed
      // (a pen lifted, an emulated event) refuses capture, and the stroke still works without it.
      try { surface.setPointerCapture(e.pointerId); } catch { /* no capture: fine */ }
      this.focused = null;
      this.layer?.querySelector('.san-pop')?.remove();
      this.stroke = [point(e)];
      draw();
    });
    surface.addEventListener('pointermove', (e) => {
      if (!this.stroke) return;
      this.stroke.push(point(e));
      draw();
    });
    const finish = (): void => {
      const stroke = this.stroke;
      this.stroke = null;
      draw();
      if (stroke) this.addStroke(stroke);
    };
    surface.addEventListener('pointerup', finish);
    surface.addEventListener('pointercancel', () => { this.stroke = null; draw(); });
    // A wheel over the surface still scrolls the page under it. A re-dispatched wheel event would not (an
    // untrusted event never scrolls), so the nearest scrollable box under the pointer is scrolled directly.
    surface.addEventListener('wheel', (e) => {
      surface.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      surface.style.pointerEvents = '';
      for (let node = under; node; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
          node.scrollBy(e.deltaX, e.deltaY);
          return;
        }
      }
      window.scrollBy(e.deltaX, e.deltaY);
    }, { passive: true });
    return surface;
  }

  private renderBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'san-bar';
    const button = (label: string, onClick: () => void, cls = '', title = ''): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (cls) b.className = cls;
      if (title) b.title = title;
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      return b;
    };
    const dot = Object.assign(document.createElement('span'), { className: 'san-dot', textContent: '✎', title: t('annot.hint') });
    const label = Object.assign(document.createElement('strong'), { textContent: t('annot.title') });
    const sep = (): HTMLElement => Object.assign(document.createElement('span'), { className: 'san-sep' });
    bar.append(
      dot, label,
      button(t('annot.pen'), () => this.setTool('pen'), this.tool === 'pen' ? 'san-on' : ''),
      button(t('annot.rect'), () => this.setTool('rect'), this.tool === 'rect' ? 'san-on' : ''),
      sep(),
      button('↶', () => this.undo(), '', t('annot.undo')),
      button(t('annot.clear'), () => this.clear()),
      button(t('annot.done'), () => this.stop(), 'san-done'),
    );
    return bar;
  }

  private renderBalloon(): HTMLElement | null {
    const mark = this.marks.find((each) => each.n === this.focused);
    if (!mark) return null;
    const described = mark.els.filter((el) => el.isConnected).map((el) => this.ctx.describe(el));
    const single = mark.els.length === 1 ? mark.els[0] : null;
    const canGrow = Boolean(single && this.ctx.parentOf(single));
    const canShrink = Boolean(single && this.ctx.candidates().some((each) => this.ctx.parentOf(each) === single));
    const pop = document.createElement('div');
    pop.className = 'san-pop';
    pop.innerHTML = `
      <div class="san-head"><span class="san-num">${mark.n}</span><span title="${escapeHtml(described.map((d) => d.label).join(' + '))}">${escapeHtml(described.map((d) => d.label).join(' + '))}</span></div>
      ${single ? `<div class="san-row">
        <button type="button" data-way="up" title="${escapeHtml(t('annot.growTitle'))}" ${canGrow ? '' : 'disabled'}>${escapeHtml(t('annot.grow'))}</button>
        <button type="button" data-way="down" title="${escapeHtml(t('annot.shrinkTitle'))}" ${canShrink ? '' : 'disabled'}>${escapeHtml(t('annot.shrink'))}</button>
      </div>` : ''}
      ${described.some((d) => d.repeated) ? `<div class="san-warn">${escapeHtml(t('annot.repeated'))}</div>` : ''}
      <textarea rows="2" placeholder="${escapeHtml(t('annot.notePlaceholder'))}">${escapeHtml(mark.note)}</textarea>
      <div class="san-foot"><button type="button" class="san-remove">${escapeHtml(t('annot.remove'))}</button><button type="button" class="san-ok">${escapeHtml(t('annot.ok'))}</button></div>`;
    pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    pop.querySelectorAll<HTMLButtonElement>('[data-way]').forEach((b) => b.addEventListener('click', () => this.regrow(mark.n, b.dataset.way === 'up' ? 'up' : 'down')));
    const note = pop.querySelector('textarea')!;
    note.addEventListener('input', () => this.setNote(mark.n, note.value, true));
    pop.querySelector('.san-remove')!.addEventListener('click', () => this.remove(mark.n));
    pop.querySelector('.san-ok')!.addEventListener('click', () => this.focusNone());
    if (this.focusNote) {
      this.focusNote = false;
      queueMicrotask(() => note.focus());
    }
    return pop;
  }
}
