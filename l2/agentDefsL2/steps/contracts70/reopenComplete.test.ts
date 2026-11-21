/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/reopenComplete.test.ts" enhancement="_blank"/>

/**
 * d2_201: a complete agents pipeline recorded before the contracts70 code change (mls-102047@9e8b640a),
 * rerun without /pages. Model ports throw. contracts70 rewrites; bff55 and shared60 reuse.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { externalCatalogTexts } from '/_102020_/l2/helpers/defsInput/externalCatalog.js';
import { fileInfoFromRef, type D2ReadBundle } from '/_102020_/l2/helpers/defsInput/io.js';
import type { D2InputArtifacts, D2InputSnapshot, D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { d2BffAccess, type D2BffDesign, type D2Grant, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { d2Page11Base, parseD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { parseD2SharedV2 } from '/_102020_/l2/helpers/sharedV2/format.js';
import { beforePromptStep as bffDispatch } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.js';
import { bffReceiptInfo, d2BffContextFrom, readApprovedD2Bff, type D2BffReceipt } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { reusableD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2BffPage.js';
import { reusableD2Page, type D2PagesReusePort } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import { buildD2MoleculeInventory, readD2MoleculeShortlist } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';
import { loadD2PageTemplateContext } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';
import { type D2PagesContext, type D2PagesReceipt } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { d2SharedPageFrom, executeD2Shared, receiptInfo as sharedReceiptInfo, sharedInfo, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { contractInfo, contractReceiptInfo, executeD2Contracts70, type D2Contracts70Receipt } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';
import { finalizeD2Pages } from '/_102020_/l2/agentDefsL2/steps/finalize80/run.js';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, 'fixtures/d2_201');
const identity: D2RunIdentity = { project: 102047, module: 'agents' };

const files = new Map<string, string>();
function remember(rel: string, text: string): void { files.set(rel, text); }
function textAt(rel: string): string {
  const hit = files.get(rel);
  if (hit !== undefined) return hit;
  const full = join(root, rel);
  if (!existsSync(full)) throw new Error(`fixture missing: ${rel}`);
  const text = readFileSync(full, 'utf8');
  files.set(rel, text);
  return text;
}
function jsonAt<T>(rel: string): T { return JSON.parse(textAt(rel)) as T; }

const absent = new Set(
  textAt('ABSENT.txt').split('\n').map(line => line.trim()).filter(line => line.length > 0 && !line.startsWith('#')),
);

function fixtureKey(project: number, rel: string): string {
  return project === identity.project ? rel : `external/${project}/${rel}`;
}

function readProject(project: number, rel: string): string | null {
  if (absent.has(`${project} ${rel}`)) return null;
  return textAt(fixtureKey(project, rel));
}

function readRef(ref: string): Promise<string | null> {
  const info = fileInfoFromRef(ref);
  if (!info) return Promise.resolve(null);
  return Promise.resolve(readProject(info.project, displayPath(info)));
}

function parseDefs(source: string, path: string): unknown {
  const parsed = parseNs4ClassicDefsSource<unknown>(source);
  if (!parsed) throw new Error(`INVALID_DEFS_SOURCE: ${path}`);
  return parsed;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function safeToken(value: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(value)) throw new Error(`UNSAFE_SOURCE_ID: ${value || '(missing)'}`);
  return value;
}
function idList(value: unknown, key: string): string[] {
  return Array.isArray(value) ? value.map(item => safeToken(text(record(item)[key]))) : [];
}

async function bundleOf(): Promise<D2ReadBundle> {
  const fixed = [
    'l4/agents/module.defs.ts', 'l4/agents/journeys/index.defs.ts', 'l4/agents/ontology/index.defs.ts',
    'l4/agents/rules.defs.ts', 'l4/agents/workflows.defs.ts', 'l4/agents/access.defs.ts', 'l4/agents/integration.defs.ts',
    'l4/agents/pool/l2/web/menu.json', 'l4/agents/pool/l1/web/needs.json', 'l4/agents/pool/l2/web/backend.json', 'l4/agents/pool/l2/web/effort.json',
  ];
  const parsed = new Map<string, unknown>();
  for (const path of fixed) parsed.set(path, path.endsWith('.json') ? jsonAt(path) : parseDefs(textAt(path), path));
  const journeyIds = idList(record(parsed.get('l4/agents/journeys/index.defs.ts')).journeys, 'journeyId');
  const entityIds = idList(record(parsed.get('l4/agents/ontology/index.defs.ts')).entities, 'entityId');
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const id of journeyIds) {
    const path = `l4/agents/journeys/${id}.defs.ts`;
    journeys[id] = parseDefs(textAt(path), path);
  }
  for (const id of entityIds) {
    const path = `l4/agents/ontology/${id}.defs.ts`;
    entities[id] = parseDefs(textAt(path), path);
  }
  const artifacts = {
    module: parsed.get('l4/agents/module.defs.ts'),
    journeyIndex: parsed.get('l4/agents/journeys/index.defs.ts'),
    journeys, ontologyIndex: parsed.get('l4/agents/ontology/index.defs.ts'), entities,
    rules: parsed.get('l4/agents/rules.defs.ts'), workflows: parsed.get('l4/agents/workflows.defs.ts'),
    access: parsed.get('l4/agents/access.defs.ts'), integration: parsed.get('l4/agents/integration.defs.ts'),
    menu: parsed.get('l4/agents/pool/l2/web/menu.json'), needs: parsed.get('l4/agents/pool/l1/web/needs.json'),
    backend: parsed.get('l4/agents/pool/l2/web/backend.json'), effort: parsed.get('l4/agents/pool/l2/web/effort.json'),
  } as D2InputArtifacts;
  if (Object.values(entities).some(entity => record(entity).kind === 'external')) {
    const loaded = await externalCatalogTexts(entities, { project: identity.project, moduleName: identity.module, read: readRef });
    artifacts.catalogs = loaded.texts;
    artifacts.catalogGaps = loaded.unresolved;
  }
  return { artifacts, files: [] };
}

function page11Path(pageId: string, device: D2Page11Device): string {
  return `l2/agents/web/${device}/page11/${pageId}.defs.ts`;
}
function draftPath(pageId: string, device: D2Page11Device): string {
  return `l2/agents/pipeline/agentDefsL2/page11Needs/${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}.json`;
}
function pairOf(pageId: string): { texts: Record<D2Page11Device, string>; drafts: Record<D2Page11Device, unknown> } {
  const texts = { desktop: d2Page11Base(textAt(page11Path(pageId, 'desktop'))), mobile: d2Page11Base(textAt(page11Path(pageId, 'mobile'))) };
  const drafts = { desktop: jsonAt(draftPath(pageId, 'desktop')), mobile: jsonAt(draftPath(pageId, 'mobile')) };
  return { texts, drafts };
}

const execution = { message: { orderAt: 'm', threadId: 't' }, task: { PK: 'task' }, isTest: true } as mls.msg.ExecutionContext;
function agentStep(planId: string, prompt: string): mls.msg.AIAgentStep {
  return { type: 'agent', stepId: 1, interaction: null, stepTitle: planId, status: 'waiting_human_input', nextSteps: [], agentName: planId, prompt, rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIAgentStep;
}

function diskText(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string | null {
  const rel = `l${info.level}/${info.folder}/${info.shortName}${info.extension}`;
  return readProject(info.project, rel);
}

void test('d2_201: a complete pipeline reruns contracts70 without calling the model', async () => {
  const previousMls = (globalThis as { mls?: { actualProject?: number; stor?: { files: unknown; getKeyToFile?: (info: Ns5FileInfo) => string } } }).mls;
  const storFiles: Record<string, { status: string; getContent: () => Promise<string> }> = {};
  (globalThis as { mls: { actualProject: number; l5: { getProjectDependencies: (project: number) => number[] }; stor: { files: typeof storFiles; getKeyToFile: (info: Ns5FileInfo) => string } } }).mls = {
    ...previousMls,
    actualProject: identity.project,
    l5: { ...(previousMls as { l5?: object } | undefined)?.l5, getProjectDependencies: (project: number) => project === 102047 ? [102040] : [] },
    stor: {
      files: storFiles,
      getKeyToFile: info => `${info.project}:${info.level}:${info.folder}/${info.shortName}${info.extension}`,
    },
  };
  const filesProxy = new Proxy(storFiles, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string' || prop in target) return Reflect.get(target, prop, receiver);
      const [project, level, rest] = prop.split(/:(?=[^:]*$)|:/u).length ? prop.split(':') : [];
      if (!project || !level || !rest) return undefined;
      const slash = rest.lastIndexOf('/');
      const folder = slash < 0 ? '' : rest.slice(0, slash);
      const base = slash < 0 ? rest : rest.slice(slash + 1);
      const dot = base.indexOf('.');
      const text = diskText({ project: Number(project), level: Number(level), folder, shortName: dot < 0 ? base : base.slice(0, dot), extension: dot < 0 ? '' : base.slice(dot) });
      if (text === null) return undefined;
      const file = { status: 'active', getContent: async () => text };
      target[prop] = file;
      return file;
    },
  });
  (globalThis as { mls: { stor: { files: unknown } } }).mls.stor.files = filesProxy;

  const snapshot = jsonAt<D2InputSnapshot>('l2/agents/pipeline/agentDefsL2/input.json');
  const bundle = await bundleOf();
  const ids = [...snapshot.selection.writePageIds].sort();
  const pipeline = jsonAt<Record<string, unknown>>('l2/agents/pipeline/agentDefsL2/pipeline.json');
  // o pipeline gravado foi aprovado com este prompt; a prova é que o contracts70 refaz o contrato sem chamar o modelo
  const promptBff = readFileSync(join(root, 'bff55PromptRecorded.md'), 'utf8');
  const promptPages = readFileSync(join(here, '../pages50/prompt.md'), 'utf8');
  const skill = readFileSync(join(here, '../../skills/genD2Page11Definition.ts'), 'utf8');

  const pagesPort: D2PagesReusePort = {
    readReceipt: async (_id, pageId) => jsonAt<D2PagesReceipt>(`l2/agents/pipeline/agentDefsL2/pages50/${pageId}.json`),
    context: async (_id, pageId, selectedGroups) => {
      const page = snapshot.selection.pages.find(item => item.pageId === pageId);
      if (!page) throw new Error(`D2_PAGES_PAGE_NOT_SELECTED: ${pageId}`);
      const [template, inventory] = await Promise.all([
        loadD2PageTemplateContext(), buildD2MoleculeInventory(d2MoleculeCatalogPort, identity.project),
      ]);
      const shortlist = await readD2MoleculeShortlist(d2MoleculeCatalogPort, inventory, selectedGroups);
      return { identity, snapshot, artifacts: bundle.artifacts, page, template, inventory, selectedGroups,
        groups: shortlist.groups, moleculeHashes: shortlist.hashes, skill, prompt: promptPages } as D2PagesContext;
    },
    readSource: async info => textAt(displayPath(info)),
    readNeeds: async info => jsonAt(displayPath(info)),
  };
  for (const pageId of ids) {
    if (!await reusableD2Page(identity, pageId, pagesPort)) throw new Error(`pages50 model called: ${pageId}`);
  }

  const readDesign = async (info: Ns5FileInfo) => jsonAt(displayPath(info));
  const readBffReceipt = async (_id: D2RunIdentity, pageId: string) => jsonAt<D2BffReceipt>(displayPath(bffReceiptInfo(identity, pageId)));
  let bffCalled = 0;
  const bffPort = {
    readInput: async () => snapshot,
    reusable: (id: D2RunIdentity, pageId: string) => reusableD2Bff(id, pageId, {
      readReceipt: readBffReceipt,
      readDesign,
      context: async (id, page) => {
        const own = pairOf(page);
        const need = (bundle.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === page);
        if (!need) throw new Error(`D2_BFF_NEEDS_PAGE: ${page}`);
        const approved = await readApprovedD2Bff(id, page, { readReceipt: readBffReceipt, readDesign });
        return {
          ...d2BffContextFrom({
            pageId: page, page11Text: own.texts, drafts: own.drafts, need, menu: bundle.artifacts.menu as D2Menu,
            module: bundle.artifacts.module, entities: bundle.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
            access: bundle.artifacts.access, rules: bundle.artifacts.rules, journeys: bundle.artifacts.journeys,
            integration: bundle.artifacts.integration, catalogs: bundle.artifacts.catalogs, catalogGaps: bundle.artifacts.catalogGaps,
          }),
          identity: id, inputHash: snapshot.snapshotHash, prompt: promptBff, approved,
        };
      },
    }),
    readApproved: (id: D2RunIdentity, pageId: string) => readApprovedD2Bff(id, pageId, { readReceipt: readBffReceipt, readDesign }),
    readPipeline: async () => pipeline as never,
    markApproved: async () => undefined,
    markFailed: async () => { bffCalled += 1; },
  };
  const parent = agentStep('agentDefsL2', '');
  const step = agentStep('bff55', JSON.stringify({ ...identity, scope: 'all' }));
  const intents = await bffDispatch({} as never, execution, parent, step, 1, bffPort);
  const workers = intents.filter(item => item.type === 'add-step' && (item as { step?: { agentName?: string } }).step?.agentName === 'agentD2BffPage');
  if (workers.length) throw new Error(`bff55 model called: ${workers.length} worker(s)`);
  const status = intents.find(item => item.type === 'update-status') as { traceMsg?: string } | undefined;
  const bffTrace = status?.traceMsg ?? '';
  assert.match(bffTrace, /bff55 reused/u);
  assert.equal(bffCalled, 0);

  const writer = {
    writeSource: async (info: Ns5FileInfo, source: string) => { remember(displayPath(info), source); },
    writeJson: async (info: Ns5FileInfo, value: unknown) => { remember(displayPath(info), JSON.stringify(value)); return displayPath(info); },
  };
  const shared = await executeD2Shared({
    pageIds: async () => ids,
    upstreamRefusal: async () => null,
    load: async pageId => {
      const design = await readApprovedD2Bff(identity, pageId, { readReceipt: readBffReceipt, readDesign });
      if (!design) throw new Error(`D2_SHARED_BFF_MISSING: ${pageId}`);
      const need = (bundle.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId);
      if (!need) throw new Error(`D2_SHARED_NEEDS_PAGE: ${pageId}`);
      const own = pairOf(pageId);
      const siblings = ids.filter(item => item !== pageId).map(id => {
        const pair = pairOf(id);
        return { pageId: id, page11: parseD2Page11Definition(pair.texts.desktop).definition, drafts: [buildD2Page11Needs(pair.drafts.desktop), buildD2Page11Needs(pair.drafts.mobile)] };
      });
      return d2SharedPageFrom({
        identity, inputHash: snapshot.snapshotHash, pageId, page11Text: own.texts, drafts: own.drafts, need,
        menu: bundle.artifacts.menu as D2Menu, grants: (bundle.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? [],
        entities: bundle.artifacts.entities as Record<string, Ns5OntologyAnyEntity>, design, siblings,
      });
    },
    readExisting: async pageId => ({
      source: textAt(displayPath(sharedInfo(identity, pageId))),
      receipt: jsonAt<D2SharedReceipt>(displayPath(sharedReceiptInfo(identity, pageId))),
    }),
    writer,
  }, identity);
  assert.deepEqual(shared.wrote, []);
  assert.deepEqual(shared.refused, []);
  assert.deepEqual(shared.reused, ids);

  const contracts = await executeD2Contracts70({
    pageIds: async () => ids,
    upstreamRefusal: async () => null,
    load: async pageId => {
      const design = await readApprovedD2Bff(identity, pageId, { readReceipt: readBffReceipt, readDesign }) as D2BffDesign;
      const sharedSource = textAt(displayPath(sharedInfo(identity, pageId)));
      const need = (bundle.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId)!;
      const menu = bundle.artifacts.menu as D2Menu;
      const devices: D2Page11Device[] = ['desktop', 'mobile'];
      const page11 = {} as Record<D2Page11Device, D2Page11Definition>;
      for (const device of devices) page11[device] = parseD2Page11Definition(textAt(page11Path(pageId, device))).definition;
      const destinations: Record<string, { shared: ReturnType<typeof parseD2SharedV2>['definition']; design: D2BffDesign }> = {};
      for (const device of devices) {
        for (const organism of Object.values(page11[device].organisms)) {
          for (const intent of organism.intents) {
            if (intent.kind !== 'navigate' || !intent.to || intent.id.startsWith('backTo') || destinations[intent.to]) continue;
            const targetShared = files.get(displayPath(sharedInfo(identity, intent.to))) ?? (existsSync(join(root, displayPath(sharedInfo(identity, intent.to)))) ? textAt(displayPath(sharedInfo(identity, intent.to))) : '');
            if (!targetShared) continue;
            const targetDesign = await readApprovedD2Bff(identity, intent.to, { readReceipt: readBffReceipt, readDesign });
            if (!targetDesign) continue;
            destinations[intent.to] = { shared: parseD2SharedV2(targetShared).definition, design: targetDesign };
          }
        }
      }
      return {
        identity, pageId, design, userLanguage: menu.userLanguage || 'en',
        access: d2BffAccess(design, need, (bundle.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? []),
        entities: bundle.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
        sharedSource, sharedReceipt: jsonAt<D2SharedReceipt>(displayPath(sharedReceiptInfo(identity, pageId))),
        page11, destinations,
      };
    },
    readExisting: async pageId => ({
      source: textAt(displayPath(contractInfo(identity, pageId))),
      receipt: jsonAt<D2Contracts70Receipt>(displayPath(contractReceiptInfo(identity, pageId))),
    }),
    writer,
  }, identity);

  const agentsContract = textAt(displayPath(contractInfo(identity, 'agents')));
  assert.match(agentsContract, /export interface AgentCard \{[^}]*\n {2}agentId: string;/su);
  assert.match(agentsContract, /export interface DraftCard \{[^}]*\n {2}draftId: string;/su);
  assert.match(agentsContract, /export interface DraftInboxItem \{[^}]*\n {2}draftId: string;/su);
  assert.match(agentsContract, /export interface RequestEvent \{[^}]*\n {2}draftId: string;/su);
  assert.equal(contracts.wrote.includes('agents'), true);
  assert.equal(contracts.refused.length, 0);

  const pageReceipt = async (pageId: string) => jsonAt<D2PagesReceipt>(`l2/agents/pipeline/agentDefsL2/pages50/${pageId}.json`);
  let ended = '';
  const { report } = await finalizeD2Pages({ ...identity, scope: 'all' }, {
    readInput: async () => snapshot,
    readBundle: async () => bundle,
    assertStable: async () => undefined,
    readPipeline: async () => pipeline as never,
    reusable: (id, pageId) => reusableD2Page(id, pageId, pagesPort),
    readReceipt: (_id, pageId) => pageReceipt(pageId),
    indexed: () => true,
    readSource: async info => textAt(displayPath(info)),
    readJson: async <T>(info: Ns5FileInfo) => {
      const rel = displayPath(info);
      if (!files.has(rel) && !existsSync(join(root, rel))) return null;
      return jsonAt<T>(rel);
    },
    readSharedReceipt: async (_id, pageId) => jsonAt<D2SharedReceipt>(displayPath(sharedReceiptInfo(identity, pageId))),
    readContractReceipt: async (_id, pageId) => jsonAt<D2Contracts70Receipt>(displayPath(contractReceiptInfo(identity, pageId))),
    readRefusal: async () => null,
    writeJson: async (info, value) => { remember(displayPath(info), JSON.stringify(value)); return displayPath(info); },
    compile: async (_id, sources, hashes) => sources.map(item => ({ path: item.path, sha256: hashes.get(item.path)!, status: 'passed' as const, diagnostics: [] })),
    markComplete: async () => { ended = 'complete'; (pipeline as { status: string }).status = 'complete'; },
    markBlocked: async (_id, diagnostic) => { ended = diagnostic; },
  });
  assert.equal(report.status, 'complete', report.pending.join(' | '));
  assert.equal(ended, 'complete');
  assert.equal((pipeline as { status: string }).status, 'complete');
  (globalThis as { mls?: typeof previousMls }).mls = previousMls;
});
