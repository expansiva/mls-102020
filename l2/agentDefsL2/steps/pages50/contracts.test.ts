/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/contracts.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2ContractsCatalog, type D2ContractsSources } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { D2_SHARED_VERSION, type D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, buildD2PagePipeline, deriveD2PageOrganisms, resolveD2PageScenarioState, resolveD2PageScenarioSurfaces, type D2PageDescription, type D2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { buildD2PageSkillsContext, d2PageUnitContextHash, type D2PageSkillPort, type D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { gateD2Pages as productionGate, normalizeD2PageCoverage, parseD2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { parseD2MoleculeGroupJudgments, unwrapD2PagesToolPayload } from '/_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.js';

test('group research has its own strict phase and cannot accept legacy recommendations as roles', () => {
  const args = { schemaVersion: '2026-09-29-d2-molecule-groups-v1', pageId: 'records', moleculeResearch: [{ needId: 'records/desktop/table', groups: [] }] };
  const payload = { type: 'flexible', result: { toolName: 'submitD2MoleculeGroups', arguments: JSON.stringify(args) } };
  assert.deepEqual(parseD2MoleculeGroupJudgments(unwrapD2PagesToolPayload(payload, 'submitD2MoleculeGroups'), 'records'), args.moleculeResearch);
  assert.throws(() => unwrapD2PagesToolPayload(payload), /TOOL_MISMATCH/);
  assert.throws(() => parseD2MoleculeGroupJudgments({ ...args, recommendedMolecules: [] }, 'records'), /GROUP_JUDGMENT_SCHEMA/);
  assert.throws(() => parseD2MoleculeGroupJudgments({ ...args, moleculeResearch: [{ ...args.moleculeResearch[0], roles: [] }] }, 'records'), /GROUP_JUDGMENT_SCHEMA/);
  assert.throws(() => parseD2MoleculeGroupJudgments({ ...args, moleculeResearch: [] }, 'records'), /GROUP_JUDGMENT_SCHEMA/);
});
import { pageTemplate } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, '..', 'input20', 'fixtures');
const GROUPS = new Map([['groupEnterDate', ['_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts']]]);
const CANDIDATES = new Map<string, Set<string>>();
const PAGE_SKILLS = pageSkillsFixture();

void test('v1.2 five-page fixture emits 10 defs/items and five shared refs with functional device parity', () => {
  const pages = fixturePageIds('v1_2'); const emitted = pages.flatMap(pageId => emit(pageId));
  assert.equal(pages.length, 5); assert.equal(emitted.length, 10);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].id)).size, 10);
  assert.equal(new Set(emitted.map(item => item.pipeline[0].dependsOn[0])).size, 5);
  assert.ok(emitted.every(item => item.pipeline[0].type === 'l2_page' && !('agent' in item.pipeline[0])));
  assert.ok(emitted.every(item => item.pipeline[0].dependsFiles[0].endsWith('.defs.ts')));
  assert.ok(emitted.every(item => item.pipeline[0].outputPath === ''));
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
  assert.throws(() => productionGate('fixture', page, shared, mutateDescription('desktop', { capabilityRefs: ['inventMethod'] }), PAGE_SKILLS, template(good.category.categoryRef), []), /D2_PAGES_CAPABILITY_UNKNOWN/);
  assert.throws(() => parseD2PagesJudgment(mutateDescription('desktop', { moleculeRecommendations: [] } as never)), /D2_PAGES_DESCRIPTION_SCHEMA_UNKNOWN_KEY/);
  assert.throws(() => gated(page, { ...shared, dataBindings: [] }, mutateDescription('desktop', { description: 'Show a statistics dashboard total.' })), /D2_PAGES_DATA_CLAIM_UNSUPPORTED/);
  assert.throws(() => parseD2PagesJudgment({ ...good, layout: {} }), /D2_PAGES_SCHEMA_UNKNOWN_KEY/);
  assert.throws(() => parseD2PagesJudgment({ schemaVersion: D2_PAGES_JUDGMENT_VERSION, pageId: 'records', pageIntent: 'Review records.', presentations: [{ device: 'desktop' }] }), /D2_PAGES_SCHEMA_TRUNCATED/);
});

void test('renamed coverage is restored by organism identity while unknown and duplicate organisms remain visible', () => {
  const page = selected('renamedRecords', [{ id: 'record.second', kind: 'detail' }, { id: 'record.first', kind: 'list' }]);
  const shared = sharedFor(page.pageId, ['listRecord']);
  shared.coverage = [
    { organismId: 'record.first', sourceIndex: 1, kind: 'list', contentRef: 'recordsSurface', content: 'list', scenarioRefs: ['base'], capabilityRefs: ['listRecord'], outputFieldsByCapability: { listRecord: [{ actionId: 'listRecord', outputTypeRef: 'ListRecordOutput', path: 'Record.id' }] }, source: {} },
    { organismId: 'record.second', sourceIndex: 0, kind: 'detail', contentRef: 'recordsSurface', content: 'detail', scenarioRefs: ['base'], capabilityRefs: ['listRecord'], outputFieldsByCapability: { listRecord: [{ actionId: 'listRecord', outputTypeRef: 'ListRecordOutput', path: 'Record.id' }] }, source: {} },
  ];
  const value = judgment(page.pageId, ['listRecord'], 'entityRecordManagement', page);
  for (const presentation of value.presentations) presentation.descriptions = presentation.descriptions.map(item => ({ ...item, contentRef: 'content.invented', capabilityRefs: ['inventedCapability'], outputFieldRefs: [] }));
  const normalized = normalizeD2PageCoverage(parseD2PagesJudgment(value), shared);
  assert.deepEqual(normalized.presentations[0].descriptions.map(item => [item.organismId, item.contentRef, item.capabilityRefs, item.outputFieldRefs]), [
    ['record.second', 'recordsSurface', ['listRecord'], []], ['record.first', 'recordsSurface', ['listRecord'], []],
  ]);
  const validValue = { ...value, presentations: value.presentations.map(item => ({ ...item, descriptions: item.descriptions.map(description => ({ ...description, outputFieldRefs: ['ListRecordOutput.Record.id'] })) })) };
  assert.deepEqual(gated(page, shared, validValue)[0].descriptions.map(item => item.organismId), ['record.second', 'record.first']);
  assert.deepEqual(gated(page, shared, validValue)[0].descriptions.map(item => item.contentRef), ['recordsSurface', 'recordsSurface']);
  assert.ok(!shared.scenaries.some(item => item.value === 'recordsSurface'), 'coverage contentRef is independent of scenario values');
  const unknown = structuredClone(value); unknown.presentations[0].descriptions[0].organismId = 'unknown.organism';
  assert.throws(() => productionGate('fixture', page, shared, normalizeD2PageCoverage(unknown, shared), PAGE_SKILLS, template(value.category.categoryRef), []), /D2_PAGES_ORGANISM_UNKNOWN/);
  const duplicateCoverage = { ...shared, coverage: [...shared.coverage, structuredClone(shared.coverage[0])] };
  assert.throws(() => normalizeD2PageCoverage(parseD2PagesJudgment(value), duplicateCoverage), /D2_PAGES_SHARED_COVERAGE_ID_INVALID/);
  const duplicateDescription = structuredClone(value); duplicateDescription.presentations[0].descriptions[1].organismId = 'record.second';
  assert.throws(() => productionGate('fixture', page, shared, normalizeD2PageCoverage(duplicateDescription, shared), PAGE_SKILLS, template(value.category.categoryRef), []), /D2_PAGES_ORGANISM_DUPLICATE/);
});

void test('output citations are limited to the selected capability output surface', () => {
  const page = selected('renamedRecords', [{ kind: 'list' }]);
  const shared = sharedFor(page.pageId, ['listRecords']);
  shared.coverage = [{ organismId: 'organism.list.1', sourceIndex: 0, kind: 'list', contentRef: 'base', content: 'records', scenarioRefs: ['base'], capabilityRefs: ['listRecords'], outputFieldsByCapability: { listRecords: [{ actionId: 'listRecords', outputTypeRef: 'ListRecordsOutput', path: 'Record.id' }] }, source: {} }];
  const value = judgment(page.pageId, ['listRecords'], 'bespoke', page);
  for (const presentation of value.presentations) { presentation.descriptions[0].capabilityRefs = ['listRecords']; presentation.descriptions[0].outputFieldRefs = ['ListRecordsOutput.Record.id']; }
  assert.doesNotThrow(() => productionGate('fixture', page, shared, value, PAGE_SKILLS, template(value.category.categoryRef), []));
  const unsupported = structuredClone(value); unsupported.presentations[0].descriptions[0].outputFieldRefs = ['ListRecordsOutput.Record.phone'];
  assert.throws(() => productionGate('fixture', page, shared, unsupported, PAGE_SKILLS, template(value.category.categoryRef), []), /D2_PAGES_OUTPUT_FIELD_OUTSIDE_CAPABILITY/);
  const absent = structuredClone(value); absent.presentations[1].descriptions[0].outputFieldRefs = [];
  assert.throws(() => productionGate('fixture', page, shared, absent, PAGE_SKILLS, template(value.category.categoryRef), []), /D2_PAGES_OUTPUT_FIELD_EVIDENCE_MISSING/);
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
  assert.ok(reads.includes('_102020_/l2/agentDefsL2/skills/genD2Page11Definition.ts'));
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
  const technicalRef = '_102020_/l2/agentDefsL2/skills/genD2Page11Definition.ts';
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
  assert.throws(() => productionGate('fixture', page, shared, patch(base.map((item, index) => index ? item : { ...item, contentRef: '' })), PAGE_SKILLS, template(value.category.categoryRef), []), /D2_PAGES_CONTENT_REF_MISSING/);
  assert.throws(() => productionGate('fixture', page, shared, patch(base.map((item, index) => index ? item : { ...item, contentRef: 'invented' })), PAGE_SKILLS, template(value.category.categoryRef), []), /D2_PAGES_CONTENT_REF_UNKNOWN/);
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

void test('researched molecule roles remain scoped to the submitted organism and device', () => {
  const page = selected('records'); const shared = sharedFor('records', ['listRecord']); const value = judgment('records', ['listRecord']);
  gated(page, shared, value);
  const role = { needId: 'records/desktop/organism.list.1', device: 'desktop', organismId: value.presentations[0].descriptions[0].organismId, role: 'query result', groupId: 'readable', preferred: { tag: 'readable--ml-card', reason: 'Read the approved query result.', indexReference: '_817264_/l2/molecules/readable/index.defs.ts', usageContractReference: '_817264_/l2/molecules/readable/usage.ts' } };
  const pair = productionGate('fixture', page, shared, value, PAGE_SKILLS, template(value.category.categoryRef), [role]);
  assert.equal(pair[0].coverage[0].moleculeRecommendations.length, 1);
  assert.equal(pair[1].coverage[0].moleculeRecommendations.length, 0);
  assert.throws(() => productionGate('fixture', page, shared, value, PAGE_SKILLS, template(value.category.categoryRef), [{ ...role, organismId: 'missing' }]), /ROLE_ORGANISM_UNKNOWN/);
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

void test('page worker has one bounded repair and no live model call outside orchestration', () => {
  const source = readFileSync(path.join(HERE, '../pages-page/agentD2PagesPage.ts'), 'utf8');
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(source, /parsed\.attempt < 2/);
  assert.match(source, /D2_PAGES_REPAIR_LIMIT/);
  assert.doesNotMatch(source, /getBestModel|callLLM|agentCfeMaterializeGen/);
  assert.match(prompt, /earlier research pass already assessed every catalog group/u);
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
  assert.throws(() => buildD2ContractsCatalog(v1_2ContractSources()), /D2_CONTRACT_TRANSITION_PAYLOAD_MISSING/);
});

function emit(pageId: string) { return gated(selected(pageId), sharedFor(pageId, capabilities(pageId)), judgment(pageId, capabilities(pageId))); }
// Older isolated fixtures specify their approved coverage explicitly at the gate boundary.
function gateD2Pages(moduleName: string, page: D2SelectedPage, shared: D2SharedDefinition, value: D2PagesJudgment, groups: Map<string, string[]>, skills: D2PageSkillsContext, candidates: Map<string, Set<string>>) {
  shared.coverage ??= value.presentations[0].descriptions.map((item, sourceIndex) => ({ organismId: item.organismId, sourceIndex, kind: item.kind, contentRef: item.contentRef, content: item.description, scenarioRefs: [item.contentRef], capabilityRefs: [...item.capabilityRefs], outputFieldsByCapability: Object.fromEntries(item.capabilityRefs.map(capability => [capability, []])), source: page.organisms[sourceIndex] }));
  return productionGate(moduleName, page, shared, value, skills, template(value.category.categoryRef), []);
}
function template(categoryRef: string) { return { categoryRef, targetPage: 'page11' as const, experiencePage: null, experienceId: null, styleId: null, layoutId: null, reason: 'Fixture guidance.', requirementsMet: [], digest: `sha256:${'3'.repeat(64)}`, sources: [] }; }

void test('productive template adapter yields exact pipeline receipt and selected Markdown source hash', async () => {
  const categoryRef = 'genericCollection'; const catalogRef = '_102020_/l4/collabux/templates/categoryList.json'; const mdRef = `_102020_/l4/collabux/templates/${categoryRef}/page21.md`;
  const contents = new Map([[catalogRef, JSON.stringify({ categories: [{ categoryId: categoryRef, experiences: { page21: 'recordCollection' } }] })], [mdRef, 'Show the approved collection using accessible molecule APIs.']]);
  const port = { discover: async () => ({ categoryCatalog: catalogRef, files: [{ reference: mdRef, role: 'category' as const, categoryRef }] }), readText: async (ref: string) => contents.get(ref) ?? null };
  const selectedTemplate = await pageTemplate(sharedFor('renamedCatalog', ['loadRecords']), categoryRef, port);
  assert.equal(Object.hasOwn(selectedTemplate, 'context'), false);
  assert.equal(selectedTemplate.experienceId, 'recordCollection');
  assert.ok(selectedTemplate.sources.every(source => /^sha256:[a-f0-9]{64}$/u.test(source.sha256)));
  assert.ok(selectedTemplate.sources.some(source => source.reference === mdRef));
  contents.set(mdRef, 'Changed accessible guidance.');
  assert.notEqual((await pageTemplate(sharedFor('renamedCatalog', ['loadRecords']), categoryRef, port)).digest, selectedTemplate.digest);
});

void test('renamed page keeps derived content and rejects omitted or cross-organism capabilities independent of prose', () => {
  const page = selected('renamedInventory', [{ kind: 'list', text: 'Browse authorized records.' }, { kind: 'actions', text: 'Choose a record.' }]);
  const shared = sharedFor(page.pageId, ['loadRecords', 'selectRecord']);
  const value = judgment(page.pageId, ['loadRecords', 'selectRecord'], 'bespoke', page);
  gateD2Pages('genericWorkspace', page, shared, value, GROUPS, PAGE_SKILLS, CANDIDATES);
  const omitted = structuredClone(value); omitted.presentations.forEach(presentation => { presentation.descriptions[1].capabilityRefs = ['loadRecords']; });
  assert.throws(() => gateD2Pages('genericWorkspace', page, shared, omitted, GROUPS, PAGE_SKILLS, CANDIDATES), /D2_PAGES_CAPABILITY_MISSING/);
  const missingContent = structuredClone(value); missingContent.presentations[0].descriptions[0].contentRef = 'invented';
  assert.throws(() => gateD2Pages('genericWorkspace', page, shared, missingContent, GROUPS, PAGE_SKILLS, CANDIDATES), /D2_PAGES_CONTENT_REF_UNKNOWN/);
  const pair = gateD2Pages('genericWorkspace', page, shared, value, GROUPS, PAGE_SKILLS, CANDIDATES);
  pair[0].descriptions[0].description = 'Literal `code`, ${untrusted}, "quote", \\ and as const; remain text.';
  assert.ok(pair[0].descriptions[0].description.includes('${untrusted}'));
  assert.deepEqual(pair[0].coverage.map(item => item.contentRef), ['base', 'base']);
});
function capabilities(pageId: string): string[] { return pageId.includes('profissional') && pageId.startsWith('consultas') ? ['listConsulta', 'registrarAtendimento'] : pageId.includes('recepcionista') && pageId.startsWith('consultas') ? ['listConsulta', 'confirmarConsulta'] : [`load${pascal(pageId)}`]; }
function judgment(pageId: string, refs: string[], categoryRef = 'calendarScheduling', page = selected(pageId)): D2PagesJudgment {
  const organisms = deriveD2PageOrganisms(page); const describe = (device: 'Desktop' | 'Mobile') => organisms.map((organism, index) => ({
    organismId: organism.organismId, kind: organism.kind,
    description: `${business(pageId)} ${device} ${organism.intent || organism.kind} supports ${refs.join(',')}, keyboard use, loading, empty and error states.`,
    contentRef: 'base', capabilityRefs: organism.staticContent ? [] : refs, outputFieldRefs: [],
  }));
  return { schemaVersion: D2_PAGES_JUDGMENT_VERSION, pageId, pageIntent: business(pageId), category: { categoryRef, reason: `The ${categoryRef} intent matches the declared capability.`, evidenceRefs: [refs[0]] }, presentations: [
    { device: 'desktop', descriptions: describe('Desktop') },
    { device: 'mobile', descriptions: describe('Mobile') },
  ], moleculeResearch: [] };
}
function gated(page: D2SelectedPage, shared: D2SharedDefinition, value: D2PagesJudgment) {
  shared.coverage ??= value.presentations[0].descriptions.map((item, sourceIndex) => ({ organismId: item.organismId, sourceIndex, kind: item.kind, contentRef: item.contentRef, content: item.description, scenarioRefs: [item.contentRef], capabilityRefs: [...item.capabilityRefs], outputFieldsByCapability: Object.fromEntries(item.capabilityRefs.map(capability => [capability, []])), source: page.organisms[sourceIndex] }));
  return gateD2Pages('fixture', page, shared, normalizeD2PageCoverage(value, shared), GROUPS, PAGE_SKILLS, CANDIDATES);
}
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
function fixturePageIds(kind: 'v1_2' | 'historical'): string[] { const raw = JSON.parse(readFileSync(path.join(FIXTURES, kind, 'needs.json'), 'utf8')) as { pages: Array<{ pageId: string }> }; return raw.pages.map(item => item.pageId); }
function v1_2ContractSources(): D2ContractsSources {
  const input = path.join(FIXTURES, 'v1_2'); const head = path.resolve(HERE, '..', 'contracts30', 'fixtures', 'head', 'l4');
  const backend = JSON.parse(readFileSync(path.join(input, 'backend.json'), 'utf8')) as Record<string, unknown>; const needs = JSON.parse(readFileSync(path.join(input, 'needs.json'), 'utf8')) as Record<string, unknown>;
  const entities: Record<string, Ns5OntologyAnyEntity> = {}; for (const name of readdirSync(path.join(head, 'ontology')).filter(name => name !== 'index.defs.ts')) { const entity = defs(path.join(head, 'ontology', name)); entities[String(entity.entityId)] = entity as unknown as Ns5OntologyAnyEntity; }
  const endpoints = rows(backend.endpoints); const usecases = rows(backend.usecases);
  return { module: 'agendaClinica', entities, access: defs(path.join(input, 'access.defs.ts')), pages: rows(needs.pages).map(raw => { const pageId = String(raw.pageId); const pageEndpoints = endpoints.filter(item => item.page === pageId); const ids = new Set(pageEndpoints.map(item => item.usecaseRef)); return { pageId, actors: strings(raw.actors), endpoints: pageEndpoints, usecases: usecases.filter(item => ids.has(item.usecaseId)), operationBindings: [] }; }) };
}
function defs(file: string): Record<string, unknown> { const value = parseNs4ClassicDefsSource<Record<string, unknown>>(readFileSync(file, 'utf8')); assert.ok(value); return value; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function capabilityMarker(descriptions: D2PageDescription[]): string[] { return [...new Set(descriptions.flatMap(item => item.capabilityRefs))].sort(); }
function pascal(value: string): string { return value.replace(/(^|_)(.)/g, (_m, _a, char: string) => char.toUpperCase()); }
