/// <mls fileReference="_102020_/l2/helpers/needs/d2_213.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts, D2InputSnapshot } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { d2ArtifactsWithCurrentNeeds, d2NeedsRecalcProblem } from '/_102020_/l2/helpers/needs/fromBundle.js';
import { bffUnitInputHash, d2BffContextFrom } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { pageUnitInputHash, type D2PagesContext } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import type { D2Menu, D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../mls-102047');
const COMMIT = '0b6790f1';

function git(args: string[]): string {
  const result = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || args.join(' '));
  return result.stdout;
}

function show(spec: string): string {
  return git(['show', `${COMMIT}:${spec}`]);
}

function defs(spec: string): Record<string, unknown> {
  const parsed = parseNs4ClassicDefsSource<Record<string, unknown>>(show(spec));
  if (!parsed) throw new Error(`INVALID_DEFS_SOURCE: ${spec}`);
  return parsed;
}

async function artifactsOf(moduleName: string): Promise<D2InputArtifacts> {
  const root = `l4/${moduleName}`;
  const journeyIndex = defs(`${root}/journeys/index.defs.ts`);
  const ontologyIndex = defs(`${root}/ontology/index.defs.ts`);
  const journeyIds = ((journeyIndex.journeys as Array<{ journeyId?: string }> | undefined) ?? []).map(row => String(row.journeyId));
  const entityIds = ((ontologyIndex.entities as Array<{ entityId?: string }> | undefined) ?? []).map(row => String(row.entityId));
  const journeyFiles = journeyIds.map(id => `${root}/journeys/${id}.defs.ts`);
  const entityFiles = entityIds.map(id => `${root}/ontology/${id}.defs.ts`);
  const texts = new Map<string, string>();
  const parsed = new Map<string, Record<string, unknown>>();
  const load = (spec: string) => {
    const source = show(spec);
    texts.set(spec, source);
    parsed.set(spec, parseNs4ClassicDefsSource<Record<string, unknown>>(source) ?? {});
  };
  for (const spec of [
    `${root}/module.defs.ts`, `${root}/journeys/index.defs.ts`, `${root}/ontology/index.defs.ts`,
    `${root}/rules.defs.ts`, `${root}/workflows.defs.ts`, `${root}/access.defs.ts`, `${root}/integration.defs.ts`,
    ...journeyFiles, ...entityFiles,
  ]) load(spec);
  const sources: D2InputArtifacts['sources'] = [];
  for (const [spec, source] of texts) {
    const rel = spec.slice(root.length + 1);
    sources.push({
      path: `l4/${moduleName}/${rel}`,
      sha256: await sha256Text(source),
      bytes: source.length,
      schemaVersion: String(parsed.get(spec)?.schemaVersion ?? ''),
    });
  }
  const id = (spec: string) => spec.slice(spec.lastIndexOf('/') + 1).replace(/\.defs\.ts$/u, '');
  return {
    sources,
    module: parsed.get(`${root}/module.defs.ts`),
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`),
    journeys: Object.fromEntries(journeyFiles.map(spec => [id(spec), parsed.get(spec)])),
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`),
    entities: Object.fromEntries(entityFiles.map(spec => [id(spec), parsed.get(spec)])),
    rules: parsed.get(`${root}/rules.defs.ts`),
    workflows: parsed.get(`${root}/workflows.defs.ts`),
    access: parsed.get(`${root}/access.defs.ts`),
    integration: parsed.get(`${root}/integration.defs.ts`),
    menu: JSON.parse(show(`${root}/pool/l2/web/menu.json`)),
    needs: JSON.parse(show(`${root}/pool/l1/web/needs.json`)),
    backend: JSON.parse(show(`${root}/pool/l2/web/backend.json`)),
    effort: JSON.parse(show(`${root}/pool/l2/web/effort.json`)),
  };
}

async function snapshotOf(artifacts: D2InputArtifacts, moduleName: string, recalc: boolean): Promise<{ snapshot: D2InputSnapshot; artifacts: D2InputArtifacts }> {
  const current = recalc ? d2ArtifactsWithCurrentNeeds(artifacts) : { artifacts, changedPageIds: [] as string[] };
  const snapshot = await buildD2InputSnapshot(
    { project: 102047, module: moduleName },
    current.artifacts,
    null,
    current.changedPageIds.length ? [d2NeedsRecalcProblem(current.changedPageIds)] : [],
  );
  return { snapshot, artifacts: current.artifacts };
}

function pageOf(snapshot: D2InputSnapshot, pageId: string) {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId);
  assert.ok(page, pageId);
  return page;
}

async function pageKey(artifacts: D2InputArtifacts, snapshot: D2InputSnapshot, pageId: string): Promise<string> {
  return pageUnitInputHash({ page: pageOf(snapshot, pageId), artifacts, snapshot } as D2PagesContext);
}

async function bffKey(artifacts: D2InputArtifacts, moduleName: string, pageId: string): Promise<string> {
  const textOf = (device: 'desktop' | 'mobile') => show(`l2/${moduleName}/web/${device}/page11/${pageId}.defs.ts`);
  const draftOf = (device: 'desktop' | 'mobile') => JSON.parse(show(`l2/${moduleName}/pipeline/agentDefsL2/page11Needs/${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}.json`));
  const pages = (artifacts.needs as { pages: D2NeedPage[] }).pages;
  const need = pages.find(item => item.pageId === pageId);
  assert.ok(need, pageId);
  const context = d2BffContextFrom({
    pageId,
    page11Text: { desktop: textOf('desktop'), mobile: textOf('mobile') },
    drafts: { desktop: draftOf('desktop'), mobile: draftOf('mobile') },
    need,
    menu: artifacts.menu as D2Menu,
    module: artifacts.module,
    entities: artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    access: artifacts.access,
    rules: artifacts.rules,
    journeys: artifacts.journeys,
    integration: artifacts.integration,
  });
  return bffUnitInputHash({ ...context, identity: { project: 102047, module: moduleName }, inputHash: '', prompt: '', approved: null });
}

void test('d2_213 agents input splits the joined writes and leaves the other page keys', async () => {
  const pooled = await artifactsOf('agents');
  const before = await snapshotOf(pooled, 'agents', false);
  const after = await snapshotOf(pooled, 'agents', true);
  assert.equal(pooled.needs, before.artifacts.needs);
  const tools = pageOf(after.snapshot, 'agent_tools').writes as Array<{ entity?: string; operation?: string; from?: string[]; calls?: string[] }>;
  const creates = tools.filter(write => write.entity === 'AgentTool' && write.operation === 'create');
  assert.ok(creates.length >= 2, JSON.stringify(creates));
  assert.equal(creates.some(write => (write.from ?? []).includes('journey:adjustAgentTools/suggestTools') && (write.from ?? []).includes('journey:adjustAgentTools/enableUnchosenTool')), false);
  const behavior = pageOf(after.snapshot, 'agent_behavior').writes as Array<{ from?: string[]; calls?: string[] }>;
  assert.ok(behavior.some(write => (write.calls ?? []).length > 0), JSON.stringify(behavior));
  const note = after.snapshot.problems.find(problem => problem.code === 'NEEDS_RECALCULATED');
  assert.equal(note?.message, 'needs30 code differs from the pool on: agent_behavior, agent_tools, agents');
  for (const pageId of before.snapshot.selection.pages.map(page => page.pageId)) {
    const same = !['agent_behavior', 'agent_tools', 'agents'].includes(pageId);
    assert.equal(await pageKey(after.artifacts, after.snapshot, pageId) === await pageKey(before.artifacts, before.snapshot, pageId), same, `pages50 ${pageId}`);
    assert.equal(await bffKey(after.artifacts, 'agents', pageId) === await bffKey(before.artifacts, 'agents', pageId), same, `bff55 ${pageId}`);
  }
});

void test('d2_213 tarefas input stays byte for byte', async () => {
  const pooled = await artifactsOf('tarefas');
  const before = await snapshotOf(pooled, 'tarefas', false);
  const after = await snapshotOf(pooled, 'tarefas', true);
  assert.equal(JSON.stringify(after.snapshot), JSON.stringify(before.snapshot));
  assert.equal(after.snapshot.problems.some(problem => problem.code === 'NEEDS_RECALCULATED'), false);
});
