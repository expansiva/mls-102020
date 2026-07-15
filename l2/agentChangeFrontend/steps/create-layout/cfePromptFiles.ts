/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/cfePromptFiles.ts" enhancement="_102027_/l2/enhancementAgent"/>

type CfePromptFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export async function readCfePrompt(folder: string, shortName: string): Promise<string> {
  const fileInfo: CfePromptFileInfo = { project: 102020, level: 2, folder: `agentChangeFrontend/${folder}`.replace(/\/+/g, '/'), shortName, extension: '.md' };
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') throw new Error(`[readCfePrompt] file not found: l2/${fileInfo.folder}/${shortName}.md`);
  const raw = await file.getContent();
  if (typeof raw !== 'string') throw new Error(`[readCfePrompt] file content is not text: l2/${fileInfo.folder}/${shortName}.md`);
  return raw;
}
