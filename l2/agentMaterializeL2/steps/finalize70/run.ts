/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/run.ts" enhancement="_blank"/>

// finalize70: register the approved pages of the module in mls-<client>/l5/config.json (TASK-102020-materialize-l2-finalize70).
// Reads the run (input.json + pages50 receipts), the planning (menu.json), the page defs and the L4 module, composes the
// frontend part of the module entry (compose.ts) and writes the file only when something changed, keeping its line ends.
// Runs in the Studio, like every step; the publish composer (nodejsSaveConfigJson.ts) leaves these modules alone.

import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/agentMaterializeL2/helpers/hash.js';
import { m4OwnedFile, type M4RunIdentity } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { m4DefsInfo } from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { readM4Snapshot } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { pageSourceInfo, studioPagePort, type M4PagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { composeM4ModuleEntry, type M4FinalizePage } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/compose.js';

export const M4_FINALIZE_VERSION = '2026-10-16-materialize-l2-finalize-v1' as const;

export type M4FinalizePort = Pick<M4PagePort, 'read' | 'exists' | 'readJson' | 'writeText' | 'writeJson'>;

export interface M4FinalizeReceipt {
  schemaVersion: typeof M4_FINALIZE_VERSION;
  project: number;
  module: string;
  configPath: string;
  pages: string[];
  /** Accepted pages left out because pages50 has no approved desktop page for them. */
  notApproved: string[];
  /** notApproved pages kept because they are already in the current module entry. */
  kept: string[];
  /** Navigation ids appended after the items that were already in the config. */
  navigationAdded: string[];
  /** Navigation items left as they were. */
  navigationKept: number;
  changes: string[];
  written: boolean;
}

export function configInfo(project: number): Ns5FileInfo {
  return { project, level: 5, folder: '', shortName: 'config', extension: '.json' };
}
export function menuInfo(identity: M4RunIdentity): Ns5FileInfo {
  return { project: identity.project, level: 4, folder: `${identity.module}/pool/l2/web`, shortName: 'menu', extension: '.json' };
}
export function moduleDefsInfo(identity: M4RunIdentity): Ns5FileInfo {
  return { project: identity.project, level: 4, folder: identity.module, shortName: 'module', extension: '.defs.ts' };
}

/** productLanguages and userLanguage of l4/<module>/module.defs.ts (read as text: it is not importable). */
export function m4ModuleLanguages(source: string): { productLanguages: string[]; userLanguage: string } {
  const list = /"productLanguages"\s*:\s*\[([^\]]*)\]/u.exec(source)?.[1] ?? '';
  const productLanguages = [...list.matchAll(/"([^"]+)"/gu)].map(match => match[1]);
  const userLanguage = /"userLanguage"\s*:\s*"([^"]+)"/u.exec(source)?.[1] ?? /"defaultLanguage"\s*:\s*"([^"]+)"/u.exec(source)?.[1] ?? '';
  return { productLanguages, userLanguage };
}

/** A page is registered when its page11 desktop `.ts` exists. The receipt does not decide. */
async function desktopApproved(identity: M4RunIdentity, pageId: string, port: M4FinalizePort): Promise<boolean> {
  return port.exists(pageSourceInfo(identity, pageId, 'desktop'));
}

export async function runM4Finalize(identity: M4RunIdentity, port: M4FinalizePort = studioPagePort): Promise<{ receipt: M4FinalizeReceipt; path: string }> {
  const snapshot = await readM4Snapshot(identity, port);
  const pages: M4FinalizePage[] = [];
  const notApproved: string[] = [];
  // The whole module, whatever the scope of this run: a --page run must not drop the pages it did not touch.
  for (const pageId of snapshot.accepted) {
    if (!await desktopApproved(identity, pageId, port)) { notApproved.push(pageId); continue; }
    const page11 = parseL2Page11(await port.read(m4DefsInfo(identity, 'desktop', pageId))).definition;
    const shared = parseL2Shared(await port.read(m4DefsInfo(identity, 'shared', pageId))).definition;
    pages.push({ pageId, intent: page11.intent, sharedActors: shared.access.actors });
  }
  const menu = port.exists(menuInfo(identity)) ? await port.readJson<unknown>(menuInfo(identity)) : null;
  const languages = port.exists(moduleDefsInfo(identity)) ? m4ModuleLanguages(await port.read(moduleDefsInfo(identity))) : { productLanguages: [], userLanguage: '' };

  const info = configInfo(identity.project);
  if (!port.exists(info)) throw new Error(`M4_FINALIZE_CONFIG_MISSING: ${displayPath(info)} does not exist.`);
  const raw = await port.read(info);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const config = JSON.parse(raw.replace(/\r\n/gu, '\n')) as { projects?: Record<string, { modules?: Array<Record<string, unknown>> }> };
  const client = config.projects?.[String(identity.project)];
  if (!client) throw new Error(`M4_FINALIZE_PROJECT_MISSING: ${displayPath(info)} has no projects["${identity.project}"].`);
  client.modules ??= [];
  const index = client.modules.findIndex(item => item.moduleId === identity.module);
  const current = index >= 0 ? client.modules[index] : undefined;
  const registered = new Set<string>();
  if (Array.isArray(current?.navigation)) {
    for (const item of current.navigation as Array<{ id?: unknown }>) if (typeof item?.id === 'string') registered.add(item.id);
  }
  const currentFrontend = current?.frontend && typeof current.frontend === 'object' ? current.frontend as { pages?: unknown } : undefined;
  if (Array.isArray(currentFrontend?.pages)) {
    for (const item of currentFrontend.pages as Array<{ pageId?: unknown }>) if (typeof item?.pageId === 'string') registered.add(item.pageId);
  }
  const kept = notApproved.filter(pageId => registered.has(pageId));
  const { entry, changes, navigationAdded, navigationKept } = composeM4ModuleEntry({ ...identity, pages, keepPageIds: kept, menu, ...languages }, current);
  if (index >= 0) client.modules[index] = entry;
  else client.modules.push(entry);

  const written = changes.length > 0 && pages.length > 0;
  if (written) await port.writeText(info, `${JSON.stringify(config, null, 2)}\n`.replace(/\n/gu, eol));
  const receipt: M4FinalizeReceipt = {
    schemaVersion: M4_FINALIZE_VERSION, ...identity, configPath: displayPath(info),
    pages: pages.map(page => page.pageId), notApproved, kept, navigationAdded, navigationKept, changes: written ? changes : [], written,
  };
  const path = m4OwnedFile(identity, 'finalize70');
  await port.writeJson(path, { ...receipt, sourcesHash: await sha256Text(JSON.stringify({ pages, menu, languages })) });
  return { receipt, path: displayPath(path) };
}

export function formatM4FinalizeReport(receipt: M4FinalizeReceipt): string {
  const lines = [
    `${receipt.module}: ${receipt.pages.length} page(s) registered in ${receipt.configPath}${receipt.written ? ` (changed: ${receipt.changes.join(', ')})` : ' (already up to date, nothing written)'}.`,
  ];
  lines.push(`navigation: added ${receipt.navigationAdded.join(', ') || 'none'}; kept ${receipt.navigationKept}.`);
  if (receipt.notApproved.length) lines.push(`Left out (no approved desktop page): ${receipt.notApproved.join(', ')}.`);
  return lines.join('\n');
}
