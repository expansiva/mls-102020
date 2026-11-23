/// <mls fileReference="_102020_/l2/aura/studio/studioAnnotateCore.ts" enhancement="_blank" />
// From a stroke drawn over the page to the elements it marks. PURE: generic over the node type, so the rule is
// checked on plain boxes, with no browser.
//
// THE RULE
//  - The area of a stroke is the rectangle it encloses (a pen stroke) or the rectangle itself.
//  - The candidates are what a click could select (the caller filters by the editor's ownership rule): a molecule's
//    internal markup never shows up here, the molecule does.
//  - Marked = the candidates with most of their box inside the area, keeping only the HIGHEST ones: a circle around a
//    card gives the card, not its forty inner nodes. That is what a person means by circling.
//  - Nothing fits inside (a small stroke drawn INSIDE a box) = the smallest candidate that contains the area.

export interface IPoint {
  x: number;
  y: number;
}

export interface IAnnotBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AnnotateTool = 'pen' | 'rect';

/** Strokes smaller than this (both sides) are a slip of the hand, not a mark. */
export const MIN_STROKE = 12;
/** Share of a candidate's box that must lie inside the area for it to count as enclosed. */
export const INSIDE_SHARE = 0.7;
/** Share of the area a box must cover to "contain" a stroke drawn inside it. */
export const CONTAIN_SHARE = 0.9;
/** At most this many marks per request — the agent refuses more. */
export const MAX_MARKS = 5;
/** At most this many elements across the marks of a request — the agent refuses more. */
export const MAX_MARKED_ELEMENTS = 10;

export interface IAnnotateAccess<T> {
  box: (node: T) => IAnnotBox;
  /** True when `outer` is a strict ancestor of `inner`. */
  contains: (outer: T, inner: T) => boolean;
}

/** The area a stroke marks, or null when it is too small to mean anything. */
export function strokeArea(points: readonly IPoint[], tool: AnnotateTool): IAnnotBox | null {
  if (points.length < 2) return null;
  const used = tool === 'rect' ? [points[0], points[points.length - 1]] : points;
  const xs = used.map((p) => p.x);
  const ys = used.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  if (w < MIN_STROKE && h < MIN_STROKE) return null;
  return { x, y, w, h };
}

/** Share of `a` that lies inside `b` (0..1). */
export function insideShare(a: IAnnotBox, b: IAnnotBox): number {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (w * h) / Math.max(1, a.w * a.h);
}

/** The elements a stroke over `area` marks, in the order of `candidates` (document order). */
export function resolveStroke<T>(area: IAnnotBox, candidates: readonly T[], access: IAnnotateAccess<T>): T[] {
  const visible = candidates.filter((node) => {
    const box = access.box(node);
    return box.w > 0 && box.h > 0;
  });
  const inside = visible.filter((node) => insideShare(access.box(node), area) >= INSIDE_SHARE);
  const top = inside.filter((node) => !inside.some((other) => other !== node && access.contains(other, node)));
  if (top.length) return top;
  let best: T | null = null;
  let bestArea = Infinity;
  for (const node of visible) {
    const box = access.box(node);
    if (insideShare(area, box) < CONTAIN_SHARE) continue;
    const size = box.w * box.h;
    if (size < bestArea) {
      best = node;
      bestArea = size;
    }
  }
  return best === null ? [] : [best];
}

/** Why one more mark (with `adding` elements) cannot be added, or null when it can. */
export function markLimitRefusal(marks: readonly { elements: readonly unknown[] }[], adding: number): 'marks' | 'elements' | null {
  if (marks.length >= MAX_MARKS) return 'marks';
  const total = marks.reduce((sum, mark) => sum + mark.elements.length, 0);
  return total + adding > MAX_MARKED_ELEMENTS ? 'elements' : null;
}

/** The SVG path of a stroke, in the coordinates of its points. */
export function strokePath(points: readonly IPoint[], tool: AnnotateTool): string {
  if (!points.length) return '';
  if (tool === 'rect') {
    const a = points[0];
    const b = points[points.length - 1];
    return `M${a.x} ${a.y} H${b.x} V${b.y} H${a.x} Z`;
  }
  return `M${points.map((p) => `${round(p.x)} ${round(p.y)}`).join(' L')}`;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * The area a free drawing covers, with `pad` around it, kept inside a `w` × `h` page: what the drawing's image is
 * cut to. Null without a point.
 */
export function strokesBounds(strokes: readonly (readonly IPoint[])[], pad: number, w: number, h: number): IAnnotBox | null {
  const points = strokes.flat();
  if (!points.length) return null;
  const x0 = Math.max(0, Math.min(...points.map((p) => p.x)) - pad);
  const y0 = Math.max(0, Math.min(...points.map((p) => p.y)) - pad);
  const x1 = Math.min(w, Math.max(...points.map((p) => p.x)) + pad);
  const y1 = Math.min(h, Math.max(...points.map((p) => p.y)) + pad);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// --- Shape recognition: a closed hand-drawn loop becomes a clean ellipse or rectangle ---
//
// When a pen stroke comes back to where it started, the person drew a SHAPE, and a wobbly loop reads worse than the
// shape it means. Three measures decide, all scale-free:
//  - closed: the gap between the first and last point is small next to the stroke's size;
//  - fill: the area the loop encloses over the area of its bounding box — an ellipse covers pi/4 (about 0.79) of
//    it, a rectangle nearly all of it;
//  - fit: how far the points stray from the candidate shape (radius for the ellipse, nearest edge for the rectangle).
// The clean shape is returned as POINTS (a polyline), so everything downstream — drawing on screen, the image, undo —
// keeps treating it as a stroke.

export type RecognizedShape = 'ellipse' | 'rect' | null;

/** Smallest loop worth recognizing (px, both sides); below it a stroke is a mark, not a shape. */
export const SHAPE_MIN_SIZE = 16;
/** The ends may be this far apart, relative to the stroke's larger side, and still close the loop. */
export const SHAPE_CLOSE_GAP = 0.25;

/** Area enclosed by a polygon (shoelace), always positive. */
export function polygonArea(points: readonly IPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function boxOf(points: readonly IPoint[]): IAnnotBox {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Which clean shape a stroke means, or null for a free stroke (open, too small, or neither shape). */
export function recognizeShape(points: readonly IPoint[]): RecognizedShape {
  if (points.length < 8) return null;
  const box = boxOf(points);
  if (box.w < SHAPE_MIN_SIZE || box.h < SHAPE_MIN_SIZE) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const gap = Math.hypot(last.x - first.x, last.y - first.y);
  if (gap > SHAPE_CLOSE_GAP * Math.max(box.w, box.h)) return null;

  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  // A loop GOES AROUND its center: the angle seen from the center turns about once. A scribble back and forth
  // between two sides can close and touch every edge, but it never turns around.
  let turn = 0;
  for (let i = 1; i < points.length; i += 1) {
    let d = Math.atan2(points[i].y - cy, points[i].x - cx) - Math.atan2(points[i - 1].y - cy, points[i - 1].x - cx);
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    turn += d;
  }
  if (Math.abs(turn) < 1.6 * Math.PI) return null;
  // ...and goes around ONCE: one loop is about as long as its box perimeter (0.8 for an ellipse, 1 for a
  // rectangle). A scribble that crosses the center back and forth is many times longer.
  let length = 0;
  for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  const perimeterRatio = length / (2 * (box.w + box.h));
  if (perimeterRatio < 0.6 || perimeterRatio > 1.4) return null;
  const fill = polygonArea(points) / (box.w * box.h);
  const rx = box.w / 2;
  const ry = box.h / 2;
  // Ellipse fit: how far each point is from the ellipse inscribed in the box (1 = on it).
  const ellipseError = points.reduce((sum, p) => sum + Math.abs(Math.hypot((p.x - cx) / rx, (p.y - cy) / ry) - 1), 0) / points.length;
  // Rectangle fit: how far each point is from the nearest edge of the box, over the smaller side.
  const rectError = points.reduce((sum, p) => sum + Math.min(p.x - box.x, box.x + box.w - p.x, p.y - box.y, box.y + box.h - p.y), 0)
    / points.length / Math.min(box.w, box.h);

  if (fill < 0.55) return null;
  // The CORNERS tell a rectangle from an ellipse: a rectangle passes near the four corners of its box, an ellipse
  // stays away from them (about 0.2 of the side for a circle). Steadier than the fill on a small, shaky box.
  const corners = [[box.x, box.y], [box.x + box.w, box.y], [box.x + box.w, box.y + box.h], [box.x, box.y + box.h]];
  const cornerGap = corners.reduce((sum, [qx, qy]) => sum + Math.min(...points.map((p) => Math.hypot(p.x - qx, p.y - qy))), 0)
    / corners.length / Math.min(box.w, box.h);
  if (cornerGap <= 0.12 && rectError <= 0.1) return 'rect';
  if (ellipseError <= 0.2 && fill <= 0.9) return 'ellipse';
  return null;
}

/** The stroke as it should be drawn: the clean shape when one is recognized, the stroke itself otherwise. */
export function beautifyStroke(points: readonly IPoint[]): IPoint[] {
  const shape = recognizeShape(points);
  if (!shape) {
    // Not a closed shape: an arrow, a straight line, or the stroke as drawn.
    const arrow = recognizeArrow(points);
    if (arrow) return arrow;
    if (isStraight(points)) return [points[0], points[points.length - 1]];
    return [...points];
  }
  const box = boxOf(points);
  if (shape === 'rect') {
    return [
      { x: box.x, y: box.y }, { x: box.x + box.w, y: box.y }, { x: box.x + box.w, y: box.y + box.h },
      { x: box.x, y: box.y + box.h }, { x: box.x, y: box.y },
    ];
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const steps = 72;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return { x: cx + (box.w / 2) * Math.cos(a), y: cy + (box.h / 2) * Math.sin(a) };
  });
}

// --- Straight lines and arrows ---
//
// A nearly straight stroke (an underline, a "this goes with that") becomes a straight line. An ARROW is a line with a
// head, drawn either in ONE stroke (the shaft, then a hook at its end without lifting the pen) or in TWO (the shaft,
// then a small V near one of its ends right after). Either way it becomes a clean arrow pointing where the V was.
// Lines and arrows are returned as points too: a line is its 2 ends; an arrow is shaft-start, tip, barb, tip, barb.

/** Shortest stroke that can be a line (px): below it, a dash is a dash. */
export const LINE_MIN_LENGTH = 24;
/** How far a point may stray from the straight line, relative to its length (with a few px of hand tremor). */
export const LINE_TOLERANCE = 0.06;
/** Angle of each barb of an arrow head against the shaft. */
const ARROW_ANGLE = (28 * Math.PI) / 180;

function pathLength(points: readonly IPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return length;
}

/** Distance from `p` to the segment a–b. */
function distanceToSegment(p: IPoint, a: IPoint, b: IPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  if (!length2) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Whether a stroke is (nearly) the straight segment between its ends. */
export function isStraight(points: readonly IPoint[]): boolean {
  if (points.length < 2) return false;
  const a = points[0];
  const b = points[points.length - 1];
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  if (chord < LINE_MIN_LENGTH) return false;
  const tolerance = Math.max(4, LINE_TOLERANCE * chord);
  if (points.some((p) => distanceToSegment(p, a, b) > tolerance)) return false;
  // A stroke that goes back over itself is not a line, even if it stays near one.
  return pathLength(points) <= chord * 1.15;
}

/** A clean arrow from `start` to `tip`: the shaft, then the two barbs. */
export function arrowPoints(start: IPoint, tip: IPoint): IPoint[] {
  const length = Math.hypot(tip.x - start.x, tip.y - start.y);
  const head = Math.max(10, Math.min(28, length * 0.18));
  const back = Math.atan2(start.y - tip.y, start.x - tip.x);
  const barb = (side: number): IPoint => ({
    x: tip.x + head * Math.cos(back + side * ARROW_ANGLE),
    y: tip.y + head * Math.sin(back + side * ARROW_ANGLE),
  });
  return [start, tip, barb(1), tip, barb(-1)];
}

/**
 * A one-stroke arrow: the longest straight beginning (the shaft) followed by a short hook that stays near the shaft's
 * end (the head). Returns the clean arrow, or null.
 */
export function recognizeArrow(points: readonly IPoint[]): IPoint[] | null {
  if (points.length < 6) return null;
  for (let k = points.length - 2; k >= 2; k -= 1) {
    const shaft = points.slice(0, k + 1);
    if (!isStraight(shaft)) continue;
    const start = shaft[0];
    const tip = shaft[shaft.length - 1];
    const length = Math.hypot(tip.x - start.x, tip.y - start.y);
    const hook = points.slice(k);
    const hookLength = pathLength(hook);
    // The head is short next to the shaft, stays around the tip, and actually leaves the shaft's line.
    if (hookLength > length * 0.6 || hookLength < 8) return null;
    const reach = Math.max(...hook.map((p) => Math.hypot(p.x - tip.x, p.y - tip.y)));
    if (reach > length * 0.4) return null;
    // The barbs open SIDEWAYS from the shaft's line (not merely past its end — a line drawn on beyond the point the
    // scan cut it at is still a line) and come BACK toward the start, as the barbs of an arrow do.
    const ux = (tip.x - start.x) / length;
    const uy = (tip.y - start.y) / length;
    const side = Math.max(...hook.map((p) => Math.abs((p.x - tip.x) * uy - (p.y - tip.y) * ux)));
    const backward = Math.max(...hook.map((p) => -((p.x - tip.x) * ux + (p.y - tip.y) * uy)));
    if (side < Math.max(4, reach * 0.3) || backward < 4) return null;
    return arrowPoints(start, tip);
  }
  return null;
}

/**
 * A two-stroke arrow: `line` is a straight line already drawn (its 2 ends) and `head` the next stroke, a small V. When
 * the V is near one end of the line, the arrow points to that end. Returns the clean arrow, or null.
 */
export function mergeArrowHead(line: readonly IPoint[], head: readonly IPoint[]): IPoint[] | null {
  if (line.length !== 2 || head.length < 3) return null;
  const [a, b] = line;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const xs = head.map((p) => p.x);
  const ys = head.map((p) => p.y);
  const size = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  if (size < 8 || size > Math.max(40, length * 0.5)) return null;
  // A V turns back: its path is clearly longer than the distance between its ends... or it is a hook around a point.
  if (isStraight(head)) return null;
  const near = Math.max(20, length * 0.25);
  const distanceTo = (end: IPoint): number => Math.min(...head.map((p) => Math.hypot(p.x - end.x, p.y - end.y)));
  const toA = distanceTo(a);
  const toB = distanceTo(b);
  if (Math.min(toA, toB) > near) return null;
  return toB <= toA ? arrowPoints(a, b) : arrowPoints(b, a);
}
