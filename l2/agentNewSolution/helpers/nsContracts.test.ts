/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsContracts.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNsBffContractSet, NsBffContractEntry } from '/_102020_/l2/agentNewSolution/helpers/nsContracts.js';

// newSolution_10 N4: the contract of record is the WORKSPACE bffCall (page-shaped view), one file per
// bffCall. Each fixture pins one emission branch so a future edit can't silently drift the shape.

// A browseProducts-shaped paginated operation (the run-9 case: MUST NOT emit empty interfaces).
const browseProducts = {
  inputs: [
    { inputId: 'searchTerm', source: 'userInput', required: false, fieldRef: 'Product.name' },
    { inputId: 'actorId', source: 'actorSession', required: true, fieldRef: 'Actor.id' }, // non-public
  ],
  accessPattern: { pagination: 'required' },
  outputShape: { kind: 'paginated', fields: [
    { name: 'products', type: 'array', required: true, item: { fields: [
      { name: 'productId', type: 'uuid', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'price', type: 'money', required: true },
    ] } },
    { name: 'total', type: 'int', required: true },
  ] },
};

const reserveProduct = {
  inputs: [{ inputId: 'productId', source: 'userInput', required: true, fieldRef: 'Product.productId' }],
  accessPattern: { pagination: 'none' },
  outputShape: { kind: 'object', fields: [{ name: 'reservationId', type: 'uuid', required: true }] },
};

function emit(entry: Partial<NsBffContractEntry> & Pick<NsBffContractEntry, 'bffId' | 'uses' | 'operations'>) {
  const full: NsBffContractEntry = {
    workspaceId: 'catalog',
    route: `petShop.catalog.${entry.bffId}`,
    kind: 'query',
    fileRef: `_x_/l4/petShop/contracts/catalog.${entry.bffId}.ts`,
    sourceRef: '_x_/l4/petShop/workspaces/catalog.defs.ts',
    ...entry,
  };
  return buildNsBffContractSet([full])[0];
}

void test('paginated projection emits a non-empty Output (products[] + total) — no empty interfaces (run 9)', () => {
  const r = emit({
    bffId: 'productList', uses: [{ operationId: 'browseProducts' }], operations: { browseProducts },
    input: [{ name: 'searchTerm', from: 'browseProducts.searchTerm' }, { name: 'page', type: 'number' }],
    output: { kind: 'paginated', fields: [
      { name: 'products', from: 'browseProducts.$items', item: { fields: [
        { name: 'productId', from: 'browseProducts.$items.productId' },
        { name: 'name', from: 'browseProducts.$items.name' },
      ] } },
      { name: 'total', from: 'browseProducts.total' },
    ] },
  });
  assert.match(r.tsSource, /export interface ProductListProductsItem \{/);
  assert.match(r.tsSource, /productId: string;/);
  assert.match(r.tsSource, /export interface ProductListOutput \{/);
  assert.match(r.tsSource, /products: ProductListProductsItem\[\];/);
  assert.match(r.tsSource, /total: number;/);       // resolved from the source outputShape (int -> number)
  assert.doesNotMatch(r.tsSource, /interface \w+Output \{\s*\}/); // never an empty interface
  assert.match(r.tsSource, /searchTerm\?: string;/);
  assert.match(r.tsSource, /page\?: number;/);       // free input carries its own type
  assert.match(r.tsSource, /export const productListRoute = 'petShop\.catalog\.productList' as const;/);
});

void test('list projection emits Output = Item[]', () => {
  const r = emit({
    bffId: 'destaques', uses: [{ operationId: 'browseProducts' }], operations: { browseProducts },
    output: { kind: 'list', fields: [
      { name: 'productId', from: 'browseProducts.$items.productId' },
      { name: 'label', from: 'browseProducts.$items.name' },
    ] },
  });
  assert.match(r.tsSource, /export interface DestaquesItem \{/);
  assert.match(r.tsSource, /export type DestaquesOutput = DestaquesItem\[\];/);
});

void test('command passthrough (no projection) emits the source operation outputShape', () => {
  const r = emit({
    bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }], operations: { reserveProduct },
  });
  assert.match(r.tsSource, /export interface ReservarOutput \{/);
  assert.match(r.tsSource, /reservationId: string;/);
  assert.match(r.tsSource, /productId: string;/); // public input passthrough
});

void test('identity query (no input/output) derives Input from public inputs + pagination and Output from the shape', () => {
  const r = emit({
    bffId: 'browseProducts', uses: [{ operationId: 'browseProducts' }], operations: { browseProducts },
  });
  assert.match(r.tsSource, /searchTerm\?: string;/);
  assert.doesNotMatch(r.tsSource, /actorId/);   // non-public source excluded
  assert.match(r.tsSource, /page\?: number;/);
  assert.match(r.tsSource, /pageSize\?: number;/);
  assert.match(r.tsSource, /products: BrowseProductsProductsItem\[\];/);
});

void test('A4.7 — an empty projected Output throws (never emit {})', () => {
  assert.throws(() => emit({
    bffId: 'empty', uses: [{ operationId: 'browseProducts' }], operations: { browseProducts },
    output: { kind: 'object', fields: [] },
  }), /empty/);
});

void test('.d.ts twin carries the ambient route form and no fileReference header', () => {
  const r = emit({
    bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }], operations: { reserveProduct },
  });
  assert.doesNotMatch(r.dtsSource, /fileReference/);
  assert.match(r.dtsSource, /declare const reservarRoute: 'petShop\.catalog\.reservar';/);
  assert.match(r.dtsSource, /export \{ reservarRoute \};/);
});
