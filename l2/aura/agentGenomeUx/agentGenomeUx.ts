/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/agentGenomeUx.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Genome UX variant agent (TASK-102020-genome-ux-3, part A). Replaces agentImplementGenome for the new defs format:
// for UX N of a module it writes web/<device>/page{N}1/<page>.defs.ts on both devices, in the page11 grammar, with
// the UX template and the molecules chosen again for it (agentDefsL2's group → decision funnel, with the template
// rules as constraints). Contract and receipt: README.md in this folder.
// layout 1 is the base mode (TASK-102020-genome-ux-4): page11 itself is rewritten with the template chosen for UX 1
// (layouts["1"].templates.pages) and molecules chosen again; pages without a choice are left alone.
//
// Entry (JSON, optionally after @@agentGenomeUx): { module, layout: 1..9, pages?: string[], materialize?: boolean, force?: boolean }
//
// Tree (deterministic bootstrap, no root LLM — the same gesture agentDefsL2 and agentMaterializeL2 use):
//   1 (root)                       completes at once
//   genomeUx-dispatch              agentGenomeUxDispatch: page list, reuse check, one worker per pending page
//     genomeUx-<page>-groups-1     agentGenomeUxPage (LLM groups) → decision (LLM molecules) → write + receipt
//     genomeUx-done                result anchor, added by whichever step finds every page of the run fresh
//     genomeUx-materialize         with materialize: agentMaterializeL2 { module, scope: { genome: page{N}1 } }

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { GENOME_UX_AGENT_NAME, GENOME_UX_DISPATCH_AGENT_NAME, GENOME_UX_FOLDER, GENOME_UX_USAGE, genomeUxGenome, parseGenomeUxEntry } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import '/_102020_/l2/aura/agentGenomeUx/agentGenomeUxDispatch.js';
import '/_102020_/l2/aura/agentGenomeUx/agentGenomeUxPage.js';

export function createAgent(): IAgentAsync {
  return { agentName: GENOME_UX_AGENT_NAME, agentProject: 102020, agentFolder: GENOME_UX_FOLDER,
    agentDescription: 'Generate the UX N variant (page{N}1) of a module: page11 with the UX template and molecules chosen for it; UX 1 rewrites page11 with its chosen template', visibility: 'public',
    beforePromptImplicit, beforePromptStep };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const project = Number(mls.actualProject || 0);
  const parsed = parseGenomeUxEntry(userPrompt || context.message.content || '');
  const createTask = (human: string, title: string, memory: Record<string, string>): mls.msg.AgentIntentAddMessageAI => ({
    type: 'add-message-ai', skipRootLLM: true,
    request: { action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentGenomeUx deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: human }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: GENOME_UX_AGENT_NAME, flowName: GENOME_UX_AGENT_NAME, ...memory },
    },
  });
  if (parsed.kind === 'refusal' || !Number.isSafeInteger(project) || project <= 0) {
    const diagnostic = parsed.kind === 'refusal' ? parsed.diagnostic : `GENOME_UX_PROJECT: the current project is unavailable. ${GENOME_UX_USAGE}`;
    return [createTask(diagnostic, 'agentGenomeUx status', { statusOnly: 'true' }), addD2Step(context, 1, d2Result('Status', diagnostic, 'status'), true)];
  }
  const { entry } = parsed;
  const genome = genomeUxGenome(entry.layout);
  const dispatch = {
    type: 'agent', stepId: 0, interaction: null, stepTitle: `UX ${entry.layout} (${genome}) of ${entry.module}`, status: 'waiting_human_input', nextSteps: [],
    agentName: GENOME_UX_DISPATCH_AGENT_NAME, prompt: JSON.stringify({ project, ...entry }), rags: [],
    planning: { planId: 'genomeUx-dispatch', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const title = `genome UX ${entry.layout} of ${entry.module}${entry.pages.length ? ` (${entry.pages.join(', ')})` : ''}`;
  return [createTask(JSON.stringify(entry), title, { project: String(project), module: entry.module, layout: String(entry.layout), genome }), addD2Step(context, 1, dispatch, true)];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === GENOME_UX_AGENT_NAME) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }
  return [updateD2Status(context, parentStep, step, hookSequential, 'failed', `agentGenomeUx steps run through ${GENOME_UX_DISPATCH_AGENT_NAME} and agentGenomeUxPage.`)];
}
