/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/agentCfeCreateScanL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, readCreateContext } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

interface ScanArgs {
  materialize?: boolean;
  forceMaterialize?: boolean;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreateScanL4',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/scan',
    agentDescription: 'Scan todoFrontend=toCreate owners (l4 read-only) and start create fan-out',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scanArgs = parseScanArgs(step.prompt);
    const createContext = await readCreateContext();
    if (createContext.pages.length === 0) {
      if (scanArgs.materialize !== false) {
        const materialize = createMaterializeStep(scanArgs, []);
        return [
          createAddStepIntent(context, parentStep, materialize),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'No todoFrontend=toCreate owners. Queued materialization freshness check.'),
        ];
      }
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'No todoFrontend=toCreate owners.')];
    }

    const pageIds = createContext.pages.map(page => page.pageId);
    const createPages = createAgentStepPayload(
      'create-pages',
      'agentCfeCreatePagePhase',
      'Criar e revisar paginas',
      { planId: 'create-pages', pageIds, maxParallel: 5 },
      [],
      'sequential',
      'waiting_human_input',
    );

    const intents: mls.msg.AgentIntent[] = [
      createAddStepIntent(context, parentStep, createPages),
    ];

    if (scanArgs.materialize !== false) {
      const materialize = createMaterializeStep(scanArgs, ['create-pages']);
      intents.push(createAddStepIntent(context, parentStep, materialize));
    }

    intents.push(createUpdateStatusIntent(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      `Queued ${pageIds.length} page(s) for create/review${scanArgs.materialize === false ? ' (defs-only).' : '.'}`,
    ));
    return intents;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function parseScanArgs(prompt: string | undefined): ScanArgs {
  if (!prompt) return {};
  try {
    const parsed = JSON.parse(prompt);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ScanArgs : {};
  } catch {
    return {};
  }
}

function createMaterializeStep(scanArgs: ScanArgs, dependsOn: string[]): mls.msg.AIAgentStep {
  return createAgentStepPayload(
    'materialize-create-l2',
    'agentCfeMaterializeL2',
    'Materializar frontend L2',
    { planId: 'materialize-create-l2', force: scanArgs.forceMaterialize === true },
    dependsOn,
    'sequential',
    dependsOn.length > 0 ? 'waiting_dependency' : 'waiting_human_input',
  );
}
