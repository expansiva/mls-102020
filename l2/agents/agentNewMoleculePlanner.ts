/// <mls fileReference="_102020_/l2/agents/agentNewMoleculePlanner.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_100554_/l2/aiAgentBase.js';
import { skills as skillList } from '/_102020_/l2/skills/molecules/index';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentNewMolecule",
        agentProject: 102020,
        agentFolder: "agents",
        agentDescription: "New agent",
        visibility: "public",
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
                    .replace("{{ groups }}", JSON.stringify(skillList, null, 2))
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
    if (payload?.type !== 'clarification' || !payload.json) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)
    let status: mls.msg.AIStepStatus = 'completed';
    let intents: mls.msg.AgentIntent[] = [];

    const output = payload.json;

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

You are a planner responsible for defining the creation details of a new web component (widget) that will be included in an HTML page.
Tasks:
Understand the purpose of the widget by analyzing the original user prompt and define technical/functional restrictions and requirements.
If the original prompt is not about creating a web component, return an error asking the user to redo the request.

Identify the most appropriate group for this molecule.

##Avaliables groups
{{ groups }}

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`

//#region OutputSection
export type Output =
    {
        type: "clarification";
        json: TClarification;
    }

export interface TClarification {
    fileReference: string,
    description: string,
    finalPrompt: string,
    group: string,
    functionalRequirements: string[],
    visualRequirements: string[],
}
//#endregion 
