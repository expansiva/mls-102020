/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/templateContext.test.ts" enhancement="_102020_/l2/enhancementAura"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { d2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.js';
import { selectD2Template, type D2TemplateDiscovery, type D2TemplatePort, type D2TemplateSelectionRequest } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../../..');
const MASTER = path.join(ROOT, 'mls-102020/l4/collabux/templates');
const SALESFORCE = path.join(ROOT, 'mls-102040/l4/templates/salesforceStyle');
const catalogPath = path.join(MASTER, 'categoryList.json');
const categoryCatalogRef = '_102020_/l4/collabux/templates/categoryList.json';
function templateFixture(): { port: D2TemplatePort; contents: Map<string, string> } {
  const contents = new Map<string, string>();
  contents.set(categoryCatalogRef, readFileSync(catalogPath, 'utf8'));
  const candidates = [
    ['entityRecordManagement', 'page21'], ['entityRecordManagement', 'page31'],
    ['dashboardCommandCenter', 'page21'], ['dashboardCommandCenter', 'page31'],
    ['processWizard', 'page21'], ['processWizard', 'page31'],
    ['contentLanding', 'page11'],
  ] as const;
  const files: D2TemplateDiscovery['files'] = [];
  for (const [categoryRef, page] of candidates) {
    const ref = `_102020_/l4/collabux/templates/${categoryRef}/${page}.md`;
    contents.set(ref, readFileSync(path.join(MASTER, categoryRef, `${page}.md`), 'utf8'));
    files.push({ reference: ref, role: 'category', categoryRef });
  }
  const globalRef = '_102040_/l4/templates/salesforceStyle/template.md';
  const entityStyleRef = '_102040_/l4/templates/salesforceStyle/entityRecordManagement/template.md';
  const layoutRef = '_102040_/l4/templates/salesforceStyle/entityRecordManagement/layouts/focusedRecordForm/template.md';
  contents.set(globalRef, readFileSync(path.join(SALESFORCE, 'template.md'), 'utf8'));
  contents.set(entityStyleRef, readFileSync(path.join(SALESFORCE, 'entityRecordManagement/template.md'), 'utf8'));
  contents.set(layoutRef, readFileSync(path.join(SALESFORCE, 'entityRecordManagement/layouts/focusedRecordForm/template.md'), 'utf8'));
  files.push({ reference: globalRef, role: 'style-global', styleId: 'salesforceStyle' });
  files.push({ reference: entityStyleRef, role: 'style-category', styleId: 'salesforceStyle', categoryRef: 'entityRecordManagement' });
  files.push({ reference: layoutRef, role: 'layout', styleId: 'salesforceStyle', categoryRef: 'entityRecordManagement', layoutId: 'focusedRecordForm' });
  const port: D2TemplatePort = {
    discover: async () => ({ categoryCatalog: categoryCatalogRef, files }),
    readText: async reference => contents.get(reference) ?? null,
  };
  return { port, contents };
}

function request(patch: Partial<D2TemplateSelectionRequest> = {}): D2TemplateSelectionRequest {
  return {
    categoryRef: 'entityRecordManagement',
    orientationPage: 'page21',
    targetPage: 'page21',
    preference: null,
    capabilities: { dataDeclared: false, measureDeclared: false, sectionSaveCommandDeclared: false },
    ...patch,
  };
}

test('provider discovery resolves category and style Markdown from direct dependencies only', async () => {
  const host = globalThis as unknown as { mls?: unknown };
  const previous = host.mls;
  const files: Record<string, { status: string; versionRef: string; getContent: () => Promise<string> }> = {};
  const key = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const seed = (project: number, level: number, folder: string, shortName: string, extension: string, source: string, status = 'changed') => {
    files[key({ project, level, folder, shortName, extension })] = { status, versionRef: '1', getContent: async () => source };
  };
  seed(102020, 4, 'collabux/templates', 'categoryList', '.json', readFileSync(catalogPath, 'utf8'));
  seed(102020, 4, 'collabux/templates/entityRecordManagement', 'page21', '.md', readFileSync(path.join(MASTER, 'entityRecordManagement/page21.md'), 'utf8'));
  seed(102040, 4, 'templates/salesforceStyle', 'template', '.md', readFileSync(path.join(SALESFORCE, 'template.md'), 'utf8'));
  seed(102040, 4, 'templates/salesforceStyle/entityRecordManagement', 'template', '.md', readFileSync(path.join(SALESFORCE, 'entityRecordManagement/template.md'), 'utf8'));
  seed(102040, 4, 'templates/salesforceStyle/entityRecordManagement/layouts/focusedRecordForm', 'template', '.md', readFileSync(path.join(SALESFORCE, 'entityRecordManagement/layouts/focusedRecordForm/template.md'), 'utf8'));
  seed(102041, 4, 'templates/salesforceStyle/entityRecordManagement', 'template', '.md', 'transitive provider');
  seed(102040, 4, 'templates/salesforceStyle/customerManagement', 'template', '.md', 'deleted stale provider', 'deleted');
  host.mls = {
    actualProject: 999,
    stor: { files, getKeyToFile: key, loadProjectdependenciesInfoIfNeed: async () => undefined },
    l5: { getProjectDetails: () => ({ prj_dependencies: [102020, 102040] }), getProjectDependencies: () => [102020, 102040, 102041] },
  };
  try {
    const discovered = await d2TemplatePort.discover();
    assert.equal(discovered.categoryCatalog, categoryCatalogRef);
    assert.ok(discovered.files.some(file => file.reference.endsWith('/entityRecordManagement/page21.md')));
    assert.ok(discovered.files.some(file => file.reference.endsWith('/salesforceStyle/template.md')));
    assert.ok(discovered.files.some(file => file.role === 'layout' && file.layoutId === 'focusedRecordForm'));
    assert.equal(discovered.files.some(file => file.reference.startsWith('_102041_/')), false);
    assert.equal(discovered.files.some(file => file.reference.endsWith('/customerManagement/template.md')), false);
  } finally {
    if (previous === undefined) delete host.mls;
    else host.mls = previous;
  }
});

test('d2_26 positive control: entity list/create resolves one published category experience', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request());
  assert.equal(selected.experienceId, 'focusedRecordForm');
  const experience = selected.sources.find(source => source.role === 'category');
  assert.equal(selected.sources.length, 2);
  assert.ok(experience);
  assert.match(experience.reference, /entityRecordManagement\/page21\.md$/);
  assert.ok(experience.sha256);
  assert.equal(selected.context.includes('page31.md'), false);
});

test('dashboard experience is usable only when declared data and measure capabilities exist', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request({
    categoryRef: 'dashboardCommandCenter',
    capabilities: { dataDeclared: true, measureDeclared: true, sectionSaveCommandDeclared: false },
    requirements: { dataDeclared: true, measureDeclared: true },
  }));
  assert.equal(selected.experienceId, 'exceptionTriage');
  assert.deepEqual(selected.requirementsMet, ['declared query count meets 1', 'page data declared', 'page measure declared']);
});

test('dashboard without declared data falls back to compatible category guidance', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request({
    categoryRef: 'dashboardCommandCenter',
    capabilities: { dataDeclared: false, measureDeclared: false, sectionSaveCommandDeclared: false },
    requirements: { dataDeclared: true, measureDeclared: true },
  }));
  assert.equal(selected.experienceId, null);
  assert.equal(selected.sources[0].role, 'category-catalog-entry');
  assert.equal(selected.sources.some(source => source.reference.endsWith('/page21.md')), false);
});

test('explicit Salesforce preference uses its concrete compatible templates and published molecule rule', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request({ preference: 'salesforceStyle' }));
  assert.equal(selected.styleId, 'salesforceStyle');
  assert.equal(selected.sources.filter(source => source.role === 'category').length, 1);
  assert.ok(selected.sources.some(source => source.role === 'style-global' && source.content.includes('available molecule catalog')));
  assert.ok(selected.sources.some(source => source.role === 'style-category'));
});

test('explicit layout preference selects one concrete style layout without sibling variants', async () => {
  const { port, contents } = templateFixture();
  const selected = await selectD2Template(port, request({ preference: 'salesforceStyle', layoutPreference: 'focusedRecordForm' }));
  assert.equal(selected.styleId, 'salesforceStyle');
  assert.equal(selected.layoutId, 'focusedRecordForm');
  const layouts = selected.sources.filter(source => source.role === 'layout');
  assert.equal(layouts.length, 1);
  assert.match(layouts[0].reference, /layouts\/focusedRecordForm\/template\.md$/);
  assert.equal(selected.context.includes('layouts/splitView/template.md'), false);
  contents.set('_102040_/l4/templates/salesforceStyle/entityRecordManagement/layouts/focusedRecordForm/template.md', '');
  const missing = await selectD2Template(port, request({ preference: 'salesforceStyle', layoutPreference: 'focusedRecordForm' }));
  assert.equal(missing.styleId, null);
  assert.equal(missing.layoutId, null);
  assert.equal(missing.sources.some(source => source.role === 'layout'), false);
});

test('incompatible explicit Salesforce preference falls back to generic category template', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request({
    categoryRef: 'processWizard',
    preference: 'salesforceStyle',
  }));
  assert.equal(selected.styleId, null);
  assert.equal(selected.sources.length, 2);
  assert.equal(selected.sources.filter(source => source.role === 'category').length, 1);
  assert.ok(selected.sources.some(source => source.reference.endsWith('/processWizard/page21.md')));
  assert.match(selected.reason, /no compatible concrete template/u);
});

test('page11 accepts one selected mobile orientation and does not append the competing page21 experience', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request({
    orientationPage: 'page31',
    targetPage: 'page11',
    capabilities: { dataDeclared: false, measureDeclared: false, sectionSaveCommandDeclared: true },
  }));
  assert.equal(selected.targetPage, 'page11');
  assert.equal(selected.experienceId, 'recordPageTabs');
  assert.equal(selected.sources.filter(source => source.role === 'category').length, 1);
  assert.ok(selected.sources.some(source => /entityRecordManagement\/page31\.md$/.test(source.reference)));
  assert.equal(selected.context.includes('entityRecordManagement/page21.md'), false);
  const incompatible = await selectD2Template(port, request({
    orientationPage: 'page31',
    targetPage: 'page11',
    capabilities: { dataDeclared: false, measureDeclared: false, sectionSaveCommandDeclared: false },
  }));
  assert.equal(incompatible.experienceId, null);
  assert.equal(incompatible.sources.some(source => /entityRecordManagement\/page31\.md$/.test(source.reference)), false);
});

test('a published page11 experience is selected as page11 without its page21 or page31 variants', async () => {
  const { port } = templateFixture();
  const selected = await selectD2Template(port, request({ categoryRef: 'contentLanding', targetPage: 'page11' }));
  assert.equal(selected.experiencePage, 'page11');
  assert.equal(selected.experienceId, 'contentFirstConvert');
  assert.ok(selected.sources.some(source => /contentLanding\/page11\.md$/.test(source.reference)));
  assert.equal(selected.context.includes('contentLanding/page21.md'), false);
  assert.equal(selected.context.includes('contentLanding/page31.md'), false);
});

test('selected template edits change its digest while unrelated template edits do not', async () => {
  const { port, contents } = templateFixture();
  const before = await selectD2Template(port, request());
  contents.set('_102020_/l4/collabux/templates/processWizard/page21.md', 'Unrelated edit.');
  const unrelated = await selectD2Template(port, request());
  assert.equal(unrelated.digest, before.digest);
  contents.set('_102020_/l4/collabux/templates/entityRecordManagement/page21.md', 'Changed selected guidance.');
  const changed = await selectD2Template(port, request());
  assert.notEqual(changed.digest, before.digest);
});
