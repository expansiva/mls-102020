/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4RebuildAll.ts" enhancement="_blank"/>

import {
  normalizeNs4ModuleName,
  type Ns4PipelineState,
  type Ns4RebuildAllReport,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';

export type Ns4RebuildAllFile = {
  project?: number;
  level?: number;
  folder?: string;
  status?: string;
};

export type Ns4RebuildAllPlan =
  | { ok: true; prompt: string; keys: string[]; report: Ns4RebuildAllReport; projectJson: Record<string, unknown> | null; configJson: Record<string, unknown> | null }
  | { ok: false; reason: string; keys: string[] };

/**
 * Exact module-folder prefix: the first path segment, after the same canonicalization every other
 * NS folder uses. Never `includes`, never a loose regex — `listaAssinatura` must not match
 * `listaAssinaturaAntiga`, and `todo` must not match `todoList` or anything else.
 */
export function isNs4ExactModuleFolderPrefix(folder: string, moduleName: string): boolean {
  const normalized = normalizeNs4ModuleName(moduleName);
  const first = String(folder || '').split('/').filter(Boolean)[0] || '';
  return !!first && normalizeNs4ModuleName(first) === normalized;
}

export function recoverNs4RebuildAllPrompt(input: {
  initialPrompt?: unknown;
  sourcePrompt?: unknown;
}): { ok: true; prompt: string } | { ok: false; reason: string } {
  const initial = typeof input.initialPrompt === 'string' ? input.initialPrompt.trim() : '';
  if (initial) return { ok: true, prompt: initial };
  const source = typeof input.sourcePrompt === 'string' ? input.sourcePrompt.trim() : '';
  if (source) return { ok: true, prompt: source };
  return {
    ok: false,
    reason: 'Não foi possível recuperar o prompt original (nem designContext.initialPrompt em module.defs.ts, nem sourcePrompt no pipeline). Nada foi apagado.',
  };
}

/** l1, l2, l4 and per-module l5 of THAT module only. Project-level l5 (config.json, project.json) stays. */
export function listNs4RebuildAllDeletionKeys(
  files: Record<string, Ns4RebuildAllFile | undefined>,
  project: number,
  moduleName: string,
): string[] {
  const keys: string[] = [];
  for (const [key, file] of Object.entries(files)) {
    if (!file || file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (file.level !== 1 && file.level !== 2 && file.level !== 4 && file.level !== 5) continue;
    if (!isNs4ExactModuleFolderPrefix(file.folder, moduleName)) continue;
    keys.push(key);
  }
  return keys;
}

export function countNs4RebuildAllByLayer(
  files: Record<string, Ns4RebuildAllFile | undefined>,
  keys: readonly string[],
): Ns4RebuildAllReport['deleted'] {
  const deleted = { l1: 0, l2: 0, l4: 0, l5: 0 };
  for (const key of keys) {
    const level = files[key]?.level;
    if (level === 1) deleted.l1 += 1;
    else if (level === 2) deleted.l2 += 1;
    else if (level === 4) deleted.l4 += 1;
    else if (level === 5) deleted.l5 += 1;
  }
  return deleted;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function moduleEntryName(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (!isRecord(item)) return '';
  for (const field of ['moduleName', 'moduleId', 'name'] as const) {
    const value = item[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isSameModule(name: string, moduleName: string): boolean {
  return !!name && normalizeNs4ModuleName(name) === normalizeNs4ModuleName(moduleName);
}

function stripModuleList(value: unknown, moduleName: string): { list: unknown; removed: number } {
  if (!Array.isArray(value)) return { list: value, removed: 0 };
  const kept: unknown[] = [];
  let removed = 0;
  for (const item of value) {
    if (isSameModule(moduleEntryName(item), moduleName)) removed += 1;
    else kept.push(item);
  }
  return { list: kept, removed };
}

export function stripNs4ModuleFromProjectJson(
  projectJson: unknown,
  moduleName: string,
): { value: Record<string, unknown> | null; removed: number } {
  if (!isRecord(projectJson)) return { value: null, removed: 0 };
  const stripped = stripModuleList(projectJson.modules, moduleName);
  return { value: { ...projectJson, modules: stripped.list }, removed: stripped.removed };
}

export function stripNs4ModuleFromConfigJson(
  config: unknown,
  moduleName: string,
): { value: Record<string, unknown> | null; removed: number } {
  if (!isRecord(config)) return { value: null, removed: 0 };
  const next: Record<string, unknown> = { ...config };
  let removed = 0;
  const root = stripModuleList(next.modules, moduleName);
  if (Array.isArray(next.modules)) {
    next.modules = root.list;
    removed += root.removed;
  }
  if (isRecord(next.projects)) {
    const projects: Record<string, unknown> = { ...next.projects };
    for (const [key, project] of Object.entries(projects)) {
      if (!isRecord(project) || !Array.isArray(project.modules)) continue;
      const nested = stripModuleList(project.modules, moduleName);
      projects[key] = { ...project, modules: nested.list };
      removed += nested.removed;
    }
    next.projects = projects;
  }
  return { value: next, removed };
}

export function planNs4RebuildAll(input: {
  files: Record<string, Ns4RebuildAllFile | undefined>;
  project: number;
  moduleName: string;
  initialPrompt?: unknown;
  sourcePrompt?: unknown;
  projectJson?: unknown;
  configJson?: unknown;
  at?: string;
}): Ns4RebuildAllPlan {
  const recovered = recoverNs4RebuildAllPrompt({
    initialPrompt: input.initialPrompt,
    sourcePrompt: input.sourcePrompt,
  });
  if (!recovered.ok) return { ok: false, reason: recovered.reason, keys: [] };
  const keys = listNs4RebuildAllDeletionKeys(input.files, input.project, input.moduleName);
  const projectJson = stripNs4ModuleFromProjectJson(input.projectJson, input.moduleName);
  const configJson = stripNs4ModuleFromConfigJson(input.configJson, input.moduleName);
  return {
    ok: true,
    prompt: recovered.prompt,
    keys,
    projectJson: projectJson.value,
    configJson: configJson.value,
    report: {
      at: input.at || new Date().toISOString(),
      deleted: countNs4RebuildAllByLayer(input.files, keys),
      sanitized: {
        projectJsonRemoved: projectJson.removed,
        configJsonRemoved: configJson.removed,
      },
    },
  };
}

export function stampNs4RebuildAll(pipeline: Ns4PipelineState, report: Ns4RebuildAllReport): Ns4PipelineState {
  return { ...pipeline, rebuildAll: report, rebuiltAt: report.at };
}

export function parseNs4RebuildAllReport(value: unknown): Ns4RebuildAllReport | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Ns4RebuildAllReport;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.at !== 'string' || !parsed.deleted) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function formatNs4RebuildAllNote(moduleName: string, report: Ns4RebuildAllReport): string {
  const { l1, l2, l4, l5 } = report.deleted;
  return `/rebuild all ${moduleName}: deleted l1=${l1} l2=${l2} l4=${l4} l5=${l5}; sanitized projectJson=${report.sanitized.projectJsonRemoved} configJson=${report.sanitized.configJsonRemoved}`;
}
