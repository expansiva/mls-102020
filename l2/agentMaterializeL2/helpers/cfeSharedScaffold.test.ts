/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/cfeSharedScaffold.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { catalogueLocales, ensureSharedScenaryMembers, generateSharedScaffold, migrateI18nKeyOffPageId, migratePreviousI18nKeys, parseContractInterfaces, parsePreviousI18n, renderUiScenaryMembers, sharedLlmFallbackTemplate } from '/_102020_/l2/agentMaterializeL2/helpers/cfeSharedScaffold.js';
import { collectMutationEnvelopeErrorIssues } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeCore.js';

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

test('parsePreviousI18n migrates a pageId-qualified key onto the short form without dropping the translation', () => {
  const pageId = 'monitorAndUpdateTaskStatus';
  const oldKey = `intent.${pageId}.qryInspectTaskSummary.list.column.createdAt.label`;
  const newKey = 'intent.qryInspectTaskSummary.list.column.createdAt.label';
  assert.equal(migrateI18nKeyOffPageId(oldKey, pageId), newKey);
  assert.equal(migrateI18nKeyOffPageId('action.cmdDecideTaskStatus.success', pageId), 'action.cmdDecideTaskStatus.success');
  const source = [
    '/// **collab_i18n_start**',
    'const pageMessage_en = {',
    `  '${oldKey}': 'Created at',`,
    '};',
    'type PageMessageType = typeof pageMessage_en;',
    'const pageMessage_pt_br: PageMessageType = {',
    `  '${oldKey}': 'Data de criação',`,
    '};',
    '/// **collab_i18n_end**',
  ].join('\n');
  const byLocale = parsePreviousI18n(source, 'pageMessage', pageId);
  assert.equal(byLocale.get('pt-br')![oldKey], 'Data de criação');
  assert.equal(byLocale.get('pt-br')![newKey], 'Data de criação');
  assert.equal(byLocale.get('en')![newKey], 'Created at');
  const alreadyShort = migratePreviousI18nKeys({ [newKey]: 'já na chave nova', [oldKey]: 'valor antigo' }, pageId);
  assert.equal(alreadyShort[newKey], 'já na chave nova', 'an existing short key is not overwritten');
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

function definitionWithScenary(): Record<string, unknown> {
  const defs = definition();
  const states = defs.states as Record<string, unknown>[];
  states.push(
    { stateKey: 'ui.things.scenary', name: 'uiScenary', kind: 'uiScenary', valueSet: ['base', 'detail', 'createThing'], defaultValue: 'base' },
    {
      stateKey: 'ui.things.input.listThings.thingId', name: 'listThingsThingId', kind: 'input',
      source: 'routeParam', presentation: 'route',
      contractRef: { commandName: 'listThings', direction: 'input', field: 'nameFilter' },
      defaultValue: '',
    },
  );
  const actions = defs.actions as Record<string, unknown>[];
  actions.push({
    actionId: 'set.listThingsThingId', kind: 'stateSetter',
    stateKey: 'ui.things.input.listThings.thingId',
    methodName: 'setListThingsThingId', handlerName: 'handleListThingsThingIdChange',
  });
  defs.scenaries = [
    { value: 'base', kind: 'base', commandName: 'listThings', preconditions: [] },
    { value: 'detail', kind: 'detail', commandName: 'listThings', preconditions: ['ui.things.input.listThings.thingId'] },
    { value: 'createThing', kind: 'command', commandName: 'createThing', preconditions: [] },
  ];
  return defs;
}

test('generateSharedScaffold emits uiScenary, URL guard, command success returns to base', () => {
  const result = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', definitionWithScenary(), CONTRACT);
  assert.equal(result.reason, undefined);
  const code = result.code!;
  assert.match(code, /\/\*\* state ui\.things\.scenary — values: base\|detail\|createThing \*\//);
  assert.match(code, /@property\(\) uiScenary: 'base' \| 'detail' \| 'createThing' = 'base';/);
  assert.match(code, /this\.applyUrlScenary\(\);/);
  assert.match(code, /setUiScenary\(value: string\): void/);
  assert.match(code, /if \(!allowed\.includes\(value\)\) \{/);
  assert.match(code, /console\.warn\('setUiScenary: unknown value \\'' \+ value \+ '\\''\);/);
  // URL / setter without the id degrades to base; with the id the requested scene stands.
  assert.match(code, /if \(value === 'detail' && \(\(this\.listThingsThingId == null \|\| String\(this\.listThingsThingId\) === ''\)\)\) next = 'base';/);
  assert.match(code, /const rawThingId: string = params\.get\('thingId'\) \|\| '';/);
  assert.match(code, /const requested: string = params\.get\('scenary'\) \|\| 'base';/);
  assert.match(code, /window\.history\.replaceState\(/);
  assert.match(code, /url\.searchParams\.delete\('scenary'\)/);
  // Command success returns to the base scene (feedback stays on the action status state).
  assert.match(code, /this\.setUiScenary\('base'\);/);
  // Selecting the inspect id also opens detail.
  assert.match(code, /if \(value\) this\.setUiScenary\('detail'\);/);
});

// p4_16 rodada 2 (28/09, controleEstoque/movimentacoes): renderApplyUrlScenary assigned the raw
// URL string straight into an enumerated input member (declared as a string-literal union by
// propertyType) — TS2322 (`movimentacoes.ts:316`, `MovementType | null`). An enumerated precondition
// target must be validated against the same valueSet the type declaration uses, then cast.
test('generateSharedScaffold guards+casts an enumerated URL scenary target; a free-string target stays a plain assignment', () => {
  const defs = definitionWithScenary();
  const states = defs.states as Record<string, unknown>[];
  states.push({
    stateKey: 'ui.things.input.createThing.kind', name: 'createThingKind', kind: 'input',
    valueSet: ['alpha', 'beta'], defaultValue: '',
  });
  const scenaries = defs.scenaries as Record<string, unknown>[];
  (scenaries[1].preconditions as string[]).push('ui.things.input.createThing.kind');
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', defs, CONTRACT).code!;
  // enumerated target: guard against the declared valueSet, then cast to the member's own type
  assert.match(code, /if \(this\.createThingKind == null \|\| String\(this\.createThingKind\) === ''\) \{\n\s*if \(\['alpha', 'beta'\]\.includes\(rawKind\)\) \{\n\s*this\.createThingKind = rawKind as typeof this\.createThingKind;\n\s*setState\('ui\.things\.input\.createThing\.kind', rawKind\);\n\s*\}\n\s*\}/);
  // free-string target (thingId, no valueSet) is unchanged: plain assignment, no guard/cast
  assert.match(code, /if \(this\.listThingsThingId == null \|\| String\(this\.listThingsThingId\) === ''\) \{\n\s*this\.listThingsThingId = rawThingId;\n\s*setState\('ui\.things\.input\.listThings\.thingId', rawThingId\);\n\s*\}/);
});

// p4_16 rodada 3 (28/09, controleEstoque/movimentacoes): the enum guard from rodada 2 is one case
// of a general problem — renderApplyUrlScenary must parse the raw URL string per the contract
// field's own type (the same type renderParams already reads for numeric/boolean coercion), not
// just for enums. `quantity` (number) hit the same TS2322 as `movementType` did.
const CONTRACT_WITH_URL_TYPES = CONTRACT.replace(
  'export interface ListThingsInput {\n  nameFilter?: string;\n  page?: number;',
  'export interface ListThingsInput {\n  nameFilter?: string;\n  page?: number;\n  active?: boolean;\n  tags?: string[];',
);

test('generateSharedScaffold prefills a URL scenary target by contract field type: number, boolean, string; skips array/opaque', () => {
  const defs = definitionWithScenary();
  const states = defs.states as Record<string, unknown>[];
  states.push(
    { stateKey: 'ui.things.input.listThings.active', name: 'listThingsActive', kind: 'input', contractRef: { commandName: 'listThings', direction: 'input', field: 'active' }, defaultValue: '' },
    { stateKey: 'ui.things.input.listThings.tags', name: 'listThingsTags', kind: 'input', contractRef: { commandName: 'listThings', direction: 'input', field: 'tags' }, defaultValue: '' },
  );
  const scenaries = defs.scenaries as Record<string, unknown>[];
  (scenaries[1].preconditions as string[]).push(
    'ui.things.input.listThings.page', // number, already declared by definition()
    'ui.things.input.listThings.active', // boolean
    'ui.things.input.listThings.nameFilter', // string, already declared by definition()
    'ui.things.input.listThings.tags', // array -> no prefill
  );
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', defs, CONTRACT_WITH_URL_TYPES).code!;
  // number: Number.isFinite guard, value cast through unknown (real member type declared elsewhere)
  assert.match(code, /const listThingsPageNum = Number\(rawPage\);\n\s*if \(Number\.isFinite\(listThingsPageNum\)\) \{\n\s*this\.listThingsPage = listThingsPageNum as unknown as typeof this\.listThingsPage;\n\s*setState\('ui\.things\.input\.listThings\.page', listThingsPageNum\);\n\s*\}/);
  // boolean: only the two literal strings are accepted
  assert.match(code, /if \(rawActive === 'true' \|\| rawActive === 'false'\) \{\n\s*const listThingsActiveValue: boolean = rawActive === 'true';\n\s*this\.listThingsActive = listThingsActiveValue as unknown as typeof this\.listThingsActive;\n\s*setState\('ui\.things\.input\.listThings\.active', listThingsActiveValue\);\n\s*\}/);
  // string: unchanged, direct assignment
  assert.match(code, /if \(this\.listThingsNameFilter == null \|\| String\(this\.listThingsNameFilter\) === ''\) \{\n\s*this\.listThingsNameFilter = rawNameFilter;\n\s*setState\('ui\.things\.input\.listThings\.nameFilter', rawNameFilter\);\n\s*\}/);
  // array/opaque: no prefill block at all for that field (no safe string->value parse to guess)
  assert.ok(!code.includes('rawTags'), 'array/opaque contract fields get no URL prefill');
  assert.ok(!/params\.get\('tags'\)/.test(code));
});

// p4_16 (28/09, controleEstoque/movimentacoes): shared defs states can repeat `name` across
// DIFFERENT contracts on the same page (e.g. `productId` in both createStockMovement.input and
// listStockMovement.input) — only `memberName` is unique class-wide
// (mls-102020/l2/agentDefsL2/steps/shared40/gate.ts:81). The scaffold must key class members off
// memberName, falling back to name only when memberName is absent.
const CONTRACT_WITH_SHARED_FIELD = CONTRACT
  .replace('export interface ListThingsInput {\n  nameFilter?: string;', 'export interface ListThingsInput {\n  code?: string;\n  nameFilter?: string;')
  .replace('export interface CreateThingInput {\n  name: string;', 'export interface CreateThingInput {\n  code?: string;\n  name: string;');

test('generateSharedScaffold uses memberName for the class member, never the repeated field name', () => {
  const defs = definitionWithScenary();
  const states = defs.states as Record<string, unknown>[];
  const actions = defs.actions as Record<string, unknown>[];
  // Two DIFFERENT actions (listThings query, createThing command) each with an input field
  // called `code` — same field name, distinct memberName. This is exactly the shape gate.ts
  // allows (name repeats, memberName is the class-wide unique one) and that broke the scaffold.
  states.push(
    { stateKey: 'ui.things.input.listThings.code', name: 'code', memberName: 'listThingsCode', kind: 'input', contractRef: { commandName: 'listThings', direction: 'input', field: 'code' }, defaultValue: '' },
    { stateKey: 'ui.things.input.createThing.code', name: 'code', memberName: 'createThingCode', kind: 'input', contractRef: { commandName: 'createThing', direction: 'input', field: 'code' }, defaultValue: '' },
  );
  const listThings = actions.find(a => a.actionId === 'listThings')!;
  listThings.inputStateKeys = [...(listThings.inputStateKeys as string[]), 'ui.things.input.listThings.code'];
  const createThing = actions.find(a => a.actionId === 'createThing')!;
  createThing.inputStateKeys = [...(createThing.inputStateKeys as string[]), 'ui.things.input.createThing.code'];
  defs.scenaries = [
    { value: 'base', kind: 'base', commandName: 'listThings', preconditions: [] },
    {
      value: 'detail', kind: 'detail', commandName: 'listThings',
      preconditions: ['ui.things.input.listThings.code', 'ui.things.input.createThing.code'],
    },
    { value: 'createThing', kind: 'command', commandName: 'createThing', preconditions: [] },
  ];
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', defs, CONTRACT_WITH_SHARED_FIELD).code!;
  assert.match(code, /@property\(\) listThingsCode: string = '';/);
  assert.match(code, /@property\(\) createThingCode: string = '';/);
  // renderParams (params object building) also keys off the member, per action.
  assert.match(code, /code: this\.listThingsCode,|if \(this\.listThingsCode\) \{\s*\n\s*params\.code = this\.listThingsCode;/);
  assert.match(code, /if \(this\.createThingCode\) \{\s*\n\s*params\.code = this\.createThingCode;/);
  // the scenary guard also uses both distinct members
  assert.match(code, /if \(value === 'detail' && \(\(this\.listThingsCode == null \|\| String\(this\.listThingsCode\) === ''\) \|\| \(this\.createThingCode == null \|\| String\(this\.createThingCode\) === ''\)\)\) next = 'base';/);
  assert.ok(!/this\.code\b/.test(code), 'the repeated field name must never surface as a class member');
  // A state without memberName keeps using name (existing states in definitionWithScenary, e.g. uiScenary).
  assert.match(code, /@property\(\) uiScenary: 'base' \| 'detail' \| 'createThing' = 'base';/);
});

test('generateSharedScaffold emits a constant uiScenary when the page has one scene', () => {
  const defs = definition();
  defs.actions = (defs.actions as Record<string, unknown>[]).filter(action => {
    const id = String(action.actionId || '');
    const ref = String(action.commandRef || '');
    const key = String(action.stateKey || '');
    return !id.includes('createThing') && !ref.includes('createThing') && !key.includes('createThing');
  });
  defs.states = (defs.states as Record<string, unknown>[]).filter(state => {
    const key = String(state.stateKey || '');
    return !key.includes('createThing');
  });
  (defs.states as Record<string, unknown>[]).push({
    stateKey: 'ui.things.scenary', name: 'uiScenary', kind: 'uiScenary', valueSet: ['base'], defaultValue: 'base',
  });
  defs.scenaries = [{ value: 'base', kind: 'base', commandName: 'listThings', preconditions: [] }];
  const code = generateSharedScaffold('_102045_/l2/demo/web/shared/things.ts', defs, CONTRACT).code!;
  assert.match(code, /@property\(\) uiScenary: 'base' = 'base';/);
  assert.match(code, /setUiScenary\(value: string\): void/);
  assert.match(code, /const allowed: string\[\] = \['base'\];/);
});

const SHARED_PATH = '_102045_/l2/demo/web/shared/things.ts';

test('renderUiScenaryMembers is the same block the full scaffold emits', () => {
  const defs = definitionWithScenary();
  const full = generateSharedScaffold(SHARED_PATH, defs, CONTRACT).code!;
  const members = renderUiScenaryMembers(SHARED_PATH, defs, CONTRACT).code!;
  assert.match(members, /setUiScenary\(value: string\): void/);
  assert.match(members, /handleUiScenaryChange\(event: Event\): void/);
  assert.match(members, /private applyUrlScenary\(\): void/);
  assert.match(members, /private syncScenaryQuery\(value: string\): void/);
  assert.ok(full.includes(members), 'full scaffold must contain the members block verbatim');
});

test('shared LLM fallback template is the scaffold when it builds, else the scenary block', () => {
  const defs = definitionWithScenary();
  const template = sharedLlmFallbackTemplate(SHARED_PATH, defs, CONTRACT);
  assert.ok('mode' in template);
  assert.equal(template.mode, 'scaffold');
  assert.equal(template.code, generateSharedScaffold(SHARED_PATH, defs, CONTRACT).code);
});

test('ensureSharedScenaryMembers injects the four members into a shared that lost them', () => {
  const defs = definitionWithScenary();
  const full = generateSharedScaffold(SHARED_PATH, defs, CONTRACT).code!;
  const members = renderUiScenaryMembers(SHARED_PATH, defs, CONTRACT).code!;
  const stripped = full.replace(members, '');
  assert.doesNotMatch(stripped, /setUiScenary\(value: string\)/);
  const result = ensureSharedScenaryMembers(stripped, SHARED_PATH, defs, CONTRACT);
  assert.equal(result.injected, true);
  assert.match(result.code, /setUiScenary\(value: string\): void/);
  assert.match(result.code, /handleUiScenaryChange\(event: Event\): void/);
  assert.match(result.code, /custom\.detail/);
  assert.match(result.code, /private applyUrlScenary\(\): void/);
  assert.match(result.code, /private syncScenaryQuery\(value: string\): void/);
});

test('ensureSharedScenaryMembers is a no-op when the four members already match the scaffold', () => {
  const defs = definitionWithScenary();
  const full = generateSharedScaffold(SHARED_PATH, defs, CONTRACT).code!;
  const result = ensureSharedScenaryMembers(full, SHARED_PATH, defs, CONTRACT);
  assert.equal(result.injected, false);
  assert.equal(result.code, full);
});

test('ensureSharedScenaryMembers replaces a divergent handleUiScenaryChange with the scaffold body', () => {
  const defs = definitionWithScenary();
  const full = generateSharedScaffold(SHARED_PATH, defs, CONTRACT).code!;
  const degraded = full.replace(
    /handleUiScenaryChange\(event: Event\): void \{[\s\S]*?\n  \}/,
    `handleUiScenaryChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    const value: string = target && 'value' in target ? String(target.value) : '';
    this.setUiScenary(value);
  }`,
  );
  assert.doesNotMatch(degraded, /custom\.detail/);
  const result = ensureSharedScenaryMembers(degraded, SHARED_PATH, defs, CONTRACT);
  assert.equal(result.injected, true);
  assert.match(result.code, /custom\.detail/);
});

test('T1: opaque contract types do not bail the scaffold', () => {
  const contract = CONTRACT.replace(
    '  total: number;\n}',
    `  total: number;
  imageReferences: Record<string, unknown>;
  maybeName: string | null;
  named: ImageReferencesValue;
}`,
  );
  const parsed = parseContractInterfaces(contract).get('ListThingsOutput')!;
  assert.deepEqual(parsed.fields.filter(field => field.type === 'opaque').map(field => field.name), [
    'imageReferences', 'named',
  ]);
  assert.deepEqual(parsed.fields.find(field => field.name === 'maybeName'), { name: 'maybeName', type: 'string', optional: false, nullable: true });
  const result = generateSharedScaffold(SHARED_PATH, definition(), contract);
  assert.equal(result.reason, undefined, result.reason);
  const code = result.code!;
  assert.match(code, /const LIST_THINGS_DATA_DEFAULT: ListThingsOutput = \{ things: \[\], total: 0, imageReferences: null, maybeName: null, named: null \};/);
});

test('T2: an unusable contract still injects the four scenary members from defs', () => {
  const defs = definitionWithScenary();
  const unusable = CONTRACT.replace(
    'export interface ListThingsOutput {\n  things: { thingId: string; name: string }[];\n  total: number;\n}',
    `export interface ListThingsOutput {
  [key: string]: unknown;
}`,
  );
  assert.match(generateSharedScaffold(SHARED_PATH, defs, unusable).reason || '', /unparseable member/);
  const llmShared = `/// <mls fileReference="${SHARED_PATH}" enhancement="_102020_/l2/enhancementAura"/>
export class DemoThingsBase {
  connectedCallback(): void {}
}
`;
  const result = ensureSharedScenaryMembers(llmShared, SHARED_PATH, defs, unusable);
  assert.equal(result.injected, true, result.reason);
  assert.match(result.code, /setUiScenary\(value: string\): void/);
  assert.match(result.code, /handleUiScenaryChange\(event: Event\): void/);
  assert.match(result.code, /private applyUrlScenary\(\): void/);
  assert.match(result.code, /private syncScenaryQuery\(value: string\): void/);
});

test('nested quoted contract path resolves the exact leaf and preserves array/default shape', () => {
  const contract = `${CONTRACT}
export interface AllocatePacketInput {
  "meta"?: {
    // A brace in a comment must not close the interface: }
    "numbers"?: { "amount": number; "enabled": boolean; "mode": "fast" | "safe"; };
    "other": { "amount": string; }[];
  };
}
export interface PacketOutput {
  "rows": { "amount": number; }[];
  "count": number;
}`;
  const parsed = parseContractInterfaces(contract);
  assert.deepEqual(parsed.get('AllocatePacketInput')!.fields.find(field => field.name === 'meta.numbers.amount'), {
    name: 'meta.numbers.amount', path: ['meta', 'numbers', 'amount'], type: 'number', optional: true,
  });
  assert.deepEqual(parsed.get('AllocatePacketInput')!.fields.find(field => field.name === 'meta.other')?.type, 'array');
  assert.deepEqual(parsed.get('PacketOutput')!.fields.filter(field => !field.path).map(field => field.name), ['rows', 'count']);
});

test('nested URL prefill converts and validates values; reinjection is idempotent', () => {
  const defs = definitionWithScenary();
  defs.contractRef = { defPath: 'l2/demo/web/contracts/packet.defs.ts', calls: [
    { actionId: 'allocatePacket', routeConst: 'allocatePacketRoute', inputType: 'AllocatePacketInput', outputType: 'AllocatePacketOutput' },
  ] };
  (defs.states as Record<string, unknown>[]).push(
    { stateKey: 'ui.packet.amount', name: 'amount', memberName: 'amountValue', kind: 'input', contractRef: 'AllocatePacketInput.meta.numbers.amount', dtoPath: 'meta.numbers.amount', defaultValue: null },
    { stateKey: 'ui.packet.enabled', name: 'enabled', memberName: 'enabledValue', kind: 'input', contractRef: 'AllocatePacketInput.meta.numbers.enabled', dtoPath: 'meta.numbers.enabled', defaultValue: null },
    { stateKey: 'ui.packet.mode', name: 'mode', memberName: 'modeValue', kind: 'input', contractRef: 'AllocatePacketInput.meta.numbers.mode', dtoPath: 'meta.numbers.mode', defaultValue: null },
  );
  ((defs.scenaries as Record<string, unknown>[])[1].preconditions as string[]).push('ui.packet.amount', 'ui.packet.enabled', 'ui.packet.mode');
  const contract = `${CONTRACT.replace('export interface CreateThingOutput {}', 'export interface CreateThingOutput { [key: string]: unknown; }')}\nexport interface AllocatePacketInput { "meta": { "numbers": { "amount": number; "enabled": boolean; "mode": "fast" | "safe"; }; }; }`;
  const template = sharedLlmFallbackTemplate(SHARED_PATH, defs, contract);
  assert.ok('mode' in template);
  assert.equal(template.mode, 'scenary-block');
  const source = `export class Fixture { amountValue: number | null = null; enabledValue: boolean | null = null; modeValue: string | null = null; listThingsThingId = 'existing'; uiScenary = 'base'; setUiScenary(value: string) { this.uiScenary = value; } }`;
  const injected = ensureSharedScenaryMembers(source, SHARED_PATH, defs, contract);
  assert.equal(injected.injected, true, injected.reason);
  const again = ensureSharedScenaryMembers(injected.code, SHARED_PATH, defs, contract);
  assert.equal(again.injected, false);
  assert.equal(again.code, injected.code);
  const method = /private applyUrlScenary\(\): void \{[\s\S]*?\n  \}/.exec(injected.code)?.[0];
  assert.ok(method);
  const js = ts.transpileModule(`class Fixture { amountValue: number | null = null; enabledValue: boolean | null = null; modeValue: string | null = null; listThingsThingId = 'existing'; uiScenary = 'base'; setUiScenary(value: string) { this.uiScenary = value; } ${method} run() { this.applyUrlScenary(); } }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = (search: string, existing?: { amount?: number; enabled?: boolean }) => {
    const writes = new Map<string, unknown>();
    const Fixture = new Function('window', 'setState', `${js}; return Fixture;`)({ location: { search } }, (key: string, value: unknown) => writes.set(key, value)) as new () => { amountValue: number | null; enabledValue: boolean | null; modeValue: string | null; run(): void };
    const instance = new Fixture();
    if (existing?.amount !== undefined) instance.amountValue = existing.amount;
    if (existing?.enabled !== undefined) instance.enabledValue = existing.enabled;
    instance.run();
    return { instance, writes };
  };
  const good = run('?amount=0.75&enabled=false&mode=safe');
  assert.equal(good.instance.amountValue, 0.75);
  assert.equal(good.instance.enabledValue, false);
  assert.equal(good.instance.modeValue, 'safe');
  assert.equal(good.writes.get('ui.packet.amount'), 0.75);
  assert.equal(good.writes.get('ui.packet.enabled'), false);
  assert.equal(run('?amount=0&enabled=true&mode=fast').writes.get('ui.packet.amount'), 0);
  assert.equal(run('?amount=0&enabled=true&mode=fast').writes.get('ui.packet.enabled'), true);
  for (const value of ['', 'NaN', 'Infinity', '-Infinity', '1e999']) {
    assert.equal(run(`?amount=${value}`).writes.has('ui.packet.amount'), false, value);
  }
  assert.equal(run('?enabled=maybe&mode=slow').writes.has('ui.packet.enabled'), false);
  assert.equal(run('?enabled=maybe&mode=slow').writes.has('ui.packet.mode'), false);
  const retained = run('?amount=9&enabled=true', { amount: 0, enabled: false });
  assert.equal(retained.instance.amountValue, 0);
  assert.equal(retained.instance.enabledValue, false);
  assert.equal(retained.writes.has('ui.packet.amount'), false);
  assert.equal(retained.writes.has('ui.packet.enabled'), false);
  for (const ref of ['OtherInput.meta.numbers.amount', 'AllocatePacketInput.meta.numbers.missing']) {
    const invalid = structuredClone(defs);
    const invalidState = (invalid.states as Record<string, unknown>[]).find(state => state.stateKey === 'ui.packet.amount')!;
    invalidState.contractRef = ref;
    invalidState.dtoPath = ref.split('.').slice(1).join('.');
    const result = ensureSharedScenaryMembers(source, SHARED_PATH, invalid, contract);
    assert.equal(result.injected, false);
    assert.match(result.reason || '', /ui\.packet\.amount.*(contractRef\.calls|missing)/);
  }
  const divergent = structuredClone(defs);
  (divergent.states as Record<string, unknown>[]).find(state => state.stateKey === 'ui.packet.amount')!.dtoPath = 'meta.other.amount';
  assert.match(ensureSharedScenaryMembers(source, SHARED_PATH, divergent, contract).reason || '', /dtoPath differs/);
});

test('saved p4_16 defs generate and reinject a numeric quantity prefill without TS2322', () => {
  const savedRoot = new URL('../../../../../todo/gerarApp/l4/certificacao/runs/p4_16/final_state/l2/web/', import.meta.url);
  const sharedDefsSource = readFileSync(new URL('shared/movimentacoes.defs.ts', savedRoot), 'utf8');
  const contractSource = readFileSync(new URL('contracts/movimentacoes.defs.ts', savedRoot), 'utf8');
  const savedSharedSource = readFileSync(new URL('shared/movimentacoes.ts', savedRoot), 'utf8');
  const marker = 'export const definition = ';
  const start = sharedDefsSource.indexOf(marker);
  const end = sharedDefsSource.indexOf('\n} as const;', start);
  assert.ok(start >= 0 && end > start, 'saved shared definition is present');
  const defs = JSON.parse(sharedDefsSource.slice(start + marker.length, end + 2)) as Record<string, unknown>;
  const outputPath = '_102047_/l2/controleEstoque/web/shared/movimentacoes.ts';
  const template = sharedLlmFallbackTemplate(outputPath, defs, contractSource, savedSharedSource);
  assert.ok('mode' in template, 'productive LLM template must have the saved contract');
  assert.equal(template.mode, 'scenary-block');
  const generated = renderUiScenaryMembers(outputPath, defs, contractSource, savedSharedSource);
  assert.ok(generated.code, generated.reason);
  assert.ok(template.code.includes(generated.code));
  const injected = ensureSharedScenaryMembers(savedSharedSource, outputPath, defs, contractSource);
  assert.equal(injected.injected, true, injected.reason);
  assert.ok(injected.code.includes(generated.code));
  assert.equal(ensureSharedScenaryMembers(injected.code, outputPath, defs, contractSource).injected, false);
  assert.match(generated.code, /const stateCreateStockMovementDetailsQuantityNum = Number\(rawQuantity\);/);
  assert.match(generated.code, /this\.stateCreateStockMovementDetailsQuantity = stateCreateStockMovementDetailsQuantityNum as unknown as typeof this\.stateCreateStockMovementDetailsQuantity;/);
  assert.match(generated.code, /setState\('ui\.movimentacoes\.createStockMovement\.input\.details\.quantity', stateCreateStockMovementDetailsQuantityNum\);/);
  assert.doesNotMatch(generated.code, /stateCreateStockMovementDetailsQuantity = rawQuantity/);
  const method = /private applyUrlScenary\(\): void \{[\s\S]*?\n  \}/.exec(generated.code)?.[0];
  assert.ok(method);
  const fixtureSource = `declare function setState(key: string, value: unknown): void; class Fixture { [key: string]: any; stateCreateStockMovementDetailsQuantity: number | null = null; setUiScenary(_value: string): void {} ${method} run(): void { this.applyUrlScenary(); } }`;
  const virtualFile = '/p4_16_prefill_fixture.ts';
  const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2022, strict: true, noEmit: true, skipLibCheck: true };
  const host = ts.createCompilerHost(options);
  const readSource = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => file === virtualFile
    ? ts.createSourceFile(file, fixtureSource, languageVersion, true)
    : readSource(file, languageVersion, onError, shouldCreateNewSourceFile);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([virtualFile], options, host)).filter(item => item.file?.fileName === virtualFile);
  assert.deepEqual(diagnostics.map(item => `${item.code}: ${ts.flattenDiagnosticMessageText(item.messageText, ' ')}`), []);
  const js = ts.transpileModule(fixtureSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const writes = new Map<string, unknown>();
  const Fixture = new Function('window', 'setState', `${js}; return Fixture;`)({ location: { search: '?quantity=2.5&scenary=createStockMovement' } }, (key: string, value: unknown) => writes.set(key, value)) as new () => { stateCreateStockMovementDetailsQuantity: number | null; run(): void };
  const instance = new Fixture();
  instance.run();
  assert.equal(instance.stateCreateStockMovementDetailsQuantity, 2.5);
  assert.equal(writes.get('ui.movimentacoes.createStockMovement.input.details.quantity'), 2.5);
});

test('T1/T2: every l2_shared write and LLM fallback uses ensureSharedScenaryMembers / sharedLlmFallbackTemplate', () => {
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  const cli = readFileSync(new URL('../nodejsMaterializeL2.ts', import.meta.url), 'utf8');
  const scaffold = readFileSync(new URL('./cfeSharedScaffold.ts', import.meta.url), 'utf8');
  assert.match(scaffold, /function renderUiScenary\(/);
  assert.match(scaffold, /export function renderUiScenaryMembers/);
  assert.match(scaffold, /renderUiScenary\(model\)\.join/);
  assert.match(scaffold, /export function ensureSharedScenaryMembers/);
  assert.match(scaffold, /export function sharedLlmFallbackTemplate/);
  assert.match(gen, /sharedLlmFallbackTemplate/);
  assert.match(gen, /ensureSharedScenaryMembers/);
  assert.match(gen, /applySharedScenaryGuard/);
  assert.match(cli, /sharedLlmFallbackTemplate/);
  assert.match(cli, /function writeGeneratedArtifacts[\s\S]*ensureSharedScenaryMembers/);
  assert.match(gen, /saveGeneratedTs\([\s\S]*guarded\.code/);
  assert.match(gen, /saveGeneratedTs\([\s\S]*sharedGuard\.code/);
});

// ---------------------------------------------------------------------------
// cf_teste_gerado_assercao_tipo: input with valueSet is a union (plus ''); without stays string.
// Fixture id 900001 — invented, not a disposable generated app.

const ENUM_CONTRACT = `
export interface ListThingsInput {
  nameFilter?: string;
  sortBy?: "open" | "closed";
  page?: number;
}
export interface ListThingsOutput {
  things: { thingId: string; name: string; status: "open" | "closed" }[];
  total: number;
}
export const listThingsRoute = 'demo.things.listThings' as const;

export interface CreateThingInput {
  name: string;
  status: "open" | "closed";
}
export interface CreateThingOutput {}
export const createThingRoute = 'demo.things.createThing' as const;
`;

function definitionWithInputEnums(): Record<string, unknown> {
  const defs = definition();
  const states = defs.states as Record<string, unknown>[];
  states.push(
    {
      stateKey: 'ui.things.input.listThings.sortBy', name: 'listThingsSortBy', kind: 'input',
      source: 'userInput', presentation: 'form',
      contractRef: { commandName: 'listThings', direction: 'input', field: 'sortBy' },
      valueSet: ['open', 'closed'], defaultValue: '',
    },
    {
      stateKey: 'ui.things.input.createThing.status', name: 'createThingStatus', kind: 'input',
      source: 'userInput', presentation: 'form',
      contractRef: { commandName: 'createThing', direction: 'input', field: 'status' },
      valueSet: ['open', 'closed'], defaultValue: '',
    },
  );
  const actions = defs.actions as Record<string, unknown>[];
  const listThings = actions.find(action => action.actionId === 'listThings') as Record<string, unknown>;
  listThings.inputStateKeys = [...(listThings.inputStateKeys as string[]), 'ui.things.input.listThings.sortBy'];
  const createThing = actions.find(action => action.actionId === 'createThing') as Record<string, unknown>;
  createThing.inputStateKeys = [...(createThing.inputStateKeys as string[]), 'ui.things.input.createThing.status'];
  actions.push(
    {
      actionId: 'set.createThingStatus', kind: 'stateSetter',
      stateKey: 'ui.things.input.createThing.status',
      methodName: 'setCreateThingStatus', handlerName: 'handleCreateThingStatusChange',
    },
  );
  defs.contractRef = {
    tsPath: '_900001_/l2/demo/web/contracts/things.ts',
    contracts: [
      { commandName: 'listThings', routeConst: 'listThingsRoute' },
      { commandName: 'createThing', routeConst: 'createThingRoute' },
    ],
  };
  return defs;
}

test('input with valueSet emits the union plus empty; input without valueSet stays string; no contract-field cast', () => {
  const result = generateSharedScaffold('_900001_/l2/demo/web/shared/things.ts', definitionWithInputEnums(), ENUM_CONTRACT);
  assert.equal(result.reason, undefined, result.reason);
  const code = result.code!;
  // (a) enumerated input is the union + ''; free input stays string
  assert.match(code, /@property\(\) createThingStatus: 'open' \| 'closed' \| '' = '';/);
  assert.match(code, /@property\(\) listThingsSortBy: 'open' \| 'closed' \| '' = '';/);
  assert.match(code, /@property\(\) createThingName: string = '';/);
  assert.match(code, /@property\(\) listThingsNameFilter: string = '';/);
  // (b) the body does not cast that field onto the contract
  assert.doesNotMatch(code, /as CreateThingInput\['status'\]/);
  assert.doesNotMatch(code, /as ListThingsInput\['sortBy'\]/);
  assert.match(code, /status: \(this\.createThingStatus === '' \? undefined : this\.createThingStatus\)!,/);
  assert.match(code, /params\.sortBy = this\.listThingsSortBy;/);
  // write doors coerce; out-of-set does not enter state
  assert.match(code, /setCreateThingStatus\(value: string\): void/);
  assert.match(code, /const allowed: string\[\] = \['open', 'closed', ''\];/);
  assert.match(code, /if \(typeof value === 'string' && \['open', 'closed', ''\]\.includes\(value\)\)/);
});
