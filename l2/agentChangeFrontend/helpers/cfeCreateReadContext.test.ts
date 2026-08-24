/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCreateReadContext.test.ts" enhancement="_blank"/>
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

// cfeCreateShared pulls in UI-ish modules that touch window/document at import time. Stub them, then
// dynamic-import so the module graph loads under node:test (top-level await is unavailable here).
const g = globalThis as unknown as Record<string, any>;
// This suite repoints globalThis.mls at a petShop fixture (project 102049). Restore the prior stub so a
// later test file in the same process doesn't inherit it.
const priorMls = g.mls;
after(() => { g.mls = priorMls; });
async function loadModule(): Promise<{ readCreateContext: () => Promise<any>; preparePageCreate: (page: any, ctx?: any) => Promise<any>; deterministicLayoutFromBase: (prepared: any) => any; buildPageTestCases: (prepared: any) => any[]; validatePageLayout: (prepared: any, layout: any) => void; remapLayoutActionsToBff: (prepared: any, layout: any) => any; cfePageLayoutToolSchema: any; bffFieldTsType: (field: any, dir: 'input' | 'output', ops: any, entities: any) => string; createLayoutPromptContext: (prepared: any, genome: string, templateId: string) => any }> {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  // libModel.ts runs init() -> mls.events.addEventListener at import time; the setup-l2 stub omits
  // events, so ensure it exists (unconditionally) before the module graph loads.
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
}

const PROJECT = 102049;

function defs(exportName: string, body: string): string {
  return `/// <mls fileReference="_${PROJECT}_/l4/x.defs.ts" enhancement="_blank"/>\nexport const ${exportName} = ${body} as const;\nexport default ${exportName};\n`;
}

function operationDefs(operationId: string, kind: string, extra: Record<string, unknown>): string {
  return defs(`operation${operationId}`, JSON.stringify({ operationId, commandName: operationId, kind, entity: 'Product', actor: 'cliente', reads: ['Product'], writes: [], rulesApplied: [], statusFrontend: 'toCreate', ...extra }, null, 2));
}

const CATALOG_CONTRACT = [
  `/// <mls fileReference="_${PROJECT}_/l4/petShop/contracts/catalog--catalogList.ts" enhancement="_blank"/>`,
  '',
  '// GENERATED MECHANICALLY from _' + PROJECT + '_/l4/petShop/workspaces/catalog.defs.ts — DO NOT EDIT.',
  'export interface CatalogListInput { searchTerm?: string; page?: number; }',
  'export interface CatalogListOutput { productId: string; name: string; }',
  "export const catalogListRoute = 'petShop.catalog.catalogList' as const;",
  '',
].join('\n');

const DETAIL_CONTRACT = [
  `/// <mls fileReference="_${PROJECT}_/l4/petShop/contracts/catalog--productDetail.ts" enhancement="_blank"/>`,
  '',
  'export interface ProductDetailInput { productId: string; }',
  'export interface ProductDetailOutput { productId: string; name: string; }',
  "export const productDetailRoute = 'petShop.catalog.productDetail' as const;",
  '',
].join('\n');

// Files the way the platform indexes them: project/level/folder/shortName/extension + getContent().
function file(level: number, folder: string, shortName: string, extension: string, content: string) {
  return { project: PROJECT, level, folder, shortName, extension, status: 'active', getContent: async () => content };
}

function installPetShopStor(opts: { contracts?: boolean } = {}): void {
  const withContracts = opts.contracts !== false;
  const files = [
    file(4, 'petShop', 'module', '.defs.ts', defs('petShopModule', JSON.stringify({ moduleName: 'petShop', visualStyle: {}, languages: ['pt-BR'] }))),
    file(4, 'petShop', 'actors', '.defs.ts', defs('petShopActors', JSON.stringify({ moduleName: 'petShop', actors: [{ actorId: 'cliente', title: 'Cliente', roleScope: 'petShop:cliente' }] }))),
    file(4, 'petShop', 'navigation', '.defs.ts', defs('petShopNavigation', JSON.stringify({ moduleName: 'petShop', landings: [{ actorId: 'cliente', workspaceId: 'catalog', reason: 'entra no catálogo' }], navigationEdges: [{ from: 'catalog', to: 'catalog' }] }))),
    file(4, 'petShop/ontology', 'Product', '.defs.ts', defs('Product', JSON.stringify({ entityId: 'Product', fields: [{ fieldId: 'productId', type: 'string', required: true }, { fieldId: 'name', type: 'string', required: true }] }))),
    file(4, 'petShop/operations', 'browseCatalog', '.defs.ts', operationDefs('browseCatalog', 'query', {
      accessPattern: { kind: 'list', pagination: 'required' },
      inputs: [{ inputId: 'searchTerm', fieldRef: 'Product.name', required: false, source: 'userInput' }, { inputId: 'page', type: 'number', required: false, source: 'userInput' }],
      outputShape: { kind: 'paginated', fields: [{ name: 'products', type: 'array', required: true, item: { fields: [{ name: 'productId', type: 'string', required: true }, { name: 'name', type: 'string', required: true }] } }] },
    })),
    file(4, 'petShop/operations', 'viewProductDetail', '.defs.ts', operationDefs('viewProductDetail', 'view', {
      accessPattern: { kind: 'getById' },
      inputs: [{ inputId: 'productId', fieldRef: 'Product.productId', required: true, source: 'selectedEntity' }],
      outputShape: { kind: 'object', fields: [{ name: 'productId', type: 'string', required: true }, { name: 'name', type: 'string', required: true }] },
    })),
    file(4, 'petShop/workspaces', 'catalog', '.defs.ts', defs('catalogWorkspace', JSON.stringify({
      workspaceId: 'catalog', title: 'Catálogo', actors: ['cliente'], kind: 'operation', entity: 'Product', purpose: 'Navegar',
      bffCalls: [
        { bffId: 'catalogList', kind: 'query', uses: [{ operationId: 'browseCatalog' }], input: [{ name: 'searchTerm', from: 'browseCatalog.searchTerm' }, { name: 'page', from: 'browseCatalog.page' }], output: { kind: 'paginated', fields: [{ name: 'productId', from: 'browseCatalog.$items.productId' }, { name: 'name', from: 'browseCatalog.$items.name' }] }, route: 'petShop.catalog.catalogList' },
        { bffId: 'productDetail', kind: 'query', uses: [{ operationId: 'viewProductDetail' }], input: [{ name: 'productId', from: 'viewProductDetail.productId' }], output: { kind: 'object', fields: [{ name: 'productId', from: 'viewProductDetail.productId' }, { name: 'name', from: 'viewProductDetail.name' }] }, route: 'petShop.catalog.productDetail' },
      ],
      sections: [{ sectionId: 'catalog', intent: 'Buscar', organisms: [{ role: 'primarySurface', dataSource: 'catalogList' }, { role: 'filterControl', attachTo: 'catalogList' }, { role: 'detailPanel', dataSource: 'productDetail' }] }],
      operationIds: ['browseCatalog', 'viewProductDetail'],
    }))),
    file(4, 'petShop/workspaces', 'home', '.defs.ts', defs('homeWorkspace', JSON.stringify({
      workspaceId: 'home', title: 'Início', actors: ['cliente'], kind: 'landing', entity: 'Product', purpose: 'Descobrir destaques',
      bffCalls: [
        { bffId: 'featuredProducts', kind: 'query', uses: [{ operationId: 'browseCatalog' }], input: [{ name: 'page', from: 'browseCatalog.page' }], output: { kind: 'paginated', fields: [{ name: 'productId', from: 'browseCatalog.$items.productId' }, { name: 'name', from: 'browseCatalog.$items.name' }] }, route: 'petShop.home.featuredProducts' },
      ],
      sections: [{ sectionId: 'home', intent: 'Descobrir', organisms: [{ role: 'hero' }, { role: 'showcase', dataSource: 'featuredProducts' }, { role: 'ctaLink' }] }],
      operationIds: ['browseCatalog'],
    }))),
    file(4, 'petShop/contracts', 'home--featuredProducts', '.ts', [
      `/// <mls fileReference="_${PROJECT}_/l4/petShop/contracts/home--featuredProducts.ts" enhancement="_blank"/>`,
      'export interface FeaturedProductsInput { page?: number; }',
      'export interface FeaturedProductsOutput { productId: string; name: string; }',
      "export const featuredProductsRoute = 'petShop.home.featuredProducts' as const;",
      '',
    ].join('\n')),
    file(4, 'petShop/contracts', 'catalog--catalogList', '.ts', CATALOG_CONTRACT),
    file(4, 'petShop/contracts', 'catalog--productDetail', '.ts', DETAIL_CONTRACT),
    file(5, 'petShop', 'todoFrontend', '.defs.ts', defs('petShopTodoFrontend', JSON.stringify({
      moduleName: 'petShop', layer: 'frontend', owners: [
        { ownerType: 'operation', ownerId: 'browseCatalog', status: 'toCreate' },
        { ownerType: 'operation', ownerId: 'viewProductDetail', status: 'toCreate' },
      ],
    }))),
    // Orphan l5 from a prior module name (no l4 for 'legacyPet'): must be IGNORED, not fatal.
    file(5, 'legacyPet', 'todoFrontend', '.defs.ts', defs('legacyPetTodoFrontend', JSON.stringify({
      moduleName: 'legacyPet', layer: 'frontend', owners: [
        { ownerType: 'operation', ownerId: 'oldBrowse', status: 'done' },
        { ownerType: 'workflow', ownerId: 'oldFlow', status: 'toCreate' },
      ],
    }))),
  ];
  // l4 .ts contracts are never read by this agent (l4 = only .defs.ts). The `contracts:false` mode drops
  // them from the fixture to prove the pipeline never depends on them (contracts are generated in F3).
  const effective = withContracts ? files : files.filter(f => !(f.folder.endsWith('/contracts') && f.extension === '.ts'));
  // Preserve g.mls.events (installed by loadModule for libModel init); only swap project + files.
  g.mls.actualProject = PROJECT;
  g.mls.stor = { ...(g.mls.stor || {}), files: Object.fromEntries(effective.map((f, i) => [`f${i}`, f])) };
}

test('readCreateContext reads l4 v2: module-scoped operations, standalone workspace bffCalls, actors, landings', async () => {
  const { readCreateContext } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  assert.deepEqual(ctx.moduleNames, ['petShop']);
  // Module-scoped operations are found and attributed to petShop (not inferred).
  assert.equal(ctx.operations.get('browseCatalog')?.moduleName, 'petShop');
  assert.equal(ctx.operations.get('viewProductDetail')?.moduleName, 'petShop');
  // Standalone workspace parsed with its bffCalls + sections.
  const journey = ctx.journeys.find((j: { moduleName: string; }) => j.moduleName === 'petShop');
  assert.ok(journey, 'petShop journey present');
  const catalog = journey!.workspaces.find((w: { workspaceId: string; }) => w.workspaceId === 'catalog');
  assert.ok(catalog, 'catalog workspace present');
  assert.deepEqual(catalog!.bffCalls.map((c: { bffId: any; }) => c.bffId), ['catalogList', 'productDetail']);
  assert.deepEqual(catalog!.sections[0].organisms.map((o: { role: any; }) => o.role), ['primarySurface', 'filterControl', 'detailPanel']);
  // Actors + landings from their standalone files.
  assert.deepEqual((ctx.actorsByModule.petShop || []).map((a: { actorId: any; }) => a.actorId), ['cliente']);
  assert.equal(journey!.landings[0]?.workspaceId, 'catalog');
  // l4 is read as .defs.ts only — the context exposes no raw l4 .ts (contracts are generated in F3).
  assert.equal('contractsRaw' in ctx, false);
  // One page per workspace, keyed by workspaceId.
  const page = ctx.pages.find((p: { pageId: string; }) => p.pageId === 'catalog');
  assert.ok(page, 'catalog page built from the workspace');
  // An orphan l5 todoFrontend for a module with no l4 (legacyPet) is ignored, not fatal.
  assert.equal(ctx.moduleNames.includes('legacyPet'), false);
});

test('orphan todoFrontend for a module absent from l4 does not block the run (module-rename leftover)', async () => {
  // Repro of the Lima failure: l5/petShop left behind after petShop -> petShopReservaRetirada. readCreateContext
  // must not throw "todoFrontend has owner(s) absent from l4"; the orphan module's l5 is simply skipped.
  const { readCreateContext } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  assert.ok(ctx.pages.some((p: any) => p.pageId === 'catalog'));
  assert.equal(ctx.warnings.some((w: string) => w.includes("orphan todoFrontend for module 'legacyPet'")), true);
});

test('preparePageCreate builds one command per bffCall and GENERATES the l2 contracts from the bffCall (F3, no l4 .ts read)', async () => {
  const { readCreateContext, preparePageCreate } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: { pageId: string; }) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  // Commands come from bffCalls (not operations): catalogList (paginated) + productDetail (object).
  const byName = new Map(prepared.commands.map((c: { commandName: any; }) => [String(c.commandName), c]));
  assert.deepEqual([...byName.keys()].sort(), ['catalogList', 'productDetail']);
  assert.equal(String((byName.get('catalogList')! as any).routeKey), 'petShop.catalog.catalogList');
  assert.equal(String((byName.get('catalogList')! as any).outputShape), 'paginated');
  assert.equal(String((byName.get('productDetail')! as any).outputShape), 'object');
  // F3: ONE generated l2 contract .ts per WORKSPACE (contracts/<pageId>.ts) with every bffCall's
  // Input/Output interfaces + route consts; l2 header, generated marker; NEVER references an l4 .ts.
  assert.equal(prepared.contractCopies.length, 1);
  const copy = prepared.contractCopies[0];
  assert.equal(copy.contractName, 'catalog');
  assert.equal(copy.fileInfo.folder, 'petShop/web/contracts');
  assert.equal(copy.fileInfo.shortName, 'catalog');
  assert.match(copy.source, /<mls fileReference="_102049_\/l2\/petShop\/web\/contracts\/catalog\.ts"/);
  assert.doesNotMatch(copy.source, /l4\/petShop\/contracts/); // never an l4 .ts reference
  assert.match(copy.source, /GENERATED from l4 bffCalls — do not edit/);
  // Both bffCalls' interfaces + route consts in the single file.
  assert.match(copy.source, /export interface CatalogListInput \{/);
  assert.match(copy.source, /export const catalogListRoute = 'petShop\.catalog\.catalogList' as const;/);
  assert.match(copy.source, /export interface ProductDetailOutput \{/);
  assert.match(copy.source, /export const productDetailRoute = 'petShop\.catalog\.productDetail' as const;/);
});

test('deterministicLayoutFromBase (F4) builds one surface + embedded filters + detail panel, not sibling lists', async () => {
  const { readCreateContext, preparePageCreate, deterministicLayoutFromBase } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  const layout = deterministicLayoutFromBase(prepared);
  // One section (the workspace section), not one-per-query.
  assert.equal(layout.sections.length, 1);
  const organisms = layout.sections[0].organisms;
  // primarySurface(catalogList) as a queryResult + detailPanel(productDetail); filterControl folded in.
  const surface = organisms.find((o: any) => o.id.endsWith('.catalogList'));
  const detail = organisms.find((o: any) => o.id.endsWith('.productDetail'));
  assert.ok(surface && surface.type === 'queryResult', 'catalogList is the primary surface');
  assert.equal(surface.intentions[0].intent, 'queryList');
  // The filterControl (attachTo catalogList) folds into the surface's filters (searchTerm, page).
  assert.deepEqual(surface.intentions[0].filters.map((f: any) => f.field), ['searchTerm', 'page']);
  assert.ok(detail && detail.intentions[0].intent === 'detail', 'productDetail rendered as a detail panel');
  // No standalone filterControl organism.
  assert.equal(organisms.some((o: any) => o.type === 'filterControl'), false);
});

test('buildPageTestCases (F7) derives cases from the bffCall route const + output shape', async () => {
  const { readCreateContext, preparePageCreate, buildPageTestCases } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  const cases = buildPageTestCases(prepared);
  const list = cases.find((c: any) => c.id === 'catalogList.ok');
  const detail = cases.find((c: any) => c.id === 'productDetail.ok');
  // Routine is the bffCall route const, not a synthesized module.page.operation string.
  assert.equal(list.routine, 'petShop.catalog.catalogList');
  assert.equal(list.expect.shape, 'paginated');
  assert.equal(detail.routine, 'petShop.catalog.productDetail');
  assert.equal(detail.expect.shape, 'object');
});

// bugTests.md F1.1/F4.1/F2. A minimal prepared page — buildPageTestCases only reads commands,
// operations and the two entity classifications — so each rule is pinned without touching the petShop
// fixture.
function preparedForTests(overrides: Record<string, unknown> = {}): any {
  return {
    project: 102046,
    page: { moduleName: 'buildFlowFsm', pageId: 'changeOrderDecisionCatalogue' },
    workspace: { actor: 'projectManager' },
    mdmEntityIds: [],
    externalEntityIds: [],
    operations: [],
    commands: [],
    ...overrides,
  };
}

test('F4.1: a selected-entity input is a <seedRef>, whatever its name ends with', async () => {
  const { buildPageTestCases } = await loadModule();
  // Verbatim from the buildFlowFsm run: the FK is named `changeOrder` (no Id suffix) and is filled by
  // picking from a list. It used to receive the literal "teste" and every run answered
  // `NOT_FOUND: ChangeOrder not found: teste` without ever exercising the command.
  const prepared = preparedForTests({
    commands: [
      { commandName: 'qryListChangeOrderDecision', kind: 'query', routeKey: 'buildFlowFsm.x.qryListChangeOrderDecision', outputShape: 'array', producedFields: ['changeOrderDecisionId', 'changeOrder'], input: [], output: [] },
      { commandName: 'cmdCreateChangeOrderDecision', kind: 'command', routeKey: 'buildFlowFsm.x.cmdCreateChangeOrderDecision', input: [
        { name: 'changeOrder', required: true, source: 'selectedEntity', presentation: 'selection', type: 'string' },
        { name: 'madeByPlatformUser', required: true, source: 'actorSession', presentation: 'form', type: 'string' },
        { name: 'decision', required: true, source: 'userInput', presentation: 'form', type: 'string' },
      ], output: [] },
    ],
  });
  const created = buildPageTestCases(prepared).find((c: any) => c.id === 'cmdCreateChangeOrderDecision.ok');
  assert.equal(created.params.changeOrder, '<seedRef>');
  // Runtime-resolved input is still omitted, and a domain field still gets a literal.
  assert.equal('madeByPlatformUser' in created.params, false);
  assert.equal(created.params.decision, 'teste');
});

test('F1.1: deleting master data is proved to FAIL, not expected to succeed', async () => {
  const { buildPageTestCases } = await loadModule();
  const commands = [
    // The list is what makes the ids harvestable — a delete whose id no read produces is skipped as
    // unsatisfiable, before any of this.
    { commandName: 'qryListClient', kind: 'query', routeKey: 'buildFlowFsm.x.qryListClient', outputShape: 'array', producedFields: ['clientId', 'clientPortalAccessId'], input: [], output: [] },
    { commandName: 'cmdDeleteClient', kind: 'command', routeKey: 'buildFlowFsm.x.cmdDeleteClient', input: [{ name: 'clientId', required: true, source: 'selectedEntity', presentation: 'selection', type: 'string' }], output: [] },
    { commandName: 'cmdDeleteClientPortalAccess', kind: 'command', routeKey: 'buildFlowFsm.x.cmdDeleteClientPortalAccess', input: [{ name: 'clientPortalAccessId', required: true, source: 'selectedEntity', presentation: 'selection', type: 'string' }], output: [] },
  ];
  const operations = [
    { commandName: 'cmdDeleteClient', operationId: 'deleteClient', kind: 'delete', entity: 'Client', reads: [], writes: ['Client'] },
    { commandName: 'cmdDeleteClientPortalAccess', operationId: 'deleteClientPortalAccess', kind: 'delete', entity: 'ClientPortalAccess', reads: [], writes: ['ClientPortalAccess'] },
  ];
  const cases = buildPageTestCases(preparedForTests({ commands, operations, mdmEntityIds: ['Client'] }));
  // Client is master data (storage.target: mdm) -> the case proves the policy instead of expecting ok.
  const client = cases.find((c: any) => c.id === 'cmdDeleteClient.notDeletable');
  assert.ok(client, cases.map((c: any) => c.id).join(', '));
  assert.deepEqual(client.expect, { ok: false, errorCode: 'CONFLICT' });
  assert.ok(!cases.some((c: any) => c.id === 'cmdDeleteClient.ok'), 'no success case for an operation that must not succeed');
  // A module-local entity keeps its positive delete: nothing else references it.
  assert.ok(cases.some((c: any) => c.id === 'cmdDeleteClientPortalAccess.ok'));
});

test('F2: a command touching an identity that still lives outside MDM is marked, not counted as new breakage', async () => {
  const { buildPageTestCases } = await loadModule();
  const cases = buildPageTestCases(preparedForTests({
    commands: [
      { commandName: 'qryListTimeLog', kind: 'query', routeKey: 'buildFlowFsm.x.qryListTimeLog', outputShape: 'array', producedFields: ['timeLogId', 'invoiceId'], input: [], output: [] },
      { commandName: 'cmdUpdateTimeLog', kind: 'command', routeKey: 'buildFlowFsm.x.cmdUpdateTimeLog', input: [{ name: 'timeLogId', required: true, source: 'selectedEntity', presentation: 'selection', type: 'string' }], output: [] },
      { commandName: 'cmdUpdateInvoice', kind: 'command', routeKey: 'buildFlowFsm.x.cmdUpdateInvoice', input: [{ name: 'invoiceId', required: true, source: 'selectedEntity', presentation: 'selection', type: 'string' }], output: [] },
    ],
    operations: [
      { commandName: 'cmdUpdateTimeLog', operationId: 'updateTimeLog', kind: 'update', entity: 'TimeLog', reads: ['FieldWorker'], writes: ['TimeLog'] },
      { commandName: 'cmdUpdateInvoice', operationId: 'updateInvoice', kind: 'update', entity: 'Invoice', reads: [], writes: ['Invoice'] },
    ],
    externalEntityIds: ['FieldWorker'],
  }));
  assert.equal(cases.find((c: any) => c.id === 'cmdUpdateTimeLog.ok').expectedFail, 'mdm-rebuild');
  // A command that touches no external identity carries no mark.
  assert.equal('expectedFail' in cases.find((c: any) => c.id === 'cmdUpdateInvoice.ok'), false);
});

test('validatePageLayout accepts a v2 layout keyed by bffCall ids (bffId != operationId) — regression', async () => {
  // Repro of the Lima failure: workspace bffId 'catalogList' wraps operationId 'browseCatalog'. The
  // coverage check must count the bffCall id (the layout's action), NOT demand the underlying operationId.
  const { readCreateContext, preparePageCreate, deterministicLayoutFromBase, validatePageLayout } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  // Sanity: the page owns operations whose ids differ from the bffCall ids the layout references.
  assert.ok(page.operationIds.includes('browseCatalog'));
  assert.ok(prepared.commands.some((c: any) => c.commandName === 'catalogList'));
  const layout = deterministicLayoutFromBase(prepared);
  assert.doesNotThrow(() => validatePageLayout(prepared, layout));
});

test('remapLayoutActionsToBff maps LLM operationId refs to their bffCall id, then validation passes — Lima regression', async () => {
  // Repro: the LLM references operationId 'browseCatalog' (usecase behind bffId 'catalogList') and
  // 'viewProductDetail' (behind 'productDetail'). The remap must rewrite them to the bffCall ids.
  const { readCreateContext, preparePageCreate, deterministicLayoutFromBase, remapLayoutActionsToBff, validatePageLayout } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  // Start from the valid seed, then rewrite bffId refs back to operationIds to simulate the LLM output.
  const seed = deterministicLayoutFromBase(prepared);
  const opFor: Record<string, string> = { catalogList: 'browseCatalog', productDetail: 'viewProductDetail' };
  const llmish = JSON.parse(JSON.stringify(seed));
  for (const section of llmish.sections) for (const org of section.organisms) {
    org.userActions = org.userActions.map((a: string) => opFor[a] || a);
    for (const intent of org.intentions) if (intent.action && opFor[intent.action]) intent.action = opFor[intent.action];
  }
  // Sanity: the simulated layout references operationIds that are NOT shared actions.
  assert.ok(llmish.sections[0].organisms.some((o: any) => o.userActions.includes('browseCatalog')));
  const remapped = remapLayoutActionsToBff(prepared, llmish);
  // After remap: operationIds are gone, bffCall ids restored, and validation passes.
  const surface = remapped.sections[0].organisms.find((o: any) => o.id.endsWith('.catalogList'));
  assert.deepEqual(surface.userActions, ['catalogList']);
  assert.equal(surface.intentions[0].action, 'catalogList');
  assert.doesNotThrow(() => validatePageLayout(prepared, remapped));
});

test('seed is bffCall-keyed and contracts are generated even with NO l4 .ts present (l4 = only .defs.ts) — Lima regression', async () => {
  // Repro of the "sem chamar a LLM" failure + the l4-.ts rule: l4 holds only .defs.ts, so there is no
  // l4 .ts to read. Contracts are GENERATED from the bffCall, and the seed keys off bffCalls (never the
  // legacy per-operation layout whose operationId refs are absent from shared.actions).
  const { readCreateContext, preparePageCreate, deterministicLayoutFromBase, validatePageLayout } = await loadModule();
  installPetShopStor({ contracts: false });
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  // One contract file per workspace is generated from the bffCalls regardless of any l4 .ts.
  assert.equal(prepared.contractCopies.length, 1);
  assert.ok(prepared.contractCopies.every((c: any) => !/l4\/.*\/contracts/.test(c.source)));
  const layout = deterministicLayoutFromBase(prepared);
  const organisms = layout.sections.flatMap((s: any) => s.organisms);
  // Organisms reference bffCall ids (catalogList/productDetail), never the operationIds (browseCatalog...).
  assert.ok(organisms.some((o: any) => o.userActions.includes('catalogList')));
  assert.equal(organisms.some((o: any) => o.userActions.includes('browseCatalog') || o.userActions.includes('viewProductDetail')), false);
  assert.doesNotThrow(() => validatePageLayout(prepared, layout));
});

test('bffFieldTsType types a paginated envelope items[] as a nested object array (not a scalar) — Lima regression', async () => {
  // Repro of the build-all tsc error: the paginated output envelope field `items` (type 'array' with
  // item.fields) was flattened to `string`, so the render's catalogRows.map failed. It must be `{…}[]`.
  const { bffFieldTsType } = await loadModule();
  const itemsField = {
    name: 'items', from: 'browseCatalog.$items', type: 'array',
    item: { fields: [{ name: 'productId', from: 'browseCatalog.$items.productId', type: 'string' }, { name: 'price', from: 'browseCatalog.$items.price', type: 'number' }] },
  };
  const ts = bffFieldTsType(itemsField, 'output', new Map(), new Map());
  assert.equal(ts, '{ productId: string; price: number }[]');
  // A plain scalar still maps normally.
  assert.equal(bffFieldTsType({ name: 'total', from: 'browseCatalog.total', type: 'number' }, 'output', new Map(), new Map()), 'number');
});

test('relaxed layout tool schema tolerates LLM section drift (type not enum-pinned, mode optional)', async () => {
  // Repro of the Lima ajv failure: LLM emitted sections/2 with a non-enum type and no mode. The relaxed
  // tool schema must not enum-pin 'type' and must not require 'mode' (the normalizer defaults both).
  const { cfePageLayoutToolSchema } = await loadModule();
  const sectionItems = cfePageLayoutToolSchema?.function?.parameters?.properties?.result?.properties?.pageLayout?.properties?.sections?.items;
  assert.ok(sectionItems, 'section items schema present');
  assert.equal(sectionItems.required.includes('mode'), false, 'mode is not required');
  assert.equal(Array.isArray(sectionItems.properties?.type?.enum), false, 'type is not enum-pinned');
  assert.equal(sectionItems.required.includes('organisms'), true, 'organisms stays required');
});

test('landing workspace (F6) builds content organisms: hero + showcase(query) + ctaLink', async () => {
  const { readCreateContext, preparePageCreate, deterministicLayoutFromBase } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const home = ctx.pages.find((p: any) => p.pageId === 'home')!;
  assert.ok(home, 'home landing page discovered');
  const prepared = await preparePageCreate(home, ctx);
  const layout = deterministicLayoutFromBase(prepared);
  const organisms = layout.sections[0].organisms;
  const intents = organisms.map((o: any) => o.intentions[0].intent);
  assert.ok(intents.includes('hero'), 'hero content organism present');
  assert.ok(intents.includes('ctaLink'), 'ctaLink content organism present');
  // showcase is fed by the featuredProducts query (type showcase, bound to its bffCall).
  const showcase = organisms.find((o: any) => o.type === 'showcase');
  assert.ok(showcase, 'showcase organism present');
  assert.equal(showcase.intentions[0].source, 'bff.featuredProducts');
});

// ---- page tests: <seedRef> only for harvestable entity ids, literals for domain fields ----
// Regression for the 102051 measurement: 100% of emitted params were "<seedRef>", so 20 of 24 cases were
// inconclusive (the runner cannot resolve a domain field, omits it, and the command dies in
// VALIDATION_ERROR) and 29 more "passed" for the wrong reason. buildPageTestCases only reads
// prepared.commands + prepared.page, so these drive it directly with synthetic commands — no project
// fixture, no hardcoded module/page name.
function preparedFor(commands: any[]): any {
  return { page: { moduleName: 'anyModule', pageId: 'anyPage' }, commands };
}
function queryCommand(extra: any = {}): any {
  return { commandName: 'readThings', kind: 'query', routeKey: 'anyModule.anyPage.readThings', outputShape: 'paginated', input: [], output: [{ name: 'thingId' }, { name: 'total' }], producedFields: ['things', 'total', 'thingId', 'label'], collectionField: 'things', ...extra };
}

test('page tests: <seedRef> only for an entity id the page reads; domain fields get typed literals', async () => {
  const { buildPageTestCases } = await loadModule();
  const write = {
    commandName: 'saveThing', kind: 'command', routeKey: 'anyModule.anyPage.saveThing', outputShape: 'object',
    input: [
      { name: 'thingId', required: true, presentation: 'form', type: 'string', l4Type: 'string' },      // id the query returns -> seedRef
      { name: 'quantity', required: true, presentation: 'form', type: 'number', l4Type: 'integer' },
      { name: 'active', required: true, presentation: 'form', type: 'boolean', l4Type: 'boolean' },
      { name: 'startedAt', required: true, presentation: 'form', type: 'string', l4Type: 'datetime' },
      { name: 'dueDate', required: true, presentation: 'form', type: 'string', l4Type: 'date' },
      { name: 'notes', required: true, presentation: 'form', type: 'string', l4Type: 'string' },
      { name: 'optionalOne', required: false, presentation: 'form', type: 'string' },
    ],
    output: [],
  };
  const cases = buildPageTestCases(preparedFor([queryCommand(), write]));
  const ok = cases.find((c: any) => c.id === 'saveThing.ok')!;
  assert.equal(ok.params.thingId, '<seedRef>', 'id produced by a page read stays a seedRef');
  assert.equal(ok.params.quantity, 1);
  assert.equal(ok.params.active, true);
  assert.equal(ok.params.startedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(ok.params.dueDate, '2026-01-01');
  assert.equal(ok.params.notes, 'teste');
  assert.ok(!('optionalOne' in ok.params), 'only required fields are sent');
  // A negative case omits exactly ONE field and every other param still resolves — otherwise it would
  // pass for the wrong reason (the backend rejecting a different, unresolved field).
  const negative = cases.find((c: any) => c.id === 'saveThing.notes.required')!;
  assert.ok(!('notes' in negative.params));
  assert.equal(negative.params.quantity, 1);
  assert.equal(negative.params.thingId, '<seedRef>');
  assert.equal(Object.values(negative.params).includes('<seedRef>'), true);
  assert.equal(Object.values(negative.params).filter(v => v === '<seedRef>').length, 1, 'only the id is a seedRef');
});

test('page tests: an enum/state field takes the NEXT declared value, never <seedRef>', async () => {
  // 102051 D2: status: "<seedRef>" resolved to the row's CURRENT status and the state-machine rule
  // rejected it ("kitchen status must progress"). The literal must be a forward transition.
  const { buildPageTestCases } = await loadModule();
  const write = {
    commandName: 'advanceThing', kind: 'command', routeKey: 'r', outputShape: 'object',
    input: [
      { name: 'thingId', required: true, presentation: 'form', type: 'string' },
      { name: 'status', required: true, presentation: 'form', type: 'string', enum: ['registered', 'confirmed', 'inPreparation', 'ready'] },
    ],
    output: [],
  };
  const ok = buildPageTestCases(preparedFor([queryCommand(), write])).find((c: any) => c.id === 'advanceThing.ok')!;
  assert.equal(ok.params.status, 'confirmed', 'second declared state = next transition from a freshly seeded row');
  assert.notEqual(ok.params.status, '<seedRef>');
});

test('page tests: paginated query declares the real collection key (itemsKey)', async () => {
  // 102051 D3: the wire returns { menuItems, total } but the runner assumed { items } -> 3 permanent
  // failures that were not backend defects. itemsKey is emitted ONLY for paginated.
  const { buildPageTestCases } = await loadModule();
  const paginated = buildPageTestCases(preparedFor([queryCommand()])).find((c: any) => c.id === 'readThings.ok')!;
  assert.equal(paginated.expect.shape, 'paginated');
  assert.equal(paginated.expect.itemsKey, 'things');
  assert.equal(paginated.expect.minItems, 1);
  // object/array shapes carry no itemsKey.
  const objectCase = buildPageTestCases(preparedFor([queryCommand({ commandName: 'readOne', outputShape: 'object', collectionField: undefined })])).find((c: any) => c.id === 'readOne.ok')!;
  assert.equal(objectCase.expect.shape, 'object');
  assert.ok(!('itemsKey' in objectCase.expect));
  // A paginated call whose collection cannot be derived stays back-compatible (runner assumes "items").
  const noKey = buildPageTestCases(preparedFor([queryCommand({ commandName: 'readLegacy', collectionField: undefined })])).find((c: any) => c.id === 'readLegacy.ok')!;
  assert.ok(!('itemsKey' in noKey.expect));
});

test('page tests: a required id no read of the page produces still emits a query with <seedRef>', async () => {
  // Inspect-only screens (consultInstitutionalHome, petServiceOverviewView, planScheduleAvailability)
  // used to skip silently. The runner harvests <seedRef> from every page of the run / from seeds.
  const { buildPageTestCases } = await loadModule();
  const orphan = { commandName: 'readOrphan', kind: 'query', routeKey: 'r', outputShape: 'object', input: [{ name: 'otherThingId', required: true, presentation: 'form', type: 'string' }], output: [] };
  const cases = buildPageTestCases(preparedFor([queryCommand(), orphan]));
  const inspect = cases.find((c: any) => c.id === 'readOrphan.ok');
  assert.ok(inspect, 'inspect query is emitted');
  assert.equal(inspect.params.otherThingId, '<seedRef>');
  assert.equal(cases.some((c: any) => c.id === 'readThings.ok'), true, 'the list case is still emitted');
});

test('page tests are deterministic (same input -> byte-identical cases)', async () => {
  const { buildPageTestCases } = await loadModule();
  const build = () => buildPageTestCases(preparedFor([queryCommand(), {
    commandName: 'saveThing', kind: 'command', routeKey: 'r', outputShape: 'object',
    input: [{ name: 'thingId', required: true, presentation: 'form', type: 'string' }, { name: 'startedAt', required: true, presentation: 'form', l4Type: 'datetime' }],
    output: [],
  }]));
  assert.equal(JSON.stringify(build()), JSON.stringify(build()));
});

test('page tests: runtime-resolved inputs are omitted and get no negative case', async () => {
  // 102051 D5: openedByUserId/closedByUserId (actorSession) and closedAt/updatedAt (systemDefault) are
  // derived by the backend. Sending a fake literal id would only break a lookup, and a ".required" case
  // that omits a field the ok case never sends is self-contradictory — the backend derives it, the call
  // succeeds, and the case fails while claiming to expect VALIDATION_ERROR.
  const { buildPageTestCases } = await loadModule();
  const write = {
    commandName: 'closeThing', kind: 'command', routeKey: 'r', outputShape: 'object',
    input: [
      { name: 'thingId', required: true, presentation: 'form', type: 'string', source: 'selectedEntity' },
      { name: 'closedByUserId', required: true, presentation: 'form', type: 'string', source: 'actorSession' },
      { name: 'closedAt', required: true, presentation: 'form', l4Type: 'datetime', source: 'systemDefault' },
      { name: 'notes', required: true, presentation: 'form', type: 'string', source: 'userInput' },
    ],
    output: [],
  };
  const cases = buildPageTestCases(preparedFor([queryCommand(), write]));
  const ok = cases.find((c: any) => c.id === 'closeThing.ok')!;
  assert.deepEqual(Object.keys(ok.params).sort(), ['notes', 'thingId'], 'backend-derived inputs are not sent');
  // Only CLIENT-supplied form fields get a negative case (omitting one must really reach the backend as
  // missing). closedByUserId/closedAt are backend-derived, so no case is emitted for them.
  const negatives = cases.filter((c: any) => c.id.startsWith('closeThing.') && c.id.endsWith('.required')).map((c: any) => c.id).sort();
  assert.deepEqual(negatives, ['closeThing.notes.required', 'closeThing.thingId.required']);
  assert.equal(negatives.some((id: string) => id.includes('closedByUserId') || id.includes('closedAt')), false, 'no negative case for a backend-derived field');
});

test('page tests: a read cannot satisfy its OWN required id (no self-harvest)', async () => {
  // 102051 D4 (getShiftClosingReport): a getById query whose output repeats its own key looked
  // satisfiable — but a routine cannot run before itself, so nothing resolves the seedRef.
  const { buildPageTestCases } = await loadModule();
  const selfFed = {
    commandName: 'readReport', kind: 'query', routeKey: 'r', outputShape: 'object',
    input: [{ name: 'reportId', required: true, presentation: 'form', type: 'string', source: 'routeParam' }],
    output: [{ name: 'reportId' }], producedFields: ['reportId', 'label'],
  };
  // Alone on the page: still emit the inspect case with <seedRef> (harvested from other pages /
  // seeds of the run). Silent skip made consultInstitutionalHome / petServiceOverviewView /
  // planScheduleAvailability look untested.
  const alone = buildPageTestCases(preparedFor([selfFed]));
  assert.equal(alone.length, 1);
  assert.equal(alone[0].params.reportId, '<seedRef>');
  // With ANOTHER read that produces reportId, the seedRef resolves and the case is emitted.
  const other = queryCommand({ commandName: 'readReports', producedFields: ['reportId', 'label'], collectionField: 'reports' });
  const withPeer = buildPageTestCases(preparedFor([other, selfFed]));
  assert.equal(withPeer.find((c: any) => c.id === 'readReport.ok')!.params.reportId, '<seedRef>');
});

// ---- addLanguage handoff: the extra-locale task at the end of changeFrontend ----
// The generated shared .ts carries ONE catalog (the module default); agentAddLanguage adds the others,
// sending only the i18n block to a cheap translate model. A single-language module needs no extra task.
test('addLanguage handoff: payload matches the plugin contract; null for a single-language module', async () => {
  const mod = await loadModule() as unknown as {
    buildAddLanguageMessage: (ctx: any, pages: any[]) => string | null;
  };
  const ctx = (defaultLocale: string, activeLocales: string[]) => ({
    project: 102045,
    moduleI18n: { buildFlowFsm: { defaultLocale, activeLocales } },
  });
  const pages = [{ moduleName: 'buildFlowFsm', pageId: 'billingWorkspace' }];

  // Real 102045 case (l4 declares en + pt-BR; activeLocales are normalized 2-letter keys).
  assert.equal(
    mod.buildAddLanguageMessage(ctx('en', ['en', 'pt']), pages),
    '@@addLanguage [{"languages":[{"code":"pt","name":"Portuguese"}],"projectId":102045,"moduleName":"buildFlowFsm"}]',
  );
  // Single language -> no extra task at all.
  assert.equal(mod.buildAddLanguageMessage(ctx('en', ['en']), pages), null);
  // The DEFAULT locale is never re-translated, whichever it is.
  const fromPt = mod.buildAddLanguageMessage(ctx('pt', ['pt', 'en', 'es']), pages) || '';
  assert.match(fromPt, /"code":"en"/);
  assert.match(fromPt, /"code":"es"/);
  assert.doesNotMatch(fromPt, /"code":"pt"/);
  // Unknown code: the name falls back to the code itself (never emitted empty).
  assert.match(mod.buildAddLanguageMessage(ctx('en', ['en', 'zz']), pages) || '', /\{"code":"zz","name":"zz"\}/);
  // No finalized page -> nothing to translate (module cannot be derived).
  assert.equal(mod.buildAddLanguageMessage(ctx('en', ['en', 'pt']), []), null);
});

test('addLanguage handoff preserves the region so en + en-AU can coexist', async () => {
  // languageKeys collapses 'en-AU' to 'en' (same as 'en'), which would make a regional variant vanish.
  // runtimeLocales keeps it, and the DEFAULT is always first (the runtime falls back to languages[0]).
  const mod = await loadModule() as unknown as { buildAddLanguageMessage: (ctx: any, pages: any[]) => string | null };
  const pages = [{ moduleName: 'm', pageId: 'p' }];
  const ctx = (runtimeLocales: string[]) => ({ project: 1, moduleI18n: { m: { defaultLocale: runtimeLocales[0], activeLocales: [], runtimeLocales } } });

  const regional = mod.buildAddLanguageMessage(ctx(['en', 'en-au']), pages) || '';
  assert.match(regional, /"code":"en-au"/, 'the regional variant is requested');
  assert.doesNotMatch(regional, /"code":"en"[,}]/, 'the default (first) is never re-translated');

  // The catalog knows regional entries by their full code, so the NAME is the regional one too.
  const ptBr = mod.buildAddLanguageMessage(ctx(['en', 'pt-br']), pages) || '';
  assert.match(ptBr, /\{"code":"pt-br","name":"Portuguese \(Brazil\)"\}/, 'region kept in both code and name');

  // Single language (even regional) -> no task.
  assert.equal(mod.buildAddLanguageMessage(ctx(['pt-br']), pages), null);
});

// ---- three slots per workspace (31/jul slot study) ----
// page11 bespoke + page21/page31 driven by the UX category's contrasting experience skills, all on the
// REDUCED defs. A category with no skill file degrades that slot to bespoke instead of shipping a broken
// pipeline path.
test('slot plan: page11 bespoke, page21/page31 resolve the category experience skill', async () => {
  const mod = await loadModule() as unknown as { buildLayoutVariantPlanForTest?: unknown };
  void mod;
  // Skill resolution reads the stor; install a fixture with only page21.md present for the category.
  const key = (folder: string, shortName: string) => `102020/4/${folder}/${shortName}.md`;
  const priorFiles = g.mls.stor.files;
  g.mls.stor.files = {
    ...priorFiles,
    [key('collabux/templates/financialTransactions', 'page21')]: { status: 'active' },
  };
  try {
    const { readCreateContext, preparePageCreate } = await loadModule();
    installPetShopStor();
    // installPetShopStor replaces the stor; re-add the skill fixture on top of it.
    g.mls.stor.files[key('collabux/templates/financialTransactions', 'page21')] = { status: 'active' };
    const ctx = await readCreateContext();
    const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
    const prepared = await preparePageCreate(page, ctx);
    const genomes = prepared.variantPlan.map((v: any) => v.genome);
    assert.deepEqual(genomes, ['page11', 'page21', 'page31'], 'three slots are planned');
    assert.equal(prepared.variantPlan[0].experienceSkill, undefined, 'page11 is bespoke');
  } finally {
    g.mls.stor.files = priorFiles;
  }
});

test('reduced page defs: real purpose from l4, no layout/sections', async () => {
  const { readCreateContext, preparePageCreate } = await loadModule();
  installPetShopStor();
  const ctx = await readCreateContext();
  const page = ctx.pages.find((p: any) => p.pageId === 'catalog')!;
  const prepared = await preparePageCreate(page, ctx);
  // A1: the l4 workspace purpose replaces the old "Executar <nome>." placeholder.
  assert.equal(prepared.baseDefinition.purpose, 'Navegar');
  assert.doesNotMatch(String(prepared.baseDefinition.purpose), /^Executar /);
});

// ---- bug_typescript (102045): feedback i18n keys must exist in the catalog ----
// buildActions declara action.<cmd>.success/error para todo command, mas nada as escrevia no catálogo:
// o .ts que indexou uma delas quebrou com TS7053 e sobreviveu porque o arquivo não estava stale.
test('mutation feedback keys are backfilled for every command, never for a query', async () => {
  const mod = await loadModule() as unknown as { addMutationFeedbackI18n: (c: any[], i: Record<string, string>) => string[] };
  const commands = [
    { commandName: 'createProjectCmd', kind: 'command', purpose: 'Create project' },
    { commandName: 'updateProjectStatusCmd', kind: 'command' },
    { commandName: 'listProjects', kind: 'query', purpose: 'Browse' },
  ];
  const i18n: Record<string, string> = {};
  const added = mod.addMutationFeedbackI18n(commands, i18n);
  assert.deepEqual(added.sort(), [
    'action.createProjectCmd.error', 'action.createProjectCmd.success',
    'action.updateProjectStatusCmd.error', 'action.updateProjectStatusCmd.success',
  ]);
  assert.equal(i18n['action.createProjectCmd.success'], 'Create project: OK');
  assert.equal(i18n['action.updateProjectStatusCmd.error'], 'Update Project Status Cmd: falhou', 'humanizes the id when the command has no purpose');
  assert.ok(!('action.listProjects.success' in i18n), 'a query has no mutation feedback');
  // Idempotent and never overwrites text already in the catalog.
  i18n['action.createProjectCmd.success'] = 'Projeto criado';
  assert.deepEqual(mod.addMutationFeedbackI18n(commands, i18n), []);
  assert.equal(i18n['action.createProjectCmd.success'], 'Projeto criado');
});

// ── agentNewSolution dialect ────────────────────────────────────────────────
// The generator now types every artifact (`as const satisfies`), tracks frontend work by PAGE
// (workspace) and WIRE (contract) instead of by operation, keeps the audience in an access matrix,
// declares the default language in `localization`, and ships entity lifecycles under workflows/.

const NS4 = 'buildFlowFsm47';

function ns4Defs(exportName: string, artifact: string, body: unknown): string {
  return [
    `/// <mls fileReference="_${PROJECT}_/l4/x.defs.ts" enhancement="_blank"/>`,
    '',
    `import type { ${artifact} } from '/_102020_/l2/agentNewSolution/types.js';`,
    '',
    `export const ${exportName} = ${JSON.stringify(body, null, 2)} as const satisfies ${artifact};`,
    '',
    `export type ${exportName}Type = typeof ${exportName};`,
    '',
    `export default ${exportName};`,
    '',
  ].join('\n');
}

const NS4_WORKSPACE = {
  workspaceId: 'projectCatalogue', title: 'Projetos', actors: ['projectManager'], kind: 'record',
  entity: 'Project', purpose: 'Catálogo de projetos',
  bffCalls: [
    { bffId: 'qryListProject', kind: 'query', uses: [{ operationId: 'listProject' }], input: [], output: { kind: 'list', fields: [{ name: 'projectId', from: 'listProject.$items.projectId', type: 'string', required: true }] }, route: `${NS4}.projectCatalogue.qryListProject` },
    { bffId: 'cmdCreateProject', kind: 'command', uses: [{ operationId: 'createProject' }], input: [{ name: 'name', from: 'createProject.name', type: 'string', required: true }, { name: 'phase', from: 'createProject.phase', type: 'string', required: true }], output: { kind: 'object', fields: [{ name: 'projectId', from: 'createProject.projectId', type: 'string', required: true }] }, route: `${NS4}.projectCatalogue.cmdCreateProject` },
  ],
  sections: [{ sectionId: 'recordCatalogue', intent: 'Listar', organisms: [{ role: 'primarySurface', dataSource: 'qryListProject' }, { role: 'contextualAction', action: 'cmdCreateProject' }] }],
  operationIds: ['listProject', 'createProject'],
  presentation: { categoryRef: 'inventoryControl' },
};

function installNs4Stor(withLegacyModule = false): void {
  const operation = (operationId: string, kind: string, extra: Record<string, unknown>) => ns4Defs(
    `${operationId}Operation`, 'Ns4OperationArtifact',
    { operationId, commandName: operationId, kind, entity: 'Project', actors: ['projectManager'], reads: ['Project'], writes: [], rulesApplied: [], ...extra },
  );
  const files = [
    file(4, NS4, 'module', '.defs.ts', ns4Defs(`${NS4}Module`, 'Ns4ModuleArtifact', {
      module: { moduleName: NS4, visualStyle: {}, languages: ['pt-BR', 'en', 'es'] },
      localization: { productLanguages: ['pt-BR', 'en', 'es'], defaultLanguage: 'en' },
      designContext: { initialPrompt: 'construction' },
    })),
    file(4, `${NS4}/access`, 'access-matrix', '.defs.ts', ns4Defs(`${NS4}AccessMatrix`, 'Ns4AccessMatrixArtifact', {
      moduleName: NS4, profiles: [{ profileId: 'projectManager', title: 'Gerente de projeto', kind: 'internal', actorRefs: ['projectManager'] }],
    })),
    file(4, NS4, 'siteMap', '.defs.ts', defs(`${NS4}SiteMap`, JSON.stringify({
      moduleName: NS4, landings: [{ actorId: 'projectManager', workspaceId: 'projectCatalogue', reason: 'entra no catálogo' }],
      navigationEdges: [{ from: 'projectHub', to: 'projectCatalogue', operationId: '', description: 'Projetos', prominence: 'primary', order: 0 }],
    }))),
    file(4, `${NS4}/ontology`, 'Project', '.defs.ts', ns4Defs('ProjectEntity', 'Ns4OntologyEntityArtifact', {
      entityId: 'Project', title: 'Projeto', fields: [
        { fieldId: 'projectId', type: 'string', required: true },
        { fieldId: 'name', type: 'string', required: true },
        // The literal union states itself as a constraint now, not as `enum`.
        { fieldId: 'phase', type: 'string', required: true, constraints: [{ kind: 'enum', value: '["planned","active","closed"]' }],
          enumLabels: [{ code: 'planned', label: 'Planejado' }, { code: 'active', label: 'Ativo' }, { code: 'closed', label: 'Encerrado' }] },
      ],
    })),
    file(4, `${NS4}/ontology`, 'index', '.defs.ts', ns4Defs(`${NS4}OntologyIndex`, 'Ns4OntologyIndexArtifact', {
      moduleName: NS4, entities: [{ entityId: 'Project' }], relationships: [],
    })),
    file(4, `${NS4}/operations`, 'listProject', '.defs.ts', operation('listProject', 'list', {
      accessPattern: { kind: 'list' }, inputs: [],
      outputShape: { kind: 'list', fields: [{ name: 'projectId', type: 'string', required: true }] },
    })),
    file(4, `${NS4}/operations`, 'createProject', '.defs.ts', operation('createProject', 'create', {
      accessPattern: { kind: 'create' },
      inputs: [
        { inputId: 'name', fieldRef: 'Project.name', required: true, source: 'userInput' },
        { inputId: 'phase', fieldRef: 'Project.phase', required: true, source: 'userInput' },
      ],
      outputShape: { kind: 'object', fields: [{ name: 'projectId', type: 'string', required: true }] },
    })),
    file(4, `${NS4}/workspaces`, 'projectCatalogue', '.defs.ts', defs('projectCatalogueWorkspace', JSON.stringify(NS4_WORKSPACE))),
    // An entity lifecycle, which is metadata and not a unit of frontend work.
    file(4, `${NS4}/workflows`, 'projectLifecycle', '.defs.ts', ns4Defs('projectLifecycleWorkflow', 'Ns4WorkflowArtifactV2', {
      moduleName: NS4, workflowId: 'projectLifecycle', entityRef: 'Project', initialState: 'planned',
      states: ['planned', 'active', 'closed'], transitions: [{ transitionId: 'start', from: 'planned', to: 'active' }],
    })),
    // A journey business artifact, which is not the map of workspaces this agent reads.
    file(4, `${NS4}/journeys`, 'createProject', '.defs.ts', ns4Defs('createProjectJourney', 'Ns4JourneyArtifact', {
      journeyId: 'createProject', revision: 1, business: { actorRef: 'projectManager', title: 'Criar projeto', steps: [] },
      realization: { status: 'compiled', steps: [] },
    })),
    file(5, NS4, 'todoFrontend', '.defs.ts', ns4Defs(`${NS4}TodoFrontend`, 'Ns4L5TodoFrontendArtifact', {
      schemaVersion: '2026-08-13-ns4-todo-frontend-v1', layer: 'frontend', moduleName: NS4,
      owners: [
        { ownerType: 'workspace', ownerId: 'projectCatalogue', workspaceId: 'projectCatalogue', statusFrontend: 'toCreate' },
        { ownerType: 'contract', ownerId: `${NS4}.projectCatalogue.qryListProject`, workspaceId: 'projectCatalogue', statusFrontend: 'toCreate' },
        { ownerType: 'contract', ownerId: `${NS4}.projectCatalogue.cmdCreateProject`, workspaceId: 'projectCatalogue', statusFrontend: 'toCreate' },
      ],
    })),
  ];
  // A second module written by the OLD generator: its todo owns operations, and it must keep planning
  // by pending owner while the ns4 module plans by page.
  const legacy = [
    file(4, 'oldShop', 'module', '.defs.ts', defs('oldShopModule', JSON.stringify({ moduleName: 'oldShop', languages: ['pt-BR'] }))),
    file(4, 'oldShop/ontology', 'Item', '.defs.ts', defs('Item', JSON.stringify({ entityId: 'Item', fields: [{ fieldId: 'itemId', type: 'string', required: true }] }))),
    file(4, 'oldShop/operations', 'listItem', '.defs.ts', defs('listItemOperation', JSON.stringify({
      operationId: 'listItem', commandName: 'listItem', kind: 'query', entity: 'Item', actor: 'lojista', reads: ['Item'], writes: [], rulesApplied: [],
      accessPattern: { kind: 'list' }, inputs: [], outputShape: { kind: 'list', fields: [{ name: 'itemId', type: 'string', required: true }] },
    }))),
    file(4, 'oldShop/workspaces', 'itemList', '.defs.ts', defs('itemListWorkspace', JSON.stringify({
      workspaceId: 'itemList', title: 'Itens', actors: ['lojista'], kind: 'operation', entity: 'Item', purpose: 'Listar',
      bffCalls: [{ bffId: 'qryListItem', kind: 'query', uses: [{ operationId: 'listItem' }], input: [], output: { kind: 'list', fields: [{ name: 'itemId', from: 'listItem.$items.itemId' }] }, route: 'oldShop.itemList.qryListItem' }],
      sections: [{ sectionId: 'list', intent: 'Listar', organisms: [{ role: 'primarySurface', dataSource: 'qryListItem' }] }],
      operationIds: ['listItem'],
    }))),
    file(5, 'oldShop', 'todoFrontend', '.defs.ts', defs('oldShopTodoFrontend', JSON.stringify({
      moduleName: 'oldShop', layer: 'frontend', owners: [{ ownerType: 'operation', ownerId: 'listItem', status: 'toCreate' }],
    }))),
  ];
  const all = withLegacyModule ? [...files, ...legacy] : files;
  g.mls.actualProject = PROJECT;
  g.mls.stor = { ...(g.mls.stor || {}), files: Object.fromEntries(all.map((f, i) => [`n${i}`, f])) };
}

test('ns4: a typed artifact parses, and the page plan comes from the workspace owners', async () => {
  const { readCreateContext } = await loadModule();
  installNs4Stor();
  const ctx = await readCreateContext();

  // `as const satisfies` used to make every one of these files unreadable.
  assert.deepEqual(ctx.moduleNames, [NS4]);
  assert.ok(ctx.operations.get('listProject'), 'operations parsed');
  assert.equal(ctx.entities.get('Project')?.fields.length, 3);

  // One page per pending workspace, carrying the page owner and every wire it will write.
  assert.deepEqual(ctx.pages.map((page: any) => page.pageId), ['projectCatalogue']);
  assert.deepEqual(ctx.pages[0].ownerIds, [
    'workspace:projectCatalogue',
    `contract:${NS4}.projectCatalogue.qryListProject`,
    `contract:${NS4}.projectCatalogue.cmdCreateProject`,
  ]);
  // The operations of the page come along even though no operation has a status of its own here.
  assert.deepEqual(ctx.pages[0].operationIds, ['listProject', 'createProject']);
  assert.deepEqual(ctx.warnings.filter((warning: string) => /missing l4 owner|absent from l4/.test(warning)), []);
});

test('ns4: lifecycles, journey artifacts and indexes are never owners of frontend work', async () => {
  const { readCreateContext } = await loadModule();
  installNs4Stor();
  const ctx = await readCreateContext();
  // A lifecycle carries a workflowId; taking it as an owner made the run fail on a missing todo entry.
  assert.equal(ctx.workflows.size, 0);
  // The journey map is built from workspaces/ + siteMap, never from the ns4 journey artifacts.
  const journey = ctx.journeys.find((item: any) => item.moduleName === NS4);
  assert.deepEqual(journey.workspaces.map((ws: any) => ws.workspaceId), ['projectCatalogue']);
  assert.equal(journey.landings[0]?.workspaceId, 'projectCatalogue');
  assert.equal(journey.navigationEdges[0]?.prominence, 'primary');
});

test('ns4: the default language is the one the product was written in, and enums survive', async () => {
  const { readCreateContext } = await loadModule();
  installNs4Stor();
  const ctx = await readCreateContext();
  // 'en' is declared in localization; languages[0] ('pt-BR') is only the fallback.
  assert.equal(ctx.moduleI18n[NS4].defaultLocale, 'en');
  assert.equal(ctx.moduleI18n[NS4].runtimeLocales[0], 'en');
  // The literal union now arrives as a constraint; losing it lets a form emit an impossible value.
  assert.deepEqual(ctx.entities.get('Project')?.fields.find((field: any) => field.fieldId === 'phase')?.enum, ['planned', 'active', 'closed']);
  // The audience comes from the access matrix profiles.
  assert.deepEqual((ctx.actorsByModule[NS4] || []).map((actor: any) => actor.actorId), ['projectManager']);
});

test('CF prefers enumLabels for display and falls back to the code', async () => {
  const { readCreateContext, preparePageCreate, createLayoutPromptContext, buildPageTestCases } = await loadModule();
  installNs4Stor();
  if (typeof g.mls.stor.getKeyToFile !== 'function') {
    g.mls.stor.getKeyToFile = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
      `${info.project}/${info.level}/${info.folder}/${info.shortName}${info.extension}`;
  }
  const ctx = await readCreateContext();
  const phase = ctx.entities.get('Project')?.fields.find((field: any) => field.fieldId === 'phase');
  assert.deepEqual(phase?.enumLabels, [
    { code: 'planned', label: 'Planejado' },
    { code: 'active', label: 'Ativo' },
    { code: 'closed', label: 'Encerrado' },
  ]);

  const prepared = await preparePageCreate(ctx.pages[0], ctx);
  const create = prepared.commands.find((command: any) => String(command.commandName).toLowerCase().includes('create'));
  const phaseInput = (create?.input || []).find((field: any) => field.name === 'phase');
  assert.deepEqual(phaseInput?.enum, ['planned', 'active', 'closed']);
  assert.equal(phaseInput?.enumLabels.find((item: any) => item.code === 'active')?.label, 'Ativo');

  const variant = prepared.variantPlan[0];
  const prompt = createLayoutPromptContext(prepared, variant.genome, variant.templateId);
  const enumFields = prompt.shared.fieldCatalog.byAction.find((item: any) => item.actionId === create.commandName)?.enumFields || [];
  const phaseCatalog = enumFields.find((item: any) => item.name === 'phase');
  assert.equal(phaseCatalog.enumLabels.find((item: any) => item.code === 'active').label, 'Ativo');

  const cases = buildPageTestCases(prepared);
  const ok = cases.find((item: any) => String(item.id).includes('ok') && item.params?.phase);
  if (ok) assert.equal(ok.params.phase, 'active', 'page tests still send the code, never the label');
});

test('ns4 and the old dialect coexist: each module is reconciled and planned by its own rule', async () => {
  const { readCreateContext } = await loadModule();
  installNs4Stor(true);
  const ctx = await readCreateContext();
  // Neither module reports the other's owners as missing (the ns4 todo has no operation owner, the
  // old one has no workspace owner) — a project-wide answer would have failed the whole run.
  assert.deepEqual(ctx.warnings.filter((warning: string) => /missing l4 owner|absent from l4/.test(warning)), []);
  const pages = new Map<string, any>(ctx.pages.map((page: any) => [page.moduleName, page]));
  assert.deepEqual(pages.get(NS4)?.ownerIds[0], 'workspace:projectCatalogue');
  assert.deepEqual(pages.get('oldShop')?.ownerIds, ['operation:listItem']);
});
