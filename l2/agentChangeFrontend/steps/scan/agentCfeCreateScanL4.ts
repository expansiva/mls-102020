/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/agentCfeCreateScanL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, readCreateContext, startCreateRun } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

interface ScanArgs {
  command?: string;
  materialize?: boolean;
  forceMaterialize?: boolean;
  module?: string;
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

    // One module per task: keeps a run small so it never blows the task payload size limit. If the CLI
    // named a module (e.g. "@@changeFrontend /rebuild all cafeFlow"), process exactly that one;
    // otherwise the first module (todo order) that still has pending pages. Other modules are handled by
    // re-running the agent. 'all'/'defs' are CLI keywords and never reach here as a module (parseCliCommand).
    const targetModule = scanArgs.module || createContext.moduleNames.find(name => createContext.pages.some(page => page.moduleName === name));
    createContext.pages = targetModule ? createContext.pages.filter(page => page.moduleName === targetModule) : [];

    if (createContext.pages.length === 0) {
      const reason = scanArgs.module ? `No todoFrontend=toCreate pages for module ${scanArgs.module}.` : 'No todoFrontend=toCreate owners.';
      if (scanArgs.materialize !== false) {
        const materialize = createMaterializeStep(scanArgs, []);
        return [
          createAddStepIntent(context, parentStep, materialize),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${reason} Queued materialization freshness check.`),
        ];
      }
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', reason)];
    }

    // Guaranteed defined once pages are non-empty (pages were filtered by this module).
    const runModule = createContext.pages[0].moduleName;
    const runId = `cfe-${context.message.orderAt}`;
    startCreateRun(runId, createContext);
    const pageArgs = createContext.pages.map(page => JSON.stringify({ pageId: page.pageId, runId }));
    const contractSharedFanout = createAgentStepPayload(
      'create-contract-shared-fanout',
      'agentCfeCreateContractShared',
      // Deterministic fan-out (no LLM): children complete in beforePromptStep and never hit the
      // progress-increment path, so a {{completed}}/{{total}} counter would freeze at 0/N. Use a
      // plain title instead of a live counter.
      'Criar contratos e shared',
      { planId: 'create-contract-shared-fanout' },
      [],
      'parallel_dynamic',
      'in_progress',
    );
    contractSharedFanout.interaction = {
      input: [{ type: 'system', content: '<!-- modelType: code -->' }],
      cost: 0,
      trace: [`cached one L4 create context; queued ${pageArgs.length} deterministic contract/shared item(s)`],
      payload: null,
    };

    // A parallel_dynamic parent starts immediately when addParallelArgs receives its dynamic
    // arguments. Therefore dependent fan-outs must be created by a sequential phase only after
    // the prior barrier completes; waiting_dependency on the fan-out itself is ineffective.
    const layoutPhase = createAgentStepPayload(
      'create-layout-phase',
      'agentCfeCreateLayoutPhase',
      'Preparar criação de layouts',
      { planId: 'create-layout-phase', runId },
      ['create-contract-shared-fanout'],
      'sequential',
      'waiting_dependency',
    );

    const intents: mls.msg.AgentIntent[] = [
      createAddStepIntent(context, parentStep, contractSharedFanout, pageArgs),
      createAddStepIntent(context, parentStep, layoutPhase),
    ];

    if (scanArgs.materialize !== false) {
      const materialize = createMaterializeStep(scanArgs, ['verify-create-layouts']);
      intents.push(createAddStepIntent(context, parentStep, materialize));
    } else if (scanArgs.command === 'rebuild-defs') {
      // Defs-only rebuild: after the layout verification barrier, drop the derived .ts/.test.ts so
      // the module keeps only the regenerated .defs.ts. Guarded by the CLI command, not just
      // materialize=false, so the plain /run path (also materialize-driven) is never affected.
      const cleanup = createAgentStepPayload(
        'rebuild-defs-cleanup',
        'agentCfeRebuildDefsCleanup',
        'Limpar .ts derivados (rebuild defs)',
        { planId: 'rebuild-defs-cleanup', modules: [runModule] },
        ['verify-create-layouts'],
        'sequential',
        'waiting_dependency',
      );
      intents.push(createAddStepIntent(context, parentStep, cleanup));
    }

    const doneIntent = createUpdateStatusIntent(
      context,
      parentStep,
      step,
      hookSequential,
      'completed',
      `Scanned L4 once; module ${runModule}: queued ${pageArgs.length} page contract/shared item(s) and the guarded layout phase${scanArgs.materialize === false ? ' (defs-only).' : '.'}`,
    );
    // Name the task after the single module it processes: "<module> - frontend".
    doneIntent.newTaskTitle = `${runModule} - frontend`;
    intents.push(doneIntent);
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
