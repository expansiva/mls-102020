/// <mls fileReference="_102020_/l2/aura/studio/studioLayoutLinesCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  gridRects,
  intersects,
  outlineCss,
  OUTLINE_DEPTH,
  parseTracks,
  spacingRects,
  twelveColumnRects,
  type ISpacingMeasure,
} from '/_102020_/l2/aura/studio/studioLayoutLinesCore.js';
import {
  activeLines,
  DEFAULT_PREFS,
  parsePrefs,
  toggleAllLines,
  toggleLine,
} from '/_102020_/l2/aura/studio/studioAdvancedMode.js';

const zero = { top: 0, right: 0, bottom: 0, left: 0 };

function measure(over: Partial<ISpacingMeasure>): ISpacingMeasure {
  return { box: { x: 100, y: 100, w: 200, h: 100 }, margin: zero, padding: zero, display: 'block', rowGap: 0, columnGap: 0, children: [], ...over };
}

test('margin sits outside the box and padding inside it', () => {
  const rects = spacingRects(measure({ margin: { top: 8, right: 0, bottom: 16, left: 0 }, padding: { top: 12, right: 12, bottom: 12, left: 12 } }), true);
  const margins = rects.filter((r) => r.kind === 'margin');
  assert.deepEqual(margins.map((r) => [r.y, r.h]), [[92, 8], [200, 16]]);
  const paddings = rects.filter((r) => r.kind === 'padding');
  assert.equal(paddings.length, 4);
  assert.ok(paddings.every((r) => r.x >= 100 && r.x + r.w <= 300 && r.y >= 100 && r.y + r.h <= 200));
  // An even padding is labelled once.
  assert.deepEqual(paddings.filter((r) => r.label).map((r) => r.label), ['12']);
});

test('only the DECLARED gap is painted — the free space of justify-between is not', () => {
  const children = [{ x: 100, y: 100, w: 40, h: 20 }, { x: 260, y: 100, w: 40, h: 20 }];
  const between = spacingRects(measure({ display: 'flex', columnGap: 0, children }), true);
  assert.equal(between.filter((r) => r.kind === 'gap').length, 0, 'no gap declared, nothing painted');

  const withGap = spacingRects(measure({ display: 'flex', columnGap: 12, children }), true);
  const gap = withGap.find((r) => r.kind === 'gap')!;
  assert.deepEqual([gap.x, gap.w, gap.label], [140, 12, '12']);
});

test('a stacked flex/grid gap is painted between the rows', () => {
  const children = [{ x: 100, y: 100, w: 200, h: 30 }, { x: 100, y: 150, w: 200, h: 30 }];
  const gap = spacingRects(measure({ display: 'flex', rowGap: 20, children }), false).find((r) => r.kind === 'gap')!;
  assert.deepEqual([gap.y, gap.h, gap.label], [130, 20, undefined]);
  assert.equal(spacingRects(measure({ display: 'block', rowGap: 20, children }), true).filter((r) => r.kind === 'gap').length, 0);
});

test('values only when asked, and never on space too thin to read', () => {
  const m = measure({ margin: { top: 2, right: 0, bottom: 24, left: 0 } });
  assert.ok(spacingRects(m, false).every((r) => r.label === undefined));
  assert.deepEqual(spacingRects(m, true).filter((r) => r.label).map((r) => r.label), ['24']);
});

test('grid columns from the computed tracks, with the gap between', () => {
  assert.deepEqual(parseTracks('240px 320.5px'), [240, 320.5]);
  assert.deepEqual(parseTracks('none'), []);
  const rects = gridRects({ x: 0, y: 0, w: 600, h: 50 }, 10, [240, 320], 24);
  assert.deepEqual(rects.map((r) => [r.kind, r.x, r.w]), [['column', 10, 240], ['gap', 250, 24], ['column', 274, 320]]);
  assert.equal(rects[0].label, '1 · 240');
});

test('twelve reference columns fill the box with the gutter between', () => {
  const rects = twelveColumnRects({ x: 0, y: 0, w: 1164, h: 10 });
  assert.equal(rects.length, 12);
  assert.equal(rects[0].w, 75);
  assert.equal(Math.round(rects[11].x + rects[11].w), 1164);
});

test('outlines: one rule per depth (later wins), or one colour', () => {
  const css = outlineCss('[data-x]', false);
  assert.equal(css.split('\n').length, OUTLINE_DEPTH);
  assert.match(css.split('\n')[2], /^\[data-x\] \* \* \* \{/u);
  assert.equal(outlineCss('[data-x]', true).split('\n').length, 1);
  assert.doesNotMatch(css, /`|\$\{/u);
});

test('intersects', () => {
  assert.ok(intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }));
  assert.ok(!intersects({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }));
});

test('advanced mode is OFF by default, and off means nothing is drawn', () => {
  assert.equal(DEFAULT_PREFS.advanced, false);
  assert.deepEqual(parsePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(parsePrefs('not json'), DEFAULT_PREFS);
  const prefs = { ...DEFAULT_PREFS, lines: ['outline', 'grid'] as const };
  assert.deepEqual(activeLines({ ...prefs, lines: [...prefs.lines] }), []);
  assert.deepEqual(activeLines({ ...prefs, lines: [...prefs.lines], advanced: true }), ['outline', 'grid']);
});

test('stored prefs keep only what is valid', () => {
  const parsed = parsePrefs(JSON.stringify({ advanced: true, lines: ['grid', 'bogus', 'outline'], outlineMono: 'yes' }));
  assert.equal(parsed.advanced, true);
  assert.deepEqual(parsed.lines, ['outline', 'grid']);
  assert.equal(parsed.outlineMono, false);
});

test('chips toggle one by one, and the shortcut toggles the last set', () => {
  let prefs = { ...DEFAULT_PREFS, advanced: true };
  prefs = toggleLine(prefs, 'spacing');
  prefs = toggleLine(prefs, 'outline');
  assert.deepEqual(prefs.lines, ['outline', 'spacing']);
  prefs = toggleAllLines(prefs);
  assert.deepEqual(prefs.lines, []);
  prefs = toggleAllLines(prefs);
  assert.deepEqual(prefs.lines, ['outline', 'spacing']);
  prefs = toggleLine(toggleLine(prefs, 'outline'), 'spacing');
  assert.deepEqual(prefs.lines, []);
  assert.deepEqual(toggleAllLines(prefs).lines, ['spacing'], 'the last set left on comes back');
});
