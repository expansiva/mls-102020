/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Core.ts" enhancement="_blank"/>

import { POOL_DEVICES } from '/_102035_/l2/solution/poolPlan.js';
import {
  displayPath,
  moduleFile,
  moduleFolder,
  normalizeModuleName,
  readJson,
  readPipeline,
  setModuleRoot,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import {
  deletePoolMessageAt,
  listPoolBox,
  readPoolMessage,
  readPoolTraceAt,
  tracePoolAt,
  type PoolMessage,
  type PoolTraceLine,
} from '/_102035_/l2/solution/pool.js';
import type { Ns5PipelineStatus, Ns5PipelineStepState } from '/_102035_/l2/solution/types.js';

export const P2_FLOW_ID = 'agentPlannerL2' as const;
export const P2_FLOW_VERSION = '2026-09-21-p2-flow-v6' as const;
export const P2_AGENT_NAME = 'agentPlannerL2' as const;
export const P2_PIPELINE_SCHEMA_VERSION = '2026-09-18-p2-pipeline-v2' as const;

/** Devices that get a menu folder. Grows by spec, not by prompt. */
export const P2_MENU_DEVICES = POOL_DEVICES;
export type P2MenuDevice = typeof P2_MENU_DEVICES[number];
export const P2_MENU_DEVICE: P2MenuDevice = 'web';

/** Menu conversation: L4 request → menu.json → needs.json. */
export const P2_MENU_FLOW_STEP_IDS = ['entry10', 'menu20', 'needs30'] as const;
/** Effort conversation: L1 backend.json → effort.json. Reached from the flow table, not by name in entry10. */
export const P2_EFFORT_FLOW_STEP_IDS = ['entry10', 'effort40'] as const;
/** Steps the current flow.json actually lists. */
export const P2_FLOW_STEP_IDS = ['entry10', 'menu20', 'needs30', 'effort40'] as const;

/** Parked: code stays, flow.json v4 does not list them. */
export const P2_PARKED_STEP_IDS = [
  'workspaces20',
] as const;

export const P2_STEP_IDS = [...P2_FLOW_STEP_IDS, ...P2_PARKED_STEP_IDS] as const;

export type P2FlowStepId = typeof P2_FLOW_STEP_IDS[number];
export type P2StepId = typeof P2_STEP_IDS[number];

/** Last step of `docs/flow.json` — that step's afterPrompt closes the pipeline. */
export const P2_FLOW_LAST_STEP_ID: P2FlowStepId = P2_FLOW_STEP_IDS[P2_FLOW_STEP_IDS.length - 1];

/** Entry planning does not mutate the generated product tree. */
export const P2_WEB_DIR_PRESERVED = 'preserved' as const;
/** @deprecated Kept to read older pipeline files; new entry runs never clean L2. */
export const P2_WEB_DIR_REMOVED = 'removed' as const;
/** @deprecated Kept to read older pipeline files; new entry runs never clean L2. */
export const P2_WEB_DIR_EMPTY_LEFT = 'empty-left: deleteFile does not remove directories' as const;
export type P2WebDir = typeof P2_WEB_DIR_PRESERVED | typeof P2_WEB_DIR_REMOVED | typeof P2_WEB_DIR_EMPTY_LEFT;

export const P2_STEP_TITLES: Record<P2StepId, string> = {
  entry10: 'Entry',
  menu20: 'Menu',
  needs30: 'Needs',
  effort40: 'Effort',
  workspaces20: 'Workspaces',
};

export const P2_STEP_DEPENDS_ON: Record<P2StepId, readonly string[]> = {
  entry10: [],
  menu20: ['entry10-done'],
  needs30: ['menu20-done'],
  effort40: ['entry10-done'],
  workspaces20: ['entry10-done'],
};

/** Pool message file: `<stamp>_<thread>_<round>`. `menu.json` does not match. */
const POOL_MESSAGE_SHORT = /^\d{14}_[A-Za-z0-9]+-\d{14}_[123]$/;

/** Copied from `p1Core.ts:53` — L2 must not import the L1 planner. */
const CANDIDATE_RE = /(^|\s)\/candidate(?:\s+(?!\/)(\S+))?(?=\s|$)/i;
const CANDIDATE_DOTDOT = 'Candidate path must not contain \'..\'.';

/** Same default as `P1_DEFAULT_CANDIDATE_REL` in `p1Core.ts`. */
export const P2_DEFAULT_CANDIDATE_REL = 'tobe/plan' as const;

export interface P2ParsedInvocation {
  module: string;
  /** Resolved `l4/` folder when `/candidate` is present; otherwise `''`. */
  candidate: string;
  /** True when the `/candidate` token was present, even if the path was refused. */
  hasCandidate: boolean;
}

export type P2EntrySource =
  | { kind: 'hand'; moduleName: string; candidate?: string }
  | { kind: 'step'; moduleName: string; thread: string; file: string; candidate?: string };

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
  /** Entry marker confirming it preserved `l2/<mod>/web/`. */
  webDir: P2WebDir;
  /** menu20: gate warnings (journey with no page). Written on approve; omitted before. */
  warnings?: string[];
  /** menu20: device the menu was written for. Written on approve; omitted before. */
  device?: P2MenuDevice;
  /** menu20: node counts by action. Written on approve. */
  actionCounts?: { new: number; change: number; keep: number; remove: number };
  updatedAt: string;
}

export type P2EntryBranch = 'menu' | 'effort';

export interface P2LoadedEntry {
  moduleName: string;
  file: Ns5FileInfo;
  message: PoolMessage;
  sourceMessages: string[];
  branch: P2EntryBranch;
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

/** Copied from `p1Core.ts:122`. `..` in the relative path returns `''`. */
export function resolveCandidateFolder(moduleName: string, relativePath = ''): string {
  const mod = normalizeModuleName(moduleName);
  const rel = String(relativePath || '').trim().replace(/^\/+|\/+$/g, '') || P2_DEFAULT_CANDIDATE_REL;
  if (rel.includes('..')) return '';
  if (rel === mod || rel.startsWith(`${mod}/`)) return rel;
  return `${mod}/${rel}`;
}

/**
 * Point `moduleFolder` at `candidate`, or restore the canonical root when it is
 * empty. `..` is a refusal, not a silent "no candidate". Always call this before
 * reading l4 / pool / pipeline so a previous task cannot leak its root.
 */
export function applyP2CandidateRoot(moduleName: string, candidate: string): string {
  const name = normalizeModuleName(moduleName, '');
  if (!name) return '';
  const raw = String(candidate || '').trim();
  if (!raw) {
    setModuleRoot(name, null);
    return '';
  }
  if (raw.includes('..')) {
    setModuleRoot(name, null);
    return CANDIDATE_DOTDOT;
  }
  const resolved = resolveCandidateFolder(name, raw);
  if (!resolved) {
    setModuleRoot(name, null);
    return CANDIDATE_DOTDOT;
  }
  setModuleRoot(name, resolved);
  return '';
}

/** True when `moduleFolder` is the `/candidate` override, not the canonical name. */
export function isP2CandidateRoot(moduleName: string): boolean {
  const name = normalizeModuleName(moduleName, '');
  if (!name) return false;
  return moduleFolder(moduleName) !== name;
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
  const candidateMatch = CANDIDATE_RE.exec(raw);
  const hasCandidate = !!candidateMatch;
  const candidateRel = candidateMatch?.[2] || '';
  const tokens = raw
    .replace(new RegExp(CANDIDATE_RE.source, 'gi'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const module = tokens[0] || '';
  const candidate = hasCandidate && module ? resolveCandidateFolder(module, candidateRel) : '';
  return { module, candidate, hasCandidate };
}

export function p2InvocationRefusal(invocation: P2ParsedInvocation): string {
  if (!invocation.module) return 'Pass @@agentPlannerL2 <lowerCamel>.';
  if (!moduleTokenOk(invocation.module)) return 'Module name must be lowerCamel (example: stockControl).';
  if (invocation.hasCandidate && !invocation.candidate) return CANDIDATE_DOTDOT;
  return '';
}

export type P2StepPrompt =
  | { kind: 'step'; moduleName: string; thread: string; file: string; candidate: string }
  | { kind: 'entry'; moduleName: string; candidate: string }
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
  const candidate = typeof raw.candidate === 'string' ? raw.candidate.trim() : '';
  if (candidate.includes('..')) return { kind: 'refusal', refusal: CANDIDATE_DOTDOT };
  if (moduleName && thread && file) return { kind: 'step', moduleName, thread, file, candidate };
  if (moduleName) return { kind: 'entry', moduleName, candidate };
  return { kind: 'refusal', refusal: 'step prompt needs moduleName.' };
}

/** `l4/<module>/pool/l2/pipeline.json` in the project and root of the run. */
export function p2PipelineFile(moduleName: string): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2`,
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
        artifactPaths: [displayPath(p2PipelineFile(moduleName))],
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
  entry: { thread: string; file: string; candidate?: string },
): mls.msg.AIAgentStep {
  const dependsOn = [...P2_STEP_DEPENDS_ON[stepId]];
  const prompt: Record<string, string> = { planId: stepId, moduleName, thread: entry.thread, file: entry.file };
  if (entry.candidate) prompt.candidate = entry.candidate;
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: P2_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: P2_AGENT_NAME,
    prompt: JSON.stringify(prompt),
    rags: [],
    planning: {
      planId: stepId,
      dependsOn,
      executionMode: 'sequential',
      executionHost: 'client',
    },
  };
}

export function isP2EffortMessage(message: PoolMessage): boolean {
  return message.from === 'l1' && message.artifacts.some(item => artifactEndsWith(item, 'backend.json'));
}

function artifactEndsWith(value: string, name: string): boolean {
  const path = value.trim();
  return path === name || path.endsWith(`/${name}`);
}

/** Which flow.json steps this entry enqueues. The table decides; callers do not name a successor. */
export function plannedP2StepIds(message?: PoolMessage): readonly P2FlowStepId[] {
  return message && isP2EffortMessage(message) ? P2_EFFORT_FLOW_STEP_IDS : P2_MENU_FLOW_STEP_IDS;
}

export function buildP2PlannedSteps(
  moduleName: string,
  entry: { thread: string; file: string; candidate?: string },
  message?: PoolMessage,
): mls.msg.AIAgentStep[] {
  return plannedP2StepIds(message).map(stepId => createP2AgentStep(stepId, moduleName, entry));
}

export function isP2PoolMessageFile(shortName: string): boolean {
  return POOL_MESSAGE_SHORT.test(shortName);
}

export function receivedPoolFile(moduleName: string, messageFile: string): Ns5FileInfo {
  const found = listPoolBox(moduleName, 'l2').find(file => displayPath(file) === messageFile);
  if (!found) throw new Error(`pool/l2 message not found: ${messageFile}`);
  return found;
}

function poolMessageFileName(file: Ns5FileInfo): string {
  return `${file.shortName}${file.extension}`;
}

interface P2PoolInput {
  file: Ns5FileInfo;
  message: PoolMessage;
}

function p2MessageIdentity(message: PoolMessage): string {
  return JSON.stringify([
    message.from,
    message.to,
    message.thread,
    message.round,
    message.mode,
    message.subject,
    message.artifacts,
    message.body,
  ]);
}

function p2ThreadRound(message: PoolMessage): string {
  return JSON.stringify([message.thread, message.round]);
}

async function readP2PoolInputs(moduleName: string): Promise<P2PoolInput[]> {
  const inputs: P2PoolInput[] = [];
  for (const file of listPoolBox(moduleName, 'l2').filter(item => isP2PoolMessageFile(item.shortName))) {
    try { inputs.push({ file, message: await readPoolMessage(file) }); }
    catch { /* Ignore non-message or unreadable pool entries. */ }
  }
  return inputs.sort((left, right) => displayPath(left.file).localeCompare(displayPath(right.file)));
}

async function traceP2DisputedInputs(
  moduleName: string,
  inputs: readonly P2PoolInput[],
  now: Date,
): Promise<void> {
  if (!inputs.length) return;
  const pipelineFile = p2PipelineFile(moduleName);
  let pipeline = await readP2Pipeline(moduleName);
  if (!pipeline) {
    const first = inputs[0];
    const initial = createP2Pipeline(
      moduleName,
      first.message,
      displayPath(first.file),
      now,
      inputs.map(input => poolMessageFileName(input.file)),
      P2_WEB_DIR_PRESERVED,
    );
    pipeline = { ...initial, status: 'inProgress', steps: {} };
    await writeJson(pipelineFile, pipeline);
  }
  const trace = await readPoolTraceAt(pipelineFile);
  for (const input of inputs) {
    const path = displayPath(input.file);
    if (trace.some(line => line.file === path && line.outcome === 'disputed')) continue;
    await tracePoolAt(pipelineFile, {
      at: now.toISOString(),
      file: path,
      from: input.message.from,
      to: input.message.to,
      thread: input.message.thread,
      round: input.message.round,
      mode: input.message.mode,
      outcome: 'disputed',
    });
    trace.push({
      at: now.toISOString(),
      file: path,
      from: input.message.from,
      to: input.message.to,
      thread: input.message.thread,
      round: input.message.round,
      mode: input.message.mode,
      outcome: 'disputed',
    });
  }
}

export async function findP2Response(
  moduleName: string,
  received: PoolMessage,
  artifactName: string,
): Promise<{ file: Ns5FileInfo; message: PoolMessage } | null> {
  for (const box of ['l1', 'l4'] as const) {
    for (const file of listPoolBox(moduleName, box)) {
      let message: PoolMessage;
      try {
        message = await readPoolMessage(file);
      } catch {
        continue;
      }
      if (message.from !== 'l2' || message.to !== box) continue;
      if (message.thread !== received.thread || message.round !== received.round || message.mode !== received.mode) continue;
      if (!message.artifacts.some(item => artifactEndsWith(item, artifactName))) continue;
      return { file, message };
    }
  }
  return null;
}

export async function traceAndConsumeP2Input(
  moduleName: string,
  inputFile: Ns5FileInfo,
  input: PoolMessage,
  responseFile: Ns5FileInfo,
  response: PoolMessage,
  now: Date,
): Promise<void> {
  const pipelineFile = p2PipelineFile(moduleName);
  const pipeline = await readP2Pipeline(moduleName);
  const sourceNames = new Set(pipeline?.sourceMessages || [poolMessageFileName(inputFile)]);
  const current = await readP2PoolInputs(moduleName);
  const selected = current.filter(item => sourceNames.has(poolMessageFileName(item.file)));
  const expectedIdentity = p2MessageIdentity(input);
  if (selected.some(item => p2MessageIdentity(item.message) !== expectedIdentity)) {
    const related = current.filter(item => requestKey(moduleName, item.message) === requestKey(moduleName, input));
    await traceP2DisputedInputs(moduleName, related, now);
    throw new Error(`pool/l2 has divergent copies for ${input.thread}/${input.round}; inputs remain pending`);
  }
  const inputFiles = selected.length ? selected : [
    { file: inputFile, message: input },
  ];
  const trace = await readPoolTraceAt(pipelineFile);
  const traceOnce = async (file: Ns5FileInfo, message: PoolMessage, outcome: 'processed' | 'delivered') => {
    const path = displayPath(file);
    if (trace.some(line => line.file === path && line.outcome === outcome
      && line.thread === message.thread && line.round === message.round && line.mode === message.mode)) return;
    await tracePoolAt(pipelineFile, {
      at: now.toISOString(),
      file: path,
      from: message.from,
      to: message.to,
      thread: message.thread,
      round: message.round,
      mode: message.mode,
      outcome,
    });
  };
  for (const item of inputFiles) await traceOnce(item.file, item.message, 'processed');
  await traceOnce(responseFile, response, 'delivered');
  for (const item of inputFiles) {
    const path = displayPath(item.file);
    const indexed = mls.stor.files[mls.stor.getKeyToFile(item.file)];
    if (indexed?.status !== 'deleted') await deletePoolMessageAt(pipelineFile, item.file, path);
  }
}

function requestKey(moduleName: string, message: PoolMessage): string {
  return JSON.stringify([moduleName, message.from, message.to, message.thread, message.round, message.mode]);
}

export function p2DifferentRequestsRefusal(count: number): string {
  return `pool/l2 has ${count} different requests; resolve with the l4 supervisor`;
}

/** `l4/<module>/pool/l2/<device>/menu.json` — overwritten each run. Not a pool message. */
export function p2MenuFile(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2/${device}`,
    shortName: 'menu',
    extension: '.json',
  };
}

/**
 * Canonical `l4/<mod>/pool/l2/<device>/menu.json`.
 *
 * Same form p2_23 removed from `p2MenuFile` (literal `normalizeModuleName`, not
 * `moduleFile().folder`). Here it is the right one: `/candidate` redirects
 * `moduleFolder`, but the module in force still lives at the canonical path.
 * Read-only — the planner pipeline and drafts are stored separately in pool/l2.
 */
export function p2CanonicalMenuFile(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): Ns5FileInfo {
  const name = normalizeModuleName(moduleName);
  return {
    project: moduleFile(moduleName).project,
    level: 4,
    folder: `${name}/pool/l2/${device}`,
    shortName: 'menu',
    extension: '.json',
  };
}

/** `l4/<module>/pool/l1/<device>/needs.json` — overwritten each run. Not a pool message. */
export function p2NeedsFile(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l1/${device}`,
    shortName: 'needs',
    extension: '.json',
  };
}

/** `l4/<module>/pool/l2/<device>/backend.json` — written by L1. Not a pool message. */
export function p2BackendFile(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2/${device}`,
    shortName: 'backend',
    extension: '.json',
  };
}

/** `l4/<module>/pool/l2/<device>/effort.json` — overwritten each effort run. Not a pool message. */
export function p2EffortFile(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2/${device}`,
    shortName: 'effort',
    extension: '.json',
  };
}

/** `l4/<module>/pool/l2/<device>/l4diff.json` — written by L4 on the candidate. */
export function p2L4DiffFile(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2/${device}`,
    shortName: 'l4diff',
    extension: '.json',
  };
}

export function isP2MenuDevice(value: string): value is P2MenuDevice {
  return (P2_MENU_DEVICES as readonly string[]).includes(value);
}

/**
 * What is already a screen in l2 for this device — the future source of `action`.
 * Materialization will write a manifesto per device (`l2/<mod>/web/<device>/menu.built.json`,
 * or the name that spec decides). Today that file does not exist, so this reader
 * returns null and every node is stamped `new`.
 */
export function readReadyL2Manifest(
  _moduleName: string,
  _device: P2MenuDevice = P2_MENU_DEVICE,
): null {
  return null;
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

  const rootRefusal = applyP2CandidateRoot(moduleName, source.candidate || '');
  if (rootRefusal) return { refusal: rootRefusal };

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
  loaded.sort((left, right) => displayPath(left.file).localeCompare(displayPath(right.file)));

  const byRequest = new Map<string, typeof loaded>();
  for (const entry of loaded) {
    const key = requestKey(moduleName, entry.message);
    const group = byRequest.get(key) || [];
    group.push(entry);
    byRequest.set(key, group);
  }
  const divergent = [...byRequest.values()].find(group =>
    new Set(group.map(entry => p2MessageIdentity(entry.message))).size > 1);
  if (divergent) {
    await traceP2DisputedInputs(moduleName, divergent, new Date());
    return { refusal: `pool/l2 has divergent copies for ${divergent[0].message.thread}/${divergent[0].message.round}; resolve with the l4 supervisor` };
  }

  const estimates = loaded.filter(entry => entry.message.mode === 'estimate');
  let pertinent = estimates;
  if (source.kind === 'step') {
    const specified = estimates.find(entry => matchPoolFile(entry.file, source.file));
    if (!specified) return { refusal: `pool/l2 message not found: ${source.file}` };
    if (specified.message.thread !== source.thread) {
      return { refusal: `message thread does not match '${source.thread}'.` };
    }
    const key = requestKey(moduleName, specified.message);
    pertinent = estimates.filter(entry => requestKey(moduleName, entry.message) === key);
  }
  const effort = pertinent.filter(entry => isP2EffortMessage(entry.message));
  const chosen = effort.length ? effort : pertinent;
  if (!chosen.length) return { refusal: `nothing pending for ${moduleName} in pool/l2` };

  const groups = new Map<string, typeof chosen>();
  for (const entry of chosen) {
    const key = requestKey(moduleName, entry.message);
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  if (groups.size > 1) return { refusal: p2DifferentRequestsRefusal(groups.size) };

  const group = chosen;
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
    branch: effort.length ? 'effort' : 'menu',
  };
}

export async function writeP2Entry(loaded: P2LoadedEntry, now: Date): Promise<P2PipelineState> {
  const messageFile = displayPath(loaded.file);
  const pipeline = createP2Pipeline(
    loaded.moduleName,
    loaded.message,
    messageFile,
    now,
    loaded.sourceMessages,
    P2_WEB_DIR_PRESERVED,
  );
  await writeJson(p2PipelineFile(loaded.moduleName), pipeline);
  return pipeline;
}

export async function writeP2EffortEntry(loaded: P2LoadedEntry, now: Date): Promise<P2PipelineState | { refusal: string }> {
  const pipeline = await readP2Pipeline(loaded.moduleName);
  if (!pipeline || pipeline.flowId !== P2_FLOW_ID) {
    return { refusal: 'l2 pipeline.json is missing; the menu flow must run first.' };
  }
  const device = pipeline.device || P2_MENU_DEVICE;
  const menu = await readJson(p2MenuFile(loaded.moduleName, device));
  if (!menu) {
    return { refusal: `pool/l2/${device}/menu.json is missing; the menu flow must run first.` };
  }
  const updatedAt = now.toISOString();
  const next: P2PipelineState = {
    ...pipeline,
    status: pipeline.status === 'failed' ? 'failed' : 'inProgress',
    awaitingStep: undefined,
    thread: loaded.message.thread,
    round: loaded.message.round,
    messageFile: displayPath(loaded.file),
    sourceMessages: loaded.sourceMessages,
    updatedAt,
    steps: {
      ...pipeline.steps,
      entry10: {
        status: 'approved',
        updatedAt,
        artifactPaths: [displayPath(p2PipelineFile(loaded.moduleName))],
      },
    },
  };
  await writeJson(p2PipelineFile(loaded.moduleName), next);
  return next;
}

export async function executeP2Entry(source: P2EntrySource, now: Date): Promise<P2ExecuteResult> {
  const loaded = await loadP2Entry(source);
  if ('refusal' in loaded) return loaded;
  if (loaded.branch === 'effort') {
    const pipeline = await writeP2EffortEntry(loaded, now);
    if ('refusal' in pipeline) return pipeline;
    return { pipeline, file: loaded.file, message: loaded.message };
  }
  const pipeline = await writeP2Entry(loaded, now);
  return { pipeline, file: loaded.file, message: loaded.message };
}

export async function readP2Pipeline(moduleName: string): Promise<P2PipelineState | null> {
  return readJson<P2PipelineState>(p2PipelineFile(moduleName));
}

/** `l4/<module>/pool/l2/<stepId>-draft.json` in the project and root of the run. */
export function p2DraftFile(moduleName: string, stepId: P2StepId): Ns5FileInfo {
  const base = moduleFile(moduleName);
  return {
    project: base.project,
    level: 4,
    folder: `${base.folder}/pool/l2`,
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
