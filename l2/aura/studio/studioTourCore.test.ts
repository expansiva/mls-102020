/// <mls fileReference="_102020_/l2/aura/studio/studioTourCore.test.ts" enhancement="_blank" />
// The rules of the guided tours: offered once per version and never over something else, steps skipped when they
// cannot be shown, the bubble always inside the screen.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { markSeen, nextShowable, parseSeen, placeBubble, revealMode, shouldOffer, stepPosition } from '/_102020_/l2/aura/studio/studioTourCore.js';

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');

test('seen: malformed records count as never seen; marking keeps the others', () => {
  assert.deepEqual(parseSeen(null), {});
  assert.deepEqual(parseSeen('not json'), {});
  assert.deepEqual(parseSeen('{"genome":{"version":1,"seen":"done"},"x":{"version":"1","seen":"done"},"y":{"version":1,"seen":"maybe"}}'),
    { genome: { version: 1, seen: 'done' } });
  const seen = markSeen({ ds: { version: 2, seen: 'skipped' } }, { id: 'genome', version: 1 }, 'done');
  assert.deepEqual(seen, { ds: { version: 2, seen: 'skipped' }, genome: { version: 1, seen: 'done' } });
});

test('offered once per version, never over a task or another tour', () => {
  const tour = { id: 'genome', version: 2 };
  const free = { busy: false, open: false };
  assert.equal(shouldOffer(tour, {}, free), true);
  assert.equal(shouldOffer(tour, { genome: { version: 2, seen: 'skipped' } }, free), false, 'skipped is seen');
  assert.equal(shouldOffer(tour, { genome: { version: 1, seen: 'done' } }, free), true, 'a newer version is offered again');
  assert.equal(shouldOffer(tour, {}, { ...free, busy: true }), false);
  assert.equal(shouldOffer(tour, {}, { ...free, open: true }), false);
});

test('steps that cannot be shown are skipped, both ways; past the ends the tour is over', () => {
  const showable = (index: number) => index !== 1 && index !== 2;
  assert.equal(nextShowable(5, 1, 1, showable), 3);
  assert.equal(nextShowable(5, 2, -1, showable), 0);
  assert.equal(nextShowable(5, 5, 1, showable), null);
  assert.equal(nextShowable(3, 1, 1, () => false), null);
});

test('the bubble: beside the element when it fits, else below or above, always inside the screen', () => {
  const viewport = { width: 1000, height: 700 };
  const bubble = { width: 300, height: 160 };
  assert.deepEqual(placeBubble({ left: 100, top: 100, width: 200, height: 50 }, bubble, viewport), { left: 314, top: 100, side: 'right' });
  assert.equal(placeBubble({ left: 600, top: 100, width: 200, height: 50 }, bubble, viewport).side, 'left');
  const wide = placeBubble({ left: 20, top: 100, width: 960, height: 200 }, bubble, viewport);
  assert.equal(wide.side, 'below');
  assert.equal(placeBubble({ left: 20, top: 400, width: 960, height: 290 }, bubble, viewport).side, 'above');
  const low = placeBubble({ left: 100, top: 650, width: 100, height: 40 }, bubble, viewport);
  assert.ok(low.top + bubble.height <= viewport.height - 8, 'clamped inside');
});

test('the Genome tour: anchors the panel marks, the selection step, the tabs it opens; texts in both catalogs', () => {
  const tours = read('studioTours.ts');
  for (const anchor of ['genome-pages', 'genome-app', 'genome-inspect', 'genome-tree', 'genome-tab-ai', 'genome-page-info', 'genome-device', 'genome-theme', 'genome-advanced', 'genome-versions']) {
    assert.ok(tours.includes(anchor), anchor);
  }
  assert.ok(tours.includes("advanceOn: 'selection'"));
  assert.ok(tours.includes("openTab: 'ai'") && tours.includes("openTab: 'page'"));
  const panel = read('../plugins/selectPage.ts');
  for (const mark of ['data-tour="genome-pages"', 'data-tour="genome-inspect"', 'data-tour="genome-tree"', 'data-tour="genome-versions"', 'data-tour="genome-tab-${id}"', 'data-tour="genome-page-info"', 'data-tour="genome-device"', 'data-tour="genome-theme"', 'data-tour="genome-advanced"']) {
    assert.ok(panel.includes(mark), mark);
  }
  const messages = read('studioMessages.ts');
  const keys = [...tours.matchAll(/'(tour\.[\w.]+)'/gu)].map(m => m[1]);
  assert.ok(keys.length >= 15);
  for (const key of new Set(keys)) assert.equal(messages.split(`'${key}':`).length - 1, 2, key);
});

test('the panel offers the tour only when nothing is going on, and the "?" reopens it', () => {
  const panel = read('../plugins/selectPage.ts');
  assert.ok(panel.includes("offerTour(GENOME_TOUR, { busy: this._tourBusy() })"));
  assert.ok(panel.includes('startTour(GENOME_TOUR)'));
  const busy = panel.slice(panel.indexOf('private _tourBusy('), panel.indexOf('private _tourBusy(') + 600);
  assert.ok(busy.includes('isPageInReview') && busy.includes('this._editBusy') && busy.includes('this._batchBusy'));
  const engine = read('studioTour.ts');
  // The Studio embedded in a client server's app is where the tours are used most: no "studio client" gate.
  assert.ok(!engine.includes('isStudioClient'), 'offered in the Studio of the client app too');
  assert.ok(engine.includes("'studio-tour-open-tab'"));
});

test('the Design System and Assets tours: every anchor is marked in its panel, offered once, reopened by the "?"', () => {
  const tours = read('studioTours.ts');
  const anchorsOf = (id: string) => {
    const start = tours.indexOf(`export const ${id}`);
    const body = tours.slice(start, tours.indexOf('\n};', start));
    return [...body.matchAll(/data-tour="([\w-]+)"/gu)].map(m => m[1]);
  };
  const ds = read('../plugins/selectDesignSystem.ts');
  const dsAnchors = anchorsOf('DESIGN_SYSTEM_TOUR');
  assert.equal(dsAnchors.length, 13);
  for (const anchor of dsAnchors) {
    assert.ok(ds.includes(`data-tour="${anchor}"`) || ds.includes(`'${anchor}'`), anchor);
  }
  assert.ok(ds.includes('<details data-tour=${tour ?? nothing}'), 'the sections carry their mark');
  assert.ok(ds.includes("offerTour(DESIGN_SYSTEM_TOUR, { busy: this._generating || hasRunning('ds:generate') })"));
  assert.ok(ds.includes('startTour(DESIGN_SYSTEM_TOUR)'));
  const media = read('../plugins/selectAssetsMedia.ts');
  const assetsAnchors = anchorsOf('ASSETS_TOUR');
  assert.equal(assetsAnchors.length, 5);
  for (const anchor of assetsAnchors) assert.ok(media.includes(`data-tour="${anchor}"`), anchor);
  assert.ok(media.includes('offerTour(ASSETS_TOUR, { busy: !!this._pending || this._uploadLoading })'));
  assert.ok(media.includes('startTour(ASSETS_TOUR)'));
  // An empty project shows the way to the first upload, in the three languages of the panel.
  assert.ok(media.includes('@click=${() => this._openFilePicker()}>${this.msg.emptyAdd}</button>'));
  for (const key of ['emptyHint', 'emptyAdd']) assert.equal(media.match(new RegExp(`^ +${key}: '`, 'gmu'))?.length ?? 0, 3, key);
});

test('the Header tours: the knob ends on Edit and the editor in the details panel goes on from there', () => {
  const tours = read('studioTours.ts');
  const anchorsOf = (id: string) => {
    const start = tours.indexOf(`export const ${id}`);
    return [...tours.slice(start, tours.indexOf('\n};', start)).matchAll(/data-tour="([\w-]+)"/gu)].map(m => m[1]);
  };
  const knob = read('../plugins/selectHeader.ts');
  const knobAnchors = anchorsOf('HEADER_TOUR');
  assert.equal(knobAnchors.at(-1), 'header-edit', 'the last step is the way into the editor');
  for (const anchor of knobAnchors) assert.ok(knob.includes(`data-tour="${anchor}"`), anchor);
  assert.ok(knob.includes('offerTour(HEADER_TOUR, { busy: !!this._busy })') && knob.includes('startTour(HEADER_TOUR)'));
  const editor = read('../plugins/pluginHeaderEditor.ts');
  for (const anchor of anchorsOf('HEADER_EDITOR_TOUR')) {
    assert.ok(editor.includes(`data-tour="${anchor}"`) || editor.includes(`'${anchor}'`), anchor);
  }
  assert.ok(editor.includes('continueTour(HEADER_TOUR, HEADER_EDITOR_TOUR, { busy: !!this._busy || !!this._previewTag })'));
  assert.ok(editor.includes('startTour(HEADER_EDITOR_TOUR)'));
  const engine = read('studioTour.ts');
  const hand = engine.slice(engine.indexOf('export function continueTour('), engine.indexOf('export function startTour('));
  assert.ok(hand.indexOf("current.close('done');") < hand.indexOf('void current.go(0, 1);'), 'the knob tour ends as done, the editor one starts at its first step');
  assert.ok(hand.includes('offerTour(tour, context);'), 'reached another way, the editor tour is offered as usual');
});

test('the count and Back / Done follow only the steps on screen; a step of another view is skipped at once', () => {
  // The Header with one header open: list, add and name belong to other views; "set as default" is gone (it is the default).
  const showable = [true, false, false, false, true, false, true];
  assert.deepEqual(stepPosition(showable, 0), { n: 1, total: 3, first: true, last: false });
  assert.deepEqual(stepPosition(showable, 4), { n: 2, total: 3, first: false, last: false });
  assert.deepEqual(stepPosition(showable, 6), { n: 3, total: 3, first: false, last: true });
  assert.equal(stepPosition([false, true], 0).n, 1, 'the step on screen always counts');
  const engine = read('studioTour.ts');
  const go = engine.slice(engine.indexOf('async go('), engine.indexOf('private async waitFor('));
  assert.ok(go.indexOf('if (!step.openTab && !present(step)) continue;') < go.indexOf('await this.waitFor('), 'no wait for an element that is not in the page');
  assert.ok(engine.includes('stepPosition(this.tour.steps.map(present), this.index)'));
});

test('the step scrolls to its element: nothing when it is well inside, centered, or from the top when too tall', () => {
  const area = { top: 100, height: 800 };
  assert.equal(revealMode({ top: 300, height: 100 }, area), 'none');
  assert.equal(revealMode({ top: 1200, height: 100 }, area), 'center', 'below the area');
  assert.equal(revealMode({ top: 850, height: 60 }, area), 'center', 'under the sticky bar at the bottom');
  assert.equal(revealMode({ top: 120, height: 100 }, area), 'center', 'under the sticky bar at the top');
  assert.equal(revealMode({ top: 1500, height: 1200 }, area), 'start', 'taller than the area');
  const engine = read('studioTour.ts');
  assert.ok(engine.includes('reveal(found);') && !engine.includes("block: 'nearest'"));
});
