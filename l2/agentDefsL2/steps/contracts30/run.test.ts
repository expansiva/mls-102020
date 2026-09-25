/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { D2_INPUT_VERSION, type D2InputArtifacts, type D2InputSnapshot, type D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { d2InputFile } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { buildD2ContractsCatalog, D2ContractDerivationError } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import {
  d2ContractDraftFile,
  d2ContractFile,
  d2ContractResultFile,
  d2ContractsManifestFile,
  readApprovedD2ContractsManifest,
  readD2ContractDraft,
  readD2ContractResult,
  readD2ContractsManifest,
} from '/_102020_/l2/agentDefsL2/steps/contracts30/io.js';
import { assertD2ContractUnit, d2ContractsSources, generateD2Contracts } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HEAD = path.join(HERE, 'fixtures', 'head');
const INPUT = path.resolve(HERE, '..', 'input20', 'fixtures', 'current');
const HISTORICAL = path.resolve(HERE, '..', 'input20', 'fixtures', 'historical');
const IDENTITY: D2RunIdentity = { project: 102047, module: 'agendaClinica' };

type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
type Stored = Info & { status: string; versionRef: string; content: string; getValueInfo: () => Promise<{ content: string }>; getContent: () => Promise<string> };

void test('current target persists exact 5-page/19-route barrier, compiles and reruns byte-identically with zero model calls', async () => {
  const fixture = runFixture(true);
  assert.equal(fixture.snapshot.selection.pages.length, 5);
  assert.equal(fixture.snapshot.selection.pages.flatMap(page => page.endpoints).length, 19);
  fixture.snapshot.selection.pages[0].status = 'toUpdate';
  const host = installHost(fixture.snapshot);
  let sourceChecks = 0;

  const first = await generateD2Contracts(IDENTITY, fixture.snapshot, fixture.artifacts, async () => { sourceChecks += 1; });
  assert.equal(first.manifest.status, 'approved');
  assert.equal(first.manifest.units.length, 5);
  assert.equal(first.manifest.units.filter(unit => unit.mode === 'update').length, 1);
  assert.equal(first.written, 5);
  assert.equal(host.modelReads.value, 0);
  assert.equal(sourceChecks, 2);
  const backendRoutes = rows(json(path.join(INPUT, 'backend.json')).endpoints).map(row => text(row.route)).sort();
  assert.deepEqual(first.manifest.units.flatMap(unit => unit.routes).sort(), backendRoutes);
  assert.ok(first.manifest.units.some(unit => unit.normalizations.some(item => item.detail === 'details.attendanceNote -> Consulta.details.attendanceNote')));
  const sourcesBefore = Object.fromEntries(first.manifest.units.map(unit => [unit.pageId, host.files[keyOf(d2ContractFile(IDENTITY, unit.pageId))].content]));
  compilePersistedContracts(sourcesBefore);

  const writesBefore = host.writes.length;
  const second = await generateD2Contracts(IDENTITY, fixture.snapshot, fixture.artifacts, async () => { sourceChecks += 1; });
  assert.equal(second.written, 0);
  assert.equal(second.reused, 5);
  assert.equal(host.writes.length, writesBefore);
  assert.equal(sourceChecks, 4);
  assert.deepEqual(Object.fromEntries(second.manifest.units.map(unit => [unit.pageId, host.files[keyOf(d2ContractFile(IDENTITY, unit.pageId))].content])), sourcesBefore);
});

void test('real writer failure leaves only gated draft/building barrier and restart reuses approved units', async () => {
  const fixture = runFixture(true);
  const host = installHost(fixture.snapshot);
  host.failPage = 'consultas_profissional';
  await assert.rejects(() => generateD2Contracts(IDENTITY, fixture.snapshot, fixture.artifacts), /simulated writer failure/);
  const manifest = await readD2ContractsManifest(IDENTITY);
  assert.equal(manifest?.status, 'building');
  assert.equal(await readApprovedD2ContractsManifest(IDENTITY, fixture.snapshot.snapshotHash), null);
  assert.equal((await readD2ContractDraft(IDENTITY, host.failPage))?.status, 'gated');
  assert.equal(await readD2ContractResult(IDENTITY, host.failPage), null);
  const completedPage = 'cadastro_profissional';
  assert.equal((await readD2ContractResult(IDENTITY, completedPage))?.status, 'approved');
  const completedKeys = [d2ContractDraftFile(IDENTITY, completedPage), d2ContractFile(IDENTITY, completedPage), d2ContractResultFile(IDENTITY, completedPage)].map(keyOf);
  const countsBefore = completedKeys.map(key => host.writes.filter(written => written === key).length);

  host.failPage = '';
  const resumed = await generateD2Contracts(IDENTITY, fixture.snapshot, fixture.artifacts);
  assert.equal(resumed.manifest.status, 'approved');
  assert.ok(resumed.reused >= 2);
  assert.deepEqual(completedKeys.map(key => host.writes.filter(written => written === key).length), countsBefore);
});

void test('pinned HEAD missing transition payload is diagnosed and stale hook cannot replace a newer snapshot', async () => {
  const head = runFixture(false);
  installHost(head.snapshot);
  await assert.rejects(() => generateD2Contracts(IDENTITY, head.snapshot, head.artifacts), (error: unknown) =>
    error instanceof D2ContractDerivationError && error.issues.some(issue => issue.code === 'D2_CONTRACT_TRANSITION_PAYLOAD_MISSING'
      && issue.source === 'ontology' && issue.path === 'Consulta.transitions.registrarAtendimento'));

  const positive = runFixture(true);
  const host = installHost(positive.snapshot);
  await generateD2Contracts(IDENTITY, positive.snapshot, positive.artifacts);
  const before = host.files[keyOf(d2ContractFile(IDENTITY, 'consultas_profissional'))].content;
  const newer = { ...positive.snapshot, snapshotHash: `sha256:${'e'.repeat(64)}` };
  host.seed(d2InputFile(IDENTITY), `${JSON.stringify(newer)}\n`);
  await assert.rejects(() => generateD2Contracts(IDENTITY, positive.snapshot, positive.artifacts), /D2_CONTRACT_STALE_RUN/);
  assert.equal(host.files[keyOf(d2ContractFile(IDENTITY, 'consultas_profissional'))].content, before);
});

void test('done pages are excluded, and the historical regression fixture remains 7 pages/22 routes', () => {
  const fixture = runFixture(true);
  fixture.snapshot.selection.pages[0].status = 'done';
  fixture.snapshot.selection.writePageIds = fixture.snapshot.selection.writePageIds.filter(id => id !== fixture.snapshot.selection.pages[0].pageId);
  fixture.snapshot.selection.preservePageIds = [fixture.snapshot.selection.pages[0].pageId];
  fixture.snapshot.selection.remove = [{ pageId: 'removed_page', status: 'toRemove', destinations: [] }];
  assert.equal(d2ContractsSources(fixture.snapshot, fixture.artifacts).pages.some(page => page.pageId === fixture.snapshot.selection.pages[0].pageId), false);
  const historicalNeeds = json(path.join(HISTORICAL, 'needs.json'));
  const historicalBackend = json(path.join(HISTORICAL, 'backend.json'));
  assert.equal(rows(historicalNeeds.pages).length, 7);
  assert.equal(rows(historicalBackend.endpoints).length, 22);
});

void test('unit gate identifies a derived create input instead of publishing it', () => {
  const fixture = runFixture(true);
  const contracts = buildD2ContractsCatalog(d2ContractsSources(fixture.snapshot, fixture.artifacts));
  const create = contracts.flatMap(contract => contract.calls).find(call => call.operation === 'create')!;
  const identity = create.output.flatMap(field => [field, ...field.children]).find(field => field.name === 'id')!;
  create.input.push(identity);
  assert.throws(() => assertD2ContractUnit(contracts.find(contract => contract.calls.includes(create))!), /D2_CONTRACT_DERIVED_INPUT_FORBIDDEN/);
});

void test('unit gate accepts a marked update precondition and rejects the same derived field when unmarked', () => {
  const fixture = runFixture(true);
  const contracts = buildD2ContractsCatalog(d2ContractsSources(fixture.snapshot, fixture.artifacts));
  const update = contracts.flatMap(contract => contract.calls).find(call => call.operation === 'update')!;
  const identity = update.input.find(field => field.name === 'id')!;
  const token = { ...identity, path: `${update.entityId}.revisionToken`, name: 'revisionToken', scalar: 'number' as const, tsType: 'number', indexed: false, writePrecondition: true, children: [] };
  update.input.push(token);
  assert.doesNotThrow(() => assertD2ContractUnit(contracts.find(contract => contract.calls.includes(update))!));
  token.writePrecondition = false;
  assert.throws(() => assertD2ContractUnit(contracts.find(contract => contract.calls.includes(update))!), /D2_CONTRACT_DERIVED_INPUT_FORBIDDEN/);
});

function runFixture(explicitPayload: boolean): { snapshot: D2InputSnapshot; artifacts: D2InputArtifacts } {
  const backend = json(path.join(INPUT, 'backend.json'));
  const needs = json(path.join(INPUT, 'needs.json'));
  const entities: Record<string, unknown> = {};
  for (const name of readdirSync(path.join(HEAD, 'l4', 'ontology')).filter(name => name !== 'index.defs.ts')) {
    const entity = defs(path.join(HEAD, 'l4', 'ontology', name));
    entities[text(entity.entityId)] = entity;
  }
  if (explicitPayload) {
    const consulta = structuredClone(entities.Consulta) as Record<string, unknown>;
    for (const transition of rows(consulta.transitions)) transition.payload = transition.transitionId === 'registrarAtendimento' ? ['details.attendanceNote'] : [];
    entities.Consulta = consulta as unknown as Ns5OntologyAnyEntity;
  }
  const usecases = rows(backend.usecases);
  const pages: D2SelectedPage[] = rows(needs.pages).map(raw => {
    const pageId = text(raw.pageId);
    const endpoints = rows(backend.endpoints).filter(endpoint => endpoint.page === pageId);
    const ids = new Set(endpoints.map(endpoint => endpoint.usecaseRef));
    return {
      pageId, status: 'toCreate', label: pageId, actors: strings(raw.actors), authorityRefs: [], ancestors: [], journeyRefs: [],
      organisms: [], reads: rows(raw.reads), writes: rows(raw.writes), endpoints, usecases: usecases.filter(usecase => ids.has(usecase.usecaseId)), destinations: [],
    };
  });
  const snapshot: D2InputSnapshot = {
    ...IDENTITY, schemaVersion: D2_INPUT_VERSION, device: 'web', snapshotHash: `sha256:${'c'.repeat(64)}`, releaseIdentity: null, sources: [],
    l4: {} as D2InputSnapshot['l4'],
    selection: { pages, writePageIds: pages.map(page => page.pageId), preservePageIds: [], remove: [], counts: { pages: 5, endpoints: 19, usecases: 13, destinations: 20, materializationItems: 15 } },
    normalizations: [], problems: [],
  };
  const artifacts: D2InputArtifacts = {
    sources: [], module: {}, journeyIndex: {}, journeys: {}, ontologyIndex: {}, entities,
    rules: {}, workflows: {}, access: defs(path.join(INPUT, 'access.defs.ts')), integration: {}, menu: {}, needs, backend, effort: {},
  };
  return { snapshot, artifacts };
}

function installHost(snapshot: D2InputSnapshot): { files: Record<string, Stored>; writes: string[]; failPage: string; modelReads: { value: number }; seed: (info: Info, content?: string) => Stored } {
  const files: Record<string, Stored> = {};
  const writes: string[] = [];
  const modelReads = { value: 0 };
  const host = {
    files, writes, failPage: '', modelReads,
    seed: (info: Info, content = '') => {
      const file: Stored = { ...info, status: 'changed', versionRef: '1', content, getValueInfo: async () => ({ content: file.content }), getContent: async () => file.content };
      files[keyOf(info)] = file; return file;
    },
  };
  host.seed(d2InputFile(IDENTITY), `${JSON.stringify(snapshot)}\n`);
  host.seed(d2ContractsManifestFile(IDENTITY));
  for (const pageId of snapshot.selection.writePageIds) {
    host.seed(d2ContractDraftFile(IDENTITY, pageId));
    host.seed(d2ContractResultFile(IDENTITY, pageId));
    host.seed(d2ContractFile(IDENTITY, pageId));
  }
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: IDENTITY.project,
    ai: new Proxy({}, { get: () => { modelReads.value += 1; return undefined; } }),
    stor: { files, getKeyToFile: keyOf, localStor: { setContent: async (file: Stored, value: { content: string }) => {
      if (host.failPage && file.folder.endsWith('/web/contracts') && file.shortName === host.failPage) throw new Error('simulated writer failure');
      file.content = value.content; writes.push(keyOf(file));
    } } },
  };
  return host;
}

function compilePersistedContracts(sources: Record<string, string>): void {
  const folder = mkdtempSync(path.join(tmpdir(), 'd2-contract-run-'));
  try {
    for (const [pageId, source] of Object.entries(sources)) writeFileSync(path.join(folder, `${pageId}.defs.ts`), source);
    writeFileSync(path.join(folder, 'consumer.ts'), [
      "import { listConsultaRoute } from './consultas_profissional.defs.js';",
      "import type { ListConsultaOutput, RegistrarAtendimentoInput } from './consultas_profissional.defs.js';",
      "const route: 'agendaClinica.consultas_profissional.qryListConsulta' = listConsultaRoute;",
      'const output: ListConsultaOutput = [];',
      "const input: RegistrarAtendimentoInput = { id: 'consulta-1', details: { attendanceNote: 'completed' } };",
      'void route; void output; void input;',
    ].join('\n'));
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const files = ['consumer.ts', ...Object.keys(sources).map(pageId => `${pageId}.defs.ts`)];
    const result = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', ...files], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

function keyOf(info: Info): string { return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`; }
function json(file: string): Record<string, unknown> { return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>; }
function defs(file: string): Record<string, unknown> { const value = parseNs4ClassicDefsSource<Record<string, unknown>>(readFileSync(file, 'utf8')); assert.ok(value, file); return value; }
function rec(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
