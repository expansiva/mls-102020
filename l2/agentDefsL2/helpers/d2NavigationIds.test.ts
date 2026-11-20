/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2NavigationIds.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { D2BffDesign } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2ContractFromBff } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { applyD2NavigationIds, type D2NavDestination } from '/_102020_/l2/agentDefsL2/helpers/d2NavigationIds.js';
import { parseD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { parseD2ContractV2, renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { parseD2SharedV2, type D2SharedV2Definition } from '/_102020_/l2/helpers/sharedV2/format.js';

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

const recordedRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/d2_196_9e8b640a');
const navigationSentence = (typeName: string, param: string) => `Each ${typeName} carries ${param} to open its page; the screen does not show it.`;

function recordedDesign(pageId: string): D2BffDesign {
  return JSON.parse(readFileSync(join(recordedRoot, 'pipeline/agentDefsL2/bff', `${pageId}.json`), 'utf8')) as D2BffDesign;
}

function recordedPage11(pageId: string): Record<D2Page11Device, D2Page11Definition> {
  const read = (device: D2Page11Device) => parseD2Page11Definition(readFileSync(join(recordedRoot, 'web', device, 'page11', `${pageId}.defs.ts`), 'utf8')).definition;
  return { desktop: read('desktop'), mobile: read('mobile') };
}

function recordedDestinations(page11: Record<D2Page11Device, D2Page11Definition>): Record<string, D2NavDestination> {
  const destinations: Record<string, D2NavDestination> = {};
  for (const device of ['desktop', 'mobile'] as const) {
    for (const organism of Object.values(page11[device].organisms)) {
      for (const intent of organism.intents) {
        if (intent.kind !== 'navigate' || !intent.to || intent.id.startsWith('backTo') || destinations[intent.to]) continue;
        destinations[intent.to] = {
          shared: parseD2SharedV2(readFileSync(join(recordedRoot, 'web/shared', `${intent.to}.defs.ts`), 'utf8')).definition,
          design: recordedDesign(intent.to),
        };
      }
    }
  }
  return destinations;
}

void test('d2_203: recorded agents routes say the item carries the id, and a route that does not reach it stays byte for byte', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message?: unknown) => { warnings.push(String(message)); };
  try {
    const design = recordedDesign('agents');
    design.endpoints.push({ id: 'ping', kind: 'qry', when: 'interaction', input: [], output: [{ name: 'ok', type: 'boolean' }], rules: [], jsdoc: { purpose: 'Ping.', input: 'None.', processing: 'Nothing.', output: 'ok.' } });
    const before = JSON.stringify(design);
    const page11 = recordedPage11('agents');
    const input = { pageId: 'agents', design, page11, destinations: recordedDestinations(page11) };
    const once = applyD2NavigationIds(input);
    const twice = applyD2NavigationIds({ ...input, design: once.design });
    assert.equal(JSON.stringify(once.design), JSON.stringify(twice.design));
    assert.equal(JSON.stringify(design), before);
    const sentence = (id: string) => once.design.endpoints.find(endpoint => endpoint.id === id)!.jsdoc.processing;
    for (const id of ['loadAgentsPage', 'listAgentsCollection']) {
      assert.ok(sentence(id).includes(navigationSentence('AgentCard', 'agentId')));
      assert.ok(sentence(id).includes(navigationSentence('DraftCard', 'draftId')));
    }
    assert.ok(sentence('loadAgentsPage').includes(navigationSentence('DraftInboxItem', 'draftId')));
    assert.ok(sentence('loadAgentsPage').includes(navigationSentence('RequestEvent', 'draftId')));
    assert.ok(sentence('listRequestHistory').includes(navigationSentence('RequestEvent', 'draftId')));
    assert.equal(sentence('listRequestHistory').includes(navigationSentence('AgentCard', 'agentId')), false);
    assert.equal(JSON.stringify(once.design.endpoints.find(endpoint => endpoint.id === 'ping')), JSON.stringify(JSON.parse(before).endpoints.find((endpoint: { id: string }) => endpoint.id === 'ping')));
    const access = { actors: ['clerk'], grants: ['manage'], scope: 'organization' };
    const source = renderD2ContractV2({ project: 102047, module: 'agents', pageId: 'agents' }, buildD2ContractFromBff({ module: 'agents', pageId: 'agents', design: once.design, access, entities: {}, userLanguage: 'en' }));
    const parsed = parseD2ContractV2(source);
    for (const id of ['loadAgentsPage', 'listAgentsCollection']) {
      const processing = parsed.routes.find(route => route.route === `agents.agents.${id}`)?.jsdoc.processing ?? '';
      assert.ok(processing.includes(navigationSentence('AgentCard', 'agentId')));
      assert.ok(processing.includes(navigationSentence('DraftCard', 'draftId')));
    }
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.filter(line => line.includes('page agents ')).length, 0);
});
