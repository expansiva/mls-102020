/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/cfePromptFiles.ts" enhancement="_102027_/l2/enhancementAgent"/>

type CfePromptFileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

const AGENT_PROJECT = 102020;
const AGENT_FOLDER = 'agentChangeFrontend';

export async function readCfePrompt(folder: string, shortName: string): Promise<string> {
  const fileInfo: CfePromptFileInfo = {
    project: AGENT_PROJECT,
    level: 2,
    folder: `${AGENT_FOLDER}/${folder}`.replace(/\/+/g, '/'),
    shortName,
    extension: '.md',
  };
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    throw new Error(`[readCfePrompt] file not found: ${toDisplayPath(fileInfo)}`);
  }
  const raw = await file.getContent();
  if (typeof raw !== 'string') {
    throw new Error(`[readCfePrompt] file content is not text: ${toDisplayPath(fileInfo)}`);
  }
  return raw;
}

function toDisplayPath(fileInfo: CfePromptFileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}
