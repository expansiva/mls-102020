/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize80/run.ts" enhancement="_blank"/>

import { displayPath, fileExists, indexedFile, readJson, readSourceText, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { markD2Complete, markD2FinalizeBlocked, readD2Pipeline, type D2RunIdentity, type D2Scope } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { reusableD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import { readD2PagesReceipt, sourceInfo } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { draftFile, readD2SharedReceipt, sharedInfo, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { contractInfo, contractReceiptInfo, type D2Contracts70Receipt } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';
import { compileD2FinalSources, type D2FinalSource } from '/_102020_/l2/agentDefsL2/steps/finalize60/compile.js';
import type { D2CompileProof } from '/_102020_/l2/agentDefsL2/steps/finalize60/contracts.js';

export const D2_PAGES_FINALIZE_VERSION = '2026-09-30-agent-defs-l2-finalize-v2' as const;

export interface D2PagesOwnership {
  schemaVersion: typeof D2_PAGES_FINALIZE_VERSION;
  project: number;
  module: string;
  artifacts: Array<{ pageId: string; kind: D2FinalSource['kind']; path: string; sha256: string }>;
}
export interface D2PagesFinalizeReport {
  schemaVersion: typeof D2_PAGES_FINALIZE_VERSION;
  project: number;
  module: string;
  snapshotHash: string;
  status: 'complete' | 'blocked';
  pages: string[];
  artifactPaths: string[];
  compilation: D2CompileProof[];
  pending: string[];
}
export interface D2PagesFinalizePort {
  readInput?: typeof readD2Input;
  readBundle?: typeof readD2InputBundle;
  assertStable?: typeof assertD2InputSourcesStable;
  readPipeline?: typeof readD2Pipeline;
  reusable?: typeof reusableD2Page;
  readReceipt?: typeof readD2PagesReceipt;
  readSource?: typeof readSourceText;
  readJson?: typeof readJson;
  readSharedReceipt?: (identity: D2RunIdentity, pageId: string) => Promise<D2SharedReceipt | null>;
  readContractReceipt?: (identity: D2RunIdentity, pageId: string) => Promise<D2Contracts70Receipt | null>;
  readDraftText?: (identity: D2RunIdentity, pageId: string, device: 'desktop' | 'mobile') => Promise<string>;
  writeJson?: typeof writeJson;
  markComplete?: typeof markD2Complete;
  markBlocked?: typeof markD2FinalizeBlocked;
  compile?: typeof compileD2FinalSources;
  indexed?: (info: Ns5FileInfo) => boolean;
}

async function readOptionalSource(port: D2PagesFinalizePort, info: Ns5FileInfo): Promise<{ source: string | null; missing: boolean }> {
  if (!port.readSource && !fileExists(info)) return { source: null, missing: true };
  try {
    const source = await (port.readSource || readSourceText)(info);
    return { source, missing: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('file not found') || message.includes('local content unavailable')) return { source: null, missing: true };
    throw error;
  }
}

function file(identity: D2RunIdentity, shortName: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/finalize80`, shortName, extension: '.json' };
}
async function writeChanged<T>(info: Ns5FileInfo, value: T, port: D2PagesFinalizePort): Promise<boolean> {
  if (JSON.stringify(await (port.readJson || readJson)<T>(info)) === JSON.stringify(value)) return false;
  await (port.writeJson || writeJson)(info, value);
  return true;
}

export async function finalizeD2Pages(identity: D2RunIdentity & { scope?: D2Scope }, port: D2PagesFinalizePort = {}): Promise<{ report: D2PagesFinalizeReport; writes: number }> {
  const snapshot = await (port.readInput || readD2Input)(identity);
  if (!snapshot) throw new Error('D2_FINALIZE_INPUT_MISSING');
  const bundle = await (port.readBundle || readD2InputBundle)(identity);
  await (port.assertStable || assertD2InputSourcesStable)(bundle);
  const pipeline = await (port.readPipeline || readD2Pipeline)(identity);
  const scope: D2Scope = identity.scope === 'all' ? 'all' : 'pages';
  const pending: string[] = [];
  if (!pipeline || pipeline.steps.entry10?.status !== 'approved' || pipeline.steps.input20?.status !== 'approved'
    || pipeline.steps.pages50?.status !== 'approved' || pipeline.steps.pages50.snapshotHash !== snapshot.snapshotHash
    || (scope === 'all' && (pipeline.steps.bff55?.status !== 'approved' || pipeline.steps.bff55.snapshotHash !== snapshot.snapshotHash
      || pipeline.steps.shared60?.status !== 'approved' || pipeline.steps.shared60.snapshotHash !== snapshot.snapshotHash
      || pipeline.steps.contracts70?.status !== 'approved' || pipeline.steps.contracts70.snapshotHash !== snapshot.snapshotHash))) pending.push('D2_FINALIZE_PIPELINE_INCOMPLETE');
  const pageIds = [...snapshot.selection.writePageIds].sort();
  const sources: D2FinalSource[] = [];
  const artifacts: D2PagesOwnership['artifacts'] = [];
  for (const pageId of pageIds) {
    if (!await (port.reusable || reusableD2Page)(identity, pageId)) { pending.push(`D2_FINALIZE_PAGE_STALE: ${pageId}`); continue; }
    const receipt = await (port.readReceipt || readD2PagesReceipt)(identity, pageId);
    if (!receipt) { pending.push(`D2_FINALIZE_RECEIPT_MISSING: ${pageId}`); continue; }
    for (const device of ['desktop', 'mobile'] as const) {
      const info = sourceInfo(identity, pageId, device);
      const path = displayPath(info);
      if (!(port.indexed ? port.indexed(info) : Boolean(indexedFile(info)))) { pending.push(`D2_FINALIZE_INDEX_ENTRY_MISSING: ${path}`); continue; }
      const source = await (port.readSource || readSourceText)(info);
      const hash = await sha256Text(source);
      if (hash !== receipt.sourceHashes[device]) { pending.push(`D2_FINALIZE_SOURCE_CHANGED: ${path}`); continue; }
      sources.push({ pageId, kind: device === 'desktop' ? 'desktopPage' : 'mobilePage', path, source });
      artifacts.push({ pageId, kind: device === 'desktop' ? 'desktopPage' : 'mobilePage', path, sha256: hash });
    }
    if (scope !== 'all') continue;
    const sharedReceipt = await (port.readSharedReceipt || readD2SharedReceipt)(identity, pageId);
    const contractReceipt = await (port.readContractReceipt || ((id, page) => readJson<D2Contracts70Receipt>(contractReceiptInfo(id, page))))(identity, pageId);
    const sharedPath = displayPath(sharedInfo(identity, pageId));
    let sharedStale = !sharedReceipt?.page11Hashes || !sharedReceipt.draftHashes;
    if (!sharedStale) {
      for (const device of ['desktop', 'mobile'] as const) {
        const page11Hash = await sha256Text(await (port.readSource || readSourceText)(sourceInfo(identity, pageId, device)));
        const draftValue = port.readDraftText ? undefined : await (port.readJson || readJson)(draftFile(identity, pageId, device));
        const draftRaw = port.readDraftText ? await port.readDraftText(identity, pageId, device) : draftValue == null ? '' : JSON.stringify(draftValue);
        if (!port.readDraftText && draftValue == null) sharedStale = true;
        else if (sharedReceipt!.page11Hashes[device] !== page11Hash || sharedReceipt!.draftHashes[device] !== await sha256Text(draftRaw)) sharedStale = true;
      }
    }
    const contractPath = displayPath(contractInfo(identity, pageId));
    const sharedRead = await readOptionalSource(port, sharedInfo(identity, pageId));
    const contractRead = await readOptionalSource(port, contractInfo(identity, pageId));
    if (sharedRead.missing) pending.push(`D2_FINALIZE_SHARED_MISSING: ${sharedPath}`);
    if (contractRead.missing) pending.push(`D2_FINALIZE_CONTRACT_MISSING: ${contractPath}`);
    if (sharedStale && !sharedRead.missing) pending.push(`D2_FINALIZE_SHARED_STALE: ${sharedPath}`);
    const sharedNow = sharedRead.source === null ? '' : await sha256Text(sharedRead.source);
    if (!sharedRead.missing && !contractRead.missing && (!contractReceipt?.sharedHash || contractReceipt.sharedHash !== sharedNow)) pending.push(`D2_FINALIZE_CONTRACT_STALE: ${contractPath}`);
    const extras: Array<{ kind: 'shared' | 'contract'; info: Ns5FileInfo; source: string | null; missing: boolean; sourceHash?: string; skip: boolean }> = [
      { kind: 'shared', info: sharedInfo(identity, pageId), source: sharedRead.source, missing: sharedRead.missing, sourceHash: sharedReceipt?.sourceHash, skip: sharedStale || sharedRead.missing },
      { kind: 'contract', info: contractInfo(identity, pageId), source: contractRead.source, missing: contractRead.missing, sourceHash: contractReceipt?.sourceHash, skip: contractRead.missing || !contractReceipt?.sharedHash || contractReceipt.sharedHash !== sharedNow },
    ];
    for (const extra of extras) {
      if (extra.skip) continue;
      const path = displayPath(extra.info);
      if (!(port.indexed ? port.indexed(extra.info) : Boolean(indexedFile(extra.info)))) { pending.push(`D2_FINALIZE_INDEX_ENTRY_MISSING: ${path}`); continue; }
      const source = extra.source ?? '';
      const hash = await sha256Text(source);
      if (!extra.sourceHash || hash !== extra.sourceHash) { pending.push(`D2_FINALIZE_DRIFT: ${path}`); continue; }
      sources.push({ pageId, kind: extra.kind, path, source });
      artifacts.push({ pageId, kind: extra.kind, path, sha256: hash });
    }
  }
  await (port.assertStable || assertD2InputSourcesStable)(bundle);
  let compilation: D2CompileProof[] = [];
  if (!pending.length) {
    compilation = await (port.compile || compileD2FinalSources)(identity, sources, new Map(artifacts.map(item => [item.path, item.sha256])));
    if (compilation.length !== sources.length || sources.some(source => compilation.filter(proof => proof.path === source.path && proof.sha256 === artifacts.find(item => item.path === source.path)?.sha256 && proof.status === 'passed').length !== 1)) {
      pending.push('D2_FINALIZE_STUDIO_COMPILE_INCOMPLETE');
    }
    for (const proof of compilation.filter(item => item.status !== 'passed')) pending.push(`D2_FINALIZE_COMPILE_FAILED: ${proof.path}: ${proof.diagnostics.join('; ')}`);
  }
  if ((await (port.readInput || readD2Input)(identity))?.snapshotHash !== snapshot.snapshotHash) throw new Error('D2_FINALIZE_STALE_RUN');
  const report: D2PagesFinalizeReport = { schemaVersion: D2_PAGES_FINALIZE_VERSION, ...identity, snapshotHash: snapshot.snapshotHash,
    status: pending.length ? 'blocked' : 'complete', pages: pageIds, artifactPaths: artifacts.map(item => item.path).sort(), compilation, pending };
  if (pending.length) {
    const writes = Number(await writeChanged(file(identity, 'report'), report, port));
    await (port.markBlocked || markD2FinalizeBlocked)(identity, pending.join('; '), snapshot.snapshotHash);
    return { report, writes };
  }
  const ownership: D2PagesOwnership = { schemaVersion: D2_PAGES_FINALIZE_VERSION, ...identity, artifacts: artifacts.sort((a, b) => a.path.localeCompare(b.path)) };
  let writes = Number(await writeChanged(file(identity, 'ownership'), ownership, port));
  if (await writeChanged(file(identity, 'report'), report, port)) writes += 1;
  await (port.markComplete || markD2Complete)(identity, [...report.artifactPaths, displayPath(file(identity, 'report'))], snapshot.snapshotHash);
  return { report, writes };
}
