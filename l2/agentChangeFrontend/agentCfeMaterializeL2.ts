/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeMaterializeL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  getContentByMlsPath,
  getFileModified,
  parseMlsPath,
  parsePipelineFromContent,
  type GenStepArgs,
} from '/_102020_/l2/agentChangeFrontend/cfeMaterializeStudio.js';
import {
  isStale,
  layerRank,
  orderItems,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/cfeMaterializeCore.js';
import {
  createAddStepIntent,
  createAgentStepPayload,
  createUpdateStatusIntent,
  listGeneratedCreatePages,
} from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeMaterializeL2',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Materialize generated frontend L2 .defs.ts into .ts/.html before final status update',
    visibility: 'private',
    beforePromptStep,
  };
}

interface MaterializeArgs {
  force?: boolean;
}

interface MaterializeCandidate {
  defPath: string;
  item: PipelineItem;
}

interface PlannedMaterializeItem {
  candidate: MaterializeCandidate;
  stale: boolean;
  reason: string;
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseArgs(step.prompt);
    const generated = await listGeneratedCreatePages();
    const candidates = await readMaterializeCandidates(generated.project, generated.pages);
    const planned = planMaterialization(candidates, args.force === true);
    const todo = planned.filter(item => item.stale);
    const fanouts = createMaterializeFanouts(context, step, todo);
    const registerDeps = fanouts.map(intent => String((intent.step as any).planning?.planId || '')).filter(Boolean);
    const register = createAgentStepPayload(
      'register-frontend',
      'agentCfeRegisterFrontend',
      'Registrar frontend e preview',
      { planId: 'register-frontend', materialized: todo.length, skippedPages: generated.skippedPages },
      registerDeps,
      'sequential',
      registerDeps.length > 0 ? 'waiting_dependency' : 'waiting_human_input',
    );
    const finalize = createAgentStepPayload(
      'finalize-create',
      'agentCfeCreateFinalize',
      'Atualizar config e status',
      { planId: 'finalize-create', materialized: todo.length, skippedPages: generated.skippedPages },
      ['register-frontend'],
      'sequential',
      'waiting_dependency',
    );
    const trace = `pages=${generated.pages.length}; materialize=${todo.length}/${planned.length}; skippedPages=${generated.skippedPages.length}`;
    console.log(`[${agent.agentName}] ${trace}`);
    return [
      ...fanouts,
      createAddStepIntent(context, parentStep, register),
      createAddStepIntent(context, parentStep, finalize),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function parseArgs(prompt: string | undefined): MaterializeArgs {
  if (!prompt) return {};
  try {
    const parsed = JSON.parse(prompt);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MaterializeArgs : {};
  } catch {
    return {};
  }
}

async function readMaterializeCandidates(project: number, pages: Array<{ moduleName: string; pageId: string }>): Promise<MaterializeCandidate[]> {
  const candidates: MaterializeCandidate[] = [];
  for (const page of pages) {
    const defPaths = [
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/desktop/page11/${page.pageId}.defs.ts`,
    ];
    for (const defPath of defPaths) {
      const source = await getContentByMlsPath(defPath);
      const pipeline = source ? parsePipelineFromContent(source) : null;
      const item = pipeline?.[0] as PipelineItem | undefined;
      if (!item) throw new Error(`pipeline not found in ${defPath}`);
      candidates.push({ defPath, item });
    }
  }
  return candidates;
}

function planMaterialization(candidates: MaterializeCandidate[], force: boolean): PlannedMaterializeItem[] {
  const byOutput = new Map(candidates.map(candidate => [candidate.item.outputPath, candidate]));
  const orderedItems = orderItems(candidates.map(candidate => candidate.item));
  const scheduledOutputs = new Set<string>();
  const planned: PlannedMaterializeItem[] = [];

  for (const item of orderedItems) {
    const candidate = byOutput.get(item.outputPath);
    if (!candidate) continue;
    const defsMs = modifiedMs(candidate.defPath);
    const tsMs = modifiedMs(item.outputPath);
    const depMs = newestDependencyMs(item);
    const scheduledDep = (item.dependsFiles ?? []).some(dep => scheduledOutputs.has(dep));
    const stale = force || scheduledDep || isStale(defsMs, tsMs, depMs);
    const reason = force
      ? 'forced'
      : tsMs == null
        ? 'output missing'
        : scheduledDep
          ? 'dependency scheduled'
          : defsMs != null && defsMs > tsMs
            ? 'defs newer than ts'
            : depMs != null && depMs > tsMs
              ? 'dependency newer than ts'
              : 'up to date';
    if (stale) scheduledOutputs.add(item.outputPath);
    planned.push({ candidate, stale, reason });
  }

  return planned;
}

function newestDependencyMs(item: PipelineItem): number | null {
  let newest: number | null = null;
  for (const dep of item.dependsFiles ?? []) {
    const ms = modifiedMs(dep);
    if (ms != null && (newest == null || ms > newest)) newest = ms;
  }
  return newest;
}

function modifiedMs(ref: string): number | null {
  const parsed = parseMlsPath(ref);
  if (!parsed) return null;
  return getFileModified(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
}

function createMaterializeFanouts(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, planned: PlannedMaterializeItem[]): mls.msg.AgentIntentAddStep[] {
  const groups = groupByMaterializePhase(planned);
  const intents: mls.msg.AgentIntentAddStep[] = [];
  const priorPlanIds: string[] = [];

  for (const group of groups) {
    if (group.items.length === 0) continue;
    const planId = `materialize-${group.phase}`;
    const args = group.items.map(item => JSON.stringify({
      planId: materializePlanId(item.candidate.item),
      defPath: item.candidate.defPath,
    } satisfies GenStepArgs));
    const fanout = createMaterializeFanoutStep(planId, group.title, args.length, priorPlanIds);
    intents.push(createAddStepIntent(context, parentStep, fanout, args, 5));
    priorPlanIds.push(planId);
  }

  return intents;
}

function groupByMaterializePhase(planned: PlannedMaterializeItem[]): Array<{ phase: string; title: string; items: PlannedMaterializeItem[] }> {
  const ordered = [...planned].sort((a, b) => layerRank(a.candidate.item.type) - layerRank(b.candidate.item.type) || a.candidate.item.outputPath.localeCompare(b.candidate.item.outputPath));
  return [
    { phase: 'contracts', title: 'Materializar contratos {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_contract') },
    { phase: 'shared', title: 'Materializar shared {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_shared') },
    { phase: 'pages', title: 'Materializar paginas {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_page') },
  ];
}

function createMaterializeFanoutStep(planId: string, title: string, total: number, dependsOn: string[]): mls.msg.AIAgentStep {
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
    status: dependsOn.length > 0 ? 'waiting_dependency' : 'in_progress',
    nextSteps: [],
    agentName: 'agentCfeMaterializeGen',
    prompt: JSON.stringify({ planId }),
    rags: [],
    planning: { planId, dependsOn, executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as any;
}

function materializePlanId(item: PipelineItem): string {
  return materializePlanIdFromPipelineId(item.id);
}

function materializePlanIdFromPipelineId(id: string): string {
  return `materialize-${safe(id)}`;
}

function safe(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}
