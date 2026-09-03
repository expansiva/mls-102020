/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSurface, readEvents, readProperties, readSurface, renderSurface } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';

// Verbatim shapes from mls-102040/l2/molecules/groupviewtable/ml-data-table.ts.
const REAL = `
export class MlDataTableMolecule extends MoleculeAuraElement {
  slotTags = ['Caption','TableHeader','TableCell'];

  /** Comma-separated selected row indices, e.g."0,2,5" */
  @propertyDataSource({ type: String })
  value ='';

  @propertyDataSource({ type: Boolean, attribute:'is-editing' })
  isEditing = false;

  @propertyDataSource({ type: Number, attribute:'page-size' })
  pageSize = 0;

  private emitSort() {
    this.dispatchEvent(new CustomEvent('sort', { detail: {} }));
    this.dispatchEvent(new CustomEvent('change', { detail: {} }));
    this.dispatchEvent(new CustomEvent('change', { detail: {} }));
  }
}
`;

test('an explicit attribute wins over the default', () => {
  const props = readProperties(REAL);
  assert.equal(props.find(p => p.name === 'isEditing')?.attribute, 'is-editing');
  assert.equal(props.find(p => p.name === 'pageSize')?.attribute, 'page-size');
});

test('the default attribute is the property name LOWERCASED, not kebab-cased', () => {
  // Lit's rule. Reporting 'my-value' for `myValue` would have the model propose markup that
  // silently does nothing — the exact class of defect this agent exists to stop shipping.
  const props = readProperties(`
    @propertyDataSource({ type: String })
    myValue = '';
  `);
  assert.equal(props[0].attribute, 'myvalue');
});

test('the declared type is read, defaulting to String', () => {
  const props = readProperties(REAL);
  assert.equal(props.find(p => p.name === 'isEditing')?.type, 'Boolean');
  assert.equal(props.find(p => p.name === 'pageSize')?.type, 'Number');
  assert.equal(props.find(p => p.name === 'value')?.type, 'String');
});

test('a repeated event is listed once', () => {
  assert.deepEqual(readEvents(REAL), ['sort', 'change']);
});

test('the whole surface comes out of a real molecule', () => {
  const surface = readSurface(REAL);
  assert.equal(surface.className, 'MlDataTableMolecule');
  assert.deepEqual(surface.slots, ['Caption', 'TableHeader', 'TableCell']);
  assert.equal(surface.properties.length, 3);
  assert.deepEqual(surface.events, ['sort', 'change']);
});

test('an empty section is STATED, never omitted', () => {
  // "no events" is information the routing decision needs; a missing section reads to the model as
  // "this was not shown to you", which is a different claim.
  const md = renderSurface(readSurface('export class X extends Y {}'));
  assert.match(md, /\*\*Events it dispatches\*\*\n- \(none\)/);
  assert.match(md, /\*\*Slots the code declares\*\*\n- \(none\)/);
});

test('a .less-only edit leaves the surface untouched — i5 must be a no-op', () => {
  // The common case of an improve run. It must not cost an LLM call.
  const surface = readSurface(REAL);
  assert.equal(diffSurface(surface, surface).changed, false);
});

test('an added slot is what makes the playground stale', () => {
  // The 2026-08-05 incident in one assertion: Detail was added and the demo never showed it.
  const before = readSurface(`slotTags = ['Caption'];`);
  const after = readSurface(`slotTags = ['Caption', 'Detail'];`);
  const diff = diffSurface(before, after);
  assert.deepEqual(diff.addedSlots, ['Detail']);
  assert.equal(diff.changed, true);
});

test('removals are reported too — a demo binding a property that is gone renders empty', () => {
  const before = readSurface(REAL);
  const after = readSurface(REAL.replace(/@propertyDataSource\(\{ type: Number, attribute:'page-size' \}\)\s*\n\s*pageSize = 0;/, ''));
  const diff = diffSurface(before, after);
  assert.deepEqual(diff.removedProperties, ['pageSize']);
});
