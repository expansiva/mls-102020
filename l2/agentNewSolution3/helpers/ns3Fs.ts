/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Fs.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { normalizeModuleFolderName, toExportIdentifier } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';

export type Ns3FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export const NS3_AGENT_PROJECT = 102020;
export const NS3_AGENT_FOLDER = 'agentNewSolution3';

export function ns3L2File(folder: string, shortName: string, extension: string): Ns3FileInfo {
  return { project: NS3_AGENT_PROJECT, level: 2, folder, shortName, extension };
}

export function ns3PipelineFolder(moduleName: string): string {
  return `${normalizeModuleFolderName(moduleName)}/pipeline`;
}

export function ns3PipelineFileInfo(moduleName: string): Ns3FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: ns3PipelineFolder(moduleName), shortName: 'pipeline', extension: '.json' };
}

export function ns3PipelineArtifactFileInfo(moduleName: string, shortName: string, extension: '.json' | '.md'): Ns3FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: ns3PipelineFolder(moduleName), shortName, extension };
}

export function ns3TraceFileInfo(moduleName: string, shortName: string): Ns3FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${ns3PipelineFolder(moduleName)}/trace`, shortName, extension: '.json' };
}

export async function readStorText(fileInfo: Ns3FileInfo, required = false): Promise<string> {
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

export async function readJsonArtifact<T = unknown>(fileInfo: Ns3FileInfo, required = false): Promise<T | null> {
  const raw = await readStorText(fileInfo, required);
  if (!raw.trim()) return null;
  const parsed = parseMaybeJson(raw);
  if (parsed === raw) throw new Error(`[readJsonArtifact] invalid JSON: ${toDisplayPath(fileInfo)}`);
  return parsed as T;
}

export async function writeJsonArtifact(fileInfo: Ns3FileInfo, data: unknown): Promise<string> {
  await writeStorTextAtomic(fileInfo, `${JSON.stringify(data, null, 2)}\n`);
  return toDisplayPath(fileInfo);
}

export async function writeMarkdownArtifact(fileInfo: Ns3FileInfo, content: string): Promise<string> {
  await writeStorTextAtomic(fileInfo, content.endsWith('\n') ? content : `${content}\n`);
  return toDisplayPath(fileInfo);
}

export async function writeDefsArtifact(fileInfo: Ns3FileInfo, exportName: string, data: unknown): Promise<string> {
  const identifier = toExportIdentifier(exportName);
  const source = `/// <mls fileReference="${toMlsFileReference(fileInfo)}" enhancement="_blank"/>\n\n`
    + `export const ${identifier} = ${JSON.stringify(data, null, 2)} as const;\n\n`
    + `export default ${identifier};\n`;
  await writeStorTextAtomic(fileInfo, source);
  return toDisplayPath(fileInfo);
}

export async function writeStorTextAtomic(fileInfo: Ns3FileInfo, content: string, needCreateModel = false): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source: content }, needCreateModel, needCreateModel, false);
  } else if (needCreateModel) {
    const model = await storFile.getOrCreateModel();
    if (model?.model) model.model.setValue(content);
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

export function toDisplayPath(fileInfo: Ns3FileInfo): string {
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

function toMlsFileReference(fileInfo: Ns3FileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `_${fileInfo.project}_/l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}
