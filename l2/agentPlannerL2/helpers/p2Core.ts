/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Core.ts" enhancement="_blank"/>

import {
  diskFileInfo,
  displayPath,
  hostListFolder,
  moduleFile,
  normalizeModuleName,
  readJson,
  readPipeline,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import { listPoolBox, readPoolMessage, type PoolMessage, type PoolTraceLine } from '/_102035_/l2/solution/pool.js';
import type { Ns5PipelineStatus, Ns5PipelineStepState } from '/_102035_/l2/solution/types.js';

export const P2_FLOW_ID = 'agentPlannerL2' as const;
export const P2_FLOW_VERSION = '2026-09-18-p2-flow-v4' as const;
export const P2_AGENT_NAME = 'agentPlannerL2' as const;
export const P2_PIPELINE_SCHEMA_VERSION = '2026-09-18-p2-pipeline-v2' as const;

/** Steps the current flow.json actually runs. */
export const P2_FLOW_STEP_IDS = ['entry10', 'menu20'] as const;

/** Parked: code stays, flow.json v4 does not list them. */
export const P2_PARKED_STEP_IDS = [
  'workspaces20',
  'contracts30',
  'shared40',
  'requests50',
] as const;

export const P2_STEP_IDS = [...P2_FLOW_STEP_IDS, ...P2_PARKED_STEP_IDS] as const;

export type P2FlowStepId = typeof P2_FLOW_STEP_IDS[number];
export type P2StepId = typeof P2_STEP_IDS[number];

/** Last step of `docs/flow.json` — that step's afterPrompt closes the pipeline. */
export const P2_FLOW_LAST_STEP_ID: P2FlowStepId = P2_FLOW_STEP_IDS[P2_FLOW_STEP_IDS.length - 1];

/** Host unlinked every file under `l2/<mod>/web/` and removed the empty directory. */
export const P2_WEB_DIR_REMOVED = 'removed' as const;
/**
 * Files under `web/` were unlinked; the empty directory stays. `deleteFile` (libStor and
 * host `localStor.deleteFile`) unlinks a file path (`shortName+extension`). Studio has no
 * `deleteFile`. `fs.ts` / `removeModule.ts` also only delete files. No `removeDir` on the host.
 */
export const P2_WEB_DIR_EMPTY_LEFT = 'empty-left: deleteFile does not remove directories' as const;
export type P2WebDir = typeof P2_WEB_DIR_REMOVED | typeof P2_WEB_DIR_EMPTY_LEFT;

export const P2_STEP_TITLES: Record<P2StepId, string> = {
  entry10: 'Entry',
  menu20: 'Menu',
  workspaces20: 'Workspaces',
  contracts30: 'Contracts',
  shared40: 'Shared',
  requests50: 'Requests',
};

export const P2_STEP_DEPENDS_ON: Record<P2StepId, readonly string[]> = {
  entry10: [],
  menu20: ['entry10-done'],
  workspaces20: ['entry10-done'],
  contracts30: ['workspaces20-done'],
  shared40: ['contracts30-done'],
  requests50: ['shared40-done'],
};

/** Pool message file: `<stamp>_<thread>_<round>`. `menu.json` does not match. */
const POOL_MESSAGE_SHORT = /^\d{14}_[A-Za-z0-9]+-\d{14}_[123]$/;

export interface P2ParsedInvocation {
  module: string;
}

export type P2EntrySource =
  | { kind: 'hand'; moduleName: string }
  | { kind: 'step'; moduleName: string; thread: string; file: string };

export interface P2PipelineState {
  schemaVersion: typeof P2_PIPELINE_SCHEMA_VERSION;
  flowId: typeof P2_FLOW_ID;
  moduleName: string;
  status: Ns5PipelineStatus;
  awaitingStep?: P2StepId;
  steps: Partial<Record<P2StepId, Ns5PipelineStepState>>;
  thread: string;
  round: number;
  messageFile: string;
  sourceMessages: string[];
  pool?: PoolTraceLine[];
  /** Wipe result of `l2/<mod>/web/`. Always written by entry10 — never a silent leftover. */
  webDir: P2WebDir;
  updatedAt: string;
}

export interface P2LoadedEntry {
  moduleName: string;
  file: Ns5FileInfo;
  message: PoolMessage;
  sourceMessages: string[];
}

export type P2LoadResult = P2LoadedEntry | { refusal: string };
export type P2ExecuteResult = { pipeline: P2PipelineState; file: Ns5FileInfo; message: PoolMessage } | { refusal: string };

const AGENT_PREFIXES = [
  /@@\s*_102020_\/l2\/agentPlannerL2/gi,
  /@@\s*_102020_agentPlannerL2/gi,
  /@@\s*agentPlannerL2/gi,
];

export function isP2StepId(value: string): value is P2StepId {
  return (P2_STEP_IDS as readonly string[]).includes(value);
}

export function moduleTokenOk(moduleName: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(moduleName);
}

/**
 * Maps child planIds back to the owning step. Done-anchors stay unmatched so they
 * are not dispatched. A step prompt `{ moduleName, thread, file }` (L4 dispatch)
 * is entry10.
 */
export function ownerStepId(planId: string, prompt?: string): P2StepId | '' {
  if (isP2StepId(planId)) return planId;
  for (const id of P2_STEP_IDS) {
    if (planId === `${id}-done` || planId.startsWith(`${id}-clarification`)) return '';
    if (planId.startsWith(`${id}-`)) return id;
  }
  if (isL4EntryPrompt(prompt)) return 'entry10';
  return '';
}

export function isL4EntryPrompt(prompt?: string): boolean {
  const parsed = parseP2StepPrompt(prompt || '');
  return parsed.kind === 'step';
}

export function parseP2Invocation(value: string): P2ParsedInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, ' ');
  const tokens = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  return { module: tokens[0] || '' };
}

export function p2InvocationRefusal(invocation: P2ParsedInvocation): string {
  if (!invocation.module) return 'Pass @@agentPlannerL2 <lowerCamel>.';
  if (!moduleTokenOk(invocation.module)) return 'Module name must be lowerCamel (example: stockControl).';
  return '';
}

export type P2StepPrompt =
  | { kind: 'step'; moduleName: string; thread: string; file: string }
  | { kind: 'entry'; moduleName: string }
  | { kind: 'refusal'; refusal: string };

export function parseP2StepPrompt(prompt: string): P2StepPrompt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(prompt || '{}'));
  } catch {
    return { kind: 'refusal', refusal: 'step prompt must be JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'refusal', refusal: 'step prompt must be a JSON object.' };
  }
  const raw = parsed as Record<string, unknown>;
  const moduleName = typeof raw.moduleName === 'string' ? raw.moduleName.trim() : '';
  const thread = typeof raw.thread === 'string' ? raw.thread.trim() : '';
  const file = typeof raw.file === 'string' ? raw.file.trim() : '';
  if (moduleName && thread && file) return { kind: 'step', moduleName, thread, file };
  if (moduleName) return { kind: 'entry', moduleName };
  return { kind: 'refusal', refusal: 'step prompt needs moduleName.' };
}

/** `l2/<module>/pipeline/pipeline.json` in the project of the run. */
export function p2PipelineFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 2,
    folder: `${base.folder}/pipeline`,
    shortName: 'pipeline',
    extension: '.json',
  };
}

export function createP2Pipeline(
  moduleName: string,
  message: PoolMessage,
  messageFile: string,
  now: Date,
  sourceMessages: string[],
  webDir: P2WebDir,
): P2PipelineState {
  const updatedAt = now.toISOString();
  return {
    schemaVersion: P2_PIPELINE_SCHEMA_VERSION,
    flowId: P2_FLOW_ID,
    moduleName,
    status: 'inProgress',
    steps: {
      entry10: {
        status: 'approved',
        updatedAt,
        artifactPaths: [`l2/${moduleName}/pipeline/pipeline.json`],
      },
    },
    thread: message.thread,
    round: message.round,
    messageFile,
    sourceMessages,
    webDir,
    updatedAt,
  };
}

export function createP2AgentStep(
  stepId: P2StepId,
  moduleName: string,
  entry: { thread: string; file: string },
): mls.msg.AIAgentStep {
  const dependsOn = [...P2_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: P2_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: P2_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName, thread: entry.thread, file: entry.file }),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildP2PlannedSteps(
  moduleName: string,
  entry: { thread: string; file: string },
): mls.msg.AIAgentStep[] {
  return P2_FLOW_STEP_IDS.map(stepId => createP2AgentStep(stepId, moduleName, entry));
}

export function isP2PoolMessageFile(shortName: string): boolean {
  return POOL_MESSAGE_SHORT.test(shortName);
}

function poolMessageFileName(file: Ns5FileInfo): string {
  return `${file.shortName}${file.extension}`;
}

function requestKey(moduleName: string, message: PoolMessage): string {
  const threadModule = message.thread.replace(/-\d{14}$/, '') || moduleName;
  const artifacts = [...message.artifacts].map(item => item.trim()).filter(Boolean).sort().join('\0');
  return `${threadModule}\0${message.mode}\0${artifacts}`;
}

export function p2DifferentRequestsRefusal(count: number): string {
  return `pool/l2 has ${count} different requests; resolve with the l4 supervisor`;
}

/** `l4/<module>/pool/l2/menu.json` — temporary; overwritten each run. Not a pool message. */
export function p2MenuFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2`,
    shortName: 'menu',
    extension: '.json',
  };
}

function matchPoolFile(file: Ns5FileInfo, wanted: string): boolean {
  const path = displayPath(file);
  return path === wanted || file.shortName === wanted || `${file.shortName}${file.extension}` === wanted;
}

export async function loadP2Entry(source: P2EntrySource): Promise<P2LoadResult> {
  const moduleName = normalizeModuleName(source.moduleName, '');
  if (!moduleName || !moduleTokenOk(moduleName)) {
    return { refusal: 'Module name must be lowerCamel (example: stockControl).' };
  }

  const l4 = await readPipeline(moduleName);
  if (!l4 || l4.status !== 'complete') {
    return { refusal: `Module "${moduleName}" has no complete l4.` };
  }

  const box = listPoolBox(moduleName, 'l2').filter(file => isP2PoolMessageFile(file.shortName));
  if (!box.length) return { refusal: `nothing pending for ${moduleName} in pool/l2` };

  const loaded: Array<{ file: Ns5FileInfo; message: PoolMessage }> = [];
  for (const file of box) {
    loaded.push({ file, message: await readPoolMessage(file) });
  }

  const groups = new Map<string, typeof loaded>();
  for (const entry of loaded) {
    const key = requestKey(moduleName, entry.message);
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  if (groups.size > 1) return { refusal: p2DifferentRequestsRefusal(groups.size) };

  const group = loaded;
  const oldest = group[0];
  const sourceMessages = group.map(entry => poolMessageFileName(entry.file));

  if (source.kind === 'step') {
    const specified = group.find(entry => matchPoolFile(entry.file, source.file));
    if (!specified) return { refusal: `pool/l2 message not found: ${source.file}` };
    if (specified.message.thread !== source.thread) {
      return { refusal: `message thread does not match '${source.thread}'.` };
    }
  }

  return {
    moduleName,
    file: oldest.file,
    message: oldest.message,
    sourceMessages,
  };
}

export async function writeP2Entry(loaded: P2LoadedEntry, now: Date): Promise<P2PipelineState> {
  const webDir = await clearP2Scratch(loaded.moduleName);
  const messageFile = displayPath(loaded.file);
  const pipeline = createP2Pipeline(
    loaded.moduleName,
    loaded.message,
    messageFile,
    now,
    loaded.sourceMessages,
    webDir,
  );
  await writeJson(p2PipelineFile(loaded.moduleName), pipeline);
  return pipeline;
}

function isP2ScratchFolder(folder: string, moduleName: string): boolean {
  return folder === `${moduleName}/pipeline`
    || folder === `${moduleName}/web`
    || folder.startsWith(`${moduleName}/web/`);
}

function listP2ScratchFiles(moduleName: string): Ns5FileInfo[] {
  const base = moduleFile(moduleName);
  const files = mls.stor.files as Record<string, mls.stor.IFileInfo | undefined>;
  const found = new Map<string, Ns5FileInfo>();
  const remember = (info: Ns5FileInfo) => {
    found.set(`${info.folder}/${info.shortName}${info.extension}`, info);
  };
  for (const file of Object.values(files)) {
    if (!file || file.project !== base.project || Number(file.level) !== 2 || file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (!isP2ScratchFolder(folder, moduleName) || !file.shortName) continue;
    remember({
      project: base.project,
      level: 2,
      folder,
      shortName: String(file.shortName),
      extension: String(file.extension || ''),
    });
  }
  const listFolder = hostListFolder();
  if (listFolder) {
    const folders = new Set<string>([`${moduleName}/pipeline`, `${moduleName}/web`, `${moduleName}/web/contracts`, `${moduleName}/web/shared`]);
    for (const info of found.values()) folders.add(info.folder);
    for (const folder of folders) {
      for (const info of listFolder(base.project, 2, folder)) {
        if (!info.shortName) continue;
        const key = mls.stor.getKeyToFile(info);
        const indexed = files[key];
        if (indexed?.status === 'deleted') continue;
        if (!indexed) files[key] = diskFileInfo(info);
        remember({
          project: base.project,
          level: 2,
          folder,
          shortName: String(info.shortName),
          extension: String(info.extension || ''),
        });
      }
    }
  }
  return [...found.values()];
}

async function clearP2Scratch(moduleName: string): Promise<P2WebDir> {
  const files = listP2ScratchFiles(moduleName);
  if (files.length) {
    const { deleteFile } = await import('/_102027_/l2/libStor.js');
    for (const file of files) {
      await deleteFile(diskFileInfo(file));
    }
  }
  return removeEmptyWebDir(moduleName);
}

/** Same probe pattern as `hostListFolder` in fs.ts. Host and Studio have no such method today. */
function hostRemoveDir(): ((project: number, level: number, folder: string) => unknown) | undefined {
  const fn = (mls.stor.localStor as { removeDir?: unknown } | undefined)?.removeDir;
  return typeof fn === 'function' ? fn as ((project: number, level: number, folder: string) => unknown) : undefined;
}

async function removeEmptyWebDir(moduleName: string): Promise<P2WebDir> {
  const removeDir = hostRemoveDir();
  if (!removeDir) return P2_WEB_DIR_EMPTY_LEFT;
  const base = moduleFile(moduleName);
  await Promise.resolve(removeDir(base.project, 2, `${moduleName}/web`));
  return P2_WEB_DIR_REMOVED;
}

export async function executeP2Entry(source: P2EntrySource, now: Date): Promise<P2ExecuteResult> {
  const loaded = await loadP2Entry(source);
  if ('refusal' in loaded) return loaded;
  const pipeline = await writeP2Entry(loaded, now);
  return { pipeline, file: loaded.file, message: loaded.message };
}

export async function readP2Pipeline(moduleName: string): Promise<P2PipelineState | null> {
  return readJson<P2PipelineState>(p2PipelineFile(moduleName));
}

/** `l2/<module>/pipeline/<stepId>-draft.json` in the project of the run. */
export function p2DraftFile(moduleName: string, stepId: P2StepId): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 2,
    folder: `${base.folder}/pipeline`,
    shortName: `${stepId}-draft`,
    extension: '.json',
  };
}

/** Files of this agent (prompt.md, skills, schemas) live in 102020, not in the run module. */
export function p2AgentFile(folder: string, shortName: string, extension: string): Ns5FileInfo {
  return {
    project: 102020,
    level: 2,
    folder: folder ? `agentPlannerL2/${folder}` : 'agentPlannerL2',
    shortName,
    extension,
  };
}

export async function readP2AgentText(folder: string, shortName: string, extension: string): Promise<string> {
  const fileInfo = p2AgentFile(folder, shortName, extension);
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)] as {
    status?: string;
    getValueInfo?: () => Promise<{ content?: unknown }>;
    getContent: () => Promise<unknown>;
  } | undefined;
  if (!file || file.status === 'deleted') {
    throw new Error(`agentPlannerL2 file not found: ${displayPath(fileInfo)}`);
  }
  if (file.getValueInfo) {
    try {
      const local = await file.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch { /* fall through */ }
  }
  const content = await file.getContent();
  if (typeof content === 'string') return content;
  throw new Error(`agentPlannerL2 invalid text file: ${displayPath(fileInfo)}`);
}

/** `complete` = every step of `flow.json` is approved. A failed pipeline stays failed. */
export function markP2Complete(pipeline: P2PipelineState, now = new Date().toISOString()): P2PipelineState {
  if (pipeline.status === 'failed') return pipeline;
  for (const stepId of P2_FLOW_STEP_IDS) {
    if (pipeline.steps[stepId]?.status !== 'approved') return pipeline;
  }
  return {
    ...pipeline,
    status: 'complete',
    awaitingStep: undefined,
    updatedAt: now,
  };
}

export function markP2Step(
  pipeline: P2PipelineState,
  stepId: P2StepId,
  next: Ns5PipelineStepState,
): P2PipelineState {
  const current = pipeline.steps[stepId];
  if (current?.status === 'approved') {
    return { ...pipeline, updatedAt: next.updatedAt };
  }
  const failed = next.status === 'failed';
  const approved = next.status === 'approved';
  return {
    ...pipeline,
    steps: { ...pipeline.steps, [stepId]: next },
    updatedAt: next.updatedAt,
    ...(failed ? { status: 'failed' as const, awaitingStep: undefined } : {}),
    ...(approved && pipeline.awaitingStep === stepId
      ? { status: 'inProgress' as const, awaitingStep: undefined }
      : {}),
  };
}

export function createP2RetryStep(
  stepId: P2StepId,
  moduleName: string,
  kind: 'repair' | 'transport',
  attempt: number,
  extra: Record<string, unknown> = {},
): mls.msg.AIAgentStep {
  const planId = `${stepId}-${kind}-${attempt}`;
  const suffix = kind === 'repair' ? `R${attempt}` : `T${attempt}`;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: `${P2_STEP_TITLES[stepId]} · ${suffix}`,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: P2_AGENT_NAME,
    prompt: JSON.stringify({ planId: stepId, moduleName, [`${kind}Attempt`]: attempt, ...extra }),
    rags: [],
    planning: {
      planId,
      dependsOn: [],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}
