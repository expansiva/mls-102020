/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2ContractsCatalog, type D2ContractsSources } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, type D2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { buildD2PageSkillsContext, d2PageUnitContextHash, type D2PageSkillPort, type D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { gateD2Pages, parseD2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { assertD2RenderedPage, parseD2RenderedPage, renderD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { unwrapD2PagesToolPayload } from '/_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, '..', 'input20', 'fixtures');
const GROUPS = new Map([['groupEnterDate', ['_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts']]]);
const CANDIDATES = new Map([['groupEnterDate', new Set(['groupenterdate--ml-date-picker'])]]);
const PAGE_SKILLS = pageSkillsFixture();

void test('current five-page fixture emits 10 defs/items and five shared refs with functional device parity', () => {
  const pages = fixturePageIds('current'); const emitted = pages.flatMap(pageId => emit(pageId));
  assert.equal(pages.length, 5); assert.equal(emitted.length, 10);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].id)).size, 10);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].dependsOn[0])).size, 5);
  assert.ok(emitted.every(item => item.pipeline[0].type === 'l2_page' && !('agent' in item.pipeline[0])));
  assert.ok(emitted.every(item => item.pipeline[0].outputPath === item.pipeline[0].defPath.replace('.defs.ts', '.ts')));
  assert.ok(emitted.every(item => !item.pipeline[0].id.includes('_O') && item.pipeline[0].defPath.includes('/page11/')));
  for (const pageId of pages) {
    const pair = emitted.filter(item => item.pipeline[0].id.startsWith(`${pageId}__`));
    assert.equal(pair.length, 2); assert.deepEqual(capabilityMarker(pair[0].descriptions), capabilityMarker(pair[1].descriptions));
    assert.ok(pair.every(item => item.pipeline[0].skills.length === 2));
    assert.equal(new Set(pair.map(item => item.pipeline[0].categoryRef)).size, 1);
  }
});

void test('historical seven-page fixture remains a 14-def regression', () => {
  const pages = fixturePageIds('historical'); const emitted = pages.flatMap(pageId => emit(pageId));
  assert.equal(pages.length, 7); assert.equal(emitted.length, 14);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].id)).size, 14);
});

void test('professional and receptionist prose preserves tasks without clinical-note leakage or mobile reduction', () => {
  const professional = emit('consultas_profissional'); const reception = emit('consultas_recepcionista');
  for (const device of professional) assert.match(device.descriptions.join(' '), /consultation and record attendance/u);
  for (const device of reception) { assert.match(device.descriptions.join(' '), /reception scheduling flow/u); assert.doesNotMatch(device.descriptions.join(' '), /attendanceNote|clinical note/iu); }
  assert.deepEqual(capabilityMarker(professional[0].descriptions), capabilityMarker(professional[1].descriptions));
  assert.deepEqual(capabilityMarker(reception[0].descriptions), capabilityMarker(reception[1].descriptions));
});

void test('closed gate rejects HTML/layout, invented method/group, missing device and unsupported dashboard data', () => {
  const page = selected('records'); const shared = sharedFor('records', ['listRecord']); const good = judgment('records', ['listRecord']);
  assert.throws(() => gated(page, shared, { ...good, presentations: good.presentations.slice(0, 1) }), /D2_PAGES_DEVICE_MISSING/);
  const mutate = (device: 'desktop' | 'mobile', field: 'descriptions' | 'capabilityRefs' | 'groupIds', value: string[]) => ({ ...good, presentations: good.presentations.map(item => item.device === device ? { ...item, [field]: value } : item) });
  assert.throws(() => gated(page, shared, mutate('desktop', 'descriptions', ['<section>two-column grid</section>'])), /D2_PAGES_LAYOUT_PRESCRIPTION/);
  assert.throws(() => gated(page, shared, mutate('desktop', 'capabilityRefs', ['inventMethod'])), /D2_PAGES_CAPABILITY_UNKNOWN/);
  assert.throws(() => gated(page, shared, mutate('desktop', 'groupIds', ['groupMissing'])), /D2_PAGES_GROUP_UNKNOWN/);
  assert.throws(() => gated(page, { ...shared, dataBindings: [] }, mutate('desktop', 'descriptions', ['Show a statistics dashboard total.'])), /D2_PAGES_DATA_CLAIM_UNSUPPORTED/);
  assert.throws(() => parseD2PagesJudgment({ ...good, layout: {} }), /D2_PAGES_SCHEMA_UNKNOWN_KEY/);
  assert.throws(() => parseD2PagesJudgment({ schemaVersion: D2_PAGES_JUDGMENT_VERSION, pageId: 'records', presentations: [{ device: 'desktop' }] }), /D2_PAGES_SCHEMA_TRUNCATED/);
});

void test('canonical catalog resolves 33 category skills plus bespoke and reads both mandatory skills', async () => {
  const root = path.resolve(HERE, '../../../../..'); const reads: string[] = [];
  const catalogFile = path.join(root, 'mls-102020/l4/collabux/templates/categoryList.json');
  const context = await buildD2PageSkillsContext({ readText: async reference => {
    reads.push(reference); const match = /^_(\d+)_\/(l[24])\/(.+)$/.exec(reference); if (!match) return null;
    try { return readFileSync(path.join(root, `mls-${match[1]}`, match[2], match[3]), 'utf8'); } catch { return null; }
  } });
  assert.equal(context.categories.filter(item => item.categoryRef !== 'bespoke').length, 33);
  assert.equal(new Set(context.categories.map(item => item.skillReference)).size, 34);
  assert.ok(reads.includes('_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts'));
  assert.ok(reads.includes('_102020_/l2/agentDefsL2/skills/pageCategories/calendarScheduling.md'));
  await assert.rejects(() => buildD2PageSkillsContext({ readText: async reference => reference.endsWith('/calendarScheduling.md') ? null : readFileSync(catalogFile, 'utf8') }), /D2_PAGE_SKILL_MISSING.*calendarScheduling/);
  const duplicate = JSON.parse(readFileSync(catalogFile, 'utf8')) as { categories: Array<{ categoryId: string }> }; duplicate.categories[1].categoryId = duplicate.categories[0].categoryId;
  await assert.rejects(() => buildD2PageSkillsContext({ readText: async reference => reference.endsWith('categoryList.json') ? JSON.stringify(duplicate) : 'skill' }), /D2_PAGE_CATEGORY_DUPLICATE/);
});

void test('real builder hashes selected inputs and ignores a skill from another category', async () => {
  const root = path.resolve(HERE, '../../../../..');
  const load = (overrides: Record<string, string> = {}) => buildD2PageSkillsContext(realPageSkillPort(root, overrides));
  const base = await load(); const same = await load();
  const selected = await d2PageUnitContextHash(base, 'calendarScheduling');
  assert.equal(await d2PageUnitContextHash(same, 'calendarScheduling'), selected);

  const catalogRef = '_102020_/l4/collabux/templates/categoryList.json';
  const technicalRef = '_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts';
  const selectedRef = '_102020_/l2/agentDefsL2/skills/pageCategories/calendarScheduling.md';
  const otherRef = '_102020_/l2/agentDefsL2/skills/pageCategories/productCatalog.md';
  const read = async (reference: string) => (await realPageSkillPort(root).readText(reference))!;
  assert.notEqual(await d2PageUnitContextHash(await load({ [catalogRef]: `${await read(catalogRef)}\n` }), 'calendarScheduling'), selected);
  assert.notEqual(await d2PageUnitContextHash(await load({ [technicalRef]: `${await read(technicalRef)}\n// changed` }), 'calendarScheduling'), selected);
  assert.notEqual(await d2PageUnitContextHash(await load({ [selectedRef]: `${await read(selectedRef)}\nchanged` }), 'calendarScheduling'), selected);
  assert.equal(await d2PageUnitContextHash(await load({ [otherRef]: `${await read(otherRef)}\nchanged` }), 'calendarScheduling'), selected);
});

void test('category is common to devices, capability-evidenced, supports three families and explicit bespoke', () => {
  const cases = [['calendarScheduling', 'listRecord'], ['entityRecordManagement', 'saveRecord'], ['approvalWorkflow', 'approveRecord'], ['bespoke', 'specialRecord']] as const;
  for (const [categoryRef, capability] of cases) {
    const page = selected('records'); const shared = sharedFor('records', [capability]); const value = judgment('records', [capability], categoryRef);
    const rendered = gated(page, shared, value);
    assert.ok(rendered.every(item => item.pipeline[0].categoryRef === categoryRef));
    assert.ok(rendered.every(item => item.pipeline[0].skills.length >= 2));
  }
  const bad = judgment('records', ['listRecord']); bad.category.categoryRef = 'notPublished';
  assert.throws(() => gated(selected('records'), sharedFor('records', ['listRecord']), bad), /D2_PAGE_CATEGORY_UNKNOWN/);
});

void test('minimal consumer and TypeScript accept quotes, backticks and multilingual prose with exactly two exports', () => {
  const rendered = emit('records').map(item => ({ ...item, descriptions: [...item.descriptions, 'Ação "rápida" com `atalho` e revisión.'] }));
  const folder = mkdtempSync(path.join(tmpdir(), 'd2-pages-'));
  try {
    rendered.forEach((item, index) => { const source = renderD2Page(item); assertD2RenderedPage(source); assert.equal(parseD2RenderedPage(source).pipeline.length, 1); writeFileSync(path.join(folder, `page${index}.defs.ts`), source); });
    writeFileSync(path.join(folder, 'consumer.ts'), "import { descriptions, pipeline } from './page0.defs.js';\nconst d: readonly string[] = descriptions; const id: string = pipeline[0].id; void d; void id;\n");
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const result = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', 'page0.defs.ts', 'page1.defs.ts'], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

void test('page worker has one bounded repair and no live model call outside orchestration', () => {
  const source = readFileSync(path.join(HERE, '../pages-page/agentD2PagesPage.ts'), 'utf8');
  assert.match(source, /parsed\.attempt < 2/);
  assert.match(source, /D2_PAGES_REPAIR_LIMIT/);
  assert.doesNotMatch(source, /getBestModel|callLLM|agentCfeMaterializeGen/);
});

void test('page worker preserves raw initial hook args without adding feedback', () => {
  const raw = '{"project":102047,"module":"fixture","pageId":"page","attempt":1}';
  assert.notEqual(JSON.stringify({ ...JSON.parse(raw), feedback: '' }), raw);
  const source = readFileSync(path.join(HERE, '../pages-page/agentD2PagesPage.ts'), 'utf8');
  assert.match(source, /const rawArgs = args \|\| step\.prompt \|\| '';/);
  assert.match(source, /const parsed = parseArgs\(rawArgs\);/);
  assert.match(source, /type: 'prompt_ready', args: rawArgs,/);
  assert.doesNotMatch(source, /type: 'prompt_ready', args: JSON\.stringify\(parsed\),/);
});

void test('page worker extracts the observed flexible envelope and validates its tool name', () => {
  const args = { schemaVersion: 'v', pageId: 'page' };
  assert.deepEqual(unwrapD2PagesToolPayload({ type: 'flexible', result: { toolName: 'submitD2Pages', arguments: args } }), args);
  assert.deepEqual(unwrapD2PagesToolPayload({ payload: args }), args, 'direct payload format remains accepted');
  assert.deepEqual(unwrapD2PagesToolPayload(args), args, 'direct judgment format remains accepted');
  assert.throws(() => unwrapD2PagesToolPayload({ type: 'flexible', result: { toolName: 'submitD2Shared', arguments: args } }), /D2_PAGES_TOOL_MISMATCH/);
});

void test('unamended HEAD transition payload remains an upstream contracts diagnostic', () => {
  assert.throws(() => buildD2ContractsCatalog(currentContractSources()), /D2_CONTRACT_TRANSITION_PAYLOAD_MISSING/);
});

function emit(pageId: string) { return gated(selected(pageId), sharedFor(pageId, capabilities(pageId)), judgment(pageId, capabilities(pageId))); }
function capabilities(pageId: string): string[] { return pageId.includes('profissional') && pageId.startsWith('consultas') ? ['listConsulta', 'registrarAtendimento'] : pageId.includes('recepcionista') && pageId.startsWith('consultas') ? ['listConsulta', 'confirmarConsulta'] : [`load${pascal(pageId)}`]; }
function judgment(pageId: string, refs: string[], categoryRef = 'calendarScheduling'): D2PagesJudgment { const base = refs.join(','); return { schemaVersion: D2_PAGES_JUDGMENT_VERSION, pageId, category: { categoryRef, reason: `The ${categoryRef} intent matches the declared capability.`, evidenceRefs: [refs[0]] }, presentations: [
  { device: 'desktop', descriptions: [business(pageId), `Desktop presentation supports ${base}, keyboard use, loading, empty and error states.`], capabilityRefs: refs, groupIds: [], moleculeRecommendations: [], moleculeReason: 'No useful molecule correspondence is required by this fixture.' },
  { device: 'mobile', descriptions: [business(pageId), `Mobile touch presentation preserves ${base}, reading priority, loading, empty and error states.`], capabilityRefs: refs, groupIds: [], moleculeRecommendations: [], moleculeReason: 'No useful molecule correspondence is required by this fixture.' },
] }; }
function gated(page: D2SelectedPage, shared: D2SharedDefinition, value: D2PagesJudgment) { return gateD2Pages('fixture', page, shared, value, GROUPS, PAGE_SKILLS, CANDIDATES); }
function pageSkillsFixture(): D2PageSkillsContext { const refs = ['calendarScheduling', 'entityRecordManagement', 'approvalWorkflow', 'bespoke']; const categories = refs.map(categoryRef => ({ categoryRef, name: categoryRef, meaning: categoryRef, skillReference: `_102020_/l2/agentDefsL2/skills/pageCategories/${categoryRef}.md` })); return { categories, context: '{}', catalogHash: 'catalog', contextHash: 'context', skillHashes: {} }; }
function realPageSkillPort(root: string, overrides: Record<string, string> = {}): D2PageSkillPort { return { readText: async reference => { if (Object.prototype.hasOwnProperty.call(overrides, reference)) return overrides[reference]; const match = /^_(\d+)_\/(l[24])\/(.+)$/.exec(reference); if (!match) return null; try { return readFileSync(path.join(root, `mls-${match[1]}`, match[2], match[3]), 'utf8'); } catch { return null; } } }; }
function business(pageId: string): string { if (pageId === 'consultas_profissional') return 'The professional can review each consultation and record attendance.'; if (pageId === 'consultas_recepcionista') return 'The receptionist completes the reception scheduling flow.'; return `The actor completes the ${pageId} task with accessible feedback.`; }
function sharedFor(pageId: string, refs: string[]): D2SharedDefinition { return { schemaVersion: '2026-09-21-agent-defs-l2-shared-v1', moduleName: 'agendaClinica', pageId, pageName: pageId, baseClassName: `${pascal(pageId)}Shared`, routePattern: `/${pageId}`, contractRef: { defPath: `l2/agendaClinica/web/contracts/${pageId}.defs.ts`, calls: [] }, states: [{ stateKey: `ui.${pageId}.pageStatus`, name: 'pageStatus', kind: 'pageStatus', defaultValue: 'idle' }], actions: refs.map(actionId => ({ actionId, kind: 'query', inputStateKeys: [], outputStateKeys: [], statusStateKey: '', errorStateKey: '', refreshActionIds: [] })), scenaries: [{ value: 'base', kind: 'base', actionId: refs[0], preconditions: [] }], initialLoads: [], dataBindings: refs.map(actionId => ({ actionId, kind: 'query', routeRef: `${actionId}Route`, inputTypeRef: `${actionId}Input`, outputTypeRef: `${actionId}Output`, inputStateKeys: [], resultStateKey: `ui.${pageId}.${actionId}.result` })) }; }
function selected(pageId: string): D2SelectedPage { return { pageId, status: 'toCreate', label: pageId, actors: ['actor'], authorityRefs: [], ancestors: [], journeyRefs: [], organisms: [], reads: [], writes: [], endpoints: [], usecases: [], destinations: [] }; }
function fixturePageIds(kind: 'current' | 'historical'): string[] { const raw = JSON.parse(readFileSync(path.join(FIXTURES, kind, 'needs.json'), 'utf8')) as { pages: Array<{ pageId: string }> }; return raw.pages.map(item => item.pageId); }
function currentContractSources(): D2ContractsSources {
  const input = path.join(FIXTURES, 'current'); const head = path.resolve(HERE, '..', 'contracts30', 'fixtures', 'head', 'l4');
  const backend = JSON.parse(readFileSync(path.join(input, 'backend.json'), 'utf8')) as Record<string, unknown>; const needs = JSON.parse(readFileSync(path.join(input, 'needs.json'), 'utf8')) as Record<string, unknown>;
  const entities: Record<string, Ns5OntologyAnyEntity> = {}; for (const name of readdirSync(path.join(head, 'ontology')).filter(name => name !== 'index.defs.ts')) { const entity = defs(path.join(head, 'ontology', name)); entities[String(entity.entityId)] = entity as unknown as Ns5OntologyAnyEntity; }
  const endpoints = rows(backend.endpoints); const usecases = rows(backend.usecases);
  return { module: 'agendaClinica', entities, access: defs(path.join(input, 'access.defs.ts')), pages: rows(needs.pages).map(raw => { const pageId = String(raw.pageId); const pageEndpoints = endpoints.filter(item => item.page === pageId); const ids = new Set(pageEndpoints.map(item => item.usecaseRef)); return { pageId, actors: strings(raw.actors), endpoints: pageEndpoints, usecases: usecases.filter(item => ids.has(item.usecaseId)) }; }) };
}
function defs(file: string): Record<string, unknown> { const value = parseNs4ClassicDefsSource<Record<string, unknown>>(readFileSync(file, 'utf8')); assert.ok(value); return value; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function capabilityMarker(descriptions: string[]): string[] { return descriptions.join(' ').match(/(?:list|registrar|confirmar|load)[A-Z][A-Za-z]+/g)?.sort() || []; }
function pascal(value: string): string { return value.replace(/(^|_)(.)/g, (_m, _a, char: string) => char.toUpperCase()); }
