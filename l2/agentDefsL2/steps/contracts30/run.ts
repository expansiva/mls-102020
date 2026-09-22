/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/run.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { readD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import type { D2InputArtifacts, D2InputSnapshot, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2ContractsCatalog, type D2ContractsSources, type D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import {
  d2ContractDisplayPath,
  readD2ContractResult,
  readD2ContractSource,
  readD2ContractsManifest,
  writeD2ContractDraft,
  writeD2ContractResult,
  writeD2ContractSource,
  writeD2ContractsManifest,
} from '/_102020_/l2/agentDefsL2/steps/contracts30/io.js';
import { assertD2RenderedContract, renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';

export const D2_CONTRACTS_VERSION = '2026-09-21-agent-defs-l2-contracts-v1' as const;

export interface D2ContractNormalization {
  code: 'transition-payload-qualified';
  pageId: string;
  route: string;
  detail: string;
}

export interface D2ContractUnitDraft extends D2RunIdentity {
  schemaVersion: typeof D2_CONTRACTS_VERSION;
  pageId: string;
  mode: 'create' | 'update';
  status: 'gated';
  snapshotHash: string;
  artifactPath: string;
  sourceHash: string;
  routes: string[];
  normalizations: D2ContractNormalization[];
  source: string;
}

export interface D2ContractUnitResult extends D2RunIdentity {
  schemaVersion: typeof D2_CONTRACTS_VERSION;
  pageId: string;
  mode: 'create' | 'update';
  status: 'approved';
  snapshotHash: string;
  artifactPath: string;
  sourceHash: string;
  routes: string[];
  normalizations: D2ContractNormalization[];
}

export interface D2ContractsManifest extends D2RunIdentity {
  schemaVersion: typeof D2_CONTRACTS_VERSION;
  status: 'building' | 'approved';
  snapshotHash: string;
  units: D2ContractUnitResult[];
}

export interface D2ContractsRunResult {
  manifest: D2ContractsManifest;
  written: number;
  reused: number;
}

interface PreparedUnit { draft: D2ContractUnitDraft; }

export function d2ContractsSources(snapshot: D2InputSnapshot, artifacts: D2InputArtifacts): D2ContractsSources {
  const writeIds = new Set(snapshot.selection.writePageIds);
  const entities = Object.fromEntries(Object.entries(artifacts.entities).map(([id, value]) => [id, value as Ns5OntologyAnyEntity]));
  return {
    module: snapshot.module,
    entities,
    access: artifacts.access,
    pages: snapshot.selection.pages.filter(page => writeIds.has(page.pageId)).map(page => ({
      pageId: page.pageId,
      actors: page.actors,
      endpoints: page.endpoints,
      usecases: page.usecases,
    })),
  };
}

export function assertD2BundleMatchesSnapshot(snapshot: D2InputSnapshot, artifacts: D2InputArtifacts): void {
  const expected = snapshot.sources.map(source => `${source.path}\0${source.sha256}\0${source.bytes}\0${source.schemaVersion}`).sort();
  const actual = artifacts.sources.map(source => `${source.path}\0${source.sha256}\0${source.bytes}\0${source.schemaVersion}`).sort();
  if (expected.join('\n') !== actual.join('\n')) throw new Error('D2_CONTRACT_INPUT_SNAPSHOT_CHANGED: source digests differ from input.json');
}

export async function generateD2Contracts(
  identity: D2RunIdentity,
  snapshot: D2InputSnapshot,
  artifacts: D2InputArtifacts,
  verifySources: () => Promise<void> = async () => undefined,
): Promise<D2ContractsRunResult> {
  assertIdentity(identity, snapshot);
  assertD2BundleMatchesSnapshot(snapshot, artifacts);
  const prepared = await prepareUnits(identity, snapshot, artifacts);
  await assertCurrentSnapshot(identity, snapshot.snapshotHash);
  await verifySources();

  const priorManifest = await readD2ContractsManifest(identity);
  if (priorManifest?.status === 'approved' && priorManifest.snapshotHash === snapshot.snapshotHash && await barrierValid(identity, prepared, priorManifest.units)) {
    await verifySources();
    return { manifest: priorManifest, written: 0, reused: prepared.length };
  }

  await writeD2ContractsManifest(identity, {
    schemaVersion: D2_CONTRACTS_VERSION, ...identity, status: 'building', snapshotHash: snapshot.snapshotHash, units: [],
  });

  let written = 0;
  let reused = 0;
  const results: D2ContractUnitResult[] = [];
  for (const unit of prepared) {
    const existing = await readD2ContractResult(identity, unit.draft.pageId);
    if (existing && resultMatchesDraft(existing, unit.draft) && await sourceMatches(identity, unit.draft.pageId, unit.draft.sourceHash)) {
      results.push(existing); reused += 1; continue;
    }
    await writeD2ContractDraft(identity, unit.draft);
    await assertCurrentSnapshot(identity, snapshot.snapshotHash);
    if (!await sourceMatches(identity, unit.draft.pageId, unit.draft.sourceHash)) {
      await writeD2ContractSource(identity, unit.draft.pageId, unit.draft.source);
      written += 1;
    }
    const persisted = await readD2ContractSource(identity, unit.draft.pageId);
    if (await sha256Text(persisted) !== unit.draft.sourceHash) throw new Error(`D2_CONTRACT_WRITE_HASH_MISMATCH: ${unit.draft.artifactPath}`);
    await assertCurrentSnapshot(identity, snapshot.snapshotHash);
    const result = approvedResult(unit.draft);
    await writeD2ContractResult(identity, result);
    results.push(result);
  }

  const manifest: D2ContractsManifest = {
    schemaVersion: D2_CONTRACTS_VERSION, ...identity, status: 'approved', snapshotHash: snapshot.snapshotHash,
    units: [...results].sort((a, b) => a.pageId.localeCompare(b.pageId)),
  };
  if (!await barrierValid(identity, prepared, manifest.units)) throw new Error('D2_CONTRACT_BARRIER_FAILED: persisted contracts/results do not match prepared units');
  await assertCurrentSnapshot(identity, snapshot.snapshotHash);
  await verifySources();
  await writeD2ContractsManifest(identity, manifest);
  return { manifest, written, reused };
}

async function prepareUnits(identity: D2RunIdentity, snapshot: D2InputSnapshot, artifacts: D2InputArtifacts): Promise<PreparedUnit[]> {
  const writeIds = [...snapshot.selection.writePageIds].sort();
  const pages = new Map(snapshot.selection.pages.map(page => [page.pageId, page]));
  for (const pageId of writeIds) {
    const page = pages.get(pageId);
    if (!page || (page.status !== 'toCreate' && page.status !== 'toUpdate')) throw new Error(`D2_CONTRACT_UNIT_STATUS_INVALID: ${pageId}`);
  }
  const contracts = buildD2ContractsCatalog(d2ContractsSources(snapshot, artifacts));
  if (contracts.map(item => item.pageId).join('\0') !== writeIds.join('\0')) throw new Error('D2_CONTRACT_UNIT_SET_MISMATCH');
  const result: PreparedUnit[] = [];
  for (const contract of contracts) {
    const page = pages.get(contract.pageId)!;
    assertRoutesEqual(page, contract);
    assertD2ContractUnit(contract);
    const source = renderD2PageContract(contract);
    assertD2RenderedContract(source, contract);
    result.push({ draft: {
      schemaVersion: D2_CONTRACTS_VERSION,
      ...identity,
      pageId: contract.pageId,
      mode: page.status === 'toCreate' ? 'create' : 'update',
      status: 'gated',
      snapshotHash: snapshot.snapshotHash,
      artifactPath: d2ContractDisplayPath(identity, contract.pageId),
      sourceHash: await sha256Text(source),
      routes: contract.calls.map(call => call.route).sort(),
      normalizations: normalizationsOf(page, artifacts),
      source,
    } });
  }
  return result;
}

export function assertD2ContractUnit(contract: D2PageContract): void {
  for (const call of contract.calls) for (const field of flattenFields(call.input)) {
    if (!field.derived) continue;
    const existingRecordIdentity = (call.operation === 'get' || call.operation === 'update' || call.operation === 'transition') && field.name === 'id';
    const indexedListFilter = call.operation === 'list' && field.indexed;
    if (!existingRecordIdentity && !indexedListFilter) throw new Error(`D2_CONTRACT_DERIVED_INPUT_FORBIDDEN: ${call.route} ${field.path}`);
  }
}

function assertRoutesEqual(page: D2SelectedPage, contract: D2PageContract): void {
  const expected = page.endpoints.map(endpoint => text(endpoint.route)).sort();
  const actual = contract.calls.map(call => call.route).sort();
  if (expected.join('\0') !== actual.join('\0')) throw new Error(`D2_CONTRACT_ROUTE_SET_MISMATCH: ${page.pageId}`);
}

function flattenFields(fields: D2PageContract['calls'][number]['input']): D2PageContract['calls'][number]['input'] {
  return fields.flatMap(field => [field, ...flattenFields(field.children)]);
}

function normalizationsOf(page: D2SelectedPage, artifacts: D2InputArtifacts): D2ContractNormalization[] {
  const usecases = new Map(page.usecases.map(usecase => [text(usecase.usecaseId), usecase]));
  return page.endpoints.flatMap(endpoint => {
    const usecase = usecases.get(text(endpoint.usecaseRef));
    if (text(usecase?.operation) !== 'transition') return [];
    const entityId = text(usecase?.entity);
    const transition = rows(rec(artifacts.entities[entityId]).transitions).find(item => text(item.transitionId) === text(usecase?.usecaseId));
    return strings(transition?.payload).filter(path => !path.startsWith(`${entityId}.`)).map(path => ({
      code: 'transition-payload-qualified' as const,
      pageId: page.pageId,
      route: text(endpoint.route),
      detail: `${path} -> ${entityId}.${path}`,
    }));
  }).sort((a, b) => `${a.route}\0${a.detail}`.localeCompare(`${b.route}\0${b.detail}`));
}

async function barrierValid(identity: D2RunIdentity, prepared: PreparedUnit[], results: D2ContractUnitResult[]): Promise<boolean> {
  const byPage = new Map(results.map(result => [result.pageId, result]));
  if (byPage.size !== prepared.length) return false;
  for (const unit of prepared) {
    const result = byPage.get(unit.draft.pageId);
    if (!result || !resultMatchesDraft(result, unit.draft)) return false;
    if (!await sourceMatches(identity, unit.draft.pageId, unit.draft.sourceHash)) return false;
  }
  return true;
}

async function sourceMatches(identity: D2RunIdentity, pageId: string, expectedHash: string): Promise<boolean> {
  const source = await readD2ContractSource(identity, pageId);
  return !!source && await sha256Text(source) === expectedHash;
}

function resultMatchesDraft(result: D2ContractUnitResult, draft: D2ContractUnitDraft): boolean {
  return result.schemaVersion === draft.schemaVersion && result.project === draft.project && result.module === draft.module
    && result.pageId === draft.pageId && result.mode === draft.mode && result.status === 'approved'
    && result.snapshotHash === draft.snapshotHash && result.artifactPath === draft.artifactPath
    && result.sourceHash === draft.sourceHash && JSON.stringify(result.routes) === JSON.stringify(draft.routes)
    && JSON.stringify(result.normalizations) === JSON.stringify(draft.normalizations);
}

function approvedResult(draft: D2ContractUnitDraft): D2ContractUnitResult {
  const { source: _source, status: _status, ...rest } = draft;
  return { ...rest, status: 'approved' };
}

async function assertCurrentSnapshot(identity: D2RunIdentity, snapshotHash: string): Promise<void> {
  const current = await readD2Input(identity);
  if (!current || current.snapshotHash !== snapshotHash) throw new Error(`D2_CONTRACT_STALE_RUN: input snapshot is no longer ${snapshotHash}`);
}

function assertIdentity(identity: D2RunIdentity, snapshot: D2InputSnapshot): void {
  if (snapshot.project !== identity.project || snapshot.module !== identity.module) throw new Error('D2_CONTRACT_INPUT_IDENTITY_MISMATCH');
}

export async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function rec(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
