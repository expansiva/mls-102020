/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/io.ts" enhancement="_blank"/>

import { diskFileInfo, readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2FinalizeReport, D2OwnershipReceipt } from '/_102020_/l2/agentDefsL2/steps/finalize60/contracts.js';

function owned(identity: D2RunIdentity, shortName: string): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/finalize60`, shortName, extension: '.json' }; }
export function d2FinalizeReportFile(identity: D2RunIdentity): Ns5FileInfo { return owned(identity, 'report'); }
export function d2OwnershipFile(identity: D2RunIdentity): Ns5FileInfo { return owned(identity, 'ownership'); }
export async function readD2FinalizeReport(identity: D2RunIdentity): Promise<D2FinalizeReport | null> { return readJson<D2FinalizeReport>(d2FinalizeReportFile(identity)); }
export async function readD2Ownership(identity: D2RunIdentity): Promise<D2OwnershipReceipt | null> { return readJson<D2OwnershipReceipt>(d2OwnershipFile(identity)); }
export async function writeD2FinalizeReport(identity: D2RunIdentity, value: D2FinalizeReport): Promise<boolean> { if (JSON.stringify(await readD2FinalizeReport(identity)) === JSON.stringify(value)) return false; await writeJson(d2FinalizeReportFile(identity), value); return true; }
export async function writeD2Ownership(identity: D2RunIdentity, value: D2OwnershipReceipt): Promise<boolean> { if (JSON.stringify(await readD2Ownership(identity)) === JSON.stringify(value)) return false; await writeJson(d2OwnershipFile(identity), value); return true; }
export function d2InfoForPath(identity: D2RunIdentity, path: string): Ns5FileInfo {
  const match = /^l2\/([^/]+)\/(.+)\/([^/]+)(\.defs\.ts)$/.exec(path);
  if (!match || match[1] !== identity.module) throw new Error(`D2_FINALIZE_PATH_OUTSIDE_MODULE: ${path}`);
  return { project: identity.project, level: 2, folder: `${identity.module}/${match[2]}`, shortName: match[3], extension: match[4] };
}
export async function deleteD2Owned(info: Ns5FileInfo): Promise<void> { const { deleteFile } = await import('/_102027_/l2/libStor.js'); await deleteFile(diskFileInfo(info)); }
