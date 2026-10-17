/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BffNormalize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { normalizeD2BffDesign, type D2BffDesign, type D2BffEndpoint, type D2BffLeaf, type D2BffType } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2ContractFromBff } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';

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

const ref = (name: string, type: string): D2BffLeaf => ({ name, type });
const type = (name: string, fields: D2BffLeaf[]): D2BffType => ({ name, description: '', fields });
const qry = (output: D2BffLeaf[]): D2BffEndpoint => ({
  id: 'load', kind: 'qry', when: 'onLoad', input: [], output, rules: [],
  jsdoc: { purpose: 'open', input: 'none', processing: 'all', output: 'row' },
});

void test('a mounted type drops the mount prefix; an unmounted type and two prefixes stay; the contract has one details', () => {
  const nested = normalizeD2BffDesign({
    types: [
      type('A', [leaf('id', 'A.id', 'string'), ref('details', 'ADetails')]),
      type('ADetails', [leaf('totalEscrito', 'A.details.total')]),
      type('Solto', [leaf('totalEscrito', 'A.details.total')]),
      type('Esquerda', [ref('details', 'NosDois')]),
      type('Direita', [ref('extra', 'NosDois')]),
      type('NosDois', [leaf('totalEscrito', 'A.details.total')]),
      type('MembroRef', [ref('details', 'MembroRefDetails')]),
      type('MembroRefDetails', [ref('identification', 'MembroRefIdentification')]),
      type('MembroRefIdentification', [leaf('nomeEscrito', 'Membro.details.identification.name', 'string')]),
    ],
    endpoints: [qry([{ name: 'row', type: 'A' }])],
    bindings,
  }, entities);
  const names = (typeName: string): string[] => nested.types.find(item => item.name === typeName)!.fields.map(item => item.name);
  assert.deepEqual(names('ADetails'), ['total']);
  assert.deepEqual(names('Solto'), ['details.total']);
  assert.deepEqual(names('NosDois'), ['details.total']);
  assert.deepEqual(names('MembroRefIdentification'), ['name']);
  assert.deepEqual(nested.endpoints[0].output.map(item => item.name), ['row']);

  const source = renderD2ContractV2(
    { project: 1, module: 'alpha', pageId: 'rows' },
    buildD2ContractFromBff({
      module: 'alpha', pageId: 'rows', design: nested,
      access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' },
      entities, userLanguage: 'en',
    }),
  );
  assert.match(source, /interface A \{[^}]*details: ADetails;/su);
  assert.match(source, /interface ADetails \{[^}]*total: number;/su);
  assert.doesNotMatch(source, /interface ADetails \{[^}]*details:/su);
});

// Excerpts of tarefas bff55 responses inicio_membro-1.json and inicio_gestor-1.json (102047 9587aaa).
const from = (name: string, type: string, path: string): D2BffLeaf => ({ name, type, origin: { kind: 'field', paths: [path] } });

void test('a named type mounted through a field origin drops that origin path, not a nested details', () => {
  const nested = normalizeD2BffDesign({
    types: [
      type('TarefaResumoDetalhes', [
        from('aberta', 'boolean', 'Tarefa.details.aberta'),
        from('venceHoje', 'boolean', 'Tarefa.details.venceHoje'),
        from('atrasada', 'boolean', 'Tarefa.details.atrasada'),
        from('progressoChecklist', 'string', 'Tarefa.details.progressoChecklist'),
      ]),
      type('TarefaResumo', [
        from('id', 'string', 'Tarefa.id'),
        from('details', 'TarefaResumoDetalhes', 'Tarefa.details'),
      ]),
      type('ListaResumoDetalhes', [from('quantidadeTarefasAbertas', 'number', 'Lista.details.quantidadeTarefasAbertas')]),
      type('ListaResumo', [from('details', 'ListaResumoDetalhes', 'Lista.details')]),
      type('MembroNomeIdentificacao', [from('name', 'string', 'MembroEquipe.details.identification.name')]),
      type('MembroNomeDetalhes', [from('identification', 'MembroNomeIdentificacao', 'MembroEquipe.details.identification')]),
      type('MembroNome', [from('details', 'MembroNomeDetalhes', 'MembroEquipe.details')]),
    ],
    endpoints: [qry([{ name: 'row', type: 'TarefaResumo' }])],
    bindings,
  }, entities);
  const names = (typeName: string): string[] => nested.types.find(item => item.name === typeName)!.fields.map(item => item.name);
  assert.deepEqual(names('TarefaResumoDetalhes'), ['aberta', 'venceHoje', 'atrasada', 'progressoChecklist']);
  assert.deepEqual(names('ListaResumoDetalhes'), ['quantidadeTarefasAbertas']);
  assert.deepEqual(names('MembroNomeIdentificacao'), ['name']);
  assert.deepEqual(names('MembroNomeDetalhes'), ['identification']);
  assert.deepEqual(names('MembroNome'), ['details']);
});
