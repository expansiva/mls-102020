/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogueLocales, ensureSharedScenaryMembers, generateSharedScaffold, parseContractInterfaces, parsePreviousI18n, renderUiScenaryMembers, sharedLlmFallbackTemplate } from '/_102020_/l2/agentChangeFrontend/helpers/cfeSharedScaffold.js';
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
  assert.match(code, /if \(value === 'detail' && \(!this\.listThingsThingId\)\) next = 'base';/);
  assert.match(code, /const rawThingId: string = params\.get\('thingId'\) \|\| '';/);
  assert.match(code, /const requested: string = params\.get\('scenary'\) \|\| 'base';/);
  assert.match(code, /window\.history\.replaceState\(/);
  assert.match(code, /url\.searchParams\.delete\('scenary'\)/);
  // Command success returns to the base scene (feedback stays on the action status state).
  assert.match(code, /this\.setUiScenary\('base'\);/);
  // Selecting the inspect id also opens detail.
  assert.match(code, /if \(value\) this\.setUiScenary\('detail'\);/);
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
