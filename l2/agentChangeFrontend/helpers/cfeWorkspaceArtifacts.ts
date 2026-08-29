/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeWorkspaceArtifacts.ts" enhancement="_blank"/>

// Contract .ts is a deterministic projection of the current l4 workspace. Rewrite when CONTENT
// differs — never mtime (Studio sync flattens mtime; getFileModified returns MAX_SAFE_INTEGER for a
// dirty file, so MAX vs MAX reads "fresh" forever). persist also mirrors the Monaco model: saveStor
// alone left compile seeing the previous generation (listaAssinatura: shared imported
// QryLocatePetitionForAdministrationInput, contract still exported QryLocatePetitionInput).
//
// Orphan sweep: l2 artifacts whose workspace is gone from l4. Empty or unreadable l4 ⇒ delete nothing.

import { createStorFile, deleteFile } from '/_102027_/l2/libStor.js';
import { parseDefsSource } from '/_102020_/l2/aura/helpers/moduleLanguages.js';
import { recordCfeDegradation } from '/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export interface ArtifactFileRef {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
}

export function shouldRewriteByContent(existing: string | null | undefined, next: string): boolean {
  if (existing == null) return true;
  return existing !== next;
}

export function isModuleFrontendArtifactFolder(folder: string, moduleName: string): boolean {
  if (!moduleName || !folder.startsWith(`${moduleName}/web/`)) return false;
  return /\/web\/contracts$/.test(folder)
    || /\/web\/shared$/.test(folder)
    || /\/web\/(?:desktop|mobile)\/page\d+$/.test(folder);
}

export function artifactWorkspaceId(shortName: string, extension: string): string {
  if (extension === '.txt' && shortName.endsWith('Dts')) return shortName.slice(0, -3);
  return shortName;
}

/** liveWorkspaceIds null or empty ⇒ no orphans (safety: never delete against an unreadable/empty l4). */
export function listOrphanFrontendArtifacts(
  files: Iterable<ArtifactFileRef>,
  args: { project: number; moduleName: string; liveWorkspaceIds: Set<string> | null },
): ArtifactFileRef[] {
  if (!args.liveWorkspaceIds || args.liveWorkspaceIds.size === 0) return [];
  const orphans: ArtifactFileRef[] = [];
  for (const file of files) {
    if (!file || file.project !== args.project || file.level !== 2 || file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (!isModuleFrontendArtifactFolder(folder, args.moduleName)) continue;
    const extension = String(file.extension || '');
    if (extension !== '.ts' && extension !== '.defs.ts' && extension !== '.test.ts' && extension !== '.html' && extension !== '.txt') continue;
    const shortName = String(file.shortName || '');
    if (extension === '.txt' && !shortName.endsWith('Dts')) continue;
    const owner = artifactWorkspaceId(shortName, extension);
    if (!owner || args.liveWorkspaceIds.has(owner)) continue;
    orphans.push(file);
  }
  return orphans;
}

export async function readLiveWorkspaceIds(
  project: number,
  moduleName: string,
): Promise<{ ids: Set<string> | null; reason: 'empty' | 'unreadable' | null }> {
  const folder = `${moduleName}/workspaces`;
  const contents: string[] = [];
  for (const file of Object.values(mls.stor.files) as ArtifactFileRef[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (String(file.folder || '') !== folder || file.extension !== '.defs.ts') continue;
    try {
      const content = await (file as { getContent?: () => Promise<unknown> }).getContent?.();
      if (typeof content !== 'string') return { ids: null, reason: 'unreadable' };
      contents.push(content);
    } catch {
      return { ids: null, reason: 'unreadable' };
    }
  }
  if (contents.length === 0) return { ids: null, reason: 'empty' };
  const ids = new Set<string>();
  for (const content of contents) {
    const id = workspaceIdFromDefs(content);
    if (!id) return { ids: null, reason: 'unreadable' };
    ids.add(id);
  }
  return { ids, reason: null };
}

export async function writeIfContentChanged(fileInfo: FileInfo, next: string): Promise<'written' | 'unchanged'> {
  const existing = await readVisibleContent(fileInfo);
  if (!shouldRewriteByContent(existing, next)) return 'unchanged';
  await persistVisibleContent(fileInfo, next);
  return 'written';
}

export async function removeOrphanFrontendArtifacts(
  project: number,
  moduleName: string,
): Promise<{ removed: string[]; skipped: 'empty' | 'unreadable' | null }> {
  const live = await readLiveWorkspaceIds(project, moduleName);
  if (!live.ids) {
    await recordCfeDegradation(moduleName, 'orphan-sweep-skipped', `l4 workspaces ${live.reason}; nothing deleted`);
    return { removed: [], skipped: live.reason };
  }
  const orphans = listOrphanFrontendArtifacts(Object.values(mls.stor.files) as ArtifactFileRef[], {
    project,
    moduleName,
    liveWorkspaceIds: live.ids,
  });
  const removed: string[] = [];
  for (const file of orphans) {
    await deleteFile(file as mls.stor.IFileInfo);
    const path = `_${project}_/l2/${file.folder}/${file.shortName}${file.extension}`;
    removed.push(path);
    await recordCfeDegradation(moduleName, 'orphan-workspace-removed', 'workspace absent from current l4', path);
  }
  return { removed, skipped: null };
}

function workspaceIdFromDefs(content: string): string {
  const parsed = parseDefsSource(content);
  if (!parsed || !parsed.data || typeof parsed.data !== 'object') return '';
  const id = (parsed.data as { workspaceId?: unknown }).workspaceId;
  return typeof id === 'string' ? id.trim() : '';
}

async function readVisibleContent(fileInfo: FileInfo): Promise<string | null> {
  const model = editorTextModel(fileInfo);
  if (model?.getValue) return String(model.getValue());
  try {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)] as { status?: string; content?: string; getContent?: () => Promise<unknown> } | undefined;
    if (!file || file.status === 'deleted') return null;
    if (typeof file.content === 'string') return file.content;
    if (file.getContent) return String(await file.getContent());
    return null;
  } catch {
    return null;
  }
}

async function persistVisibleContent(fileInfo: FileInfo, source: string): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key] as any;
  if (!storFile) storFile = await createStorFile({ ...fileInfo, source }, false, false, false);
  if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
  storFile.updatedAt = new Date().toISOString();
  storFile.content = source;
  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
  const model = editorTextModel(fileInfo);
  if (model?.getValue && model.getValue() !== source && model.setValue) model.setValue(source);
}

function editorTextModel(fileInfo: FileInfo): { getValue?: () => string; setValue?: (value: string) => void } | null {
  try {
    const editor = (mls as { editor?: { getKeyModel?: Function; models?: Record<string, any> } }).editor;
    if (!editor?.getKeyModel || !editor.models) return null;
    const key = editor.getKeyModel(fileInfo.project, fileInfo.shortName, fileInfo.folder, fileInfo.level);
    const entry = editor.models[key];
    if (!entry) return null;
    if (entry.getValue) return entry;
    if (entry.model?.getValue) return entry.model;
    if (entry.ts?.model?.getValue) return entry.ts.model;
    return null;
  } catch {
    return null;
  }
}
