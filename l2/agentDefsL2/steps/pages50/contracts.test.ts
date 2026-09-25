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
import { D2_SHARED_VERSION, type D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, buildD2PagePipeline, deriveD2PageOrganisms, resolveD2PageScenarioState, resolveD2PageScenarioSurfaces, type D2PageDescription, type D2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { buildD2PageSkillsContext, d2PageUnitContextHash, type D2PageSkillPort, type D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { gateD2Pages, parseD2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { assertD2RenderedPage, parseD2RenderedPage, renderD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { unwrapD2PagesToolPayload } from '/_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, '..', 'input20', 'fixtures');
const GROUPS = new Map([['groupEnterDate', ['_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts']]]);
const CANDIDATES = new Map<string, Set<string>>();
const PAGE_SKILLS = pageSkillsFixture();

void test('current five-page fixture emits 10 defs/items and five shared refs with functional device parity', () => {
  const pages = fixturePageIds('current'); const emitted = pages.flatMap(pageId => emit(pageId));
  assert.equal(pages.length, 5); assert.equal(emitted.length, 10);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].id)).size, 10);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].dependsOn[0])).size, 5);
  assert.ok(emitted.every(item => item.pipeline[0].type === 'l2_page' && !('agent' in item.pipeline[0])));
  assert.ok(emitted.every(item => item.pipeline[0].dependsFiles.join('\0') === `l2/fixture/web/shared/${item.pipeline[0].id.split('__')[0]}.ts\0l2/designSystem.ts`));
  assert.ok(emitted.every(item => item.pipeline[0].outputPath === item.pipeline[0].defPath.replace('.defs.ts', '.ts')));
  assert.ok(emitted.every(item => !item.pipeline[0].id.includes('_O') && item.pipeline[0].defPath.includes('/page11/')));
  for (const pageId of pages) {
    const pair = emitted.filter(item => item.pipeline[0].id.startsWith(`${pageId}__`));
    assert.equal(pair.length, 2); assert.deepEqual(capabilityMarker(pair[0].descriptions), capabilityMarker(pair[1].descriptions));
    assert.ok(pair.every(item => item.pipeline[0].skills.length === 2));
    assert.equal(new Set(pair.map(item => item.pipeline[0].categoryRef)).size, 1);
  }
});

void test('page pipeline keeps project design system ordered and rejects legacy or malformed context', () => {
  const item = buildD2PagePipeline('otherModule', 'records', 'desktop', 'bespoke', ['skill']);
  assert.deepEqual(item.dependsFiles, ['l2/otherModule/web/shared/records.ts', 'l2/designSystem.ts']);
  assert.equal(Object.hasOwn(item, 'agent'), false);
  const source = renderD2Page({ device: 'desktop', descriptions: [{ organismId: 'organism.content.1', kind: 'content', description: 'Content.', contentRef: 'base', capabilityRefs: [], moleculeRecommendations: [] }], pipeline: [item] });
  assert.doesNotThrow(() => assertD2RenderedPage(source));
  const legacy = source.replace(/,\n\s*"l2\/designSystem\.ts"/u, '');
  assert.throws(() => assertD2RenderedPage(legacy), /D2_PAGES_PIPELINE_CONTEXT/);
  assert.throws(() => assertD2RenderedPage(renderD2Page({ device: 'desktop', descriptions: parseD2RenderedPage(source).descriptions, pipeline: [{ ...item, dependsFiles: [...item.dependsFiles].reverse() }] })), /D2_PAGES_PIPELINE_CONTEXT/);
});

void test('historical seven-page fixture remains a 14-def regression', () => {
  const pages = fixturePageIds('historical'); const emitted = pages.flatMap(pageId => emit(pageId));
  assert.equal(pages.length, 7); assert.equal(emitted.length, 14);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].id)).size, 14);
});

void test('professional and receptionist prose preserves tasks without clinical-note leakage or mobile reduction', () => {
  const professional = emit('consultas_profissional'); const reception = emit('consultas_recepcionista');
  for (const device of professional) assert.match(device.descriptions.map(item => item.description).join(' '), /consultation and record attendance/u);
  for (const device of reception) { assert.match(device.descriptions.map(item => item.description).join(' '), /reception scheduling flow/u); assert.doesNotMatch(device.descriptions.map(item => item.description).join(' '), /attendanceNote|clinical note/iu); }
  assert.deepEqual(capabilityMarker(professional[0].descriptions), capabilityMarker(professional[1].descriptions));
  assert.deepEqual(capabilityMarker(reception[0].descriptions), capabilityMarker(reception[1].descriptions));
});

void test('closed gate rejects HTML/layout, invented method/group, missing device and unsupported dashboard data', () => {
  const page = selected('records'); const shared = sharedFor('records', ['listRecord']); const good = judgment('records', ['listRecord']);
  assert.throws(() => gated(page, shared, { ...good, presentations: good.presentations.slice(0, 1) }), /D2_PAGES_DEVICE_MISSING/);
  const mutateDescription = (device: 'desktop' | 'mobile', patch: Partial<D2PageDescription>) => ({ ...good, presentations: good.presentations.map(item => item.device === device ? { ...item, descriptions: item.descriptions.map((description, index) => index ? description : { ...description, ...patch }) } : item) });
  assert.throws(() => gated(page, shared, mutateDescription('desktop', { description: '<section>two-column grid</section>' })), /D2_PAGES_LAYOUT_PRESCRIPTION/);
  assert.throws(() => gated(page, shared, mutateDescription('desktop', { capabilityRefs: ['inventMethod'] })), /D2_PAGES_CAPABILITY_UNKNOWN/);
  assert.throws(() => gated(page, shared, mutateDescription('desktop', { moleculeRecommendations: [{ groupId: 'groupMissing', candidates: ['missing'], reason: 'Useful.' }] })), /D2_PAGES_GROUP_UNKNOWN/);
  assert.throws(() => gated(page, { ...shared, dataBindings: [] }, mutateDescription('desktop', { description: 'Show a statistics dashboard total.' })), /D2_PAGES_DATA_CLAIM_UNSUPPORTED/);
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

void test('four professional organisms map to two real scenes without multiplying content areas', () => {
  const page = selected('consultas_profissional', [
    { id: 'professional.list', kind: 'list', text: 'Appointments list' },
    { kind: 'detail', text: 'Selected appointment detail' },
    { kind: 'form', text: 'Attendance note form' },
    { kind: 'actions', text: 'Save or cancel attendance' },
  ]);
  const shared = twoSceneShared('consultas_profissional');
  const value = judgment(page.pageId, ['listConsulta'], 'calendarScheduling', page);
  for (const presentation of value.presentations) presentation.descriptions = presentation.descriptions.map((item, index) => index < 2
    ? { ...item, contentRef: 'base', capabilityRefs: ['listConsulta'] }
    : { ...item, contentRef: 'registrarAtendimento', capabilityRefs: index === 3 ? ['registrarAtendimento', 'cancelarAtendimento'] : ['registrarAtendimento'] });
  const rendered = gated(page, shared, value);
  assert.deepEqual(rendered[0].descriptions.map(item => item.organismId), ['professional.list', 'organism.detail.1', 'organism.form.1', 'organism.actions.1']);
  assert.deepEqual(new Set(rendered[0].descriptions.map(item => item.contentRef)), new Set(['base', 'registrarAtendimento']));
  assert.deepEqual(capabilityMarker(rendered[0].descriptions), capabilityMarker(rendered[1].descriptions));
});

void test('valid shared scenes need not each have an artificial organism', () => {
  const page = selected('profissionais', [
    { kind: 'list', text: 'Professionals list' },
    { kind: 'actions', text: 'Professional actions' },
  ]);
  const shared = twoSceneShared(page.pageId);
  shared.states.find(item => item.kind === 'viewState')!.valueSet = ['base', 'registrarAtendimento', 'revisarAtendimento'];
  shared.scenaries.push({ value: 'revisarAtendimento', kind: 'command', actionId: 'registrarAtendimento', preconditions: [] });
  const value = judgment(page.pageId, ['listConsulta'], 'entityRecordManagement', page);
  for (const presentation of value.presentations) presentation.descriptions = presentation.descriptions.map((item, index) => index
    ? { ...item, contentRef: 'registrarAtendimento', capabilityRefs: ['registrarAtendimento'] }
    : { ...item, contentRef: 'base', capabilityRefs: ['listConsulta'] });

  const rendered = gated(page, shared, value);
  assert.equal(shared.scenaries.length, 3);
  assert.equal(rendered[0].descriptions.length, 2);
  assert.deepEqual(new Set(rendered[0].descriptions.map(item => item.contentRef)), new Set(['base', 'registrarAtendimento']));
});

void test('repeated kinds and static content get stable ids while nominal organism failures are diagnosed', () => {
  const page = selected('pacientes', [{ kind: 'list' }, { kind: 'list' }, { kind: 'static' }, { id: 'patient.actions', kind: 'actions' }]);
  const shared = sharedFor(page.pageId, ['listPaciente']);
  const value = judgment(page.pageId, ['listPaciente'], 'entityRecordManagement', page);
  assert.deepEqual(deriveD2PageOrganisms(page).map(item => item.organismId), ['organism.list.1', 'organism.list.2', 'organism.static.1', 'patient.actions']);
  assert.equal(value.presentations[0].descriptions[2].capabilityRefs.length, 0);
  assert.doesNotThrow(() => gated(page, shared, value));
  const patch = (descriptions: D2PageDescription[]) => ({ ...value, presentations: value.presentations.map((item, index) => index ? item : { ...item, descriptions }) });
  const base = value.presentations[0].descriptions;
  assert.throws(() => gated(page, shared, patch(base.slice(1))), /D2_PAGES_ORGANISM_MISSING/);
  assert.throws(() => gated(page, shared, patch([...base, base[0]])), /D2_PAGES_ORGANISM_DUPLICATE/);
  assert.throws(() => gated(page, shared, patch(base.map((item, index) => index ? item : { ...item, organismId: 'invented' }))), /D2_PAGES_ORGANISM_UNKNOWN/);
  assert.throws(() => gated(page, shared, patch(base.map((item, index) => index ? item : { ...item, contentRef: '' }))), /D2_PAGES_CONTENT_REF_MISSING/);
  assert.throws(() => gated(page, shared, patch(base.map((item, index) => index ? item : { ...item, contentRef: 'invented' }))), /D2_PAGES_CONTENT_REF_UNKNOWN/);
  assert.throws(() => gated(page, { ...shared, states: shared.states.filter(item => item.kind !== 'viewState') }, value), /D2_PAGES_SCENARIO_STATE_INCOMPATIBLE/);
});

void test('a static page accepts a base scene without actions or data bindings', () => {
  const page = selected('about', [{ kind: 'static', text: 'Published information' }]);
  const shared = sharedFor(page.pageId, ['unused']);
  shared.actions = []; shared.dataBindings = []; shared.scenaries = [{ value: 'base', kind: 'base', actionId: '', preconditions: [] }];
  const value = judgment(page.pageId, ['base'], 'bespoke', page);
  assert.equal(value.presentations[0].descriptions[0].capabilityRefs.length, 0);
  const rendered = gateD2Pages('fixture', page, shared, value,
    new Map([['groupViewData', ['view-index', 'view-usage']]]), PAGE_SKILLS,
    new Map([['groupViewData', new Set(['groupviewdata--ml-table'])]]));
  assert.equal(rendered[0].descriptions[0].contentRef, 'base');
  assert.deepEqual(resolveD2PageScenarioSurfaces(shared), [{ contentRef: 'base', actionId: '', kind: 'base', inputStateKeys: [], statusStateKey: '', errorStateKey: '' }]);
});

void test('molecule recommendations are organism-scoped, useful and capability-compatible', () => {
  const page = selected('records', [{ kind: 'list' }, { kind: 'form' }, { kind: 'actions' }]);
  const shared = twoSceneShared('records');
  const value = judgment(page.pageId, ['listConsulta'], 'entityRecordManagement', page);
  for (const presentation of value.presentations) presentation.descriptions = presentation.descriptions.map((item, index) => ({
    ...item,
    contentRef: index ? 'registrarAtendimento' : 'base',
    capabilityRefs: index ? ['registrarAtendimento'] : ['listConsulta'],
    moleculeRecommendations: index === 0 ? [{ groupId: 'groupViewData', candidates: ['groupviewdata--ml-table'], reason: 'Shows the declared query result.' }]
      : index === 1 ? [{ groupId: 'groupEnterDate', candidates: ['groupenterdate--ml-date-picker'], reason: 'Edits command input.' }]
      : [{ groupId: 'groupTriggerAction', candidates: ['grouptriggeraction--ml-button'], reason: 'Runs the declared command.' }],
  }));
  const groups = new Map([
    ['groupViewData', ['view-index', 'view-usage']], ['groupEnterDate', ['date-index', 'date-usage']], ['groupTriggerAction', ['action-index', 'action-usage']],
  ]);
  const candidates = new Map([
    ['groupViewData', new Set(['groupviewdata--ml-table'])], ['groupEnterDate', new Set(['groupenterdate--ml-date-picker'])], ['groupTriggerAction', new Set(['grouptriggeraction--ml-button'])],
  ]);
  const rendered = gateD2Pages('fixture', page, shared, value, groups, PAGE_SKILLS, candidates);
  assert.ok(rendered.every(item => item.pipeline[0].skills.includes('action-usage')));
  for (const [index, groupId] of ['groupViewData', 'groupEnterDate', 'groupTriggerAction'].entries()) {
    const missing = structuredClone(value);
    missing.presentations[0].descriptions[index].moleculeRecommendations = [];
    assert.throws(() => gateD2Pages('fixture', page, shared, missing, groups, PAGE_SKILLS, candidates), new RegExp(`D2_PAGES_MOLECULE_RECOMMENDATION_MISSING: [^\\n]*compatible=[^\\n]*${groupId}`));
  }
  const wrong = structuredClone(value); wrong.presentations[0].descriptions[0].moleculeRecommendations[0].candidates = ['groupenterdate--ml-date-picker'];
  assert.throws(() => gateD2Pages('fixture', page, shared, wrong, groups, PAGE_SKILLS, candidates), /D2_PAGES_MOLECULE_CANDIDATE_UNKNOWN/);
  const incompatible = structuredClone(value); incompatible.presentations[0].descriptions[2].capabilityRefs = ['listConsulta'];
  assert.throws(() => gateD2Pages('fixture', page, shared, incompatible, groups, PAGE_SKILLS, candidates), /D2_PAGES_MOLECULE_CAPABILITY_MISMATCH|D2_PAGES_ORGANISM_PARITY/);
});

void test('shared scene surface exposes only the declared initial, input and feedback contract', () => {
  const shared = twoSceneShared('records');
  const sceneState = resolveD2PageScenarioState(shared);
  const command = resolveD2PageScenarioSurfaces(shared).find(item => item.contentRef === 'registrarAtendimento')!;
  assert.deepEqual(sceneState, { stateKey: 'ui.records.view', defaultValue: 'base' });
  assert.deepEqual(command.inputStateKeys, ['ui.records.attendance.input.note']);
  assert.equal(command.statusStateKey, 'ui.records.attendance.status');
  assert.equal(command.errorStateKey, 'ui.records.attendance.error');
  assert.equal(shared.states.find(item => item.stateKey === command.statusStateKey)?.kind, 'actionStatus');
  assert.equal(shared.states.find(item => item.stateKey === command.errorStateKey)?.kind, 'actionError');
  assert.equal(shared.states.find(item => item.stateKey === command.inputStateKeys[0])?.kind, 'input');
  const incompatible = structuredClone(shared); incompatible.actions.find(item => item.actionId === 'registrarAtendimento')!.errorStateKey = '';
  assert.throws(() => resolveD2PageScenarioSurfaces(incompatible), /D2_PAGES_SCENARIO_FEEDBACK_MISSING/);
});

void test('minimal consumer and TypeScript accept quotes, backticks and multilingual prose with exactly two exports', () => {
  const rendered = emit('records').map(item => ({ ...item, descriptions: item.descriptions.map((description, index) => index ? description : { ...description, description: 'Ação "rápida" com `atalho` e revisión.' }) }));
  const folder = mkdtempSync(path.join(tmpdir(), 'd2-pages-'));
  try {
    rendered.forEach((item, index) => { const source = renderD2Page(item); assertD2RenderedPage(source); assert.equal(parseD2RenderedPage(source).pipeline.length, 1); writeFileSync(path.join(folder, `page${index}.defs.ts`), source); });
    writeFileSync(path.join(folder, 'consumer.ts'), "import { descriptions, pipeline } from './page0.defs.js';\nconst organismId: string = descriptions[0].organismId; const contentRef: string = descriptions[0].contentRef; const id: string = pipeline[0].id; void organismId; void contentRef; void id;\n");
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const result = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', 'page0.defs.ts', 'page1.defs.ts'], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

void test('page worker has one bounded repair and no live model call outside orchestration', () => {
  const source = readFileSync(path.join(HERE, '../pages-page/agentD2PagesPage.ts'), 'utf8');
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(source, /parsed\.attempt < 2/);
  assert.match(source, /D2_PAGES_REPAIR_LIMIT/);
  assert.doesNotMatch(source, /getBestModel|callLLM|agentCfeMaterializeGen/);
  assert.match(prompt, /must never claim that the catalog is empty when moleculeCandidates\.groups is non-empty/u);
  assert.doesNotMatch(prompt, /every shared scenary must contain at least one organism/u);
});

void test('page worker preserves raw initial hook args without adding feedback', () => {
  const raw = `{"project":102047,"module":"fixture","pageId":"page","attempt":1,"moleculeContextHash":"sha256:${'a'.repeat(64)}"}`;
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
function judgment(pageId: string, refs: string[], categoryRef = 'calendarScheduling', page = selected(pageId)): D2PagesJudgment {
  const organisms = deriveD2PageOrganisms(page); const describe = (device: 'Desktop' | 'Mobile') => organisms.map((organism, index) => ({
    organismId: organism.organismId, kind: organism.kind,
    description: `${business(pageId)} ${device} ${organism.intent || organism.kind} supports ${refs.join(',')}, keyboard use, loading, empty and error states.`,
    contentRef: 'base', capabilityRefs: organism.staticContent ? [] : refs, moleculeRecommendations: [],
  }));
  return { schemaVersion: D2_PAGES_JUDGMENT_VERSION, pageId, category: { categoryRef, reason: `The ${categoryRef} intent matches the declared capability.`, evidenceRefs: [refs[0]] }, presentations: [
    { device: 'desktop', descriptions: describe('Desktop'), moleculeReason: 'No useful molecule correspondence is required by this fixture.' },
    { device: 'mobile', descriptions: describe('Mobile'), moleculeReason: 'No useful molecule correspondence is required by this fixture.' },
  ] };
}
function gated(page: D2SelectedPage, shared: D2SharedDefinition, value: D2PagesJudgment) { return gateD2Pages('fixture', page, shared, value, GROUPS, PAGE_SKILLS, CANDIDATES); }
function pageSkillsFixture(): D2PageSkillsContext { const refs = ['calendarScheduling', 'entityRecordManagement', 'approvalWorkflow', 'bespoke']; const categories = refs.map(categoryRef => ({ categoryRef, name: categoryRef, meaning: categoryRef, skillReference: `_102020_/l2/agentDefsL2/skills/pageCategories/${categoryRef}.md` })); return { categories, context: '{}', catalogHash: 'catalog', contextHash: 'context', skillHashes: {} }; }
function realPageSkillPort(root: string, overrides: Record<string, string> = {}): D2PageSkillPort { return { readText: async reference => { if (Object.prototype.hasOwnProperty.call(overrides, reference)) return overrides[reference]; const match = /^_(\d+)_\/(l[24])\/(.+)$/.exec(reference); if (!match) return null; try { return readFileSync(path.join(root, `mls-${match[1]}`, match[2], match[3]), 'utf8'); } catch { return null; } } }; }
function business(pageId: string): string { if (pageId === 'consultas_profissional') return 'The professional can review each consultation and record attendance.'; if (pageId === 'consultas_recepcionista') return 'The receptionist completes the reception scheduling flow.'; return `The actor completes the ${pageId} task with accessible feedback.`; }
function sharedFor(pageId: string, refs: string[]): D2SharedDefinition { return { schemaVersion: D2_SHARED_VERSION, moduleName: 'agendaClinica', pageId, pageName: pageId, baseClassName: `${pascal(pageId)}Shared`, routePattern: `/${pageId}`, contractRef: { defPath: `l2/agendaClinica/web/contracts/${pageId}.defs.ts`, calls: [] }, states: [{ stateKey: `ui.${pageId}.pageStatus`, name: 'pageStatus', kind: 'pageStatus', defaultValue: 'idle' }, { stateKey: `ui.${pageId}.view`, name: 'view', kind: 'viewState', defaultValue: 'base', valueSet: ['base'] }], actions: refs.map(actionId => ({ actionId, kind: 'query', inputStateKeys: [], outputStateKeys: [], statusStateKey: '', errorStateKey: '', refreshActionIds: [] })), scenaries: [{ value: 'base', kind: 'base', actionId: refs[0], preconditions: [] }], initialLoads: [], dataBindings: refs.map(actionId => ({ actionId, kind: 'query', routeRef: `${actionId}Route`, inputTypeRef: `${actionId}Input`, outputTypeRef: `${actionId}Output`, inputStateKeys: [], resultStateKey: `ui.${pageId}.${actionId}.result` })) }; }
function twoSceneShared(pageId: string): D2SharedDefinition {
  const shared = sharedFor(pageId, ['listConsulta']);
  shared.states.find(item => item.kind === 'viewState')!.valueSet = ['base', 'registrarAtendimento'];
  shared.states.push(
    { stateKey: `ui.${pageId}.attendance.input.note`, name: 'note', kind: 'input', defaultValue: '', actionRef: 'registrarAtendimento' },
    { stateKey: `ui.${pageId}.attendance.status`, name: 'status', kind: 'actionStatus', defaultValue: 'idle', valueSet: ['idle', 'loading', 'success', 'error'], actionRef: 'registrarAtendimento' },
    { stateKey: `ui.${pageId}.attendance.error`, name: 'error', kind: 'actionError', defaultValue: null, actionRef: 'registrarAtendimento' },
  );
  shared.actions.push({ actionId: 'registrarAtendimento', kind: 'command', inputStateKeys: [`ui.${pageId}.attendance.input.note`], outputStateKeys: [], statusStateKey: `ui.${pageId}.attendance.status`, errorStateKey: `ui.${pageId}.attendance.error`, refreshActionIds: ['listConsulta'] });
  shared.actions.push({ actionId: 'cancelarAtendimento', kind: 'command', inputStateKeys: [], outputStateKeys: [], statusStateKey: `ui.${pageId}.attendance.status`, errorStateKey: `ui.${pageId}.attendance.error`, refreshActionIds: ['listConsulta'] });
  shared.scenaries.push({ value: 'registrarAtendimento', kind: 'command', actionId: 'registrarAtendimento', preconditions: [] });
  shared.dataBindings.push({ actionId: 'registrarAtendimento', kind: 'command', routeRef: 'registrarAtendimentoRoute', inputTypeRef: 'RegistrarAtendimentoInput', outputTypeRef: 'RegistrarAtendimentoOutput', inputStateKeys: [`ui.${pageId}.attendance.input.note`], resultStateKey: `ui.${pageId}.attendance.result` });
  return shared;
}
function selected(pageId: string, organisms: unknown[] = [{ kind: 'list', text: `${pageId} list` }]): D2SelectedPage { return { pageId, status: 'toCreate', label: pageId, actors: ['actor'], authorityRefs: [], ancestors: [], journeyRefs: [], organisms, reads: [], writes: [], endpoints: [], usecases: [], destinations: [] }; }
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
function capabilityMarker(descriptions: D2PageDescription[]): string[] { return [...new Set(descriptions.flatMap(item => item.capabilityRefs))].sort(); }
function pascal(value: string): string { return value.replace(/(^|_)(.)/g, (_m, _a, char: string) => char.toUpperCase()); }
