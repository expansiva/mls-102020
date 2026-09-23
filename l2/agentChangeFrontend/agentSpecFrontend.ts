/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentSpecFrontend.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgentStepPayload, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { getFileModified, type GenStepArgs } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { isStale } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

/**
 * Batch materialization of the level-2 `.defs.ts` of the CURRENT project, in three ordered waves.
 *
 * It does NOT scan l4, does not touch todoFrontend and does not read `pipeline`: the selection is
 * the stor itself, and the only thing dispatched is `agentCfeMaterializeGen` — the same slot
 * `agentChangeFrontend`'s `only-materialize` uses, here repeated once per wave and chained.
 */

export type SpecWave = 'contracts' | 'shared' | 'pages';

/** contracts -> shared -> pages, the order LAYER_RANK already encodes in cfeMaterializeCore. */
export const WAVE_ORDER: readonly SpecWave[] = ['contracts', 'shared', 'pages'];

const WAVE_TITLE: Record<SpecWave, string> = {
  contracts: 'Materializar contratos',
  shared: 'Materializar shared',
  pages: 'Materializar paginas',
};

/** The number the pipeline already uses inside a phase (agentCfeMaterializeL2.ts:264). */
export const MAX_PARALLEL = 10;

export const SKIP_UP_TO_DATE = 'up to date';
export const SKIP_MAX_VS_MAX = 'MAX vs MAX (ambos com edicao nao salva)';

export type SpecCommand =
  | { kind: 'scan'; scope: string }
  | { kind: 'target'; target: string }
  | { kind: 'error'; reason: string };

export interface SpecDefsFile {
  project: number;
  folder: string;
  shortName: string;
}

export interface SpecQueued { defPath: string; folder: string; }
export interface SpecSkipped { defPath: string; reason: string; }
export interface SpecWavePlan { wave: SpecWave; queued: SpecQueued[]; skipped: SpecSkipped[]; }

export interface SpecPlanResult {
  /** A command error: reported, and NOTHING is executed. */
  error?: string;
  plans: SpecWavePlan[];
  report: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentSpecFrontend',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Materializa em lote os .defs.ts de level 2 do projeto atual, em tres ondas: contracts, shared, paginas.',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

/**
 * The current project, resolved ONCE and never defaulted.
 *
 * `mls.actualProject || 0` — what agentChangeFrontend.ts:133 writes — would be poison here: with
 * `0` the scan matches nothing and the agent would finish "successfully" having done nothing.
 */
export function resolveProject(): number {
  const project = mls.actualProject;
  if (!project) throw new Error('agentSpecFrontend: sem projeto atual');
  return project;
}

/** `{"scope":"..."}` / `{"target":"..."}` after the @@ prefix; anything else is a full scan. */
export function parseSpecCommand(prompt: string): SpecCommand {
  const stripped = String(prompt || '')
    .trim()
    .replace(/^@@(?:agentSpecFrontend|specFrontend)(?:\s+|$)/iu, '')
    .trim();

  if (!stripped.startsWith('{')) return { kind: 'scan', scope: '' };

  let parsed: { scope?: unknown; target?: unknown };
  try {
    parsed = JSON.parse(stripped) as { scope?: unknown; target?: unknown };
  } catch {
    return { kind: 'error', reason: 'agentSpecFrontend: JSON invalido.' };
  }

  const scope = typeof parsed?.scope === 'string' ? parsed.scope.trim() : '';
  const target = typeof parsed?.target === 'string' ? parsed.target.trim() : '';

  if (scope && target) {
    return { kind: 'error', reason: 'agentSpecFrontend: "scope" e "target" nao podem vir juntos. Nada foi executado.' };
  }
  if (target) return { kind: 'target', target };
  return { kind: 'scan', scope };
}

/**
 * Segment match, never raw text: `folder.startsWith(scope)` alone would make `controleChamados`
 * match a future `controleChamadosNovo`.
 */
export function matchesScope(folder: string, scope: string): boolean {
  if (!scope) return true;
  return folder === scope || folder.startsWith(`${scope}/`);
}

/**
 * The wave comes from the LAST segment of `folder`, not from "contains": `contains` would file a
 * future `<module>/shared/web/desktop/page11` under shared. Measured across the five clients
 * (102047..102051), the last segment is always `contracts`, `shared` or `pageNN`.
 */
export function waveOf(folder: string): SpecWave {
  const last = String(folder || '').split('/').filter(Boolean).pop() ?? '';
  if (last === 'contracts') return 'contracts';
  if (last === 'shared') return 'shared';
  return 'pages';
}

export function defPathOf(file: SpecDefsFile): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `_${file.project}_/l2/${folder}${file.shortName}.defs.ts`;
}

/**
 * Every level-2 `.defs.ts` OF THIS PROJECT. The project filter is not a detail: the Studio's
 * `mls.stor.files` carries every dependency of the closure at once, so without it a run on the
 * 102050 would also sweep the 69 level-2 defs of mls-100555 and the 238 of mls-102020.
 *
 * The file is never opened — the selection uses only the IFileInfo fields.
 */
export function selectDefsFiles(project: number, scope = ''): SpecDefsFile[] {
  const selected: SpecDefsFile[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file) continue;
    if (file.project !== project) continue;
    if (file.level !== 2) continue;
    if (file.extension !== '.defs.ts') continue;
    if (file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    if (!matchesScope(folder, scope)) continue;
    selected.push({ project, folder, shortName: String(file.shortName || '') });
  }
  return selected.sort((a, b) => a.folder.localeCompare(b.folder) || a.shortName.localeCompare(b.shortName));
}

/**
 * The time rule, per file: the pair is the `.ts` of the SAME folder, shortName and project.
 * `getFileModified` + `isStale` are reused as they are — the comparison is not rewritten here.
 *
 * `ignoreFreshness` is what `{"target":...}` buys: it materializes regardless, which is the escape
 * hatch for the MAX vs MAX limit below.
 */
export function planWaves(project: number, files: SpecDefsFile[], ignoreFreshness = false): SpecWavePlan[] {
  const byWave = new Map<SpecWave, SpecWavePlan>();
  for (const wave of WAVE_ORDER) byWave.set(wave, { wave, queued: [], skipped: [] });

  for (const file of files) {
    const plan = byWave.get(waveOf(file.folder))!;
    const defPath = defPathOf(file);
    if (ignoreFreshness) {
      plan.queued.push({ defPath, folder: file.folder });
      continue;
    }
    const defsMs = getFileModified(project, 2, file.folder, file.shortName, '.defs.ts');
    const tsMs = getFileModified(project, 2, file.folder, file.shortName, '.ts');
    if (isStale(defsMs, tsMs)) {
      plan.queued.push({ defPath, folder: file.folder });
      continue;
    }
    // Known limit, reported and NOT fixed here (cfeMaterializeCore.ts:1176): with both files
    // dirty, getFileModified answers MAX_SAFE_INTEGER for both and the comparison reads "fresh"
    // forever. Making it visible is the whole point — silently skipping is the damage.
    const bothDirty = defsMs === Number.MAX_SAFE_INTEGER && tsMs === Number.MAX_SAFE_INTEGER;
    plan.skipped.push({ defPath, reason: bothDirty ? SKIP_MAX_VS_MAX : SKIP_UP_TO_DATE });
  }

  return WAVE_ORDER.map(wave => byWave.get(wave)!);
}

export function buildReport(plans: SpecWavePlan[]): string {
  const lines: string[] = ['agentSpecFrontend'];
  const totalQueued = plans.reduce((sum, plan) => sum + plan.queued.length, 0);
  const totalSkipped = plans.reduce((sum, plan) => sum + plan.skipped.length, 0);
  lines.push(`enfileirados: ${totalQueued} | pulados: ${totalSkipped}`);

  for (const plan of plans) {
    if (plan.queued.length === 0 && plan.skipped.length === 0) continue;
    lines.push('', `## ${plan.wave} (${plan.queued.length} enfileirado(s), ${plan.skipped.length} pulado(s))`);
    for (const item of plan.queued) lines.push(`- enfileirado: ${item.defPath}`);
    for (const item of plan.skipped) lines.push(`- pulado (${item.reason}): ${item.defPath}`);
  }

  if (plans.some(plan => plan.skipped.some(item => item.reason === SKIP_MAX_VS_MAX))) {
    lines.push('', 'Um arquivo em MAX vs MAX tem o .defs.ts e o .ts editados e nao salvos — a data nao arbitra.');
    lines.push('Para materializar assim mesmo: @@specFrontend {"target":"<caminho do .defs.ts>"}');
  }
  if (totalQueued === 0) lines.push('', 'Nada a materializar.');
  return lines.join('\n');
}

/** Selection + time rule + report. Throws only when there is no current project. */
export function planSpecFrontend(prompt: string): SpecPlanResult {
  const project = resolveProject();
  const command = parseSpecCommand(prompt);

  if (command.kind === 'error') return { error: command.reason, plans: [], report: command.reason };

  if (command.kind === 'target') {
    const info = mls.stor.convertFileReferenceToFile(command.target) as { project?: number; folder?: string; shortName?: string; extension?: string } | null;
    if (!info || !info.shortName) {
      const reason = `agentSpecFrontend: target invalido: ${command.target}`;
      return { error: reason, plans: [], report: reason };
    }
    // The target is bound to the current project too: materializing inside a closure lib from a
    // client's Studio is not a use case, it is an accident.
    if (info.project !== project) {
      const reason = `agentSpecFrontend: o target pertence ao projeto ${info.project}, nao ao projeto atual ${project}. Nada foi executado.`;
      return { error: reason, plans: [], report: reason };
    }
    const file: SpecDefsFile = { project, folder: String(info.folder || ''), shortName: String(info.shortName) };
    const plans = planWaves(project, [file], true);
    return { plans, report: buildReport(plans) };
  }

  const plans = planWaves(project, selectDefsFiles(project, command.scope));
  return { plans, report: buildReport(plans) };
}

/**
 * One `parallel_dynamic` step per NON-EMPTY wave, chained.
 *
 * The barrier is the wave step itself — wave N+1 depends on wave N's planId, never on an
 * individual item. A wave with nothing queued creates NO step: a `parallel_dynamic` with zero args
 * is a parent that never completes.
 */
export function createWaveIntents(context: mls.msg.ExecutionContext, plans: SpecWavePlan[]): mls.msg.AgentIntentAddStep[] {
  const intents: mls.msg.AgentIntentAddStep[] = [];
  let priorPlanIds: string[] = [];

  for (const plan of plans) {
    if (plan.queued.length === 0) continue;
    const planId = `spec-materialize-${plan.wave}`;
    const step = createAgentStepPayload(
      planId,
      'agentCfeMaterializeGen',
      WAVE_TITLE[plan.wave],
      { planId },
      priorPlanIds,
      'parallel_dynamic',
      priorPlanIds.length > 0 ? 'waiting_dependency' : 'in_progress',
      // A failed materialization reports MATERIALIZE-FAILED instead of killing the task — with N
      // items that stops being a nicety and becomes a requirement.
      'wait_after_prompt',
    ) as mls.msg.AIAgentStep;
    // A parallel_dynamic parent MUST carry its own interaction (createAgentStepPayload does not
    // set one): without it the server throws "Parallel parent step has no interaction" as soon as
    // the first child completes.
    step.interaction = {
      input: [{ type: 'system', content: '<!-- modelType: code -->' }],
      cost: 0,
      trace: [`queued ${plan.queued.length} materialization item(s) — ${plan.wave}`],
      payload: null,
    };

    const args = plan.queued.map(item => JSON.stringify({ planId, defPath: item.defPath } satisfies GenStepArgs));
    intents.push({
      type: 'add-step',
      messageId: '',
      threadId: context.message.threadId,
      taskId: '',
      parentStepId: 1,
      step,
      executionMode: { type: 'parallel', args, maxParallel: MAX_PARALLEL },
    } as mls.msg.AgentIntentAddStep);

    priorPlanIds = [planId];
  }

  return intents;
}

function createReportStep(report: string): mls.msg.AIPayload {
  return createAgentStepPayload('spec-report', 'agentCfeHelp', 'agentSpecFrontend', { reason: report }, [], 'sequential', 'waiting_human_input');
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const raw = userPrompt || context.message.content || '';
  const result = planSpecFrontend(raw);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    // The selection is deterministic — there is no LLM at the root.
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentSpecFrontend deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: raw || 'agentSpecFrontend' },
      ],
      taskTitle: 'agentSpecFrontend',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentSpecFrontend', flowName: 'agentSpecFrontend', version: 'spec-v1' },
    },
  };

  const reportIntent: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: createReportStep(result.report),
  };

  if (result.error) return [addMessageAI, reportIntent];
  return [addMessageAI, reportIntent, ...createWaveIntents(context, result.plans)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${agent.agentName}] task invalid`);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without using the model payload.')];
}
