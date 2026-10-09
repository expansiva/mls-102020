/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/core.ts" enhancement="_blank"/>

// Identity, invocation and pipeline state of agentMaterializeL2. flow.json is the contract; the ids and
// dependencies below must match it. Only the steps already implemented are planned (entry10, input20, shared40, pages50).
// Everything this agent uses lives under its own folder (task V2): helpers are copies, never shared imports.

import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { readStorText, storTextExists, writeStorText } from '/_102020_/l2/agentMaterializeL2/helpers/storText.js';

/** JSON through helpers/storText, which also reads a file created moments ago. */
async function readJson<T>(info: Ns5FileInfo): Promise<T | null> {
  if (!storTextExists(info)) return null;
  try { const text = await readStorText(info); return text.trim() ? JSON.parse(text) as T : null; } catch { return null; }
}
async function writeJson(info: Ns5FileInfo, value: unknown): Promise<void> {
  await writeStorText(info, `${JSON.stringify(value, null, 2)}
`);
}

export const M4_AGENT_NAME = 'agentMaterializeL2' as const;
export const M4_ENTRY_AGENT_NAME = 'agentM4Entry' as const;
export const M4_INPUT_AGENT_NAME = 'agentM4Input' as const;
export const M4_SHARED_AGENT_NAME = 'agentM4Shared' as const;
export const M4_SHARED_PAGE_AGENT_NAME = 'agentM4SharedPage' as const;
/** The group step of one page: hosts that page's chain (shared, pages, reviews) as its children. */
export const M4_CHAIN_PAGE_AGENT_NAME = 'agentM4ChainPage' as const;
export const M4_PAGES_AGENT_NAME = 'agentM4Pages' as const;
export const M4_PAGES_PAGE_AGENT_NAME = 'agentM4PagesPage' as const;
export const M4_REVIEW_AGENT_NAME = 'agentM4Review' as const;
export const M4_REVIEW_PAGE_AGENT_NAME = 'agentM4ReviewPage' as const;
export const M4_FLOW_ID = 'agentMaterializeL2' as const;
export const M4_PIPELINE_VERSION = '2026-10-05-materialize-l2-v4-pipeline-v1' as const;

/** Implemented steps, in order. review55 is planned only with --review. tests60 and finalize70 join as they are built. */
export const M4_FLOW_STEP_IDS = ['entry10', 'input20', 'shared40', 'pages50', 'review55'] as const;
export type M4StepId = typeof M4_FLOW_STEP_IDS[number];

export const M4_STEP_DEPENDS_ON: Record<M4StepId, readonly string[]> = {
  entry10: [],
  input20: ['entry10-done'],
  shared40: ['input20-done'],
  pages50: ['shared40-done'],
  review55: ['pages50-done'],
};

export const M4_STEP_AGENTS: Record<M4StepId, string> = {
  entry10: M4_ENTRY_AGENT_NAME,
  input20: M4_INPUT_AGENT_NAME,
  shared40: M4_SHARED_AGENT_NAME,
  pages50: M4_PAGES_AGENT_NAME,
  review55: M4_REVIEW_AGENT_NAME,
};

export const M4_STEP_TITLES: Record<M4StepId, string> = {
  entry10: 'Start L2 materialization',
  input20: 'Validate L2 definitions and read the L4 context',
  shared40: 'Generate shared classes and pages (one chain per page)',
  pages50: 'Check desktop and mobile pages',
  review55: 'Check the page reviews',
};

/** The steps a run plans: review55 only on --review (Guilherme, 05/10/2026: off by default). */
export function m4PlannedStepIds(scope: M4RunScope = {}): M4StepId[] {
  return M4_FLOW_STEP_IDS.filter(stepId => stepId !== 'review55' || scope.review === true);
}

export interface M4RunIdentity { project: number; module: string }

export interface M4PipelineStepState {
  status: 'approved' | 'failed';
  updatedAt: string;
  diagnostic?: string;
  artifactPaths?: string[];
  snapshotHash?: string;
}
export interface M4PipelineState {
  schemaVersion: typeof M4_PIPELINE_VERSION;
  flowId: typeof M4_FLOW_ID;
  project: number;
  module: string;
  status: 'inProgress' | 'failed' | 'complete';
  steps: Partial<Record<M4StepId, M4PipelineStepState>>;
  /** The scope of this run; absent = the whole module, both devices, reuse on. */
  scope?: M4RunScope;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optional scope of a run (`--page`, `--device`, `--force`). input20 always gates the whole module (cheap, and
 * navigation targets need every page); shared40 and pages50 work only on the units in scope; `force` makes
 * those units regenerate even when their receipt is still valid.
 */
export interface M4RunScope { pages?: string[]; device?: 'desktop' | 'mobile'; force?: boolean; review?: boolean }
export type M4ScopedIdentity = M4RunIdentity & { scope: M4RunScope };

export type M4MessageInvocation =
  | { kind: 'help' }
  | ({ kind: 'run' } & M4ScopedIdentity)
  | { kind: 'refusal'; diagnostic: string };
export type M4StepInvocation = ({ kind: 'run' } & M4ScopedIdentity) | { kind: 'refusal'; diagnostic: string };

const AGENT_PREFIXES = [/@@\s*_102020_\/l2\/agentMaterializeL2/giu, /@@\s*agentMaterializeL2/giu];
const USAGE = 'Usage: @@agentMaterializeL2 <lowerCamel module> [--page <pageId>[,<pageId>…]] [--device desktop|mobile] [--force] [--review].';
const PAGE_ID = /^[a-z][A-Za-z0-9_]{0,59}$/u;

/** The pages of `accepted` this run works on: all of them, or the `--page` ones (in their accepted order). */
export function m4ScopePages(accepted: string[], scope: M4RunScope | undefined): string[] {
  return scope?.pages?.length ? accepted.filter(pageId => scope.pages!.includes(pageId)) : [...accepted];
}
/** The devices this run works on. */
export function m4ScopeDevices(scope: M4RunScope | undefined): Array<'desktop' | 'mobile'> {
  return scope?.device ? [scope.device] : ['desktop', 'mobile'];
}
/** One line for the step trace: `pages mesas, fechamento; device mobile; force`, or `whole module`. */
export function m4ScopeLabel(scope: M4RunScope | undefined): string {
  const parts = [scope?.pages?.length ? `pages ${scope.pages.join(', ')}` : '', scope?.device ? `device ${scope.device}` : '', scope?.force ? 'force' : '', scope?.review ? 'review' : ''].filter(Boolean);
  return parts.length ? parts.join('; ') : 'whole module';
}

function validScope(value: unknown): M4RunScope | string {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Step scope must be an object.';
  const raw = value as Record<string, unknown>;
  const unknown = Object.keys(raw).find(key => key !== 'pages' && key !== 'device' && key !== 'force' && key !== 'review');
  if (unknown) return `Unknown scope key: ${unknown}.`;
  if (raw.pages !== undefined && (!Array.isArray(raw.pages) || !raw.pages.every(item => typeof item === 'string' && PAGE_ID.test(item)))) return 'Scope pages must be page ids.';
  if (raw.device !== undefined && raw.device !== 'desktop' && raw.device !== 'mobile') return 'Scope device must be desktop or mobile.';
  if (raw.force !== undefined && typeof raw.force !== 'boolean') return 'Scope force must be a boolean.';
  if (raw.review !== undefined && typeof raw.review !== 'boolean') return 'Scope review must be a boolean.';
  return {
    ...(Array.isArray(raw.pages) && raw.pages.length ? { pages: raw.pages as string[] } : {}),
    ...(raw.device ? { device: raw.device as 'desktop' | 'mobile' } : {}),
    ...(raw.force ? { force: true } : {}),
    ...(raw.review ? { review: true } : {}),
  };
}

export function currentM4Project(): number {
  return Number(mls.actualProject || 0);
}

export function moduleTokenOk(value: string): boolean {
  return /^[a-z][A-Za-z0-9]{0,59}$/u.test(value);
}

export function parseM4MessageInvocation(value: string, project = currentM4Project()): M4MessageInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, ' ');
  const tokens = raw.trim().split(/\s+/u).filter(Boolean);
  if (tokens.length === 1 && (tokens[0].toLowerCase() === '/help' || tokens[0].toLowerCase() === '--help')) return { kind: 'help' };
  const positional: string[] = [];
  const scope: M4RunScope = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const [name, inline] = token.includes('=') ? [token.slice(0, token.indexOf('=')), token.slice(token.indexOf('=') + 1)] : [token, undefined];
    if (name === '--page') {
      const value = inline ?? tokens[++i];
      const pages = String(value ?? '').split(',').map(item => item.trim()).filter(Boolean);
      if (!pages.length || !pages.every(item => PAGE_ID.test(item))) return { kind: 'refusal', diagnostic: `--page needs one or more page ids, separated by commas. ${USAGE}` };
      scope.pages = [...new Set([...(scope.pages ?? []), ...pages])];
    } else if (name === '--device') {
      const value = inline ?? tokens[++i];
      if (value !== 'desktop' && value !== 'mobile') return { kind: 'refusal', diagnostic: `--device must be desktop or mobile. ${USAGE}` };
      scope.device = value;
    } else if (name === '--force') {
      scope.force = true;
    } else if (name === '--review') {
      scope.review = true;
    } else if (token.startsWith('-') || token.startsWith('/')) {
      return { kind: 'refusal', diagnostic: `Unknown option: ${token}. ${USAGE}` };
    } else {
      positional.push(token);
    }
  }
  if (positional.length !== 1) return { kind: 'refusal', diagnostic: USAGE };
  if (!Number.isSafeInteger(project) || project <= 0) return { kind: 'refusal', diagnostic: 'The current project is unavailable.' };
  if (!moduleTokenOk(positional[0])) return { kind: 'refusal', diagnostic: 'Module name must be lowerCamel and must not contain a path.' };
  return { kind: 'run', project, module: positional[0], scope };
}

export function parseM4StepInvocation(value: string, currentProject = currentM4Project()): M4StepInvocation {
  let parsed: unknown;
  try { parsed = JSON.parse(String(value || '{}')); } catch { return { kind: 'refusal', diagnostic: 'agentMaterializeL2 step args must be JSON.' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { kind: 'refusal', diagnostic: 'agentMaterializeL2 step args must be an object.' };
  const raw = parsed as Record<string, unknown>;
  const unknown = Object.keys(raw).find(key => key !== 'project' && key !== 'module' && key !== 'scope');
  if (unknown) return { kind: 'refusal', diagnostic: `Unknown step arg: ${unknown}.` };
  const project = typeof raw.project === 'number' ? raw.project : Number.NaN;
  const module = typeof raw.module === 'string' ? raw.module.trim() : '';
  if (!Number.isSafeInteger(project) || project <= 0) return { kind: 'refusal', diagnostic: 'Step args require a positive integer project.' };
  if (project !== currentProject) return { kind: 'refusal', diagnostic: `Step project ${project} does not match the current project ${currentProject}.` };
  if (!moduleTokenOk(module)) return { kind: 'refusal', diagnostic: 'Step module must be lowerCamel and must not contain a path.' };
  const scope = validScope(raw.scope);
  if (typeof scope === 'string') return { kind: 'refusal', diagnostic: scope };
  return { kind: 'run', project, module, scope };
}

export function m4StepIdOf(step: mls.msg.AIAgentStep): M4StepId | '' {
  const planId = String(step.planning?.planId || '');
  return (M4_FLOW_STEP_IDS as readonly string[]).includes(planId) ? planId as M4StepId : '';
}

export function createM4AgentStep(stepId: M4StepId, identity: M4RunIdentity, scope: M4RunScope = {}): mls.msg.AIAgentStep {
  const dependsOn = [...M4_STEP_DEPENDS_ON[stepId]];
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: M4_STEP_TITLES[stepId],
    status: dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [],
    agentName: M4_STEP_AGENTS[stepId],
    prompt: JSON.stringify({ project: identity.project, module: identity.module, ...(Object.keys(scope).length ? { scope } : {}) }),
    rags: [],
    planning: { planId: stepId, dependsOn, executionMode: 'sequential', executionHost: 'client' },
  };
}

export function buildM4PlannedSteps(identity: M4RunIdentity, scope: M4RunScope = {}): mls.msg.AIAgentStep[] {
  return m4PlannedStepIds(scope).map(stepId => createM4AgentStep(stepId, identity, scope));
}

/** Everything this agent owns in a module lives under l2/<module>/pipeline/agentMaterializeL2/. */
export function m4OwnedFile(identity: M4RunIdentity, shortName: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentMaterializeL2`, shortName, extension: '.json' };
}

export async function readM4Pipeline(identity: M4RunIdentity): Promise<M4PipelineState | null> {
  return readJson<M4PipelineState>(m4OwnedFile(identity, 'pipeline'));
}

export function createM4Pipeline(identity: M4RunIdentity, now: Date, scope: M4RunScope = {}): M4PipelineState {
  const updatedAt = now.toISOString();
  return {
    schemaVersion: M4_PIPELINE_VERSION, flowId: M4_FLOW_ID, project: identity.project, module: identity.module,
    status: 'inProgress', steps: { entry10: { status: 'approved', updatedAt } }, ...(Object.keys(scope).length ? { scope } : {}), createdAt: updatedAt, updatedAt,
  };
}

/** A new run always starts a fresh pipeline; an older format is replaced, not migrated. */
export async function initializeM4Pipeline(identity: M4RunIdentity, scope: M4RunScope = {}, now = new Date()): Promise<M4PipelineState> {
  const pipeline = createM4Pipeline(identity, now, scope);
  await writeJson(m4OwnedFile(identity, 'pipeline'), pipeline);
  return pipeline;
}

export async function markM4Step(identity: M4RunIdentity, stepId: M4StepId, state: Omit<M4PipelineStepState, 'updatedAt'>): Promise<void> {
  const pipeline = await readM4Pipeline(identity);
  if (!pipeline) throw new Error('agentMaterializeL2 pipeline is missing; entry10 must run first.');
  const updatedAt = new Date().toISOString();
  const steps = { ...pipeline.steps, [stepId]: { ...state, updatedAt } };
  const planned = m4PlannedStepIds(pipeline.scope);
  const last = stepId === planned[planned.length - 1];
  const status: M4PipelineState['status'] = state.status === 'failed' ? 'failed' : last ? 'complete' : 'inProgress';
  await writeJson(m4OwnedFile(identity, 'pipeline'), { ...pipeline, status, steps, updatedAt } satisfies M4PipelineState);
}

export const M4_HELP = [
  USAGE,
  'The module is explicit and the project comes from the current context.',
  'Options: --page <id>[,<id>…] works on those pages only; --device desktop|mobile generates only that device',
  '(the shared is common to both); --force regenerates the units in scope even when nothing changed;',
  '--review adds review55, a second LLM that reviews each page against its template (report only).',
  'input20 always gates the whole module.',
  'Steps: entry10, input20 (validates the defs of every page and reads the L4 context of each one) and',
  'shared40 (one shared class per accepted page, compiled in the Studio, plus its declaration and findings).',
  'pages50 (desktop and mobile page per accepted page, compiled in the Studio). tests60 and finalize70',
  'are planned (TASK-102020-agent-materialize-l2-v4).',
].join('\n');
