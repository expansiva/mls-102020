/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.splitPlan.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';

import { cfePipelineTraceFileInfo } from '/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

const PROJECT = 1;
const MODULE = 'mod';
const PAGE_ID = 'landing';
const GENOME = 'page11';

const STORED_ORGANISMS = [
  { n: 1, organism: 'hero', bindings: [] as string[] },
  { n: 2, organism: 'richText', bindings: [] as string[] },
  { n: 3, organism: 'richText2', bindings: [] as string[] },
  { n: 4, organism: 'richText3', bindings: [] as string[] },
  { n: 5, organism: 'richText4', bindings: [] as string[] },
  { n: 6, organism: 'richText5', bindings: [] as string[] },
  { n: 7, organism: 'primarySurface', bindings: [] as string[] },
  { n: 8, organism: 'primarySurface2', bindings: [] as string[] },
  { n: 9, organism: 'primarySurface3', bindings: [] as string[] },
  { n: 10, organism: 'primarySurface4', bindings: [] as string[] },
  { n: 11, organism: 'primarySurface5', bindings: [] as string[] },
  { n: 12, organism: 'imageSet', bindings: [] as string[] },
  { n: 13, organism: 'detailPanel', bindings: [] as string[] },
  { n: 14, organism: 'filterControl', bindings: [] as string[] },
  { n: 15, organism: 'other', bindings: [] as string[] },
];

async function loadShared(): Promise<typeof import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js')> {
  if (!g.window) g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  if (!g.document) g.document = { documentElement: { lang: 'en' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  if (typeof g.mls.stor.getKeyToFile !== 'function') {
    g.mls.stor.getKeyToFile = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
      `${info.project}/${info.level}/${info.folder}/${info.shortName}${info.extension}`;
  }
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
}

function page() {
  return {
    pageId: PAGE_ID,
    pageName: 'Landing',
    moduleName: MODULE,
    sourceKind: 'operation' as const,
    ownerIds: [],
    actorIds: [],
    entityIds: [],
    operationIds: [],
    rulesApplied: [],
    capabilities: [],
    origin: {},
  };
}

function prepared() {
  return {
    project: PROJECT,
    page: page(),
    operations: [],
    commands: [],
    contractCopies: [],
    navigationRefs: [],
    baseDefinition: {},
    visualStyle: {},
    presentation: { categoryRef: 'contentLanding' },
    i18nMeta: { defaultLocale: 'en', activeLocales: ['en'] },
    entityFields: {},
    fieldTitles: {},
    mdmEntityIds: [],
    externalEntityIds: [],
    variantPlan: [],
    userJourney: {},
  };
}

function layout() {
  return { pageId: PAGE_ID, layoutId: 'landing', sections: [], i18n: {}, dataBindings: [] };
}

function installStoredPlan(): void {
  const info = cfePipelineTraceFileInfo(MODULE, PAGE_ID, `frontend-page-split/${GENOME}`, PROJECT);
  const key = g.mls.stor.getKeyToFile(info);
  const content = `${JSON.stringify({ organisms: STORED_ORGANISMS }, null, 2)}\n`;
  g.mls.stor.files[key] = { ...info, status: 'active', content };
}

test('recipe without split ignores a stored residual plan', async () => {
  const { ensureRecipeSplitPlan } = await loadShared();
  installStoredPlan();
  const got = await ensureRecipeSplitPlan(prepared(), GENOME, layout());
  assert.deepEqual(got, []);
});

test('recipe with split still returns the stored plan', async () => {
  const { ensureRecipeSplitPlan } = await loadShared();
  installStoredPlan();
  const got = await ensureRecipeSplitPlan(prepared(), GENOME, layout(), { splitByOrganism: true });
  assert.deepEqual(got, STORED_ORGANISMS);
});

test('empty split plan materializes one l2_page and no _O items even with a stored plan', async () => {
  const { pagePipeline } = await loadShared();
  installStoredPlan();
  const items = pagePipeline(PROJECT, page(), {}, GENOME, undefined, []) as Array<{ type?: string; outputPath?: string; id?: string }>;
  assert.equal(items.filter(item => item.type === 'l2_page').length, 1);
  assert.equal(items.filter(item => item.type === 'l2_page_organism').length, 0);
  assert.ok(items.every(item => !String(item.outputPath || '').includes('_O') && !String(item.id || '').includes('__O')));
  assert.equal(items[0].outputPath, `_${PROJECT}_/l2/${MODULE}/web/desktop/${GENOME}/${PAGE_ID}.ts`);
  assert.equal(items[0].outputPath?.replace(/\.ts$/, '.defs.ts'), `_${PROJECT}_/l2/${MODULE}/web/desktop/${GENOME}/${PAGE_ID}.defs.ts`);
});
