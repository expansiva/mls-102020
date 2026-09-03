/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeFinalizeRunModule.test.ts" enhancement="_blank"/>
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * F1 of cb_owner_key_sem_modulo: currentCreateRunModule walked getCreateRuns().values() and took the
 * FIRST cache entry (oldest tab run). A CF on listaAssinatura then one on listaAssinatura2 finalized
 * nobody. The run module is an explicit argument; a poisoned cache must not win.
 */

const PROJECT = 102049;
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

async function loadModule(): Promise<{
  startCreateRun: (runId: string, context: any) => void;
  finalizeGeneratedPages: (runModule?: string) => Promise<any>;
  readCreateContext: () => Promise<any>;
}> {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'pt-BR' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
}

function defs(exportName: string, body: string): string {
  return `/// <mls fileReference="_${PROJECT}_/l4/x.defs.ts" enhancement="_blank"/>\nexport const ${exportName} = ${body} as const;\nexport default ${exportName};\n`;
}

function operationDefs(operationId: string, extra: Record<string, unknown> = {}): string {
  return defs(`operation${operationId}`, JSON.stringify({
    operationId, commandName: operationId, kind: 'query', entity: 'Product', actor: 'cliente',
    reads: ['Product'], writes: [], rulesApplied: [], statusFrontend: 'toCreate',
    accessPattern: { kind: 'list', pagination: 'required' },
    inputs: [{ inputId: 'searchTerm', fieldRef: 'Product.name', required: false, source: 'userInput' }],
    outputShape: { kind: 'paginated', fields: [{ name: 'products', type: 'array', required: true, item: { fields: [{ name: 'productId', type: 'string', required: true }] } }] },
    ...extra,
  }, null, 2));
}

function file(level: number, folder: string, shortName: string, extension: string, content: string) {
  return { project: PROJECT, level, folder, shortName, extension, status: 'active', getContent: async () => content };
}

function keyOf(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}/${info.level}/${info.folder}/${info.shortName}${info.extension}`;
}

function generatedPageFiles(moduleName: string, pageId: string) {
  const marker = JSON.stringify({ status: 'done' });
  return [
    file(2, `${moduleName}/web/shared`, pageId, '.defs.ts', '{}'),
    file(2, `${moduleName}/web/desktop/page11`, pageId, '.defs.ts', '{}'),
    file(2, `${moduleName}/web/contracts`, pageId, '.ts', 'export {}'),
    file(4, `${moduleName}/pipeline/trace/l2/frontend-create-pages`, pageId, '.json', marker),
    file(4, `${moduleName}/pipeline/trace/l2/frontend-register-pages`, pageId, '.json', marker),
  ];
}

function installTwoModuleStor(): void {
  const files: Record<string, any> = {};
  const put = (f: ReturnType<typeof file>): void => { files[keyOf(f)] = f; };
  const l4 = [
    file(4, 'petShop', 'module', '.defs.ts', defs('petShopModule', JSON.stringify({ moduleName: 'petShop', visualStyle: {}, languages: ['pt-BR'] }))),
    file(4, 'petShop', 'actors', '.defs.ts', defs('petShopActors', JSON.stringify({ moduleName: 'petShop', actors: [{ actorId: 'cliente', title: 'Cliente', roleScope: 'petShop:cliente' }] }))),
    file(4, 'petShop', 'navigation', '.defs.ts', defs('petShopNavigation', JSON.stringify({ moduleName: 'petShop', landings: [{ actorId: 'cliente', workspaceId: 'catalog', reason: 'entra' }], navigationEdges: [{ from: 'catalog', to: 'catalog' }] }))),
    file(4, 'petShop/ontology', 'Product', '.defs.ts', defs('Product', JSON.stringify({ entityId: 'Product', fields: [{ fieldId: 'productId', type: 'string', required: true }, { fieldId: 'name', type: 'string', required: true }] }))),
    file(4, 'petShop/operations', 'browseCatalog', '.defs.ts', operationDefs('browseCatalog')),
    file(4, 'petShop/workspaces', 'catalog', '.defs.ts', defs('catalogWorkspace', JSON.stringify({
      workspaceId: 'catalog', title: 'Catálogo', actors: ['cliente'], kind: 'operation', entity: 'Product', purpose: 'Navegar',
      bffCalls: [{ bffId: 'catalogList', kind: 'query', uses: [{ operationId: 'browseCatalog' }], input: [], output: { kind: 'paginated', fields: [{ name: 'productId', from: 'browseCatalog.$items.productId' }] }, route: 'petShop.catalog.catalogList' }],
      sections: [{ sectionId: 'catalog', intent: 'Buscar', organisms: [{ role: 'primarySurface', dataSource: 'catalogList' }] }],
      operationIds: ['browseCatalog'],
    }))),
    file(5, 'petShop', 'todoFrontend', '.defs.ts', defs('petShopTodoFrontend', JSON.stringify({
      moduleName: 'petShop', layer: 'frontend', owners: [{ ownerType: 'operation', ownerId: 'browseCatalog', status: 'toCreate' }],
    }))),
    file(4, 'petShop2', 'module', '.defs.ts', defs('petShop2Module', JSON.stringify({ moduleName: 'petShop2', visualStyle: {}, languages: ['en'] }))),
    file(4, 'petShop2', 'actors', '.defs.ts', defs('petShop2Actors', JSON.stringify({ moduleName: 'petShop2', actors: [{ actorId: 'cliente', title: 'Cliente', roleScope: 'petShop2:cliente' }] }))),
    file(4, 'petShop2', 'navigation', '.defs.ts', defs('petShop2Navigation', JSON.stringify({ moduleName: 'petShop2', landings: [{ actorId: 'cliente', workspaceId: 'signatures', reason: 'entra' }], navigationEdges: [{ from: 'signatures', to: 'signatures' }] }))),
    file(4, 'petShop2/operations', 'listSignatures', '.defs.ts', operationDefs('listSignatures')),
    file(4, 'petShop2/workspaces', 'signatures', '.defs.ts', defs('signaturesWorkspace', JSON.stringify({
      workspaceId: 'signatures', title: 'Signatures', actors: ['cliente'], kind: 'operation', entity: 'Product', purpose: 'List',
      bffCalls: [{ bffId: 'signatureList', kind: 'query', uses: [{ operationId: 'listSignatures' }], input: [], output: { kind: 'paginated', fields: [{ name: 'productId', from: 'listSignatures.$items.productId' }] }, route: 'petShop2.signatures.signatureList' }],
      sections: [{ sectionId: 'signatures', intent: 'List', organisms: [{ role: 'primarySurface', dataSource: 'signatureList' }] }],
      operationIds: ['listSignatures'],
    }))),
    file(5, 'petShop2', 'todoFrontend', '.defs.ts', defs('petShop2TodoFrontend', JSON.stringify({
      moduleName: 'petShop2', layer: 'frontend', owners: [{ ownerType: 'operation', ownerId: 'listSignatures', status: 'toCreate' }],
    }))),
    file(5, '', 'project', '.json', JSON.stringify({ projectId: PROJECT, modules: [{ moduleName: 'petShop' }, { moduleName: 'petShop2' }] })),
    file(5, '', 'config', '.json', '{}'),
    ...generatedPageFiles('petShop', 'catalog'),
    ...generatedPageFiles('petShop2', 'signatures'),
  ];
  for (const f of l4) put(f);
  g.mls.actualProject = PROJECT;
  g.mls.stor = {
    files,
    getKeyToFile: keyOf,
    localStor: {
      setContent: async (storFile: { content?: string }, payload: { content: string }) => { storFile.content = payload.content; },
    },
    addOrUpdateFile: async (params: Record<string, unknown>) => {
      const info = { project: params.project as number, level: params.level as number, folder: String(params.folder || ''), shortName: String(params.shortName), extension: String(params.extension) };
      const existing = files[keyOf(info)];
      if (existing) return existing;
      const created = { ...info, status: 'new', content: '', getContent: async () => created.content };
      files[keyOf(info)] = created;
      return created;
    },
  };
}

function poisonCreateRunCache(startCreateRun: (runId: string, context: any) => void): void {
  g.window.__agentChangeFrontendCreateRuns = new Map();
  startCreateRun('run-old', { pages: [{ moduleName: 'petShop', pageId: 'catalog' }] });
  startCreateRun('run-current', { pages: [{ moduleName: 'petShop2', pageId: 'signatures' }] });
}

void test('F1: two create-run cache entries — finalize of the current module keeps its pages, not the oldest run', async () => {
  const { startCreateRun, finalizeGeneratedPages, readCreateContext } = await loadModule();
  installTwoModuleStor();
  poisonCreateRunCache(startCreateRun);
  const ctx = await readCreateContext();
  assert.equal(ctx.pages.some((p: { pageId: string; moduleName: string }) => p.pageId === 'catalog' && p.moduleName === 'petShop'), true);
  assert.equal(ctx.pages.some((p: { pageId: string; moduleName: string }) => p.pageId === 'signatures' && p.moduleName === 'petShop2'), true);
  const result = await finalizeGeneratedPages('petShop2');
  assert.equal(result.moduleName, 'petShop2');
  assert.deepEqual(result.pagesDone, ['signatures']);
  assert.equal(result.pagesDone.includes('catalog'), false);
});

void test('F1: missing run module does not silent-filter pages and records a warning', async () => {
  const { startCreateRun, finalizeGeneratedPages } = await loadModule();
  installTwoModuleStor();
  poisonCreateRunCache(startCreateRun);
  g.window.__agentChangeFrontendCreateDiagnostics = [];
  const result = await finalizeGeneratedPages('');
  assert.equal(result.pagesDone.includes('signatures'), true);
  assert.equal(result.pagesDone.includes('catalog'), true);
  const diagnostics = g.window.__agentChangeFrontendCreateDiagnostics as string[];
  assert.equal(diagnostics.some(msg => msg.includes('no run module')), true);
});
