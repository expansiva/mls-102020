/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/contract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { contractsInterfaceName, parseL2Contract, typeMembers } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';

const real = (module: string, pageId: string) => readFileSync(new URL(`../../../../../mls-102047/l2/${module}/web/contracts/${pageId}.defs.ts`, import.meta.url), 'utf8');

// agendaClinica (02/10/2026): snake_case page ids; the interface regex of the official parser has no `_`.
const snakeCase = [
  '/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/agenda_profissional.defs.ts" enhancement="_blank"/>',
  '',
  'export interface Consulta_agendaLoad {',
  '  id: string;',
  '}',
  '',
  'export interface Agenda_profissionalContracts {',
  '  /**',
  '   * Finalidade: Lista as consultas do dia.',
  '   * Entrada: Página.',
  '   * Processamento: Ordena por horário.',
  '   * Saída: As consultas e se há mais.',
  '   */',
  "  'agendaClinica.agenda_profissional.load': {",
  "    kind: 'qry';",
  '    input: { page?: number };',
  '    output: { consultas: Consulta_agendaLoad[]; hasMoreAgenda: boolean };',
  '    rules: [];',
  "    access: { actors: ['profissional']; grants: ['verAgenda']; scope: 'organization' };",
  '  };',
  '}',
  '',
].join('\n');

test('a snake_case page id: interface found, routes, members and the route JSDoc read', () => {
  assert.equal(contractsInterfaceName('agenda_profissional'), 'Agenda_profissionalContracts');
  const { location, definition } = parseL2Contract(snakeCase);
  assert.deepEqual(location, { project: 102047, module: 'agendaClinica', pageId: 'agenda_profissional' });
  assert.deepEqual(definition.projections.map(item => item.name), ['Consulta_agendaLoad']);
  const [route] = definition.routes;
  assert.deepEqual([route.route, route.requestId, route.kind], ['agendaClinica.agenda_profissional.load', 'load', 'qry']);
  assert.deepEqual(route.outputMembers.map(member => member.name), ['consultas', 'hasMoreAgenda']);
  assert.equal(route.jsdoc?.purpose, 'Lista as consultas do dia.');
  assert.equal(route.jsdoc?.output, 'As consultas e se há mais.');
});

test('CRLF is normalized, and a hub page has the empty contract', () => {
  assert.equal(parseL2Contract(snakeCase.replace(/\n/gu, '\r\n')).definition.routes.length, 1);
  const hub = parseL2Contract('/// <mls fileReference="_102047_/l2/mod/web/contracts/inicio.defs.ts" enhancement="_blank"/>\n\nexport {};\n');
  assert.deepEqual(hub.definition.routes, []);
});

test('the current contracts of comandaRestaurante: JSDoc per route, readonly leaves by dotted path', () => {
  const { definition } = parseL2Contract(real('comandaRestaurante', 'mesas'));
  assert.deepEqual(definition.routes.map(route => route.requestId), ['carregarMesas', 'criarMesa', 'atualizarMesa']);
  assert.ok(definition.routes.every(route => route.jsdoc?.purpose && route.jsdoc.output), 'every route has Finalidade and Saída');
  const mesa = definition.projections.find(item => item.name === 'MesaResumo')!;
  assert.deepEqual(mesa.fields.map(field => [field.name, field.readonly]), [['id', false], ['version', false], ['code', false], ['details.disponivel', true]]);
  for (const pageId of readdirSync(new URL('../../../../../mls-102047/l2/comandaRestaurante/web/contracts/', import.meta.url)).map(name => name.replace('.defs.ts', ''))) {
    assert.ok(parseL2Contract(real('comandaRestaurante', pageId)).definition.routes.length > 0, pageId);
  }
});

test('typeMembers splits only at the top level', () => {
  assert.deepEqual(typeMembers('{ a: { b: string; c: number }; d?: X[] }').map(member => [member.name, member.optional, member.type]), [['a', false, '{ b: string; c: number }'], ['d', true, 'X[]']]);
});
