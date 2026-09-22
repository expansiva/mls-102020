/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/io.ts" enhancement="_blank"/>

import {
  displayPath,
  readJson,
  readSourceText,
  writeJson,
  writeSourceText,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type {
  D2ContractsManifest,
  D2ContractUnitDraft,
  D2ContractUnitResult,
} from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

export function d2ContractFile(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/contracts`, shortName: safePageId(pageId), extension: '.defs.ts' };
}

export function d2ContractDraftFile(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return ownedFile(identity, 'drafts', safePageId(pageId));
}

export function d2ContractResultFile(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return ownedFile(identity, 'results', safePageId(pageId));
}

export function d2ContractsManifestFile(identity: D2RunIdentity): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'contracts', extension: '.json' };
}

export async function readD2ContractSource(identity: D2RunIdentity, pageId: string): Promise<string> {
  try { return await readSourceText(d2ContractFile(identity, pageId)); }
  catch { return ''; }
}

export async function writeD2ContractSource(identity: D2RunIdentity, pageId: string, source: string): Promise<void> {
  await writeSourceText(d2ContractFile(identity, pageId), source);
}

export async function readD2ContractDraft(identity: D2RunIdentity, pageId: string): Promise<D2ContractUnitDraft | null> {
  return readJson<D2ContractUnitDraft>(d2ContractDraftFile(identity, pageId));
}

export async function writeD2ContractDraft(identity: D2RunIdentity, draft: D2ContractUnitDraft): Promise<void> {
  if (sameJson(await readD2ContractDraft(identity, draft.pageId), draft)) return;
  await writeJson(d2ContractDraftFile(identity, draft.pageId), draft);
}

export async function readD2ContractResult(identity: D2RunIdentity, pageId: string): Promise<D2ContractUnitResult | null> {
  return readJson<D2ContractUnitResult>(d2ContractResultFile(identity, pageId));
}

export async function writeD2ContractResult(identity: D2RunIdentity, result: D2ContractUnitResult): Promise<void> {
  if (sameJson(await readD2ContractResult(identity, result.pageId), result)) return;
  await writeJson(d2ContractResultFile(identity, result.pageId), result);
}

export async function readD2ContractsManifest(identity: D2RunIdentity): Promise<D2ContractsManifest | null> {
  return readJson<D2ContractsManifest>(d2ContractsManifestFile(identity));
}

/** Downstream phases consume only a complete barrier for their exact immutable input snapshot. */
export async function readApprovedD2ContractsManifest(identity: D2RunIdentity, snapshotHash: string): Promise<D2ContractsManifest | null> {
  const manifest = await readD2ContractsManifest(identity);
  return manifest?.status === 'approved' && manifest.snapshotHash === snapshotHash ? manifest : null;
}

export async function writeD2ContractsManifest(identity: D2RunIdentity, manifest: D2ContractsManifest): Promise<void> {
  if (sameJson(await readD2ContractsManifest(identity), manifest)) return;
  await writeJson(d2ContractsManifestFile(identity), manifest);
}

export function d2ContractDisplayPath(identity: D2RunIdentity, pageId: string): string {
  return displayPath(d2ContractFile(identity, pageId));
}

function ownedFile(identity: D2RunIdentity, kind: 'drafts' | 'results', pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/contracts30/${kind}`, shortName: pageId, extension: '.json' };
}

function safePageId(value: string): string {
  if (!/^[a-z][A-Za-z0-9_-]*$/.test(value)) throw new Error(`D2_CONTRACT_PAGE_ID_UNSAFE: ${value}`);
  return value;
}

function sameJson(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
