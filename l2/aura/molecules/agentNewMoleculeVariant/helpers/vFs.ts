/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// File-system helpers for agentNewMoleculeVariant. Policy-frozen: step-agnostic,
// knows paths and stor mechanics only (pattern: agentNewSolution/helpers/nsFs.ts).

import { createStorFile } from '/_102027_/l2/libStor.js';

export type VFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export const V_AGENT_PROJECT = 102020;
export const V_AGENT_FOLDER = 'aura/molecules/agentNewMoleculeVariant';

export function vAgentFile(folder: string, shortName: string, extension: string): VFileInfo {
  const sub = folder ? `${V_AGENT_FOLDER}/${folder}` : V_AGENT_FOLDER;
  return { project: V_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}

export async function readVAgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(vAgentFile(folder, shortName, extension), required);
}

export function vDestProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('[vFs] mls.actualProject not available');
  return project;
}

export function vMoleculeFile(group: string, shortName: string, extension: string): VFileInfo {
  return { project: vDestProject(), level: 2, folder: `molecules/${group}`, shortName, extension };
}

export function vWorkFile(variantShortName: string, shortName: string, extension: '.json'): VFileInfo {
  return { project: vDestProject(), level: 4, folder: `agentVariant/${variantShortName}`, shortName, extension };
}

export function vContextFileInfo(variantShortName: string): VFileInfo {
  return vWorkFile(variantShortName, 'context', '.json');
}

export function vTraceFileInfo(variantShortName: string, planId: string, attempt: number): VFileInfo {
  return vWorkFile(variantShortName, `trace-${planId}-${String(attempt).padStart(2, '0')}`, '.json');
}

export function vFileExists(fileInfo: VFileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

export async function readStorText(fileInfo: VFileInfo, required = false): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[vFs] file not found: ${toDisplayPath(fileInfo)}`);
    return '';
  }
  const raw = await file.getContent();
  if (typeof raw === 'string') return raw;
  if (fileInfo.extension === '.json' && (isRecord(raw) || Array.isArray(raw))) {
    return `${JSON.stringify(raw, null, 2)}\n`;
  }
  if (required) throw new Error(`[vFs] file content is not text: ${toDisplayPath(fileInfo)}`);
  return '';
}

export async function readJsonArtifact<T = unknown>(fileInfo: VFileInfo, required = false): Promise<T | null> {
  const raw = await readStorText(fileInfo, required);
  if (!raw.trim()) return null;
  const parsed = parseMaybeJson(raw);
  if (parsed === raw) throw new Error(`[vFs] invalid JSON: ${toDisplayPath(fileInfo)}`);
  return parsed as T;
}

export async function writeJsonArtifact(fileInfo: VFileInfo, data: unknown): Promise<string> {
  await writeStorTextAtomic(fileInfo, `${JSON.stringify(data, null, 2)}\n`);
  return toDisplayPath(fileInfo);
}

// needCreateModel=true for molecule source files (editor model kept in sync); false for l4 work files.
export async function writeStorTextAtomic(fileInfo: VFileInfo, content: string, needCreateModel = false): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source: content }, needCreateModel, needCreateModel, false);
  } else {
    // Re-run resurrection (lesson from nsFs): a locally deleted file stays in the stor with
    // status 'deleted' and would silently never persist — un-delete before writing.
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

export function toDisplayPath(fileInfo: VFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

export function toMlsFileReference(fileInfo: VFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `_${fileInfo.project}_/l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
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
