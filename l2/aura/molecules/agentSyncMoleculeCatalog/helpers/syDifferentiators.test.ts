/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDifferentiators.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  syExtractMoleculeFacts,
  syGroupDifferentiators,
  syRenderDifferentiators,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDifferentiators.js';

/** A sibling with nothing of its own — the shape 5 of groupViewTable's 13 really have. */
const PLAIN = `
@customElement('grp--ml-plain')
export class Plain extends MoleculeAuraElement {
  slotTags = ['Caption', 'TableBody'];
  @propertyDataSource({ type: String }) value = '';
  private go() { this.dispatchEvent(new CustomEvent('change', { detail: {} })); }
}`;

/** The one with an on-switch, a private event and live slots. */
const RICH = `
@customElement('grp--ml-rich')
export class Rich extends MoleculeAuraElement {
  slotTags = ['Caption', 'TableBody', 'Detail'];
  protected usesLiveSlots = true;
  @propertyDataSource({ type: String }) value = '';
  @propertyDataSource({ type: Boolean }) showRowTotal = false;
  private cols() { return this.heads().filter(h => h.hasAttribute('groupable')); }
  private go() {
    this.dispatchEvent(new CustomEvent('change', { detail: {} }));
    this.emitRowEvent('groupChange', { key: 'a' });
  }
  private act(el: Element) {
    const name = el.getAttribute('action');
    if (name === 'open') this.open(); else if (name === 'save') this.save();
  }
}`;

const LESS_WINDOW = '.x { color: red; } @media (max-width: 640px) { .x { display: block; } }';
const LESS_CONTAINER = '.x { container-type: inline-size; } @container (max-width: 40rem) { .x { display: grid; } }';
const DEFS = 'export const skill = `# Metadata\n\n# Objective\nDoes the rich thing. And more after the stop.\n\n# Responsibilities\n';

void test('facts come from the molecule file, including the dynamic emit helper', () => {
  const f = syExtractMoleculeFacts({ shortName: 'ml-rich', ts: RICH, less: LESS_WINDOW, defs: DEFS });
  assert.equal(f.tag, 'grp--ml-rich');
  assert.deepEqual(f.slots, ['Caption', 'Detail', 'TableBody']);
  assert.deepEqual(f.props, ['showRowTotal', 'value']);
  // `groupChange` only exists through emitRowEvent(name, …) — a CustomEvent-only scan loses it.
  assert.deepEqual(f.events, ['change', 'groupChange']);
  assert.deepEqual(f.switches, ['groupable']);
  assert.deepEqual(f.actions, ['open', 'save']);
  assert.equal(f.liveSlots, true);
  assert.equal(f.reactsTo, 'window');
  assert.equal(f.objective, 'Does the rich thing.');
});

void test('a container query is told apart from a viewport one — a narrow card only proves the first', () => {
  assert.equal(syExtractMoleculeFacts({ shortName: 'a', ts: PLAIN, less: LESS_CONTAINER }).reactsTo, 'container');
  assert.equal(syExtractMoleculeFacts({ shortName: 'a', ts: PLAIN, less: '' }).reactsTo, 'none');
});

void test('universal switches are not differentiators', () => {
  const ts = `slotTags = ['Caption'];\nthis.hasAttribute('is-editing'); this.hasAttribute('editing-rows'); this.hasAttribute('sortable');`;
  assert.deepEqual(syExtractMoleculeFacts({ shortName: 'a', ts }).switches, ['sortable']);
});

void test('action verbs are only read where the molecule actually reads the attribute', () => {
  const ts = `slotTags = [];\nif (name === 'open') { this.x(); }`;
  assert.deepEqual(syExtractMoleculeFacts({ shortName: 'a', ts }).actions, []);
});

void test('exclusive = what at least one sibling lacks; a shared item explains nothing', () => {
  const g = syGroupDifferentiators([
    { shortName: 'ml-plain', ts: PLAIN },
    { shortName: 'ml-rich', ts: RICH, less: LESS_WINDOW, defs: DEFS },
  ]);
  const rich = g.molecules.find(m => m.shortName === 'ml-rich')!;
  const plain = g.molecules.find(m => m.shortName === 'ml-plain')!;
  // `change`, `Caption`, `TableBody` and `.value` are in both, so they cannot separate them.
  assert.ok(!rich.exclusive.includes('@change'));
  assert.ok(!rich.exclusive.includes('slot:Caption'));
  assert.deepEqual(rich.exclusive.sort(), ['.showRowTotal', '@groupChange', 'slot:Detail'].sort());
  assert.deepEqual(plain.exclusive, []);
  assert.deepEqual(g.withoutExclusiveApi, ['ml-plain']);
  assert.deepEqual(g.distinguishingSwitches, ['groupable']);
  assert.deepEqual(g.distinguishingActions, ['open', 'save']);
  assert.deepEqual(g.allEvents, ['change', 'groupChange']);
});

void test('the rendered block names the on-switch, the verb and the ones with nothing of their own', () => {
  const text = syRenderDifferentiators(syGroupDifferentiators([
    { shortName: 'ml-plain', ts: PLAIN },
    { shortName: 'ml-rich', ts: RICH, less: LESS_WINDOW, defs: DEFS },
  ]));
  assert.match(text, /groupable="…"/);
  assert.match(text, /answers to <RowAction action="…">: open, save/);
  assert.match(text, /NO exclusive slot\/property\/event/);
  assert.match(text, /WINDOW-width rule/);
  assert.match(text, /1 of 2 have NO exclusive API \(ml-plain\)/);
});

void test('an empty group renders nothing instead of a header with no rows', () => {
  assert.equal(syRenderDifferentiators(syGroupDifferentiators([])), '');
});
