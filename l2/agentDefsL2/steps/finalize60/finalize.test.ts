import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { D2InputSnapshot, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2SharedPipeline } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { buildD2PagePipeline } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { renderD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { renderD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { changedOutsideD2Scope, gateD2FinalSources, type D2FinalSource } from '/_102020_/l2/agentDefsL2/steps/finalize60/gate.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { finalizeD2, revalidateD2RemovalSet, validateD2SelectionCounts } from '/_102020_/l2/agentDefsL2/steps/finalize60/run.js';
import { compileD2FinalSources, type D2CompilerModel, type D2StudioCompiler } from '/_102020_/l2/agentDefsL2/steps/finalize60/compile.js';
import { D2_FINALIZE_VERSION } from '/_102020_/l2/agentDefsL2/steps/finalize60/contracts.js';
import { D2_CONTRACTS_VERSION } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { D2_SHARED_VERSION } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_VERSION } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { d2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';

const moduleName = 'agendaClinica';
const ids = ['agenda', 'cadastro', 'dashboard', 'prontuario', 'recepcao'];
const snapshot = {
  module: moduleName,
  selection: {
    writePageIds: ids,
    preservePageIds: [],
    remove: [],
    pages: ids.map(id => page(id)),
  },
} as unknown as D2InputSnapshot;

test('finalize compilation fails closed when the Studio compiler is unavailable', async () => {
  const previous = (globalThis as unknown as { mls?: unknown }).mls;
  (globalThis as unknown as { mls?: unknown }).mls = undefined;
  try {
    const sources: D2FinalSource[] = (['contract', 'shared', 'desktopPage', 'mobilePage'] as const).map(kind => ({
      pageId: 'items', kind, path: `l2/renamed/web/${kind}/items.defs.ts`, source: 'export {};',
    }));
    const proofs = await compileD2FinalSources({ project: 817263, module: 'renamed' }, sources, new Map(sources.map(file => [file.path, 'sha256:fixture'])));
    assert.equal(proofs.length, 4);
    assert.deepEqual(proofs.map(item => item.status), ['failed', 'failed', 'failed', 'failed']);
    assert.ok(proofs.every(item => item.diagnostics[0].includes('unavailable')));
  } finally {
    (globalThis as unknown as { mls?: unknown }).mls = previous;
  }
});

test('productive path uses canonical Studio compile capability and releases borrowed model without deleting stor', async () => {
  const previous = (globalThis as unknown as { mls?: unknown }).mls;
  const file = renamedSources()[0];
  const registry: Record<string, unknown> = {};
  const stor: Record<string, unknown> = {};
  let compiled = 0; let released = 0;
  const modelKey = (project: number, shortName: string, folder: string, level: number) => `${project}:${level}:${folder}/${shortName}`;
  const key = (info: { project: number; level: number; folder: string; shortName: string }) => modelKey(info.project, info.shortName, info.folder, info.level);
  const info = { project: 817263, level: 2, folder: 'renamed/web/contract', shortName: 'items', extension: '.defs.ts' };
  const textModel = { getValue: () => file.source, setValue: (_value: string) => {} };
  const model: { model: typeof textModel; compilerResults?: { errors: unknown[]; prodDTS: string } } = { model: textModel };
  const storageKey = `${key(info)}${info.extension}`;
  stor[storageKey] = { ...info, status: 'changed', getContent: async () => file.source, getOrCreateModel: async () => { registry[key(info)] = { ts: model }; return model; } };
  (globalThis as unknown as { mls: unknown }).mls = {
    editor: { models: registry, getKeyModel: modelKey, deleteModels: () => { delete registry[key(info)]; released += 1; } },
    stor: { files: stor, getKeyToFile: (value: typeof info) => `${key(value)}${value.extension}` },
    l2: { typescript: { compile: async () => { compiled += 1; model.compilerResults = { errors: [], prodDTS: 'export {};' }; }, compileAndPostProcess: () => { throw new Error('wrong compiler API'); } } },
  };
  try {
    const proof = await compileD2FinalSources({ project: 817263, module: 'renamed' }, [file], new Map([[file.path, 'sha256:fixture']]));
    assert.equal(proof[0].status, 'passed', proof[0].diagnostics.join('; '));
    assert.equal(compiled, 1);
    assert.equal(released, 1);
    assert.ok(stor[storageKey], 'release affects editor model only');
  } finally { (globalThis as unknown as { mls?: unknown }).mls = previous; }
});

test('Studio compilation proves valid bytes and reports a real TypeScript type diagnostic', async () => {
  const source = renamedSources();
  const calls: string[] = [];
  const studio = simulatedStudio(source, calls);
  const hashes = new Map(source.map(file => [file.path, `sha256:${file.source.length}`]));
  const valid = await compileD2FinalSources({ project: 817263, module: 'renamed' }, source, hashes, studio);
  assert.equal(valid.length, 4);
  assert.ok(valid.every(item => item.status === 'passed'));
  assert.deepEqual(calls, source.map(item => item.path));

  const invalid = source.map(file => file.kind === 'contract' ? { ...file, source: 'export interface Item { id: MissingType; }' } : file);
  const failed = await compileD2FinalSources({ project: 817263, module: 'renamed' }, invalid, hashes, simulatedStudio(invalid, []));
  assert.equal(failed[0].status, 'failed');
  assert.match(failed[0].diagnostics.join('\n'), /TS2304: Cannot find name 'MissingType'/u);
  assert.ok(failed.slice(1).every(item => item.status === 'passed'));
});

test('Studio compilation rejects missing models, missing results, exceptions and stale model bytes', async () => {
  const sources = renamedSources();
  const identity = { project: 817263, module: 'renamed' };
  const hashes = new Map(sources.map(file => [file.path, 'sha256:fixture']));
  const missingModel = simulatedStudio(sources, []);
  missingModel.getModel = async () => null;
  assert.ok((await compileD2FinalSources(identity, sources, hashes, missingModel)).every(item => item.status === 'failed'));

  const noResult = simulatedStudio(sources, []);
  noResult.compile = async () => null;
  assert.ok((await compileD2FinalSources(identity, sources, hashes, noResult)).every(item => item.diagnostics.some(diagnostic => diagnostic.includes('no diagnostics result'))));

  const throws = simulatedStudio(sources, []);
  let released = 0;
  throws.compile = async () => { throw new Error('compiler crashed'); };
  throws.release = () => { released += 1; };
  assert.ok((await compileD2FinalSources(identity, sources, hashes, throws)).every(item => item.diagnostics.includes('compiler crashed')));
  assert.equal(released, 1);

  const stale = simulatedStudio(sources, []);
  stale.getModel = async () => ({ model: { getValue: () => 'stale bytes' } });
  assert.ok((await compileD2FinalSources(identity, sources, hashes, stale)).every(item => item.diagnostics.some(diagnostic => diagnostic.includes('differs from approved source bytes'))));

  const staleStor = simulatedStudio(sources, []);
  staleStor.readStor = async () => 'different persisted bytes';
  assert.ok((await compileD2FinalSources(identity, sources, hashes, staleStor)).every(item => item.diagnostics.some(diagnostic => diagnostic.includes('storage differs'))));
});

test('a changed source and hash require a new compilation proof', async () => {
  const identity = { project: 817263, module: 'renamed' };
  const sources = renamedSources();
  const calls: string[] = [];
  const studio = simulatedStudio(sources, calls);
  const initial = await compileD2FinalSources(identity, sources, new Map(sources.map(file => [file.path, 'sha256:old'])), studio);
  assert.ok(initial.every(item => item.sha256 === 'sha256:old'));
  const changed = sources.map(file => file.kind === 'shared' ? { ...file, source: 'export const value = 2;' } : file);
  const updated = await compileD2FinalSources(identity, changed, new Map(changed.map(file => [file.path, 'sha256:new'])), simulatedStudio(changed, calls));
  assert.ok(updated.every(item => item.sha256 === 'sha256:new' && item.status === 'passed'));
  assert.equal(calls.length, 8);
});

test('failed compilation blocks removal, ownership and complete while keeping the prior receipt', async () => {
  const prior = (globalThis as unknown as { mls?: unknown }).mls;
  const host = await finalizeHost();
  try {
    const beforeOwnership = host.get('l2/renamed/pipeline/agentDefsL2/finalize60/ownership.json');
    let deletes = 0;
    const result = await finalizeD2({ project: 817263, module: 'renamed' }, {
      remove: async () => { deletes += 1; },
      compile: async (_identity, emitted, hashes) => emitted.map(file => ({ path: file.path, sha256: hashes.get(file.path)!, status: 'failed', diagnostics: ['TS2304: MissingType'] })),
    });
    assert.equal(result.report.status, 'blocked');
    assert.equal(result.report.compilation.length, 4);
    assert.equal(deletes, 0);
    assert.equal(host.get('l2/renamed/pipeline/agentDefsL2/finalize60/ownership.json'), beforeOwnership);
    assert.equal(JSON.parse(host.get('l2/renamed/pipeline/agentDefsL2/pipeline.json')!).status, 'inProgress');
    const corrected = await finalizeD2({ project: 817263, module: 'renamed' }, {
      remove: async () => { deletes += 1; },
      compile: async (_identity, emitted, hashes) => emitted.map(file => ({ path: file.path, sha256: hashes.get(file.path)!, status: 'passed', diagnostics: [] })),
    });
    assert.equal(corrected.report.status, 'complete', corrected.report.pending.join('; '));
    assert.equal(deletes, 4);
    assert.notEqual(host.get('l2/renamed/pipeline/agentDefsL2/finalize60/ownership.json'), beforeOwnership);
    assert.equal(JSON.parse(host.get('l2/renamed/pipeline/agentDefsL2/pipeline.json')!).status, 'complete');
  } finally { (globalThis as unknown as { mls?: unknown }).mls = prior; }
});

test('finalize60 gates the exact 20 defs and 15-item acyclic graph, including a page without molecule suggestions', () => {
  const sources = ids.flatMap(pageId => files(pageId, pageId === 'agenda'));
  assert.equal(sources.length, 20);
  assert.doesNotThrow(() => gateD2FinalSources(snapshot, sources));
});

test('legacy internal page descriptions render without output citations while judgment gates stay strict', () => {
  const source = pageSource('agenda', 'desktop', ['_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts']);
  assert.match(source, /Organism organism\.content\.1/);
});

test('finalize60 refuses a missing def, duplicate id, cycle and invalid reference', () => {
  const complete = ids.flatMap(pageId => files(pageId));
  assert.throws(() => gateD2FinalSources(snapshot, complete.slice(1)), /OUTPUT_SET_MISMATCH/);
  const duplicate = replacePipeline(complete, 'cadastro', 'desktopPage', { id: 'agenda__desktop__page11' });
  assert.throws(() => gateD2FinalSources(snapshot, duplicate), /PAGES_PIPELINE_CONTEXT|PIPELINE_ID_SET_INVALID/);
  const cycle = replacePipeline(complete, 'agenda', 'shared', { dependsOn: ['agenda__desktop__page11'] });
  assert.throws(() => gateD2FinalSources(snapshot, cycle), /SHARED_PIPELINE_CONTEXT|SHARED_REF_INVALID|PIPELINE_CYCLE/);
  const invalid = replacePipeline(complete, 'agenda', 'mobilePage', { dependsFiles: ['l2/wrong/web/shared/agenda.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, invalid), /PAGES_PIPELINE_CONTEXT|PAGE_REF_INVALID/);
  const legacyPage = replacePipeline(complete, 'agenda', 'desktopPage', { dependsFiles: ['l2/agendaClinica/web/shared/agenda.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, legacyPage), /PAGES_PIPELINE_CONTEXT|PAGE_REF_INVALID/);
  const invalidUsage = replacePipeline(complete, 'agenda', 'mobilePage', { skills: ['_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.defs.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, invalidUsage), /PAGE_REF_INVALID/);
  const incompletePair = replacePipeline(complete, 'agenda', 'desktopPage', { skills: ['_102040_/l2/molecules/groupenterdate/index.defs.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, incompletePair), /PAGE_REF_INVALID/);
  const arbitraryPath = replacePipeline(complete, 'agenda', 'desktopPage', { skills: ['_102040_/l2/other/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, arbitraryPath), /PAGE_REF_INVALID/);
});

test('scope fingerprint catches a positive control and protects another module with the same page id', () => {
  const allowed = ids.flatMap(pageId => page(pageId).destinations.map(item => item.path));
  const outside = 'l2/otherModule/web/shared/agenda.defs.ts';
  const before = { [allowed[0]]: 'old', [outside]: 'same' };
  assert.deepEqual(changedOutsideD2Scope(before, { [allowed[0]]: 'new', [outside]: 'changed' }, allowed), [outside]);
  assert.deepEqual(changedOutsideD2Scope(before, { [allowed[0]]: 'new', [outside]: 'same' }, allowed), []);
});

test('remove preflight catches an edit and a new snapshot between scan and delete', async () => {
  const path = `l2/${moduleName}/web/contracts/obsolete.defs.ts`;
  const info = { project: 102047, level: 2, folder: `${moduleName}/web/contracts`, shortName: 'obsolete', extension: '.defs.ts' };
  const owned = 'export interface Old {}\n';
  const ownership = new Map([[path, { pageId: 'obsolete', kind: 'contract' as const, path, sha256: await sha256Text(owned) }]]);
  let live = owned; let snapshotHash = 'old'; let deletes = 0;
  const verify = async () => { if (snapshotHash !== 'old') throw new Error('D2_FINALIZE_STALE_RUN'); };
  const edited = await revalidateD2RemovalSet([{ path, info }], ownership, async () => live, verify, async () => { live = 'manual edit'; });
  if (!edited.length) deletes += 1;
  assert.deepEqual(edited, [`remove target changed after scan: ${path}`]);
  assert.equal(deletes, 0);

  live = owned; snapshotHash = 'old';
  await assert.rejects(() => revalidateD2RemovalSet([{ path, info }], ownership, async () => live, verify, async () => { snapshotHash = 'new'; }), /STALE_RUN/);
  assert.equal(deletes, 0);
});

test('agendaClinica snapshot counts unique routes and usecaseIds and rejects illegible identities', () => {
  const fixture = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../input20/fixtures/v1_2/backend.json'), 'utf8')) as {
    endpoints: Array<Record<string, unknown>>;
    usecases: Array<Record<string, unknown>>;
  };
  const usecases = new Map(fixture.usecases.map(usecase => [String(usecase.usecaseId), usecase]));
  const pageIds = [...new Set(fixture.endpoints.map(endpoint => String(endpoint.page)))].sort();
  const pages = pageIds.map(pageId => {
    const endpoints = fixture.endpoints.filter(endpoint => endpoint.page === pageId);
    const refs = new Set(endpoints.map(endpoint => String(endpoint.usecaseRef)));
    return { ...page(pageId), endpoints, usecases: [...refs].map(ref => usecases.get(ref)!) };
  });
  const agendaSnapshot = { ...snapshot, selection: { ...snapshot.selection, pages, writePageIds: pageIds,
    counts: { pages: 5, endpoints: 19, usecases: 13, destinations: 20, materializationItems: 15 } } } as D2InputSnapshot;
  assert.equal(pages.reduce((sum, item) => sum + item.usecases.length, 0), 19, 'page occurrences intentionally repeat usecases');
  assert.deepEqual(validateD2SelectionCounts(agendaSnapshot), []);

  const adulterated = structuredClone(agendaSnapshot);
  adulterated.selection.pages[0].usecases[0].usecaseId = '';
  adulterated.selection.pages[1].endpoints[0].route = String(adulterated.selection.pages[0].endpoints[0].route);
  const problems = validateD2SelectionCounts(adulterated).join('; ');
  assert.match(problems, /usecaseId missing/);
  assert.match(problems, /endpoint route duplicated/);
});

function page(pageId: string, currentModule = moduleName): D2SelectedPage {
  const base = `l2/${currentModule}/web`;
  return { pageId, status: 'toCreate', label: pageId, actors: [], authorityRefs: [], ancestors: [], journeyRefs: [], organisms: [], reads: [], writes: [], endpoints: [], usecases: [], destinations: [
    { kind: 'contract', path: `${base}/contracts/${pageId}.defs.ts`, artifactId: `${pageId}:contract` },
    { kind: 'shared', path: `${base}/shared/${pageId}.defs.ts`, artifactId: `${pageId}:shared` },
    { kind: 'desktopPage', path: `${base}/desktop/page11/${pageId}.defs.ts`, artifactId: `${pageId}:desktop` },
    { kind: 'mobilePage', path: `${base}/mobile/page11/${pageId}.defs.ts`, artifactId: `${pageId}:mobile` },
  ] };
}
function files(pageId: string, withoutSkills = false, currentModule = moduleName): D2FinalSource[] {
  const p = page(pageId, currentModule); const mandatory = ['_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts', '_102020_/l2/agentDefsL2/skills/pageCategories/calendarScheduling.md']; const skill = withoutSkills ? mandatory : [...mandatory, '_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts'];
  return [
    { pageId, kind: 'contract', path: p.destinations[0].path, source: `${d2Header(p.destinations[0].path, currentModule === 'renamed' ? 817263 : undefined)}\nexport interface Input { "id": string; }\n` },
    { pageId, kind: 'shared', path: p.destinations[1].path, source: renderD2Shared({ moduleName: currentModule, pageId, contractRef: { defPath: `l2/${currentModule}/web/contracts/${pageId}.defs.ts` } } as never, buildD2SharedPipeline(currentModule, pageId), currentModule === 'renamed' ? 817263 : undefined) },
    ...(['desktop', 'mobile'] as const).map(device => ({ pageId, kind: device === 'desktop' ? 'desktopPage' as const : 'mobilePage' as const, path: p.destinations[device === 'desktop' ? 2 : 3].path, source: pageSource(pageId, device, skill, currentModule) })),
  ];
}
function description(pageId: string, device: string) { return { organismId: 'organism.content.1', kind: 'content', description: `${pageId} ${device}`, contentRef: 'base', capabilityRefs: [], outputFieldRefs: [], moleculeRecommendations: [] }; }
function pageSource(pageId: string, device: 'desktop' | 'mobile', skill: string[], currentModule = moduleName) {
  const templateSelection = { categoryRef: 'calendarScheduling', targetPage: 'page11' as const, experiencePage: null, experienceId: null, styleId: null, layoutId: null, reason: 'Fixture guidance.', requirementsMet: [], digest: `sha256:${'1'.repeat(64)}`, sources: [] };
  const coverage = [{ organismId: 'organism.content.1', sourceIndex: 0, kind: 'content', contentRef: 'base', scenarioRefs: ['base'], capabilityRefs: [], outputFieldsByCapability: {}, moleculeRecommendations: [] }];
  return renderD2Page({ device, pageId, pageLabel: pageId, pageIntent: 'Read published content.', actors: [], authorityRefs: [], operationBindings: [], descriptions: [description(pageId, device)], templateSelection, coverage, pipeline: [buildD2PagePipeline(currentModule, pageId, device, 'calendarScheduling', skill, templateSelection, coverage)] }, currentModule === 'renamed' ? 817263 : undefined);
}
function replacePipeline(all: D2FinalSource[], pageId: string, kind: D2FinalSource['kind'], patch: Record<string, unknown>): D2FinalSource[] {
  return all.map(file => {
    if (file.pageId !== pageId || file.kind !== kind) return file;
    const match = /export const pipeline = ([\s\S]*?) as const;/.exec(file.source)!;
    const raw = JSON.parse(match[1]); const item = Array.isArray(raw) ? raw[0] : raw;
    const changed = Array.isArray(raw) ? [{ ...item, ...patch }] : { ...item, ...patch };
    return { ...file, source: file.source.replace(match[1], JSON.stringify(changed, null, 2)) };
  });
}

function renamedSources(): D2FinalSource[] {
  return (['contract', 'shared', 'desktopPage', 'mobilePage'] as const).map(kind => ({
    pageId: 'items', kind, path: `l2/renamed/web/${kind}/items.defs.ts`, source: 'export const value = 1;',
  }));
}

function simulatedStudio(sources: D2FinalSource[], calls: string[]): D2StudioCompiler {
  const byPath = new Map(sources.map(file => [file.path, file.source]));
  const models = new Map<string, D2CompilerModel>();
  const pathOf = (info: { level: number; folder: string; shortName: string; extension: string }) => `l${info.level}/${info.folder}/${info.shortName}${info.extension}`;
  return {
    available: () => true,
    readStor: async info => byPath.get(pathOf(info)) ?? null,
    getModel: async info => {
      const path = pathOf(info);
      const source = byPath.get(path);
      if (source === undefined) return null;
      const model = models.get(path) ?? { model: { getValue: () => source } };
      models.set(path, model);
      return model;
    },
    preload: async () => [],
    compile: async info => {
      const path = pathOf(info);
      calls.push(path);
      const model = models.get(path)!;
      const source = model.model.getValue();
      const options: ts.CompilerOptions = { noLib: true, noEmit: true, strict: true };
      const host = ts.createCompilerHost(options);
      host.getSourceFile = (name, version) => name === 'fixture.ts' ? ts.createSourceFile(name, source, version) : undefined;
      host.fileExists = name => name === 'fixture.ts';
      host.readFile = name => name === 'fixture.ts' ? source : undefined;
      const program = ts.createProgram(['fixture.ts'], options, host);
      const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.file?.fileName === 'fixture.ts');
      model.compilerResults = { errors: diagnostics };
      return { errors: diagnostics.map(item => `TS${item.code}: ${ts.flattenDiagnosticMessageText(item.messageText, ' ')}`) };
    },
    release: () => {},
  };
}

async function finalizeHost() {
  const project = 817263;
  const content = new Map<string, string>();
  const files: Record<string, unknown> = {};
  const key = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const put = (path: string, source: string) => {
    const match = /^l(\d+)\/(.+)\/([^/]+?)(\.defs\.ts|\.json)$/u.exec(path);
    assert.ok(match, path);
    const info = { project, level: Number(match[1]), folder: match[2], shortName: match[3], extension: match[4] };
    content.set(path, source);
    files[key(info)] = { ...info, status: 'changed', versionRef: '1', getValueInfo: async () => ({ content: content.get(path) }), getContent: async () => content.get(path) };
  };
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: project,
    stor: { files, getKeyToFile: key, localStor: { setContent: async (info: { level: number; folder: string; shortName: string; extension: string }, value: { content: string }) => {
      put(`l${info.level}/${info.folder}/${info.shortName}${info.extension}`, value.content);
    } } },
  };
  const l4 = [
    ['l4/renamed/module.defs.ts', {}],
    ['l4/renamed/journeys/index.defs.ts', { journeys: [] }],
    ['l4/renamed/ontology/index.defs.ts', { entities: [] }],
    ['l4/renamed/rules.defs.ts', {}],
    ['l4/renamed/workflows.defs.ts', {}],
    ['l4/renamed/access.defs.ts', {}],
    ['l4/renamed/integration.defs.ts', {}],
    ['l4/renamed/pool/l2/web/menu.json', {}],
    ['l4/renamed/pool/l1/web/needs.json', {}],
    ['l4/renamed/pool/l2/web/backend.json', {}],
    ['l4/renamed/pool/l2/web/effort.json', {}],
  ] as const;
  const digests = [];
  for (const [path, value] of l4) {
    const source = path.endsWith('.json') ? JSON.stringify(value) : `export const definition = ${JSON.stringify(value)} as const;`;
    put(path, source);
    digests.push({ path, sha256: await sha256Text(source), bytes: new TextEncoder().encode(source).length, schemaVersion: '' });
  }
  const emitted = filesForRenamed();
  const hashes = new Map<string, string>();
  for (const file of emitted) { put(file.path, file.source); hashes.set(file.path, await sha256Text(file.source)); }
  const old = page('old', 'renamed'); old.status = 'toRemove';
  const oldArtifacts = [];
  for (const destination of old.destinations) {
    const source = 'export const old = true;';
    put(destination.path, source);
    oldArtifacts.push({ pageId: 'old', kind: destination.kind, path: destination.path, sha256: await sha256Text(source) });
  }
  const snapshotHash = 'sha256:fixture';
  put('l2/renamed/pipeline/agentDefsL2/input.json', JSON.stringify({
    project, module: 'renamed', snapshotHash, sources: digests,
    selection: { writePageIds: ['items'], preservePageIds: [], pages: [page('items', 'renamed')], remove: [old], counts: { pages: 1, endpoints: 0, usecases: 0, destinations: 4, materializationItems: 3 } },
  }));
  put('l2/renamed/pipeline/agentDefsL2/pipeline.json', JSON.stringify({ status: 'inProgress', steps: Object.fromEntries(['entry10', 'input20', 'contracts30', 'shared40', 'pages50'].map(step => [step, { status: 'approved' }])) }));
  put('l2/renamed/pipeline/agentDefsL2/contracts.json', JSON.stringify({ schemaVersion: D2_CONTRACTS_VERSION, status: 'approved', snapshotHash, units: [{ pageId: 'items', status: 'approved', schemaVersion: D2_CONTRACTS_VERSION, artifactPath: emitted[0].path, sourceHash: hashes.get(emitted[0].path) }] }));
  put('l2/renamed/pipeline/agentDefsL2/shared.json', JSON.stringify({ schemaVersion: D2_SHARED_VERSION, status: 'approved', snapshotHash, units: [{ pageId: 'items', status: 'approved', schemaVersion: D2_SHARED_VERSION, artifactPath: emitted[1].path, sourceHash: hashes.get(emitted[1].path), pipelineItemId: 'items__l2_shared' }] }));
  put('l2/renamed/pipeline/agentDefsL2/pages.json', JSON.stringify({ schemaVersion: D2_PAGES_VERSION, status: 'approved', snapshotHash, units: [{ pageId: 'items', status: 'approved', schemaVersion: D2_PAGES_VERSION, artifactPaths: { desktop: emitted[2].path, mobile: emitted[3].path }, sourceHashes: { desktop: hashes.get(emitted[2].path), mobile: hashes.get(emitted[3].path) }, pipelineItemIds: { desktop: 'items__desktop__page11', mobile: 'items__mobile__page11' } }] }));
  put('l2/renamed/pipeline/agentDefsL2/finalize60/ownership.json', JSON.stringify({ schemaVersion: D2_FINALIZE_VERSION, project, module: 'renamed', artifacts: oldArtifacts }));
  put('l2/renamed/pipeline/agentDefsL2/finalize60/report.json', '{}');
  return { get: (path: string) => content.get(path) };
}

function filesForRenamed(): D2FinalSource[] { return files('items', true, 'renamed'); }
