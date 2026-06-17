/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem2/agentImplementsDesignSystem2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Orchestrator (barrier-group model, à la agentNewSolution). Entry: { module, layout, ds }.
//
// beforePromptImplicit → minimal LLM confirmation (validates the request).
// afterPromptStep      → builds the planned tree of child steps with barriers:
//
//   select:<page>  agentSelectGroups2   waiting_human_input   dependsOn []
//   gen:<page>     agentGenDefs2         waiting_dependency    dependsOn [select:<page>]
//   register       agentRegisterGenome2  waiting_dependency    dependsOn [gen:<page> ...all]
//
// The `register` step's barrier (dependsOn every gen step) is how we "know all pages
// finished" — native to the framework, no in-memory tracker needed.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { listWorkItems, DEFAULT_DEVICE } from '/_102020_/l2/dsMatch/derivePaths.js';
import { mkAgentStep, mkFail, makePlanId, type StepArgs } from '/_102020_/l2/agentImplementsDesignSystem2/planning.js';

interface EntryArgs { module: string; layout: number | string; ds: number | string; device?: string; }

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentImplementsDesignSystem2',
    agentProject: 102020,
    agentFolder: 'agentImplementsDesignSystem2',
    agentDescription: 'Apply a design system to a module: derive page{layout}{ds} from page11',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  const { module, layout, ds, device } = JSON.parse(userPrompt) as EntryArgs;
  if (!module || layout == null || ds == null) throw new Error(`(${agent.agentName}) entry needs { module, layout, ds }`);
  const dev = device || DEFAULT_DEVICE;

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: system1 },
        { type: 'human', content: JSON.stringify({ module, layout, ds, device: dev }) },
      ],
      taskTitle: `Implement DS ${ds} (layout ${layout}) on ${module}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { module, layout: String(layout), ds: String(ds), device: dev },
    },
  };

  return [addMessageAI];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  if (!agent || !context || !step) throw new Error(`(${agent.agentName}) [afterPromptStep] invalid params`);

  try {
    const payload = step.interaction?.payload?.[0] as any;
    if (!payload) throw new Error('missing payload');
    if (payload.type === 'result') {
      return [mkFail(context, parentStep, step, hookSequential, String(payload.result || 'confirmation returned an error'))];
    }
    if (payload.type !== 'flexible' || payload.result?.status !== 'ok') {
      return [mkFail(context, parentStep, step, hookSequential, 'design-system request not confirmed')];
    }

    const lm = (context.task?.iaCompressed?.longMemory || {}) as Record<string, string>;
    const module = lm['module'];
    const layout = lm['layout'];
    const ds = lm['ds'];
    const device = lm['device'] || DEFAULT_DEVICE;
    if (!module || layout == null || ds == null) throw new Error('missing run params in longMemory');

    const project = mls.actualProject || 0;
    const pages = listWorkItems(project, module, layout, ds, device).map(i => i.page);
    if (pages.length === 0) throw new Error(`no pages found in ${module}/web/${device}/page11`);

    const baseArgs = (page?: string): StepArgs => ({ module, layout, ds, device, page });
    const genIds = pages.map(p => makePlanId('gen', p));

    const intents: mls.msg.AgentIntentAddStep[] = [];

    // Group A — select groups + resolve + write the new defs (one per page).
    for (const page of pages) {
      intents.push(mkAgentStep(context, step, makePlanId('select', page), `Select: ${page}`,
        'agentSelectGroups2', baseArgs(page), [], 'waiting_human_input', 'parallel_static'));
    }

    // Group B — assemble the final defs (one per page), each waits on its own select.
    for (const page of pages) {
      intents.push(mkAgentStep(context, step, makePlanId('gen', page), `Gen defs: ${page}`,
        'agentGenDefs2', baseArgs(page), [makePlanId('select', page)], 'waiting_dependency', 'parallel_static'));
    }

    // Terminal — register the variation in module.ts ONCE, after EVERY gen completes.
    intents.push(mkAgentStep(context, step, 'register', 'Register module genome',
      'agentRegisterGenome2', baseArgs(), genIds, 'waiting_dependency', 'sequential'));

    return intents;
  } catch (error) {
    const msg = `[${agent.agentName}] ${error instanceof Error ? error.message : String(error)}`;
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

const system1 = `
<!-- modelType: codeinstruct -->

You validate a design-system derivation request. The human message is a JSON object
{ module, layout, ds, device }. If it is a well-formed request to apply a design system
to a module, return ONLY:
{"type":"flexible","result":{"status":"ok"}}

If it is clearly invalid, return ONLY:
{"type":"result","result":"a short reason in the user's language"}

Return valid JSON only. No preamble, no markdown fences.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output =
  | { type: 'flexible'; result: { status: 'ok' } }
  | { type: 'result'; result: string };
//#endregion
