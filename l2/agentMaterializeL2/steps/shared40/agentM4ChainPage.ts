/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/agentM4ChainPage.ts" enhancement="_blank"/>

// The group step of one page (Guilherme, 09/10/2026: "agrupar por página"). The shared40 dispatcher adds one per
// page with pending work; it adds that page's first units UNDER ITSELF and stays in_progress. Each unit adds the next
// one of the same page under its own parent (this group), so the shared, the pages, their repairs and the reviews
// of a page sit together. The engine completes the group when its last child is terminal
// (aiOrchestrator.ts:setStepCompletedIfChildrenCompleted), the phase-hosts-its-children pattern of
// agentMaterializeL2/steps/materialize/agentCfeMaterializePhase.ts (skills/collab_messages.md).

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_CHAIN_PAGE_AGENT_NAME, moduleTokenOk, type M4RunIdentity, type M4RunScope } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_CHAIN_PAGE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/shared40', agentDescription: 'Group the shared, pages and reviews of one page', visibility: 'private', beforePromptStep };
}

/** `units` are the page's first worker steps, computed once by the dispatcher (it applied --force already). */
export interface M4ChainPageArgs extends M4RunIdentity { pageId: string; scope?: M4RunScope; units: mls.msg.AIAgentStep[] }

export function chainPageStep(args: M4ChainPageArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, stepTitle: args.pageId, status: 'waiting_human_input', nextSteps: [],
    agentName: M4_CHAIN_PAGE_AGENT_NAME, prompt: JSON.stringify(args), rags: [],
    planning: { planId: `chain40-${args.pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

export function parseChainPageArgs(raw: string): M4ChainPageArgs {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('M4_CHAIN_ARGS_INVALID'); }
  const args = value as M4ChainPageArgs;
  if (!args || !Number.isSafeInteger(args.project) || args.project <= 0 || !moduleTokenOk(args.module) || !/^[a-z][A-Za-z0-9_]*$/u.test(args.pageId) || !Array.isArray(args.units)) throw new Error('M4_CHAIN_ARGS_INVALID');
  return args;
}

/** The intents of a group: its units under itself first, then in_progress, never completed (the engine completes it). */
export function chainPageIntents(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args: M4ChainPageArgs): mls.msg.AgentIntent[] {
  if (!args.units.length) return [updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Page ${args.pageId}: nothing pending.`)];
  return [
    ...args.units.map(unit => addAgentStep(context, step.stepId, unit)),
    updateAgentStatus(context, parentStep, step, hookSequential, 'in_progress', `Page ${args.pageId}: ${args.units.map(unit => unit.stepTitle).join(', ')}.`),
  ];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    return chainPageIntents(context, parentStep, step, hookSequential, parseChainPageArgs(step.prompt || ''));
  } catch (error) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
