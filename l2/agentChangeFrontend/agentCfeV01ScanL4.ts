/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01ScanL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  CfeV01StepArgs,
  createAddStepIntent,
  createAgentStepPayload,
  createParallelAgentStepIntent,
  createUpdateStatusIntent,
  readCreateScanResult,
} from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeV01ScanL4',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'v0.1 deterministic L4 scanner for agentChangeFrontend',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readCreateScanResult();
    const pendingOwners = scan.workflows.filter(owner => owner.statusFrontend === 'toCreate').length
      + scan.operations.filter(owner => owner.statusFrontend === 'toCreate').length;

    if (scan.pages.length === 0) {
      const finalStep = createFinalStep({
        scan: { project: scan.project, moduleNames: scan.moduleNames, pageCount: 0, ownerCount: pendingOwners },
        phase: 'final',
      }, ['v01-scan-l4']);
      return [
        createAddStepIntent(context, parentStep, finalStep),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'No pages to create.'),
      ];
    }

    const pageArgs = scan.pages.map(page => JSON.stringify({ page, phase: 'page' } satisfies CfeV01StepArgs));
    const intents: mls.msg.AgentIntent[] = [
      createParallelAgentStepIntent(
        context,
        parentStep,
        'v01-page-fanout',
        'agentCfeV01PageConsole',
        'v0.1 paginas {{completed}}/{{total}}, falhas {{failed}}',
        pageArgs,
        5,
      ),
    ];
    intents.push(createAddStepIntent(context, parentStep, createFinalStep({
      scan: { project: scan.project, moduleNames: scan.moduleNames, pageCount: scan.pages.length, ownerCount: pendingOwners },
      phase: 'final',
    }, ['v01-page-fanout'])));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Queued ${scan.pages.length} page console test(s).`));
    return intents;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function createFinalStep(args: CfeV01StepArgs, dependsOn: string[]): mls.msg.AIAgentStep {
  return createAgentStepPayload(
    'v01-final-console',
    'agentCfeV01FinalConsole',
    'v0.1 resumo do teste',
    args,
    dependsOn,
    'sequential',
  );
}
