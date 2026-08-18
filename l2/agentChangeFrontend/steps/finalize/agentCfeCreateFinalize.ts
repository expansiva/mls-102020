/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, finalizeGeneratedPages } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
// `addMessage('@@agent …')` posts a message that spawns a NEW task through the target agent's own
// beforePromptImplicit (no coupling to its internals) — the same handoff agentNewSolution uses to start
// @@changeBackend/@@changeFrontend. The runtime strips the mention before the agent sees the payload
// (aiAgentOrchestration.ts:48), so agentAddLanguage receives exactly its JSON args.
import { addMessage as sendThreadMessage } from '/_102025_/l2/collabMessagesHelper.js';
import { compileMlsPathAndGetErrors, releaseBorrowedModelScope } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { orderModuleCompile } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';

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
 * todo/changeFrontend/bug_typescript.md, owned elsewhere). The CLI/publish tsc always does.
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
    agentName: 'agentCfeCreateFinalize',
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

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const result = await finalizeGeneratedPages();
    // Last step of the task: when the module declares more than one language, hand off to agentAddLanguage
    // as an INDEPENDENT task. It translates only the i18n block of each generated shared file (cheap
    // translate model), so nothing here is regenerated. Null when the module is single-language — then no
    // extra task is created at all.
    const addLanguage = await dispatchAddLanguage(agent, context, result.addLanguageMessage);
    // Closing gate: compile the WHOLE module, not just what this run touched (see compileModuleClosure).
    const closure = await compileModuleClosure(result.moduleName);
    const base = `pagesDone=${result.pagesDone.length}; ownersDone=${result.ownersDone.length}; skippedPages=${result.skippedPages.length}; ${result.configMsg}${addLanguage}`;
    if (closure.errors.length > 0) {
      // FAIL the run. A green task with broken .ts on disk is exactly the defect this gate exists for:
      // the file is not stale, so no later run would look at it either.
      const shown = closure.errors.slice(0, 12).join('\n');
      const more = closure.errors.length > 12 ? `\n…(+${closure.errors.length - 12} more)` : '';
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed',
        `MODULE-COMPILE-FAILED: ${closure.errors.length} error(s) across ${closure.checked} .ts of module ${result.moduleName} (includes files this run did not touch — they are not stale, so only this gate sees them).\n${shown}${more}\n${base}`)];
    }
    const trace = `${base}; moduleCompile=${closure.checked} file(s) clean; released ${closure.released} borrowed model(s)`;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
