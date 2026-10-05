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

void test('d2_78: routes without meta and a JSDoc with kind:, writes:, rules: and { in its text parse back, with the JSDoc exposed', async () => {
  const { buildD2ContractFromBff } = await import('/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js');
  const prose = "kind: 'cmd'; writes: 'Widget.create'; rules: ['keep']; */ input: { x: string };\n    output: {}";
  const design = {
    types: [{ name: 'WidgetRow', description: prose, fields: [{ name: 'id', type: 'string', origin: { kind: 'field' as const, paths: ['Widget.id'] } }] }],
    endpoints: [
      { id: 'load', kind: 'qry' as const, when: 'onLoad', input: [], output: [{ name: 'widgets', type: 'WidgetRow[]' }], rules: [], jsdoc: { purpose: prose, input: prose, processing: prose, output: prose } },
      { id: 'saveWidget', kind: 'cmd' as const, when: 'saveWidget', writes: 'Widget.create', input: [{ name: 'code', type: 'string', origin: { kind: 'field' as const, paths: ['Widget.code'] } }],
        output: [{ name: 'widget', type: 'WidgetRow' }], rules: ['keep'], jsdoc: { purpose: 'Save { a widget }.', input: 'code.', processing: 'Refuses an empty code (keep).', output: 'the widget.' } },
    ],
    bindings: { organisms: [], commands: [], selections: [], journeys: [], updates: [] },
  };
  const definition = buildD2ContractFromBff({ module: 'alpha', pageId: 'rows', design, access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' }, entities: {}, userLanguage: 'en' });
  const source = renderD2ContractV2({ project: 1, module: 'alpha', pageId: 'rows' }, definition);
  assert.doesNotMatch(source, /\bmeta:/u);
  const parsed = parseD2ContractV2(source);
  const readable = (routes: D2ContractV2Definition['routes']) => routes.map(({ access: _access, ...route }) => route);
  assert.deepEqual(readable(parsed.routes), readable(definition.routes));
  assert.equal(parsed.routes[0].writes, undefined);
  assert.deepEqual(parsed.routes.map(item => item.rules), [[], ['keep']]);
  assert.deepEqual(parsed.routes[0].meta, { output: {}, lists: {}, params: {} });
  assert.equal(parsed.routes[1].jsdoc?.purpose, 'Save { a widget }.');
  assert.match(parsed.routes[1].jsdoc?.raw ?? '', /^Purpose: Save \{ a widget \}\.\nInput: code\.\nProcessing: Refuses an empty code \(keep\)\.\nOutput: the widget\.$/u);
  assert.equal(parsed.projections[0].jsdoc, definition.projections[0].jsdoc);
  assert.deepEqual(parsed.projections[0].fields, [{ name: 'id', type: 'string', optional: false, readonly: false }]);
  // A comment whose lines carry no known labels keeps only the raw text.
  const free = parseD2ContractV2(source.replace('   * Purpose: Save', '   * Why: Save'));
  assert.deepEqual(Object.keys(free.routes[1].jsdoc ?? {}), ['raw']);
});

void test('fromSupervisorL1: a contract cut short throws, at any cut, instead of parsing as a valid route', async () => {
  const { buildD2ContractFromBff } = await import('/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js');
  const design = {
    types: [{ name: 'WidgetRow', description: 'One widget.', fields: [{ name: 'id', type: 'string', origin: { kind: 'field' as const, paths: ['Widget.id'] } }] }],
    endpoints: [
      { id: 'load', kind: 'qry' as const, when: 'onLoad', input: [], output: [{ name: 'widgets', type: 'WidgetRow[]' }], rules: [], jsdoc: { purpose: 'Open.', input: 'None.', processing: 'All.', output: 'widgets.' } },
      { id: 'saveWidget', kind: 'cmd' as const, when: 'saveWidget', writes: 'Widget.create', input: [{ name: 'code', type: 'string', origin: { kind: 'field' as const, paths: ['Widget.code'] } }],
        output: [{ name: 'widget', type: 'WidgetRow' }], rules: ['keep'], jsdoc: { purpose: 'Save.', input: 'code.', processing: 'Keep.', output: 'the widget.' } },
    ],
    bindings: { organisms: [], commands: [], selections: [], journeys: [], updates: [] },
  };
  const source = renderD2ContractV2({ project: 1, module: 'alpha', pageId: 'rows' }, buildD2ContractFromBff({ module: 'alpha', pageId: 'rows', design, access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' }, entities: {}, userLanguage: 'en' }));
  assert.equal(parseD2ContractV2(source).routes.length, 2);
  // Every cut from the page interface onwards throws (the cut in half of the L1 test is one of them).
  const start = source.indexOf('export interface RowsContracts {');
  for (let end = start; end < source.length; end += 1) {
    assert.throws(() => parseD2ContractV2(source.slice(0, end)), /D2_CONTRACT_V2_SOURCE_SHAPE/u, `cut at ${end}`);
  }
  assert.throws(() => parseD2ContractV2(source.slice(0, Math.floor(source.length / 2))), /D2_CONTRACT_V2_SOURCE_SHAPE/u);
  // The empty contract of a page without endpoints is not a cut one.
  assert.deepEqual(parseD2ContractV2('/// <mls fileReference="_1_/l2/alpha/web/contracts/hub.defs.ts" enhancement="_blank"/>\n\nexport {};\n').routes, []);
});
