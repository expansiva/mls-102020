/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/agentMaterializeL2v3.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Structure copied from mls-102020/l2/agentDefsL2/agentDefsL2.ts @ 301a76dc.
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addM3Step, m3Result, updateM3Status } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Intents.js';
import { M3_HELP, parseM3MessageInvocation, parseM3StepInvocation, type M3RunIdentity } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { listM3RunDirs, m3NewRunDir } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';
import '/_102020_/l2/agentMaterializeL2v3/steps/entry10/agentM3Entry.js';
import '/_102020_/l2/agentMaterializeL2v3/steps/input20/agentM3Input.js';
import '/_102020_/l2/agentMaterializeL2v3/steps/contracts30/agentM3Contracts.js';
import '/_102020_/l2/agentMaterializeL2v3/steps/finalize90/agentM3Finalize.js';

export const M3_AGENT_NAME = 'agentMaterializeL2v3' as const;

const FLOW: ReadonlyArray<{ planId: 'entry10' | 'input20' | 'contracts30' | 'finalize90'; agentName: string; title: string; dependsOn: string[] }> = [
  { planId: 'entry10', agentName: 'agentM3Entry', title: 'Start materialize run', dependsOn: [] },
  { planId: 'input20', agentName: 'agentM3Input', title: 'Validate defs', dependsOn: ['entry10-done'] },
  { planId: 'contracts30', agentName: 'agentM3Contracts', title: 'Generate contract clients', dependsOn: ['input20-done'] },
  { planId: 'finalize90', agentName: 'agentM3Finalize', title: 'Validate run', dependsOn: ['contracts30-done'] },
];

export function createAgent(): IAgentAsync {
  return { agentName: M3_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2v3', agentDescription: 'Materialize the frontend of a module from its agentDefsL2 defs', visibility: 'public', beforePromptImplicit, beforePromptStep };
}

export function buildM3PlannedSteps(identity: M3RunIdentity & { runDir: string }): mls.msg.AIAgentStep[] {
  const prompt = JSON.stringify({ project: identity.project, module: identity.module, pages: identity.pages, devices: identity.devices, runDir: identity.runDir });
  return FLOW.map(item => ({
    type: 'agent', stepId: 0, interaction: null, stepTitle: item.title,
    status: item.dependsOn.length ? 'waiting_dependency' : 'waiting_human_input',
    nextSteps: [], agentName: item.agentName, prompt, rags: [],
    planning: { planId: item.planId, dependsOn: [...item.dependsOn], executionMode: 'sequential', executionHost: 'client' },
  }) as mls.msg.AIAgentStep);
}

function m3StepIdOf(step: mls.msg.AIAgentStep): string {
  const planId = String(step.planning?.planId || '');
  return FLOW.some(item => item.planId === planId) ? planId : '';
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const createTask = (memory: Record<string, string>, human: string, title: string): mls.msg.AgentIntentAddMessageAI => ({
    type: 'add-message-ai', skipRootLLM: true,
    request: { action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentMaterializeL2v3 deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: human }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: M3_AGENT_NAME, flowName: M3_AGENT_NAME, ...memory },
    },
  });
  const statusOnly = (text: string): mls.msg.AgentIntent[] => [createTask({ statusOnly: 'true' }, text, 'agentMaterializeL2v3 status'), addM3Step(context, 1, m3Result('Status', text, 'status'), true)];
  const invocation = parseM3MessageInvocation(userPrompt || context.message.content || '');
  if (invocation.kind === 'help') return statusOnly(M3_HELP);
  if (invocation.kind === 'refusal') return statusOnly(invocation.diagnostic);
  let runDir: string;
  try {
    runDir = m3NewRunDir(new Date(), listM3RunDirs(mls.stor.files as never, invocation.project, invocation.module));
  } catch (error) {
    return statusOnly(error instanceof Error ? error.message : String(error));
  }
  const identity = { project: invocation.project, module: invocation.module, pages: invocation.pages, devices: invocation.devices, runDir };
  return [
    createTask({ project: String(identity.project), module: identity.module, runDir }, identity.module, `materialize ${identity.module}`),
    ...buildM3PlannedSteps(identity).map(step => addM3Step(context, 1, step, true)),
  ];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const stepId = m3StepIdOf(step);
  if (stepId) {
    const invocation = parseM3StepInvocation(step.prompt || '', Number(mls.actualProject || 0));
    if (invocation.kind === 'refusal') return [updateM3Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
    return [updateM3Status(context, parentStep, step, hookSequential, 'failed', `${stepId} must run through its registered step agent.`)];
  }
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === M3_AGENT_NAME) {
    return [updateM3Status(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }
  void args;
  return [];
}
