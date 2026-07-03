/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Artifacts.ts" enhancement="_102027_/l2/enhancementAgent"/>

// File I/O for agentNewSolution2 (Stage 1). Writes the durable business model to l4 (BUSINESS):
//   module-scoped  -> l4/{module}/module.defs.ts , l4/{module}/ontology/{EntityId}.defs.ts ,
//                     l4/{module}/journeys/{module}Journeys.defs.ts
//   global         -> l4/rules/{id}.defs.ts , l4/workflows/{id}.defs.ts , l4/operations/{id}.defs.ts
//   project data   -> l5/project.json (merge) , l5/{module}/process.defs.ts (run record)
// Trace/checkpoints live under l4 too and are wiped at finish (clearRunArtifacts); the permanent
// .defs.ts artifacts and the process record are kept.
//
// Module-name lifecycle (simplified vs the legacy temp-folder dance): NOTHING is written before the
// blueprint confirms the name. agentNs2Blueprint reserves a collision-free name and records it as a
// result step (planId 'module-name-final'); every later agent runs after the blueprint, so it always
// resolves the confirmed name. getApprovedModuleName returns null before that point.

import { createStorFile, deleteFile } from '/_102027_/l2/libStor.js';
import { getAgentStepByAgentName, getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { isRecord, parseMaybeJson } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import {
  MODULE_NAME_FINAL_PLAN_ID,
  normalizeModuleFolderName,
  reserveModuleNameFromFolders,
} from '/_102020_/l2/agentNewSolution2/ns2Plan.js';

const ROOT_AGENT_NAME = 'agentNewSolution2';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

// ── module name ────────────────────────────────────────────────────────────────

/** Tentative name the root LLM suggested (prompt default only — never a folder until confirmed). */
export function getInitialModuleName(context: mls.msg.ExecutionContext): string {
  const result = getRootPlanResult(context);
  return normalizeModuleFolderName(result?.moduleName, typeof result?.userPrompt === 'string' ? result.userPrompt : 'module');
}

/** The confirmed run folder, or null before agentNs2Blueprint recorded 'module-name-final'. */
export function getApprovedModuleName(context: mls.msg.ExecutionContext): string | null {
  if (!context.task) return null;
  const steps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const finalStep = steps.find(item =>
    item.type === 'result'
    && (item as { planning?: { planId?: string } }).planning?.planId === MODULE_NAME_FINAL_PLAN_ID
    && (item as mls.msg.AIResultStep).result,
  ) as mls.msg.AIResultStep | undefined;
  if (!finalStep?.result) return null;
  try {
    const parsed = parseMaybeJson(finalStep.result);
    const name = isRecord(parsed) ? readString(parsed.moduleName) : undefined;
    return name ? normalizeModuleFolderName(name, 'module') : null;
  } catch {
    return null;
  }
}

/** Pick a collision-free folder name from the tentative one (called once by the blueprint). */
export function reserveAvailableModuleName(requestedName: unknown, fallbackPrompt: string): string {
  return reserveModuleNameFromFolders(requestedName, fallbackPrompt, getExistingModuleFolders());
}

export function getExistingModuleFolders(): Set<string> {
  const project = mls.actualProject || 0;
  const folders = new Set<string>();
  for (const file of Object.values(mls.stor.files)) {
    if (file.project !== project || file.level === 3 || !file.folder) continue;
    const first = file.folder.split('/')[0];
    if (first) folders.add(first);
  }
  return folders;
}

function getRootPlanResult(context: mls.msg.ExecutionContext): Record<string, unknown> | undefined {
  if (!context.task) return undefined;
  const rootStep = getAgentStepByAgentName(context.task, ROOT_AGENT_NAME) as mls.msg.AIAgentStep | null;
  const payload = rootStep?.interaction?.payload?.[0] as mls.msg.AIFlexibleResultStep | undefined;
  return payload?.type === 'flexible' && isRecord(payload.result) ? payload.result : undefined;
}

// ── trace policy ─────────────────────────────────────────────────────────────────

export const SAVE_TRACE_DEFAULT = true;
export const SAVE_TRACE_MEMORY_KEY = '_saveTrace';

export function saveTraceMemorySeed(): Record<string, string> {
  return { [SAVE_TRACE_MEMORY_KEY]: String(SAVE_TRACE_DEFAULT) };
}

export function shouldSaveTrace(context: mls.msg.ExecutionContext): boolean {
  try {
    const longMemory = (context.task?.iaCompressed as { longMemory?: Record<string, string> } | undefined)?.longMemory;
    const flag = longMemory?.[SAVE_TRACE_MEMORY_KEY];
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return SAVE_TRACE_DEFAULT;
  } catch {
    return SAVE_TRACE_DEFAULT;
  }
}

/** Debug trace of a step payload -> l4/{module}/trace/NNN-agent.json. Best-effort; skips before the
 * module name is confirmed (nothing to write into yet). */
export async function saveAgentTrace(context: mls.msg.ExecutionContext, agentName: string, step: mls.msg.AIAgentStep): Promise<void> {
  if (!shouldSaveTrace(context)) return;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) return;
    const moduleName = getApprovedModuleName(context);
    if (!moduleName) return;
    const record = {
      savedAt: new Date().toISOString(),
      agentName,
      stepId: step.stepId,
      planning: (step as { planning?: unknown }).planning || null,
      status: step.status,
      payload,
    };
    await saveStorContent({
      project: mls.actualProject || 0,
      level: 4,
      folder: `${moduleName}/trace`,
      shortName: traceShortName(agentName, step.stepId),
      extension: '.json',
    }, `${JSON.stringify(record, null, 2)}\n`, false);
  } catch (error) {
    console.warn(`[ns2 saveAgentTrace] failed for ${agentName}`, error);
  }
}

/** Freeze an approved index as l4/trace/checkpoint-{index}.json (read by nothing critical; audit only). */
export async function saveIndexCheckpoint(context: mls.msg.ExecutionContext, indexName: string, index: unknown, findings: unknown[]): Promise<void> {
  try {
    const moduleName = runModuleName(context);
    await saveStorContent({
      project: mls.actualProject || 0,
      level: 4,
      folder: 'trace',
      shortName: `checkpoint-${toSafeShortName(indexName)}`,
      extension: '.json',
    }, `${JSON.stringify({ indexName, moduleName, approvedAt: new Date().toISOString(), findings, index }, null, 2)}\n`, false);
  } catch (error) {
    console.warn(`[ns2 saveIndexCheckpoint] failed for ${indexName}`, error);
  }
}

/** Non-blocking Stage-1 coverage report -> l4/trace/behavior-health-report.json. */
export async function saveBehaviorHealthReport(context: mls.msg.ExecutionContext, report: unknown): Promise<void> {
  try {
    const moduleName = runModuleName(context);
    await saveStorContent({
      project: mls.actualProject || 0,
      level: 4,
      folder: 'trace',
      shortName: 'behavior-health-report',
      extension: '.json',
    }, `${JSON.stringify({ moduleName, savedAt: new Date().toISOString(), report }, null, 2)}\n`, false);
  } catch (error) {
    console.warn('[ns2 saveBehaviorHealthReport] failed', error);
  }
}

/** Reads the persisted behavior health report (kept across "clear traces"). Null when absent. */
export async function readBehaviorHealthReport(moduleName: string): Promise<unknown | null> {
  try {
    const fileInfo: FileInfo = { project: mls.actualProject || 0, level: 4, folder: 'trace', shortName: 'behavior-health-report', extension: '.json' };
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    if (!file) return null;
    const parsed = parseMaybeJson(await file.getContent());
    return isRecord(parsed) ? (parsed as Record<string, unknown>).report ?? parsed : null;
  } catch (error) {
    console.warn('[ns2 readBehaviorHealthReport] failed', error);
    return null;
  }
}

// ── defs / json writers ────────────────────────────────────────────────────────

export function moduleDefsFileInfo(moduleName: string): FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: normalizeModuleFolderName(moduleName, 'module'), shortName: 'module', extension: '.defs.ts' };
}
export function ontologyEntityFileInfo(moduleName: string, entityId: string): FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeModuleFolderName(moduleName, 'module')}/ontology`, shortName: toSafeShortName(entityId), extension: '.defs.ts' };
}
export function ruleSetFileInfo(ruleSetId: string): FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: 'rules', shortName: toSafeShortName(ruleSetId), extension: '.defs.ts' };
}
export function workflowFileInfo(workflowId: string): FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: 'workflows', shortName: toSafeShortName(workflowId), extension: '.defs.ts' };
}
export function operationFileInfo(operationId: string): FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: 'operations', shortName: toSafeShortName(operationId), extension: '.defs.ts' };
}
export function journeyFileInfo(moduleName: string): FileInfo {
  const normalized = normalizeModuleFolderName(moduleName, 'module');
  return { project: mls.actualProject || 0, level: 4, folder: `${normalized}/journeys`, shortName: `${toSafeShortName(normalized)}Journeys`, extension: '.defs.ts' };
}
// Actors live in their own GLOBAL folder so they double as the authorization roster: each actor maps
// to a JWT role scope `{module}:{actorId}` (e.g. cafeFlow:managerOwner) the runtime can enforce later.
export function actorsFileInfo(moduleName: string): FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: 'actors', shortName: `${toSafeShortName(moduleName)}Actors`, extension: '.defs.ts' };
}

/** Writes an `export const {name} = {...} as const;` defs artifact and returns its display path. */
export async function saveDefsArtifact(fileInfo: FileInfo, exportName: string, data: unknown): Promise<string> {
  const source = buildDefsSource(exportName, data, fileInfo);
  await saveStorContent(fileInfo, source, false);
  return toDisplayPath(fileInfo);
}

// ── file-fallback readers ────────────────────────────────────────────────────────
// Parallel fan-out children are pre-allocated, reused and DELETED by the backend after completion
// (see mls.d.ts AgentIntentParallelSteps §7.1). Therefore consumers that run AFTER a fan-out must read
// the SAVED .defs.ts artifacts, never the task payloads. These readers are that source of truth.

async function readDefsObjectsInFolder(level: number, folder: string): Promise<Record<string, unknown>[]> {
  const project = mls.actualProject || 0;
  const out: Record<string, unknown>[] = [];
  for (const file of Object.values(mls.stor.files)) {
    if (file.project !== project || file.level !== level || file.folder !== folder) continue;
    if (file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    try {
      const parsed = parseDefsSource(await file.getContent() as string);
      if (isRecord(parsed)) out.push(parsed);
    } catch {
      // unreadable artifact: skip
    }
  }
  return out;
}

/** l4/{module}/ontology/*.defs.ts -> { entityId: canonicalEntityDef }. */
export async function readOntologyEntities(moduleName: string): Promise<Record<string, Record<string, unknown>>> {
  const map: Record<string, Record<string, unknown>> = {};
  for (const def of await readDefsObjectsInFolder(4, `${normalizeModuleFolderName(moduleName, 'module')}/ontology`)) {
    const id = readString(def.entityId);
    if (id) map[id] = def;
  }
  return map;
}

/** l4/workflows/*.defs.ts -> workflow definition objects. */
export async function readWorkflowDefs(): Promise<Record<string, unknown>[]> {
  return readDefsObjectsInFolder(4, 'workflows');
}

/** l4/operations/*.defs.ts -> operation definition objects. */
export async function readOperationDefs(): Promise<Record<string, unknown>[]> {
  return readDefsObjectsInFolder(4, 'operations');
}

/** l4/{module}/journeys/*.defs.ts -> journey map objects. */
export async function readJourneyDefs(moduleName: string): Promise<Record<string, unknown>[]> {
  return readDefsObjectsInFolder(4, `${normalizeModuleFolderName(moduleName, 'module')}/journeys`);
}

/** Merge l5/project.json: preserve every top-level field, add/replace this module + dedupe deps/languages. */
export async function mergeProjectJson(moduleEntry: Record<string, unknown>, dependencies: Record<string, unknown>[] = [], languages: string[] = []): Promise<void> {
  const fileInfo: FileInfo = { project: mls.actualProject || 0, level: 5, folder: '', shortName: 'project', extension: '.json' };
  const key = mls.stor.getKeyToFile(fileInfo);
  const existingFile = mls.stor.files[key];
  const existingRaw = existingFile ? await existingFile.getContent() : undefined;
  const base = typeof existingRaw === 'string' && isRecord(parseMaybeJson(existingRaw)) ? (parseMaybeJson(existingRaw) as Record<string, unknown>) : {};

  const moduleMap = new Map<string, Record<string, unknown>>();
  for (const m of (Array.isArray(base.modules) ? base.modules : []).filter(isRecord)) {
    const name = readString(m.moduleName);
    if (name) moduleMap.set(name, m);
  }
  const incomingName = readString(moduleEntry.moduleName);
  if (incomingName) moduleMap.set(incomingName, moduleEntry);

  const depsMap = new Map<string, Record<string, unknown>>();
  for (const dep of [...(Array.isArray(base.dependencies) ? base.dependencies : []).filter(isRecord), ...dependencies]) {
    depsMap.set(`${readString(dep.projectId)}:${readString(dep.kind)}`, dep);
  }

  const languageMap = new Map<string, Record<string, unknown>>();
  for (const language of (Array.isArray(base.languages) ? base.languages : []).filter(isRecord)) {
    const code = normalizeLanguageCode(readString(language.language));
    if (code) languageMap.set(code.toLowerCase(), { ...language, language: code });
  }
  for (const code of languages.map(normalizeLanguageCode).filter(Boolean)) {
    const key = code.toLowerCase();
    if (!languageMap.has(key)) languageMap.set(key, buildLanguageEntry(code, languageMap.size === 0));
  }

  const merged = {
    ...base,
    modules: [...moduleMap.values()],
    ...(languageMap.size > 0 ? { languages: [...languageMap.values()] } : {}),
    ...(depsMap.size > 0 ? { dependencies: [...depsMap.values()] } : {}),
  };
  await saveStorContent(fileInfo, `${JSON.stringify(merged, null, 2)}\n`, false);
}

function normalizeLanguageCode(value: unknown): string {
  return (typeof value === 'string' ? value.trim() : '').replace('_', '-');
}

function buildLanguageEntry(code: string, isFirst: boolean): Record<string, unknown> {
  return {
    language: code,
    name: languageName(code),
    path: isFirst ? '/' : `/${code}`,
  };
}

function languageName(code: string): string {
  const normalized = code.toLowerCase();
  if (normalized === 'en') return 'English';
  if (normalized === 'pt' || normalized === 'pt-br') return 'Portuguese';
  if (normalized === 'es') return 'Spanish';
  return code;
}

// ── process record (l5/{module}/process.defs.ts) ─────────────────────────────────

export const PROCESS_SCHEMA_VERSION = '2026-06-25';

export interface ProcessNextStep {
  id: string;
  kind: 'workflowExperience' | 'backendImplementation' | 'horizontalModule' | 'plugin';
  title: string;
  description: string;
  status: 'pending' | 'taskOpened' | 'dismissed';
  taskId?: string;
}

export interface ProcessRun {
  runId: string;
  kind: 'newSolution2-behavior';
  startedAt: string;
  finishedAt?: string;
  sourceRefs?: Record<string, string>;
  handoffNotes?: string[];
  nextSteps: ProcessNextStep[];
}

export async function readProcess(moduleName: string): Promise<{ schemaVersion: string; moduleName: string; runs: ProcessRun[] } | null> {
  try {
    const fileInfo = processFileInfo(moduleName);
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    if (!file) return null;
    const raw = await file.getContent();
    const parsed = typeof raw === 'string' ? parseDefsSource(raw) : null;
    if (!isRecord(parsed)) return null;
    return {
      schemaVersion: readString(parsed.schemaVersion) || PROCESS_SCHEMA_VERSION,
      moduleName: readString(parsed.moduleName) || normalizeModuleFolderName(moduleName, 'module'),
      runs: Array.isArray(parsed.runs) ? (parsed.runs as ProcessRun[]) : [],
    };
  } catch (error) {
    console.warn(`[ns2 readProcess] failed for ${moduleName}`, error);
    return null;
  }
}

export async function writeProcessRun(moduleNameInput: string, run: ProcessRun): Promise<void> {
  try {
    const moduleName = normalizeModuleFolderName(moduleNameInput, 'module');
    const existing = await readProcess(moduleName);
    const runs = existing?.runs ? [...existing.runs] : [];
    const index = runs.findIndex(r => r && r.runId === run.runId);
    if (index >= 0) runs[index] = run;
    else runs.push(run);

    const fileInfo = processFileInfo(moduleName);
    const data = { schemaVersion: PROCESS_SCHEMA_VERSION, moduleName, runs };
    await saveStorContent(fileInfo, buildDefsSource(`${toExportIdentifier(moduleName)}Process`, data, fileInfo), false);
  } catch (error) {
    console.warn('[ns2 writeProcessRun] failed', error);
  }
}

/** "Clear traces": delete l4/{module}/trace/* and l4/trace/checkpoint/health files. Keeps the
 * permanent l4 defs artifacts and l5 process record. Returns the number of files removed. */
export async function clearRunArtifacts(moduleName: string): Promise<number> {
  const project = mls.actualProject || 0;
  const moduleTrace = `${normalizeModuleFolderName(moduleName, 'module')}/trace`;
  let removed = 0;
  for (const file of Object.values(mls.stor.files)) {
    if (file.project !== project || file.level !== 4) continue;
    const isModuleTrace = file.folder === moduleTrace;
    const isGlobalTrace = file.folder === 'trace';
    if (!isModuleTrace && !isGlobalTrace) continue;
    if (isGlobalTrace && file.shortName === 'behavior-health-report') continue; // keep the report
    try {
      await deleteFile(file);
      removed += 1;
    } catch (error) {
      console.warn(`[ns2 clearRunArtifacts] failed to delete ${file.folder}/${file.shortName}`, error);
    }
  }
  return removed;
}

// ── low-level ────────────────────────────────────────────────────────────────────

function processFileInfo(moduleName: string): FileInfo {
  return { project: mls.actualProject || 0, level: 5, folder: normalizeModuleFolderName(moduleName, 'module'), shortName: 'process', extension: '.defs.ts' };
}

function runModuleName(context: mls.msg.ExecutionContext): string {
  return getApprovedModuleName(context) || normalizeModuleFolderName(getInitialModuleName(context), 'module');
}

function buildDefsSource(exportName: string, data: unknown, fileInfo: FileInfo): string {
  const name = toExportIdentifier(exportName || 'defsArtifact');
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  const reference = `_${fileInfo.project}_/l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
  const header = `/// <mls fileReference="${reference}" enhancement="_blank"/>\n\n`;
  return `${header}export const ${name} = ${JSON.stringify(data, null, 2)} as const;\n\nexport default ${name};\n`;
}

function parseDefsSource(content: string): unknown {
  const start = content.indexOf('= ');
  const end = content.lastIndexOf(' as const;');
  if (start === -1 || end === -1 || end <= start) return null;
  return parseMaybeJson(content.slice(start + 2, end));
}

async function saveStorContent(fileInfo: FileInfo, source: string, needCreateModel: boolean): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source }, needCreateModel, needCreateModel, false);
  } else if (needCreateModel) {
    const model = await storFile.getOrCreateModel();
    if (model?.model) model.model.setValue(source);
  }
  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}

function traceShortName(agentName: string, stepId: number): string {
  const safe = agentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${String(stepId).padStart(3, '0')}-${safe || 'agent'}`;
}

function toSafeShortName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'artifact';
}

function toExportIdentifier(value: string): string {
  const words = value.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const joined = words.length > 0
    ? words.map((word, index) => (index === 0 ? word : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)).join('')
    : 'defsArtifact';
  const clean = joined.replace(/[^a-zA-Z0-9_$]/g, '');
  return /^[a-zA-Z_$]/.test(clean) ? clean : `_${clean}` || 'defsArtifact';
}

function toDisplayPath(fileInfo: FileInfo): string {
  const folder = fileInfo.folder ? `${fileInfo.folder}/` : '';
  return `l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
