/// <mls fileReference="_102020_/l2/agents/agentGenerateAvatarSvg.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAgentStepByAgentName } from '/_102027_/l2/aiAgentHelper.js';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentGenerateAvatarSvg",
        agentProject: 102025,
        agentFolder: "agents",
        agentDescription: "Responsible for creating SVG avatars.",
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

    if (!userPrompt || userPrompt.length < 1) throw new Error('invalid prompt');

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: [{
                type: "system",
                content: system1,
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

    const payload = (step.interaction?.payload?.[0]) as Output;
    if (!payload || !payload.type) throw new Error(`Payload invalid`);
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)

    let status: mls.msg.AIStepStatus = 'completed';

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

    return [updateStatus];

}

export function getPayload(context: mls.msg.ExecutionContext): string {
    if (!context || !context.task) throw new Error(`[getPayload] Invalid context`);
    const agentStep = getAgentStepByAgentName(context.task, 'agentGenerateAvatarSvg'); // Only one agent execution must exist in this task
    if (!agentStep) throw new Error(`[getPayload] no agent found`);
    const resultStep = agentStep.interaction?.payload?.[0];
    if (!resultStep || resultStep.type !== "flexible" || !resultStep.result) throw new Error(`[getPayload] No step flexible found for this agent.`);
    let payload3: string | string = resultStep.result;
    return payload3;
}


const system1 = `
<!-- modelType: code -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->
You are an agent specialized in generating SVG images from natural language descriptions.

You are an agent specialized in generating SVG images from natural language descriptions.

**Objective:**  
Generate valid, self-contained, responsive SVGs ready for use, accurately representing what the user describes.

**Rules and guidelines:**

1. **Output:** Always return **only the SVG code**, without explanations, comments, or additional text.

2. **Responsiveness:**  
   - Include 'viewBox="0 0 WIDTH HEIGHT"' matching the original drawing size (use 200x200 if not specified).  
   - Use 'width="100%" height="100%"' so the SVG adapts to its container.

3. **Supported elements:** '<svg>', '<rect>', '<circle>', '<ellipse>', '<line>', '<polyline>', '<polygon>', '<path>', '<text>', '<defs>', '<linearGradient>', '<radialGradient>'.

4. **Essential attributes:** Use attributes like 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'x', 'y', 'r', 'points', 'd', etc., as needed.

5. **Colors and transparency:**  
   - Use valid CSS colors ('red', '#FF0000', 'rgb(255,0,0)', etc.)  
   - Support 'fill-opacity' and 'stroke-opacity'.

6. **Gradients:** If requested, define them inside '<defs>' and apply with 'fill="url(#gradientId)"' or 'stroke="url(#gradientId)"'.

7. **Position and proportion:**  
   - Support relative positioning ('center', 'top right corner', 'next to') and proportional sizing ('half the square', 'twice the circle').  
   - Maintain drawing order as described (first described elements are rendered underneath).

8. **Text:**  
   - Use '<text>' with 'font-family="sans-serif"', 'font-size="16"' by default, and 'text-anchor="middle"' if centered.  
   - Position text according to the description.

9. Fallback & Creativity: Identify the meaning of the prompt. If the request is vague, meaningless, or lacks clear visual elements (like made-up words), do your best to invent an abstract, colorful, and creative SVG representation based on the "feeling" or sound of the word.

10. **Validation:**  
   - The SVG must be self-contained and render without errors.

11. **Output format:**  
   - Return only the SVG code.

## Output format
You must return the object strictly as JSON, no spaces, no indent, minified
\`\`\`json
{
  type: "flexible",
  result: string
}
\`\`\`
`

export type Output = {
    type: "flexible";
    result: string;
};

