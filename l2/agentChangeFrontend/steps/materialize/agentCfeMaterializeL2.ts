/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializeL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  getContentByMlsPath,
  getFileModified,
  parseMlsPath,
  parsePipelineFromContent,
  type GenStepArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import {
  isStale,
  layerRank,
  orderItems,
  testPathForOutputPath,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  createAddStepIntent,
  createAgentStepPayload,
  createUpdateStatusIntent,
  listGeneratedCreatePages,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeMaterializeL2',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/materialize',
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
    const candidates = await readMaterializeCandidates(generated.project);
    const planned = planMaterialization(candidates, args.force === true);
    const todo = planned.filter(item => item.stale);
    const phasePlan = createMaterializePhaseSteps(context, step, todo);
    const registerDeps = phasePlan.terminalPlanIds;
    // register/finalize recompute the ready/skipped set FRESH (post-materialization) inside
    // registerGeneratedFrontendPages/finalizeGeneratedPages — see their traces. Do NOT embed
    // `generated.skippedPages` here: it is a pre-materialization snapshot (every page still looks
    // "not generated" before its .ts exists), so it would read as "all pages skipped" and mislead.
    const register = createAgentStepPayload(
      'register-frontend',
      'agentCfeRegisterFrontend',
      'Registrar frontend e preview',
      { planId: 'register-frontend', materialized: todo.length },
      registerDeps,
      'sequential',
      registerDeps.length > 0 ? 'waiting_dependency' : 'waiting_human_input',
    );
    const finalize = createAgentStepPayload(
      'finalize-create',
      'agentCfeCreateFinalize',
      'Atualizar config e status',
      { planId: 'finalize-create', materialized: todo.length },
      ['register-frontend'],
      'sequential',
      'waiting_dependency',
    );
    const trace = `pages=${generated.pages.length}; materialize=${todo.length}/${planned.length}; skippedPages=${generated.skippedPages.length}`;
    return [
      ...phasePlan.intents,
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

async function readMaterializeCandidates(project: number): Promise<MaterializeCandidate[]> {
  const candidates: MaterializeCandidate[] = [];
  const seenOutputs = new Set<string>();
  for (const defPath of listFrontendDefs(project)) {
    const source = await getContentByMlsPath(defPath);
    const pipeline = source ? parsePipelineFromContent(source) : null;
    const item = pipeline?.[0] as PipelineItem | undefined;
    if (!item || !item.type.startsWith('l2_') || seenOutputs.has(item.outputPath)) continue;
    seenOutputs.add(item.outputPath);
    candidates.push({ defPath, item });
  }
  return candidates;
}

function listFrontendDefs(project: number): string[] {
  const refs: string[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (!isFrontendMaterializeFolder(folder)) continue;
    refs.push(toMlsRef(file));
  }
  return refs.sort();
}

function isFrontendMaterializeFolder(folder: string): boolean {
  return /\/web\/contracts$/.test(folder)
    || /\/web\/shared$/.test(folder)
    || /\/web\/desktop\/page\d+$/.test(folder)
    || /\/web\/mobile\/page\d+$/.test(folder);
}

function toMlsRef(file: any): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `_${file.project}_/l${file.level}/${folder}${file.shortName}${file.extension}`;
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
    const expectsTypecheck = item.type === 'l2_contract' || item.type === 'l2_shared';
    const testMs = expectsTypecheck ? modifiedMs(testPathForOutputPath(item.outputPath)) : null;
    const depMs = newestDependencyMs(item);
    const scheduledDep = (item.dependsFiles ?? []).some(dep => scheduledOutputs.has(dep));
    const stale = force || scheduledDep || isStale(defsMs, tsMs, depMs) || (expectsTypecheck && (testMs == null || (defsMs != null && defsMs > testMs)));
    const reason = force
      ? 'forced'
      : tsMs == null
        ? 'output missing'
        : expectsTypecheck && testMs == null
          ? 'typecheck missing'
          : scheduledDep
            ? 'dependency scheduled'
            : defsMs != null && defsMs > tsMs
              ? 'defs newer than ts'
              : expectsTypecheck && defsMs != null && testMs != null && defsMs > testMs
                ? 'defs newer than typecheck'
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

function createMaterializePhaseSteps(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, planned: PlannedMaterializeItem[]): { intents: mls.msg.AgentIntentAddStep[]; terminalPlanIds: string[] } {
  const groups = groupByMaterializePhase(planned);
  const intents: mls.msg.AgentIntentAddStep[] = [];
  let priorFanoutPlanIds: string[] = [];
  let terminalPlanIds: string[] = [];

  for (const group of groups) {
    if (group.items.length === 0) continue;
    const phasePlanId = `materialize-phase-${group.phase}`;
    const fanoutPlanId = `${phasePlanId}-fanout`;
    const items = group.items.map(item => ({
      planId: materializePlanId(item.candidate.item),
      defPath: item.candidate.defPath,
    } satisfies GenStepArgs));
    const phase = createAgentStepPayload(
      phasePlanId,
      'agentCfeMaterializePhase',
      group.parentTitle,
      { planId: phasePlanId, fanoutPlanId, title: group.parentTitle, fanoutTitle: group.progressTitle, items, maxParallel: 10 },
      priorFanoutPlanIds,
      'sequential',
      priorFanoutPlanIds.length > 0 ? 'waiting_dependency' : 'waiting_human_input',
    );
    intents.push(createAddStepIntent(context, parentStep, phase));
    priorFanoutPlanIds = [fanoutPlanId];
    terminalPlanIds = [fanoutPlanId];
  }

  return { intents, terminalPlanIds };
}

function groupByMaterializePhase(planned: PlannedMaterializeItem[]): Array<{ phase: string; parentTitle: string; progressTitle: string; items: PlannedMaterializeItem[] }> {
  const ordered = [...planned].sort((a, b) => layerRank(a.candidate.item.type) - layerRank(b.candidate.item.type) || a.candidate.item.outputPath.localeCompare(b.candidate.item.outputPath));
  return [
    { phase: 'contracts', parentTitle: 'Materializar contratos', progressTitle: 'Materializar contratos {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_contract') },
    { phase: 'shared', parentTitle: 'Materializar shared', progressTitle: 'Materializar shared {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_shared') },
    { phase: 'pages', parentTitle: 'Materializar paginas', progressTitle: 'Materializar paginas {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_page') },
  ];
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
