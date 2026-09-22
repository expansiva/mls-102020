/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/run.ts" enhancement="_blank"/>

import { displayPath, readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { markD2Complete, readD2Pipeline, type D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import type { D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { D2_CONTRACTS_VERSION, assertD2BundleMatchesSnapshot, sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { readD2ContractsManifest } from '/_102020_/l2/agentDefsL2/steps/contracts30/io.js';
import { readD2SharedManifest } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import { readD2PagesManifest } from '/_102020_/l2/agentDefsL2/steps/pages50/io.js';
import { D2_SHARED_VERSION } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_VERSION } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { D2_FINALIZE_VERSION, type D2FinalizeReport, type D2FinalizeResult, type D2OwnedArtifact, type D2OwnershipReceipt } from '/_102020_/l2/agentDefsL2/steps/finalize60/contracts.js';
import { d2FinalizeReportFile, d2InfoForPath, deleteD2Owned, readD2Ownership, writeD2FinalizeReport, writeD2Ownership } from '/_102020_/l2/agentDefsL2/steps/finalize60/io.js';
import { gateD2FinalSources, type D2FinalSource } from '/_102020_/l2/agentDefsL2/steps/finalize60/gate.js';

export interface D2FinalizePort { read?: (info: Ns5FileInfo) => Promise<string>; remove?: (info: Ns5FileInfo) => Promise<void>; beforeDeleteCheck?: (path: string) => Promise<void>; }
export interface D2PendingRemoval { path: string; info: Ns5FileInfo; }

export async function finalizeD2(identity: D2RunIdentity, port: D2FinalizePort = {}): Promise<D2FinalizeResult> {
  const read = port.read || readSourceText;
  const remove = port.remove || deleteD2Owned;
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_FINALIZE_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  assertD2BundleMatchesSnapshot(snapshot, bundle.artifacts);
  await assertD2InputSourcesStable(bundle);
  const [contracts, shared, pages, priorOwnership, pipeline] = await Promise.all([
    readD2ContractsManifest(identity), readD2SharedManifest(identity), readD2PagesManifest(identity), readD2Ownership(identity), readD2Pipeline(identity),
  ]);
  const pending: string[] = [];
  const writeIds = [...snapshot.selection.writePageIds].sort();
  const preserveIds = [...snapshot.selection.preservePageIds].sort();
  const activeIds = [...writeIds, ...preserveIds].sort();
  const expectedWrite = writeIds.join('\0');
  if (!pipeline) pending.push('agentDefsL2 pipeline is missing or illegible');
  else for (const stepId of ['entry10', 'input20', 'contracts30', 'shared40', 'pages50'] as const) {
    if (pipeline.steps[stepId]?.status !== 'approved') pending.push(`pipeline step is not approved: ${stepId}`);
  }
  const allowed = new Set(['toCreate', 'toUpdate', 'done']);
  if (snapshot.selection.pages.some(page => !allowed.has(page.status)) || snapshot.selection.remove.some(page => page.status !== 'toRemove')) pending.push('input selection contains an invalid status');
  const idsByWriteStatus = snapshot.selection.pages.filter(page => page.status === 'toCreate' || page.status === 'toUpdate').map(page => page.pageId).sort();
  const idsByDoneStatus = snapshot.selection.pages.filter(page => page.status === 'done').map(page => page.pageId).sort();
  const allSelectionIds = [...snapshot.selection.pages.map(page => page.pageId), ...snapshot.selection.remove.map(page => page.pageId)];
  if (idsByWriteStatus.join('\0') !== writeIds.join('\0') || idsByDoneStatus.join('\0') !== preserveIds.join('\0') || new Set(allSelectionIds).size !== allSelectionIds.length) pending.push('effort status and selection sets are inconsistent');
  const counts = snapshot.selection.counts;
  if (counts.pages !== snapshot.selection.pages.length || counts.destinations !== snapshot.selection.pages.length * 4
    || counts.materializationItems !== snapshot.selection.pages.length * 3
    || counts.endpoints !== snapshot.selection.pages.reduce((sum, page) => sum + page.endpoints.length, 0)
    || counts.usecases !== snapshot.selection.pages.reduce((sum, page) => sum + page.usecases.length, 0)) pending.push('input selection counts are inconsistent');
  if (!contracts || contracts.schemaVersion !== D2_CONTRACTS_VERSION || contracts.status !== 'approved' || contracts.snapshotHash !== snapshot.snapshotHash || contracts.units.some(unit => unit.status !== 'approved' || unit.schemaVersion !== D2_CONTRACTS_VERSION) || contracts.units.map(unit => unit.pageId).sort().join('\0') !== expectedWrite) pending.push('contracts30 barrier does not match the exact write set');
  if (!shared || shared.schemaVersion !== D2_SHARED_VERSION || shared.status !== 'approved' || shared.snapshotHash !== snapshot.snapshotHash || shared.units.some(unit => unit.status !== 'approved' || unit.schemaVersion !== D2_SHARED_VERSION) || shared.units.map(unit => unit.pageId).sort().join('\0') !== expectedWrite) pending.push('shared40 barrier does not match the exact write set');
  if (!pages || pages.schemaVersion !== D2_PAGES_VERSION || pages.status !== 'approved' || pages.snapshotHash !== snapshot.snapshotHash || pages.units.some(unit => unit.status !== 'approved' || unit.schemaVersion !== D2_PAGES_VERSION) || pages.units.map(unit => unit.pageId).sort().join('\0') !== expectedWrite) pending.push('pages50 barrier does not match the exact write set');

  const prior = new Map((priorOwnership?.artifacts || []).map(item => [item.path, item]));
  const sources: D2FinalSource[] = [];
  const owned: D2OwnedArtifact[] = [];
  for (const page of snapshot.selection.pages.filter(item => activeIds.includes(item.pageId)).sort((a, b) => a.pageId.localeCompare(b.pageId))) {
    for (const destination of page.destinations) {
      const info = d2InfoForPath(identity, destination.path);
      let source = '';
      try { source = await read(info); } catch { /* diagnosed below */ }
      if (!source) { pending.push(`${page.status} file missing: ${destination.path}`); continue; }
      const hash = await sha256Text(source);
      if (page.status === 'done') {
        const receipt = prior.get(destination.path);
        if (!receipt) pending.push(`done file has no agentDefsL2 ownership receipt: ${destination.path}`);
        else if (receipt.sha256 !== hash) pending.push(`done file changed after approval: ${destination.path}`);
      } else {
        const manifestHash = hashFromManifests(destination.kind, destination.path, page.pageId, contracts, shared, pages);
        if (!manifestHash || manifestHash !== hash) pending.push(`approved hash mismatch: ${destination.path}`);
      }
      sources.push({ pageId: page.pageId, kind: destination.kind, path: destination.path, source });
      owned.push({ pageId: page.pageId, kind: destination.kind, path: destination.path, sha256: hash });
    }
  }
  try { if (!pending.length) gateD2FinalSources(snapshot, sources); } catch (error) { pending.push(error instanceof Error ? error.message : String(error)); }

  const removals: D2PendingRemoval[] = [];
  const materializationPendingRemove: string[] = [];
  for (const page of [...snapshot.selection.remove].sort((a, b) => a.pageId.localeCompare(b.pageId))) {
    if (!exactDestinations(identity.module, page.pageId, page.destinations)) { pending.push(`remove destination set is invalid: ${page.pageId}`); continue; }
    for (const destination of page.destinations) {
    if (destination.kind !== 'contract') materializationPendingRemove.push(destination.path.replace(/\.defs\.ts$/, '.ts'));
    const receipt = prior.get(destination.path);
    if (!receipt || receipt.pageId !== page.pageId || receipt.kind !== destination.kind) { pending.push(`remove refused without matching ownership receipt: ${destination.path}`); continue; }
    let live = ''; try { live = await read(d2InfoForPath(identity, destination.path)); } catch { /* already absent */ }
    if (!live) continue;
    if (receipt.removed) { pending.push(`previously removed file reappeared without ownership: ${destination.path}`); continue; }
    if (await sha256Text(live) !== receipt.sha256) { pending.push(`remove refused after local edit: ${destination.path}`); continue; }
    removals.push({ path: destination.path, info: d2InfoForPath(identity, destination.path) });
  } }
  await assertStillCurrent(identity, snapshot.snapshotHash, bundle);
  if (!pending.length) pending.push(...await revalidateD2RemovalSet(
    removals, prior, read, () => assertStillCurrent(identity, snapshot.snapshotHash, bundle), port.beforeDeleteCheck,
  ));
  const baseReport = { schemaVersion: D2_FINALIZE_VERSION, ...identity, snapshotHash: snapshot.snapshotHash, ready: writeIds, preserved: preserveIds, removed: [] as string[], pending: [...new Set(pending)].sort(), materializationPendingRemove: [...new Set(materializationPendingRemove)].sort(), artifactPaths: owned.map(item => item.path).sort() };
  if (pending.length) {
    const report: D2FinalizeReport = { ...baseReport, status: 'blocked' };
    const wrote = await writeD2FinalizeReport(identity, report);
    return { report, writes: wrote ? 1 : 0, deletes: 0 };
  }
  for (const item of removals) {
    const conflict = await revalidateD2RemovalSet([item], prior, read, () => assertStillCurrent(identity, snapshot.snapshotHash, bundle));
    if (conflict.length) throw new Error(conflict.join('; '));
    await remove(item.info);
  }
  const tombstones = snapshot.selection.remove.flatMap(page => page.destinations.map(destination => {
    const item = prior.get(destination.path)!;
    return { ...item, removed: true as const };
  }));
  const receipt: D2OwnershipReceipt = { schemaVersion: D2_FINALIZE_VERSION, ...identity, artifacts: [...owned, ...tombstones].sort((a, b) => a.path.localeCompare(b.path)) };
  let writes = (await writeD2Ownership(identity, receipt)) ? 1 : 0;
  const report: D2FinalizeReport = { ...baseReport, status: 'complete', removed: snapshot.selection.remove.flatMap(page => page.destinations.map(item => item.path)).sort(), pending: [] };
  if (await writeD2FinalizeReport(identity, report)) writes += 1;
  await assertStillCurrent(identity, snapshot.snapshotHash, bundle);
  await markD2Complete(identity, [...report.artifactPaths, displayPath(d2FinalizeReportFile(identity))], snapshot.snapshotHash);
  return { report, writes, deletes: removals.length };
}

function hashFromManifests(kind: D2FinalSource['kind'], path: string, pageId: string, contracts: Awaited<ReturnType<typeof readD2ContractsManifest>>, shared: Awaited<ReturnType<typeof readD2SharedManifest>>, pages: Awaited<ReturnType<typeof readD2PagesManifest>>): string {
  if (kind === 'contract') { const unit = contracts?.units.find(value => value.pageId === pageId); return unit?.artifactPath === path ? unit.sourceHash : ''; }
  if (kind === 'shared') { const unit = shared?.units.find(value => value.pageId === pageId); return unit?.artifactPath === path && unit.pipelineItemId === `${pageId}__l2_shared` ? unit.sourceHash : ''; }
  const device = kind === 'desktopPage' ? 'desktop' : 'mobile'; const unit = pages?.units.find(value => value.pageId === pageId);
  return unit?.artifactPaths[device] === path && unit.pipelineItemIds[device] === `${pageId}__${device}__page11` ? unit.sourceHashes[device] : '';
}
async function assertStillCurrent(identity: D2RunIdentity, hash: string, bundle: Awaited<ReturnType<typeof readD2InputBundle>>): Promise<void> { if ((await readD2Input(identity))?.snapshotHash !== hash) throw new Error('D2_FINALIZE_STALE_RUN'); await assertD2InputSourcesStable(bundle); }
function exactDestinations(moduleName: string, pageId: string, values: D2InputSnapshot['selection']['remove'][number]['destinations']): boolean { const base = `l2/${moduleName}/web`; const expected = [`contract\0${base}/contracts/${pageId}.defs.ts`, `shared\0${base}/shared/${pageId}.defs.ts`, `desktopPage\0${base}/desktop/page11/${pageId}.defs.ts`, `mobilePage\0${base}/mobile/page11/${pageId}.defs.ts`].sort(); return values.map(item => `${item.kind}\0${item.path}`).sort().join('\n') === expected.join('\n'); }

export async function revalidateD2RemovalSet(
  removals: D2PendingRemoval[],
  ownership: Map<string, D2OwnedArtifact>,
  read: (info: Ns5FileInfo) => Promise<string>,
  verifyCurrent: () => Promise<void>,
  beforeCheck?: (path: string) => Promise<void>,
): Promise<string[]> {
  const problems: string[] = [];
  for (const item of removals) {
    await beforeCheck?.(item.path);
    await verifyCurrent();
    let live = ''; try { live = await read(item.info); } catch { /* conflict below */ }
    await verifyCurrent();
    const receipt = ownership.get(item.path);
    if (!live || !receipt || receipt.removed || await sha256Text(live) !== receipt.sha256) problems.push(`remove target changed after scan: ${item.path}`);
  }
  return problems;
}
