/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.ts" enhancement="_blank"/>

/**
 * Single chokepoint for CF run records: written to `l4/<module>/pipeline/trace/l2/...`.
 * The `/rebuild all` of this agent deletes that folder so a previous run cannot be reread.
 * shortName never contains a dot (Studio round-trip).
 */

export const CFE_PIPELINE_TRACE_LEVEL = 4;
export const CFE_PIPELINE_TRACE_LAYER = 'l2';
export const CFE_PIPELINE_AGENT_SLUG = 'changefrontend';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export interface PipelineRunDegradation {
  at: string;
  kind: string;
  reason: string;
  path?: string;
}

export interface PipelineRunSummary {
  moduleName: string;
  agent: string;
  command: string;
  startedAt: string | null;
  finishedAt: string;
  verdict: 'completed' | 'failed' | 'degraded';
  reason: string;
  counts: Record<string, unknown>;
  degradations: PipelineRunDegradation[];
}

const memoryDegradations: PipelineRunDegradation[] = [];

export function nextPipelineRunNn(existingShortNames: readonly string[], agentSlug: string): string {
  const re = new RegExp(`^run(\\d+)_${agentSlug}$`);
  let max = 0;
  for (const name of existingShortNames) {
    const match = re.exec(name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return String(max + 1).padStart(2, '0');
}

export function cfePipelineFolder(moduleName: string): string {
  return `${moduleName}/pipeline`;
}

export function cfePipelineTraceFolder(moduleName: string, subpath = ''): string {
  const base = `${cfePipelineFolder(moduleName)}/trace/${CFE_PIPELINE_TRACE_LAYER}`;
  return subpath ? `${base}/${subpath}` : base;
}

export function cfePipelineTraceFileInfo(
  moduleName: string,
  shortName: string,
  subpath = '',
  project = 0,
): FileInfo {
  return {
    project,
    level: CFE_PIPELINE_TRACE_LEVEL,
    folder: cfePipelineTraceFolder(moduleName, subpath),
    shortName,
    extension: '.json',
  };
}

export function cfePipelineFileInfo(moduleName: string, shortName: string, project = 0): FileInfo {
  return {
    project,
    level: CFE_PIPELINE_TRACE_LEVEL,
    folder: cfePipelineFolder(moduleName),
    shortName,
    extension: '.json',
  };
}

export function cfePipelineTraceMlsPath(project: number, moduleName: string, subpath: string, fileName: string): string {
  return `_${project}_/l4/${cfePipelineTraceFolder(moduleName, subpath)}/${fileName}`;
}

export function isCfeMaterializeVerifyFolder(folder: string, moduleName?: string): boolean {
  return isCfeTraceSubfolder(folder, 'frontend-materialize-verify', moduleName);
}

export function isCfeTraceSubfolder(folder: string, subpath: string, moduleName?: string): boolean {
  const value = String(folder || '');
  if (moduleName) return value === cfePipelineTraceFolder(moduleName, subpath);
  return value.endsWith(`/pipeline/trace/${CFE_PIPELINE_TRACE_LAYER}/${subpath}`);
}

export function isCfePipelineTraceLevel(level: number | undefined): boolean {
  return level === CFE_PIPELINE_TRACE_LEVEL;
}

export function isCfeLayerTraceFolder(folder: string, moduleName: string): boolean {
  if (!moduleName) return false;
  const prefix = cfePipelineTraceFolder(moduleName);
  return folder === prefix || folder.startsWith(`${prefix}/`);
}

export function listCfeLayerTraceKeys(
  files: Record<string, { project?: number; level?: number; status?: string; folder?: string } | null | undefined>,
  project: number,
  moduleName: string,
): string[] {
  if (!project || !moduleName) return [];
  const keys: string[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.level !== CFE_PIPELINE_TRACE_LEVEL || file.status === 'deleted') continue;
    if (!isCfeLayerTraceFolder(String(file.folder || ''), moduleName)) continue;
    keys.push(key);
  }
  return keys;
}

/** Soft-delete `l4/<module>/pipeline/trace/l2/` of this module only. Used by `/rebuild all`. */
export async function clearCfeLayerTrace(project: number, moduleName: string): Promise<string[]> {
  if (!project || !moduleName) return [];
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  const deleted: string[] = [];
  for (const key of listCfeLayerTraceKeys(mls.stor.files as Record<string, any>, project, moduleName)) {
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file) continue;
    await deleteFile(file);
    deleted.push(key);
  }
  return deleted;
}

export function describeAgentCommand(longMemory: Record<string, unknown> | null | undefined, fallback = ''): string {
  if (!longMemory) return fallback;
  const parts: string[] = [];
  if (longMemory.fastMode === 'true') parts.push('/fast');
  const cli = typeof longMemory.cliCommand === 'string' ? longMemory.cliCommand : '';
  if (cli === 'rebuild-all') parts.push('/rebuild all');
  else if (cli === 'rebuild-defs') parts.push('/rebuild defs');
  else if (cli) parts.push(cli);
  return parts.join(' ') || fallback;
}

export async function recordCfeDegradation(moduleName: string, kind: string, reason: string, path?: string): Promise<void> {
  const entry: PipelineRunDegradation = { at: new Date().toISOString(), kind, reason };
  if (path) entry.path = path;
  memoryDegradations.push(entry);
  if (!moduleName) return;
  try {
    const existing = await readCfeDegradations(moduleName);
    await writeCfeDegradations(moduleName, [...existing, entry]);
  } catch { /* best-effort: the in-memory copy still reaches the run summary */ }
}

export async function takeCfeDegradations(moduleName: string): Promise<PipelineRunDegradation[]> {
  let items: PipelineRunDegradation[] = [];
  try { items = await readCfeDegradations(moduleName); } catch { items = []; }
  if (!items.length) items = [...memoryDegradations];
  memoryDegradations.length = 0;
  try { await writeCfeDegradations(moduleName, []); } catch { /* leave the file if the clear fails */ }
  return items;
}

export function listPipelineRunShortNames(moduleName: string): string[] {
  const project = mls.actualProject || 0;
  const folder = cfePipelineFolder(moduleName);
  const names: string[] = [];
  for (const file of Object.values(mls.stor.files) as { project?: number; level?: number; folder?: string; shortName?: string; extension?: string; status?: string }[]) {
    if (!file || file.project !== project || file.level !== CFE_PIPELINE_TRACE_LEVEL || file.status === 'deleted') continue;
    if (file.extension !== '.json' || String(file.folder || '') !== folder) continue;
    if (file.shortName) names.push(String(file.shortName));
  }
  return names;
}

export async function saveCfeRunSummary(summary: PipelineRunSummary): Promise<string | null> {
  try {
    const project = mls.actualProject || 0;
    if (!project || !summary.moduleName) return null;
    const nn = nextPipelineRunNn(listPipelineRunShortNames(summary.moduleName), CFE_PIPELINE_AGENT_SLUG);
    const info = cfePipelineFileInfo(summary.moduleName, `run${nn}_${CFE_PIPELINE_AGENT_SLUG}`, project);
    const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...summary }, null, 2)}\n`;
    await writeJsonStor(info, source);
    return `l4/${info.folder}/${info.shortName}.json`;
  } catch {
    return null;
  }
}

function degradationsFileInfo(moduleName: string): FileInfo {
  return cfePipelineFileInfo(moduleName, 'degradations-changefrontend', mls.actualProject || 0);
}

async function readCfeDegradations(moduleName: string): Promise<PipelineRunDegradation[]> {
  const project = mls.actualProject || 0;
  if (!project || !moduleName) return [];
  const file = mls.stor.files[mls.stor.getKeyToFile(degradationsFileInfo(moduleName))] as { status?: string; getContent?: () => Promise<string> } | undefined;
  if (!file || file.status === 'deleted' || !file.getContent) return [];
  const parsed = JSON.parse(String(await file.getContent()));
  return Array.isArray(parsed?.items) ? parsed.items.filter(isDegradation) : [];
}

async function writeCfeDegradations(moduleName: string, items: PipelineRunDegradation[]): Promise<void> {
  const project = mls.actualProject || 0;
  if (!project || !moduleName) return;
  await writeJsonStor(degradationsFileInfo(moduleName), `${JSON.stringify({ items }, null, 2)}\n`);
}

async function writeJsonStor(info: FileInfo, source: string): Promise<void> {
  const { createStorFile } = await import('/_102027_/l2/libStor.js');
  const key = mls.stor.getKeyToFile(info);
  let file = mls.stor.files[key];
  if (!file) file = await createStorFile({ ...info, source }, false, false, false);
  if (file.status !== 'renamed' && file.status !== 'new') file.status = 'changed';
  file.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
}

function isDegradation(value: unknown): value is PipelineRunDegradation {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.kind === 'string' && typeof record.reason === 'string';
}
