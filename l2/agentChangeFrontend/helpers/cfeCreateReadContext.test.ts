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
async function loadModule(): Promise<{ readCreateContext: () => Promise<any>; preparePageCreate: (page: any, ctx?: any) => Promise<any>; deterministicLayoutFromBase: (prepared: any) => any; buildPageTestCases: (prepared: any) => any[]; validatePageLayout: (prepared: any, layout: any) => void; remapLayoutActionsToBff: (prepared: any, layout: any) => any; cfePageLayoutToolSchema: any; bffFieldTsType: (field: any, dir: 'input' | 'output', ops: any, entities: any) => string }> {
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
  `/// <mls fileReference="_${PROJECT}_/l4/petShop/contracts/catalog.catalogList.ts" enhancement="_blank"/>`,
  '',
  '// GENERATED MECHANICALLY from _' + PROJECT + '_/l4/petShop/workspaces/catalog.defs.ts — DO NOT EDIT.',
  'export interface CatalogListInput { searchTerm?: string; page?: number; }',
  'export interface CatalogListOutput { productId: string; name: string; }',
  "export const catalogListRoute = 'petShop.catalog.catalogList' as const;",
  '',
].join('\n');

const DETAIL_CONTRACT = [
  `/// <mls fileReference="_${PROJECT}_/l4/petShop/contracts/catalog.productDetail.ts" enhancement="_blank"/>`,
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
    file(4, 'petShop/contracts', 'home.featuredProducts', '.ts', [
      `/// <mls fileReference="_${PROJECT}_/l4/petShop/contracts/home.featuredProducts.ts" enhancement="_blank"/>`,
      'export interface FeaturedProductsInput { page?: number; }',
      'export interface FeaturedProductsOutput { productId: string; name: string; }',
      "export const featuredProductsRoute = 'petShop.home.featuredProducts' as const;",
      '',
    ].join('\n')),
    file(4, 'petShop/contracts', 'catalog.catalogList', '.ts', CATALOG_CONTRACT),
    file(4, 'petShop/contracts', 'catalog.productDetail', '.ts', DETAIL_CONTRACT),
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
  // F3: one generated l2 contract .ts per bffCall — Input/Output interfaces + route const, l2 header,
  // generated marker; NEVER references an l4 .ts.
  assert.deepEqual(prepared.contractCopies.map((c: { contractName: any; }) => c.contractName).sort(), ['catalog.catalogList', 'catalog.productDetail']);
  const listCopy = prepared.contractCopies.find((c: { contractName: string; }) => c.contractName === 'catalog.catalogList')!;
  assert.equal(listCopy.fileInfo.folder, 'petShop/web/contracts');
  assert.match(listCopy.source, /<mls fileReference="_102049_\/l2\/petShop\/web\/contracts\/catalog\.catalogList\.ts"/);
  assert.doesNotMatch(listCopy.source, /l4\/petShop\/contracts/); // never an l4 .ts reference
  assert.match(listCopy.source, /GENERATED from l4 bffCall — do not edit/);
  assert.match(listCopy.source, /export interface CatalogListInput \{/);
  assert.match(listCopy.source, /export interface CatalogListOutput \{/);
  assert.match(listCopy.source, /export const catalogListRoute = 'petShop\.catalog\.catalogList' as const;/);
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
  // Contracts are generated from the bffCall regardless of any l4 .ts.
  assert.equal(prepared.contractCopies.length, 2);
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
