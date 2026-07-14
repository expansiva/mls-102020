/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/agentCfeCreatePagePhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

interface CreatePagePhaseArgs {
  planId: string;
  pageIds: string[];
  maxParallel: number;
}

const AGENT_NAME = 'agentCfeCreatePagePhase';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/create-page',
    agentDescription: 'Host page generation, deterministic review and bounded repair behind one phase barrier',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseArgs(step.prompt);
    if (args.pageIds.length === 0) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no pages to create')];
    }

    const fanoutPlanId = 'create-page-fanout';
    const fanout = createAgentStepPayload(
      fanoutPlanId,
      'agentCfeCreatePage',
      'Criar paginas {{completed}}/{{total}}, falhas {{failed}}',
      { planId: fanoutPlanId },
      [],
      'parallel_dynamic',
      'in_progress',
    );
    fanout.interaction = {
      input: [{ type: 'system', content: '<!-- modelType: codefast -->' }],
      cost: 0,
      trace: [`queued ${args.pageIds.length} page(s) for create`],
      payload: null,
    };

    const reviewPlanId = 'create-page-review';
    const review = createAgentStepPayload(
      reviewPlanId,
      'agentCfeCreatePageReview',
      'Revisar paginas geradas',
      { planId: reviewPlanId, pageIds: args.pageIds, attempt: 1 },
      [fanoutPlanId],
      'sequential',
      'waiting_dependency',
    );
    const parallelArgs = args.pageIds.map(pageId => JSON.stringify({ pageId }));

    return [
      createAddStepIntent(context, step, fanout, parallelArgs, args.maxParallel),
      createAddStepIntent(context, step, review),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `queued ${args.pageIds.length} page(s) and deterministic review`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function parseArgs(prompt: string | undefined): CreatePagePhaseArgs {
  if (!prompt) throw new Error('missing create page phase args');
  const parsed = JSON.parse(prompt) as Record<string, unknown>;
  const planId = readString(parsed.planId);
  const pageIds = Array.isArray(parsed.pageIds) ? parsed.pageIds.map(readString).filter(Boolean) : [];
  const maxParallel = typeof parsed.maxParallel === 'number' && Number.isInteger(parsed.maxParallel)
    ? Math.min(100, Math.max(1, parsed.maxParallel))
    : 5;
  if (!planId) throw new Error('create page phase requires planId');
  return { planId, pageIds: [...new Set(pageIds)], maxParallel };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
