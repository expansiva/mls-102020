/// <mls fileReference="_102020_/l2/aura/studio/studioAuraSeed.test.ts" enhancement="_blank" />
// The Aura state, seeded from the app that is running.
//
// These are real state writes, not source guards: the whole bug was that the state stayed empty, so
// the only test worth having reads it back. No jsdom here — the DOM this needs is `children` plus a
// tag name, which is exactly what a fake can be.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The browser globals go in FIRST: imports are hoisted, so stubbing has to be an import of its own.
import '/_102020_/l2/aura/helpers/auraStateEdit.stub.js';
import {
  AuraInitState,
  getActualLanguage,
  getAuraState,
  setActualLanguage,
} from '/_102020_/l2/aura/helpers/auraState.js';
import {
  mountedPageFile,
  pageSourcePath,
  resetAuraSeed,
  seedAuraStateFromHost,
  seedKey,
} from '/_102020_/l2/aura/studio/studioAuraSeed.js';

/** An element, reduced to what findPageElement actually looks at. */
function el(tag: string, classes: string[] = []) {
  return {
    tagName: tag.toUpperCase(),
    classList: { contains: (name: string) => classes.includes(name) },
  };
}

function host(...children: ReturnType<typeof el>[]): HTMLElement {
  return { children } as unknown as HTMLElement;
}

const PAGE_TAG = 'build-flow-fsm--web--desktop--page23--change-order-catalogue-102046';

function setLanguage(language: string): void {
  document.documentElement.lang = language;
}

test('the source path is the shape the state parser reads', () => {
  assert.equal(
    pageSourcePath({ project: 102046, shortName: 'changeOrderCatalogue', folder: 'buildFlowFsm/web/desktop/page23' }),
    'l2/buildFlowFsm/web/desktop/page23/changeOrderCatalogue.ts',
  );
  // The level belongs in the path: it is where IAuraPage.level comes from.
  assert.match(pageSourcePath({ project: 1, shortName: 'a', folder: '' }), /^l2\/a\.ts$/u);
});

test('the mounted page comes from the tag, skipping our own chrome', () => {
  const region = host(
    el('div'), // no dash: not a component
    el('div', ['se-control']), // our overlay
    el(PAGE_TAG),
  );
  assert.deepEqual(mountedPageFile(region), {
    project: 102046,
    shortName: 'changeOrderCatalogue',
    folder: 'buildFlowFsm/web/desktop/page23',
  });

  // Never a guess: nothing mounted, and a tag that is not a page tag, both answer null.
  assert.equal(mountedPageFile(host()), null);
  assert.equal(mountedPageFile(host(el('ml-alert-modal'))), null);
  assert.equal(mountedPageFile(null), null);
});

test('entering studio mode fills the identity the knobs used to be the only source of', () => {
  resetAuraSeed();
  setLanguage('pt-BR');

  const page = seedAuraStateFromHost(host(el(PAGE_TAG)));
  assert.ok(page, 'the seed resolved the mounted page');

  const state = getAuraState();
  assert.equal(state.actualProject, 102046);
  assert.equal(state.actualModule, 'buildFlowFsm');
  assert.equal(state.actualDevice, 'web/desktop');
  // page23 -> layout 2, design system 3. These two are the fields that were always empty.
  assert.equal(state.actualLayout, 2);
  assert.equal(state.actualDesignSystem, 3);
  assert.equal(state.actualPage?.shortName, 'changeOrderCatalogue');
  assert.equal(state.actualPage?.folder, 'buildFlowFsm/web/desktop/page23');
  assert.equal(state.actualPage?.level, 2, 'the level comes from the source path');
  // Raw, as the app declares it: reducing pt-BR to pt writes the edit into the wrong catalog.
  assert.equal(state.actualLanguage, 'pt-br');
  assert.equal(getActualLanguage('buildFlowFsm'), 'pt-br');
});

test('the same mounted page is not seeded twice', () => {
  // Every write notifies servicePreview, serviceGenome and selectPage. The slot publishes on things
  // that have nothing to do with the page (the panel opening, the level changing), so without the
  // memo a click on the nav would wake all of them for no change.
  assert.equal(seedAuraStateFromHost(host(el(PAGE_TAG))), null, 'nothing to do');
});

test('the language of the page on screen wins over the one remembered for the module', () => {
  // The order trap this guards: writing actualModule re-emits the language remembered for that
  // module, so seeding the language BEFORE the page source would have it overwritten immediately.
  setActualLanguage('buildFlowFsm', 'de');
  assert.equal(getAuraState().actualLanguage, 'de', 'the knob wrote it');

  setLanguage('pt-BR');
  resetAuraSeed();
  assert.ok(seedAuraStateFromHost(host(el(PAGE_TAG))));
  assert.equal(getAuraState().actualLanguage, 'pt-br');
});

test('a language switch inside the running app re-seeds', () => {
  // The app's header can switch language without remounting the page — which is why the language is
  // part of the seed key and not just of the payload.
  const file = { project: 102046, shortName: 'changeOrderCatalogue', folder: 'buildFlowFsm/web/desktop/page23' };
  assert.notEqual(seedKey(file, 'pt-br'), seedKey(file, 'en'));

  setLanguage('en');
  assert.ok(seedAuraStateFromHost(host(el(PAGE_TAG))), 'the same page, another language');
  assert.equal(getAuraState().actualLanguage, 'en');
});

test('a page it cannot resolve leaves the state exactly as it was', () => {
  const before = JSON.stringify(getAuraState());
  resetAuraSeed();
  assert.equal(seedAuraStateFromHost(host(el('div'))), null);
  assert.equal(JSON.stringify(getAuraState()), before, 'no page mounted is not a reason to forget one');
});

test('the localStorage restore only happens while the state does not exist', () => {
  // The rule the seed depends on: AuraInitState is the only door to localStorage, and it is guarded.
  // Were it not, the seed's own AuraInitState call would put the remembered module back on top of the
  // module of the page on screen, every time.
  const state = getAuraState();
  state.actualModule = 'sentinel';
  AuraInitState();
  assert.equal(getAuraState().actualModule, 'sentinel');
});

// ─── the wiring, which no unit test reaches ─────────────────────────────────

const TOOL = readFileSync(new URL('studioEditTool.ts', import.meta.url), 'utf8');

test('the tool seeds the state, and does it before arming anything', () => {
  // The panels read the state as they render. Seeding after the editor is armed means the first
  // paint of every studio service still shows the empty state this whole module exists to fill.
  const seedAt = TOOL.indexOf('syncAuraState(state);');
  const editorAt = TOOL.indexOf('await syncEditor(state);');
  assert.ok(seedAt > 0, 'apply() must call syncAuraState');
  assert.ok(editorAt > seedAt, 'the seed comes first');
});

test('the seed is gated on studio mode, never on the edit level', () => {
  // A user who edits only through the file editor never arms the overlay — and the knobs still have
  // to know which page is on screen.
  const opens = TOOL.indexOf('function syncAuraState');
  const body = TOOL.slice(opens, TOOL.indexOf('\n}', opens));
  assert.ok(body.includes('state.studioMode'), 'studio mode is the condition');
  assert.ok(!body.includes('editLevel'), 'the edit level is not');
});

test('leaving takes the memo with it', () => {
  // Without this, coming back to an app region that mounted another page would find the old key and
  // seed nothing.
  const teardown = TOOL.slice(TOOL.indexOf('function teardown'), TOOL.indexOf('async function apply'));
  assert.ok(teardown.includes('resetAuraSeed()'), 'teardown resets the seed');
});
