/// <mls fileReference="_102020_/l2/agentNewSolution4/helpers/ns4Fs.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { normalizeNs4ModuleName, Ns4ModuleArtifact, Ns4PipelineState } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';

export type Ns4FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

const AGENT_PROJECT = 102020;
const AGENT_FOLDER = 'agentNewSolution4';

export function ns4AgentFile(folder: string, shortName: string, extension: string): Ns4FileInfo {
  return { project: AGENT_PROJECT, level: 2, folder: folder ? `${AGENT_FOLDER}/${folder}` : AGENT_FOLDER, shortName, extension };
}

export function ns4ModuleFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: normalizeNs4ModuleName(moduleName), shortName: 'module', extension: '.defs.ts' };
}

export function ns4PipelineFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'pipeline', extension: '.json' };
}

export function ns4E2DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e2-journeys.draft', extension: '.json' };
}

export function ns4E3DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e3-access-matrix.draft', extension: '.json' };
}

export function ns4AccessMatrixFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/access`, shortName: 'access-matrix', extension: '.defs.ts' };
}

export function ns4E4DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e4-ontology.draft', extension: '.json' };
}

export function ns4E4PlanDraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e4-ontology-plan.draft', extension: '.json' };
}

export function ns4E4EntityDraftFile(moduleName: string, entityId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline/e4-entities`, shortName: `${entityId}.draft`, extension: '.json' };
}

export function ns4OntologyEntityFile(moduleName: string, entityId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/ontology`, shortName: entityId, extension: '.defs.ts' };
}

export function ns4OntologyIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/ontology`, shortName: 'index', extension: '.defs.ts' };
}

export function ns4E5DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e5-rules.draft', extension: '.json' };
}

export function ns4E5CatalogFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e5-source-catalog', extension: '.json' };
}

export function ns4E5PlanDraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e5-rules-plan.draft', extension: '.json' };
}

export function ns4E5RuleDraftFile(moduleName: string, ruleId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline/e5-rules`, shortName: `${ruleId}.draft`, extension: '.json' };
}

export function ns4E5ApprovedFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e5-rules.approved', extension: '.json' };
}

export function ns4RuleFile(moduleName: string, ruleId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/rules`, shortName: ruleId, extension: '.defs.ts' };
}

export function ns4RuleIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/rules`, shortName: 'index', extension: '.defs.ts' };
}

export function ns4JourneyFile(moduleName: string, journeyId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/journeys`, shortName: journeyId, extension: '.defs.ts' };
}

export function ns4JourneyIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/journeys`, shortName: 'index', extension: '.defs.ts' };
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

export async function readNs4Module(moduleName: string): Promise<Ns4ModuleArtifact | null> {
  const raw = await readNs4Text(ns4ModuleFile(moduleName), false);
  const json = extractNs4JsonObject(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as Ns4ModuleArtifact;
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

export async function writeNs4E2Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E2DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E3Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E3DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4PlanDraft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4PlanDraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4EntityDraft(moduleName: string, entityId: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4EntityDraftFile(moduleName, entityId);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E5DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5Catalog(moduleName: string, catalog: unknown): Promise<string> {
  const fileInfo = ns4E5CatalogFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(catalog, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5PlanDraft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E5PlanDraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5RuleDraft(moduleName: string, ruleId: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E5RuleDraftFile(moduleName, ruleId);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5Approved(moduleName: string, review: unknown): Promise<string> {
  const fileInfo = ns4E5ApprovedFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(review, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4AccessMatrix(moduleName: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4AccessMatrixFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}AccessMatrix`, artifact);
  return displayPath(fileInfo);
}

export async function writeNs4OntologyEntity(moduleName: string, entityId: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4OntologyEntityFile(moduleName, entityId);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}Entity${entityId}`, artifact);
  return displayPath(fileInfo);
}

export async function writeNs4OntologyIndex(moduleName: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4OntologyIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}OntologyIndex`, artifact);
  return displayPath(fileInfo);
}

export async function writeNs4Rule(moduleName: string, ruleId: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4RuleFile(moduleName, ruleId);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}Rule${ruleId}`, artifact);
  return displayPath(fileInfo);
}

export async function writeNs4RuleIndex(moduleName: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4RuleIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}RuleIndex`, artifact);
  return displayPath(fileInfo);
}

export async function writeNs4Journey(moduleName: string, journeyId: string, artifact: unknown): Promise<string> {
  const fileInfo = ns4JourneyFile(moduleName, journeyId);
  await writeNs4Defs(fileInfo, `${journeyId}Journey`, artifact);
  return displayPath(fileInfo);
}

export async function writeNs4JourneyIndex(moduleName: string, index: unknown): Promise<string> {
  const fileInfo = ns4JourneyIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}JourneyIndex`, index);
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

export async function readNs4DefsJson<T>(fileInfo: Ns4FileInfo, required = false): Promise<T | null> {
  const source = await readNs4Text(fileInfo, required);
  const json = extractNs4JsonObject(source);
  if (!json) return null;
  try { return JSON.parse(json) as T; }
  catch {
    if (required) throw new Error(`[agentNewSolution4] invalid defs JSON: ${displayPath(fileInfo)}`);
    return null;
  }
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

async function writeNs4Defs(fileInfo: Ns4FileInfo, exportName: string, value: unknown): Promise<void> {
  const safeExportName = normalizeNs4ModuleName(exportName);
  const source = `/// <mls fileReference="_${fileInfo.project}_/l${fileInfo.level}/${fileInfo.folder}/${fileInfo.shortName}${fileInfo.extension}" enhancement="_blank"/>\n\n`
    + `export const ${safeExportName} = ${JSON.stringify(value, null, 2)} as const;\n\n`
    + `export default ${safeExportName};\n`;
  await writeNs4Text(fileInfo, source);
}

function extractNs4JsonObject(source: string): string {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  return '';
}

function displayPath(fileInfo: Ns4FileInfo): string {
  return `l${fileInfo.level}/${fileInfo.folder ? `${fileInfo.folder}/` : ''}${fileInfo.shortName}${fileInfo.extension}`;
}

function isGlobalFolder(level: number, folder: string): boolean {
  return level === 4 && ['actors', 'operations', 'rules', 'trace', 'workflows'].includes(folder);
}
