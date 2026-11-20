/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2NavigationIds.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2BffDesign } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { applyD2NavigationIds, type D2NavDestination } from '/_102020_/l2/agentDefsL2/helpers/d2NavigationIds.js';
import type { D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2SharedV2Definition } from '/_102020_/l2/helpers/sharedV2/format.js';

const emptyPage = (): D2Page11Definition => ({
  template: { category: 'list', experience: 'list' }, intent: 'Open the list.',
  sections: [{ id: 'main', priority: 'main', purpose: 'The list.', organisms: ['rows'] }],
  organisms: { rows: { kind: 'list', text: 'Rows.', intents: [{ id: 'openItem', kind: 'navigate', to: 'item_page' }] } },
  molecules: {},
});

function design(): D2BffDesign {
  return {
    types: [
      { name: 'Row', description: 'One row.', fields: [{ name: 'label', type: 'string', origin: { kind: 'field', paths: ['Item.label'] } }] },
      { name: 'Note', description: 'A note.', fields: [{ name: 'text', type: 'string', origin: { kind: 'field', paths: ['Note.text'] } }] },
    ],
    endpoints: [{ id: 'load', kind: 'qry', when: 'onLoad', input: [], output: [{ name: 'rows', type: 'Row[]' }], rules: [], jsdoc: { purpose: 'List.', input: 'None.', processing: 'All.', output: 'rows.' } }],
    bindings: { organisms: [{ organism: 'rows', reads: 'load.rows' }], commands: [], selections: [], journeys: [], updates: [] },
  };
}

function destination(param: string, required = true): D2NavDestination {
  const shared: D2SharedV2Definition = {
    entry: { params: { [param]: { type: 'string', sources: ['url'], effect: 'select:detail', persist: false, required } } },
    requests: {}, states: {}, journeys: [], rules: [], access: { actors: [], grants: [] },
  };
  return { shared, design: { types: [], endpoints: [], bindings: { organisms: [], commands: [], selections: [], journeys: [], updates: [] } } };
}

void test('d2_196: a list item gains the required url id of the page it opens', () => {
  const result = applyD2NavigationIds({
    pageId: 'rows', design: design(),
    page11: { desktop: emptyPage(), mobile: emptyPage() },
    destinations: { item_page: destination('itemId') },
  });
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.design.types.find(type => type.name === 'Row')?.fields.at(-1), { name: 'itemId', type: 'string' });
  assert.equal(result.design.types.find(type => type.name === 'Note')?.fields.some(leaf => leaf.name === 'itemId'), false);
});

void test('d2_196: a detail, a back navigate and a param that is not required leave the design byte for byte', () => {
  const value = design();
  value.endpoints[0].output[0] = { name: 'row', type: 'Row' };
  value.bindings.organisms[0].reads = 'load.row';
  const detail = emptyPage();
  detail.organisms.rows.kind = 'detail';
  const back = emptyPage();
  back.organisms.rows.intents = [{ id: 'backToRows', kind: 'navigate', to: 'item_page' }];
  const optional = emptyPage();
  const before = JSON.stringify(value);
  for (const page11 of [detail, back, optional]) {
    const result = applyD2NavigationIds({
      pageId: 'rows', design: value,
      page11: { desktop: page11, mobile: page11 },
      destinations: { item_page: page11 === optional ? destination('itemId', false) : destination('itemId') },
    });
    assert.equal(JSON.stringify(result.design), before);
    assert.deepEqual(result.warnings, []);
  }
  assert.equal(JSON.stringify(value), before);
});

void test('d2_196: a navigate whose destination is absent adds nothing and warns', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message?: unknown) => { warnings.push(String(message)); };
  try {
    const value = design();
    const before = JSON.stringify(value);
    const result = applyD2NavigationIds({
      pageId: 'rows', design: value,
      page11: { desktop: emptyPage(), mobile: emptyPage() },
      destinations: {},
    });
    assert.equal(JSON.stringify(result.design), before);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].code, 'D2_NAV_ID_DESTINATION_MISSING');
  } finally {
    console.warn = original;
  }
  assert.deepEqual(warnings, ['D2_NAV_ID_DESTINATION_MISSING: rows rows → item_page']);
});

void test('d2_196: no matching item type, or two, adds nothing and warns once', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message?: unknown) => { warnings.push(String(message)); };
  try {
    const none = applyD2NavigationIds({
      pageId: 'rows', design: design(),
      page11: { desktop: emptyPage(), mobile: emptyPage() },
      destinations: { item_page: destination('otherId') },
    });
    assert.equal(none.warnings.length, 1);
    assert.equal(none.warnings[0].code, 'D2_NAV_ID_NO_TYPE');
    const both = design();
    both.types.push({ name: 'Twin', description: 'Same entity.', fields: [{ name: 'label', type: 'string', origin: { kind: 'field', paths: ['Item.label'] } }] });
    both.types[0].fields.push({ name: 'twin', type: 'Twin' });
    const ambiguous = applyD2NavigationIds({
      pageId: 'rows', design: both,
      page11: { desktop: emptyPage(), mobile: emptyPage() },
      destinations: { item_page: destination('itemId') },
    });
    assert.equal(ambiguous.warnings[0].code, 'D2_NAV_ID_AMBIGUOUS');
    assert.equal(ambiguous.design.types.some(type => type.fields.some(leaf => leaf.name === 'itemId')), false);
  } finally {
    console.warn = original;
  }
  assert.deepEqual(warnings, [
    'D2_NAV_ID_NO_TYPE: page rows organism rows param otherId',
    'D2_NAV_ID_AMBIGUOUS: page rows organism rows param itemId',
  ]);
});
