/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, finalizeGeneratedPages, readUnresolvedMaterializeItems, rewriteMaterializeVerdictsNowClean } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import {
  MAX_MODULE_COMPILE_REPAIRS, compileErrorRef, compileRepairSlotArgs, describeCompileRepairPlan, partitionModuleCompileErrors, planModuleCompileRepair,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeCompileRepair.js';
// `addMessage('@@agent …')` posts a message that spawns a NEW task through the target agent's own
// beforePromptImplicit (no coupling to its internals) — the same handoff agentNewSolution uses to start
// @@changeBackend/@@changeFrontend. The runtime strips the mention before the agent sees the payload
// (aiAgentOrchestration.ts:48), so agentAddLanguage receives exactly its JSON args.
import { addMessage as sendThreadMessage } from '/_102025_/l2/collabMessagesHelper.js';
import { compileMlsPathAndGetErrors, releaseBorrowedModelScope } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { orderModuleCompile } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { agentBuildTrace, readAgentProvenance } from '/_102020_/l2/agentChangeFrontend/helpers/cfeBuildStamp.js';
import { describeCompilerFidelity } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.js';
import { saveCfRunReport } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunDossier.js';
import { buildCfRunReport } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunReport.js';
import { collectRunStepRecords } from '/_102020_/l2/agentChangeFrontend/helpers/cfeRunSteps.js';

const AGENT_NAME = 'agentCfeCreateFinalize';

/**
 * Whole-module compile — the closing gate the frontend lacked.
 *
 * The materialization planner only processes STALE items (defs newer than .ts), and the verify only
 * checks the items of its own fan-out. A .ts that is broken but "up to date" is therefore invisible to
 * this run AND to every later one: 102045 shipped 3 TS7053 errors in projectLifecycleWorkspace.ts on a
 * green run because that file was not stale. changeBackend closed the same hole with a whole-project
 * compile in validate-all (16/jul); this is the frontend equivalent.
 *
 * Compiles every generated .ts of the module, not just what this run touched. Best-effort per file so
 * one unreadable model never hides the rest.
 *
 * CAVEAT: in the Studio this runs on the browser's Monaco worker, whose compilerOptions come from the
 * client's localStorage — a host without `strict` will not report TS7053 here (gap E of
 *, owned elsewhere). The CLI/publish tsc always does.
 */
async function compileModuleClosure(moduleName: string): Promise<{ checked: number; errors: string[]; released: number }> {
  const project = mls.actualProject || 0;
  if (!project || !moduleName) return { checked: 0, errors: [], released: 0 };
  const prefix = `${moduleName}/`;
  const unordered: string[] = [];
  for (const file of Object.values(mls.stor.files) as { project?: number; level?: number; folder?: string; shortName?: string; extension?: string; status?: string }[]) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
    if (file.extension !== '.ts' || !String(file.folder || '').startsWith(prefix)) continue;
    unordered.push(`_${project}_/l2/${file.folder}/${file.shortName}${file.extension}`);
  }
  const refs = orderModuleCompile(unordered);

  const compile = async (ref: string): Promise<string[]> => {
    try {
      return (await compileMlsPathAndGetErrors(ref)).map(error => `${ref}: ${error}`);
    } catch (error) {
      return [`${ref}: compile failed (${error instanceof Error ? error.message : String(error)})`];
    }
  };

  // TWO FULL passes. Pass 1 (in dependency order) exists to LOAD every model; pass 2 is the one whose
  // answers count, because by then the whole module is resident and the per-file compile sees what
  // `tsc -p` sees. Re-checking only the failures — what this did before — catches a false FAILURE but is
  // blind to a false PASS: a file that passed with an unloaded import never enters the suspect set and is
  // never asked again. That is exactly how a real TS2339 reached `done` while the run reported clean.
  // Cost is one extra compile per file, paid once, at the last gate before the module goes to runtime.
  for (const ref of refs) await compile(ref);
  const errors: string[] = [];
  for (const ref of refs) errors.push(...await compile(ref));
  // The whole module is loaded by now (~200 models on a 34-workspace module, enough for Monaco to warn
  // about listeners): give back everything this gate borrowed, in one go, at the end. The count travels
  // in the step trace, never in the console.
  return { checked: refs.length, errors, released: releaseBorrowedModelScope() };
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/finalize',
    agentDescription: 'Mark created frontend owners done after materialization and frontend registration',
    visibility: 'private',
    beforePromptStep,
  };
}

// Fire-and-report: the spawned task is independent, so a dispatch failure is traced and NEVER fails the
// frontend task (the generated artifacts are already on disk and the handoff can be re-sent by hand).
async function dispatchAddLanguage(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string | null): Promise<string> {
  if (!message) return '; addLanguage: not needed (single language)';
  const threadId = context.message?.threadId;
  if (!threadId) return '; addLanguage: SKIPPED (no threadId)';
  try {
    await sendThreadMessage(threadId, message);
    return `; addLanguage: dispatched (${message.slice('@@addLanguage '.length)})`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] addLanguage handoff failed: ${reason}`);
    return `; addLanguage: DISPATCH FAILED (${reason}) — re-send manually: ${message}`;
  }
}

/** Which round this finalize is. 1 on the first pass; a repair round enqueues the next one with attempt+1. */
function readFinalizeAttempt(prompt: string | undefined): number {
  try {
    const parsed = prompt ? JSON.parse(prompt) : null;
    const attempt = parsed && typeof parsed === 'object' ? Number((parsed as Record<string, unknown>).attempt) : NaN;
    return Number.isFinite(attempt) && attempt >= 1 ? Math.floor(attempt) : 1;
  } catch {
    return 1;
  }
}

/** Refs the previous finalize round queued for repair. Empty on the first pass (and on old in-flight tasks). */
function readFinalizeRepairing(prompt: string | undefined): string[] {
  try {
    const parsed = prompt ? JSON.parse(prompt) : null;
    const repairing = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).repairing : null;
    return Array.isArray(repairing) ? repairing.map(value => String(value || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function moduleNameFromRepairing(refs: string[]): string {
  for (const ref of refs) {
    const parts = ref.split('/');
    const l2Index = parts.indexOf('l2');
    const moduleName = l2Index >= 0 ? parts[l2Index + 1] : '';
    if (moduleName && moduleName !== 'trace') return moduleName;
  }
  return '';
}

/** Is there a defs on disk for this ref? A file with no defs has no pipeline item to repair it. */
function defsIsPresent(defPath: string): boolean {
  const match = /^_(\d+)_\/l(\d+)\/(.+)\/([^/]+)\.defs\.ts$/su.exec(defPath);
  if (!match) return false;
  const fileInfo = { project: Number(match[1]), level: Number(match[2]), folder: match[3], shortName: match[4], extension: '.defs.ts' };
  const file = (mls.stor.files as Record<string, { status?: string } | undefined>)[mls.stor.getKeyToFile(fileInfo)];
  return Boolean(file) && file!.status !== 'deleted';
}

/**
 * The repair round of the closing gate: one slot per broken FILE, then a fresh finalize that recompiles.
 *
 * Mirrors the materialize verify -> repair -> verify loop (same agent, same compact args), so nothing new
 * is invented: `agentCfeMaterializeGen` recomputes the compiler errors from disk when `attempt >= 2`,
 * which is why no error text travels in a step prompt.
 */
function buildCompileRepairRound(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  slots: ReturnType<typeof planModuleCompileRepair>['slots'],
  attempt: number,
): mls.msg.AgentIntent[] {
  // Dynamic planIds, unique per round: unlockWaitingDependencySteps only releases on a COMPLETED step
  // per planId, so reusing 'finalize-create' would make the second round wait on the first forever.
  const repairPlanId = `finalize-create-repair-r${attempt}`;
  const nextPlanId = `finalize-create-r${attempt + 1}`;
  const fanout = createAgentStepPayload(
    repairPlanId,
    'agentCfeMaterializeGen',
    `Reparar compile do módulo (rodada ${attempt}): {{completed}}/{{total}}, falhas {{failed}}`,
    { planId: repairPlanId },
    [],
    'parallel_dynamic',
    'in_progress',
    // A provider failure in one slot must not kill the task (flow.json engineInvariants): the slot lands
    // in waiting_after_prompt_with_error, its afterPromptStep completes it with MATERIALIZE-FAILED, and
    // the recompile below is what decides.
    'wait_after_prompt',
  );
  // A parallel_dynamic parent needs its interaction.input initialized before runLLMStepParallel touches it.
  fanout.interaction = {
    input: [{ type: 'system', content: '<!-- modelType: code -->' }],
    cost: 0,
    trace: [`queued ${slots.length} module-compile repair item(s)`],
    payload: null,
  };
  const nextFinalize = createAgentStepPayload(
    nextPlanId,
    AGENT_NAME,
    'Fechar frontend (após repair)',
    { planId: nextPlanId, attempt: attempt + 1, repairing: slots.map(slot => slot.ref) },
    [repairPlanId],
    'sequential',
    'waiting_dependency',
  );
  // Intent ORDER matters (parent auto-completion sweep): open steps first, the completed status last.
  return [
    createAddStepIntent(context, parentStep, fanout, slots.map(slot => compileRepairSlotArgs(slot, repairPlanId, attempt + 1))),
    createAddStepIntent(context, parentStep, nextFinalize),
  ];
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const attempt = readFinalizeAttempt(step.prompt);
    const repairing = readFinalizeRepairing(step.prompt);
    const repairModule = moduleNameFromRepairing(repairing);
    // After a repair round: compile first, rewrite the materialize verdict of the files this round
    // actually fixed (match by outputPath — the slot planId is the ROUND id), THEN read pagesDone.
    let closure: { checked: number; errors: string[]; released: number } | null = null;
    if (attempt > 1 && repairModule) {
      closure = await compileModuleClosure(repairModule);
      const stillBroken = new Set(partitionModuleCompileErrors(closure.errors).blocking.map(compileErrorRef).filter(Boolean));
      await rewriteMaterializeVerdictsNowClean(repairModule, new Set(repairing.filter(ref => !stillBroken.has(ref))));
    }
    const result = await finalizeGeneratedPages();
    // Closing gate: compile the WHOLE module, not just what this run touched (compileModuleClosure).
    const compiled = closure ?? await compileModuleClosure(result.moduleName);
    const incompleteNote = result.incompletePages.length
      ? `; incompletePages=${result.incompletePages.length} (${result.incompletePages.map(page => `${page.pageId}: ${page.reason}`).join(' | ')})`
      : '';
    const base = `pagesDone=${result.pagesDone.length}; ownersDone=${result.ownersDone.length}; skippedPages=${result.skippedPages.length}${incompleteNote}; ${result.configMsg}`;
    const partitioned = partitionModuleCompileErrors(compiled.errors);
    // The materialize verdicts are the gate's suspect list. A suspect the whole-module compile cannot
    // reproduce is NOT absolved by that silence: it is the Monaco-vs-tsc fidelity gap, named here with the
    // error the verify did record. run01 of 102047 closed `completed` with five tsc errors in exactly the
    // three files its own verdict had marked blocked.
    const unreproduced = (await readUnresolvedMaterializeItems(result.moduleName))
      .filter(item => !compiled.errors.some(error => item.outputPath && error.startsWith(`${item.outputPath}:`)));
    const verdictNote = unreproduced.length
      ? `; MATERIALIZE-VERDICT-UNREPRODUCED: ${unreproduced.length} item(s) the materialization verify recorded as blocked that this gate did not reproduce — the shipped .ts of each is the one the publish compiles: ${unreproduced.map(item => `${item.planId} @ ${item.outputPath ?? '(no output)'} — ${item.firstError || 'no error recorded'}`).join(' | ')}`
      : '';
    const declaredNote = partitioned.declared.length
      ? `; declared ${partitioned.declared.length} .test.ts finding(s) (never blocking)`
      : '';
    if (partitioned.blocking.length > 0) {
      // The gate does not loosen — it gets a repair with a budget. A file whose defs is not on disk has no
      // item to regenerate it, so it can only fail, and it is named. `.test.ts` is not in this set.
      const plan = planModuleCompileRepair(partitioned.blocking, defsIsPresent);
      const shown = partitioned.blocking.slice(0, 12).join('\n');
      const more = partitioned.blocking.length > 12 ? `\n…(+${partitioned.blocking.length - 12} more)` : '';
      const fidelity = describeCompilerFidelity();
      const writeDossier = async (summary: string, repairing: boolean): Promise<string | null> => saveCfRunReport(result.moduleName, buildCfRunReport({
        moduleName: result.moduleName,
        attempt,
        final: !repairing,
        pagesDone: result.pagesDone,
        ownersDone: result.ownersDone,
        skippedPages: result.skippedPages,
        repairRounds: attempt - 1,
        gate: { checked: compiled.checked, errors: partitioned.blocking, declared: partitioned.declared, fidelity, repairing },
        agentBuild: await readAgentProvenance(),
        steps: collectRunStepRecords(context.task?.iaCompressed?.nextSteps),
        summary,
      }));
      if (attempt <= MAX_MODULE_COMPILE_REPAIRS && plan.slots.length > 0) {
        const failTrace = `MODULE-COMPILE-FAILED (${partitioned.blocking.length} blocking error(s) across ${compiled.checked} .ts of ${result.moduleName}${declaredNote}${verdictNote}) -> ${describeCompileRepairPlan(plan, attempt)}. ${fidelity}\n${shown}${more}\n${base}`;
        const reportRef = await writeDossier(failTrace, true);
        return [
          ...buildCompileRepairRound(context, parentStep, plan.slots, attempt),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
            reportRef ? `${failTrace} Run report: ${reportRef}.` : failTrace),
        ];
      }
      const why = plan.slots.length === 0
        ? 'no broken file has a defs on disk, so no repair slot can be built'
        : `repair budget exhausted after ${MAX_MODULE_COMPILE_REPAIRS} round(s)`;
      const reportRef = await writeDossier(
        `MODULE-COMPILE-FAILED: ${partitioned.blocking.length} blocking error(s) across ${compiled.checked} .ts of module ${result.moduleName} (${why}). ${fidelity}`,
        false,
      );
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed',
        `MODULE-COMPILE-FAILED: ${partitioned.blocking.length} blocking error(s) across ${compiled.checked} .ts of module ${result.moduleName} (includes files this run did not touch — they are not stale, so only this gate sees them; ${why})${declaredNote}${verdictNote}. ${fidelity}\n${shown}${more}\n${base}${reportRef ? ` Run report: ${reportRef}.` : ''}`)];
    }
    // Only a CLEAN module hands off to agentAddLanguage — it translates the i18n block of the generated
    // files, and translating a module that did not compile spends a task on code about to be regenerated.
    // (It also must not be dispatched once per repair round: the handoff spawns an independent task.)
    const addLanguage = await dispatchAddLanguage(agent, context, result.addLanguageMessage);
    const repaired = attempt > 1 ? `; repaired in ${attempt - 1} round(s)` : '';
    const fidelity = describeCompilerFidelity();
    const agentBuild = await readAgentProvenance();
    // Repeat the build stamp at the end: a post-mortem reads the LAST trace of the run first.
    // Do NOT claim tsc-equivalence: the gate is Monaco; declare the difference (F2).
    const trace = `${base}${addLanguage}; moduleCompile=${compiled.checked} file(s) with no blocking Monaco errors${declaredNote}${verdictNote}${repaired}; ${fidelity}; released ${compiled.released} borrowed model(s)${await agentBuildTrace('[agentCfeCreateFinalize]')}`;
    const reportRef = await saveCfRunReport(result.moduleName, buildCfRunReport({
      moduleName: result.moduleName,
      attempt,
      final: true,
      pagesDone: result.pagesDone,
      ownersDone: result.ownersDone,
      skippedPages: result.skippedPages,
      repairRounds: attempt - 1,
      gate: {
        checked: compiled.checked,
        errors: partitioned.blocking,
        declared: partitioned.declared,
        fidelity,
      },
      agentBuild,
      steps: collectRunStepRecords(context.task?.iaCompressed?.nextSteps),
      summary: trace,
    }));
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed',
      reportRef ? `${trace} Run report: ${reportRef}.` : trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
