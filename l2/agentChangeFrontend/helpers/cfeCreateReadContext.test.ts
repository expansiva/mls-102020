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
async function loadModule(): Promise<{ readCreateContext: () => Promise<any>; preparePageCreate: (page: any, ctx?: any) => Promise<any>; deterministicLayoutFromBase: (prepared: any) => any; buildPageTestCases: (prepared: any) => any[] }> {
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

function installPetShopStor(): void {
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
  ];
  // Preserve g.mls.events (installed by loadModule for libModel init); only swap project + files.
  g.mls.actualProject = PROJECT;
  g.mls.stor = { ...(g.mls.stor || {}), files: Object.fromEntries(files.map((f, i) => [`f${i}`, f])) };
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
  // Raw l4 contracts collected for F3 byte-copy.
  assert.ok(ctx.contractsRaw.get('petShop/catalog.catalogList'));
  assert.ok(ctx.contractsRaw.get('petShop/catalog.productDetail'));
  // One page per workspace, keyed by workspaceId.
  const page = ctx.pages.find((p: { pageId: string; }) => p.pageId === 'catalog');
  assert.ok(page, 'catalog page built from the workspace');
});

test('preparePageCreate builds one command per bffCall and byte-copies the l4 contracts (F3)', async () => {
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
  // F3: two per-bffCall contract copies, byte-identical bodies with an l2 header + copy marker.
  assert.deepEqual(prepared.contractCopies.map((c: { contractName: any; }) => c.contractName).sort(), ['catalog.catalogList', 'catalog.productDetail']);
  const listCopy = prepared.contractCopies.find((c: { contractName: string; }) => c.contractName === 'catalog.catalogList')!;
  assert.equal(listCopy.fileInfo.folder, 'petShop/web/contracts');
  assert.match(listCopy.source, /<mls fileReference="_102049_\/l2\/petShop\/web\/contracts\/catalog\.catalogList\.ts"/);
  assert.match(listCopy.source, /copied from l4 — do not edit/);
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
