/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asCatalog.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, catalogForPrompt, humanize } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { fixtureModule } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';

const catalog = buildCatalog([fixtureModule()]);
const command = (route: string) => {
  const found = catalog.commands.find(item => item.route === route);
  assert.ok(found, `${route} missing from the catalog`);
  return found;
};

test('only routes the backend registers enter the catalog', () => {
  assert.deepEqual(catalog.commands.map(item => item.route).sort(), [
    'resto.atendimento.abrirComanda',
    'resto.atendimento.lancarItem',
    'resto.cardapio.cadastrarItemCardapio',
    'resto.fechamento.fecharComanda',
  ]);
  assert.deepEqual(catalog.issues, []);
});

test('record inputs become refs to the ontology target, never plain values', () => {
  const inputs = command('resto.atendimento.lancarItem').inputs;
  const comanda = inputs.find(input => input.path === 'comandaId');
  assert.equal(comanda?.role, 'ref');
  assert.equal(comanda?.ref, 'Comanda');
  assert.equal(inputs.find(input => input.path === 'itemCardapioId')?.ref, 'ItemCardapio');
  const quantidade = inputs.find(input => input.path === 'details.quantidade');
  assert.deepEqual([quantidade?.role, quantidade?.label, quantidade?.valueType, quantidade?.required], ['value', 'Quantidade', 'integer', true]);
  assert.equal(inputs.find(input => input.path === 'details.observacao')?.required, false);
});

test('a wrapped wire path still finds its ontology field (title, money type, description)', () => {
  const preco = command('resto.cardapio.cadastrarItemCardapio').inputs.find(input => input.path === 'details.details.precoVigente');
  assert.deepEqual([preco?.label, preco?.valueType, preco?.wireType, preco?.description], ['Preço vigente', 'money', 'string', 'Preço cobrado hoje.']);
});

test('a transition targets its own record by id and takes version from it', () => {
  const inputs = command('resto.fechamento.fecharComanda').inputs;
  const id = inputs.find(input => input.path === 'id');
  assert.deepEqual([id?.role, id?.ref, id?.label], ['ref', 'Comanda', 'Comanda']);
  assert.equal(inputs.find(input => input.path === 'version')?.role, 'version');
  const payment = inputs.find(input => input.path === 'details.paymentMethod');
  assert.deepEqual(payment?.enumValues, [{ value: 'cash', label: 'Dinheiro' }, { value: 'pix', label: 'Pix' }]);
});

test('list queries expose where the rows are, how to page, the filters and the related entities', () => {
  const lookup = catalog.lookups.find(item => item.route === 'resto.fechamento.comandasAbertas');
  assert.ok(lookup);
  assert.deepEqual(
    [lookup.entity, lookup.listPath, lookup.itemsPath, lookup.hasMorePath, lookup.pageParam, lookup.pageSizeParam],
    ['Comanda', 'lista', 'items', 'lista.hasMore', 'page', 'pageSize'],
  );
  assert.deepEqual(lookup.filters.map(filter => [filter.path, filter.required]), [['number', false], ['mesaCode', false]]);
  assert.deepEqual(lookup.related, [{ path: 'mesa', entity: 'Mesa', fields: ['code'] }]);
});

test('the model never sees version inputs and sees refEntity on record inputs', () => {
  const view = catalogForPrompt(catalog) as { commands: Array<{ route: string; inputs: Array<{ path: string; refEntity?: string }> }> };
  const fechar = view.commands.find(item => item.route === 'resto.fechamento.fecharComanda');
  assert.ok(fechar);
  assert.equal(fechar.inputs.some(input => input.path === 'version'), false);
  assert.equal(fechar.inputs.find(input => input.path === 'id')?.refEntity, 'Comanda');
});

test('humanize turns identifiers into a readable label', () => {
  assert.equal(humanize('precoVigente'), 'Preco vigente');
  assert.equal(humanize('lancar_item'), 'Lancar item');
});

test('every read route is also a query: its entity is the first one it returns, paging is not an input', () => {
  const comandas = catalog.queries.find(item => item.route === 'resto.fechamento.comandasAbertas');
  assert.ok(comandas);
  assert.deepEqual([comandas.kind, comandas.entity, comandas.pageParam, comandas.pageSizeParam], ['qry', 'Comanda', 'page', 'pageSize']);
  assert.deepEqual(comandas.inputs.map(input => [input.path, input.role, input.valueType]), [['number', 'value', 'integer'], ['mesaCode', 'value', 'string']]);
  const item = catalog.queries.find(entry => entry.route === 'resto.cardapio.obterItem');
  assert.deepEqual(item?.inputs.map(input => [input.path, input.role, input.ref]), [['id', 'ref', 'ItemCardapio']]);
  const view = catalogForPrompt(catalog) as { queries: Array<{ route: string; returns: string }> };
  assert.equal(view.queries.find(entry => entry.route === 'resto.cardapio.obterItem')?.returns, 'ItemCardapio');
});
