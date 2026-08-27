/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cFs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// File-system helpers for agentCopyMolecule. Step-agnostic: knows paths and stor mechanics
// only (pattern: agentNewMoleculeVariant/helpers/vFs.ts, agentNewTheme/helpers/ntFs.ts,
// agentNewMolecule2/helpers/nmFs.ts — four agents, four fs helpers; see spec.md on why
// nothing was promoted to shared/).
//
// TWO differences from vFs, and both come from what this agent does:
// 1. it READS from another project (the origin) and WRITES to the current one, so the
//    molecule-path builder takes the project explicitly;
// 2. the work folder is keyed by the RUN (l4/agentCopy/<runKey>/), not by a molecule
//    shortName — a batch has no single shortName. Precedent: the runKey of
//    agentImproveMolecule2 (helpers/imResolve.ts + imRootPlan.getImRunKey).

import { createStorFile } from '/_102027_/l2/libStor.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { formatCompileDiagnostics, type NmDiagnosticLike } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmDiagnostics.js';

export type CFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export const C_AGENT_PROJECT = 102020;
export const C_AGENT_FOLDER = 'aura/molecules/agentCopyMolecule';

export type CMoleculeExtension = '.ts' | '.defs.ts' | '.less' | '.html';
export const C_MOLECULE_EXTENSIONS: CMoleculeExtension[] = ['.ts', '.defs.ts', '.less', '.html'];

export function cAgentFile(folder: string, shortName: string, extension: string): CFileInfo {
  const sub = folder ? `${C_AGENT_FOLDER}/${folder}` : C_AGENT_FOLDER;
  return { project: C_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}

export async function readCAgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(cAgentFile(folder, shortName, extension), required);
}

export function cDestProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('[cFs] mls.actualProject not available');
  return project;
}

// Any molecule file, in ANY project: the origin lives in a dependency, the copy in the
// current project. Never assume the destination here.
export function cMoleculeFile(project: number, group: string, shortName: string, extension: CMoleculeExtension): CFileInfo {
  return { project, level: 2, folder: `molecules/${group}`, shortName, extension };
}

export function cDestMoleculeFile(group: string, shortName: string, extension: CMoleculeExtension): CFileInfo {
  return cMoleculeFile(cDestProject(), group, shortName, extension);
}

export function cWorkFile(runKey: string, shortName: string, extension: '.json' = '.json'): CFileInfo {
  return { project: cDestProject(), level: 4, folder: `agentCopy/${runKey}`, shortName, extension };
}

export function cContextFileInfo(runKey: string): CFileInfo {
  return cWorkFile(runKey, 'context');
}

export function cAnswersFileInfo(runKey: string): CFileInfo {
  return cWorkFile(runKey, 'answers');
}

export function cTraceFileInfo(runKey: string, planId: string, attempt: number): CFileInfo {
  return cWorkFile(runKey, `trace-${planId}-${String(attempt).padStart(2, '0')}`);
}

export function cFileExists(fileInfo: CFileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

// The molecules of a group in a project, as shortNames. This is how a group-only reference
// is expanded (c1-bootstrap), reading the ORIGIN project — same stor scan the index steps
// already do (agentVariantIndex.scanGroupMolecules, agentIndexGroupPage.getMoleculeFiles).
//
// '.defs.ts' and '.test.ts' are their OWN extensions in the stor, so filtering on '.ts'
// already excludes them; the explicit shortName guards below are the belt to that
// suspenders, for a project that ever stored them as 'ml-x.defs' + '.ts'.
export function listGroupMolecules(project: number, group: string): string[] {
  const folder = `molecules/${group}`;
  const found = Object.keys(mls.stor.files)
    .map(key => mls.stor.files[key])
    .filter(sf => !!sf
      && sf.status !== 'deleted'
      && sf.project === project
      && sf.level === 2
      && sf.folder === folder
      && sf.extension === '.ts'
      && sf.shortName !== 'index'
      && !/\.(defs|test)$/.test(sf.shortName))
    .map(sf => sf.shortName);
  return Array.from(new Set(found)).sort();
}

export async function readStorText(fileInfo: CFileInfo, required = false): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[cFs] file not found: ${toDisplayPath(fileInfo)}`);
    return '';
  }
  const raw = await file.getContent();
  if (typeof raw === 'string') return raw;
  if (fileInfo.extension === '.json' && (isRecord(raw) || Array.isArray(raw))) {
    return `${JSON.stringify(raw, null, 2)}\n`;
  }
  if (required) throw new Error(`[cFs] file content is not text: ${toDisplayPath(fileInfo)}`);
  return '';
}

export async function readJsonArtifact<T = unknown>(fileInfo: CFileInfo, required = false): Promise<T | null> {
  const raw = await readStorText(fileInfo, required);
  if (!raw.trim()) return null;
  const parsed = parseMaybeJson(raw);
  if (parsed === raw) throw new Error(`[cFs] invalid JSON: ${toDisplayPath(fileInfo)}`);
  return parsed as T;
}

export async function writeJsonArtifact(fileInfo: CFileInfo, data: unknown): Promise<string> {
  await writeStorTextAtomic(fileInfo, `${JSON.stringify(data, null, 2)}\n`);
  return toDisplayPath(fileInfo);
}

// needCreateModel=true for molecule source files (the editor model is kept in sync);
// false for l4 work files.
export async function writeStorTextAtomic(fileInfo: CFileInfo, content: string, needCreateModel = false): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source: content }, needCreateModel, needCreateModel, false);
  } else {
    // Re-run resurrection (lesson inherited from nsFs/vFs — do NOT drop this branch): a
    // locally deleted file stays in the stor with status 'deleted' and would silently
    // never persist. It matters MORE here than in the Variant: 'replace' on a collision
    // is a re-run over files that may have been deleted by hand.
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

// ---- compile + cache publish ----
//
// Bug fixed 2026-08-27: a copied file was written but never compiled, so it "worked" only after a
// human opened it in the editor and saved — the gesture that does both things below. The other
// four agents of this family only ever call `compileAndPostProcess(model, awaitCompile, false)`
// (nmFs.compileStorTs) — diagnostics only, saveCache FALSE — because their files are molecule
// sources the runtime already reaches through the group they were born in. This agent writes
// files a human never touched, so publishing to the cache is not optional here; `saveCache:true`
// is the exact call the editor makes on save (mls-100554/l2/serviceSource.ts:1352), already
// validated for `.defs.ts` by agentSyncMoleculeCatalog/helpers/syFs.ts (syPublishToCache) — this
// reuses the same principle for `.ts`, and adds the missing piece for `.less` below.
export async function cCompileAndPublishTs(fileInfo: CFileInfo, source: string, runAfterCompile: boolean): Promise<string[]> {
  const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!storFile) return [`não foi possível abrir ${toDisplayPath(fileInfo)} para compilar`];
  const modelTs = await storFile.getOrCreateModel() as mls.editor.IModelTS;
  const ok = await mls.l2.typescript.compileAndPostProcess(modelTs, runAfterCompile, true);
  const raw = modelTs.compilerResults?.errors || [];
  const errors = formatCompileDiagnostics(raw as NmDiagnosticLike[], source || modelTs.model?.getValue?.() || '');
  if (!ok && !errors.length) errors.push('compilação falhou sem erro relatado');
  return errors;
}

// `.less` is not in createStorFile's extension whitelist (mls-102027/l2/libStor.ts), so
// writeStorTextAtomic's needCreateModel never creates a model for a NEW stylesheet — and without
// that model, the sibling .ts's onAfterCompile hook (enhancementAura -> injectStyle,
// mls-102027/l2/processCssLit.ts) finds no style to inject and silently no-ops. `createModel` is
// the exact call createStorFile would have made had `.less` been in that whitelist — same
// function, same compile + bookkeeping, just invoked explicitly for the one extension it skips.
export async function cCompileLess(fileInfo: CFileInfo): Promise<string[]> {
  const storFile = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!storFile) return [`não foi possível abrir ${toDisplayPath(fileInfo)} para compilar`];
  const modelStyle = await createModel(storFile, true, true) as mls.editor.IModelStyle | undefined;
  if (!modelStyle) return [`sem model de estilo para ${toDisplayPath(fileInfo)}`];
  const raw = modelStyle.styleResults?.errors || [];
  return formatCompileDiagnostics(raw as NmDiagnosticLike[], modelStyle.model?.getValue?.() || '');
}

export function toDisplayPath(fileInfo: CFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

export function toMlsFileReference(fileInfo: CFileInfo): string {
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
