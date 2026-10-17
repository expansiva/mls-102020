/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BffNormalize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { normalizeD2BffDesign, type D2BffDesign, type D2BffEndpoint, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';

const entities = {
  Tarefa: { record: { fields: { prazo: { type: 'string' }, titulo: { type: 'string' }, id: { type: 'string' } } } },
} as unknown as Record<string, Ns5OntologyAnyEntity>;

const bindings: D2BffDesign['bindings'] = { organisms: [], commands: [], selections: [], journeys: [], updates: [] };

const leaf = (name: string, path: string, type = 'number'): D2BffLeaf => ({ name, type, origin: { kind: 'field', paths: [path] } });

const endpoint = (kind: D2BffEndpoint['kind'], input: D2BffLeaf[], jsdocInput: string): D2BffEndpoint => ({
  id: 'listar', kind, when: 'interaction', input, output: [], rules: [],
  jsdoc: { purpose: 'tarefaId stays here', input: jsdocInput, processing: '', output: '' },
});

const design = (row: D2BffEndpoint): D2BffDesign => ({ types: [], endpoints: [row], bindings });

void test('a query keeps two roles of one field; a command still folds them; jsdoc follows a renamed input', () => {
  const query = normalizeD2BffDesign(design(endpoint('qry', [leaf('prazoDe', 'Tarefa.prazo'), leaf('prazoAte', 'Tarefa.prazo')], 'prazoDe/prazoAte')), entities);
  assert.deepEqual(query.endpoints[0].input.map(item => `${item.name}:${item.type}`), ['prazoDe:string', 'prazoAte:string']);

  const command = normalizeD2BffDesign(design(endpoint('cmd', [leaf('tituloDe', 'Tarefa.titulo'), leaf('tituloAte', 'Tarefa.titulo')], '')), entities);
  assert.deepEqual(command.endpoints[0].input.map(item => item.name), ['titulo']);

  const renamed = normalizeD2BffDesign(design(endpoint('qry', [leaf('tarefaId', 'Tarefa.id')], 'tarefaId: the task; tarefaIdExtra stays')), entities);
  assert.equal(renamed.endpoints[0].input[0].name, 'id');
  assert.equal(renamed.endpoints[0].jsdoc.input, 'id: the task; tarefaIdExtra stays');
  assert.equal(renamed.endpoints[0].jsdoc.purpose, 'tarefaId stays here');
});
