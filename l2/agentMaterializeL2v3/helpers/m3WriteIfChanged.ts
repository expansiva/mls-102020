/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3WriteIfChanged.ts" enhancement="_blank"/>

// Contract .ts is a deterministic projection of the current l4 workspace. Rewrite when CONTENT
// differs — never mtime (Studio sync flattens mtime; getFileModified returns MAX_SAFE_INTEGER for a
// dirty file, so MAX vs MAX reads "fresh" forever). Hooks write stor only. Whoever compiles (Studio
// `getGeneratedModel`) loads the model from stor on demand — mirroring Monaco here left the CLI
// host reading `mls.editor` on the hook path.

import { createStorFile } from '/_102027_/l2/libStor.js';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export function shouldRewriteByContent(existing: string | null | undefined, next: string): boolean {
  if (existing == null) return true;
  return existing !== next;
}

export async function writeIfContentChanged(fileInfo: FileInfo, next: string): Promise<'written' | 'unchanged'> {
  const existing = await readVisibleContent(fileInfo);
  if (!shouldRewriteByContent(existing, next)) return 'unchanged';
  await persistVisibleContent(fileInfo, next);
  return 'written';
}

async function readVisibleContent(fileInfo: FileInfo): Promise<string | null> {
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
}
