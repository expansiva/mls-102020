/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSharedScaffold, parseContractInterfaces } from '/_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.js';

const CONTRACT = `
// bffCall listThings (query) — Output kind=paginated
export interface ListThingsInput {
  nameFilter?: string;
  page?: number;
}
export interface ListThingsOutput {
  things: { thingId: string; name: string }[];
  total: number;
}
export const listThingsRoute = 'demo.things.listThings' as const;

// bffCall createThing (command)
export interface CreateThingInput {
  name: string;
  amount: number;
  notes?: string;
}
export interface CreateThingOutput {}
export const createThingRoute = 'demo.things.createThing' as const;
`;

function definition(): Record<string, unknown> {
  return {
    pageId: 'things',
    baseClassName: 'DemoThingsBase',
    routePattern: '/demo/things/:thingId?',
    contractRef: {
      tsPath: '_102045_/l2/demo/web/contracts/things.ts',
      contracts: [
        { commandName: 'listThings', routeConst: 'listThingsRoute' },
        { commandName: 'createThing', routeConst: 'createThingRoute' },
      ],
    },
    i18n: { 'intent.things.title': "All 'things'" },
    states: [
      { stateKey: 'ui.things.status', name: 'status', kind: 'pageStatus', defaultValue: '' },
      { stateKey: 'ui.things.action.listThings.status', name: 'listThingsState', kind: 'actionStatus', actionRef: 'listThings', valueSet: ['idle', 'loading', 'success', 'error'], defaultValue: 'idle' },
      { stateKey: 'ui.things.input.listThings.nameFilter', name: 'listThingsNameFilter', kind: 'input', source: 'userInput', presentation: 'form', contractRef: { commandName: 'listThings', direction: 'input', field: 'nameFilter' }, defaultValue: '' },
      { stateKey: 'ui.things.input.listThings.page', name: 'listThingsPage', kind: 'input', source: 'userInput', presentation: 'form', contractRef: { commandName: 'listThings', direction: 'input', field: 'page' }, defaultValue: '' },
      { stateKey: 'ui.things.data.listThings', name: 'listThingsData', kind: 'queryResult', contractRef: { commandName: 'listThings', direction: 'output' }, outputShape: 'paginated', collection: false, defaultValue: { items: [], total: 0 } },
      { stateKey: 'ui.things.action.createThing.status', name: 'createThingState', kind: 'actionStatus', actionRef: 'createThing', valueSet: ['idle', 'loading', 'success', 'error'], defaultValue: 'idle' },
      { stateKey: 'ui.things.input.createThing.name', name: 'createThingName', kind: 'input', source: 'userInput', presentation: 'form', contractRef: { commandName: 'createThing', direction: 'input', field: 'name' }, defaultValue: '' },
      { stateKey: 'ui.things.input.createThing.amount', name: 'createThingAmount', kind: 'input', source: 'userInput', presentation: 'form', contractRef: { commandName: 'createThing', direction: 'input', field: 'amount' }, defaultValue: '' },
      { stateKey: 'ui.things.output.createThing', name: 'createThingOutput', kind: 'commandOutput', contractRef: { commandName: 'createThing', direction: 'output' }, defaultValue: null },
      { stateKey: 'ui.things.action.createThing.error', name: 'createThingError', kind: 'actionError', actionRef: 'createThing', defaultValue: '' },
    ],
    actions: [
      {
        actionId: 'listThings', kind: 'query', commandRef: 'listThings', routeKey: 'demo.things.listThings',
        methodName: 'loadListThings', handlerName: 'handleListThingsClick',
        inputStateKeys: ['ui.things.input.listThings.nameFilter', 'ui.things.input.listThings.page'],
        routeParamInputStateKeys: [], selectedEntityInputStateKeys: [],
        outputStateKeys: ['ui.things.data.listThings'], statusStateKey: 'ui.things.action.listThings.status',
      },
      {
        actionId: 'createThing', kind: 'command', commandRef: 'createThing', routeKey: 'demo.things.createThing',
        methodName: 'createThing', handlerName: 'handleCreateThingClick',
        inputStateKeys: ['ui.things.input.createThing.name', 'ui.things.input.createThing.amount'],
        routeParamInputStateKeys: [], selectedEntityInputStateKeys: [],
        outputStateKeys: ['ui.things.output.createThing'], statusStateKey: 'ui.things.action.createThing.status',
        errorStateKey: 'ui.things.action.createThing.error',
        feedback: { successMessageKey: 'action.createThing.success', errorMessageKey: 'action.createThing.error', dismissible: true },
        clearInputStateKeys: ['ui.things.input.createThing.name', 'ui.things.input.createThing.amount'],
        refreshActionIds: ['listThings'],
      },
      { actionId: 'set.listThingsNameFilter', kind: 'stateSetter', stateKey: 'ui.things.input.listThings.nameFilter', methodName: 'setListThingsNameFilter', handlerName: 'handleListThingsNameFilterChange' },
    ],
    initialLoads: [{ actionId: 'listThings', stateKey: 'ui.things.data.listThings' }],
  };
}

test('parseContractInterfaces reads generated contract shapes', () => {
  const interfaces = parseContractInterfaces(CONTRACT);
  const input = interfaces.get('ListThingsInput')!;
  assert.deepEqual(input.fields, [
    { name: 'nameFilter', type: 'string', optional: true },
    { name: 'page', type: 'number', optional: true },
  ]);
  const output = interfaces.get('ListThingsOutput')!;
  assert.deepEqual(output.fields.map(f => [f.name, f.type, f.optional]), [['things', 'array', false], ['total', 'number', false]]);
});

test('generateSharedScaffold renders the full base class', () => {
  const result = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', definition(), CONTRACT);
  assert.equal(result.reason, undefined);
  const code = result.code!;
  // header + imports
  assert.match(code, /^\/\/\/ <mls fileReference="_102045_\/l2\/demo\/web\/shared\/things.ts" enhancement="_102020_\/l2\/enhancementAura"\/>/);
  assert.match(code, /import { runBlockingUiAction } from '\/_102029_\/l2\/interactionRuntime.js';/);
  assert.match(code, /export type {\n  ListThingsInput,/);
  // i18n escaped
  assert.match(code, /'intent.things.title': 'All \\'things\\'',/);
  // paginated default derives from the CONTRACT output (things/total), not from defs defaultValue (items)
  assert.match(code, /const LIST_THINGS_DATA_DEFAULT: ListThingsOutput = { things: \[\], total: 0 };/);
  // properties
  assert.match(code, /@property\(\) listThingsState: 'idle' \| 'loading' \| 'success' \| 'error' = 'idle';/);
  assert.match(code, /@property\(\) listThingsData: ListThingsOutput = LIST_THINGS_DATA_DEFAULT;/);
  assert.match(code, /@property\(\) createThingOutput: CreateThingOutput \| null = null;/);
  // lifecycle + initial load
  assert.match(code, /subscribe\(SUBSCRIBED_STATE_KEYS, this\);\n    void this.loadListThings\(\);/);
  // query: optional number coercion
  assert.match(code, /if \(this.listThingsPage !== ''\) {\n      const pageNum = Number\(this.listThingsPage\);/);
  // command: required number coercion + refresh + clear
  assert.match(code, /const amountNum = Number\(this.createThingAmount\);/);
  assert.match(code, /amount: Number.isNaN\(amountNum\) \? 0 : amountNum,/);
  assert.match(code, /await this.loadListThings\(\);/);
  assert.match(code, /setState\('ui.things.input.createThing.name', ''\);/);
  // class closes
  assert.match(code, /export class DemoThingsBase extends CollabLitElement {/);
  assert.match(code, /\n}\n$/);
});

test('generateSharedScaffold bails on unsupported shapes instead of guessing', () => {
  const data = definition();
  (data.states as Record<string, unknown>[])[1].kind = 'weirdKind';
  const result = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', data, CONTRACT);
  assert.equal(result.code, null);
  assert.match(result.reason!, /unsupported kind: weirdKind/);
});

test('generateSharedScaffold bails when the contract misses a referenced command', () => {
  const result = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', definition(), CONTRACT.replace(/CreateThingInput/g, 'RenamedInput'));
  assert.equal(result.code, null);
  assert.match(result.reason!, /CreateThingInput not found/);
});

// ---------------------------------------------------------------------------
// i18n.md: the catalog must carry EVERY declared locale, and regenerating must not lose translations.

function multiLocaleDefinition(): Record<string, unknown> {
  return { ...definition(), i18nMeta: { defaultLocale: 'en', runtimeLocales: ['en', 'pt-br', 'es'] } };
}

test('generateSharedScaffold emits one catalog per declared locale, default first', () => {
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', multiLocaleDefinition(), CONTRACT).code!;
  assert.match(code, /const message_en = \{/);
  // Non-default locales are annotated so a forgotten key is TS2741 rather than a silent hole.
  assert.match(code, /const message_pt_br: MessageType = \{/);
  assert.match(code, /const message_es: MessageType = \{/);
  assert.match(code, /export type MessageType = typeof message_en;/);
  assert.match(code, /export const messages: \{ \[key: string\]: MessageType \} = \{ 'en': message_en, 'pt-br': message_pt_br, 'es': message_es \};/);
});

test('regenerating carries translations forward instead of resetting every language', () => {
  const previous = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', multiLocaleDefinition(), CONTRACT).code!
    .replace("'intent.things.title': 'All \\'things\\'',\n};\nexport type", "'intent.things.title': 'TRADUZIDO',\n};\nexport type")
    // only the pt-br copy is translated by hand
    .replace(/(const message_pt_br: MessageType = \{\n  'intent.things.title': )'All \\'things\\''/, "$1'TRADUZIDO'");
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', multiLocaleDefinition(), CONTRACT, previous).code!;
  assert.match(code, /const message_pt_br: MessageType = \{\n  'intent.things.title': 'TRADUZIDO',/);
  // the default locale is always rebuilt from the defs — it is the source of truth
  assert.match(code, /const message_en = \{\n  'intent.things.title': 'All \\'things\\'',/);
  // a locale with no prior text starts from the default text for agentAddLanguage to translate
  assert.match(code, /const message_es: MessageType = \{\n  'intent.things.title': 'All \\'things\\'',/);
});

test('a single-locale module still emits exactly one catalog', () => {
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', definition(), CONTRACT).code!;
  assert.equal(code.match(/^const message_/gmu)?.length, 1);
  assert.match(code, /export const messages: \{ \[key: string\]: MessageType \} = \{ 'en': message_en \};/);
});
