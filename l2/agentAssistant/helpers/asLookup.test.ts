/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asLookup.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { matchRows, runLookup, setPath } from '/_102020_/l2/agentAssistant/helpers/asLookup.js';
import type { AsBffCall, AsRow } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { fakeBff, fixtureModule } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';

const catalog = buildCatalog([fixtureModule()]);
const comandas = catalog.lookups.find(item => item.route === 'resto.fechamento.comandasAbertas');
assert.ok(comandas);

test('rows carry the entity and the related display values, labelled with entity titles', async () => {
  const bff = fakeBff();
  const rows = await runLookup(catalog, comandas, {}, bff.call);
  assert.deepEqual(rows[0], { id: 'c-12', label: 'Comanda 12 · Mesa 1', version: 3, texts: { Comanda: '12', Mesa: '1' } });
  assert.deepEqual(bff.calls[0], { routine: 'resto.fechamento.comandasAbertas', params: { page: 1, pageSize: 50 } });
});

test('filters are sent typed and only when the lookup accepts them', async () => {
  const bff = fakeBff();
  const rows = await runLookup(catalog, comandas, { mesaCode: '4' }, bff.call);
  assert.deepEqual(rows.map(row => row.id), ['c-20']);
  assert.deepEqual(bff.calls[0].params, { mesaCode: '4', page: 1, pageSize: 50 });
});

test('pages are followed while hasMore is true, up to the limit', async () => {
  let calls = 0;
  const bff: AsBffCall = async (routine, params) => {
    calls += 1;
    const page = Number(params.page);
    return { ok: true, data: { lista: { items: [{ id: `c-${page}`, number: page, mesa: { code: String(page) } }], hasMore: true } }, error: null };
  };
  const rows = await runLookup(catalog, comandas, {}, bff);
  assert.equal(calls, 4);
  assert.equal(rows.length, 4);
});

test('a backend error surfaces with its code instead of an empty list', async () => {
  const bff: AsBffCall = async () => ({ ok: false, data: null, error: { code: 'FORBIDDEN', message: 'no grant' } });
  await assert.rejects(runLookup(catalog, comandas, {}, bff), /FORBIDDEN no grant/);
});

const rows: AsRow[] = [
  { id: 'c-12', label: '', texts: { Comanda: '12', Mesa: '1' } },
  { id: 'c-15', label: '', texts: { Comanda: '15', Mesa: '10' } },
  { id: 'i-1', label: '', texts: { ItemCardapio: 'Salada Caesar' } },
  { id: 'i-2', label: '', texts: { ItemCardapio: 'Salada Verde' } },
  { id: 'i-4', label: '', texts: { ItemCardapio: 'Pão de queijo' } },
];

test('an exact match wins over containment ("1" is table 1, not table 10)', () => {
  assert.deepEqual(matchRows(rows, 'Mesa', '1').map(row => row.id), ['c-12']);
});

test('containment finds every candidate when nothing is exact', () => {
  assert.deepEqual(matchRows(rows, 'ItemCardapio', 'salada').map(row => row.id), ['i-1', 'i-2']);
});

test('accents and case do not matter', () => {
  assert.deepEqual(matchRows(rows, 'ItemCardapio', 'PAO DE QUEIJO').map(row => row.id), ['i-4']);
});

test('matchEntity restricts the search to that entity; empty searches every value', () => {
  assert.deepEqual(matchRows(rows, 'Comanda', '1').map(row => row.id), ['c-12', 'c-15']);
  assert.deepEqual(matchRows(rows, '', '12').map(row => row.id), ['c-12']);
});

test('setPath builds nested wire objects', () => {
  const out: Record<string, unknown> = {};
  setPath(out, 'details.details.precoVigente', '25.90');
  setPath(out, 'name', 'Salada');
  assert.deepEqual(out, { details: { details: { precoVigente: '25.90' } }, name: 'Salada' });
});
