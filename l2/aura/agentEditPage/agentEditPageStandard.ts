/// <mls fileReference="_102020_/l2/aura/agentEditPage/agentEditPageStandard.ts" enhancement="_blank"/>

// STANDARD step of agentEditPage: for a request asked of several pages, decides ONCE the exact values every page must
// use (the rules), so each page's own plan and patch cannot pick values of their own. Reads the reference page whole,
// the pages the request names whole, and the outline of the others. Completes with `STANDARD:<json>`; writes nothing.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  EDIT_PAGE_FOLDER, EDIT_PAGE_STANDARD_AGENT_NAME, normalizeStandard, pageOutline, parseEditPageStepArgs,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import {
  EDIT_PAGE_STANDARD_SYSTEM_PROMPT, EDIT_PAGE_STANDARD_TOOL, editPageStandardPrompt, editPageStandardSchema, editPageToolArguments, pagesNamedIn,
} from '/_102020_/l2/aura/agentEditPage/editPagePrompts.js';
import { promptReady, updateStatus } from '/_102020_/l2/aura/agentEditPage/editPageIntents.js';
import { loadBatchSources, loadEditPageContext } from '/_102020_/l2/aura/agentEditPage/editPageIo.js';

/** Pages read whole because the request names them: the values the person points at; more would crowd the prompt. */
const MAX_NAMED_PAGES = 2;

export function createAgent(): IAgentAsync {
  return {
    agentName: EDIT_PAGE_STANDARD_AGENT_NAME, agentProject: 102020, agentFolder: EDIT_PAGE_FOLDER,
    agentDescription: 'Decide the exact values every page of a batch change must use, once, before any page is planned',
    visibility: 'private', beforePromptStep, afterPromptStep,
  };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, rawArgs?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseEditPageStepArgs(rawArgs || step.prompt || '');
    const page = await loadEditPageContext(args.project, args);
    const others = await loadBatchSources(args.project, page.folder, args.batch);
    const asked = [args.request, ...args.adjust].join('\n');
    const named = new Set(pagesNamedIn(asked, others.map(item => item.page)).slice(0, MAX_NAMED_PAGES));
    const humanPrompt = editPageStandardPrompt({
      request: args.request, adjust: args.adjust, previous: args.standard, pageLabel: page.label, source: page.source,
      named: others.filter(item => named.has(item.page)),
      others: others.filter(item => !named.has(item.page)).map(item => ({ page: item.page, outline: pageOutline(item.source) })),
      tokens: page.tokens,
    });
    return [promptReady(context, parentStep, step, hookSequential, EDIT_PAGE_STANDARD_SYSTEM_PROMPT, humanPrompt, {
      name: EDIT_PAGE_STANDARD_TOOL, description: 'The exact values every page must use', parameters: editPageStandardSchema(),
    })];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const answer = editPageToolArguments(step.interaction?.payload?.[0], EDIT_PAGE_STANDARD_TOOL) as { rules?: unknown } | null;
    const standard = normalizeStandard({ rules: answer?.rules });
    if (!standard.ok) throw new Error(`EDIT_PAGE_STANDARD_RESPONSE: the standard ${standard.reason}`);
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `STANDARD:${JSON.stringify(standard.value ?? { rules: [] })}`)];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
