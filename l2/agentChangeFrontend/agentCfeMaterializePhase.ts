/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeMaterializePhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';
import type { GenStepArgs } from '/_102020_/l2/agentChangeFrontend/cfeMaterializeStudio.js';

interface MaterializePhaseArgs {
  planId: string;
  fanoutPlanId: string;
  title: string;
  fanoutTitle: string;
  items: GenStepArgs[];
  maxParallel?: number;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeMaterializePhase',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Launch one sequential materialization phase after its dependency barrier is complete',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parsePhaseArgs(step.prompt);
    if (args.items.length === 0) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no materialization items in phase')];
    }

    const fanout = createFanoutStep(args.fanoutPlanId, args.fanoutTitle, args.items.length);
    const parallelArgs = args.items.map(item => JSON.stringify(item));
    const trace = `queued ${args.items.length} materialization item(s)`;
    console.log(`[${agent.agentName}] ${args.planId}: ${trace}`);
    return [
      createAddStepIntent(context, step, fanout, parallelArgs, args.maxParallel ?? 5),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function parsePhaseArgs(prompt: string | undefined): MaterializePhaseArgs {
  if (!prompt) throw new Error('missing phase prompt');
  const parsed = JSON.parse(prompt);
  if (!isRecord(parsed)) throw new Error('phase prompt must be an object');
  const planId = readString(parsed.planId);
  const fanoutPlanId = readString(parsed.fanoutPlanId) || `${planId}-fanout`;
  const title = readString(parsed.title);
  const fanoutTitle = readString(parsed.fanoutTitle) || title;
  const items = Array.isArray(parsed.items) ? parsed.items.map(readGenStepArgs) : [];
  if (!planId) throw new Error('phase prompt missing planId');
  if (!title) throw new Error('phase prompt missing title');
  return {
    planId,
    fanoutPlanId,
    title,
    fanoutTitle,
    items,
    maxParallel: typeof parsed.maxParallel === 'number' ? parsed.maxParallel : undefined,
  };
}

function readGenStepArgs(value: unknown): GenStepArgs {
  if (!isRecord(value)) throw new Error('phase item must be an object');
  const planId = readString(value.planId);
  const defPath = readString(value.defPath);
  if (!planId || !defPath) throw new Error('phase item missing planId or defPath');
  return { planId, defPath };
}

function createFanoutStep(planId: string, title: string, total: number): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: {
      input: [{ type: 'system', content: '<!-- modelType: codeinstruct -->' }],
      cost: 0,
      trace: [`queued ${total} materialization item(s)`],
      payload: null,
    },
    stepTitle: title,
    status: 'in_progress',
    nextSteps: [],
    agentName: 'agentCfeMaterializeGen',
    prompt: JSON.stringify({ planId }),
    rags: [],
    planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as any;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
