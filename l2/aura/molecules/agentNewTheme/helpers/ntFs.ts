/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntFs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// File-system helpers for agentNewTheme. Owns this agent's paths + stor mechanics
// (pattern: agentNewMoleculeVariant/helpers/vFs.ts). Theme output lives at
// _<dest>_/l2/skills/theme.{ts,html}; work artifacts at l4/agentNewTheme/*.

import { createStorFile } from '/_102027_/l2/libStor.js';

export type NtFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export const NT_AGENT_PROJECT = 102020;
export const NT_AGENT_FOLDER = 'aura/molecules/agentNewTheme';

export function ntDestProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('[ntFs] mls.actualProject not available');
  return project;
}

// ---- agent-owned files (prompt.md, schemas) in the 102020 agent folder ----
export function ntAgentFile(folder: string, shortName: string, extension: string): NtFileInfo {
  const sub = folder ? `${NT_AGENT_FOLDER}/${folder}` : NT_AGENT_FOLDER;
  return { project: NT_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}
export async function readNtAgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(ntAgentFile(folder, shortName, extension), required);
}

// ---- theme output files in the destination project ----
export function themeFile(extension: '.ts' | '.html'): NtFileInfo {
  return { project: ntDestProject(), level: 2, folder: 'skills', shortName: 'theme', extension };
}
// Admission: New Theme creates from scratch — the project must not already have a theme.
export function themeExists(): boolean {
  return ntFileExists(themeFile('.ts'));
}

// ---- l4 work artifacts (plan / answers / draft / trace) ----
export function ntWorkFile(shortName: string, extension: '.json'): NtFileInfo {
  return { project: ntDestProject(), level: 4, folder: 'agentNewTheme', shortName, extension };
}
export const ntPlanFile = (): NtFileInfo => ntWorkFile('plan', '.json');
export const ntAnswersFile = (): NtFileInfo => ntWorkFile('answers', '.json');
export const ntDraftFile = (): NtFileInfo => ntWorkFile('draft', '.json');
export function ntTraceFile(planId: string, attempt: number): NtFileInfo {
  return ntWorkFile(`trace-${planId}-${String(attempt).padStart(2, '0')}`, '.json');
}

// ---- stor mechanics (kept self-contained, mirrors vFs) ----
export function ntFileExists(fileInfo: NtFileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

export async function readStorText(fileInfo: NtFileInfo, required = false): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[ntFs] file not found: ${toDisplayPath(fileInfo)}`);
    return '';
  }
  const raw = await file.getContent();
  if (typeof raw === 'string') return raw;
  if (fileInfo.extension === '.json' && (isRecord(raw) || Array.isArray(raw))) return `${JSON.stringify(raw, null, 2)}\n`;
  if (required) throw new Error(`[ntFs] file content is not text: ${toDisplayPath(fileInfo)}`);
  return '';
}

export async function readJsonArtifact<T = unknown>(fileInfo: NtFileInfo, required = false): Promise<T | null> {
  const raw = await readStorText(fileInfo, required);
  if (!raw.trim()) return null;
  const parsed = parseMaybeJson(raw);
  if (parsed === raw) throw new Error(`[ntFs] invalid JSON: ${toDisplayPath(fileInfo)}`);
  return parsed as T;
}

export async function writeJsonArtifact(fileInfo: NtFileInfo, data: unknown): Promise<string> {
  await writeStorTextAtomic(fileInfo, `${JSON.stringify(data, null, 2)}\n`);
  return toDisplayPath(fileInfo);
}

// needCreateModel=true for source files (theme.ts/.html — editor model kept in sync); false for l4.
export async function writeStorTextAtomic(fileInfo: NtFileInfo, content: string, needCreateModel = false): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source: content }, needCreateModel, needCreateModel, false);
  } else {
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

export function toDisplayPath(fileInfo: NtFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

export function toMlsFileReference(fileInfo: NtFileInfo): string {
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
