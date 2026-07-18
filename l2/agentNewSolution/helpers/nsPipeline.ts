/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsPipeline.ts" enhancement="_blank"/>

import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

export const NS_PIPELINE_SCHEMA_VERSION = '2026-07-05-ns-pipeline-v1';

export type NsStepStatus = 'pending' | 'running' | 'gate_failed' | 'approved';
export type NsApprovedBy = 'auto' | 'human';

export interface NsGateSnapshot {
  ok: boolean;
  checkedAt: string;
  errors: string[];
  warnings: string[];
}

export interface NsPipelineStepState {
  status: NsStepStatus;
  dirty?: boolean;
  inputsHash?: string;
  artifactVersion?: number;
  approvedAt?: string;
  approvedBy?: NsApprovedBy;
  lastGate?: NsGateSnapshot;
  updatedAt: string;
}

export interface NsPipelineState {
  schemaVersion: typeof NS_PIPELINE_SCHEMA_VERSION;
  flowId: 'agentNewSolution';
  moduleName: string;
  createdAt: string;
  updatedAt: string;
  steps: Record<string, NsPipelineStepState>;
}

export const NS_PHASE1_STEP_IDS = [
  'e1-draft',
  'checkpoint-draft',
  'e2-journeys',
  'checkpoint-journeys',
] as const;

// Full pipeline order (phase 1 + phase 2). Used for dirty propagation and
// next-step resolution across the whole pipeline. Phase-2 steps are ensured
// on demand (ensureNsStep) the first time they run.
export const NS_STEP_ORDER = [
  ...NS_PHASE1_STEP_IDS,
  'e3-ontology',
  'e4-actors-rules-refs',
  'e5-workflows-operations',
  'e6-journey-map',
  'e7-validation-summary',
] as const;

export function createNsPipeline(moduleNameInput: string, stepIds: readonly string[] = NS_PHASE1_STEP_IDS): NsPipelineState {
  const now = new Date().toISOString();
  const moduleName = normalizeModuleFolderName(moduleNameInput);
  const steps: Record<string, NsPipelineStepState> = {};
  for (const stepId of stepIds) {
    steps[stepId] = { status: 'pending', updatedAt: now };
  }
  return {
    schemaVersion: NS_PIPELINE_SCHEMA_VERSION,
    flowId: 'agentNewSolution',
    moduleName,
    createdAt: now,
    updatedAt: now,
    steps,
  };
}

export function ensureNsStep(state: NsPipelineState, stepId: string): NsPipelineStepState {
  const now = new Date().toISOString();
  if (!state.steps[stepId]) state.steps[stepId] = { status: 'pending', updatedAt: now };
  return state.steps[stepId];
}

export function markNsStepRunning(state: NsPipelineState, stepId: string, inputs?: unknown): NsPipelineState {
  const next = clonePipeline(state);
  const now = new Date().toISOString();
  const step = ensureNsStep(next, stepId);
  step.status = 'running';
  step.dirty = false;
  if (inputs !== undefined) step.inputsHash = computeInputsHash(inputs);
  step.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function recordNsGateResult(
  state: NsPipelineState,
  stepId: string,
  gate: { ok: boolean; errors: string[]; warnings: string[] },
  inputs?: unknown,
): NsPipelineState {
  const next = clonePipeline(state);
  const now = new Date().toISOString();
  const step = ensureNsStep(next, stepId);
  step.status = gate.ok ? (step.status === 'approved' ? 'approved' : 'pending') : 'gate_failed';
  step.dirty = false;
  if (inputs !== undefined) step.inputsHash = computeInputsHash(inputs);
  step.lastGate = { ok: gate.ok, checkedAt: now, errors: gate.errors, warnings: gate.warnings };
  step.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function approveNsStep(
  state: NsPipelineState,
  stepId: string,
  approvedBy: NsApprovedBy,
  artifactVersion?: number,
): NsPipelineState {
  const next = clonePipeline(state);
  const now = new Date().toISOString();
  const step = ensureNsStep(next, stepId);
  step.status = 'approved';
  step.dirty = false;
  step.approvedAt = now;
  step.approvedBy = approvedBy;
  if (artifactVersion !== undefined) step.artifactVersion = artifactVersion;
  step.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function markNsDownstreamDirty(
  state: NsPipelineState,
  fromStepId: string,
  order: readonly string[] = NS_STEP_ORDER,
): NsPipelineState {
  const next = clonePipeline(state);
  const start = order.indexOf(fromStepId);
  if (start < 0) return next;
  const now = new Date().toISOString();
  for (const stepId of order.slice(start + 1)) {
    const step = ensureNsStep(next, stepId);
    if (step.status === 'approved') {
      step.dirty = true;
      step.updatedAt = now;
    }
  }
  next.updatedAt = now;
  return next;
}

export function nextNsUnapprovedStep(state: NsPipelineState, order: readonly string[] = NS_STEP_ORDER): string | null {
  for (const stepId of order) {
    const step = state.steps[stepId];
    if (!step || step.status !== 'approved' || step.dirty) return stepId;
  }
  return null;
}

export function computeInputsHash(input: unknown): string {
  const text = stableStringify(input);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }
  return `djb2:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function readNsPipeline(moduleName: string): Promise<NsPipelineState | null> {
  const { nsPipelineFileInfo, readJsonArtifact } = await import('/_102020_/l2/agentNewSolution/helpers/nsFs.js');
  return readJsonArtifact<NsPipelineState>(nsPipelineFileInfo(moduleName), false);
}

export async function writeNsPipeline(state: NsPipelineState): Promise<string> {
  const { nsPipelineFileInfo, writeJsonArtifact } = await import('/_102020_/l2/agentNewSolution/helpers/nsFs.js');
  return writeJsonArtifact(nsPipelineFileInfo(state.moduleName), state);
}

function clonePipeline(state: NsPipelineState): NsPipelineState {
  return JSON.parse(JSON.stringify(state)) as NsPipelineState;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
