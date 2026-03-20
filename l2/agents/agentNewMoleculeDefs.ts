/// <mls fileReference="_102020_/l2/agents/agentNewMoleculeDefs.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_100554_/l2/aiAgentBase.js';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentNewMoleculeDefs",
        agentProject: 102020,
        agentFolder: "agents",
        agentDescription: "Define molecule defs with skill to creation",
        visibility: "private",
        beforePromptImplicit,
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
                content: context.message.content
            }],
            taskTitle: `Test 1`,
            threadId: context.message.threadId,
            userMessage: context.message.content,
        }
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


    if (!agent || !context || !step) throw new Error(`[afterPromptStep] invalid params, agent:${!!agent}, context:${!!context}, step:${!!step}`);

    const payload = (step.interaction?.payload?.[0]);
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)
    let status: mls.msg.AIStepStatus = 'completed';
    let intents: mls.msg.AgentIntent[] = [];

    const output = payload.result;

    console.info(output)

    const updateStatus: mls.msg.AgentIntentUpdateStatus = {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep.stepId,
        stepId: step.stepId,
        status
    };

    return [...intents, updateStatus];

}



const system1 = `
<!-- modelType: codereasoning-->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

You are a planner responsible for defining a \`skill.md\`.

Your goal is to describe ONLY the functional requirements of the molecule.

Follow this structure:

# Objective
A clear description of what the molecule does from a user or system perspective.

# Responsibilities
- Describe observable behaviors only
- Focus on what the molecule must do, not how

# Constraints
- Define rules, limitations, and expected behaviors
- Prevent invalid states or misuse

# Notes
- Optional clarifications about behavior

Strict rules:
- DO NOT include implementation details
- DO NOT mention code, frameworks, or technical solutions
- DO NOT describe how something should be built
- Focus only on behavior and expected outcomes
- Use simple and clear language
- Keep items concise and functional

If any implementation detail is included, remove it and rewrite.

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`

//#region OutputSection
export type Output =
    {
        type: "flexible";
        result: string;
    }

//#endregion 
