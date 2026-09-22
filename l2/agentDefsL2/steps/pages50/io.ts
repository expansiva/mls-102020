/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/io.ts" enhancement="_blank"/>

import { displayPath, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2PageDevice } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import type { D2PagesManifest, D2PagesUnitResult } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

export function d2PageFile(identity: D2RunIdentity, pageId: string, device: D2PageDevice): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/web/${device}/page11`, shortName: safe(pageId), extension: '.defs.ts' }; }
export function d2PagesResultFile(identity: D2RunIdentity, pageId: string): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/pages50/results`, shortName: safe(pageId), extension: '.json' }; }
export function d2PagesManifestFile(identity: D2RunIdentity): Ns5FileInfo { return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pages', extension: '.json' }; }
export function d2PageDisplayPath(identity: D2RunIdentity, pageId: string, device: D2PageDevice): string { return displayPath(d2PageFile(identity, pageId, device)); }
export async function readD2PageSource(identity: D2RunIdentity, pageId: string, device: D2PageDevice): Promise<string> { try { return await readSourceText(d2PageFile(identity, pageId, device)); } catch { return ''; } }
export async function writeD2PageSource(identity: D2RunIdentity, pageId: string, device: D2PageDevice, source: string): Promise<void> { await writeSourceText(d2PageFile(identity, pageId, device), source); }
export async function readD2PagesResult(identity: D2RunIdentity, pageId: string): Promise<D2PagesUnitResult | null> { return readJson<D2PagesUnitResult>(d2PagesResultFile(identity, pageId)); }
export async function writeD2PagesResult(identity: D2RunIdentity, value: D2PagesUnitResult): Promise<void> { await writeJson(d2PagesResultFile(identity, value.pageId), value); }
export async function readD2PagesManifest(identity: D2RunIdentity): Promise<D2PagesManifest | null> { return readJson<D2PagesManifest>(d2PagesManifestFile(identity)); }
export async function writeD2PagesManifest(identity: D2RunIdentity, value: D2PagesManifest): Promise<void> { await writeJson(d2PagesManifestFile(identity), value); }
function safe(value: string): string { if (!/^[a-z][A-Za-z0-9_-]*$/.test(value)) throw new Error(`D2_PAGES_PAGE_ID_UNSAFE: ${value}`); return value; }
