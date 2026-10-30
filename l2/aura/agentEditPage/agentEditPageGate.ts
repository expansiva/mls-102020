/// <mls fileReference="_102020_/l2/aura/agentEditPage/agentEditPageGate.ts" enhancement="_blank"/>

// PLAN step of agentEditPage: decides whether the request is a change of this page's own file and turns it into
// operations (organism + aspect + change). Refused ⇒ the step fails with the reason, in the person's language.
// Approved ⇒ completes with `PLAN:<operations json>`, which the Studio shows for confirmation. Writes nothing.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  EDIT_PAGE_FOLDER, EDIT_PAGE_GATE_AGENT_NAME, methodsForOperation, normalizeOperations, parseEditPageStepArgs,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import { EDIT_PAGE_GATE_SYSTEM_PROMPT, EDIT_PAGE_GATE_TOOL, editPageGatePrompt, editPageGateSchema, editPageToolArguments } from '/_102020_/l2/aura/agentEditPage/editPagePrompts.js';
import { promptReady, updateStatus } from '/_102020_/l2/aura/agentEditPage/editPageIntents.js';
import { loadEditPageContext } from '/_102020_/l2/aura/agentEditPage/editPageIo.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: EDIT_PAGE_GATE_AGENT_NAME, agentProject: 102020, agentFolder: EDIT_PAGE_FOLDER,
    agentDescription: 'Plan a change of one generated page: refuse what the page file alone cannot do, else list the operations',
    visibility: 'private', beforePromptStep, afterPromptStep,
  };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, rawArgs?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseEditPageStepArgs(rawArgs || step.prompt || '');
    const page = await loadEditPageContext(args.project, args);
    const humanPrompt = editPageGatePrompt({
      request: args.request, pageLabel: page.label, definition: page.definition, outline: page.outline,
      sharedDeclaration: page.sharedDeclaration, history: page.history, selected: page.selected,
    });
    return [promptReady(context, parentStep, step, hookSequential, EDIT_PAGE_GATE_SYSTEM_PROMPT, humanPrompt, {
      name: EDIT_PAGE_GATE_TOOL, description: 'Apply (with the operations) or refuse (with the reason) the requested change', parameters: editPageGateSchema(page.organisms),
    })];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

async function afterPromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseEditPageStepArgs(step.prompt || '');
    const answer = editPageToolArguments(step.interaction?.payload?.[0], EDIT_PAGE_GATE_TOOL) as { verdict?: unknown; reason?: unknown; operations?: unknown } | null;
    if (!answer || (answer.verdict !== 'apply' && answer.verdict !== 'refuse')) throw new Error('EDIT_PAGE_GATE_RESPONSE: no verdict');
    if (answer.verdict === 'refuse') {
      const reason = typeof answer.reason === 'string' && answer.reason.trim() ? answer.reason.trim() : 'The change cannot be made in this page alone.';
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', reason)];
    }
    const page = await loadEditPageContext(args.project, args);
    const { valid, dropped } = normalizeOperations(answer.operations, new Set(page.organisms));
    // An organism no method wraps literally cannot be patched: dropped here, not discovered in the patch.
    const operations = valid.filter(op => methodsForOperation(page.outline, op).length);
    if (!operations.length) {
      const why = [...dropped, ...valid.filter(op => !operations.includes(op)).map(op => `${op.organism}/${op.aspect}: no method wraps it`)];
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', `EDIT_PAGE_NO_OPERATION: nothing on this page matches the request${why.length ? ` (${why.join('; ')})` : ''}`)];
    }
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `PLAN:${JSON.stringify(operations)}`)];
  } catch (error) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
