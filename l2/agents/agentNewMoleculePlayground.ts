/// <mls fileReference="_102020_/l2/agents/agentNewMoleculePlayground.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skill } from '/_102020_/l2/skills/molecules/playgroundGenerator.js';
import { skills as skillList } from '/_102020_/l2/skills/molecules/index';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentNewMoleculePlayground",
        agentProject: 102020,
        agentFolder: "agents",
        agentDescription: "Agent for playground demonstration molecule",
        visibility: "public",
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

    const data: { group: string, fileReference: string } = JSON.parse(userPrompt);
    console.info({ data });

    const path = mls.stor.getPathToFile(data.fileReference);
    const files = await mls.stor.getFiles({ ...path, loadContent: false });
    if (!files.ts) throw new Error(`(${agent.agentName})[beforePromptStep] invalid file`);
    const source = await getSource(files.ts);
    const usageSkill = await getUsageByGroupSkill(data.group);

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: [{
                type: "system",
                content: system1
                    .replace("{{ skill }}", skill)
                    .replace("{{ usageSkill }}", usageSkill)
            }, {
                type: "human",
                content: `#Molecule Source \n\n \`\`\`typescript \n ${source} \n\`\`\``
            }],
            taskTitle: `Prepare playground`,
            threadId: context.message.threadId,
            userMessage: 'Generate playground',
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

    const data: { group: string, fileReference: string } = JSON.parse(args);
    console.info({ data });

    const path = mls.stor.getPathToFile(data.fileReference);

    const files = await mls.stor.getFiles({ ...path, loadContent: false });
    if (!files.ts) throw new Error(`(${agent.agentName})[beforePromptStep] invalid file`);
    const source = await getSource(files.ts);
    const usageSkill = await getUsageByGroupSkill(data.group);

    const continueIntent: mls.msg.AgentIntentPromptReady = {
        type: "prompt_ready",
        args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        hookSequential,
        parentStepId: parentStep.stepId,
        humanPrompt: `#Molecule Source \n\n \`\`\`typescript \n ${source} \n\`\`\``,
        systemPrompt: system1
            .replace("{{ skill }}", skill)
            .replace("{{ usageSkill }}", usageSkill)
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
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)
    let status: mls.msg.AIStepStatus = 'completed';
    let intents: mls.msg.AgentIntent[] = [];

    const output = payload.result;
    intents = await processOutput(context, output);

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

async function processOutput(context: mls.msg.ExecutionContext, output: IResult): Promise<mls.msg.AgentIntent[]> {

    const fileReference = output.fileReference;
    let fileInfo = mls.stor.convertFileReferenceToFile(fileReference);
    const paramsHtml = { ...fileInfo, content: output.html, versionRef: new Date().toISOString(), extension: ".html" };
    await updateStorFile(paramsHtml);
    return [];
}

async function updateStorFile(params: { project: number, shortName: string, level: number, folder: string, content: string, extension: string, versionRef: string }): Promise<void> {
    const file = await mls.stor.addOrUpdateFile(params);
    if (!file) throw new Error('[agentNewMolecule] Invalid storFile');
    const path = mls.stor.getKeyToFile(params);
    console.log(`[agentNewMolecule] updating file: ${path}`);
    console.log(`[agentNewMolecule] updating content: ${params.content}`);

    const modelDefs = await file.getOrCreateModel();
    modelDefs.model.setValue(params.content);

}

export async function getSource(file: mls.stor.IFileInfo): Promise<string> {
    // change first line to new pattern
    if (!file) throw new Error(`[beforePromptStep] invalid args, file dont exists`)
    const source = (await file.getContent()) as string | null;
    if (typeof source !== 'string' || !source) throw new Error(`[beforePromptAtomic] invalid source`)
    return source;
}

async function getUsageByGroupSkill(group: string) {
    const path = skillList.find((item) => item.name === group)?.skillUsageReference;
    if (!path) throw new Error(`[getGroupSkill] skill for group not found: ${path}`);
    const module = await import(path);
    if (!module || !module.skill) throw new Error(`[getGroupSkill] skill for group not found: ${path}`);
    if (typeof module.skill !== 'string') throw new Error(`[getGroupSkill] invalid type of skill: ${path}, must be string`);
    return module.skill;

}

const system1 = `
<!-- modelType: code-->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

Task: Analyze the provided TypeScript code and produce usage examples for the component according to the following criteria:

# Generate 6 distinct examples, ensuring:
- Variation in attributes (props)
-Different uses of slots (when available)
-A mix of simple and advanced configurations

# The examples must:
-Be realistic and ready to use
-Follow best practices

##Playground Definition
{{ skill }}

##Component Group Usage 
{{ usageSkill }}


## Output format
You must return the object strictly as JSON
export type Output =
    {
        type: "flexible";
        result: IResult;
    }

interface IResult {
    fileReference: string // same ts file
    html: string
}

`

//#region OutputSection
export type Output =
    {
        type: "flexible";
        result: IResult;
    }

interface IResult {
    fileReference: string // same ts file
    html: string
}
//#endregion 


