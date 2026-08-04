/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Fs.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { normalizeNs4ModuleName, Ns4PipelineState } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

export type Ns4FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

const AGENT_PROJECT = 102020;
const AGENT_FOLDER = 'agentNewSolution4';

export function ns4AgentFile(folder: string, shortName: string, extension: string): Ns4FileInfo {
  return { project: AGENT_PROJECT, level: 2, folder: `${AGENT_FOLDER}/${folder}`, shortName, extension };
}

export function ns4ModuleFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: normalizeNs4ModuleName(moduleName), shortName: 'module', extension: '.defs.ts' };
}

export function ns4PipelineFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'pipeline', extension: '.json' };
}

export async function readNs4AgentText(folder: string, shortName: string): Promise<string> {
  return readNs4Text(ns4AgentFile(folder, shortName, '.md'), true);
}

export async function readNs4Pipeline(moduleName: string): Promise<Ns4PipelineState | null> {
  const raw = await readNs4Text(ns4PipelineFile(moduleName), false);
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as Ns4PipelineState;
  } catch {
    return null;
  }
}

export async function writeNs4Pipeline(state: Ns4PipelineState): Promise<string> {
  const fileInfo = ns4PipelineFile(state.moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(state, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4Module(moduleName: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4ModuleFile(moduleName);
  const exportName = `${normalizeNs4ModuleName(moduleName)}Module`;
  const source = `/// <mls fileReference="_${fileInfo.project}_/l4/${fileInfo.folder}/module.defs.ts" enhancement="_blank"/>\n\n`
    + `export const ${exportName} = ${JSON.stringify(artifact, null, 2)} as const;\n\n`
    + `export default ${exportName};\n`;
  await writeNs4Text(fileInfo, source);
  return displayPath(fileInfo);
}

export function ns4FileExists(fileInfo: Ns4FileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

export function listNs4ModuleFolders(): Set<string> {
  const project = mls.actualProject || 0;
  const modules = new Set<string>();
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (![1, 2, 4, 5].includes(file.level)) continue;
    const first = file.folder.split('/')[0];
    if (!first || isGlobalFolder(file.level, first)) continue;
    modules.add(normalizeNs4ModuleName(first));
  }
  return modules;
}

export async function readNs4Text(fileInfo: Ns4FileInfo, required: boolean): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[agentNewSolution4] file not found: ${displayPath(fileInfo)}`);
    return '';
  }
  const content = await file.getContent();
  if (typeof content === 'string') return content;
  if (fileInfo.extension === '.json' && typeof content === 'object' && content !== null) {
    return `${JSON.stringify(content, null, 2)}\n`;
  }
  if (required) throw new Error(`[agentNewSolution4] invalid text file: ${displayPath(fileInfo)}`);
  return '';
}

async function writeNs4Text(fileInfo: Ns4FileInfo, content: string): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let file = mls.stor.files[key];
  if (!file) {
    file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
  } else if (file.status === 'deleted') {
    file.status = 'changed';
    file.updatedAt = new Date().toISOString();
  }
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
}

function displayPath(fileInfo: Ns4FileInfo): string {
  return `l${fileInfo.level}/${fileInfo.folder ? `${fileInfo.folder}/` : ''}${fileInfo.shortName}${fileInfo.extension}`;
}

function isGlobalFolder(level: number, folder: string): boolean {
  return level === 4 && ['actors', 'operations', 'rules', 'trace', 'workflows'].includes(folder);
}
