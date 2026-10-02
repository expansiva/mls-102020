/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.ts" enhancement="_blank"/>

/**
 * Single chokepoint for the run records of agentMaterializeL2v3: written to
 * `l2/<module>/pipeline/trace/agentMaterializeL2v3/run_<UTC AAAAMMDDhhmmss>/...`.
 * Level 2 on purpose (D-006): the trace lives next to the l2 artifacts it explains. The trace NEVER
 * deletes anything (D-007): every run keeps its own folder, and nothing here removes a file.
 * shortName never contains a dot (Studio round-trip). `project` is always a parameter, never
 * read from `mls.actualProject`.
 */

export const M3_TRACE_LEVEL = 2;
export const M3_AGENT_FOLDER = 'agentMaterializeL2v3';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export interface M3RunDegradation {
  at: string;
  kind: string;
  reason: string;
  path?: string;
}

export interface M3RunSummary {
  moduleName: string;
  agent: typeof M3_AGENT_FOLDER;
  runDir: string;
  command: string;
  startedAt: string | null;
  finishedAt: string;
  verdict: 'completed' | 'failed' | 'degraded';
  reason: string;
  counts: Record<string, unknown>;
  degradations: M3RunDegradation[];
  /** Informational scan notices. Not a verdict. */
  scanWarnings?: string[];
  /** Compile gate of this host: ran (project tsc) or unavailable. Omitted on Monaco. State, not an error. */
  tscGate?: 'ran' | 'unavailable';
}

const memoryDegradations = new Map<string, M3RunDegradation[]>();

/** In-memory key: two modules (or projects) may share a runDir name, so the runDir alone is not enough. */
function degradationKey(project: number, moduleName: string, runDir: string): string {
  return `${project}:${moduleName}:${runDir}`;
}

/** `run_` + UTC AAAAMMDDhhmmss. Never local time. */
export function m3RunDirName(now: Date): string {
  const pad = (value: number, size = 2): string => String(value).padStart(size, '0');
  return `run_${pad(now.getUTCFullYear(), 4)}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
    + `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

/** m3RunDirName(now); throws Error('M3_RUN_DIR_TAKEN: <name>') when it is already in existingRunDirs. */
export function m3NewRunDir(now: Date, existingRunDirs: readonly string[]): string {
  const name = m3RunDirName(now);
  if (existingRunDirs.includes(name)) throw new Error(`M3_RUN_DIR_TAKEN: ${name}`);
  return name;
}

/** `<module>/pipeline/trace/agentMaterializeL2v3` */
export function m3TraceRoot(moduleName: string): string {
  return `${moduleName}/pipeline/trace/${M3_AGENT_FOLDER}`;
}

/** m3TraceRoot + `/<runDir>` + (`/<subpath>` when given) */
export function m3RunFolder(moduleName: string, runDir: string, subpath = ''): string {
  const base = `${m3TraceRoot(moduleName)}/${runDir}`;
  return subpath ? `${base}/${subpath}` : base;
}

export function m3TraceFileInfo(project: number, moduleName: string, runDir: string, shortName: string, subpath = ''): FileInfo {
  return {
    project,
    level: M3_TRACE_LEVEL,
    folder: m3RunFolder(moduleName, runDir, subpath),
    shortName,
    extension: '.json',
  };
}

export function m3TraceMlsPath(project: number, moduleName: string, runDir: string, subpath: string, fileName: string): string {
  return `_${project}_/l2/${m3RunFolder(moduleName, runDir, subpath)}/${fileName}`;
}

/** Distinct `run_\d{14}` segments right under m3TraceRoot, from non-deleted level-2 files of this project; ascending. */
export function listM3RunDirs(
  files: Record<string, { project?: number; level?: number; status?: string; folder?: string } | null | undefined>,
  project: number,
  moduleName: string,
): string[] {
  if (!project || !moduleName) return [];
  const prefix = `${m3TraceRoot(moduleName)}/`;
  const found = new Set<string>();
  for (const file of Object.values(files)) {
    if (!file || file.project !== project || file.level !== M3_TRACE_LEVEL || file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (!folder.startsWith(prefix)) continue;
    const segment = folder.slice(prefix.length).split('/')[0];
    if (/^run_\d{14}$/u.test(segment)) found.add(segment);
  }
  return [...found].sort();
}

export function latestM3RunDir(runDirs: readonly string[]): string | null {
  return runDirs.length ? runDirs[runDirs.length - 1] : null;
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

/** Appends to <runDir>/degradations.json (best-effort) and to an in-memory list keyed by project:module:runDir. */
export async function recordM3Degradation(
  project: number,
  moduleName: string,
  runDir: string,
  kind: string,
  reason: string,
  path?: string,
): Promise<void> {
  const entry: M3RunDegradation = { at: new Date().toISOString(), kind, reason };
  if (path) entry.path = path;
  const key = degradationKey(project, moduleName, runDir);
  memoryDegradations.set(key, [...(memoryDegradations.get(key) ?? []), entry]);
  if (!project || !moduleName || !runDir) return;
  try {
    const existing = await readM3Degradations(project, moduleName, runDir);
    await writeM3Degradations(project, moduleName, runDir, [...existing, entry]);
  } catch { /* best-effort: the in-memory copy still reaches the run summary */ }
}

/** Reads <runDir>/degradations.json (falls back to memory), then clears both. */
export async function takeM3Degradations(project: number, moduleName: string, runDir: string): Promise<M3RunDegradation[]> {
  let items: M3RunDegradation[] = [];
  try { items = await readM3Degradations(project, moduleName, runDir); } catch { items = []; }
  const key = degradationKey(project, moduleName, runDir);
  if (!items.length) items = [...(memoryDegradations.get(key) ?? [])];
  memoryDegradations.delete(key);
  try { await writeM3Degradations(project, moduleName, runDir, []); } catch { /* leave the file if the clear fails */ }
  return items;
}

/** Writes <runDir>/summary.json with savedAt; returns its mls path, or null on failure. */
export async function saveM3RunSummary(project: number, summary: M3RunSummary): Promise<string | null> {
  try {
    if (!project || !summary.moduleName || !summary.runDir) return null;
    const info = m3TraceFileInfo(project, summary.moduleName, summary.runDir, 'summary');
    const source = `${JSON.stringify({ savedAt: new Date().toISOString(), ...summary }, null, 2)}\n`;
    await writeJsonStor(info, source);
    return `_${project}_/l2/${info.folder}/${info.shortName}.json`;
  } catch {
    return null;
  }
}

function degradationsFileInfo(project: number, moduleName: string, runDir: string): FileInfo {
  return m3TraceFileInfo(project, moduleName, runDir, 'degradations');
}

async function readM3Degradations(project: number, moduleName: string, runDir: string): Promise<M3RunDegradation[]> {
  if (!project || !moduleName || !runDir) return [];
  const file = mls.stor.files[mls.stor.getKeyToFile(degradationsFileInfo(project, moduleName, runDir))] as { status?: string; getContent?: () => Promise<string> } | undefined;
  if (!file || file.status === 'deleted' || !file.getContent) return [];
  const parsed = JSON.parse(String(await file.getContent()));
  return Array.isArray(parsed?.items) ? parsed.items.filter(isDegradation) : [];
}

async function writeM3Degradations(project: number, moduleName: string, runDir: string, items: M3RunDegradation[]): Promise<void> {
  if (!project || !moduleName || !runDir) return;
  await writeJsonStor(degradationsFileInfo(project, moduleName, runDir), `${JSON.stringify({ items }, null, 2)}\n`);
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

function isDegradation(value: unknown): value is M3RunDegradation {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.kind === 'string' && typeof record.reason === 'string';
}
