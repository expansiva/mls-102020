/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsFs.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile, deleteFile } from '/_102027_/l2/libStor.js';
import { normalizeModuleFolderName, toExportIdentifier } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

export type NsFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export const NS_AGENT_PROJECT = 102020;
export const NS_AGENT_FOLDER = 'agentNewSolution';

export function nsL2File(folder: string, shortName: string, extension: string): NsFileInfo {
  return { project: NS_AGENT_PROJECT, level: 2, folder, shortName, extension };
}

export function nsPipelineFolder(moduleName: string): string {
  return `${normalizeModuleFolderName(moduleName)}/pipeline`;
}

// Every module artifact lives under l4/{module}/ (target layout). operations/ and workflows/
// have BOTH writers (e5) and readers (e5 finalize, e6, e7) — route both through these so the
// paths cannot drift (tsc treats a mismatched folder literal as a valid string).
export function nsOperationsFolder(moduleName: string): string {
  return `${normalizeModuleFolderName(moduleName)}/operations`;
}

export function nsWorkflowsFolder(moduleName: string): string {
  return `${normalizeModuleFolderName(moduleName)}/workflows`;
}

export function nsPipelineFileInfo(moduleName: string): NsFileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: nsPipelineFolder(moduleName), shortName: 'pipeline', extension: '.json' };
}

export function nsPipelineArtifactFileInfo(moduleName: string, shortName: string, extension: '.json' | '.md'): NsFileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: nsPipelineFolder(moduleName), shortName, extension };
}

// Trace lives at l4/{module}/trace/ (D1: pipeline/trace and the flat health report folded here).
export function nsTraceFileInfo(moduleName: string, shortName: string): NsFileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeModuleFolderName(moduleName)}/trace`, shortName, extension: '.json' };
}

export async function readStorText(fileInfo: NsFileInfo, required = false): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[readStorText] file not found: ${toDisplayPath(fileInfo)}`);
    return '';
  }
  const raw = await file.getContent();
  if (typeof raw === 'string') {
    return raw;
  }
  if (fileInfo.extension === '.json' && (isRecord(raw) || Array.isArray(raw))) {
    return `${JSON.stringify(raw, null, 2)}\n`;
  }
  if (required) throw new Error(`[readStorText] file content is not text: ${toDisplayPath(fileInfo)}`);
  return '';
}

export async function readJsonArtifact<T = unknown>(fileInfo: NsFileInfo, required = false): Promise<T | null> {
  const raw = await readStorText(fileInfo, required);
  if (!raw.trim()) return null;
  const parsed = parseMaybeJson(raw);
  if (parsed === raw) throw new Error(`[readJsonArtifact] invalid JSON: ${toDisplayPath(fileInfo)}`);
  return parsed as T;
}

export async function writeJsonArtifact(fileInfo: NsFileInfo, data: unknown): Promise<string> {
  await writeStorTextAtomic(fileInfo, `${JSON.stringify(data, null, 2)}\n`);
  return toDisplayPath(fileInfo);
}

export async function writeMarkdownArtifact(fileInfo: NsFileInfo, content: string): Promise<string> {
  await writeStorTextAtomic(fileInfo, content.endsWith('\n') ? content : `${content}\n`);
  return toDisplayPath(fileInfo);
}

export async function writeDefsArtifact(fileInfo: NsFileInfo, exportName: string, data: unknown): Promise<string> {
  const identifier = toExportIdentifier(exportName);
  const source = `/// <mls fileReference="${toMlsFileReference(fileInfo)}" enhancement="_blank"/>\n\n`
    + `export const ${identifier} = ${JSON.stringify(data, null, 2)} as const;\n\n`
    + `export default ${identifier};\n`;
  await writeStorTextAtomic(fileInfo, source);
  return toDisplayPath(fileInfo);
}

export async function writeStorTextAtomic(fileInfo: NsFileInfo, content: string, needCreateModel = false): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source: content }, needCreateModel, needCreateModel, false);
  } else {
    // Re-run resurrection: on a re-run over a module whose data was deleted (locally, not committed),
    // the prior artifacts stay in the stor with status 'deleted'. readStorText ignores 'deleted' files
    // and they never persist to disk — which is exactly why E2 could not find e1-draft.json and the
    // pipeline/ folder never persisted. Un-delete BEFORE writing content: status 'changed' + a fresh
    // updatedAt (validated live in the browser console — status alone is not enough without updatedAt).
    if (storFile.status === 'deleted') {
      storFile.status = 'changed';
      storFile.updatedAt = new Date().toISOString();
    }
    if (needCreateModel) {
      const model = await storFile.getOrCreateModel();
      if (model?.model) model.model.setValue(content);
    }
  }
  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content });
}

export function listExistingModuleFolders(): Set<string> {
  const project = mls.actualProject || 0;
  const modules = new Set<string>();
  for (const file of Object.values(mls.stor.files)) {
    if (file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (![1, 2, 4, 5].includes(file.level)) continue;
    const first = file.folder.split('/')[0];
    if (!first || isGlobalL4Folder(file.level, first)) continue;
    modules.add(normalizeModuleFolderName(first));
  }
  return modules;
}

// `/rebuild` (newSolution_18): soft-delete EVERY l4 + l5 file of a module (folder first-segment ==
// module) so a regeneration starts from a clean slate — leftover operations/workspaces/contracts from a
// prior run never collide. deleteFile is a soft-delete (status='deleted', recoverable from collab-fs
// trash). Module-scoped by construction; global l4 folders have a different first segment and are skipped.
export async function cleanNsModule(moduleName: string): Promise<string[]> {
  const project = mls.actualProject || 0;
  const module = normalizeModuleFolderName(moduleName);
  const deleted: string[] = [];
  for (const file of Object.values(mls.stor.files)) {
    if (file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (file.level !== 4 && file.level !== 5) continue;
    if (normalizeModuleFolderName(file.folder.split('/')[0]) !== module) continue;
    await deleteFile(file);
    deleted.push(`l${file.level}/${file.folder}/${file.shortName}${file.extension}`);
  }
  return deleted;
}

export function toDisplayPath(fileInfo: NsFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

export function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGlobalL4Folder(level: number, folder: string): boolean {
  return level === 4 && ['actors', 'operations', 'rules', 'trace', 'workflows'].includes(folder);
}

function toMlsFileReference(fileInfo: NsFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `_${fileInfo.project}_/l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}
