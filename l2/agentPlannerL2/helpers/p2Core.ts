/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Core.ts" enhancement="_blank"/>

import {
  displayPath,
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
export const P2_FLOW_VERSION = '2026-09-18-p2-flow-v3' as const;
export const P2_AGENT_NAME = 'agentPlannerL2' as const;
export const P2_PIPELINE_SCHEMA_VERSION = '2026-09-18-p2-pipeline-v1' as const;

export const P2_STEP_IDS = [
  'entry10',
  'workspaces20',
  'contracts30',
  'shared40',
  'requests50',
] as const;

export type P2StepId = typeof P2_STEP_IDS[number];

export const P2_STEP_TITLES: Record<P2StepId, string> = {
  entry10: 'Entry',
  workspaces20: 'Workspaces',
  contracts30: 'Contracts',
  shared40: 'Shared',
  requests50: 'Requests',
};

export const P2_STEP_DEPENDS_ON: Record<P2StepId, readonly string[]> = {
  entry10: [],
  workspaces20: ['entry10-done'],
  contracts30: ['workspaces20-done'],
  shared40: ['contracts30-done'],
  requests50: ['shared40-done'],
};

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
  pool?: PoolTraceLine[];
  updatedAt: string;
}

export interface P2LoadedEntry {
  moduleName: string;
  file: Ns5FileInfo;
  message: PoolMessage;
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
  return P2_STEP_IDS.map(stepId => createP2AgentStep(stepId, moduleName, entry));
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

  const box = listPoolBox(moduleName, 'l2');
  if (source.kind === 'hand') {
    if (!box.length) return { refusal: `nothing pending for ${moduleName} in pool/l2` };
    const file = box[0];
    return { moduleName, file, message: await readPoolMessage(file) };
  }

  if (!box.length) return { refusal: `nothing pending for ${moduleName} in pool/l2` };
  const file = box.find(entry => matchPoolFile(entry, source.file));
  if (!file) return { refusal: `pool/l2 message not found: ${source.file}` };
  const message = await readPoolMessage(file);
  if (message.thread !== source.thread) {
    return { refusal: `message thread does not match '${source.thread}'.` };
  }
  return { moduleName, file, message };
}

export async function writeP2Entry(loaded: P2LoadedEntry, now: Date): Promise<P2PipelineState> {
  const messageFile = displayPath(loaded.file);
  const pipeline = createP2Pipeline(loaded.moduleName, loaded.message, messageFile, now);
  await writeJson(p2PipelineFile(loaded.moduleName), pipeline);
  return pipeline;
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
