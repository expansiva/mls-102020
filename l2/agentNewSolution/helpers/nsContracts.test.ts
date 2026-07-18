/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsContracts.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNsContractSet } from '/_102020_/l2/agentNewSolution/helpers/nsContracts.js';

// Durable analog of the aceite (the prototype byte-diff runs against the untracked mls-102049-Old):
// each fixture pins one emission branch so a future edit can't silently drift the contract shape.

function only(kind: string, data: Record<string, unknown>) {
  return buildNsContractSet([{ data, fileRef: `_x_/l4/contracts/${data.operationId}.ts`, sourceRef: `_x_/l4/operations/${data.operationId}.defs.ts` }])[0];
}

void test('kind=list emits Item interface + Output = Item[]', () => {
  const r = only('list', {
    operationId: 'viewHighlights', bffName: 'shop.viewHighlights.viewHighlights',
    inputs: [], accessPattern: { pagination: 'none' },
    outputShape: { kind: 'list', fields: [
      { name: 'productId', type: 'string', required: true },
      { name: 'price', type: 'money', required: true },
      { name: 'note', type: 'text', required: false },
    ] },
  });
  assert.equal(r.kind, 'list');
  assert.match(r.tsSource, /export interface ViewHighlightsItem \{/);
  assert.match(r.tsSource, /productId: string;/);
  assert.match(r.tsSource, /price: number;/);
  assert.match(r.tsSource, /note\?: string;/);
  assert.match(r.tsSource, /export type ViewHighlightsOutput = ViewHighlightsItem\[\];/);
  assert.match(r.tsSource, /export const viewHighlightsRoute = 'shop\.viewHighlights\.viewHighlights' as const;/);
});

void test('kind=object with a nested array field emits the nested Item before Output', () => {
  const r = only('object', {
    operationId: 'createReservation', bffName: 'shop.reservationLifecycle.createReservation',
    inputs: [{ inputId: 'items', source: 'userInput', required: true, fieldRef: 'Reservation.items' }],
    accessPattern: { pagination: 'none' },
    outputShape: { kind: 'object', fields: [
      { name: 'reservationId', type: 'uuid', required: true },
      { name: 'items', type: 'array', required: true, item: { fields: [
        { name: 'reservationItemId', type: 'uuid', required: true },
        { name: 'quantity', type: 'int', required: true },
      ] } },
    ] },
  });
  assert.equal(r.kind, 'object');
  // nested Item interface appears, and BEFORE the Output interface
  const iItem = r.tsSource.indexOf('export interface CreateReservationItemsItem {');
  const iOut = r.tsSource.indexOf('export interface CreateReservationOutput {');
  assert.ok(iItem >= 0 && iOut >= 0 && iItem < iOut, 'nested Item must precede Output');
  assert.match(r.tsSource, /items: CreateReservationItemsItem\[\];/);
});

void test('kind=list with a nested array field prepends the nested Item (the listReservations case)', () => {
  const r = only('list', {
    operationId: 'listReservations', bffName: 'shop.listReservations.listReservations',
    inputs: [], accessPattern: { pagination: 'optional' },
    outputShape: { kind: 'list', fields: [
      { name: 'reservationId', type: 'uuid', required: true },
      { name: 'items', type: 'array', required: true, item: { fields: [
        { name: 'productId', type: 'uuid', required: true },
      ] } },
    ] },
  });
  const iNested = r.tsSource.indexOf('export interface ListReservationsItemsItem {');
  const iItem = r.tsSource.indexOf('export interface ListReservationsItem {');
  assert.ok(iNested >= 0 && iItem >= 0 && iNested < iItem, 'nested Item must precede the list Item');
});

void test('Input keeps only public sources and injects pagination', () => {
  const r = only('list', {
    operationId: 'browseCatalog', bffName: 'shop.browseCatalog.browseCatalog',
    inputs: [
      { inputId: 'searchTerm', source: 'userInput', required: false, fieldRef: 'Product.name' },
      { inputId: 'actorId', source: 'actorSession', required: true, fieldRef: 'Actor.id' }, // dropped (not public)
    ],
    accessPattern: { pagination: 'required' },
    outputShape: { kind: 'list', fields: [{ name: 'productId', type: 'uuid', required: true }, { name: 'name', type: 'string', required: true, fieldRef: 'Product.name' }] },
  });
  assert.match(r.tsSource, /searchTerm\?: string;/);
  assert.doesNotMatch(r.tsSource, /actorId/); // non-public source excluded
  assert.match(r.tsSource, /page\?: number;/);
  assert.match(r.tsSource, /pageSize\?: number;/);
});

void test('no public inputs and no pagination -> placeholder comment', () => {
  const r = only('object', {
    operationId: 'expireReservations', bffName: 'shop.reservationLifecycle.expireReservations',
    inputs: [{ inputId: 'now', source: 'systemDefault', required: true, fieldRef: 'x' }],
    accessPattern: { pagination: 'none' },
    outputShape: { kind: 'object', fields: [{ name: 'expiredCount', type: 'int', required: true }] },
  });
  assert.match(r.tsSource, /\/\/ sem inputs públicos \(resolvidos por contexto\)/);
});

void test('.d.ts twin carries the ambient route form and no fileReference header', () => {
  const r = only('list', {
    operationId: 'viewHighlights', bffName: 'shop.viewHighlights.viewHighlights',
    inputs: [], accessPattern: { pagination: 'none' },
    outputShape: { kind: 'list', fields: [{ name: 'productId', type: 'uuid', required: true }] },
  });
  assert.doesNotMatch(r.dtsSource, /fileReference/);
  assert.match(r.dtsSource, /declare const viewHighlightsRoute: 'shop\.viewHighlights\.viewHighlights';/);
  assert.match(r.dtsSource, /export \{ viewHighlightsRoute \};/);
});
