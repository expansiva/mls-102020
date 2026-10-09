/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/io.ts" enhancement="_blank"/>

// Studio IO of input20: page discovery, reading the four defs of every page, the existence checks the
// gate needs (collabux template, molecule index) and the L4 files. Everything runs in the browser over mls.stor.

import { fileExists, readJson, readSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { M4RunIdentity } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { M4_INPUT_KINDS, type M4InputKind } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';
import { moleculeGroupFolder } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';

/** Swappable IO, so run.ts is testable without the Studio. */
export interface M4InputPort {
  /** Short names of the `.defs.ts` files in a folder of the project (level 2 unless told; the L4 is level 4). */
  listDefs(project: number, folder: string, level?: number): string[];
  exists(info: Ns5FileInfo): boolean;
  read(info: Ns5FileInfo): Promise<string>;
  readJson<T>(info: Ns5FileInfo): Promise<T | null>;
}

export const studioInputPort: M4InputPort = {
  listDefs(project, folder, level = 2) {
    return Object.values(mls.stor.files)
      .filter(file => file.project === project && file.level === level && file.folder === folder && file.extension === '.defs.ts' && file.status !== 'deleted')
      .map(file => file.shortName);
  },
  exists: fileExists,
  read: readSourceText,
  readJson,
};

export function m4DefsFolder(identity: M4RunIdentity, kind: M4InputKind): string {
  return kind === 'contract' ? `${identity.module}/web/contracts`
    : kind === 'shared' ? `${identity.module}/web/shared`
    : `${identity.module}/web/${kind}/page11`;
}

export function m4DefsInfo(identity: M4RunIdentity, kind: M4InputKind, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: m4DefsFolder(identity, kind), shortName: pageId, extension: '.defs.ts' };
}

/** A page exists when any of its four defs exists; the gate then refuses the ones that are incomplete. */
export function discoverM4Pages(identity: M4RunIdentity, port: M4InputPort): string[] {
  const ids = new Set<string>();
  for (const kind of M4_INPUT_KINDS) for (const shortName of port.listDefs(identity.project, m4DefsFolder(identity, kind))) ids.add(shortName);
  return [...ids].sort();
}

export async function readM4PageSources(identity: M4RunIdentity, pageId: string, port: M4InputPort): Promise<Record<M4InputKind, string | null>> {
  const sources = {} as Record<M4InputKind, string | null>;
  for (const kind of M4_INPUT_KINDS) {
    const info = m4DefsInfo(identity, kind, pageId);
    sources[kind] = port.exists(info) ? await port.read(info) : null;
  }
  return sources;
}

export async function readDefsPipelineStatus(identity: M4RunIdentity, port: M4InputPort): Promise<string | null> {
  const pipeline = await port.readJson<{ status?: string }>({ project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName: 'pipeline', extension: '.json' });
  return pipeline ? String(pipeline.status ?? '') : null;
}

/** `_102020_/l4/collabux/templates/inventoryControl/page21.md` → its file info, or null when it is not such a path. */
export function templateInfo(category: string): Ns5FileInfo | null {
  const match = /^_(\d+)_\/l(\d)\/(.+)\/([^/]+)(\.[a-z]+)$/u.exec(category);
  return match ? { project: Number(match[1]), level: Number(match[2]), folder: match[3], shortName: match[4], extension: match[5] } : null;
}

export function moleculeIndexInfo(tag: string): Ns5FileInfo {
  return { project: 102040, level: 2, folder: `molecules/${moleculeGroupFolder(tag)}`, shortName: 'index', extension: '.defs.ts' };
}

/** Reads every molecule group index once and answers whether a tag is listed in it. */
export async function loadMoleculeCatalog(tags: string[], port: M4InputPort): Promise<(tag: string) => boolean> {
  const indexes = new Map<string, string>();
  for (const tag of tags) {
    const info = moleculeIndexInfo(tag);
    if (indexes.has(info.folder)) continue;
    indexes.set(info.folder, port.exists(info) ? await port.read(info) : '');
  }
  return tag => (indexes.get(moleculeIndexInfo(tag).folder) ?? '').includes(`tag: '${tag}'`);
}
