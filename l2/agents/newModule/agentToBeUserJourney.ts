/// <mls fileReference="_102020_/l2/agents/newModule/agentToBeUserJourney.ts" enhancement="_102027_/l2/enhancementAgent" />

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { finishClarification } from "/_102027_/l2/aiAgentOrchestration.js";
import { getPayloadToBeConceptual3 } from '/_102020_/l2/agents/newModule/agentToBeConceptual3.js';


export function createAgent(): IAgentAsync {
  return {
    agentName: "agentToBeUserJourney",
    agentProject: 102020,
    agentFolder: "agents/newModule",
    agentDescription: "Generate User Journeys",
    visibility: "private",
    beforePromptImplicit,
    afterPromptStep,
    beforePromptStep,
    beforeClarificationStep
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

  const continueIntent: mls.msg.AgentIntentPromptReady = {
    type: "prompt_ready",
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: args || '',
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

  const payload = (step.interaction?.payload?.[0]);
  if (payload?.type !== 'clarification' || !payload.json) throw new Error(`[afterPromptStep] invalid payload: ${payload}`);
  return [];

}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: UserJourneyMap
): Promise<HTMLElement> {

  if (!context.task) throw new Error(`[beforeClarificationStep] invalid task: undefined`)

  const intentsToClarification: mls.msg.AgentIntent[] = processOutputToBeUserJourney(agent, context, parentStep, step, hookSequential, json);
  const moduleToBe = getPayloadToBeConceptual3(context);
  if (!moduleToBe) throw new Error(`[beforeClarificationStep] invalid moduleToBe: undefined`)

  await import('/_102020_/l2/agents/newModule/agentToBeConceptual2Clarification.js');
  const clariEl = document.createElement('agents--new-module--agent-to-be-conceptual2-clarification-102020');
  (clariEl as any).suggestions = json.suggestions;
  (clariEl as any).toBe = moduleToBe;

  clariEl.addEventListener('clarification-finish', (e: Event) => {
    const { detail } = e as CustomEvent<{ value: unknown; action: "continue" | "cancel" }>;
    const { value, action } = detail;
    const normalizedValue = `
## Module ToBe
\`\`\`json
    ${moduleToBe ? JSON.stringify(moduleToBe) : ''}
\`\`\`

## Suggestions
\`\`\`json
    ${JSON.stringify(value, null, 2)}
\`\`\`
  `
    finishClarification(
      agent,
      step.stepId,
      parentStep.stepId,
      intentsToClarification,
      context,
      normalizedValue,
      action
    );
  });

  return clariEl;

}


function processOutputToBeUserJourney(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  userJourneyMap: UserJourneyMap
): mls.msg.AgentIntent[] {

  console.log("processOutputToBeUserJourney === User journeys")
  console.log(JSON.stringify(userJourneyMap, null, 2));

  let status: mls.msg.AIStepStatus = 'completed';

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    cleaner: 'input_output',
    status
  };

  const updateStatusAgent: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: 1,
    stepId: parentStep.stepId,
    cleaner: 'input',
    status: 'completed'
  };

  const newStep: mls.msg.AgentIntentAddStep = {
    type: "add-step",
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: 1,
    step:
    {
      type: 'agent',
      stepId: 0,
      interaction: null,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: "agentToBeConceptual3",
      prompt: `[${agent.agentName}] {{clarification}}`,
      rags: null,
    }
  };

  const intents: mls.msg.AgentIntent[] = [newStep, updateStatusAgent, updateStatus];
  return intents;

}

/*
"t1, grok-code-fast-1, 6s, $0.0013, 6.2/10",
"t2, gpt-5.2, 42s, $0.0377, 8.9/10",
"t3, gemini-2.5-pro, 35s, $0.0094, 7.4/10"
*/
const system1 = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are a senior BUSINESS Analyst with 20+ years of experience in system design, requirements analysis, and business process optimization.

Your task is to describe all user and admin journeys based on the user's initial prompt.

Limit the journeys to interactions that are visible or meaningful at the website or admin UI level.
Do NOT include platform infrastructure or internal technical operations.

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`

//#region OutputSection
export type Output =
  {
    type: "clarification";
    json: UserJourneyMap;
  };
export interface UserJourneyMap {
  journeys: Journey[];
  considerations: string[]; // optional
  suggestions: Suggestion[];
}
export interface Journey {
  persona: string;
  goal: string;
  journey: string[];
}
export interface Suggestion {
  suggestion: string;
  customerPerception: string;
  businessImpact?: (
    | "customer_experience"
    | "revenue"
    | "operational_efficiency"
    | "maintainability"
    | "scalability"
    | string // others
  )[];
  confidence?: number; // 0.0 to 1.0
  requiresConfiguration: boolean; // feature requires user setup in admin console
  yagni: "now" | "soon" | "later" | "no" | "unknown"; // YAGNI (You Ain’t Gonna Need It)
}
//#endregion

