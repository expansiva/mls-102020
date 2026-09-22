/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { D2InputValidationError, type D2InputArtifacts, type D2SourceDigest } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2InputSnapshot, destinationsFor } from '/_102020_/l2/agentDefsL2/steps/input20/gate.js';
import { d2InputFile, d2InputReportFile, readD2InputProblems, writeAcceptedD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IDENTITY: D2RunIdentity = { project: 102047, module: 'agendaClinica' };
const versions = {
  module: '2026-09-10-ns5-module-v2', journey: '2026-09-10-ns5-journey-v1',
  ontology: '2026-09-17-ns5-ontology-v3.1', rules: '2026-09-16-ns5-rules-v2',
  workflows: '2026-09-17-ns5-workflows-v3', access: '2026-09-12-ns5-access-v3',
  integration: '2026-09-12-ns5-integration-v2',
} as const;

function fixture(kind: 'current' | 'historical', name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, 'fixtures', kind, `${name}.json`), 'utf8')) as Record<string, unknown>;
}

function currentAccessFixture(): Record<string, unknown> {
  const source = readFileSync(path.join(HERE, 'fixtures', 'current', 'access.defs.ts'), 'utf8');
  const parsed = parseNs4ClassicDefsSource<Record<string, unknown>>(source);
  assert.ok(parsed, 'current access fixture must parse');
  return parsed;
}

void test('planner fixtures are byte-pinned to their recorded 102047 revisions', () => {
  const provenance = JSON.parse(readFileSync(path.join(HERE, 'fixtures', 'provenance.json'), 'utf8')) as Record<string, { commit: string; sha256: Record<string, string> }>;
  assert.equal(provenance.current.commit, 'a2f929ed8778c9d8240ac445d6206d401434fdc9');
  assert.equal(provenance.historical.commit, '7d3b2ac3aafc7052bdae5bd3991f9bc24efbc556');
  for (const kind of ['current', 'historical'] as const) for (const [name, expected] of Object.entries(provenance[kind].sha256)) {
    const bytes = readFileSync(path.join(HERE, 'fixtures', kind, name));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, `${kind}/${name}`);
  }
});

function rec(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }

function artifacts(kind: 'current' | 'historical'): D2InputArtifacts {
  const menu = fixture(kind, 'menu');
  const needs = fixture(kind, 'needs');
  const backend = fixture(kind, 'backend');
  const effort = fixture(kind, 'effort');
  const access = kind === 'current' ? currentAccessFixture() : { schemaVersion: versions.access, moduleName: IDENTITY.module, grants: [] };
  const entityIds = new Set<string>();
  for (const usecase of rows(backend.usecases)) if (typeof usecase.entity === 'string') entityIds.add(usecase.entity);
  for (const page of rows(needs.pages)) for (const item of [...rows(page.reads), ...rows(page.writes)]) if (typeof item.entity === 'string') entityIds.add(item.entity);
  for (const grant of rows(access.grants)) {
    for (const entityId of strings(grant.entityRefs)) entityIds.add(entityId);
    const anchor = rec(grant.dataScope).anchorEntity; if (typeof anchor === 'string') entityIds.add(anchor);
  }
  const journeyIds = new Set(Object.keys(rec(rec(menu.meta).journeys)));
  for (const page of rows(needs.pages)) for (const item of [...rows(page.reads), ...rows(page.writes)]) {
    for (const source of strings(item.from)) { const match = /^journey:([^/]+)/.exec(source); if (match) journeyIds.add(match[1]); }
  }
  // Ns5JourneyArtifact has no moduleName; identity comes from its indexed journeyId and pinned path.
  const journeys = Object.fromEntries([...journeyIds].map(journeyId => [journeyId, { schemaVersion: versions.journey, journeyId }]));
  const entities = Object.fromEntries([...entityIds].map(entityId => [entityId, { schemaVersion: versions.ontology, moduleName: IDENTITY.module, entityId }]));
  const defs = {
    module: { schemaVersion: versions.module, moduleName: IDENTITY.module },
    journeyIndex: { schemaVersion: versions.journey, moduleName: IDENTITY.module, journeys: [...journeyIds].map(journeyId => ({ journeyId })) },
    ontologyIndex: { schemaVersion: versions.ontology, moduleName: IDENTITY.module, entities: [...entityIds].map(entityId => ({ entityId })) },
    rules: { schemaVersion: versions.rules, moduleName: IDENTITY.module },
    workflows: { schemaVersion: versions.workflows, moduleName: IDENTITY.module },
    access,
    integration: { schemaVersion: versions.integration, moduleName: IDENTITY.module },
  };
  const source = (p: string, schemaVersion: string): D2SourceDigest => ({ path: p, sha256: `sha256:${'a'.repeat(64)}`, bytes: 1, schemaVersion });
  const root = `l4/${IDENTITY.module}`;
  const sources = [
    source(`${root}/module.defs.ts`, versions.module), source(`${root}/journeys/index.defs.ts`, versions.journey),
    ...[...journeyIds].map(id => source(`${root}/journeys/${id}.defs.ts`, versions.journey)),
    source(`${root}/ontology/index.defs.ts`, versions.ontology),
    ...[...entityIds].map(id => source(`${root}/ontology/${id}.defs.ts`, versions.ontology)),
    source(`${root}/rules.defs.ts`, versions.rules), source(`${root}/workflows.defs.ts`, versions.workflows),
    source(`${root}/access.defs.ts`, versions.access), source(`${root}/integration.defs.ts`, versions.integration),
    source(`${root}/pool/l2/web/menu.json`, String(menu.schemaVersion)),
    source(`${root}/pool/l1/web/needs.json`, String(needs.schemaVersion)),
    source(`${root}/pool/l2/web/backend.json`, String(backend.schemaVersion)),
    source(`${root}/pool/l2/web/effort.json`, String(effort.schemaVersion)),
  ];
  return { ...defs, journeys, entities, menu, needs, backend, effort, sources };
}

void test('current immutable fixture produces the exact agendaClinica inventory', async () => {
  const snapshot = await buildD2InputSnapshot(IDENTITY, artifacts('current'));
  assert.deepEqual(snapshot.selection.counts, { pages: 5, endpoints: 19, usecases: 13, destinations: 20, materializationItems: 15 });
  assert.equal(snapshot.selection.pages.some(page => page.pageId === 'painel'), false);
  assert.equal(snapshot.selection.writePageIds.length, 5);
  assert.equal(snapshot.selection.preservePageIds.length, 0);
  assert.equal(snapshot.selection.remove.length, 0);
  assert.match(snapshot.snapshotHash, /^sha256:[a-f0-9]{64}$/);
  for (const page of snapshot.selection.pages) {
    assert.equal(page.destinations.length, 4);
    assert.equal(page.destinations.filter(item => item.materializationId).length, 3);
    assert.equal(new Set(page.destinations.map(item => item.artifactId)).size, 4);
  }
  assert.ok(snapshot.normalizations.some(item => item.code === 'menu-action-ignored'));
  assert.ok(snapshot.problems.some(item => item.code === 'NO_COMMON_RELEASE_IDENTITY'));
  const anchor = snapshot.problems.filter(item => item.code === 'OWN_ANCHOR_OUTSIDE_GRANT_ENTITIES');
  assert.ok(anchor.length > 0);
  assert.ok(anchor.every(item => item.file === 'l4/access.defs.ts' && item.pageId === 'consultas_profissional' && item.route), JSON.stringify(anchor));
  const mixedCrud = snapshot.problems.filter(item => item.code === 'PAGE_OWN_SCOPE_WITH_OTHER_ENTITY_CRUD');
  assert.deepEqual(mixedCrud.map(item => item.route).sort(), [
    'agendaClinica.cadastro_recepcionista.cmdCreateProfissional',
    'agendaClinica.cadastro_recepcionista.cmdUpdateProfissional',
  ]);
  assert.ok(mixedCrud.every(item => item.file === 'pool/l1/web/needs.json' && item.pageId === 'cadastro_recepcionista'));
  installProblemReportHost();
  await writeAcceptedD2Input(IDENTITY, snapshot);
  const reread = await readD2InputProblems(IDENTITY);
  assert.ok(reread.some(item => item.code === 'OWN_ANCHOR_OUTSIDE_GRANT_ENTITIES' && item.pageId === 'consultas_profissional' && item.route));
  assert.ok(reread.some(item => item.code === 'PAGE_OWN_SCOPE_WITH_OTHER_ENTITY_CRUD' && item.pageId === 'cadastro_recepcionista' && item.route));
});

void test('historical immutable fixture preserves the two static homes as review findings', async () => {
  const snapshot = await buildD2InputSnapshot(IDENTITY, artifacts('historical'));
  assert.deepEqual(snapshot.selection.counts, { pages: 7, endpoints: 22, usecases: 13, destinations: 28, materializationItems: 21 });
  assert.deepEqual(snapshot.problems.filter(item => item.code === 'PAGE_WITHOUT_ENDPOINTS').map(item => item.pageId).sort(), ['painel', 'painel_clinica']);
});

void test('a structurally valid suspicious own-anchor is reported for review without refusal', async () => {
  const input = artifacts('current');
  const entityIds = rows(rec(input.ontologyIndex).entities).map(row => String(row.entityId));
  rec(input.access).grants = [{ grantId: 'suspicious', entityRefs: [entityIds[0]], dataScope: { mode: 'own', anchorEntity: entityIds[1] } }];
  const snapshot = await buildD2InputSnapshot(IDENTITY, input);
  assert.ok(snapshot.problems.some(item => item.severity === 'review' && item.code === 'OWN_ANCHOR_OUTSIDE_GRANT_ENTITIES'));
});

void test('effort status alone selects create, update and done work', async () => {
  const input = artifacts('current');
  const effort = structuredClone(input.effort) as Record<string, unknown>;
  const screens = rows(effort.screens);
  screens[0].status = 'toUpdate'; screens[1].status = 'done';
  for (const group of ['screens', 'endpoints', 'usecases', 'tables']) {
    const values = rows(effort[group]);
    const totals = rec(rec(effort.totals)[group]);
    for (const status of ['toCreate', 'toUpdate', 'toRemove', 'done']) totals[status] = values.filter(value => value.status === status).length;
  }
  input.effort = effort;
  const snapshot = await buildD2InputSnapshot(IDENTITY, input);
  assert.ok(snapshot.selection.writePageIds.includes(String(screens[0].pageId)));
  assert.ok(snapshot.selection.preservePageIds.includes(String(screens[1].pageId)));
});

void test('removal is planned only from effort plus menu tombstone plus prior owned inventory', async () => {
  const prior = await buildD2InputSnapshot(IDENTITY, artifacts('current'));
  const input = artifacts('current');
  const pageId = 'cadastro_recepcionista';
  const menu = rec(input.menu);
  const stripNode = (value: unknown): unknown => {
    const node = rec(value);
    if (node.id === pageId) return null;
    if (Array.isArray(node.children)) node.children = node.children.map(stripNode).filter(Boolean);
    return node;
  };
  menu.tree = (menu.tree as unknown[]).map(stripNode).filter(Boolean);
  rec(menu.meta).removed = [pageId];
  for (const pages of Object.values(rec(rec(menu.meta).journeys))) if (Array.isArray(pages)) {
    const at = pages.indexOf(pageId); if (at >= 0) pages.splice(at, 1);
  }
  for (const targets of Object.values(rec(menu.authorities))) if (Array.isArray(targets)) {
    const at = targets.indexOf(pageId); if (at >= 0) targets.splice(at, 1);
  }
  const needs = rec(input.needs); needs.pages = rows(needs.pages).filter(row => row.pageId !== pageId);
  const backend = rec(input.backend);
  backend.endpoints = rows(backend.endpoints).filter(row => row.page !== pageId);
  const used = new Set(rows(backend.endpoints).map(row => row.usecaseRef));
  backend.usecases = rows(backend.usecases).filter(row => used.has(row.usecaseId));
  const effort = rec(input.effort);
  effort.endpoints = rows(effort.endpoints).filter(row => row.page !== pageId);
  effort.usecases = rows(effort.usecases).filter(row => used.has(row.usecaseId));
  const removedScreen = rows(effort.screens).find(row => row.pageId === pageId)!;
  removedScreen.status = 'toRemove'; removedScreen.endpoints = [];
  const liveScreens = rows(effort.screens).filter(row => row.pageId !== pageId);
  liveScreens[0].status = 'toUpdate'; liveScreens[1].status = 'done';
  for (const group of ['screens', 'endpoints', 'usecases', 'tables']) {
    const values = rows(effort[group]); const totals = rec(rec(effort.totals)[group]);
    for (const status of ['toCreate', 'toUpdate', 'toRemove', 'done']) totals[status] = values.filter(value => value.status === status).length;
  }
  const snapshot = await buildD2InputSnapshot(IDENTITY, input, prior);
  assert.deepEqual(snapshot.selection.remove.map(item => item.pageId), [pageId]);
  assert.deepEqual(snapshot.selection.remove[0].destinations, prior.selection.pages.find(page => page.pageId === pageId)?.destinations);
  assert.ok(snapshot.selection.writePageIds.includes(String(liveScreens[0].pageId)));
  assert.ok(snapshot.selection.preservePageIds.includes(String(liveScreens[1].pageId)));
  await assert.rejects(() => buildD2InputSnapshot(IDENTITY, input), (error: unknown) => error instanceof D2InputValidationError && error.problems.some(item => item.code === 'REMOVED_PAGE_NOT_IN_INVENTORY'));
});

void test('mechanical mismatches reject before a snapshot can be persisted', async t => {
  const cases: Array<[string, (input: D2InputArtifacts) => void, string]> = [
    ['duplicate route', input => { const endpoints = rec(input.backend).endpoints as unknown[]; endpoints.push(structuredClone(endpoints[0])); }, 'DUPLICATE_ID'],
    ['missing menu id', input => { delete rows(rec(input.menu).tree)[0].id; }, 'MENU_ID_MISSING'],
    ['mixed module', input => { rec(input.backend).moduleName = 'otherModule'; }, 'MODULE_IDENTITY_MISMATCH'],
    ['unsupported version', input => { rec(input.menu).schemaVersion = 'future'; }, 'UNSUPPORTED_VERSION'],
    ['dangling usecase', input => { rows(rec(input.backend).endpoints)[0].usecaseRef = 'missing'; }, 'USECASE_REF_MISSING'],
  ];
  for (const [name, mutate, code] of cases) await t.test(name, async () => {
    const input = artifacts('current'); mutate(input);
    await assert.rejects(() => buildD2InputSnapshot(IDENTITY, input), (error: unknown) => error instanceof D2InputValidationError && error.problems.some(item => item.code === code));
  });
});

void test('destination ids and paths are deterministic and reject unsafe page ids', () => {
  assert.deepEqual(destinationsFor(IDENTITY, 'pacientes'), destinationsFor(IDENTITY, 'pacientes'));
  assert.throws(() => destinationsFor(IDENTITY, '../escape'), /unsafe pageId/);
});

function installProblemReportHost(): void {
  type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
  type Stored = Info & { status: string; versionRef: string; content: string; getValueInfo: () => Promise<{ content: string }>; getContent: () => Promise<string> };
  const files: Record<string, Stored> = {};
  const keyOf = (info: Info) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const seed = (info: Info) => {
    const file: Stored = { ...info, status: 'changed', versionRef: '1', content: '', getValueInfo: async () => ({ content: file.content }), getContent: async () => file.content };
    files[keyOf(info)] = file;
  };
  seed(d2InputFile(IDENTITY)); seed(d2InputReportFile(IDENTITY));
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: IDENTITY.project,
    stor: { files, getKeyToFile: keyOf, localStor: { setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; } } },
  };
}
