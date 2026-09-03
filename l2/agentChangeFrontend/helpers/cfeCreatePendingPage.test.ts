/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCreatePendingPage.test.ts" enhancement="_blank"/>
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

/**
 * A workspace id is unique per MODULE, not per project. Indexing pending pages by id alone
 * enqueued the homonym of a done module and killed the run (duplicate parallel args).
 */

const PROJECT = 102049;
const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

async function loadModule(): Promise<{
  readCreateContext: () => Promise<any>;
  startCreateRun: (runId: string, context: any) => void;
  listCreateRunPageArgs: (runId: string) => { moduleName: string; pageId: string; runId: string }[];
  prepareCreateRunPage: (runId: string, pageId: string, moduleName: string) => Promise<any>;
  parseCreatePageArgs: (prompt: string | undefined) => { moduleName: string; pageId: string; runId: string };
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

function file(level: number, folder: string, shortName: string, extension: string, content: string) {
  return { project: PROJECT, level, folder, shortName, extension, status: 'active', getContent: async () => content };
}

function workspaceFiles(
  moduleName: string,
  workspaces: Array<{ workspaceId: string; status: 'toCreate' | 'done'; operationId: string }>,
) {
  const files = [
    file(4, moduleName, 'module', '.defs.ts', defs(`${moduleName}Module`, JSON.stringify({ moduleName, languages: ['en'] }))),
    file(4, `${moduleName}/ontology`, 'Item', '.defs.ts', defs(`${moduleName}Item`, JSON.stringify({
      entityId: `${moduleName}Item`,
      fields: [{ fieldId: 'itemId', type: 'string', required: true }],
    }))),
  ];
  const owners: Record<string, unknown>[] = [];
  for (const ws of workspaces) {
    const route = `${moduleName}.${ws.workspaceId}.qryList`;
    files.push(file(4, `${moduleName}/operations`, ws.operationId, '.defs.ts', defs(`${ws.operationId}Operation`, JSON.stringify({
      operationId: ws.operationId, commandName: ws.operationId, kind: 'query', entity: `${moduleName}Item`, actor: 'actor',
      reads: [`${moduleName}Item`], writes: [], rulesApplied: [],
      accessPattern: { kind: 'list' }, inputs: [],
      outputShape: { kind: 'list', fields: [{ name: 'itemId', type: 'string', required: true }] },
    }))));
    files.push(file(4, `${moduleName}/workspaces`, ws.workspaceId, '.defs.ts', defs(`${ws.workspaceId}Workspace`, JSON.stringify({
      workspaceId: ws.workspaceId, title: ws.workspaceId, actors: ['actor'], kind: 'operation', entity: `${moduleName}Item`, purpose: 'List',
      bffCalls: [{ bffId: 'qryList', kind: 'query', uses: [{ operationId: ws.operationId }], input: [], output: { kind: 'list', fields: [{ name: 'itemId', from: `${ws.operationId}.$items.itemId` }] }, route }],
      sections: [{ sectionId: 'list', intent: 'List', organisms: [{ role: 'primarySurface', dataSource: 'qryList' }] }],
      operationIds: [ws.operationId],
    }))));
    owners.push({ ownerType: 'workspace', ownerId: ws.workspaceId, status: ws.status });
    owners.push({ ownerType: 'contract', ownerId: route, status: ws.status });
  }
  files.push(file(5, moduleName, 'todoFrontend', '.defs.ts', defs(`${moduleName}TodoFrontend`, JSON.stringify({
    moduleName, layer: 'frontend', owners,
  }))));
  return files;
}

function installHomonymStor(): void {
  const files = [
    ...workspaceFiles('moduleA', [
      { workspaceId: 'sharedPage', status: 'done', operationId: 'listA' },
      { workspaceId: 'ownLanding', status: 'toCreate', operationId: 'landA' },
    ]),
    ...workspaceFiles('moduleB', [
      { workspaceId: 'sharedPage', status: 'toCreate', operationId: 'listB' },
    ]),
  ];
  g.mls.actualProject = PROJECT;
  g.mls.stor = { ...(g.mls.stor || {}), files: Object.fromEntries(files.map((f, i) => [`h${i}`, f])) };
}

function emptyContext(pages: Array<{ pageId: string; pageName: string; moduleName: string }>): any {
  return {
    project: PROJECT,
    moduleNames: [...new Set(pages.map(page => page.moduleName))],
    moduleVisualStyle: {},
    moduleI18n: {},
    entities: new Map(),
    operations: new Map(),
    workflows: new Map(),
    journeys: [],
    actorsByModule: {},
    pages: pages.map(page => ({
      pageId: page.pageId,
      pageName: page.pageName,
      moduleName: page.moduleName,
      sourceKind: 'operation',
      ownerIds: [],
      actorIds: [],
      entityIds: [],
      operationIds: [],
      rulesApplied: [],
      capabilities: [],
      origin: {},
    })),
    warnings: [],
  };
}

test('workspace X pending in module B does not make the X of module A pending', async () => {
  const { readCreateContext } = await loadModule();
  installHomonymStor();
  const ctx = await readCreateContext();
  const keys = ctx.pages.map((page: { moduleName: string; pageId: string }) => `${page.moduleName}:${page.pageId}`).sort();
  assert.deepEqual(keys, ['moduleA:ownLanding', 'moduleB:sharedPage']);
  assert.equal(ctx.pages.some((page: { moduleName: string; pageId: string }) => page.moduleName === 'moduleA' && page.pageId === 'sharedPage'), false);
});

test('two modules with the same pending page name produce two distinct queue args; none dropped', async () => {
  const { startCreateRun, listCreateRunPageArgs } = await loadModule();
  const runId = 'cfe-pending-page-homonym-args';
  startCreateRun(runId, emptyContext([
    { pageId: 'sharedPage', pageName: 'From A', moduleName: 'moduleA' },
    { pageId: 'sharedPage', pageName: 'From B', moduleName: 'moduleB' },
  ]));
  const args = listCreateRunPageArgs(runId);
  assert.equal(args.length, 2, 'homonymous pending pages are two legitimate items');
  assert.deepEqual(args.map(item => item.moduleName).sort(), ['moduleA', 'moduleB']);
  assert.ok(args.every(item => item.pageId === 'sharedPage' && item.runId === runId));
  const serialized = args.map(item => JSON.stringify(item));
  assert.equal(new Set(serialized).size, serialized.length, 'queue args must be unique including moduleName');
  assert.ok(args.every(item => item.moduleName), 'every arg carries the module');
});

test('prepareCreateRunPage returns the page of the requested module when a homonym exists', async () => {
  const { startCreateRun, prepareCreateRunPage } = await loadModule();
  const runId = 'cfe-pending-page-homonym-prepare';
  startCreateRun(runId, emptyContext([
    { pageId: 'sharedPage', pageName: 'From A', moduleName: 'moduleA' },
    { pageId: 'sharedPage', pageName: 'From B', moduleName: 'moduleB' },
  ]));
  const fromA = await prepareCreateRunPage(runId, 'sharedPage', 'moduleA');
  const fromB = await prepareCreateRunPage(runId, 'sharedPage', 'moduleB');
  assert.equal(fromA.page.moduleName, 'moduleA');
  assert.equal(fromA.page.pageName, 'From A');
  assert.equal(fromB.page.moduleName, 'moduleB');
  assert.equal(fromB.page.pageName, 'From B');
});
