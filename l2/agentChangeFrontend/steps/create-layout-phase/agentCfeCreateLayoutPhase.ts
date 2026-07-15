/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout-phase/agentCfeCreateLayoutPhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, listCreateRunLayoutArgs } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

const PLAN_ID = 'create-layout-phase';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreateLayoutPhase',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/create-layout-phase',
    agentDescription: 'Start the layout fan-out only after contract/shared creation has completed',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const runId = parseRunId(step.prompt);
    const layoutArgs = await listCreateRunLayoutArgs(runId);
    const fanout = createAgentStepPayload(
      'create-layout-fanout',
      'agentCfeCreateLayout',
      'Criar layouts {{completed}}/{{total}}, falhas {{failed}}',
      { planId: 'create-layout-fanout' },
      [],
      'parallel_dynamic',
      'in_progress',
    );
    fanout.interaction = fanoutInteraction(`queued ${layoutArgs.length} pinned layout item(s)`);
    const reconcilePhase = createAgentStepPayload(
      'create-reconcile-phase',
      'agentCfeReconcileSharedPhase',
      'Preparar reconciliação shared',
      { planId: 'create-reconcile-phase', runId },
      [PLAN_ID],
      'sequential',
      'waiting_dependency',
    );
    return [
      createAddStepIntent(context, step, fanout, layoutArgs.map(item => JSON.stringify(item))),
      createAddStepIntent(context, parentStep, reconcilePhase),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `started ${layoutArgs.length} pinned layout item(s)`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function fanoutInteraction(trace: string): mls.msg.AIInteraction {
  return { input: [{ type: 'system', content: '<!-- deterministic parallel fan-out host -->' }], cost: 0, trace: [trace], payload: null };
}

function parseRunId(value: string | undefined): string {
  const parsed = value ? JSON.parse(value) as Record<string, unknown> : {};
  const runId = typeof parsed.runId === 'string' ? parsed.runId : '';
  if (!runId) throw new Error('missing create execution runId');
  return runId;
}
