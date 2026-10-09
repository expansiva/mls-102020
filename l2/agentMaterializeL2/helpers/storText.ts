/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/storText.ts" enhancement="_blank"/>

// Copy, private to agentMaterializeL2 (from l2/helpers/storText.ts, 05/10/2026; that original was removed with agentMaterializeL2v2 on 08/10/2026).

// Read and write a generated text file in the Studio stor, including a file created moments ago.
// `_102035_/l2/solution/fs.js` readSourceText throws "local content unavailable for new file" when a new
// file (versionRef 0) has no local value yet, and its writer neither marks an existing file as changed nor
// creates a .ts with an editor model (01/10/2026: it broke the reuse check and the receipts of
// agentMaterializeL2). This follows what agentMaterializeL2 saveGeneratedTs does. Generic: no agent policy.

import { createStorFile } from '/_102027_/l2/libStor.js';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

type StorFile = {
  status?: string;
  updatedAt?: string;
  getValueInfo?: () => Promise<{ content?: unknown } | undefined>;
  getContent?: () => Promise<unknown>;
};

function storFile(info: Ns5FileInfo): StorFile | undefined {
  const file = (mls.stor.files as Record<string, StorFile>)[mls.stor.getKeyToFile(info)];
  return file && file.status !== 'deleted' ? file : undefined;
}

function editorText(info: Ns5FileInfo): string | null {
  try {
    const entry = (mls.editor.models as Record<string, any>)[mls.editor.getKeyModel(info.project, info.shortName, info.folder, info.level)];
    const slot = info.extension === '.test.ts' ? entry?.test : entry?.ts;
    const text = slot?.model?.getValue?.();
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

export function storTextExists(info: Ns5FileInfo): boolean {
  return Boolean(storFile(info));
}

/** Local value, then stor content, then the editor model; throws `file not found` when there is none. */
export async function readStorText(info: Ns5FileInfo): Promise<string> {
  const file = storFile(info);
  if (!file) throw new Error(`file not found: _${info.project}_/l${info.level}/${info.folder ? `${info.folder}/` : ''}${info.shortName}${info.extension}`);
  try {
    const local = await file.getValueInfo?.();
    if (typeof local?.content === 'string') return local.content;
  } catch { /* next source */ }
  try {
    const content = await file.getContent?.();
    if (typeof content === 'string') return content;
  } catch { /* next source */ }
  const model = editorText(info);
  if (model !== null) return model;
  throw new Error(`file content unavailable: _${info.project}_/l${info.level}/${info.folder}/${info.shortName}${info.extension}`);
}

/** Create or overwrite; marks the file changed, gives a new .ts an editor model, and syncs an open model. */
export async function writeStorText(info: Ns5FileInfo, content: string): Promise<void> {
  if (info.shortName.includes('.')) throw new Error(`shortName must not contain dots: ${info.shortName}`);
  const key = mls.stor.getKeyToFile(info);
  let file = (mls.stor.files as Record<string, any>)[key];
  const needsModel = info.extension === '.ts' || info.extension === '.test.ts';
  if (!file) file = await createStorFile({ ...info, source: content }, needsModel, false, false);
  if (file.status !== 'renamed' && file.status !== 'new') file.status = 'changed';
  file.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
  try {
    const entry = (mls.editor.models as Record<string, any>)[mls.editor.getKeyModel(info.project, info.shortName, info.folder, info.level)];
    const slot = info.extension === '.test.ts' ? entry?.test : entry?.ts;
    if (slot?.model && slot.model.getValue?.() !== content) slot.model.setValue(content);
  } catch { /* no open model: the compile creates one from stor */ }
}
