/// <mls fileReference="_102020_/l2/aura/studio/studioAnnotateCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  insideShare,
  markLimitRefusal,
  MAX_MARKED_ELEMENTS,
  MAX_MARKS,
  resolveStroke,
  strokeArea,
  strokePath,
  strokesBounds,
  beautifyStroke,
  arrowPoints,
  isStraight,
  mergeArrowHead,
  polygonArea,
  recognizeShape,
  type IPoint,
  type IAnnotBox,
  type IAnnotateAccess,
} from '/_102020_/l2/aura/studio/studioAnnotateCore.js';

interface N {
  id: string;
  box: IAnnotBox;
  parent: N | null;
}

function node(id: string, box: IAnnotBox, parent: N | null = null): N {
  return { id, box, parent };
}

const access: IAnnotateAccess<N> = {
  box: (n) => n.box,
  contains: (outer, inner) => {
    for (let at = inner.parent; at; at = at.parent) if (at === outer) return true;
    return false;
  },
};

// A card with a title and a chart inside, a second card next to it with two bars.
const card = node('card', { x: 0, y: 0, w: 400, h: 300 });
const title = node('title', { x: 20, y: 20, w: 200, h: 30 }, card);
const chart = node('chart', { x: 20, y: 70, w: 360, h: 200 }, card);
const side = node('side', { x: 420, y: 0, w: 200, h: 300 });
const barA = node('barA', { x: 440, y: 40, w: 150, h: 24 }, side);
const barB = node('barB', { x: 440, y: 240, w: 40, h: 24 }, side);
const all = [card, title, chart, side, barA, barB];
const ids = (list: N[]): string[] => list.map((n) => n.id);

test('a circle around a card gives the card, not what is inside it', () => {
  assert.deepEqual(ids(resolveStroke({ x: -15, y: -15, w: 430, h: 330 }, all, access)), ['card']);
});

test('a circle around one bar gives that bar', () => {
  assert.deepEqual(ids(resolveStroke({ x: 430, y: 30, w: 170, h: 44 }, all, access)), ['barA']);
});

test('a circle around two siblings gives both, in document order', () => {
  assert.deepEqual(ids(resolveStroke({ x: 432, y: 35, w: 165, h: 235 }, all, access)), ['barA', 'barB']);
  // Covering most of their card makes it the card: the person circled the card.
  assert.deepEqual(ids(resolveStroke({ x: 410, y: -10, w: 220, h: 320 }, all, access)), ['side']);
});

test('a stroke drawn INSIDE a box gives the smallest box that contains it', () => {
  assert.deepEqual(ids(resolveStroke({ x: 100, y: 120, w: 60, h: 40 }, all, access)), ['chart']);
  assert.deepEqual(ids(resolveStroke({ x: 2000, y: 2000, w: 50, h: 50 }, all, access)), [], 'outside everything: nothing');
});

test('elements with no box are never marked', () => {
  const hidden = node('hidden', { x: 0, y: 0, w: 0, h: 0 }, card);
  assert.deepEqual(ids(resolveStroke({ x: -5, y: -5, w: 30, h: 30 }, [hidden], access)), []);
});

test('the area of a stroke, and a slip is not a mark', () => {
  assert.deepEqual(strokeArea([{ x: 10, y: 10 }, { x: 50, y: 5 }, { x: 30, y: 90 }], 'pen'), { x: 10, y: 5, w: 40, h: 85 });
  assert.deepEqual(strokeArea([{ x: 50, y: 50 }, { x: 0, y: 0 }], 'rect'), { x: 0, y: 0, w: 50, h: 50 });
  assert.equal(strokeArea([{ x: 0, y: 0 }, { x: 3, y: 4 }], 'pen'), null);
  assert.equal(strokeArea([{ x: 0, y: 0 }], 'pen'), null);
});

test('share inside', () => {
  assert.equal(insideShare({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 5, h: 10 }), 0.5);
});

test('the limits the agent enforces are enforced before sending', () => {
  const one = { elements: [1] };
  assert.equal(markLimitRefusal([], 1), null);
  assert.equal(markLimitRefusal(Array.from({ length: MAX_MARKS }, () => one), 1), 'marks');
  assert.equal(markLimitRefusal([{ elements: Array.from({ length: MAX_MARKED_ELEMENTS - 1 }, () => 1) }], 2), 'elements');
});

test('stroke paths', () => {
  assert.equal(strokePath([{ x: 0, y: 0 }, { x: 10, y: 20 }], 'rect'), 'M0 0 H10 V20 H0 Z');
  assert.equal(strokePath([{ x: 0, y: 0 }, { x: 1.25, y: 2 }], 'pen'), 'M0 0 L1.3 2');
});

test('a drawing is cut to its strokes, padded, inside the page', () => {
  assert.deepEqual(strokesBounds([[{ x: 50, y: 40 }, { x: 90, y: 60 }], [{ x: 200, y: 10 }]], 20, 1000, 1000), { x: 30, y: 0, w: 190, h: 80 });
  assert.deepEqual(strokesBounds([[{ x: 990, y: 990 }]], 20, 1000, 1000), { x: 970, y: 970, w: 30, h: 30 });
  assert.equal(strokesBounds([], 20, 100, 100), null);
});

// ─── Shape recognition ───────────────────────────────────────────────────────

/** A hand-drawn-ish loop: an ellipse with wobble, overshooting its start a little. */
function wobblyEllipse(cx: number, cy: number, rx: number, ry: number, turns = 1.06): IPoint[] {
  const n = 60;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2 * turns;
    const wobble = 1 + 0.06 * Math.sin(a * 5);
    return { x: cx + rx * wobble * Math.cos(a), y: cy + ry * wobble * Math.sin(a) };
  });
}

/** A hand-drawn-ish rectangle: four edges with a small drift, ending near the start. */
function wobblyRect(x: number, y: number, w: number, h: number): IPoint[] {
  const pts: IPoint[] = [];
  const edge = (ax: number, ay: number, bx: number, by: number): void => {
    for (let i = 0; i < 10; i += 1) pts.push({ x: ax + ((bx - ax) * i) / 10 + (i % 2), y: ay + ((by - ay) * i) / 10 + ((i + 1) % 2) });
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y + 3);
  return pts;
}

test('a closed loop becomes an ellipse, round or wide', () => {
  assert.equal(recognizeShape(wobblyEllipse(100, 100, 50, 50)), 'ellipse');
  assert.equal(recognizeShape(wobblyEllipse(200, 80, 90, 30)), 'ellipse');
  const clean = beautifyStroke(wobblyEllipse(100, 100, 50, 30));
  assert.equal(clean.length, 73);
  // Every point of the clean shape lies on the ellipse of its own box.
  const xs = clean.map((p) => p.x);
  const ys = clean.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
  const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
  for (const p of clean) assert.ok(Math.abs(Math.hypot((p.x - cx) / rx, (p.y - cy) / ry) - 1) < 1e-9);
});

test('a closed box becomes a rectangle', () => {
  assert.equal(recognizeShape(wobblyRect(10, 10, 120, 60)), 'rect');
  const clean = beautifyStroke(wobblyRect(10, 10, 120, 60));
  assert.equal(clean.length, 5);
  assert.deepEqual(clean[0], clean[4], 'it closes');
  // A small, shaky box around a word: still a rectangle (its corners are visited).
  const shaky: IPoint[] = [];
  const side = (ax: number, ay: number, bx: number, by: number): void => { for (let i = 0; i < 12; i += 1) shaky.push({ x: ax + ((bx - ax) * i) / 12 + Math.sin(i) * 2, y: ay + ((by - ay) * i) / 12 + Math.cos(i) * 2 }); };
  side(0, 0, 55, 0); side(55, 0, 55, 40); side(55, 40, 0, 40); side(0, 40, 2, 4);
  assert.equal(recognizeShape(shaky), 'rect');
});

test('open strokes, arcs, scribbles and tiny loops stay as drawn', () => {
  const line = Array.from({ length: 30 }, (_, i) => ({ x: i * 8, y: 50 + Math.sin(i / 3) * 14 }));
  assert.equal(recognizeShape(line), null);
  assert.equal(recognizeShape(wobblyEllipse(100, 100, 50, 50, 0.6)), null, 'a C is not a circle');
  assert.equal(recognizeShape(wobblyEllipse(10, 10, 5, 5)), null, 'too small');
  const zigzag = Array.from({ length: 30 }, (_, i) => ({ x: (i % 2) * 80, y: i * 4 })).concat([{ x: 0, y: 0 }]);
  assert.equal(recognizeShape(zigzag), null, 'a scribble that happens to close');
  assert.deepEqual(beautifyStroke(line), line);
});

test('polygon area', () => {
  assert.equal(polygonArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]), 100);
});

// ─── Straight lines and arrows ───────────────────────────────────────────────

/** A shaky line from a to b. */
function shakyLine(ax: number, ay: number, bx: number, by: number, n = 24): IPoint[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { x: ax + (bx - ax) * t + Math.sin(i * 1.7) * 1.5, y: ay + (by - ay) * t + Math.cos(i * 1.3) * 1.5 };
  });
}

/** The shaft to the tip, then the head drawn without lifting the pen: one barb, back to the tip, the other barb. */
function oneStrokeArrow(ax: number, ay: number, bx: number, by: number): IPoint[] {
  const shaft = shakyLine(ax, ay, bx, by);
  const back = Math.atan2(ay - by, ax - bx);
  const barb = (side: number): IPoint => ({ x: bx + 16 * Math.cos(back + side * 0.5), y: by + 16 * Math.sin(back + side * 0.5) });
  return [...shaft, barb(1), { x: bx, y: by }, barb(-1)];
}

test('a nearly straight stroke becomes a straight line (its two ends)', () => {
  const line = shakyLine(10, 50, 210, 58);
  assert.ok(isStraight(line));
  assert.equal(beautifyStroke(line).length, 2);
  assert.deepEqual(beautifyStroke(line)[0], line[0]);
});

test('a straight line with tremor to its very end is a line, never an arrow', () => {
  const zig = [{ x: 300, y: 220 }, ...Array.from({ length: 24 }, (_, i) => ({ x: 300 - (i + 1) * 10, y: 220 + ((i + 1) % 2) }))];
  assert.equal(beautifyStroke(zig).length, 2);
  const shaky = Array.from({ length: 25 }, (_, i) => ({ x: 300 - i * 10 + Math.sin(i * 1.7) * 1.5, y: 220 + Math.cos(i * 1.3) * 1.5 }));
  assert.equal(beautifyStroke(shaky).length, 2);
});

test('waves, short dashes and strokes that go back over themselves stay as drawn', () => {
  const wave = Array.from({ length: 30 }, (_, i) => ({ x: i * 8, y: 50 + Math.sin(i / 3) * 14 }));
  assert.equal(isStraight(wave), false);
  assert.equal(beautifyStroke(wave).length, wave.length);
  assert.equal(isStraight(shakyLine(0, 0, 15, 0)), false, 'too short');
  const backAndForth = [...shakyLine(0, 0, 100, 0), ...shakyLine(100, 0, 20, 0)];
  assert.equal(isStraight(backAndForth), false);
});

test('a one-stroke arrow becomes a clean arrow, pointing where the head is: right, left, diagonal', () => {
  const right = beautifyStroke(oneStrokeArrow(10, 50, 200, 50));
  assert.equal(right.length, 5);
  assert.ok(Math.abs(right[1].x - 200) < 3, 'the tip is where the shaft ended');
  assert.deepEqual(right[1], right[3], 'both barbs leave from the tip');
  const left = beautifyStroke(oneStrokeArrow(200, 80, 10, 80));
  assert.ok(left[1].x < left[0].x, 'a ← points left');
  assert.ok(left[2].x > left[1].x && left[4].x > left[1].x, 'its barbs open back toward the shaft');
  assert.equal(beautifyStroke(oneStrokeArrow(0, 0, 120, 90)).length, 5);
});

test('a two-stroke arrow: a line, then a small V near one of its ends', () => {
  const line = beautifyStroke(shakyLine(10, 50, 200, 50));
  const vNearEnd = [{ x: 188, y: 40 }, { x: 200, y: 50 }, { x: 188, y: 61 }];
  const merged = mergeArrowHead(line, vNearEnd);
  assert.ok(merged);
  assert.ok(Math.abs(merged![1].x - 200) < 3, 'points to the end the V is at');
  const vNearStart = [{ x: 22, y: 40 }, { x: 10, y: 50 }, { x: 22, y: 61 }];
  assert.ok(mergeArrowHead(line, vNearStart)![1].x < 20, 'a V at the start makes it a ←');
  assert.equal(mergeArrowHead(line, [{ x: 100, y: 120 }, { x: 110, y: 140 }, { x: 120, y: 120 }]), null, 'far from both ends');
  assert.equal(mergeArrowHead(line, shakyLine(100, 120, 300, 130)), null, 'a long stroke is not a head');
});

test('closed loops still win over lines and arrows', () => {
  const loop = Array.from({ length: 61 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2 * 1.05;
    return { x: 100 + 50 * Math.cos(a), y: 100 + 30 * Math.sin(a) };
  });
  assert.equal(beautifyStroke(loop).length, 73);
});

test('arrow geometry', () => {
  const arrow = arrowPoints({ x: 0, y: 0 }, { x: 100, y: 0 });
  assert.equal(arrow.length, 5);
  assert.ok(arrow[2].x < 100 && arrow[4].x < 100);
  assert.ok(Math.abs(arrow[2].y + arrow[4].y) < 1e-9, 'symmetric');
});
