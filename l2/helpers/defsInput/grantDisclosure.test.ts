/// <mls fileReference="_102020_/l2/helpers/defsInput/grantDisclosure.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { grantShowsPath } from '/_102020_/l2/helpers/defsInput/grantDisclosure.js';

void test('a denied field, a denied prefix, or the entity itself hides the path', () => {
  const denial = { mode: 'fieldsOnly', deniedFields: ['PedidoCompra.valorTotal'] };
  assert.equal(grantShowsPath(denial, 'PedidoCompra.status'), true);
  assert.equal(grantShowsPath(denial, 'PedidoCompra.valorTotal'), false);
  assert.equal(grantShowsPath({ mode: 'fieldsOnly', deniedFields: ['PedidoCompra.details'] }, 'PedidoCompra.details.x'), false);
  assert.equal(grantShowsPath({ mode: 'fullRecord', deniedFields: ['PedidoCompra'] }, 'PedidoCompra.status'), false);
});

void test('fullRecord shows every path that is not denied', () => {
  assert.equal(grantShowsPath({ mode: 'fullRecord' }, 'PedidoCompra.status'), true);
  assert.equal(grantShowsPath({ mode: 'fullRecord', deniedFields: ['PedidoCompra.valorTotal'] }, 'PedidoCompra.status'), true);
});

void test('fieldsOnly and summaryOnly with allowedFields show only covered paths', () => {
  const fields = { mode: 'fieldsOnly', allowedFields: ['A.x', 'A.y'] };
  assert.equal(grantShowsPath(fields, 'A.x'), true);
  assert.equal(grantShowsPath(fields, 'A.z'), false);
  assert.equal(grantShowsPath({ mode: 'summaryOnly', allowedFields: ['A.details'] }, 'A.details.x'), true);
  assert.equal(grantShowsPath({ mode: 'summaryOnly', allowedFields: ['A.x'] }, 'A.y'), false);
});

void test('fieldsOnly and summaryOnly without allowedFields show everything that is not denied', () => {
  assert.equal(grantShowsPath({ mode: 'fieldsOnly' }, 'PedidoCompra.status'), true);
  assert.equal(grantShowsPath({ mode: 'fieldsOnly', allowedFields: [] }, 'PedidoCompra.status'), true);
  assert.equal(grantShowsPath({ mode: 'summaryOnly', deniedFields: ['PedidoCompra.valorTotal'] }, 'PedidoCompra.status'), true);
  const both = { mode: 'fieldsOnly', allowedFields: ['A.x', 'A.y'], deniedFields: ['A.y'] };
  assert.equal(grantShowsPath(both, 'A.x'), true);
  assert.equal(grantShowsPath(both, 'A.y'), false);
});

void test('aggregateOnly and any other mode hide the path', () => {
  assert.equal(grantShowsPath({ mode: 'aggregateOnly' }, 'Painel.total'), false);
  assert.equal(grantShowsPath({ mode: 'aggregateOnly', deniedFields: [] }, 'Painel.total'), false);
  assert.equal(grantShowsPath({ mode: 'other' }, 'PedidoCompra.status'), false);
});
