/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/reconcile-shared-phase/agentCfeReconcileSharedPhase.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, listCreateRunPageArgs } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

const PLAN_ID = 'create-reconcile-phase';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeReconcileSharedPhase',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/reconcile-shared-phase',
    agentDescription: 'Start shared reconciliation only after every layout child has completed',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const runId = parseRunId(step.prompt);
    const pageArgs = listCreateRunPageArgs(runId);
    const fanout = createAgentStepPayload(
      'reconcile-shared-fanout',
      'agentCfeReconcileShared',
      'Reconciliar shared {{completed}}/{{total}}, falhas {{failed}}',
      { planId: 'reconcile-shared-fanout' },
      [],
      'parallel_dynamic',
      'in_progress',
    );
    fanout.interaction = fanoutInteraction(`queued ${pageArgs.length} shared reconciliation item(s)`);
    const verifyLayouts = createAgentStepPayload(
      'verify-create-layouts',
      'agentCfeVerifyCreateLayouts',
      'Verificar layouts primarios',
      { planId: 'verify-create-layouts', runId },
      [PLAN_ID],
      'sequential',
      'waiting_dependency',
    );
    return [
      createAddStepIntent(context, step, fanout, pageArgs.map(item => JSON.stringify(item))),
      createAddStepIntent(context, parentStep, verifyLayouts),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `started ${pageArgs.length} shared reconciliation item(s)`),
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
