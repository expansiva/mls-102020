/// <mls fileReference="_102020_/l2/agents/newModule/agentToBeConceptual2.ts" enhancement="_102027_/l2/enhancementAgent" />

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { finishClarification } from "/_102027_/l2/aiAgentOrchestration.js";


export function createAgent(): IAgentAsync {
  return {
    agentName: "agentToBeConceptual2",
    agentProject: 102020,
    agentFolder: "agents",
    agentDescription: "Improve ToBe conceptual",
    visibility: "private",
    beforePromptImplicit,
    beforePromptStep,
    beforeClarificationStep,
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
        content: system3
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
    systemPrompt: system3
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
  if (payload?.type !== 'clarification' || !payload.json) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)

  return [];

}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: Suggestions
): Promise<HTMLElement> {

  if (!context.task) throw new Error(`[beforeClarificationStep] invalid task: undefined`)

  const intentsToClarification: mls.msg.AgentIntent[] = processOutputToBeConceptual2(agent, context, parentStep, step, hookSequential, json);
  await import('/_102020_/l2/agents/newModule/agentToBeConceptual2Clarification.js');
  const clariEl = document.createElement('agents--new-module--agent-to-be-conceptual2-clarification-102020');
  (clariEl as any).suggestions = json.suggestions;
  (clariEl as any).toBe = JSON.parse(parentStep.prompt || '');

  clariEl.addEventListener('clarification-finish', (e: Event) => {
    const { detail } = e as CustomEvent<{ value: unknown; action: "continue" | "cancel" }>;
    const { value, action } = detail;
    const normalizedValue = `
## Module ToBe
\`\`\`json
    ${parentStep.prompt}
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

function processOutputToBeConceptual2(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  suggestions: Suggestions
): mls.msg.AgentIntent[] {

  console.log("processOutputToBeConceptual2 === Suggestions")
  console.log(JSON.stringify(suggestions, null, 2));

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
"t1, gemini-2.5-pro, 35s, $0.0113, 8.1/10", **business**
"t2, gpt-5.2, 21s, $0.0267, 9/10",
"t3, kimi-2.5, 35s, $0.0050, 7.4/10",
"t4, grok-code-fast-1, 6s, $0.0015, 6.8/10"
*/
const system3 = `
<!-- modelType: codeinstruct --> 
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are a senior BUSINESS Analyst with 20+ years of experience in system design, requirements analysis, and business process optimization.

Your task is to review a generated TO-BE conceptual model and identify between 1 and 20 business improvements.

Focus on gaps, enhancements, or opportunities related to:
- Business capabilities
- Policies and rules
- Customer experience
- Revenue, retention, or operational efficiency

## CRITICAL INSTRUCTIONS
- Each suggestion MUST be a short, business-focused command (imperative form).
- Keep each suggestion under 250 characters.
- Focus ONLY on business value.
- Do NOT mention technical implementation, frameworks, or architecture.
- Do NOT explain the suggestions.
- All field names and keys MUST be in English.,
- All suggestions must be written in the language specified by the "userLanguage" field.

## OPTIONAL SUGGESTIONS
- Some suggestions may represent OPTIONAL or CONFIGURABLE capabilities that can be enabled or disabled by the client via an admin interface.

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`

//#region OutputSection
export type Output3 =
  {
    type: "clarification";
    json: Suggestions;
  }

export interface Suggestions {
  suggestions: Suggestion[];
}
export interface Suggestion {
  suggestion: string;
  customerPerception: string;
  businessImpact: string[];
  requiresConfiguration: boolean; // feature requires user setup in admin console
  yagni: "now" | "soon" | "later" | "no" | "unknown"; // YAGNI (You Ain’t Gonna Need It)
}
//#endregion

