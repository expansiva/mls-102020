/// <mls fileReference="_102020_/l2/agentNewSolution4/agentNewSolution4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  createNs4E1Step,
  isNs4ModuleToken,
  markNs4E2Running,
  Ns4PipelineState,
  parseNs4Invocation,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  listNs4ModuleFolders,
  ns4FileExists,
  ns4ModuleFile,
  readNs4Pipeline,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import {
  afterNs4E1PromptStep,
  beforeNs4E1ClarificationStep,
  beforeNs4E1PromptStep,
  loadNs4StatusPrompt,
} from '/_102020_/l2/agentNewSolution4/steps/e1/agentNs4E1.js';
import {
  afterNs4E2PromptStep,
  beforeNs4E2ClarificationStep,
  beforeNs4E2PromptStep,
  createNs4E2Step,
} from '/_102020_/l2/agentNewSolution4/steps/e2/agentNs4E2.js';


// === Agent Definition ===
export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution4',
    agentProject: 102020,
    agentFolder: 'agentNewSolution4',
    agentDescription: 'L4 v4 product compiler — module contract and permanent business journeys',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
  };
}

export const NS4_AGENT_BUILD = 'build-3 (2026-08-04) child-owned E1 clarification lifecycle';

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNs4Invocation(userPrompt || '');
  if (!invocation.prompt) {
    return [await statusTask(agent, context, 'Informe o nome ou a descrição do módulo após @@newSolution4.', 'new Solution 4', true)];
  }

  let sourcePrompt = invocation.prompt;
  let resumeModule = '';
  let taskTitle = 'new Solution 4';

  if (isNs4ModuleToken(invocation.prompt) && listNs4ModuleFolders().has(invocation.prompt)) {
    const pipeline = await readNs4Pipeline(invocation.prompt);
    const action = resolveNs4ExistingAction(true, pipeline, ns4FileExists(ns4ModuleFile(invocation.prompt)));
    if (action === 'collision') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${invocation.prompt}" já existe, mas não possui pipeline do agentNewSolution4. Nada foi alterado.`,
        `plan ${invocation.prompt}`,
        true,
      )];
    }
    if (action === 'resume-next') {
      if (pipeline?.steps.e2?.status !== 'approved') {
        return startE2Task(agent, context, pipeline!, invocation.fast);
      }
      return [await statusTask(
        agent,
        context,
        `Módulo "${invocation.prompt}": E1 e E2 já estão aprovados. O próximo passo é e3-ontology, ainda não implementado nesta entrega.`,
        `plan ${invocation.prompt}`,
      )];
    }
    resumeModule = invocation.prompt;
    sourcePrompt = pipeline?.sourcePrompt || invocation.prompt;
    taskTitle = `plan ${invocation.prompt}`;
  }

  return startE1Task(agent, context, sourcePrompt, invocation.fast, resumeModule, taskTitle);
}

function startE1Task(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  sourcePrompt: string,
  fast: boolean,
  resumeModule: string,
  taskTitle: string,
): mls.msg.AgentIntent[] {
  const root: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentNewSolution4 deterministic E1 bootstrap; root LLM skipped.' },
        { type: 'human', content: `Start E1 clarification for ${resumeModule || sourcePrompt}.` },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4',
        flowName: 'agentNewSolution4',
        rootMode: 'e1',
        sourcePrompt,
        ...(fast ? { fastMode: 'true' } : {}),
        ...(resumeModule ? { resumeModule } : {}),
      },
    },
  };
  const child: mls.msg.AgentIntentAddStep = {
    type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1,
    step: createNs4E1Step(),
  };
  return [root, child];
}

async function startE2Task(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  pipeline: Ns4PipelineState,
  fast: boolean,
): Promise<mls.msg.AgentIntent[]> {
  const reviewRound = Math.max(1, pipeline.steps.e2?.reviewRound || 1);
  await writeNs4Pipeline(markNs4E2Running(pipeline, reviewRound));
  const root: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentNewSolution4 deterministic E2 resume bootstrap; root LLM skipped.' },
        { type: 'human', content: `Resume E2 for ${pipeline.moduleName}.` },
      ],
      taskTitle: `plan ${pipeline.moduleName}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4', flowName: 'agentNewSolution4', rootMode: 'e2',
        sourcePrompt: pipeline.sourcePrompt, resumeModule: pipeline.moduleName,
        ...(fast ? { fastMode: 'true' } : {}),
      },
    },
  };
  const child: mls.msg.AgentIntentAddStep = {
    type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1,
    step: createNs4E2Step(pipeline.moduleName, reviewRound),
  };
  return [root, child];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (step.planning?.planId === 'e1-clarification') {
    return beforeNs4E1PromptStep(agent, context, parentStep, step, hookSequential);
  }
  return beforeNs4E2PromptStep(agent, context, parentStep, step, hookSequential, args);
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const planId = step.planning?.planId || '';
  if (planId === 'e1-clarification') {
    return afterNs4E1PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e2-journeys-round-')) {
    return afterNs4E2PromptStep(agent, context, parentStep, step, hookSequential);
  }
  const rootMode = context.task?.iaCompressed?.longMemory?.rootMode;
  if (rootMode === 'e1' || rootMode === 'e2') {
    return [rootStatus(context, parentStep, step, hookSequential, 'completed', `${rootMode.toUpperCase()} bootstrap completed without an LLM call.`)];
  }
  return afterNs4E1PromptStep(agent, context, parentStep, step, hookSequential);
}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const parsed = parseHookJson(json);
  if (parsed?.planId === 'e2-review') {
    return beforeNs4E2ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  return beforeNs4E1ClarificationStep(agent, context, parentStep, step, hookSequential, json);
}

function rootStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', hookSequential, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    stepId: step.stepId, status, traceMsg,
  };
}

function parseHookJson(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  taskTitle = 'new Solution 4',
  isError = false,
): Promise<mls.msg.AgentIntentAddMessageAI> {
  return {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: await loadNs4StatusPrompt(message) },
        { type: 'human', content: message },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4',
        flowName: 'agentNewSolution4',
        statusOnly: 'true',
        statusOutcome: isError ? 'error' : 'info',
      },
    },
  };
}
