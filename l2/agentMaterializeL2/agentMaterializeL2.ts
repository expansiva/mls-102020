/// <mls fileReference="_102020_/l2/agentMaterializeL2/agentMaterializeL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Materializes the frontend of a module from the L2 defs by their intent and commitments (briefing
// mls-102047/materializadorL2.md, 05/10/2026), with the L4 of the module as context:
// contract → shared → desktop/mobile pages → monitor test cases.
// Self-contained: everything it uses is under this folder (helpers/). Since 09/10/2026 it also hosts what the
// aura plugins and the build imported from the old agentMaterializeL2 (helpers/cfe*.ts, nodejsSaveConfigJson.ts).
// This was agentMaterializeL2v4 until 09/10/2026, when it replaced the old agent and took its name.
// Spec: flow.json. Task: mls-base/tasks/planned/TASK-102020-agent-materialize-l2-v4.md.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_AGENT_NAME, M4_HELP, buildM4PlannedSteps, m4ScopeLabel, m4StepIdOf, parseM4MessageInvocation, parseM4StepInvocation } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import '/_102020_/l2/agentMaterializeL2/steps/entry10/agentM4Entry.js';
import '/_102020_/l2/agentMaterializeL2/steps/input20/agentM4Input.js';
import '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.js';
import '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4SharedPage.js';
import '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4ChainPage.js';
import '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.js';
import '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4PagesPage.js';
import '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.js';
import '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4ReviewPage.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2', agentDescription: 'Materialize the L2 frontend from the defs intent and commitments, with the L4 as context', visibility: 'public', beforePromptImplicit, beforePromptStep };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const createTask = (identity: { project: number; module: string } | null, human: string, title: string): mls.msg.AgentIntentAddMessageAI => ({
    type: 'add-message-ai', skipRootLLM: true,
    request: { action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentMaterializeL2 deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: human }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: M4_AGENT_NAME, flowName: M4_AGENT_NAME, ...(identity ? { project: String(identity.project), module: identity.module } : { statusOnly: 'true' }) },
    },
  });
  const invocation = parseM4MessageInvocation(userPrompt || context.message.content || '');
  if (invocation.kind !== 'run') {
    const diagnostic = invocation.kind === 'help' ? M4_HELP : invocation.diagnostic;
    return [createTask(null, diagnostic, 'agentMaterializeL2 status'), addAgentStep(context, 1, agentResult('Status', diagnostic, 'status'), true)];
  }
  const identity = { project: invocation.project, module: invocation.module };
  const label = m4ScopeLabel(invocation.scope);
  return [createTask(identity, invocation.module, `materialize ${invocation.module}${label === 'whole module' ? '' : ` (${label})`}`), ...buildM4PlannedSteps(identity, invocation.scope).map(step => addAgentStep(context, 1, step, true))];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const stepId = m4StepIdOf(step);
  if (stepId) return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', `${stepId} must run through its registered step agent.`)];
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === M4_AGENT_NAME) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }
  const invocation = parseM4StepInvocation(args || step.prompt || '');
  if (invocation.kind === 'refusal') return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  return buildM4PlannedSteps(invocation, invocation.scope).map(planned => addAgentStep(context, step.stepId, planned));
}
