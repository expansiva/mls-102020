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
export const NR_NOTHING_TO_APPLY = 'nothing to apply';

export type NrInvocation =
  | { ok: true; module: string }
  | { ok: false; help: string };

/** Picks the text prefix. The step status itself is always `completed` — the host drops any other terminal value. */
export type NrStatusPrefix = 'done' | 'refused' | 'failed';

export function statusKind(message: string): NrStatusPrefix {
  if (message === NR_HELP || message === NR_NOTHING_TO_APPLY) return 'done';
  return 'refused';
}

export function statusText(message: string, kind: NrStatusPrefix = statusKind(message)): string {
  const prefix = `${kind}: `;
  return message.startsWith(prefix) ? message : `${prefix}${message}`;
}

/** Short motive. The full text stays in the step result. Both start with the same prefix. */
export function statusStepTitle(message: string): string {
  const compact = message.replace(/\s+/gu, ' ').trim();
  return compact.length <= 72 ? compact : `${compact.slice(0, 69)}...`;
}

export function statusIntents(
  agentName: string,
  threadId: string,
  userMessage: string,
  message: string,
  kind?: NrStatusPrefix,
): mls.msg.AgentIntent[] {
  const text = statusText(message, kind);
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName,
      inputAI: [
        { type: 'system', content: text },
        { type: 'human', content: text },
      ],
      taskTitle: NR_AGENT_NAME,
      threadId,
      userMessage,
      longTermMemory: {
        taskName: NR_AGENT_NAME,
        flowName: NR_AGENT_NAME,
        statusOnly: 'true',
        notice: text,
      },
    },
  };
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: statusStepTitle(text),
    result: text,
    planning: { planId: 'status', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  const step: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: '',
    threadId,
    taskId: '',
    parentStepId: 1,
    step: result,
  };
  return [addMessage, step];
}

export function parseNrInvocation(value: string): NrInvocation {
  const raw = String(value || '').replace(/^@@agentNewReleaseL2\b/i, ' ').trim();
  const tokens = raw.split(/\s+/u).filter(Boolean);
  if (tokens.length !== 1) return { ok: false, help: NR_HELP };
  return { ok: true, module: tokens[0] };
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

export function materializePrompt(project: number, moduleName: string): string {
  return JSON.stringify({ project, module: moduleName, scope: {} });
}

export function defsPrompt(project: number, moduleName: string): string {
  return JSON.stringify({ project, module: moduleName, scope: NR_DEFS_SCOPE });
}

export type NrListedFile = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'> & {
  status?: string;
};

function listedPath(file: NrListedFile): string {
  return displayPath({
    project: Number(file.project || 0),
    level: Number(file.level || 0),
    folder: String(file.folder || ''),
    shortName: String(file.shortName || ''),
    extension: String(file.extension || ''),
  });
}

function isLiveListed(file: NrListedFile): boolean {
  return file.status !== 'deleted' && Number(file.level) === 2 && Number(file.project) === currentProjectNumber();
}

/**
 * Generated files of one page that are in the current project index.
 * Shared `.ts`, shared `Dts.txt`, and `<pageId>.ts` under each device/genome folder that exists.
 * A `.defs.ts` is never included.
 */
export function generatedFilesOf<T extends NrListedFile>(moduleName: string, pageId: string, existing: readonly T[]): T[] {
  const web = `${moduleFolder(moduleName)}/web`;
  const slots = new Set<string>();
  for (const file of existing) {
    if (!isLiveListed(file)) continue;
    const rest = String(file.folder || '').slice(web.length + 1);
    if (!String(file.folder || '').startsWith(`${web}/`)) continue;
    const parts = rest.split('/');
    if (parts.length !== 2 || parts[0] === 'shared' || parts[0] === 'contracts') continue;
    slots.add(`${parts[0]}/${parts[1]}`);
  }
  const wanted = new Set<string>([
    `l2/${web}/shared/${pageId}.ts`,
    `l2/${web}/shared/${pageId}Dts.txt`,
  ]);
  for (const slot of [...slots].sort()) wanted.add(`l2/${web}/${slot}/${pageId}.ts`);
  const found: T[] = [];
  const seen = new Set<string>();
  for (const file of existing) {
    if (!isLiveListed(file) || file.extension === '.defs.ts') continue;
    const path = listedPath(file);
    if (!wanted.has(path) || seen.has(path)) continue;
    seen.add(path);
    found.push(file);
  }
  return [...found].sort((left, right) => listedPath(left).localeCompare(listedPath(right)));
}

/** Deletes the generated files of the effort pages. The first failure stops and names that path. */
export async function deleteGeneratedFiles<T extends NrListedFile>(
  moduleName: string,
  pageIds: readonly string[],
  existing: readonly T[],
  remove: (file: T) => Promise<void>,
): Promise<{ ok: true; paths: string[] } | { ok: false; message: string }> {
  const paths: string[] = [];
  for (const pageId of pageIds) {
    for (const file of generatedFilesOf(moduleName, pageId, existing)) {
      const path = listedPath(file);
      try {
        await remove(file);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { ok: false, message: `failed to delete ${path}: ${detail}` };
      }
      paths.push(path);
    }
  }
  return { ok: true, paths };
}

/** Pages whose generated files are deleted before the whole module is materialized. */
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

export type NrRunPhase = 'effort-read' | 'plan' | 'marks' | 'snapshot' | 'steps';

export interface NrRunPhaseLine {
  phase: NrRunPhase;
  status: 'ok' | 'refused' | 'failed';
  note: string;
}

/** `l2/<module>/pipeline/agentNewReleaseL2/run.json` — each write is one host trace line. */
export function runInfo(moduleName: string): Ns5FileInfo {
  return { ...snapshotInfo(moduleName), shortName: 'run' };
}

export async function recordPhase(moduleName: string, phase: NrRunPhase, status: NrRunPhaseLine['status'], note: string): Promise<void> {
  const info = runInfo(moduleName);
  const line: NrRunPhaseLine = { phase, status, note };
  if (phase === 'effort-read') {
    await writeJson(info, { phases: [line] });
    return;
  }
  const current = await readJson<{ phases?: NrRunPhaseLine[] }>(info);
  const phases = Array.isArray(current?.phases) ? [...current.phases] : [];
  phases.push(line);
  await writeJson(info, { phases });
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

/** Materializer for the whole module, then this agent's close step. The close step waits on the materializer plan id. */
export function buildApplySteps(
  project: number,
  moduleName: string,
  deleted: readonly string[] = [],
): mls.msg.AIAgentStep[] {
  return [
    {
      ...agentStep(
        NR_MATERIALIZE_AGENT,
        NR_MATERIALIZE_PLAN,
        [],
        'Materialize module',
        materializePrompt(project, moduleName),
      ),
      onFailure: 'continue',
    },
    agentStep(
      NR_AGENT_NAME,
      NR_CLOSE_PLAN,
      [NR_MATERIALIZE_PLAN],
      'Close release',
      JSON.stringify({ planId: NR_CLOSE_PLAN, deleted }),
    ),
  ];
}

export function deletedPaths(prompt: string): string[] {
  const parsed = JSON.parse(prompt || '{}') as { deleted?: unknown };
  if (!Array.isArray(parsed.deleted)) return [];
  return parsed.deleted.filter((item): item is string => typeof item === 'string');
}

/** Close text: the materializer message plus every generated file this release deleted. */
export function closeNotice(materializerMessage: string, deleted: readonly string[]): string {
  const listed = deleted.length ? deleted.join(', ') : 'none';
  return `${materializerMessage}; deleted: ${listed}`;
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
