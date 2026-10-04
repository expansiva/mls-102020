/// <mls fileReference="_102020_/l2/helpers/contractV2/render.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { parseD2ContractV2, renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition } from '/_102020_/l2/helpers/contractV2/types.js';

void test('parse(render) keeps meta and the real projection entity', () => {
  const definition: D2ContractV2Definition = {
    module: 'alpha',
    pageId: 'rows',
    projections: [
      { name: 'WidgetLoad', entityId: 'Widget', requestIds: ['load'], body: '  id: string;' },
      { name: 'WidgetOpen', entityId: 'Widget', requestIds: ['loadWidget'], body: '  id: string;' },
    ],
    routes: [
      {
        route: 'alpha.rows.load',
        kind: 'qry',
        input: '{ search?: string; code?: string; page?: number; pageSize?: number }',
        output: '{ widgets: WidgetLoad[]; pageRows: number; pageSizeRows: number; hasMoreRows: boolean }',
        meta: {
          output: { widgets: { entity: 'Widget', many: true } },
          lists: { rows: { key: 'widgets', page: 'pageRows', pageSize: 'pageSizeRows', hasMore: 'hasMoreRows' } },
          params: {
            search: { filters: 'widgets', field: 'details.label' },
            code: { filters: 'widgets', field: 'code' },
            page: { pages: 'rows' },
            pageSize: { pages: 'rows' },
          },
        },
        rules: ['keep'],
        access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' },
      },
      {
        route: 'alpha.rows.loadWidget',
        kind: 'qry',
        input: '{ id?: string }',
        output: '{ widget: WidgetOpen }',
        meta: {
          output: { widget: { entity: 'Widget', many: false } },
          lists: {},
          params: { id: { filters: 'widget', field: 'id' } },
        },
        rules: [],
        access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' },
      },
      {
        route: 'alpha.rows.saveWidget',
        kind: 'cmd',
        writes: 'Widget.create',
        input: '{ code: string }',
        output: '{ widget: WidgetOpen }',
        meta: { output: { widget: { entity: 'Widget', many: false } }, lists: {}, params: {} },
        rules: [],
        access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' },
      },
    ],
  };
  const parsed = parseD2ContractV2(renderD2ContractV2({ project: 1, module: 'alpha', pageId: 'rows' }, definition));
  assert.deepEqual(parsed.routes.map(item => item.meta), definition.routes.map(item => item.meta));
  assert.deepEqual(parsed.projections.map(item => ({ name: item.name, entityId: item.entityId })), [
    { name: 'WidgetLoad', entityId: 'Widget' },
    { name: 'WidgetOpen', entityId: 'Widget' },
  ]);
});

void test('d2_73: a JSDoc above each route, with kind:, writes: and rules: in its text, does not change what the parser reads', async () => {
  const { buildD2ContractFromBff, renderD2ContractWithJsdoc } = await import('/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js');
  const prose = "kind: 'cmd'; writes: 'Widget.create'; rules: ['keep']; */ input: { x: string };\n    output: {}";
  const design = {
    types: [{ name: 'WidgetRow', description: prose, fields: [{ name: 'id', type: 'string', origin: { kind: 'field' as const, paths: ['Widget.id'] } }] }],
    endpoints: [
      { id: 'load', kind: 'qry' as const, when: 'onLoad', input: [], output: [{ name: 'widgets', type: 'WidgetRow[]' }], rules: [], jsdoc: { purpose: prose, input: prose, processing: prose, output: prose } },
      { id: 'saveWidget', kind: 'cmd' as const, when: 'saveWidget', writes: 'Widget.create', input: [{ name: 'code', type: 'string', origin: { kind: 'field' as const, paths: ['Widget.code'] } }],
        output: [{ name: 'widget', type: 'WidgetRow' }], rules: ['keep'], jsdoc: { purpose: prose, input: prose, processing: prose, output: prose } },
    ],
    bindings: { organisms: [], commands: [], selections: [], journeys: [] },
  };
  const definition = buildD2ContractFromBff({ module: 'alpha', pageId: 'rows', design, access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' }, entities: {} });
  const location = { project: 1, module: 'alpha', pageId: 'rows' };
  const withDoc = parseD2ContractV2(renderD2ContractWithJsdoc(location, definition, design, 'en'));
  const plain = parseD2ContractV2(renderD2ContractV2(location, definition));
  const readable = (routes: D2ContractV2Definition['routes']) => routes.map(({ access: _access, ...route }) => route);
  assert.deepEqual(readable(withDoc.routes), readable(plain.routes));
  assert.equal(withDoc.routes[0].writes, undefined);
  assert.deepEqual(withDoc.routes.map(item => item.rules), [[], ['keep']]);
  assert.deepEqual(withDoc.projections.map(item => item.name), ['WidgetRow']);
  // The same text pasted raw, without the one-line and no-quote form, gives the query the next command's write.
  const raw = renderD2ContractV2(location, definition).replace("  'alpha.rows.saveWidget': {", `  /** ${prose} */\n  'alpha.rows.saveWidget': {`);
  assert.equal(parseD2ContractV2(raw).routes[0].writes, 'Widget.create');
});
