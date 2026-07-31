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

// The five artifacts of the contract. `.defs.ts` is a first-class EXTENSION, never part of the
// shortName: the stor key is plain concatenation (`<project>_<level>_<folder>/<shortName><extension>`),
// so both spellings collide on the same key — but `shortName`/`extension` are what the Studio reads.
// With shortName+'.defs' the editor files the model under a phantom `<name>.defs` group in the `ts`
// slot (libModel `mapExt`), so the defs tab of the real molecule stays empty and every consumer that
// filters `extension === '.defs.ts'` (serviceSource tabConfig, libMindMap, delete/rename/clone loops)
// skips the file. Same spelling as the Variant, New Solution and Implement Genome agents.
export function nmDefsFile(groupFolder: string, shortName: string): NmFileInfo {
  return nmMoleculeFile(groupFolder, shortName, '.defs.ts');
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
//
// The 4th argument (awaitCompile) MUST stay tied to needCreateModel. With it false, createModel
// fires `compileAndPostProcess` and does NOT await it, so the caller's own compile runs
// CONCURRENTLY on the same model — and `compile()` short-circuits on
// `modelVersion === model.getVersionId() && !modelNeedCompile`, a state `initCompilerResults` sets
// at the START of the in-flight compile, before the diagnostics land. The loser then returns true
// with `compilerResults.errors` still empty, which blinded the n4-render gate: the first Studio run
// (2026-07-30) shipped a molecule with a syntax error (`const text A = ...`) and never even fired
// the retry. The old flow got this right — agentNewMoleculeMaterialize passes (true, true, true).
export async function writeStorTextAtomic(fileInfo: NmFileInfo, content: string, needCreateModel = false): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source: content }, needCreateModel, needCreateModel, needCreateModel);
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

// ---- compilation (A5b, 2026-07-30) ----
//
// One implementation for every step that writes a source artifact. Before this, only n4-render
// compiled: the .defs.ts, the group index.ts and the .less were written blind, and the index is the
// worst of the three — it is a SHARED file of the group, rewritten with new imports and a Lit
// component, so a break takes the whole group page down.
//
// Reads `compilerResults.errors`, the same source of truth the old flow's Fix agent used. The
// `!ok && !errors.length` guard matters: `compile()` can return false without filling `errors`.
export async function compileStorTs(fileInfo: NmFileInfo): Promise<{ errors: string[]; imports: string[] }> {
  const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!storFile) return { errors: [`could not open ${toDisplayPath(fileInfo)} to compile it`], imports: [] };
  const modelTs = await storFile.getOrCreateModel() as mls.editor.IModelTS;
  const ok = await mls.l2.typescript.compileAndPostProcess(modelTs, true, false);
  const errors = (modelTs.compilerResults?.errors || []).map(error => (typeof error === 'string' ? error : JSON.stringify(error)));
  if (!ok && !errors.length) errors.push('compilation failed without a reported error');
  return { errors, imports: modelTs.compilerResults?.imports || [] };
}

// A .less has no model created by createStorFile (its extension is not in the allowed list there),
// so the model is created here on demand. Errors land in `styleResults.errors`.
export async function compileStorLess(fileInfo: NmFileInfo): Promise<string[]> {
  const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!storFile) return [`could not open ${toDisplayPath(fileInfo)} to compile it`];
  const modelStyle = await storFile.getOrCreateModel() as mls.editor.IModelStyle;
  if (!modelStyle) return [`could not open a style model for ${toDisplayPath(fileInfo)}`];
  const ok = await mls.l2.less.compileStyle(modelStyle);
  const errors = (modelStyle.styleResults?.errors || []).map(error => (typeof error === 'string' ? error : JSON.stringify(error)));
  if (!ok && !errors.length) errors.push('the stylesheet failed to compile without a reported error');
  return errors;
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
