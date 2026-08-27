/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueLocales, generateSharedScaffold, parseContractInterfaces, parsePreviousI18n } from '/_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.js';
import { collectMutationEnvelopeErrorIssues } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

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
  assert.match(code, /readErrorMessage\(response\.error/);
  assert.deepEqual(collectMutationEnvelopeErrorIssues(definition(), code), []);
});

// Decision 27/ago: the l4 title (defs `purpose`) rides into the member JSDoc — ONE short line per
// action/handler, never a dump — so the compiled .d.ts artifact is self-explanatory for conferral.
test('generateSharedScaffold puts the l4 purpose into action and handler JSDoc, one line', () => {
  const defs = definition();
  (defs.actions as Record<string, unknown>[])[0].purpose = 'Listar Coisa';
  const result = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', defs, CONTRACT);
  const code = result.code!;
  assert.match(code, /\/\*\* action listThings \(query\) "Listar Coisa" — route demo\.things\.listThings;[^\n]*\*\//);
  assert.match(code, /\/\*\* handler for action listThings "Listar Coisa" — bind UI events here \*\//);
  // absent purpose (createThing) keeps the old shape — nothing invented
  assert.match(code, /\/\*\* action createThing \(command\) — route demo\.things\.createThing;/);
  assert.match(code, /\/\*\* handler for action createThing — bind UI events here \*\//);
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

test('the shared emits NO i18n block: the catalogue lives in the pages', () => {
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', multiLocaleDefinition(), CONTRACT).code!;
  // One catalogue per workspace became one per screen. What the shared stops carrying is the block
  // itself — the pages emit it from the same defs i18n map, so no text is lost, only the indirection.
  assert.ok(!code.includes('collab_i18n_start'), 'no i18n block');
  assert.ok(!/^const message_/mu.test(code), 'no message_<locale> const');
  assert.ok(!code.includes('export type MessageType'), 'MessageType is local to the page now');
  assert.ok(!code.includes('export const messages'), 'nothing exports a catalogue');
  // And the class itself is untouched: it never referenced the catalogue (verified across the 34
  // generated shared of the reference module — the export was the only use).
  assert.match(code, /export class DemoThingsBase extends CollabLitElement \{/u);
  assert.ok(!code.includes('this.msg'), 'the shared reads no message');
});

test('parsePreviousI18n still reads a shared catalogue written by the previous generator', () => {
  // Format compatibility matters after the cut too: a module regenerated later must still be able to
  // read the translations sitting in the file it is replacing.
  const legacy = generateSharedScaffoldLegacyCatalogue();
  const byLocale = parsePreviousI18n(legacy);
  assert.deepEqual([...byLocale.keys()], ['en', 'pt-br']);
  assert.equal(byLocale.get('pt-br')!['intent.things.title'], 'TRADUZIDO');
});

function generateSharedScaffoldLegacyCatalogue(): string {
  return [
    '/// **collab_i18n_start**',
    'const message_en = {',
    `  'intent.things.title': 'All things',`,
    '};',
    'export type MessageType = typeof message_en;',
    'const message_pt_br: MessageType = {',
    `  'intent.things.title': 'TRADUZIDO',`,
    '};',
    '/// **collab_i18n_end**',
  ].join('\n');
}

// A catalog written by an earlier generator uses double quotes and no indentation. Reading only the
// renderer's own single-quoted form made those files look like they had no i18n block at all, which cost
// every page its skeleton with a message that blamed a block that was present.
const DOUBLE_QUOTED = [
  '/// **collab_i18n_start**',
  'const message_en = {',
  '"intent.things.title": "All things",',
  '"intent.things.empty": "Nothing here",',
  '};',
  'export type MessageType = typeof message_en;',
  'const message_pt_br: MessageType = {',
  '"intent.things.title": "Todas as coisas",',
  '"intent.things.empty": "Nada aqui",',
  '};',
  '/// **collab_i18n_end**',
].join('\n');

test('parsePreviousI18n reads a catalog written with double quotes', () => {
  const byLocale = parsePreviousI18n(DOUBLE_QUOTED);
  assert.deepEqual([...byLocale.keys()], ['en', 'pt-br']);
  assert.equal(byLocale.get('pt-br')!['intent.things.title'], 'Todas as coisas');
  assert.equal(byLocale.get('en')!['intent.things.empty'], 'Nothing here');
});

test('parsePreviousI18n keeps a quote of the other style inside the text', () => {
  const source = [
    '/// **collab_i18n_start**',
    'const message_en = {',
    `  'intent.things.title': 'All "things"',`,
    `  "intent.things.note": "It's fine",`,
    `  'intent.things.esc': 'a \\'b\\' c',`,
    '};',
    '/// **collab_i18n_end**',
  ].join('\n');
  const entries = parsePreviousI18n(source).get('en')!;
  assert.equal(entries['intent.things.title'], 'All "things"');
  assert.equal(entries['intent.things.note'], "It's fine");
  assert.equal(entries['intent.things.esc'], "a 'b' c");
});

test('the page catalogue prefix is what the reader is told to look for', () => {
  // The page writes pageMessage_<locale> and an organism o<n>Message_<locale>. A reader hardcoded to
  // the shared's `message_` prefix would find nothing and silently drop every translation.
  const pageCatalogue = [
    '/// **collab_i18n_start**',
    'const pageMessage_en = {',
    `  'intent.things.title': 'All things',`,
    '};',
    'type PageMessageType = typeof pageMessage_en;',
    'const pageMessage_pt_br: PageMessageType = {',
    `  'intent.things.title': 'TRADUZIDO',`,
    '};',
    '/// **collab_i18n_end**',
  ].join('\n');
  assert.deepEqual([...parsePreviousI18n(pageCatalogue, 'pageMessage').keys()], ['en', 'pt-br']);
  assert.equal(parsePreviousI18n(pageCatalogue, 'pageMessage').get('pt-br')!['intent.things.title'], 'TRADUZIDO');
  // The default prefix keeps reading the shared's own form.
  assert.equal(parsePreviousI18n(pageCatalogue).size, 0, 'pageMessage_ is not message_');
});

// ── locale fantasma: 'pt' colapsado + 'pt-br' declarado (incidente 22/08) ─────
// i18nMeta REAL do petShop (web/shared/consultInstitutionalHome.defs.ts): o default vem sem região e
// os runtimeLocales com região, então a regra antiga (`l !== defaultLocale`) deixava os DOIS entrarem
// e a página saía com pageMessage_pt e pageMessage_pt_br idênticos.
void test('catalogueLocales: default colapsado não entra quando um declarado realiza a mesma língua', () => {
  assert.deepEqual(catalogueLocales('pt', ['pt-br']), ['pt-br']);
  // 102046: 3 idiomas pedidos viravam 4 com o 'pt' fantasma na frente.
  assert.deepEqual(catalogueLocales('pt', ['pt-br', 'en', 'es']), ['pt-br', 'en', 'es']);
});

void test('catalogueLocales: en + en-AU continuam DOIS catálogos (o dedupe não é por língua primária)', () => {
  // Caso legítimo documentado no próprio código: variante regional ao lado da língua simples.
  assert.deepEqual(catalogueLocales('en', ['en', 'en-au']), ['en', 'en-au']);
  assert.deepEqual(catalogueLocales('en-au', ['en-au', 'en']), ['en-au', 'en']);
});

void test('catalogueLocales: sem declarados o default é o catálogo; sem default a lista manda', () => {
  assert.deepEqual(catalogueLocales('pt', []), ['pt']);
  assert.deepEqual(catalogueLocales('', ['pt-br', 'en']), ['pt-br', 'en']);
  // Um default de outra língua entra na frente (a ordem é load-bearing: o runtime cai no keys[0]).
  assert.deepEqual(catalogueLocales('en', ['pt-br']), ['en', 'pt-br']);
  // Duplicata declarada nunca vira dois catálogos.
  assert.deepEqual(catalogueLocales('pt', ['pt-br', 'pt-br']), ['pt-br']);
});
