/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Core.ts" enhancement="_blank"/>

import { readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export const D2_AGENT_NAME = 'agentDefsL2' as const;
export const D2_ENTRY_AGENT_NAME = 'agentD2Entry' as const;
export const D2_INPUT_AGENT_NAME = 'agentD2Input' as const;
export const D2_FLOW_ID = 'agentDefsL2' as const;
export const D2_FLOW_VERSION = '2026-09-21-agent-defs-l2-flow-v2' as const;
export const D2_PIPELINE_VERSION = '2026-09-21-agent-defs-l2-pipeline-v1' as const;

export const D2_FLOW_STEP_IDS = [
  'entry10',
  'input20',
  'contracts30',
  'shared40',
  'pages50',
  'finalize60',
] as const;

export type D2StepId = typeof D2_FLOW_STEP_IDS[number];

export const D2_STEP_DEPENDS_ON: Record<D2StepId, readonly string[]> = {
  entry10: [],
  input20: ['entry10-done'],
  contracts30: ['input20-done'],
  shared40: ['contracts30-done'],
  pages50: ['shared40-done'],
  finalize60: ['pages50-done'],
};

export const D2_STEP_TITLES: Record<D2StepId, string> = {
  entry10: 'Start L2 definitions',
  input20: 'Validate inputs',
  contracts30: 'Create typed contracts',
  shared40: 'Define shared behavior',
  pages50: 'Describe desktop and mobile pages',
  finalize60: 'Validate definitions',
};

export interface D2RunIdentity {
  project: number;
  module: string;
}

export interface D2PipelineStepState {
  status: 'approved' | 'unavailable' | 'failed';
  updatedAt: string;
  diagnostic?: string;
  artifactPaths?: string[];
  snapshotHash?: string;
}

export interface D2PipelineState {
  schemaVersion: typeof D2_PIPELINE_VERSION;
  flowId: typeof D2_FLOW_ID;
  project: number;
  module: string;
  status: 'inProgress' | 'awaitingStep' | 'failed';
  awaitingStep?: D2StepId;
  steps: Partial<Record<D2StepId, D2PipelineStepState>>;
  createdAt: string;
  updatedAt: string;
}

export type D2MessageInvocation =
  | { kind: 'help' }
  | ({ kind: 'run' } & D2RunIdentity)
  | { kind: 'refusal'; diagnostic: string };

export type D2StepInvocation =
  | ({ kind: 'run' } & D2RunIdentity)
  | { kind: 'refusal'; diagnostic: string };

const AGENT_PREFIXES = [
  /@@\s*_102020_\/l2\/agentDefsL2/gi,
  /@@\s*_102020_agentDefsL2/gi,
  /@@\s*agentDefsL2/gi,
];

export function currentD2Project(): number {
  return Number(mls.actualProject || 0);
}

export function moduleTokenOk(value: string): boolean {
  return /^[a-z][A-Za-z0-9]{0,59}$/.test(value) && !value.includes('..');
}

export function parseD2MessageInvocation(value: string, project = currentD2Project()): D2MessageInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, ' ');
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && tokens[0].toLowerCase() === '/help') return { kind: 'help' };
  if (tokens.some(token => token.toLowerCase() === '/candidate')) {
    return { kind: 'refusal', diagnostic: '/candidate is not supported by agentDefsL2.' };
  }
  const flag = tokens.find(token => token.startsWith('/'));
  if (flag) return { kind: 'refusal', diagnostic: `Unknown flag: ${flag}.` };
  if (tokens.length !== 1) {
    return { kind: 'refusal', diagnostic: 'Pass exactly one explicit module: @@agentDefsL2 <lowerCamel>.' };
  }
  if (!Number.isSafeInteger(project) || project <= 0) {
    return { kind: 'refusal', diagnostic: 'The current project is unavailable.' };
  }
  const module = tokens[0] || '';
  if (!moduleTokenOk(module)) {
    return { kind: 'refusal', diagnostic: 'Module name must be lowerCamel and must not contain a path.' };
  }
  return { kind: 'run', project, module };
}

export function parseD2StepInvocation(value: string, currentProject = currentD2Project()): D2StepInvocation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value || '{}'));
  } catch {
    return { kind: 'refusal', diagnostic: 'agentDefsL2 step args must be JSON.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'refusal', diagnostic: 'agentDefsL2 step args must be an object.' };
  }
  const raw = parsed as Record<string, unknown>;
  const allowed = new Set(['project', 'module']);
  const unknown = Object.keys(raw).find(key => !allowed.has(key));
  if (unknown) return { kind: 'refusal', diagnostic: `Unknown step arg: ${unknown}.` };
  const project = typeof raw.project === 'number' ? raw.project : Number.NaN;
  const module = typeof raw.module === 'string' ? raw.module.trim() : '';
  if (!Number.isSafeInteger(project) || project <= 0) {
    return { kind: 'refusal', diagnostic: 'agentDefsL2 step args require a positive integer project.' };
  }
  if (project !== currentProject) {
    return { kind: 'refusal', diagnostic: `Step project ${project} does not match the current project ${currentProject}.` };
  }
  if (!moduleTokenOk(module)) {
    return { kind: 'refusal', diagnostic: 'Step module must be lowerCamel and must not contain a path.' };
  }
  return { kind: 'run', project, module };
}

export function isD2StepId(value: string): value is D2StepId {
  return (D2_FLOW_STEP_IDS as readonly string[]).includes(value);
}

export function d2StepIdOf(step: mls.msg.AIAgentStep): D2StepId | '' {
  const planId = String(step.planning?.planId || '');
  return isD2StepId(planId) ? planId : '';
}

export function createD2AgentStep(stepId: D2StepId, identity: D2RunIdentity): mls.msg.AIAgentStep {
  const dependsOn = [...D2_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: D2_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: stepId === 'entry10' ? D2_ENTRY_AGENT_NAME : stepId === 'input20' ? D2_INPUT_AGENT_NAME : D2_AGENT_NAME,
    prompt: JSON.stringify(identity),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildD2PlannedSteps(identity: D2RunIdentity): mls.msg.AIAgentStep[] {
  return D2_FLOW_STEP_IDS.map(stepId => createD2AgentStep(stepId, identity));
}

export function d2PipelineFile(identity: D2RunIdentity): Ns5FileInfo {
  return {
    project: identity.project,
    level: 2,
    folder: `${identity.module}/pipeline/agentDefsL2`,
    shortName: 'pipeline',
    extension: '.json',
  };
}

export async function readD2Pipeline(identity: D2RunIdentity): Promise<D2PipelineState | null> {
  return readJson<D2PipelineState>(d2PipelineFile(identity));
}

export function createD2Pipeline(identity: D2RunIdentity, now: Date): D2PipelineState {
  const updatedAt = now.toISOString();
  return {
    schemaVersion: D2_PIPELINE_VERSION,
    flowId: D2_FLOW_ID,
    project: identity.project,
    module: identity.module,
    status: 'inProgress',
    steps: { entry10: { status: 'approved', updatedAt } },
    createdAt: updatedAt,
    updatedAt,
  };
}

export async function initializeD2Pipeline(identity: D2RunIdentity, now = new Date()): Promise<D2PipelineState> {
  const existing = await readD2Pipeline(identity);
  if (existing) {
    if (existing.schemaVersion !== D2_PIPELINE_VERSION || existing.flowId !== D2_FLOW_ID || existing.project !== identity.project || existing.module !== identity.module) {
      throw new Error('Existing agentDefsL2 pipeline has a different identity. Nothing was overwritten.');
    }
    return existing;
  }
  const pipeline = createD2Pipeline(identity, now);
  await writeJson(d2PipelineFile(identity), pipeline);
  return pipeline;
}

export async function markD2Unavailable(identity: D2RunIdentity, stepId: D2StepId, diagnostic: string): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline) return;
  const updatedAt = new Date().toISOString();
  await writeJson(d2PipelineFile(identity), {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: stepId,
    steps: { ...pipeline.steps, [stepId]: { status: 'unavailable', diagnostic, updatedAt } },
    updatedAt,
  } satisfies D2PipelineState);
}

export async function markD2StepApproved(
  identity: D2RunIdentity,
  stepId: D2StepId,
  artifactPaths: string[],
  snapshotHash?: string,
): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline) throw new Error('agentDefsL2 pipeline is missing; entry10 must run first.');
  const updatedAt = new Date().toISOString();
  await writeJson(d2PipelineFile(identity), {
    ...pipeline,
    status: 'inProgress',
    awaitingStep: undefined,
    steps: {
      ...pipeline.steps,
      [stepId]: { status: 'approved', updatedAt, artifactPaths, ...(snapshotHash ? { snapshotHash } : {}) },
    },
    updatedAt,
  } satisfies D2PipelineState);
}

export async function markD2StepFailed(identity: D2RunIdentity, stepId: D2StepId, diagnostic: string): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline) return;
  const updatedAt = new Date().toISOString();
  await writeJson(d2PipelineFile(identity), {
    ...pipeline,
    status: 'failed',
    awaitingStep: stepId,
    steps: { ...pipeline.steps, [stepId]: { status: 'failed', diagnostic, updatedAt } },
    updatedAt,
  } satisfies D2PipelineState);
}

export const D2_HELP = [
  'Usage: @@agentDefsL2 <lowerCamel>',
  'The module is explicit and the project comes from the current context.',
  'Available now: entry10 and input20. contracts30 and later phases are declared but unavailable.',
].join('\n');
