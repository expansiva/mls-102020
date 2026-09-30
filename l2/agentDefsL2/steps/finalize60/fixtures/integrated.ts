import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { D2_INPUT_VERSION, type D2InputSnapshot, type D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { destinationsFor } from '/_102020_/l2/agentDefsL2/steps/input20/gate.js';
import { readD2InputBundle } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { generateD2Contracts, sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { approveD2SharedUnit, finalizeD2SharedBarrier } from '/_102020_/l2/agentDefsL2/steps/shared40/run.js';
import { suggestedD2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { approveD2PagesUnit, buildD2PageMoleculeNeeds, finalizeD2PagesBarrier, getD2PagesContext } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { D2_PAGES_JUDGMENT_VERSION } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { buildD2MoleculeInventory, type D2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { buildD2MoleculeShortlist, resolveD2MoleculeResearch } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { D2_PAGE_TECHNICAL_SKILL } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { compileD2FinalSources, type D2CompilerModel } from '/_102020_/l2/agentDefsL2/steps/finalize60/compile.js';
import type { D2FinalSource } from '/_102020_/l2/agentDefsL2/steps/finalize60/gate.js';
import ts from 'typescript';

export const identity = { project: 817263, module: 'libraryReview' };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../../');
type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
export async function integratedHost(ids = ['catalog', 'policies'], runIdentity = identity) {
  const identity = runIdentity;
  const content = new Map<string, string>(); const files: Record<string, any> = {}; const writes: string[] = [];
  let failWrite = '';
  const parse = (ref: string): Info => {
    const match = /^(?:_(\d+)_\/)?l([24])\/(?:(.+)\/)?([^/]+?)(\.defs\.ts|\.ts|\.json|\.md)$/u.exec(ref);
    if (!match) throw new Error(ref);
    return { project: Number(match[1] || identity.project), level: Number(match[2]), folder: match[3] || '', shortName: match[4], extension: match[5] };
  };
  const refOf = (info: Info) => `${info.project === identity.project ? '' : `_${info.project}_/`}l${info.level}/${info.folder ? `${info.folder}/` : ''}${info.shortName}${info.extension}`;
  const put = (ref: string, text: string) => {
    const info = parse(ref); content.set(ref, text);
    files[refOf(info)] = { ...info, status: 'changed', versionRef: '1', getContent: async () => content.get(ref) || '', getValueInfo: async () => ({ content: content.get(ref) || '' }) };
  };
  (globalThis as any).mls = { actualProject: identity.project, stor: { files, getKeyToFile: refOf, localStor: { setContent: async (info: Info, value: { content: string }) => {
    const ref = refOf(info); if (failWrite === ref) throw new Error('simulated write failure'); put(ref, value.content); writes.push(ref);
  } } } };
  const prefix = `l2/${identity.module}/pipeline/agentDefsL2`;
  for (const name of ['input', 'pipeline', 'contracts', 'shared', 'pages', 'finalize60/report', 'finalize60/ownership']) put(`${prefix}/${name}.json`, '');
  const pages: D2SelectedPage[] = ids.map(pageId => ({ pageId, status: 'toCreate', label: pageId, actors: [], authorityRefs: [], ancestors: [], journeyRefs: [], organisms: [{ kind: 'content', text: `Read the published ${pageId} guidance.` }], reads: [], writes: [], endpoints: [], usecases: [], operationBindings: [], destinations: destinationsFor(identity, pageId) }));
  for (const page of pages) {
    for (const destination of page.destinations) put(destination.path, '');
    for (const step of ['contracts30', 'shared40', 'pages50']) { put(`${prefix}/${step}/results/${page.pageId}.json`, ''); put(`${prefix}/${step}/drafts/${page.pageId}.json`, ''); }
  }
  const l4 = `l4/${identity.module}`;
  for (const name of ['module', 'journeys/index', 'ontology/index', 'rules', 'workflows', 'access', 'integration']) put(`${l4}/${name}.defs.ts`, 'export const definition = {} as const;');
  for (const name of ['l2/web/menu', 'l1/web/needs', 'l2/web/backend', 'l2/web/effort']) put(`${l4}/pool/${name}.json`, '{}');
  put('l2/designSystem.ts', 'export const palette = "blue";');
  for (const ref of ['_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.ts', D2_PAGE_TECHNICAL_SKILL, '_102020_/l2/agentDefsL2/skills/pageCategories/bespoke.md']) {
    put(ref, readFileSync(path.join(root, ref.replace('_102020_/', 'mls-102020/')), 'utf8'));
  }
  const bundle = await readD2InputBundle(identity);
  const digest = (name: string) => bundle.artifacts.sources.find(source => source.path === `${l4}/${name}.defs.ts`)!;
  const snapshot = { ...identity, schemaVersion: D2_INPUT_VERSION, device: 'web', releaseIdentity: null, snapshotHash: await sha256Text(JSON.stringify(ids)), sources: bundle.artifacts.sources,
    l4: { module: digest('module'), journeyIndex: digest('journeys/index'), ontologyIndex: digest('ontology/index'), integration: digest('integration'), access: digest('access'), rules: digest('rules'), workflows: digest('workflows'), entities: [], journeys: [] },
    selection: { pages, writePageIds: ids, preservePageIds: [], remove: [], counts: { pages: ids.length, endpoints: 0, usecases: 0, destinations: ids.length * 4, materializationItems: ids.length * 3 } }, normalizations: [], problems: [],
  } as D2InputSnapshot;
  put(`${prefix}/input.json`, JSON.stringify(snapshot));
  put(`${prefix}/pipeline.json`, JSON.stringify({ status: 'inProgress', steps: Object.fromEntries(['entry10','input20','contracts30','shared40','pages50'].map(step => [step, { status: 'approved' }])) }));
  const state = { present: false, usage: 'Use a readable surface.', group: 'Readable reference content.' };
  const molecular: D2MoleculeCatalogPort = {
    discover: async () => ({ activeProject: identity.project, directDeps: state.present ? [817264] : [], resolvedDeps: state.present ? [817264] : [], candidates: state.present ? [817264] : [], project: state.present ? 817264 : null, selectedBy: state.present ? 'dependency' : null, error: '', warnings: [] }),
    readLevel1: async () => ({ level1: { project: 817264, reference: '/_817264_/l2/molecules/skill', via: 'stor', groups: [], skill: state.group, theme: '' }, error: '' }),
    readGroup: async () => ({ catalog: null, error: 'No shortlisted groups' }),
    readUsageContract: async () => ({ contract: null, error: 'No shortlisted groups' }),
  };
  const skills = { categories: [{ categoryRef: 'bespoke', name: 'Bespoke', meaning: 'Static reference', skillReference: '_102020_/l2/agentDefsL2/skills/pageCategories/bespoke.md' }], context: '{}', catalogHash: 'catalog', contextHash: 'skills', skillHashes: { [D2_PAGE_TECHNICAL_SKILL]: await sha256Text(content.get(D2_PAGE_TECHNICAL_SKILL)!) } };
  const compile = async (_identity: typeof identity, sources: D2FinalSource[]) => {
    const proof = await compileProof(_identity, sources, new Map(await Promise.all(sources.map(async source => [source.path, await sha256Text(source.source)] as const))));
    if (proof.some(item => item.status !== 'passed')) throw new Error(`D2_TYPESCRIPT_COMPILE_FAILED: ${proof.flatMap(item => item.diagnostics).join(';')}`);
  };
  const compileProof: typeof compileD2FinalSources = async (_identity, sources, hashes) => {
    const models = new Map<string, D2CompilerModel>();
    return compileD2FinalSources(identity, sources, hashes, {
      available: () => true, readStor: async info => content.get(refOf(info)) || null,
      getModel: async info => { const ref = refOf(info); if (!content.has(ref)) return null; let model = models.get(ref); if (!model) { model = { model: { getValue: () => content.get(ref)! } }; models.set(ref, model); } return model; },
      preload: async () => [], compile: async info => {
        const ref = refOf(info); const source = content.get(ref)!; const options = { noLib: true, noEmit: true, strict: true };
        const host = ts.createCompilerHost(options); host.getSourceFile = (name, version) => name === 'fixture.ts' ? ts.createSourceFile(name, source, version) : undefined; host.fileExists = name => name === 'fixture.ts'; host.readFile = name => name === 'fixture.ts' ? source : undefined;
        const errors = ts.getPreEmitDiagnostics(ts.createProgram(['fixture.ts'], options, host)).filter(diagnostic => diagnostic.file).map(diagnostic => `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
        models.get(ref)!.compilerResults = { errors }; return { errors };
      }, release() {},
    });
  };
  await generateD2Contracts(identity, snapshot, bundle.artifacts, undefined, compile);
  const shared = async (pageId: string) => approveD2SharedUnit(identity, snapshot, bundle.artifacts, pageId, suggestedD2SharedJudgment(pages.find(page => page.pageId === pageId)!, { pageId, calls: [] }), 1, undefined, compile);
  for (const pageId of ids) await shared(pageId);
  await finalizeD2SharedBarrier(identity, snapshot);
  const approve = async (pageId: string, attempt = 1, compiler = compile) => {
    const context = await getD2PagesContext(identity, snapshot, pageId);
    const needs = buildD2PageMoleculeNeeds(pageId, context.page, context.definition);
    const inventory = await buildD2MoleculeInventory(molecular);
    const research = await resolveD2MoleculeResearch(await buildD2MoleculeShortlist(molecular, inventory, needs, needs.map(need => ({ needId: need.needId, groups: [] }))), needs.map(need => ({ needId: need.needId, roles: [], noMatchReason: 'No published group for this reference content.' })));
    return approveD2PagesUnit(identity, snapshot, pageId, { schemaVersion: D2_PAGES_JUDGMENT_VERSION, pageId, pageIntent: `Read ${pageId}.`, category: { categoryRef: 'bespoke', reason: 'Static reference content.', evidenceRefs: ['base'] }, presentations: (['desktop','mobile'] as const).map(device => ({ device, descriptions: [{ organismId: 'organism.content.1', kind: 'content', description: `Read ${pageId} with ${device === 'mobile' ? 'touch and narrow viewport' : 'keyboard and wide viewport'} accessibility.`, contentRef: 'contentContent', capabilityRefs: [], outputFieldRefs: [] }] })), moleculeResearch: [] }, research, { port: molecular }, skills, attempt, undefined, undefined, compiler);
  };
  return { identity, snapshot, content, files, writes, put, prefix, molecular, skills, state, approve, shared, compile, compileProof, get failWrite() { return failWrite; }, set failWrite(value: string) { failWrite = value; }, finishPages: () => finalizeD2PagesBarrier(identity, snapshot, undefined, skills, { port: molecular }) };
}
