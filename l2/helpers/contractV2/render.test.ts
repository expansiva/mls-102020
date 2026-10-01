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
