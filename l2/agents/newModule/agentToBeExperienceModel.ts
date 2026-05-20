/// <mls fileReference="_102020_/l2/agents/newModule/agentToBeExperienceModel.ts" enhancement="_102027_/l2/enhancementAgent" />

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { ModuleToBe } from '/_102020_/l2/agents/newModule/agentToBeConceptual.js';
import { getPayloadToBeConceptual3 } from '/_102020_/l2/agents/newModule/agentToBeConceptual3.js';


export function createAgent(): IAgentAsync {
  return {
    agentName: "agentToBeExperienceModel",
    agentProject: 102020,
    agentFolder: "agents/newModule",
    agentDescription: "Generate Experience Model",
    visibility: "private",
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

  if (!userPrompt || userPrompt.length < 5) throw new Error('invalid prompt');

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: "add-message-ai",
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [{
        type: "system",
        content: system1
      }, {
        type: "human",
        content: userPrompt
      }],
      taskTitle: agent.agentDescription,
      threadId: context.message.threadId,
      userMessage: `test ${agent.agentName}`,
      longTermMemory: {},
    }
  };
  return [addMessageAI];

}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string
): Promise<mls.msg.AgentIntent[]> {

  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args invalid`);
  if (!context.task?.PK) throw new Error(`(${agent.agentName})[beforePromptStep] args taskId`);

  const continueIntent: mls.msg.AgentIntentPromptReady = {
    type: "prompt_ready",
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: args,
    systemPrompt: system1
  }

  return [continueIntent];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!agent || !context || !step) throw new Error(`[afterPromptStep] invalid params, agent:${!!agent}, context:${!!context}, step:${!!step}`);
  if (!context.task || !context.task?.PK) throw new Error(`[afterPromptStep] invalid task: undefined`);

  const payload = (step.interaction?.payload?.[0]) as Output || undefined;
  if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`);

  let status: mls.msg.AIStepStatus = 'completed';
  let intents: mls.msg.AgentIntent[] = [];
  try {
    const output = payload.result;
    const toBe = getPayloadToBeConceptual3(context);
    if (!toBe) throw new Error(`[afterPromptStep] invalid moduleToBe: ${payload}`);
    intents = await processOutputToBeExperienceModel(context, toBe, output as ExperienceModel, parentStep);
  } catch (e) {
    console.error(e);
    status = 'failed';
  }

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK,
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    cleaner: 'input_output',
    status
  };
  return [...intents, updateStatus];

}

async function processOutputToBeExperienceModel(context: mls.msg.ExecutionContext, moduleToBe: ModuleToBe, experienceModel: ExperienceModel, parentStep: mls.msg.AIAgentStep): Promise<mls.msg.AgentIntent[]> {

  if (context.isTest) return [];
  const capabilities = moduleToBe.capabilities;
  if (!capabilities) throw new Error(`[afterPromptStep] invalid stack, no capabilities`);

  const capabilities2 = Object.keys(capabilities).map((cap) => {
    const capData = capabilities[cap];
    return {
      capabilityId: cap,
      description: capData.description,
      isOptional: capData.isOptional,
      impliesUI: capData.actions
    }
  });

  const newStep: mls.msg.AgentIntentAddStep = {
    type: "add-step",
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: 1,//parentStep.stepId,
    step:
    {
      type: 'agent',
      stepId: 0,
      interaction: null,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: "agentToBePages",
      prompt: `
## Experience Model
\`\`\`json
${JSON.stringify(experienceModel)}
\`\`\`

## Capabilities Summary
\`\`\`json
${JSON.stringify(capabilities2)}
\`\`\`
    `,
      rags: null,
    }
  };
  return [newStep];

}

/*
"t1, gemini-2.5-pro, 39s, $0.0211, 6/10",
"t2, grok-code-fast-1, 11s, $0.0037, 4/10",
"t3, gpt-5.2, 59s, $0.0727, 7/10",
"t4, moonshotai/kimi-k2.5, 28s, $0.0117, 8/10"
*/
const system1 = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are a senior BUSINESS Analyst with 20+ years of experience in system design, requirements analysis, and business process optimization.

Define screens and journeys required to realize all capabilities.

Screens must represent navigable UI states.
Journeys must represent realistic user navigation flows.

Do not define UI components, layouts, or backend details.

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`

//#region OutputSection
export type Output = {
  type: "flexible";
  result: ExperienceModel;
};
export interface ExperienceModel {
  screens: ExperienceScreen[];
  journeys: Journey[];
}
export interface ExperienceScreen {
  screenId: string;
  actor: "customer" | "staff" | "admin";
  screenType: "page" | "dashboard" | "login" | "editor" | "settings";
  isEntryPoint?: boolean;
  purpose: string;
  supportsCapabilities: string[];
  rulesApplied: string[];
}
export interface Journey {
  journeyId: string;
  actor: "customer" | "staff" | "admin";
  supportsCapabilities: string[];
  steps: JourneyStep[];
}
export interface JourneyStep {
  screenId: string;
  params?: string[]; // ex ["prodId", "catId?"]
}
//#endregion

