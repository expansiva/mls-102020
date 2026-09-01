/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/agentCfeCreateScanL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, readCreateContext, rememberCreateUxVariants, startCreateRun } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { agentBuildTrace } from '/_102020_/l2/agentChangeFrontend/helpers/cfeBuildStamp.js';
import { removeOrphanFrontendArtifacts } from '/_102020_/l2/agentChangeFrontend/helpers/cfeWorkspaceArtifacts.js';
import { clearCfeLayerTrace } from '/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js';

interface ScanArgs {
  command?: string;
  materialize?: boolean;
  forceMaterialize?: boolean;
  module?: string;
  uxVariants?: 'default' | 'all';
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
    // WHICH BUILD is running. A run over stale agent code looks exactly as green as a correct one
    // (petShop 2026-08-22); the warning has to land before the LLM calls are paid for.
    const buildTrace = await agentBuildTrace('[agentCfeCreateScanL4]');
    const scanArgs = parseScanArgs(step.prompt);
    const createContext = await readCreateContext();
    createContext.uxVariants = scanArgs.uxVariants === 'all' ? 'all' : 'default';
    rememberCreateUxVariants(createContext.uxVariants);

    // One module per task: keeps a run small so it never blows the task payload size limit. If the CLI
    // named a module (e.g. "@@changeFrontend /rebuild all cafeFlow"), process exactly that one;
    // otherwise the first module (todo order) that still has pending pages. Other modules are handled by
    // re-running the agent. 'all'/'defs' are CLI keywords and never reach here as a module (parseCliCommand).
    // Module names are canonical camelCase, but they are typed by hand ('buildFlowFSM47'): resolve the
    // request against the modules that exist, or the run reports "no pending pages" for a module that
    // has 34 of them.
    const requested = scanArgs.module
      ? createContext.moduleNames.find(name => name.toLowerCase() === scanArgs.module!.toLowerCase()) || scanArgs.module
      : '';
    const targetModule = requested || createContext.moduleNames.find(name => createContext.pages.some(page => page.moduleName === name));
    createContext.pages = targetModule ? createContext.pages.filter(page => page.moduleName === targetModule) : [];
    const sweepModule = targetModule || (createContext.moduleNames.length === 1 ? createContext.moduleNames[0] : '');
    if (scanArgs.command === 'rebuild-all' && sweepModule) {
      await clearCfeLayerTrace(createContext.project, sweepModule);
    }
    const orphanNote = sweepModule ? await sweepOrphans(createContext.project, sweepModule) : '';

    if (createContext.pages.length === 0) {
      const reason = scanArgs.module
        ? `No todoFrontend=toCreate pages for module ${requested}${createContext.moduleNames.includes(requested) ? '' : ` (known modules: ${createContext.moduleNames.join(', ') || 'none'})`}.`
        : 'No todoFrontend=toCreate owners.';
      if (scanArgs.materialize !== false) {
        const materialize = createMaterializeStep(scanArgs, [], requested || sweepModule);
        return [
          createAddStepIntent(context, parentStep, materialize),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${reason} Queued materialization freshness check.${orphanNote}${buildTrace}`),
        ];
      }
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${reason}${orphanNote}${buildTrace}`)];
    }

    // Guaranteed defined once pages are non-empty (pages were filtered by this module).
    const runModule = createContext.pages[0].moduleName;
    const runId = `cfe-${context.message.orderAt}`;
    startCreateRun(runId, createContext);
    const pageArgs = createContext.pages.map(page => JSON.stringify({ moduleName: page.moduleName, pageId: page.pageId, runId }));
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
      const materialize = createMaterializeStep(scanArgs, ['verify-create-layouts'], runModule);
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
      `Scanned L4 once; module ${runModule}: queued ${pageArgs.length} page contract/shared item(s) and the guarded layout phase${scanArgs.materialize === false ? ' (defs-only).' : '.'}${orphanNote}${buildTrace}`,
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

async function sweepOrphans(project: number, moduleName: string): Promise<string> {
  try {
    const result = await removeOrphanFrontendArtifacts(project, moduleName);
    if (result.skipped) return ` Orphan sweep skipped (${result.skipped}).`;
    if (result.removed.length === 0) return ' Orphan sweep: 0 removed.';
    return ` Orphan sweep: ${result.removed.length} removed.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return ` Orphan sweep failed: ${message}.`;
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

function createMaterializeStep(scanArgs: ScanArgs, dependsOn: string[], moduleName = ''): mls.msg.AIAgentStep {
  return createAgentStepPayload(
    'materialize-create-l2',
    'agentCfeMaterializeL2',
    'Materializar frontend L2',
    { planId: 'materialize-create-l2', force: scanArgs.forceMaterialize === true, module: moduleName },
    dependsOn,
    'sequential',
    dependsOn.length > 0 ? 'waiting_dependency' : 'waiting_human_input',
  );
}
