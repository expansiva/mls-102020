/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2_215.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { fileInfoFromRef } from '/_102020_/l2/helpers/defsInput/io.js';
import { externalCatalogTexts } from '/_102020_/l2/helpers/defsInput/externalCatalog.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts, D2InputSnapshot } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { d2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import { d2ArtifactsWithCurrentNeeds } from '/_102020_/l2/helpers/needs/fromBundle.js';
import type { D2BffDesign, D2Grant, D2Menu, D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { d2BffAccess } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { deriveD2Page11Experience, type D2Page11Category } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import type { D2PageTemplateContext } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';
import { fromDecisionLists, readPageSchema } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import { approveD2PagesUnit, d2PageChoiceEnums, d2PageWriteKeys, type D2PagesContext, type D2PagesResponse, type D2PagesWriter } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { bffSchemaFor, d2BffApproved, d2BffContextFrom } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { d2SharedPageFrom, d2SharedSourceFor, D2_SHARED_VERSION, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { contractSourceFor, type D2Contracts70Page } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { L1_OPERATIONS } from '/_102021_/l2/helpers/l1Defs/operations.js';
import { readContractV2 } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../mls-102047');
const BASE = path.dirname(REPO);

function diskStor(): void {
  const stor = (globalThis as { mls: { stor: { getKeyToFile?: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => string; files: unknown } } }).mls.stor;
  stor.getKeyToFile = info => `${info.project}|${info.level}|${info.folder}|${info.shortName}${info.extension}`;
  stor.files = new Proxy({}, { get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    const [project, level, folder, name] = prop.split('|');
    const disk = path.join(BASE, `mls-${project}`, `l${level}`, folder, name);
    if (!existsSync(disk)) return undefined;
    return { status: 'active', getContent: async () => readFileSync(disk, 'utf8') };
  } });
}
const AGENTS_ROOT = '/tmp/d2_215';
const TAREFAS_ROOT = '/tmp/d2_215_tarefas';
const OPERATIONS = new Set<string>(L1_OPERATIONS);

function extract(root: string, commit: string, paths: string[]): void {
  const moduleName = paths[0].slice(paths[0].lastIndexOf('/') + 1);
  if (existsSync(path.join(root, 'l4', moduleName, 'pool/l1/web/needs.json'))) return;
  mkdirSync(root, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', commit, ...paths], { maxBuffer: 64 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${commit}`);
  const extracted = spawnSync('tar', ['-x', '-C', root], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

async function readWorkspaceRef(ref: string): Promise<string | null> {
  const info = fileInfoFromRef(ref);
  if (!info) return null;
  const disk = path.join(BASE, `mls-${info.project}`, `l${info.level}`, info.folder, `${info.shortName}${info.extension}`);
  return existsSync(disk) ? readFileSync(disk, 'utf8') : null;
}

function readAt(root: string, rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}
function jsonAt<T>(root: string, rel: string): T {
  return JSON.parse(readAt(root, rel)) as T;
}

async function artifactsAt(root: string, moduleName: string): Promise<D2InputArtifacts> {
  const base = `l4/${moduleName}`;
  const defs = (rel: string): Record<string, unknown> => {
    const parsed = parseNs4ClassicDefsSource<Record<string, unknown>>(readAt(root, rel));
    if (!parsed) throw new Error(`INVALID_DEFS_SOURCE: ${rel}`);
    return parsed;
  };
  const journeyIndex = defs(`${base}/journeys/index.defs.ts`);
  const ontologyIndex = defs(`${base}/ontology/index.defs.ts`);
  const journeyIds = ((journeyIndex.journeys as Array<{ journeyId?: string }> | undefined) ?? []).map(row => String(row.journeyId));
  const entityIds = ((ontologyIndex.entities as Array<{ entityId?: string }> | undefined) ?? []).map(row => String(row.entityId));
  const texts = new Map<string, string>();
  const parsed = new Map<string, Record<string, unknown>>();
  const load = (rel: string) => {
    const source = readAt(root, rel);
    texts.set(rel, source);
    parsed.set(rel, parseNs4ClassicDefsSource<Record<string, unknown>>(source) ?? {});
  };
  for (const rel of [
    `${base}/module.defs.ts`, `${base}/journeys/index.defs.ts`, `${base}/ontology/index.defs.ts`,
    `${base}/rules.defs.ts`, `${base}/workflows.defs.ts`, `${base}/access.defs.ts`, `${base}/integration.defs.ts`,
    ...journeyIds.map(id => `${base}/journeys/${id}.defs.ts`),
    ...entityIds.map(id => `${base}/ontology/${id}.defs.ts`),
  ]) load(rel);
  const sources: D2InputArtifacts['sources'] = [];
  for (const [rel, source] of texts) {
    sources.push({ path: rel, sha256: await sha256Text(source), bytes: source.length, schemaVersion: String(parsed.get(rel)?.schemaVersion ?? '') });
  }
  const id = (rel: string) => rel.slice(rel.lastIndexOf('/') + 1).replace(/\.defs\.ts$/u, '');
  return {
    sources,
    module: parsed.get(`${base}/module.defs.ts`),
    journeyIndex,
    journeys: Object.fromEntries(journeyIds.map(item => [item, parsed.get(`${base}/journeys/${item}.defs.ts`)])),
    ontologyIndex,
    entities: Object.fromEntries(entityIds.map(item => [item, parsed.get(`${base}/ontology/${item}.defs.ts`)])),
    rules: parsed.get(`${base}/rules.defs.ts`),
    workflows: parsed.get(`${base}/workflows.defs.ts`),
    access: parsed.get(`${base}/access.defs.ts`),
    integration: parsed.get(`${base}/integration.defs.ts`),
    menu: jsonAt(root, `${base}/pool/l2/web/menu.json`),
    needs: jsonAt(root, `${base}/pool/l1/web/needs.json`),
    backend: jsonAt(root, `${base}/pool/l2/web/backend.json`),
    effort: jsonAt(root, `${base}/pool/l2/web/effort.json`),
  };
}

async function opened(artifacts: D2InputArtifacts, moduleName: string, recalc: boolean): Promise<{ snapshot: D2InputSnapshot; artifacts: D2InputArtifacts }> {
  const current = recalc ? d2ArtifactsWithCurrentNeeds(artifacts) : { artifacts, changedPageIds: [] as string[] };
  const snapshot = await buildD2InputSnapshot({ project: 102047, module: moduleName }, current.artifacts, null, []);
  return { snapshot, artifacts: current.artifacts };
}

function pageOf(snapshot: D2InputSnapshot, pageId: string) {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId);
  assert.ok(page, pageId);
  return page;
}

function writeEnum(schema: Record<string, unknown>): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.enum) && record.enum.every(item => typeof item === 'string') && record.enum.some(item => String(item).includes('.'))) found.push(...record.enum as string[]);
    Object.values(record).forEach(walk);
  };
  walk(schema);
  return [...new Set(found)];
}

function decisionOf(root: string, name: string): D2PagesResponse {
  const record = jsonAt<{ raw: { result: { arguments: unknown } } }>(root, `l2/agents/pipeline/agentDefsL2/pages50/responses/${name}.json`);
  return fromDecisionLists(record.raw.result.arguments) as D2PagesResponse;
}

function selectedGroups(root: string, pageId: string): Record<string, string[]> {
  const record = jsonAt<{ raw: { result: { arguments: { organisms: Array<{ organismId: string; groups: string[] }> } } } }>(root, `l2/agents/pipeline/agentDefsL2/pages50/responses/${pageId}-groups-1.json`);
  return Object.fromEntries(record.raw.result.arguments.organisms.map(item => [item.organismId, item.groups]));
}

function templateOf(): D2PageTemplateContext {
  const catalog = readFileSync(new URL('../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8');
  const categories = (JSON.parse(catalog) as { categories: D2Page11Category[] }).categories;
  const templatePaths = new Set<string>();
  for (const item of categories) {
    const key = item.experiences?.page11 ? 'page11' : item.experiences?.page21 ? 'page21' : '';
    if (key) templatePaths.add(`templates/${item.categoryId}/${key}.md`);
  }
  return {
    categories, catalog, catalogHash: 'sha256:catalog', templatePaths,
    async select(category) {
      const experience = deriveD2Page11Experience(category, categories);
      const reference = category === 'bespoke' ? null : `_102020_/l4/collabux/templates/${category}/${categories.find(item => item.categoryId === category)?.experiences?.page11 ? 'page11' : 'page21'}.md`;
      return { experience, reason: `Derived ${experience}.`, reference, content: 'orientation', hash: 'sha256:template' };
    },
  };
}

function groupsFor(selected: Record<string, string[]>, response: D2PagesResponse): D2MoleculeGroup[] {
  const tags = new Set<string>();
  for (const device of ['desktop', 'mobile'] as const) {
    const molecules = (response[device].definition as { molecules?: Record<string, Array<{ preferred?: string; alternative?: string }>> }).molecules ?? {};
    for (const choices of Object.values(molecules)) for (const choice of choices) for (const tag of [choice.preferred, choice.alternative]) if (tag) tags.add(tag);
  }
  return [...new Set(Object.values(selected).flat())].map(groupId => ({
    groupId, purpose: groupId, indexReference: groupId, usageReference: groupId, tags: [...tags], scenarios: [],
    indexSource: groupId, indexText: groupId, usageSource: groupId, usageText: groupId,
  }));
}

async function contextFor(view: { snapshot: D2InputSnapshot; artifacts: D2InputArtifacts }, pageId: string, response: D2PagesResponse): Promise<D2PagesContext> {
  const selected = selectedGroups(AGENTS_ROOT, pageId);
  return {
    identity: { project: 102047, module: 'agents' }, snapshot: view.snapshot, artifacts: view.artifacts, page: pageOf(view.snapshot, pageId),
    template: templateOf(), inventory: { catalogProject: 102020, selectedBy: 'local', directDependencies: [], groups: [], sourceHash: 'sha256:inventory' },
    selectedGroups: selected, groups: groupsFor(selected, response), moleculeHashes: {}, skill: 'd2_215', prompt: 'd2_215',
  };
}

function memoryWriter(): { writer: D2PagesWriter; files: Map<string, unknown> } {
  const files = new Map<string, unknown>();
  const key = (info: { folder: string; shortName: string; extension: string }) => `${info.folder}/${info.shortName}${info.extension}`;
  return { files, writer: { writeSource: async (info, source) => { files.set(key(info), source); }, writeJson: async (info, value) => { files.set(key(info), value); } } };
}

type OrganismMap = Record<string, { intents: Array<{ id: string; kind: string; to: string }>; kind: string; text: string }>;
type NeedsMap = Record<string, { submits: Array<{ intentId: string; write: string }> }>;

function organisms(response: D2PagesResponse, device: 'desktop' | 'mobile'): OrganismMap {
  return (response[device].definition as { organisms: OrganismMap }).organisms;
}
function needsOf(response: D2PagesResponse, device: 'desktop' | 'mobile'): NeedsMap {
  return (response[device].needs as { organisms: NeedsMap }).organisms;
}

function setWrite(response: D2PagesResponse, intentId: string, write: string): void {
  for (const device of ['desktop', 'mobile'] as const) {
    for (const unit of Object.values(needsOf(response, device))) {
      for (const submit of unit.submits) if (submit.intentId === intentId) submit.write = write;
    }
  }
}

function addSubmit(response: D2PagesResponse, organismId: string, intentId: string, write: string): void {
  for (const device of ['desktop', 'mobile'] as const) {
    organisms(response, device)[organismId].intents.push({ id: intentId, kind: 'submit', to: '' });
    needsOf(response, device)[organismId].submits.push({ intentId, write });
  }
}

function satisfiable(response: D2PagesResponse, keys: readonly string[]): D2PagesResponse {
  const next = structuredClone(response);
  const plus = (needle: string) => {
    const key = keys.find(item => item.includes(needle));
    assert.ok(key, needle);
    return key;
  };
  if (keys.some(key => key.startsWith('AgentTool.'))) setWrite(next, 'suggestTools', plus('+readAgent+runAiPrompt'));
  if (keys.some(key => key.startsWith('AgentBehavior.'))) {
    setWrite(next, 'requestBehaviorChange', plus('+updateAgent'));
    addSubmit(next, 'behaviorChangeRequest', 'undoBehaviorChange', plus('+undoAgentChange'));
  }
  return next;
}

function schemaMiss(schema: Record<string, unknown>, value: unknown, at: string): string | undefined {
  const branches = schema.anyOf;
  if (Array.isArray(branches)) {
    const misses = branches.map(branch => schemaMiss(branch as Record<string, unknown>, value, at));
    return misses.some(item => !item) ? undefined : misses.filter(Boolean).join(' | ');
  }
  if (schema.type === 'null') return value === null ? undefined : `${at} is not null`;
  if (schema.type === 'boolean') return typeof value === 'boolean' ? undefined : `${at} is not boolean`;
  if (schema.type === 'string') {
    if (typeof value !== 'string') return `${at} is not string`;
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return `${at} is not in the enum`;
    if (typeof schema.pattern === 'string' && !(new RegExp(schema.pattern, 'u')).test(value)) return `${at} misses the pattern`;
    return undefined;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${at} is not a list`;
    const items = schema.items as Record<string, unknown> | undefined;
    if (!items) return undefined;
    for (let index = 0; index < value.length; index += 1) {
      const miss = schemaMiss(items, value[index], `${at}.${index}`);
      if (miss) return miss;
    }
    return undefined;
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `${at} is not an object`;
    const row = value as Record<string, unknown>;
    for (const key of (schema.required as string[] | undefined) ?? []) if (!(key in row)) return `${at}.${key} is required`;
    const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(row)) if (!(key in properties)) return `${at}.${key} is not a property`;
    }
    for (const [key, child] of Object.entries(properties)) if (key in row) {
      const miss = schemaMiss(child, row[key], `${at}.${key}`);
      if (miss) return miss;
    }
  }
  return undefined;
}

function fillOrigins(design: D2BffDesign): void {
  const leaves = (rows: Array<{ origin?: unknown }> | undefined) => { for (const row of rows ?? []) if (!('origin' in row)) row.origin = null; };
  for (const type of design.types) leaves(type.fields);
  for (const endpoint of design.endpoints) { leaves(endpoint.input); leaves(endpoint.output); }
}

function commandFromSchema(design: D2BffDesign, when: string, write: string): void {
  const sample = design.endpoints.find(item => item.kind === 'cmd' && item.writes === 'AgentTool.create');
  assert.ok(sample, 'enable command');
  const command = structuredClone(sample);
  command.id = when;
  command.when = when;
  command.writes = write;
  design.endpoints.push(command);
  const tree = design.endpoints.find(item => item.id === 'getAgentToolTree');
  assert.ok(tree);
  tree.output.push({ name: 'definition', type: 'string', origin: { kind: 'field', paths: ['Agent.definition'] } });
  const step = design.bindings.journeys.find(item => item.step === 'adjustAgentTools/suggestTools');
  assert.ok(step);
  step.endpoints = [when];
  step.organisms = ['agentToolTree'];
  delete step.continuesIn;
  design.bindings.organisms.push({ organism: 'agentToolTree', reads: 'getAgentToolTree.definition' });
  design.bindings.commands.push({ endpoint: when, refreshes: [] });
  design.bindings.updates.push({ endpoint: when, state: 'getAgentToolTree.actions', mode: 'upsert' });
  fillOrigins(design);
}

/** One command per behavior submit. Writes and the selection shape are values the bff55 schema enum already offers. */
function behaviorCommands(design: D2BffDesign, updateKey: string, undoKey: string): void {
  const sample = design.endpoints.find(item => item.kind === 'cmd' && item.id === 'requestBehaviorChange');
  assert.ok(sample, 'requestBehaviorChange');
  sample.writes = updateKey;
  const undo = structuredClone(sample);
  undo.id = 'undoBehaviorChange';
  undo.when = 'undoBehaviorChange';
  undo.writes = undoKey;
  design.endpoints.push(undo);
  const undoStep = design.bindings.journeys.find(item => item.step === 'changeAgentBehavior/undoBehaviorChange');
  assert.ok(undoStep);
  undoStep.endpoints = undoStep.endpoints.map(item => item === 'requestBehaviorChange' ? 'undoBehaviorChange' : item);
  design.bindings.commands.push({ endpoint: 'undoBehaviorChange', refreshes: ['listBehaviorChanges'] });
  const selections = design.bindings.selections as unknown as Array<{ via: Record<string, string> }>;
  for (const row of selections) {
    if (!row.via.kind) row.via = { kind: row.via.list ? 'list' : 'query', ref: row.via.list || row.via.query || '' };
  }
  fillOrigins(design);
}

test('d2_215 a schema-only answer of de566c90 passes every production gate', async () => {
  diskStor();
  extract(AGENTS_ROOT, 'de566c90', ['l2/agents', 'l4/agents']);
  extract(TAREFAS_ROOT, 'HEAD', ['l2/tarefas', 'l4/tarefas']);
  const view = await opened(await artifactsAt(AGENTS_ROOT, 'agents'), 'agents', true);
  let toolsFiles: Map<string, unknown> | null = null;
  let behaviorFiles: Map<string, unknown> | null = null;
  for (const pageId of ['agent_tools', 'agent_behavior'] as const) {
    const file = pageId === 'agent_tools' ? 'agent_tools-decision-2' : 'agent_behavior-decision-1';
    const refused = decisionOf(AGENTS_ROOT, file);
    const context = await contextFor(view, pageId, refused);
    const keys = d2PageWriteKeys(context.page);
    const offered = writeEnum(await readPageSchema(d2PageChoiceEnums(context)));
    assert.ok(keys.every(key => offered.includes(key)), `${pageId} enum ${offered.join(', ')} keys ${keys.join(', ')}`);
    assert.ok(keys.some(key => key.includes('+')), keys.join(', '));
    const { writer, files } = memoryWriter();
    await assert.rejects(() => approveD2PagesUnit(context, refused, 0, 0, writer), /D2_PAGE11_WRITE_UNCOVERED|D2_PAGE11_SUBMIT_WRITE|D2_PAGE11_WRITE_DUPLICATE/u);
    const fixed = satisfiable(refused, keys);
    const used = new Set<string>();
    for (const device of ['desktop', 'mobile'] as const) for (const unit of Object.values(needsOf(fixed, device))) for (const submit of unit.submits) used.add(submit.write);
    for (const write of used) assert.ok(offered.includes(write), write);
    await approveD2PagesUnit(context, fixed, 0, 0, writer);
    if (pageId === 'agent_tools') toolsFiles = files;
    if (pageId === 'agent_behavior') behaviorFiles = files;
  }
  assert.ok(toolsFiles);
  const textOf = (device: 'desktop' | 'mobile') => {
    const source = toolsFiles!.get(`agents/web/${device}/page11/agent_tools.defs.ts`);
    assert.equal(typeof source, 'string');
    return source as string;
  };
  const draftOf = (device: 'desktop' | 'mobile') => toolsFiles!.get(`agents/pipeline/agentDefsL2/page11Needs/agent_tools${device === 'desktop' ? 'Desktop' : 'Mobile'}.json`);
  const need = (view.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === 'agent_tools');
  assert.ok(need);
  const bff = d2BffContextFrom({
    pageId: 'agent_tools',
    page11Text: { desktop: textOf('desktop'), mobile: textOf('mobile') },
    drafts: { desktop: draftOf('desktop'), mobile: draftOf('mobile') },
    need,
    menu: view.artifacts.menu as D2Menu,
    module: view.artifacts.module,
    entities: view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    access: view.artifacts.access,
    rules: view.artifacts.rules,
    journeys: view.artifacts.journeys,
    integration: view.artifacts.integration,
  });
  const bffSchema = bffSchemaFor({ ...bff, identity: { project: 102047, module: 'agents' }, inputHash: '', prompt: '', approved: null });
  const bffEnum = writeEnum(bffSchema);
  const split = bffEnum.find(key => key.includes('+readAgent+runAiPrompt'));
  assert.ok(split, bffEnum.join(', '));
  const design = jsonAt<D2BffDesign>(AGENTS_ROOT, 'l2/agents/pipeline/agentDefsL2/bff/agent_tools.json');
  commandFromSchema(design, 'suggestTools', split);
  for (const endpoint of design.endpoints) if (endpoint.writes) assert.ok(bffEnum.includes(endpoint.writes), endpoint.writes);
  assert.equal(schemaMiss(bffSchema, design, 'design'), undefined);
  const approved = d2BffApproved(bff, design);
  const grants = ((view.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? []);
  const sharedPage = d2SharedPageFrom({
    identity: { project: 102047, module: 'agents' }, inputHash: view.snapshot.snapshotHash, pageId: 'agent_tools',
    page11Text: { desktop: textOf('desktop'), mobile: textOf('mobile') },
    drafts: { desktop: draftOf('desktop'), mobile: draftOf('mobile') },
    need, menu: view.artifacts.menu as D2Menu, grants, entities: view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    design: approved, siblings: [],
  });
  const sharedSource = d2SharedSourceFor(sharedPage);
  const sharedReceipt: D2SharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, project: 102047, module: 'agents', pageId: 'agent_tools', inputHash: view.snapshot.snapshotHash,
    page11Hashes: { desktop: '', mobile: '' }, draftHashes: { desktop: '', mobile: '' },
    designHash: await sha256Text(JSON.stringify(approved)), siblingsHash: '', sourceHash: await sha256Text(sharedSource),
  };
  const page11 = { desktop: parseD2Page11Definition(textOf('desktop')).definition, mobile: parseD2Page11Definition(textOf('mobile')).definition };
  const contractPage: D2Contracts70Page = {
    identity: { project: 102047, module: 'agents' }, pageId: 'agent_tools', userLanguage: (view.artifacts.menu as D2Menu).userLanguage || 'en',
    design: approved, access: d2BffAccess(approved, need, grants), entities: view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    sharedSource, sharedReceipt, page11, destinations: {},
  };
  const source = await contractSourceFor(contractPage);
  const read = readContractV2({ agent_tools: source }).get('agent_tools');
  assert.ok(read, 'L1 readContractV2');
  for (const route of read.routes) {
    if (route.kind !== 'cmd' || !route.writes) continue;
    const written = route.writes.slice(route.writes.indexOf('.') + 1);
    assert.equal(route.writes.includes('+'), false, route.writes);
    assert.ok(OPERATIONS.has(written), route.writes);
  }

  assert.ok(behaviorFiles);
  const behaviorText = (device: 'desktop' | 'mobile') => {
    const source = behaviorFiles!.get(`agents/web/${device}/page11/agent_behavior.defs.ts`);
    assert.equal(typeof source, 'string');
    return source as string;
  };
  const behaviorDraft = (device: 'desktop' | 'mobile') => behaviorFiles!.get(`agents/pipeline/agentDefsL2/page11Needs/agent_behavior${device === 'desktop' ? 'Desktop' : 'Mobile'}.json`);
  const behaviorNeed = (view.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === 'agent_behavior');
  assert.ok(behaviorNeed);
  const catalogs = await externalCatalogTexts(view.artifacts.entities as Record<string, unknown>, { project: 102047, moduleName: 'agents', read: readWorkspaceRef });
  const behaviorBff = d2BffContextFrom({
    pageId: 'agent_behavior',
    page11Text: { desktop: behaviorText('desktop'), mobile: behaviorText('mobile') },
    drafts: { desktop: behaviorDraft('desktop'), mobile: behaviorDraft('mobile') },
    need: behaviorNeed,
    menu: view.artifacts.menu as D2Menu,
    module: view.artifacts.module,
    entities: view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    access: view.artifacts.access,
    rules: view.artifacts.rules,
    journeys: view.artifacts.journeys,
    integration: view.artifacts.integration,
    catalogs: catalogs.texts,
    catalogGaps: catalogs.unresolved,
  });
  const behaviorSchema = bffSchemaFor({ ...behaviorBff, identity: { project: 102047, module: 'agents' }, inputHash: '', prompt: '', approved: null });
  const behaviorEnum = writeEnum(behaviorSchema);
  const updateKey = behaviorEnum.find(key => key.includes('+updateAgent'));
  const undoKey = behaviorEnum.find(key => key.includes('+undoAgentChange'));
  assert.ok(updateKey, behaviorEnum.join(', '));
  assert.ok(undoKey, behaviorEnum.join(', '));
  const behaviorDesign = jsonAt<D2BffDesign>(AGENTS_ROOT, 'l2/agents/pipeline/agentDefsL2/bff/agent_behavior.json');
  behaviorCommands(behaviorDesign, updateKey, undoKey);
  for (const endpoint of behaviorDesign.endpoints) if (endpoint.writes) assert.ok(behaviorEnum.includes(endpoint.writes), endpoint.writes);
  assert.equal(schemaMiss(behaviorSchema, behaviorDesign, 'design'), undefined);
  const behaviorApproved = d2BffApproved(behaviorBff, behaviorDesign);
  const behaviorShared = d2SharedPageFrom({
    identity: { project: 102047, module: 'agents' }, inputHash: view.snapshot.snapshotHash, pageId: 'agent_behavior',
    page11Text: { desktop: behaviorText('desktop'), mobile: behaviorText('mobile') },
    drafts: { desktop: behaviorDraft('desktop'), mobile: behaviorDraft('mobile') },
    need: behaviorNeed, menu: view.artifacts.menu as D2Menu, grants, entities: view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    design: behaviorApproved, siblings: [],
  });
  const behaviorSource = d2SharedSourceFor(behaviorShared);
  const behaviorReceipt: D2SharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, project: 102047, module: 'agents', pageId: 'agent_behavior', inputHash: view.snapshot.snapshotHash,
    page11Hashes: { desktop: '', mobile: '' }, draftHashes: { desktop: '', mobile: '' },
    designHash: await sha256Text(JSON.stringify(behaviorApproved)), siblingsHash: '', sourceHash: await sha256Text(behaviorSource),
  };
  const behaviorPage11 = { desktop: parseD2Page11Definition(behaviorText('desktop')).definition, mobile: parseD2Page11Definition(behaviorText('mobile')).definition };
  const behaviorContract: D2Contracts70Page = {
    identity: { project: 102047, module: 'agents' }, pageId: 'agent_behavior', userLanguage: (view.artifacts.menu as D2Menu).userLanguage || 'en',
    design: behaviorApproved, access: d2BffAccess(behaviorApproved, behaviorNeed, grants), entities: view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    sharedSource: behaviorSource, sharedReceipt: behaviorReceipt, page11: behaviorPage11, destinations: {},
  };
  const behaviorContractSource = await contractSourceFor(behaviorContract);
  const behaviorRead = readContractV2({ agent_behavior: behaviorContractSource }).get('agent_behavior');
  assert.ok(behaviorRead, 'L1 readContractV2 agent_behavior');
  const behaviorWrites = behaviorRead.routes.filter(route => route.kind === 'cmd' && route.writes).map(route => route.writes);
  assert.deepEqual(behaviorWrites, ['AgentBehavior.update', 'AgentBehavior.update']);

  const tarefas = await opened(await artifactsAt(TAREFAS_ROOT, 'tarefas'), 'tarefas', true);
  const tarefasPage = pageOf(tarefas.snapshot, tarefas.snapshot.selection.pages[0].pageId);
  const tarefasKeys = d2PageWriteKeys(tarefasPage);
  const bare = tarefasPage.writes.map(write => d2WriteKey({ entity: write.entity, operation: write.operation, ...(write.transitionRef ? { transitionRef: write.transitionRef } : {}) }));
  assert.deepEqual(tarefasKeys, bare);
  assert.equal(tarefasKeys.some(key => key.includes('+')), false);
  const tarefasSchema = writeEnum(await readPageSchema({ writeKeys: tarefasKeys, categories: [], kinds: [], targets: [], tags: [] }));
  assert.deepEqual([...tarefasSchema].sort(), [...tarefasKeys].sort());
});
