/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.ts" enhancement="_blank"/>

import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';

export const NS3_PIPELINE_SCHEMA_VERSION = '2026-07-05-ns3-pipeline-v1';

export type Ns3StepStatus = 'pending' | 'running' | 'gate_failed' | 'approved';
export type Ns3ApprovedBy = 'auto' | 'human';

export interface Ns3GateSnapshot {
  ok: boolean;
  checkedAt: string;
  errors: string[];
  warnings: string[];
}

export interface Ns3PipelineStepState {
  status: Ns3StepStatus;
  dirty?: boolean;
  inputsHash?: string;
  artifactVersion?: number;
  approvedAt?: string;
  approvedBy?: Ns3ApprovedBy;
  lastGate?: Ns3GateSnapshot;
  updatedAt: string;
}

export interface Ns3PipelineState {
  schemaVersion: typeof NS3_PIPELINE_SCHEMA_VERSION;
  flowId: 'agentNewSolution3';
  moduleName: string;
  createdAt: string;
  updatedAt: string;
  steps: Record<string, Ns3PipelineStepState>;
}

export const NS3_PHASE1_STEP_IDS = [
  'e1-draft',
  'checkpoint-draft',
  'e2-journeys',
  'checkpoint-journeys',
] as const;

// Full pipeline order (phase 1 + phase 2). Used for dirty propagation and
// next-step resolution across the whole pipeline. Phase-2 steps are ensured
// on demand (ensureNs3Step) the first time they run.
export const NS3_STEP_ORDER = [
  ...NS3_PHASE1_STEP_IDS,
  'e3-ontology',
  'e4-actors-rules-refs',
  'e5-workflows-operations',
  'e6-journey-map',
  'e7-validation-summary',
] as const;

export function createNs3Pipeline(moduleNameInput: string, stepIds: readonly string[] = NS3_PHASE1_STEP_IDS): Ns3PipelineState {
  const now = new Date().toISOString();
  const moduleName = normalizeModuleFolderName(moduleNameInput);
  const steps: Record<string, Ns3PipelineStepState> = {};
  for (const stepId of stepIds) {
    steps[stepId] = { status: 'pending', updatedAt: now };
  }
  return {
    schemaVersion: NS3_PIPELINE_SCHEMA_VERSION,
    flowId: 'agentNewSolution3',
    moduleName,
    createdAt: now,
    updatedAt: now,
    steps,
  };
}

export function ensureNs3Step(state: Ns3PipelineState, stepId: string): Ns3PipelineStepState {
  const now = new Date().toISOString();
  if (!state.steps[stepId]) state.steps[stepId] = { status: 'pending', updatedAt: now };
  return state.steps[stepId];
}

export function markNs3StepRunning(state: Ns3PipelineState, stepId: string, inputs?: unknown): Ns3PipelineState {
  const next = clonePipeline(state);
  const now = new Date().toISOString();
  const step = ensureNs3Step(next, stepId);
  step.status = 'running';
  step.dirty = false;
  if (inputs !== undefined) step.inputsHash = computeInputsHash(inputs);
  step.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function recordNs3GateResult(
  state: Ns3PipelineState,
  stepId: string,
  gate: { ok: boolean; errors: string[]; warnings: string[] },
  inputs?: unknown,
): Ns3PipelineState {
  const next = clonePipeline(state);
  const now = new Date().toISOString();
  const step = ensureNs3Step(next, stepId);
  step.status = gate.ok ? (step.status === 'approved' ? 'approved' : 'pending') : 'gate_failed';
  step.dirty = false;
  if (inputs !== undefined) step.inputsHash = computeInputsHash(inputs);
  step.lastGate = { ok: gate.ok, checkedAt: now, errors: gate.errors, warnings: gate.warnings };
  step.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function approveNs3Step(
  state: Ns3PipelineState,
  stepId: string,
  approvedBy: Ns3ApprovedBy,
  artifactVersion?: number,
): Ns3PipelineState {
  const next = clonePipeline(state);
  const now = new Date().toISOString();
  const step = ensureNs3Step(next, stepId);
  step.status = 'approved';
  step.dirty = false;
  step.approvedAt = now;
  step.approvedBy = approvedBy;
  if (artifactVersion !== undefined) step.artifactVersion = artifactVersion;
  step.updatedAt = now;
  next.updatedAt = now;
  return next;
}

export function markNs3DownstreamDirty(
  state: Ns3PipelineState,
  fromStepId: string,
  order: readonly string[] = NS3_STEP_ORDER,
): Ns3PipelineState {
  const next = clonePipeline(state);
  const start = order.indexOf(fromStepId);
  if (start < 0) return next;
  const now = new Date().toISOString();
  for (const stepId of order.slice(start + 1)) {
    const step = ensureNs3Step(next, stepId);
    if (step.status === 'approved') {
      step.dirty = true;
      step.updatedAt = now;
    }
  }
  next.updatedAt = now;
  return next;
}

export function nextNs3UnapprovedStep(state: Ns3PipelineState, order: readonly string[] = NS3_STEP_ORDER): string | null {
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

export async function readNs3Pipeline(moduleName: string): Promise<Ns3PipelineState | null> {
  const { ns3PipelineFileInfo, readJsonArtifact } = await import('/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js');
  return readJsonArtifact<Ns3PipelineState>(ns3PipelineFileInfo(moduleName), false);
}

export async function writeNs3Pipeline(state: Ns3PipelineState): Promise<string> {
  const { ns3PipelineFileInfo, writeJsonArtifact } = await import('/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js');
  return writeJsonArtifact(ns3PipelineFileInfo(state.moduleName), state);
}

function clonePipeline(state: Ns3PipelineState): Ns3PipelineState {
  return JSON.parse(JSON.stringify(state)) as Ns3PipelineState;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
