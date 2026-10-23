/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asSource.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractExportedObject, flattenType, parseContractSource, parseTypeText } from '/_102020_/l2/agentAssistant/helpers/asSource.js';
import { CONTRACT, ONTOLOGY } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';

test('the JSON object of a defs module is cut out even when followed by `as const satisfies`', () => {
  const value = extractExportedObject(ONTOLOGY[0]) as { entityId?: string };
  assert.equal(value.entityId, 'Mesa');
});

test('a brace inside a JSON string does not end the object', () => {
  const value = extractExportedObject('export const definition = {"doc":"a } b { c","n":1};') as { doc?: string; n?: number };
  assert.deepEqual(value, { doc: 'a } b { c', n: 1 });
});

test('a module without an exported object yields null', () => {
  assert.equal(extractExportedObject('export function x() { return 1; }'), null);
});

test('type literals: optional members, unions of literals, arrays, tuples and refs', () => {
  const node = parseTypeText("{ a: string; b?: number; c: 'x' | 'y'; d: Foo[]; e: []; f: ['g1', 'g2']; g: Record<string, unknown> }");
  assert.equal(node.kind, 'object');
  if (node.kind !== 'object') return;
  const byName = Object.fromEntries(node.fields.map(field => [field.name, field]));
  assert.equal(byName.b.optional, true);
  assert.deepEqual(byName.c.type, { kind: 'literal', values: ['x', 'y'] });
  assert.equal(byName.d.type.kind, 'array');
  assert.deepEqual(byName.e.type, { kind: 'tuple', items: [] });
  assert.equal(byName.f.type.kind, 'tuple');
  assert.deepEqual(byName.g.type, { kind: 'primitive', name: 'unknown' });
});

test('`readonly` is a modifier, not the property name', () => {
  const node = parseTypeText('{ readonly total: number; readonly: boolean }');
  assert.equal(node.kind, 'object');
  if (node.kind !== 'object') return;
  assert.deepEqual(node.fields.map(field => field.name), ['total', 'readonly']);
});

test('contract routes carry kind, writes and the input type; named types resolve when flattened', () => {
  const parsed = parseContractSource(CONTRACT);
  const routes = Object.fromEntries(parsed.routes.map(route => [route.route, route]));
  assert.equal(routes['resto.cardapio.cadastrarItemCardapio'].kind, 'cmd');
  assert.equal(routes['resto.cardapio.cadastrarItemCardapio'].writes, 'ItemCardapio.create');
  assert.equal(routes['resto.cardapio.itens'].kind, 'qry');
  const leaves = flattenType(routes['resto.cardapio.cadastrarItemCardapio'].input, parsed.types);
  // the contract wraps the ontology path: details (DetalhesItemCardapio) -> details.precoVigente
  assert.deepEqual(leaves.map(leaf => leaf.path), ['name', 'details.details.precoVigente']);
  const fechar = flattenType(routes['resto.fechamento.fecharComanda'].input, parsed.types);
  assert.deepEqual(fechar.find(leaf => leaf.path === 'details.paymentMethod')?.type, { kind: 'literal', values: ['cash', 'pix'] });
});

test('a required leaf under an optional object is optional on the wire', () => {
  const node = parseTypeText('{ outer?: { inner: string }; plain: string }');
  const leaves = flattenType(node, {});
  assert.deepEqual(leaves.map(leaf => [leaf.path, leaf.required]), [['outer.inner', false], ['plain', true]]);
});
