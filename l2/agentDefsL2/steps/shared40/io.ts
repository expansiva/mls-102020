/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/io.ts" enhancement="_blank"/>
import { displayPath, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2SharedManifest, D2SharedUnitResult } from '/_102020_/l2/agentDefsL2/steps/shared40/run.js';

export function d2SharedFile(identity: D2RunIdentity, pageId: string): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/web/shared`, shortName: safe(pageId), extension: '.defs.ts' }; }
export function d2SharedResultFile(identity: D2RunIdentity, pageId: string): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/shared40/results`, shortName: safe(pageId), extension: '.json' }; }
export function d2SharedManifestFile(identity: D2RunIdentity): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'shared', extension: '.json' }; }
export function d2SharedDisplayPath(identity: D2RunIdentity, pageId: string): string { return displayPath(d2SharedFile(identity, pageId)); }
export async function readD2SharedSource(identity: D2RunIdentity, pageId: string): Promise<string> { try { return await readSourceText(d2SharedFile(identity, pageId)); } catch { return ''; } }
export async function writeD2SharedSource(identity: D2RunIdentity, pageId: string, source: string): Promise<void> { await writeSourceText(d2SharedFile(identity, pageId), source); }
export async function readD2SharedResult(identity: D2RunIdentity, pageId: string): Promise<D2SharedUnitResult | null> { return readJson<D2SharedUnitResult>(d2SharedResultFile(identity, pageId)); }
export async function writeD2SharedResult(identity: D2RunIdentity, result: D2SharedUnitResult): Promise<void> { if (JSON.stringify(await readD2SharedResult(identity, result.pageId)) !== JSON.stringify(result)) await writeJson(d2SharedResultFile(identity, result.pageId), result); }
export async function readD2SharedManifest(identity: D2RunIdentity): Promise<D2SharedManifest | null> { return readJson<D2SharedManifest>(d2SharedManifestFile(identity)); }
export async function writeD2SharedManifest(identity: D2RunIdentity, manifest: D2SharedManifest): Promise<void> { if (JSON.stringify(await readD2SharedManifest(identity)) !== JSON.stringify(manifest)) await writeJson(d2SharedManifestFile(identity), manifest); }
function safe(value: string): string { if (!/^[a-z][A-Za-z0-9_-]*$/.test(value)) throw new Error(`D2_SHARED_PAGE_ID_UNSAFE: ${value}`); return value; }
