/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// File-system helpers for agentNewMolecule2. Step-agnostic: knows paths and stor mechanics only
// (pattern: agentNewMoleculeVariant/helpers/vFs.ts, agentNewTheme/helpers/ntFs.ts).
//
// Molecule artifacts live at _<dest>_/l2/molecules/<groupFolder>/<shortName>.{defs.ts,ts,less,html};
// work artifacts at l4/agentNewMolecule2/<runKey>/.

import { createStorFile } from '/_102027_/l2/libStor.js';
import { NM_BASE_PROJECT } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';

export type NmFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export const NM_AGENT_PROJECT = 102020;
export const NM_AGENT_FOLDER = 'aura/molecules/agentNewMolecule2';

export function nmDestProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('[nmFs] mls.actualProject not available');
  return project;
}

// ---- agent-owned files (prompt.md, schemas) in the 102020 agent folder ----
export function nmAgentFile(folder: string, shortName: string, extension: string): NmFileInfo {
  const sub = folder ? `${NM_AGENT_FOLDER}/${folder}` : NM_AGENT_FOLDER;
  return { project: NM_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}

export async function readNmAgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nmAgentFile(folder, shortName, extension), required);
}

// ---- the molecule base class ----
export function nmBaseFile(): NmFileInfo {
  return { project: NM_BASE_PROJECT, level: 2, folder: '', shortName: 'moleculeBase', extension: '.ts' };
}

// ---- destination artifacts ----
export function nmMoleculeFile(groupFolder: string, shortName: string, extension: string): NmFileInfo {
  return { project: nmDestProject(), level: 2, folder: `molecules/${groupFolder}`, shortName, extension };
}

// The five artifacts of the contract. `.defs.ts` is a shortName+'.defs' with a '.ts' extension,
// matching how the stor keys it.
export function nmDefsFile(groupFolder: string, shortName: string): NmFileInfo {
  return nmMoleculeFile(groupFolder, `${shortName}.defs`, '.ts');
}
export function nmTsFile(groupFolder: string, shortName: string): NmFileInfo {
  return nmMoleculeFile(groupFolder, shortName, '.ts');
}
export function nmLessFile(groupFolder: string, shortName: string): NmFileInfo {
  return nmMoleculeFile(groupFolder, shortName, '.less');
}
export function nmHtmlFile(groupFolder: string, shortName: string): NmFileInfo {
  return nmMoleculeFile(groupFolder, shortName, '.html');
}
export function nmGroupIndexFile(groupFolder: string, extension: '.ts' | '.html'): NmFileInfo {
  return nmMoleculeFile(groupFolder, 'index', extension);
}

export function nmThemeFile(): NmFileInfo {
  return { project: nmDestProject(), level: 2, folder: 'skills', shortName: 'theme', extension: '.ts' };
}

export function nmThemeExists(): boolean {
  return nmFileExists(nmThemeFile());
}

// Collision check for the n2-plan gate: a new molecule must not overwrite an existing one.
// Returns the display paths that already exist (empty = free to create).
export function nmExistingArtifacts(groupFolder: string, shortName: string): string[] {
  return [
    nmDefsFile(groupFolder, shortName),
    nmTsFile(groupFolder, shortName),
    nmLessFile(groupFolder, shortName),
    nmHtmlFile(groupFolder, shortName),
  ].filter(nmFileExists).map(toDisplayPath);
}

// ---- l4 work artifacts (context / plan / trace) ----
export function nmWorkFile(runKey: string, shortName: string, extension: '.json'): NmFileInfo {
  return { project: nmDestProject(), level: 4, folder: `agentNewMolecule2/${runKey}`, shortName, extension };
}
export const nmContextFileInfo = (runKey: string): NmFileInfo => nmWorkFile(runKey, 'context', '.json');
export const nmPlanFileInfo = (runKey: string): NmFileInfo => nmWorkFile(runKey, 'plan', '.json');
export function nmTraceFileInfo(runKey: string, planId: string, attempt: number): NmFileInfo {
  return nmWorkFile(runKey, `trace-${planId}-${String(attempt).padStart(2, '0')}`, '.json');
}

// ---- stor mechanics (self-contained, mirrors vFs/ntFs) ----
export function nmFileExists(fileInfo: NmFileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

export async function readStorText(fileInfo: NmFileInfo, required = false): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[nmFs] file not found: ${toDisplayPath(fileInfo)}`);
    return '';
  }
  const raw = await file.getContent();
  if (typeof raw === 'string') return raw;
  if (fileInfo.extension === '.json' && (isRecord(raw) || Array.isArray(raw))) return `${JSON.stringify(raw, null, 2)}\n`;
  if (required) throw new Error(`[nmFs] file content is not text: ${toDisplayPath(fileInfo)}`);
  return '';
}

export async function readJsonArtifact<T = unknown>(fileInfo: NmFileInfo, required = false): Promise<T | null> {
  const raw = await readStorText(fileInfo, required);
  if (!raw.trim()) return null;
  const parsed = parseMaybeJson(raw);
  if (parsed === raw) throw new Error(`[nmFs] invalid JSON: ${toDisplayPath(fileInfo)}`);
  return parsed as T;
}

export async function writeJsonArtifact(fileInfo: NmFileInfo, data: unknown): Promise<string> {
  await writeStorTextAtomic(fileInfo, `${JSON.stringify(data, null, 2)}\n`);
  return toDisplayPath(fileInfo);
}

// needCreateModel=true for source artifacts (the editor model is kept in sync and the compiler
// needs it); false for l4 work files.
export async function writeStorTextAtomic(fileInfo: NmFileInfo, content: string, needCreateModel = false): Promise<void> {
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

export function toDisplayPath(fileInfo: NmFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

export function toMlsFileReference(fileInfo: NmFileInfo): string {
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
