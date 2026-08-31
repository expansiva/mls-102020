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
  dependencyProbeRefs,
  isStale,
  layerRank,
  materializePlanIdFromPipelineId,
  orderItems,
  testPathForOutputPath,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  createAddStepIntent,
  createAgentStepPayload,
  createUpdateStatusIntent,
  listGeneratedCreatePages,
  readBlockedMaterializePlanIds,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeMaterializeL2',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/materialize',
    agentDescription: 'Materialize generated frontend L2 .defs.ts into .ts before final status update',
    visibility: 'private',
    beforePromptStep,
  };
}

interface MaterializeArgs {
  force?: boolean;
  module?: string;
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
    const moduleName = args.module || inferRunModule(generated.pages);
    const candidates = await readMaterializeCandidates(generated.project, moduleName);
    const planned = planMaterialization(candidates, args.force === true, await readBlockedMaterializePlanIds(generated.project, { moduleName: moduleName || undefined }));
    const todo = planned.filter(item => item.stale);
    const phasePlan = createMaterializePhaseSteps(context, step, todo, moduleName);
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
      { planId: 'finalize-create', materialized: todo.length, module: moduleName },
      ['register-frontend'],
      'sequential',
      'waiting_dependency',
    );
    const trace = `pages=${generated.pages.length}; module=${moduleName || '(none)'}; materialize=${todo.length}/${planned.length}; skippedPages=${generated.skippedPages.length}`;
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    const moduleName = typeof record.module === 'string' ? record.module.trim() : '';
    return {
      force: record.force === true,
      ...(moduleName ? { module: moduleName } : {}),
    };
  } catch {
    return {};
  }
}

function inferRunModule(pages: { moduleName: string }[]): string {
  const names = [...new Set(pages.map(page => page.moduleName).filter(Boolean))];
  return names[0] || '';
}

async function readMaterializeCandidates(project: number, moduleName: string): Promise<MaterializeCandidate[]> {
  const candidates: MaterializeCandidate[] = [];
  const seenOutputs = new Set<string>();
  for (const defPath of listFrontendDefs(project, moduleName)) {
    const source = await getContentByMlsPath(defPath);
    const pipeline = source ? parsePipelineFromContent(source) : null;
    // EVERY item, not just the first: a split page carries N organisms plus the page in one defs
    // (paginaDividida.md §5). Reading only pipeline[0] would have materialized the first organism and
    // silently skipped the page.
    for (const item of (pipeline ?? []) as PipelineItem[]) {
      if (!item || !item.type?.startsWith('l2_') || seenOutputs.has(item.outputPath)) continue;
      seenOutputs.add(item.outputPath);
      candidates.push({ defPath, item });
    }
  }
  return candidates;
}

function listFrontendDefs(project: number, moduleName: string): string[] {
  if (!moduleName) return [];
  const refs: string[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    if (!isFrontendMaterializeFolder(folder, moduleName)) continue;
    refs.push(toMlsRef(file));
  }
  return refs.sort();
}

function isFrontendMaterializeFolder(folder: string, moduleName?: string): boolean {
  if (moduleName && !folder.startsWith(`${moduleName}/`)) return false;
  return /\/web\/contracts$/.test(folder)
    || /\/web\/shared$/.test(folder)
    || /\/web\/desktop\/page\d+$/.test(folder)
    || /\/web\/mobile\/page\d+$/.test(folder);
}

function toMlsRef(file: any): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `_${file.project}_/l${file.level}/${folder}${file.shortName}${file.extension}`;
}

/**
 * The planner is a freshness check (defs newer than .ts), so a file that was materialized BROKEN is
 * "up to date" forever: its defs never changes again, no run regenerates it, and only the module
 * compile gate of the finalize ever sees it — which is how run cf2 left shared files that failed the
 * gate of run cf3 with errors the run had not caused.
 *
 * The last verify verdict of each phase is already persisted (one file per phase, overwritten by the
 * last round), so a plan can simply believe it: an item the last verdict lists as broken is stale.
 * No module-wide compile inside the plan.
 */
function planMaterialization(candidates: MaterializeCandidate[], force: boolean, brokenPlanIds: Set<string> = new Set()): PlannedMaterializeItem[] {
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
    // dependencyProbeRefs: a page declares the shared-dts ARTIFACT, but what gets scheduled is the
    // shared .ts item — probe both, or a regenerating shared would not re-queue its pages this run.
    const scheduledDep = (item.dependsFiles ?? []).some(dep => dependencyProbeRefs(dep).some(ref => scheduledOutputs.has(ref)));
    const verdictBroken = brokenPlanIds.has(materializePlanId(item));
    const stale = force || scheduledDep || verdictBroken || isStale(defsMs, tsMs, depMs) || (expectsTypecheck && (testMs == null || (defsMs != null && defsMs > testMs)));
    const reason = force
      ? 'forced'
      : tsMs == null
        ? 'output missing'
        : verdictBroken
          ? 'last verify verdict: broken'
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
    // A shared-dts artifact dep also probes its shared .ts: a shared regenerated by the CLI leaves
    // the artifact stale, and the page must still count as "dependency newer than ts".
    for (const ref of dependencyProbeRefs(dep)) {
      const ms = modifiedMs(ref);
      if (ms != null && (newest == null || ms > newest)) newest = ms;
    }
  }
  return newest;
}

function modifiedMs(ref: string): number | null {
  const parsed = parseMlsPath(ref);
  if (!parsed) return null;
  return getFileModified(parsed.project, parsed.level, parsed.folder, parsed.shortName, parsed.extension);
}

function createMaterializePhaseSteps(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, planned: PlannedMaterializeItem[], moduleName = ''): { intents: mls.msg.AgentIntentAddStep[]; terminalPlanIds: string[] } {
  const groups = groupByMaterializePhase(planned);
  const intents: mls.msg.AgentIntentAddStep[] = [];
  // The barrier is the PHASE, never its fan-out. A fan-out completes when the first pass of its items
  // ends; the phase step only completes when fan-out + verify + repair rounds + verify-v2 are done.
  // Depending on the fan-out let register/finalize run the module compile gate while 32 pages were
  // still being repaired (run cf3: the task failed and killed the repair mid-flight), and let a phase
  // start while the previous one was still repairing (run cf2: pages compiled against broken shared).
  let priorPhasePlanIds: string[] = [];
  let terminalPlanIds: string[] = [];

  for (const group of groups) {
    if (group.items.length === 0) continue;
    const phasePlanId = `materialize-phase-${group.phase}`;
    const fanoutPlanId = `${phasePlanId}-fanout`;
    const items = group.items.map(item => ({
      planId: materializePlanId(item.candidate.item),
      defPath: item.candidate.defPath,
      // Tells the slot WHICH item of that defs it builds — see GenStepArgs.itemId.
      itemId: item.candidate.item.id,
    } satisfies GenStepArgs));
    const phase = createAgentStepPayload(
      phasePlanId,
      'agentCfeMaterializePhase',
      group.parentTitle,
      { planId: phasePlanId, fanoutPlanId, title: group.parentTitle, fanoutTitle: group.progressTitle, items, maxParallel: 10, module: moduleName },
      priorPhasePlanIds,
      'sequential',
      priorPhasePlanIds.length > 0 ? 'waiting_dependency' : 'waiting_human_input',
    );
    intents.push(createAddStepIntent(context, parentStep, phase));
    priorPhasePlanIds = [phasePlanId];
    terminalPlanIds = [phasePlanId];
  }

  return { intents, terminalPlanIds };
}

function groupByMaterializePhase(planned: PlannedMaterializeItem[]): Array<{ phase: string; parentTitle: string; progressTitle: string; items: PlannedMaterializeItem[] }> {
  const ordered = [...planned].sort((a, b) => layerRank(a.candidate.item.type) - layerRank(b.candidate.item.type) || a.candidate.item.outputPath.localeCompare(b.candidate.item.outputPath));
  return [
    { phase: 'contracts', parentTitle: 'Materializar contratos', progressTitle: 'Materializar contratos {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_contract') },
    { phase: 'shared', parentTitle: 'Materializar shared', progressTitle: 'Materializar shared {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_shared') },
    // Organisms of a split page come BEFORE the pages: the page imports their render functions, so the
    // phase barrier is what guarantees they exist. Without this phase they would be dropped by the type
    // filter and never generated at all.
    { phase: 'organisms', parentTitle: 'Materializar organismos', progressTitle: 'Materializar organismos {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_page_organism') },
    { phase: 'pages', parentTitle: 'Materializar paginas', progressTitle: 'Materializar paginas {{completed}}/{{total}}, falhas {{failed}}', items: ordered.filter(item => item.candidate.item.type === 'l2_page') },
  ];
}

function materializePlanId(item: PipelineItem): string {
  return materializePlanIdFromPipelineId(item.id);
}
