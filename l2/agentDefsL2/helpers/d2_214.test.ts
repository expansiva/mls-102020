/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2_214.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts, D2InputSnapshot } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { d2ArtifactsWithCurrentNeeds } from '/_102020_/l2/helpers/needs/fromBundle.js';
import { gateD2Page11, type D2Page11GateSources, type D2Page11Menu, type D2Page11NeedPage } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import { d2Page11Base, parseD2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import type { D2Grant, D2Menu, D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { d2BffAccess } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { D2_BFF_VERSION, bffUnitInputHash, d2BffContextFrom, readUsableD2Bff, type D2BffReceipt } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { pageUnitInputHash, type D2PagesContext } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { d2SharedPageFrom, d2SharedSourceFor } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { contractSourceFor, type D2Contracts70Page } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';
import { parseD2SharedV2 } from '/_102020_/l2/helpers/sharedV2/format.js';
import { D2_SHARED_VERSION, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../mls-102047');
const AGENTS_ROOT = '/tmp/d2_214';
const TAREFAS_ROOT = '/tmp/d2_214_tarefas';
const ARCHIVE = 'git -C mls-base/mls-102047 archive cc354012 l2/agents l4/agents | tar -x -C /tmp/d2_214';
const SPLIT = ['agent_behavior', 'agent_tools', 'agents'];

type Stage = 'pages50' | 'bff55' | 'shared60' | 'contracts70';

function git(args: string[]): string {
  const result = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || args.join(' '));
  return result.stdout.trim();
}

function agentsReady(): boolean {
  return existsSync(path.join(AGENTS_ROOT, 'l4/agents/pool/l1/web/needs.json'))
    && existsSync(path.join(AGENTS_ROOT, 'l2/agents/web/shared'));
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
    sources.push({
      path: rel,
      sha256: await sha256Text(source),
      bytes: source.length,
      schemaVersion: String(parsed.get(rel)?.schemaVersion ?? ''),
    });
  }
  const id = (rel: string) => rel.slice(rel.lastIndexOf('/') + 1).replace(/\.defs\.ts$/u, '');
  const journeyFiles = journeyIds.map(item => `${base}/journeys/${item}.defs.ts`);
  const entityFiles = entityIds.map(item => `${base}/ontology/${item}.defs.ts`);
  return {
    sources,
    module: parsed.get(`${base}/module.defs.ts`),
    journeyIndex,
    journeys: Object.fromEntries(journeyFiles.map(rel => [id(rel), parsed.get(rel)])),
    ontologyIndex,
    entities: Object.fromEntries(entityFiles.map(rel => [id(rel), parsed.get(rel)])),
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

function textFile(root: string, info: Ns5FileInfo): string {
  return readAt(root, `l${info.level}/${info.folder}/${info.shortName}${info.extension}`);
}

function approvedPort(root: string) {
  return {
    readReceipt: async (who: { module: string }, pageId: string): Promise<D2BffReceipt | null> => {
      const value = jsonAt<D2BffReceipt>(root, `l2/${who.module}/pipeline/agentDefsL2/bff55/${pageId}.json`);
      return value?.schemaVersion === D2_BFF_VERSION ? value : null;
    },
    readDesign: async (info: Ns5FileInfo): Promise<unknown> => JSON.parse(textFile(root, info)),
  };
}

function pairOf(root: string, moduleName: string, pageId: string): { texts: Record<D2Page11Device, string>; drafts: Record<D2Page11Device, unknown> } {
  const textOf = (device: D2Page11Device) => d2Page11Base(readAt(root, `l2/${moduleName}/web/${device}/page11/${pageId}.defs.ts`));
  const draftOf = (device: D2Page11Device) => jsonAt(root, `l2/${moduleName}/pipeline/agentDefsL2/page11Needs/${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}.json`);
  return { texts: { desktop: textOf('desktop'), mobile: textOf('mobile') }, drafts: { desktop: draftOf('desktop'), mobile: draftOf('mobile') } };
}

async function keysOf(root: string, moduleName: string, recalc: boolean): Promise<Record<Stage, Record<string, string>>> {
  const pooled = await artifactsAt(root, moduleName);
  const view = await opened(pooled, moduleName, recalc);
  const pages = (view.artifacts.needs as { pages: D2NeedPage[] }).pages;
  const menu = view.artifacts.menu as D2Menu;
  const entities = view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>;
  const grants = (view.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? [];
  const who = { project: 102047, module: moduleName };
  const ids = view.snapshot.selection.pages.map(page => page.pageId);
  const port = approvedPort(root);
  const pairs = new Map(ids.map(pageId => [pageId, pairOf(root, moduleName, pageId)]));
  const out: Record<Stage, Record<string, string>> = { pages50: {}, bff55: {}, shared60: {}, contracts70: {} };
  for (const pageId of ids) {
    const need = pages.find(item => item.pageId === pageId);
    assert.ok(need, pageId);
    out.pages50[pageId] = await pageUnitInputHash({ page: pageOf(view.snapshot, pageId), artifacts: view.artifacts, snapshot: view.snapshot } as D2PagesContext);
    const own = pairs.get(pageId)!;
    const context = d2BffContextFrom({
      pageId,
      page11Text: own.texts,
      drafts: own.drafts,
      need,
      menu,
      module: view.artifacts.module,
      entities,
      access: view.artifacts.access,
      rules: view.artifacts.rules,
      journeys: view.artifacts.journeys,
      integration: view.artifacts.integration,
    });
    out.bff55[pageId] = await bffUnitInputHash({ ...context, identity: who, inputHash: '', prompt: '', approved: null });
    const design = await readUsableD2Bff(who, pageId, view.artifacts, entities, port);
    assert.ok(design, pageId);
    const sharedPage = d2SharedPageFrom({
      identity: who,
      inputHash: view.snapshot.snapshotHash,
      pageId,
      page11Text: own.texts,
      drafts: own.drafts,
      need,
      menu,
      grants,
      entities,
      design,
      siblings: ids.filter(id => id !== pageId).map(id => {
        const pair = pairs.get(id)!;
        return {
          pageId: id,
          page11: parseD2Page11Definition(pair.texts.desktop).definition,
          drafts: [buildD2Page11Needs(pair.drafts.desktop), buildD2Page11Needs(pair.drafts.mobile)],
        };
      }),
    });
    out.shared60[pageId] = await sha256Text(d2SharedSourceFor(sharedPage));
    const sharedSource = readAt(root, `l2/${moduleName}/web/shared/${pageId}.defs.ts`);
    const sharedReceipt = jsonAt<D2SharedReceipt>(root, `l2/${moduleName}/pipeline/agentDefsL2/shared60/${pageId}.json`);
    const page11 = {
      desktop: parseD2Page11Definition(own.texts.desktop).definition,
      mobile: parseD2Page11Definition(own.texts.mobile).definition,
    };
    const destinations: NonNullable<D2Contracts70Page['destinations']> = {};
    for (const device of ['desktop', 'mobile'] as const) {
      for (const organism of Object.values(page11[device].organisms)) {
        for (const intent of organism.intents) {
          if (intent.kind !== 'navigate' || !intent.to || intent.id.startsWith('backTo') || destinations[intent.to]) continue;
          const targetSharedPath = `l2/${moduleName}/web/shared/${intent.to}.defs.ts`;
          if (!existsSync(path.join(root, targetSharedPath))) continue;
          const targetDesign = await readUsableD2Bff(who, intent.to, view.artifacts, entities, port);
          if (!targetDesign) continue;
          const parsed = parseD2SharedV2(readAt(root, targetSharedPath));
          destinations[intent.to] = { shared: parsed.definition, design: targetDesign };
        }
      }
    }
    const contractPage: D2Contracts70Page = {
      identity: who,
      pageId,
      userLanguage: menu.userLanguage || 'en',
      design,
      access: d2BffAccess(design, need, grants),
      entities,
      sharedSource,
      sharedReceipt,
      page11,
      destinations,
    };
    if (sharedReceipt.schemaVersion !== D2_SHARED_VERSION) throw new Error(`shared receipt ${pageId}`);
    out.contracts70[pageId] = await sha256Text(await contractSourceFor(contractPage));
  }
  return out;
}

test('d2_214 replay of cc354012 changes only the three split pages', async (t) => {
  if (!agentsReady()) {
    t.skip(`missing ${AGENTS_ROOT}. ${ARCHIVE}`);
    return;
  }
  const sourceFile = path.join(AGENTS_ROOT, 'SOURCE.txt');
  const commit = git(['rev-parse', 'cc354012']);
  if (!existsSync(sourceFile)) writeFileSync(sourceFile, `${commit}\n`);
  assert.equal(readFileSync(sourceFile, 'utf8').trim(), commit);
  const before = await keysOf(AGENTS_ROOT, 'agents', false);
  const after = await keysOf(AGENTS_ROOT, 'agents', true);
  assert.equal(Object.keys(before.pages50).length, 11);
  assert.ok(SPLIT.every(pageId => before.pages50[pageId]));
  const stages = Object.keys(before) as Stage[];
  for (const stage of stages) {
    for (const pageId of Object.keys(before[stage])) {
      const same = before[stage][pageId] === after[stage][pageId];
      const expectSame = stage === 'shared60' || stage === 'contracts70' || !SPLIT.includes(pageId);
      assert.equal(same, expectSame, `${stage} ${pageId}`);
    }
  }
  const view = await opened(await artifactsAt(AGENTS_ROOT, 'agents'), 'agents', true);
  const needsPages = (view.artifacts.needs as { pages: D2Page11NeedPage[] }).pages;
  const menu = view.artifacts.menu as D2Page11Menu;
  const entities = view.artifacts.entities as Record<string, Ns5OntologyAnyEntity>;
  const refused = (pageId: string, step: string) => {
    const page = needsPages.find(item => item.pageId === pageId);
    assert.ok(page, pageId);
    const raw = jsonAt(AGENTS_ROOT, `l2/agents/pipeline/agentDefsL2/page11Needs/${pageId}Desktop.json`);
    const definition = parseD2Page11Definition(d2Page11Base(readAt(AGENTS_ROOT, `l2/agents/web/desktop/page11/${pageId}.defs.ts`))).definition;
    const sources: D2Page11GateSources = {
      pageId,
      actor: page.actors[0],
      pageActors: page.actors,
      menu,
      needsPages,
      entities,
      access: view.artifacts.access as D2Page11GateSources['access'],
      categories: [],
      templatePaths: new Set(),
      moleculeTags: new Set(),
    };
    const messages = gateD2Page11(definition, raw, sources).map(issue => issue.message);
    assert.equal(messages.some(message => message.includes(step)), true, messages.join('\n'));
  };
  refused('agent_tools', 'suggestTools');
  refused('agent_behavior', 'undoBehaviorChange');
});

test('d2_214 tarefas at 102047 HEAD keeps every stage key', async () => {
  if (!existsSync(path.join(TAREFAS_ROOT, 'l4/tarefas/pool/l1/web/needs.json'))) {
    mkdirSync(TAREFAS_ROOT, { recursive: true });
    const archived = spawnSync('git', ['-C', REPO, 'archive', 'HEAD', 'l2/tarefas', 'l4/tarefas'], { maxBuffer: 64 * 1024 * 1024 });
    if (archived.status !== 0) throw new Error(archived.stderr?.toString() || 'git archive tarefas');
    const extracted = spawnSync('tar', ['-x', '-C', TAREFAS_ROOT], { input: archived.stdout });
    if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar tarefas');
  }
  const before = await keysOf(TAREFAS_ROOT, 'tarefas', false);
  const after = await keysOf(TAREFAS_ROOT, 'tarefas', true);
  for (const stage of Object.keys(before) as Stage[]) {
    for (const pageId of Object.keys(before[stage])) {
      assert.equal(after[stage][pageId], before[stage][pageId], `${stage} ${pageId}`);
    }
  }
});
