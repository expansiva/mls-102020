/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2_217.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { fileInfoFromRef } from '/_102020_/l2/helpers/defsInput/io.js';
import { externalCatalogTexts } from '/_102020_/l2/helpers/defsInput/externalCatalog.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { d2ArtifactsWithCurrentNeeds } from '/_102020_/l2/helpers/needs/fromBundle.js';
import { checkD2Bff, type D2BffDesign, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { d2Page11Base } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { bffUnitInputHash, d2BffApproved, d2BffContextFrom, D2_BFF_VERSION, type D2BffContext, type D2BffReceipt } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../mls-102047');
const BASE = path.dirname(REPO);
const AGENTS_ROOT = '/tmp/d2_217';
const TAREFAS_ROOT = '/tmp/d2_217_tarefas';
const PROMPT = readFileSync(new URL('../steps/bff55/prompt.md', import.meta.url), 'utf8');

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

async function contextFor(root: string, moduleName: string, artifacts: D2InputArtifacts, pageId: string): Promise<D2BffContext> {
  const entities = artifacts.entities as Record<string, Ns5OntologyAnyEntity>;
  const catalogs = await externalCatalogTexts(entities, { project: 102047, moduleName, read: readWorkspaceRef });
  const text = (device: 'desktop' | 'mobile') => d2Page11Base(readAt(root, `l2/${moduleName}/web/${device}/page11/${pageId}.defs.ts`));
  const draft = (device: 'desktop' | 'mobile') => jsonAt(root, `l2/${moduleName}/pipeline/agentDefsL2/page11Needs/${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}.json`);
  const need = (artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId);
  assert.ok(need, pageId);
  const snapshot = await buildD2InputSnapshot({ project: 102047, module: moduleName }, artifacts, null, []);
  return {
    ...d2BffContextFrom({
      pageId,
      page11Text: { desktop: text('desktop'), mobile: text('mobile') },
      drafts: { desktop: draft('desktop'), mobile: draft('mobile') },
      need, menu: artifacts.menu as D2Menu, module: artifacts.module, entities,
      access: artifacts.access, rules: artifacts.rules, journeys: artifacts.journeys,
      integration: artifacts.integration, catalogs: catalogs.texts, catalogGaps: catalogs.unresolved,
    }),
    identity: { project: 102047, module: moduleName },
    inputHash: snapshot.snapshotHash,
    prompt: PROMPT,
    approved: null,
  };
}

function gate(context: D2BffContext, raw: unknown): string {
  try {
    d2BffApproved(context, raw);
    return 'ok';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function approvedPages(root: string, moduleName: string): string[] {
  const dir = path.join(root, `l2/${moduleName}/pipeline/agentDefsL2/bff55`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => name.endsWith('.json')).map(name => name.replace(/\.json$/u, '')).filter(pageId => {
    const receipt = jsonAt<Partial<D2BffReceipt>>(root, `l2/${moduleName}/pipeline/agentDefsL2/bff55/${pageId}.json`);
    return receipt.schemaVersion === D2_BFF_VERSION && existsSync(path.join(root, `l2/${moduleName}/pipeline/agentDefsL2/bff/${pageId}.json`));
  }).sort();
}

test('d2_217 the separate-step gate applies only on the page that sends', async () => {
  extract(AGENTS_ROOT, 'de260e47', ['l2/agents', 'l4/agents']);
  extract(TAREFAS_ROOT, 'HEAD', ['l2/tarefas', 'l4/tarefas']);
  const agents = d2ArtifactsWithCurrentNeeds(await artifactsAt(AGENTS_ROOT, 'agents')).artifacts;
  const agentsContext = await contextFor(AGENTS_ROOT, 'agents', agents, 'agents');
  const refused = jsonAt<{ raw: { result: { arguments: unknown } } }>(AGENTS_ROOT, 'l2/agents/pipeline/agentDefsL2/bff55/responses/agents-1.json');
  assert.equal(gate(agentsContext, refused.raw.result.arguments), 'ok');

  const tools = await contextFor(AGENTS_ROOT, 'agents', agents, 'agent_tools');
  const toolsDesign = jsonAt<D2BffDesign>(AGENTS_ROOT, 'l2/agents/pipeline/agentDefsL2/bff/agent_tools.json');
  assert.equal(gate(tools, toolsDesign), 'ok');
  const stripped = structuredClone(toolsDesign);
  const step = stripped.bindings.journeys.find(row => row.step === 'adjustAgentTools/suggestTools');
  assert.ok(step);
  step.endpoints = step.endpoints.filter(id => id !== 'suggestTools');
  const control = gate(tools, stripped);
  assert.match(control, /D2_BFF_BINDING_STEP/u);
  assert.match(control, /suggestTools/u);

  const rows: string[] = [];
  const replay = async (root: string, moduleName: string, artifacts: D2InputArtifacts) => {
    for (const pageId of approvedPages(root, moduleName)) {
      const context = await contextFor(root, moduleName, artifacts, pageId);
      const design = jsonAt<D2BffDesign>(root, `l2/${moduleName}/pipeline/agentDefsL2/bff/${pageId}.json`);
      const issues = checkD2Bff(design, context);
      const result = issues.length ? issues.map(issue => `${issue.code}: ${issue.message}`).join(' | ') : 'ok';
      rows.push(`${pageId} | bff/${pageId}.json | ${result === 'ok' ? 'ok' : result.split(' | ')[0]} | ${result === 'ok' ? 'ok' : 'refused'}`);
      assert.equal(result, 'ok', `${moduleName}/${pageId}: ${result}`);
    }
  };
  await replay(AGENTS_ROOT, 'agents', agents);
  const tarefas = d2ArtifactsWithCurrentNeeds(await artifactsAt(TAREFAS_ROOT, 'tarefas')).artifacts;
  await replay(TAREFAS_ROOT, 'tarefas', tarefas);
  console.log(['page | design | gate | ok', ...rows].join('\n'));

  for (const pageId of ['agent_tools', 'agent_behavior'] as const) {
    const receipt = jsonAt<D2BffReceipt>(AGENTS_ROOT, `l2/agents/pipeline/agentDefsL2/bff55/${pageId}.json`);
    const context = await contextFor(AGENTS_ROOT, 'agents', agents, pageId);
    const design = jsonAt(AGENTS_ROOT, `l2/agents/pipeline/agentDefsL2/bff/${pageId}.json`);
    assert.equal(await sha256Text(PROMPT), receipt.promptHash, pageId);
    assert.equal(await bffUnitInputHash(context), receipt.unitInputHash, pageId);
    assert.equal(await sha256Text(JSON.stringify(design)), receipt.designHash, pageId);
  }
});
