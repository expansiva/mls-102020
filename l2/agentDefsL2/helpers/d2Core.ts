/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Core.ts" enhancement="_blank"/>

// Full flow is entry10 through finalize80 (d2_73: bff55 designs each page's BFF before shared60). /pages stops after page11. Legacy contracts30 imports the identity helpers.

import { readJson, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export const D2_AGENT_NAME = 'agentDefsL2' as const;
export const D2_ENTRY_AGENT_NAME = 'agentD2Entry' as const;
export const D2_INPUT_AGENT_NAME = 'agentD2Input' as const;
export const D2_CONTRACTS_AGENT_NAME = 'agentD2Contracts' as const;
export const D2_BFF_AGENT_NAME = 'agentD2Bff' as const;
export const D2_BFF_PAGE_AGENT_NAME = 'agentD2BffPage' as const;
export const D2_SHARED_AGENT_NAME = 'agentD2Shared' as const;
export const D2_SHARED_PAGE_AGENT_NAME = 'agentD2SharedPage' as const;
export const D2_PAGES_AGENT_NAME = 'agentD2Pages' as const;
export const D2_PAGES_PAGE_AGENT_NAME = 'agentD2PagesPage' as const;
export const D2_FINALIZE_AGENT_NAME = 'agentD2Finalize' as const;
export const D2_CONTRACTS70_AGENT_NAME = 'agentD2Contracts70' as const;
export const D2_FLOW_ID = 'agentDefsL2' as const;
export const D2_FLOW_VERSION = '2026-10-04-agent-defs-l2-flow-v3' as const;
export const D2_PIPELINE_VERSION = '2026-09-30-agent-defs-l2-pipeline-v2' as const;

export const D2_FLOW_STEP_IDS = [
  'entry10',
  'input20',
  'pages50',
  'bff55',
  'shared60',
  'contracts70',
  'finalize80',
] as const;
export const D2_PAGES_FLOW_STEP_IDS = ['entry10', 'input20', 'pages50', 'finalize80'] as const;

export type D2StepId = typeof D2_FLOW_STEP_IDS[number];
export type D2Scope = 'all' | 'pages';
type D2RecordedStepId = D2StepId | 'contracts30' | 'shared40';

export const D2_STEP_DEPENDS_ON: Record<Exclude<D2StepId, 'finalize80'>, readonly string[]> = {
  entry10: [],
  input20: ['entry10-done'],
  pages50: ['input20-done'],
  bff55: ['pages50-done'],
  shared60: ['bff55-done'],
  contracts70: ['shared60-done'],
};

export const D2_STEP_TITLES: Record<D2StepId, string> = {
  entry10: 'Start L2 definitions',
  input20: 'Validate inputs',
  pages50: 'Describe desktop and mobile pages',
  bff55: 'Design page endpoints',
  shared60: 'Define shared behavior',
  contracts70: 'Render page contracts',
  finalize80: 'Validate definitions',
};

export function d2PagesNextStep(scope: D2Scope): 'bff55' | 'finalize80' {
  return scope === 'all' ? 'bff55' : 'finalize80';
}

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
  status: 'inProgress' | 'awaitingStep' | 'failed' | 'complete';
  awaitingStep?: D2RecordedStepId;
  steps: Partial<Record<D2RecordedStepId, D2PipelineStepState>>;
  createdAt: string;
  updatedAt: string;
}

export type D2MessageInvocation =
  | { kind: 'help' }
  | ({ kind: 'run'; scope: D2Scope } & D2RunIdentity)
  | { kind: 'refusal'; diagnostic: string };

export type D2StepInvocation =
  | ({ kind: 'run'; scope: D2Scope } & D2RunIdentity)
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
  const flag = tokens.find(token => token.startsWith('/') && token.toLowerCase() !== '/pages');
  if (flag) return { kind: 'refusal', diagnostic: `Unknown flag: ${flag}.` };
  const pages = tokens.some(token => token.toLowerCase() === '/pages');
  if (pages && (tokens.length !== 2 || tokens[1].toLowerCase() !== '/pages')) {
    return { kind: 'refusal', diagnostic: 'Usage: @@agentDefsL2 <lowerCamel> [/pages].' };
  }
  if (!pages && tokens.length !== 1) {
    return { kind: 'refusal', diagnostic: 'Usage: @@agentDefsL2 <lowerCamel> [/pages].' };
  }
  if (!Number.isSafeInteger(project) || project <= 0) {
    return { kind: 'refusal', diagnostic: 'The current project is unavailable.' };
  }
  const module = tokens[0] || '';
  if (!moduleTokenOk(module)) {
    return { kind: 'refusal', diagnostic: 'Module name must be lowerCamel and must not contain a path.' };
  }
  return { kind: 'run', project, module, scope: pages ? 'pages' : 'all' };
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
  const allowed = new Set(['project', 'module', 'scope']);
  const unknown = Object.keys(raw).find(key => !allowed.has(key));
  if (unknown) return { kind: 'refusal', diagnostic: `Unknown step arg: ${unknown}.` };
  const project = typeof raw.project === 'number' ? raw.project : Number.NaN;
  const module = typeof raw.module === 'string' ? raw.module.trim() : '';
  if (raw.scope !== 'all' && raw.scope !== 'pages') return { kind: 'refusal', diagnostic: 'Step scope must be all or pages.' };
  if (!Number.isSafeInteger(project) || project <= 0) {
    return { kind: 'refusal', diagnostic: 'agentDefsL2 step args require a positive integer project.' };
  }
  if (project !== currentProject) {
    return { kind: 'refusal', diagnostic: `Step project ${project} does not match the current project ${currentProject}.` };
  }
  if (!moduleTokenOk(module)) {
    return { kind: 'refusal', diagnostic: 'Step module must be lowerCamel and must not contain a path.' };
  }
  return { kind: 'run', project, module, scope: raw.scope };
}

export function isD2StepId(value: string): value is D2StepId {
  return (D2_FLOW_STEP_IDS as readonly string[]).includes(value);
}

export function d2StepIdOf(step: mls.msg.AIAgentStep): D2StepId | '' {
  const planId = String(step.planning?.planId || '');
  return isD2StepId(planId) ? planId : '';
}

export function createD2AgentStep(stepId: D2StepId, identity: D2RunIdentity & { scope: D2Scope }): mls.msg.AIAgentStep {
  const dependsOn = stepId === 'finalize80'
    ? [identity.scope === 'pages' ? 'pages50-done' : 'contracts70-done']
    : [...D2_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: D2_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: stepId === 'entry10' ? D2_ENTRY_AGENT_NAME
      : stepId === 'input20' ? D2_INPUT_AGENT_NAME
      : stepId === 'pages50' ? D2_PAGES_AGENT_NAME
      : stepId === 'bff55' ? D2_BFF_AGENT_NAME
      : stepId === 'shared60' ? D2_SHARED_AGENT_NAME
      : stepId === 'contracts70' ? D2_CONTRACTS70_AGENT_NAME
      : stepId === 'finalize80' ? D2_FINALIZE_AGENT_NAME
      : D2_AGENT_NAME,
    prompt: JSON.stringify({ project: identity.project, module: identity.module, scope: identity.scope }),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function buildD2PlannedSteps(identity: D2RunIdentity & { scope: D2Scope }): mls.msg.AIAgentStep[] {
  const ids = identity.scope === 'pages' ? D2_PAGES_FLOW_STEP_IDS : D2_FLOW_STEP_IDS;
  return ids.map(stepId => createD2AgentStep(stepId, identity));
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
      const replacement = createD2Pipeline(identity, now);
      await writeJson(d2PipelineFile(identity), replacement);
      return replacement;
    }
    return existing;
  }
  const pipeline = createD2Pipeline(identity, now);
  await writeJson(d2PipelineFile(identity), pipeline);
  return pipeline;
}

export async function markD2Unavailable(identity: D2RunIdentity, stepId: D2StepId, diagnostic: string): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline || pipeline.status === 'complete' || pipeline.steps[stepId]?.status === 'approved') return;
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
  stepId: D2RecordedStepId,
  artifactPaths: string[],
  snapshotHash?: string,
): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline) throw new Error('agentDefsL2 pipeline is missing; entry10 must run first.');
  const prior = pipeline.steps[stepId];
  if (prior?.status === 'approved' && prior.snapshotHash === snapshotHash
    && JSON.stringify(prior.artifactPaths || []) === JSON.stringify(artifactPaths)) return;
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

export async function markD2StepFailed(identity: D2RunIdentity, stepId: D2RecordedStepId, diagnostic: string): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline || pipeline.status === 'complete' || pipeline.steps[stepId]?.status === 'approved') return;
  const updatedAt = new Date().toISOString();
  await writeJson(d2PipelineFile(identity), {
    ...pipeline,
    status: 'failed',
    awaitingStep: stepId,
    steps: { ...pipeline.steps, [stepId]: { status: 'failed', diagnostic, updatedAt } },
    updatedAt,
  } satisfies D2PipelineState);
}

export async function markD2Complete(identity: D2RunIdentity, artifactPaths: string[], snapshotHash: string): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline) throw new Error('agentDefsL2 pipeline is missing; entry10 must run first.');
  const prior = pipeline.steps.finalize80;
  if (pipeline.status === 'complete' && prior?.status === 'approved' && prior.snapshotHash === snapshotHash
    && JSON.stringify(prior.artifactPaths || []) === JSON.stringify(artifactPaths)) return;
  const updatedAt = new Date().toISOString();
  await writeJson(d2PipelineFile(identity), {
    ...pipeline,
    status: 'complete',
    awaitingStep: undefined,
    steps: { ...pipeline.steps, finalize80: { status: 'approved', updatedAt, artifactPaths, snapshotHash } },
    updatedAt,
  } satisfies D2PipelineState);
}

/** finalize80 is the single owner allowed to revoke complete after a fresh disk-integrity check. */
export async function markD2FinalizeBlocked(identity: D2RunIdentity, diagnostic: string, snapshotHash?: string): Promise<void> {
  const pipeline = await readD2Pipeline(identity);
  if (!pipeline) return;
  if (pipeline.status === 'complete' && (!snapshotHash || pipeline.steps.finalize80?.snapshotHash !== snapshotHash)) return;
  const updatedAt = new Date().toISOString();
  await writeJson(d2PipelineFile(identity), {
    ...pipeline,
    status: 'failed',
    awaitingStep: 'finalize80',
    steps: { ...pipeline.steps, finalize80: { status: 'failed', diagnostic, updatedAt, ...(snapshotHash ? { snapshotHash } : {}) } },
    updatedAt,
  } satisfies D2PipelineState);
}

export const D2_HELP = [
  'Usage: @@agentDefsL2 <lowerCamel> [/pages]',
  'The module is explicit and the project comes from the current context.',
  'Without a flag the flow is entry10, input20, pages50, bff55, shared60, contracts70 and finalize80.',
  '/pages stops at page11: entry10, input20, pages50 and finalize80.',
].join('\n');
