/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BffCommandInput.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { checkD2Bff, type D2BffCheckContext, type D2BffDesign, type D2BffLeaf } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import type { D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';

const jsdoc = { purpose: 'p', input: 'i', processing: 'c', output: 'o' };
const organism = (id: string, kind: 'submit' | 'navigate' = 'submit'): D2Page11Definition['organisms'][string] => ({ kind: 'form', text: id, intents: [{ id, kind }] });

function page(organisms: D2Page11Definition['organisms']): D2Page11Definition {
  return { template: { category: 'c', experience: 'e' }, intent: 'i', sections: [], organisms, molecules: {} };
}

function needs(organisms: D2Page11Needs['organisms']): D2Page11Needs {
  return { organisms };
}

function leaf(path: string): D2BffLeaf {
  return { name: path.split('.').pop() ?? path, type: 'string', origin: { kind: 'field', paths: [path] } };
}

function design(commands: Array<{ id: string; when: string; writes: string; input: string[] }>): D2BffDesign {
  return {
    types: [],
    endpoints: [
      { id: 'listar', kind: 'qry', when: 'onLoad', input: [], output: [], rules: [], jsdoc },
      ...commands.map(command => ({ id: command.id, kind: 'cmd' as const, when: command.when, writes: command.writes, input: command.input.map(leaf), output: [], rules: [], jsdoc })),
    ],
    bindings: {
      organisms: [],
      commands: commands.map(command => ({ endpoint: command.id, refreshes: ['listar'] })),
      selections: [],
      journeys: [],
      updates: [],
    },
  };
}

function issues(context: D2BffCheckContext, built: D2BffDesign): string[] {
  return checkD2Bff(built, context).filter(item => item.code === 'D2_BFF_COMMAND_INPUT').map(item => item.message);
}

const entities = { Recebimento: {} as Ns5OntologyAnyEntity };
const base = { menu: { tree: [], authorities: {} }, entities, grants: [], rules: {} };

test('create asks only for the edits of the organisms that submit it, on both devices', () => {
  const context: D2BffCheckContext = {
    ...base,
    page11: {
      desktop: page({ registroRecebimento: organism('registroRecebimento'), estornoRecebimento: organism('estornoRecebimento') }),
      mobile: page({ registroRecebimento: organism('registroRecebimento') }),
    },
    drafts: {
      desktop: needs({
        registroRecebimento: { reads: [], edits: ['Recebimento.tituloId', 'Recebimento.formaPagamento'], selects: '', submits: [{ intentId: 'registroRecebimento', write: 'Recebimento.create' }] },
        estornoRecebimento: { reads: [], edits: ['Recebimento.details.estorno.motivo'], selects: '', submits: [{ intentId: 'estornoRecebimento', write: 'Recebimento.update' }] },
      }),
      mobile: needs({
        registroRecebimento: { reads: [], edits: ['Recebimento.details.valor', 'Recebimento.details.observacao'], selects: '', submits: [{ intentId: 'registroRecebimento', write: 'Recebimento.create' }] },
      }),
    },
    need: { pageId: 'caixa', actors: [], reads: [], writes: [{ entity: 'Recebimento', operation: 'create' }, { entity: 'Recebimento', operation: 'update' }] },
  };
  const found = issues(context, design([
    { id: 'criar', when: 'registroRecebimento', writes: 'Recebimento.create', input: ['Recebimento.tituloId', 'Recebimento.formaPagamento', 'Recebimento.details.valor', 'Recebimento.details.observacao'] },
    { id: 'estornar', when: 'estornoRecebimento', writes: 'Recebimento.update', input: ['Recebimento.details.estorno.motivo', 'Recebimento.id', 'Recebimento.version'] },
  ]));
  assert.deepEqual(found, []);
});

test('a submit whose organisms edit nothing of the write entity still asks for the page edits', () => {
  const context: D2BffCheckContext = {
    ...base,
    page11: {
      desktop: page({ confirmar: organism('confirmar'), valores: organism('valores', 'navigate') }),
      mobile: page({}),
    },
    drafts: {
      desktop: needs({
        confirmar: { reads: [], edits: ['Outra.campo'], selects: '', submits: [{ intentId: 'confirmar', write: 'Recebimento.create' }] },
        valores: { reads: [], edits: ['Recebimento.details.valor'], selects: '', submits: [] },
      }),
      mobile: needs({}),
    },
    need: { pageId: 'caixa', actors: [], reads: [], writes: [{ entity: 'Recebimento', operation: 'create' }] },
  };
  const found = issues(context, design([
    { id: 'criar', when: 'confirmar', writes: 'Recebimento.create', input: [] },
  ]));
  assert.equal(found.length, 1);
  assert.match(found[0], /Recebimento\.details\.valor/);
});

const relatedEntities = {
  A: { relationships: { b: { to: 'B', via: 'A.bId', required: true } } } as Ns5OntologyAnyEntity,
  B: {} as Ns5OntologyAnyEntity,
};

function createOfA(input: string[]): { context: D2BffCheckContext; built: D2BffDesign } {
  const context: D2BffCheckContext = {
    ...base,
    entities: relatedEntities,
    page11: { desktop: page({ criarA: organism('criarA') }), mobile: page({}) },
    drafts: {
      desktop: needs({
        criarA: { reads: [], edits: ['B.details.email'], selects: '', submits: [{ intentId: 'criarA', write: 'A.create' }] },
      }),
      mobile: needs({}),
    },
    need: { pageId: 'pagina', actors: [], reads: [], writes: [{ entity: 'A', operation: 'create' }] },
  };
  return { context, built: design([{ id: 'criar', when: 'criarA', writes: 'A.create', input }]) };
}

test('create covers a required foreign key when the command carries a field of the related entity', () => {
  const { context, built } = createOfA(['B.details.email']);
  assert.deepEqual(issues(context, built), []);
});

test('create still asks for the required foreign key when the command carries nothing of the related entity', () => {
  const { context, built } = createOfA([]);
  const found = issues(context, built);
  assert.equal(found.length, 1);
  assert.match(found[0], /A\.bId/);
});
