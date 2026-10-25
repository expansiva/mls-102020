/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/steps.ts" enhancement="_blank"/>

import { displayPath, fileExists, moduleFile, readJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';

export const NR_AGENT_NAME = 'agentNewReleaseL2';
export const NR_HELP = 'Usage: @@agentNewReleaseL2 <module>';
export const NR_MATERIALIZE_AGENT = 'agentMaterializeL2';
export const NR_MATERIALIZE_PLAN = 'materialize';
export const NR_CLOSE_PLAN = 'close';

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

/** Materializer first, then this agent's close step. The close step waits on the materializer plan id. */
export function buildApplySteps(project: number, moduleName: string, pages: string[]): mls.msg.AIAgentStep[] {
  return [
    {
      ...agentStep(
        NR_MATERIALIZE_AGENT,
        NR_MATERIALIZE_PLAN,
        [],
        'Materialize pages',
        materializePrompt(project, moduleName, pages),
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

export function materializerOutcome(step: mls.msg.AIPayload | undefined): { status: 'completed' | 'failed'; message: string } {
  if (!step) return { status: 'failed', message: 'agentMaterializeL2 step is missing' };
  const traces = step.interaction?.trace?.map(line => line.trim()).filter(Boolean) ?? [];
  const nested = (step.nextSteps || []).find(item => item.type === 'result');
  const resultText = nested && nested.type === 'result' ? String(nested.result || '').trim() : '';
  const message = traces[traces.length - 1] || resultText || `agentMaterializeL2 ${step.status}`;
  return { status: step.status === 'completed' ? 'completed' : 'failed', message };
}
