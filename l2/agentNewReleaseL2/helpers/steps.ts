/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/steps.ts" enhancement="_blank"/>

import { checkAfterDefs, snapshotOf, type DefsGuard, type SnapshotFile } from '/_102020_/l2/agentNewReleaseL2/helpers/guard.js';
import {
  collectExactModuleFiles,
  displayPath,
  fileExists,
  moduleFile,
  moduleFolder,
  readJson,
  readSourceText,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';

export const NR_AGENT_NAME = 'agentNewReleaseL2';
export const NR_HELP = 'Usage: @@agentNewReleaseL2 <module>';
export const NR_DEFS_AGENT = 'agentDefsL2';
export const NR_DEFS_PLAN = 'defs';
export const NR_DEFS_SCOPE = 'all';
export const NR_CHECK_PLAN = 'check';
export const NR_MATERIALIZE_AGENT = 'agentMaterializeL2';
export const NR_MATERIALIZE_PLAN = 'materialize';
export const NR_CLOSE_PLAN = 'close';
export const NR_MARKS_DIFFER = 'planner conversation not run or marks differ';

export type NrInvocation =
  | { ok: true; module: string }
  | { ok: false; help: string };

export function parseNrInvocation(value: string): NrInvocation {
  const raw = String(value || '').replace(/^@@agentNewReleaseL2\b/i, ' ').trim();
  const tokens = raw.split(/\s+/u).filter(Boolean);
  if (tokens.length !== 1) return { ok: false, help: NR_HELP };
  return { ok: true, module: tokens[0] };
}

export function currentMasterProject(): string {
  return String(mls.actualProject || '');
}

export function currentProjectNumber(): number {
  return Number(mls.actualProject || 0);
}

export function changeEffortInfo(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: base.level,
    folder: `${base.folder}/pool/l4`,
    shortName: 'changeEffort',
    extension: '.json',
  };
}

export async function readChangeEffort(moduleName: string): Promise<{ ok: true; effort: unknown } | { ok: false; reason: string }> {
  const info = changeEffortInfo(moduleName);
  const path = displayPath(info);
  if (!fileExists(info)) return { ok: false, reason: `changeEffort.json is missing at ${path}` };
  const effort = await readJson<unknown>(info);
  if (effort === null) return { ok: false, reason: `changeEffort.json at ${path} is not valid JSON` };
  return { ok: true, effort };
}

export function materializePrompt(project: number, moduleName: string, pages: string[]): string {
  return JSON.stringify({ project, module: moduleName, scope: { pages } });
}

export function defsPrompt(project: number, moduleName: string): string {
  return JSON.stringify({ project, module: moduleName, scope: NR_DEFS_SCOPE });
}

/** Pages the materializer must write: rebuilt pages, then materialize-only pages not already listed. */
export function releasePages(pages: readonly string[], materializeOnly: readonly string[]): string[] {
  const seen = new Set(pages);
  const combined = [...pages];
  for (const id of materializeOnly) {
    if (seen.has(id)) continue;
    seen.add(id);
    combined.push(id);
  }
  return combined;
}

export function poolEffortInfo(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: base.level,
    folder: `${base.folder}/pool/l2/web`,
    shortName: 'effort',
    extension: '.json',
  };
}

export function snapshotInfo(moduleName: string): Ns5FileInfo {
  return {
    project: currentProjectNumber(),
    level: 2,
    folder: `${moduleFolder(moduleName)}/pipeline/${NR_AGENT_NAME}`,
    shortName: 'snapshot',
    extension: '.json',
  };
}

/** `toCreate` and `toUpdate` page ids from the L2 pool effort. Anything else counts as unmarked. */
export function markedPageIds(effort: unknown): string[] {
  if (!effort || typeof effort !== 'object') return [];
  const screens = (effort as { screens?: unknown }).screens;
  if (!Array.isArray(screens)) return [];
  const ids: string[] = [];
  for (const row of screens) {
    if (!row || typeof row !== 'object') continue;
    const pageId = String((row as { pageId?: unknown }).pageId || '').trim();
    const status = String((row as { status?: unknown }).status || '');
    if (!pageId || (status !== 'toCreate' && status !== 'toUpdate')) continue;
    ids.push(pageId);
  }
  return ids;
}

/** Null when the two sets are the same. Otherwise the refusal, with both lists. */
export function marksDifferMessage(marked: readonly string[], planned: readonly string[]): string | null {
  const left = [...marked].sort();
  const right = [...planned].sort();
  if (left.length === right.length && left.every((id, index) => id === right[index])) return null;
  return `${NR_MARKS_DIFFER}: marked [${left.join(', ')}]; planned [${right.join(', ')}]`;
}

export async function readPoolEffort(moduleName: string): Promise<unknown | null> {
  const info = poolEffortInfo(moduleName);
  if (!fileExists(info)) return null;
  return readJson<unknown>(info);
}

export async function readProductSnapshot(moduleName: string): Promise<Record<string, string>> {
  const files: SnapshotFile[] = [];
  for (const file of collectExactModuleFiles(moduleName, [2])) {
    if (file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    files.push({ path: displayPath(file), bytes: await readSourceText(file) });
  }
  return snapshotOf(files);
}

export async function writeReleaseSnapshot(moduleName: string, snapshot: Record<string, string>): Promise<void> {
  await writeJson(snapshotInfo(moduleName), snapshot);
}

export async function readReleaseSnapshot(moduleName: string): Promise<Record<string, string> | null> {
  const info = snapshotInfo(moduleName);
  if (!fileExists(info)) return null;
  const value = await readJson<unknown>(info);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const snapshot: Record<string, string> = {};
  for (const [path, hash] of Object.entries(value)) {
    if (typeof hash === 'string') snapshot[path] = hash;
  }
  return snapshot;
}

export async function guardAfterDefs(moduleName: string, pages: readonly string[]): Promise<DefsGuard | null> {
  const before = await readReleaseSnapshot(moduleName);
  if (!before) return null;
  const after = await readProductSnapshot(moduleName);
  return checkAfterDefs(before, after, pages);
}

function agentStep(
  agentName: string,
  planId: string,
  dependsOn: string[],
  stepTitle: string,
  prompt: string,
): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle,
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName,
    prompt,
    rags: [],
    planning: {
      planId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

/** Defs generator first (`scope: all`), then this agent's check step. The check waits on the defs plan id. */
export function buildRegenerateSteps(project: number, moduleName: string): mls.msg.AIAgentStep[] {
  return [
    {
      ...agentStep(
        NR_DEFS_AGENT,
        NR_DEFS_PLAN,
        [],
        'Regenerate page defs',
        defsPrompt(project, moduleName),
      ),
      onFailure: 'continue',
    },
    agentStep(
      NR_AGENT_NAME,
      NR_CHECK_PLAN,
      [NR_DEFS_PLAN],
      'Check defs guard',
      JSON.stringify({ planId: NR_CHECK_PLAN }),
    ),
  ];
}

/** Materializer first, then this agent's close step. The close step waits on the materializer plan id. */
export function buildApplySteps(
  project: number,
  moduleName: string,
  pages: string[],
  materializeOnly: readonly string[] = [],
): mls.msg.AIAgentStep[] {
  return [
    {
      ...agentStep(
        NR_MATERIALIZE_AGENT,
        NR_MATERIALIZE_PLAN,
        [],
        'Materialize pages',
        materializePrompt(project, moduleName, releasePages(pages, materializeOnly)),
      ),
      onFailure: 'continue',
    },
    agentStep(
      NR_AGENT_NAME,
      NR_CLOSE_PLAN,
      [NR_MATERIALIZE_PLAN],
      'Close release',
      JSON.stringify({ planId: NR_CLOSE_PLAN }),
    ),
  ];
}

export function planIdOf(step: { planning?: { planId?: string } | null }): string {
  return step.planning?.planId || '';
}

function namedOutcome(step: mls.msg.AIPayload | undefined, label: string): { status: 'completed' | 'failed'; message: string } {
  if (!step) return { status: 'failed', message: `${label} step is missing` };
  const traces = step.interaction?.trace?.map(line => line.trim()).filter(Boolean) ?? [];
  const nested = (step.nextSteps || []).find(item => item.type === 'result');
  const resultText = nested && nested.type === 'result' ? String(nested.result || '').trim() : '';
  const message = traces[traces.length - 1] || resultText || `${label} ${step.status}`;
  return { status: step.status === 'completed' ? 'completed' : 'failed', message };
}

export function materializerOutcome(step: mls.msg.AIPayload | undefined): { status: 'completed' | 'failed'; message: string } {
  return namedOutcome(step, NR_MATERIALIZE_AGENT);
}

export function defsOutcome(step: mls.msg.AIPayload | undefined): { status: 'completed' | 'failed'; message: string } {
  return namedOutcome(step, NR_DEFS_AGENT);
}

/** Failed defs or any `outside` path stops the release. A clean guard is the only case that adds the materializer. */
export function reviewDefsRun(
  defs: { status: string; message: string } | undefined,
  guard: DefsGuard,
): { status: 'completed' | 'failed'; message: string; addMaterialize: boolean } {
  if (!defs || defs.status !== 'completed') {
    return { status: 'failed', message: defs?.message || `${NR_DEFS_AGENT} step is missing`, addMaterialize: false };
  }
  if (guard.outside.length > 0) {
    return { status: 'failed', message: `outside: ${guard.outside.join(', ')}`, addMaterialize: false };
  }
  return { status: 'completed', message: 'defs stayed inside the planned pages', addMaterialize: true };
}
