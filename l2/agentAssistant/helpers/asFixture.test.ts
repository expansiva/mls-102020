/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asFixture.test.ts" enhancement="_blank"/>

// Test fixture (no node:test import, so the runner treats it as data): one small module written in
// the exact shapes the generators emit — l4 ontology modules, an l2 contract with named types and
// a `readonly` member, and l1 requests defs. Shared by the catalog and plan tests.

import type { AsBffCall, AsModuleSources } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';

const entity = (name: string, body: Record<string, unknown>): string =>
  `/// <mls fileReference="_1_/l4/resto/ontology/${name}.defs.ts" enhancement="_blank"/>\n\nimport type { X } from '/_102035_/l2/solution/types.js';\n\nexport const restoEntity${name} = ${JSON.stringify({ schemaVersion: 'v3', moduleName: 'resto', entityId: name, ...body }, null, 2)} as const satisfies X;\n\nexport default restoEntity${name};\n`;

const ID = { type: 'uuid', required: true, derived: true, title: 'Id' };
const VERSION = { type: 'integer', required: true, derived: true };

export const ONTOLOGY = [
  entity('Mesa', { title: 'Mesa', displayField: 'code', record: { fields: { id: ID, version: VERSION, code: { type: 'string', required: true, title: 'Código da mesa' } } } }),
  entity('Comanda', {
    title: 'Comanda',
    displayField: 'number',
    record: {
      fields: {
        id: ID,
        version: VERSION,
        number: { type: 'integer', required: true, title: 'Número' },
        mesaId: { type: 'record', required: true, to: ['Mesa'], title: 'Mesa' },
        details: {
          type: 'object',
          fields: {
            paymentMethod: { type: 'enum', title: 'Forma de pagamento', values: [{ value: 'cash', title: 'Dinheiro' }, { value: 'pix', title: 'Pix' }] },
          },
        },
      },
    },
  }),
  entity('ItemCardapio', {
    title: 'Item do cardápio',
    displayField: 'name',
    record: { fields: { id: ID, version: VERSION, name: { type: 'string', required: true, title: 'Nome' }, details: { type: 'object', fields: { precoVigente: { type: 'money', required: true, title: 'Preço vigente', description: 'Preço cobrado hoje.' } } } } },
  }),
  entity('ItemComanda', {
    title: 'Item da comanda',
    displayField: 'id',
    record: {
      fields: {
        id: ID,
        comandaId: { type: 'record', required: true, to: ['Comanda'], title: 'Comanda' },
        itemCardapioId: { type: 'record', required: true, to: ['ItemCardapio'], title: 'Item do cardápio' },
        substituiItemId: { type: 'record', to: ['ItemCardapio'], title: 'Substitui o item' },
        details: { type: 'object', fields: { quantidade: { type: 'integer', required: true, title: 'Quantidade' }, observacao: { type: 'text', title: 'Observação' } } },
      },
    },
  }),
];

export const CONTRACT = `/// <mls fileReference="_1_/l2/resto/web/contracts/main.defs.ts" enhancement="_blank"/>

/** Detalhes do item. */
export interface DetalhesItemCardapio {
  details: {
    precoVigente: string;
  };
}

export interface ComandaLinha {
  id: string;
  number: number;
  mesa: { code: string };
}

export type Pagamento = 'cash' | 'pix';

export interface RestoContracts {
  /**
   * Finalidade: Lança um item na comanda.
   */
  'resto.atendimento.abrirComanda': {
    kind: 'cmd';
    writes: 'Comanda.create';
    input: { mesaId: string };
    output: { ok: boolean };
    rules: [];
    access: { actors: ['garcom']; grants: ['g1']; scope: 'organization' };
  };
  'resto.mesas.todas': {
    kind: 'qry';
    input: {};
    output: { mesas: Array<{ id: string; code: string }> };
    rules: [];
    access: { actors: ['garcom']; grants: ['g1']; scope: 'organization' };
  };
  'resto.atendimento.lancarItem': {
    kind: 'cmd';
    writes: 'ItemComanda.create';
    input: { comandaId: string; itemCardapioId: string; substituiItemId?: string; details: { quantidade: number; observacao?: string } };
    output: { ok: boolean };
    rules: ['itensSomenteEmComandaAberta'];
    access: { actors: ['garcom']; grants: ['g1']; scope: 'organization' };
  };
  'resto.cardapio.cadastrarItemCardapio': {
    kind: 'cmd';
    writes: 'ItemCardapio.create';
    input: { name: string; details: DetalhesItemCardapio };
    output: { item: { id: string } };
    rules: [];
    access: { actors: ['caixa']; grants: ['g2']; scope: 'organization' };
  };
  'resto.fechamento.fecharComanda': {
    kind: 'cmd';
    writes: 'Comanda.fecharComanda';
    input: { id: string; version: number; details: { paymentMethod: Pagamento } };
    output: { ok: boolean };
    rules: [];
    access: { actors: ['caixa']; grants: ['g2']; scope: 'organization' };
  };
  'resto.mesas.removerMesa': {
    kind: 'cmd';
    writes: 'Mesa.delete';
    input: { id: string };
    output: { ok: boolean };
    rules: [];
    access: { actors: ['caixa']; grants: ['g2']; scope: 'organization' };
  };
  'resto.fechamento.comandasAbertas': {
    kind: 'qry';
    input: { number?: number; mesaCode?: string; page: number; pageSize: number };
    output: { lista: { items: ComandaLinha[]; readonly page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['garcom']; grants: ['g1']; scope: 'organization' };
  };
  'resto.cardapio.obterItem': {
    kind: 'qry';
    input: { id: string };
    output: { item: { id: string; name: string; details: DetalhesItemCardapio } };
    rules: [];
    access: { actors: ['caixa']; grants: ['g2']; scope: 'organization' };
  };
  'resto.cardapio.itens': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { pagina: { items: Array<{ id: string; name: string }>; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['caixa']; grants: ['g2']; scope: 'organization' };
  };
}
`;

const requestsDef = (requests: unknown[]): string =>
  `/// <mls fileReference="_1_/l1/resto/layer_2_application/requests/main.defs.ts" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify({ schemaVersion: 'd1', artifactType: 'requestService', data: { pageId: 'main', requests } }, null, 2)};\n`;

const listOutput = (path: string, entityId: string) => ({
  kind: 'list', path, entity: entityId, items: 'items', page: `${path}.page`, pageSize: `${path}.pageSize`, hasMore: `${path}.hasMore`, fields: [{ field: 'id', path: 'id' }],
});
const paging = (target: string) => [{ name: 'page', target, pages: target }, { name: 'pageSize', target, pages: target }];

export const REQUESTS = [requestsDef([
  { route: 'resto.atendimento.abrirComanda', kind: 'cmd', output: [], params: [], doc: { purpose: 'Abre uma comanda para a mesa.' } },
  { route: 'resto.mesas.todas', kind: 'qry', output: [{ kind: 'list', path: 'mesas', entity: 'Mesa', items: '', fields: [{ field: 'id', path: 'id' }, { field: 'code', path: 'code' }] }], params: [], doc: { purpose: 'Lista as mesas.' } },
  { route: 'resto.atendimento.lancarItem', kind: 'cmd', output: [], params: [], doc: { purpose: 'Lança um item do cardápio numa comanda aberta.' } },
  { route: 'resto.cardapio.cadastrarItemCardapio', kind: 'cmd', output: [], params: [], doc: { purpose: 'Cadastra um item no cardápio.' } },
  { route: 'resto.fechamento.fecharComanda', kind: 'cmd', output: [], params: [], doc: { purpose: 'Fecha a comanda paga.' } },
  { route: 'resto.mesas.removerMesa', kind: 'cmd', output: [], params: [], doc: { purpose: 'Remove a mesa.' } },
  {
    route: 'resto.fechamento.comandasAbertas',
    kind: 'qry',
    output: [listOutput('lista', 'Comanda'), { kind: 'related', path: 'lista.items.mesa', entity: 'Mesa', relationship: 'comandaMesa', fields: [{ field: 'code', path: 'code' }] }],
    params: paging('lista'),
    doc: { purpose: 'Lista as comandas abertas.' },
  },
  { route: 'resto.cardapio.itens', kind: 'qry', output: [listOutput('pagina', 'ItemCardapio')], params: paging('pagina'), doc: { purpose: 'Lista o cardápio.' } },
  { route: 'resto.cardapio.obterItem', kind: 'qry', output: [{ kind: 'entity', path: 'item', entity: 'ItemCardapio', fields: [{ field: 'id', path: 'id' }] }], params: [{ name: 'id', target: 'item', field: 'id' }], doc: { purpose: 'Obtém um item do cardápio com o preço.' } },
])];

// removerMesa is NOT registered by the backend: it must stay out of the catalog.
export const LIVE_ROUTES = [
  'resto.atendimento.abrirComanda',
  'resto.mesas.todas',
  'resto.atendimento.lancarItem',
  'resto.cardapio.cadastrarItemCardapio',
  'resto.fechamento.fecharComanda',
  'resto.fechamento.comandasAbertas',
  'resto.cardapio.itens',
  'resto.cardapio.obterItem',
];

export function fixtureModule(): AsModuleSources {
  return { module: 'resto', routeKeys: LIVE_ROUTES, requests: REQUESTS, contracts: [CONTRACT], ontology: ONTOLOGY };
}

export const COMANDAS = [
  { id: 'c-12', version: 3, number: 12, mesa: { code: '1' }, details: { totalComanda: '57.90' } },
  { id: 'c-15', version: 1, number: 15, mesa: { code: '10' }, details: { totalComanda: '12.00' } },
  { id: 'c-20', version: 7, number: 20, mesa: { code: '4' }, details: { totalComanda: '0.00' } },
];

export const ITENS = [
  { id: 'i-1', name: 'Salada Caesar' },
  { id: 'i-2', name: 'Salada Verde' },
  { id: 'i-3', name: 'Suco de Laranja' },
  { id: 'i-5', name: 'Bife acebolado' },
];

export const MESAS = [
  { id: 'm-1', code: '1' },
  { id: 'm-2', code: '2' },
  { id: 'm-4', code: '4' },
  { id: 'm-10', code: '10' },
];

export interface FakeBff {
  call: AsBffCall;
  calls: Array<{ routine: string; params: Record<string, unknown> }>;
}

// Serves the fixture lists (paged) and records every call, commands included. abrirComanda really
// opens a comanda (so a later action in the same sequence finds it) and refuses a table that
// already has one open, like the real rule.
export function fakeBff(): FakeBff {
  const calls: FakeBff['calls'] = [];
  const comandas = COMANDAS.map(row => ({ ...row, mesa: { ...row.mesa } }));
  const page = <T>(rows: T[], params: Record<string, unknown>) => {
    const size = Number(params.pageSize) || rows.length;
    const index = (Number(params.page) || 1) - 1;
    const items = rows.slice(index * size, index * size + size);
    return { items, page: index + 1, pageSize: size, hasMore: (index + 1) * size < rows.length };
  };
  const call: AsBffCall = async (routine, params) => {
    calls.push({ routine, params });
    if (routine === 'resto.fechamento.comandasAbertas') {
      const rows = comandas
        .filter(row => typeof params.mesaCode !== 'string' || row.mesa.code === params.mesaCode)
        .filter(row => typeof params.number !== 'number' || row.number === params.number);
      return { ok: true, data: { lista: page(rows, params) }, error: null };
    }
    if (routine === 'resto.cardapio.itens') return { ok: true, data: { pagina: page(ITENS, params) }, error: null };
    if (routine === 'resto.mesas.todas') return { ok: true, data: { mesas: MESAS }, error: null };
    if (routine === 'resto.cardapio.obterItem') {
      const item = ITENS.find(row => row.id === params.id);
      if (!item) return { ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Item não encontrado.' } };
      return { ok: true, data: { item: { ...item, details: { details: { precoVigente: '24.90' } } } }, error: null };
    }
    if (routine === 'resto.atendimento.abrirComanda') {
      const mesa = MESAS.find(row => row.id === params.mesaId);
      if (!mesa) return { ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Mesa não encontrada.' } };
      if (comandas.some(row => row.mesa.code === mesa.code)) return { ok: false, data: null, error: { code: 'CONFLICT', message: 'A mesa já tem uma comanda aberta.' } };
      comandas.push({ id: `c-new-${mesa.code}`, version: 1, number: 30 + comandas.length, mesa: { code: mesa.code }, details: { totalComanda: '0.00' } });
      return { ok: true, data: { ok: true }, error: null };
    }
    return { ok: true, data: { ok: true }, error: null };
  };
  return { call, calls };
}
