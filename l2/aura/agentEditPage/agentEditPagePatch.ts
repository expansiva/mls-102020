/// <mls fileReference="_102020_/l2/aura/agentEditPage/agentEditPagePatch.ts" enhancement="_blank"/>

// APPLY step of agentEditPage. The model returns the complete methods it changed (tool submitPagePatch); the core
// guards and splices them; the page is written exactly like a Studio edit (editPageIo.commitPageSource: model, local
// copy, compile + live update, the class picker's sequence).
//   refused or not compiling on attempt 1 ⇒ the file is put back and ONE repair step gets the diagnostic;
//   still failing on attempt 2 (or the Studio cannot compile at all) ⇒ the file is put back and the step fails.
// On success the operations are recorded in the defs `history` (request entries; a revert removes its entry), one
// trace JSON is written, and the step completes with `NOTES:{"notes","history","warnings"}`.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { defsHistoryKey, recordDefsHistory, removeDefsHistory } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import {
  EDIT_PAGE_FOLDER, EDIT_PAGE_MAX_ATTEMPTS, EDIT_PAGE_PATCH_AGENT_NAME, applyPagePatch, methodsForOperationFocused, normalizePatch,
  operationHistoryEntry, parseEditPageStepArgs, type EditPageStepArgs, type PagePatch,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import { EDIT_PAGE_PATCH_SYSTEM_PROMPT, EDIT_PAGE_PATCH_TOOL, editPagePatchPrompt, editPagePatchSchema, editPageToolArguments } from '/_102020_/l2/aura/agentEditPage/editPagePrompts.js';
import { addStep, patchStep, promptReady, updateStatus } from '/_102020_/l2/aura/agentEditPage/editPageIntents.js';
import { commitPageSource, editPageStamp, loadEditPageContext, recordInDefsHistory, writeEditPageTrace, type EditPageContext } from '/_102020_/l2/aura/agentEditPage/editPageIo.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: EDIT_PAGE_PATCH_AGENT_NAME, agentProject: 102020, agentFolder: EDIT_PAGE_FOLDER,
    agentDescription: 'Patch the methods of one generated page for approved operations, compile, and record them in the defs history',
    visibility: 'private', beforePromptStep, afterPromptStep,
  };
}

function operationsOf(args: EditPageStepArgs) {
  if (!args.operations?.length) throw new Error('EDIT_PAGE_PATCH_ARGS: no approved operation');
  return args.operations;
}

function methodsByOperation(page: EditPageContext, args: EditPageStepArgs): Record<string, string[]> {
  return Object.fromEntries(operationsOf(args).map(op => [op.id, methodsForOperationFocused(page.outline, op, page.selected?.focus ?? null)]));
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, rawArgs?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseEditPageStepArgs(rawArgs || step.prompt || '');
    const page = await loadEditPageContext(args.project, args);
    const humanPrompt = editPagePatchPrompt({
      pageLabel: page.label, operations: operationsOf(args), methodsByOperation: methodsByOperation(page, args), source: page.source,
      sharedDeclaration: page.sharedDeclaration, tokens: page.tokens, locales: page.locales, history: page.history,
      definition: page.hasDefs ? page.definition : null, selected: page.selected,
      repair: args.diagnostic ? { diagnostic: args.diagnostic, previous: args.previous ?? '' } : undefined,
    });
    return [promptReady(context, parentStep, step, hookSequential, EDIT_PAGE_PATCH_SYSTEM_PROMPT, humanPrompt, {
      name: EDIT_PAGE_PATCH_TOOL, description: 'Return the complete methods you changed, the new texts and one line of notes', parameters: editPagePatchSchema(page.locales),
    })];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let args: EditPageStepArgs;
  try { args = parseEditPageStepArgs(step.prompt || ''); } catch (error) { return [updateStatus(context, parentStep, step, hookSequential, 'failed', String(error))]; }
  const operations = args.operations ?? [];
  let patch: PagePatch | null = null;
  let page: EditPageContext | null = null;
  let original: string | null = null;
  let written = false;
  const fail = async (diagnostic: string, repairable: boolean): Promise<mls.msg.AgentIntent[]> => {
    if (page && original !== null && written) {
      // Put the page back as it was, through the same write: a broken patch never stays.
      await commitPageSource(args.project, page.folder, args.page, original);
    }
    if (repairable && args.attempt < EDIT_PAGE_MAX_ATTEMPTS) {
      const previous = patch ? patch.methods.map(method => method.code).join('\n\n') : '';
      const repair = patchStep({ ...args, attempt: args.attempt + 1, diagnostic, previous });
      return [addStep(context, parentStep.stepId, repair), updateStatus(context, parentStep, step, hookSequential, 'completed', `Repair scheduled: ${diagnostic}`)];
    }
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', `EDIT_PAGE_PATCH_FAILED (attempt ${args.attempt}): ${diagnostic}`)];
  };
  try {
    patch = normalizePatch(editPageToolArguments(step.interaction?.payload?.[0], EDIT_PAGE_PATCH_TOOL));
    if (!patch) return fail('EDIT_PAGE_PATCH_EMPTY: no method was returned', true);
    page = await loadEditPageContext(args.project, args);
    original = page.source;
    const applied = applyPagePatch(original, patch, { operations, tokens: page.tokens, focus: page.selected?.focus ?? null });
    if (!applied.ok) return fail(`EDIT_PAGE_PATCH_REFUSED: ${applied.reason}`, true);
    written = true;
    // Compiles and, when the page is on screen, swaps it (the live update refuses code with errors).
    const { errors, live } = await commitPageSource(args.project, page.folder, args.page, applied.value.code);
    if (errors.length) return fail(`EDIT_PAGE_COMPILE: ${errors.slice(0, 12).join(' | ')}`, true);
    const at = new Date();
    const history = await recordInDefsHistory(args.project, page.folder, args.page, entries => operations.reduce((list, op) => {
      const entry = operationHistoryEntry(op, args.request, at.toISOString());
      return op.revert ? removeDefsHistory(list, defsHistoryKey(entry)) : recordDefsHistory(list, entry);
    }, entries));
    try {
      await writeEditPageTrace(args.project, args, editPageStamp(at), {
        at: at.toISOString(), request: args.request, operations, attempt: args.attempt, touched: applied.value.touched,
        messages: patch.messages.map(message => message.key), warnings: applied.value.warnings, notes: patch.notes, history,
        live: live ?? 'applied', before: original, after: applied.value.code,
      });
    } catch (error) {
      console.warn('[agentEditPage] trace not written:', error);
    }
    const notes = { notes: patch.notes, history, live, warnings: applied.value.warnings };
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `NOTES:${JSON.stringify(notes)}`)];
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error), true);
  }
}
