/// <mls fileReference="_102020_/l2/agents/agentNewMolecule.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_100554_/l2/aiAgentBase.js';

import { skill as skillDesing } from '/_102020_/l2/skills/aura/design.js';
import { skill as skillAura } from '/_102020_/l2/skills/aura/overview.js';
import { skill as skillMolecule } from '/_102020_/l2/skills/aura/moleculeGeneration.js';


export function createAgent(): IAgentAsync {
    return {
        agentName: "agentNewMolecule",
        agentProject: 102020,
        agentFolder: "agents",
        agentDescription: "New agent",
        visibility: "public",
        beforePromptAtomic,
        beforePromptImplicit,
        afterPromptStep
    };
}

async function beforePromptAtomic(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    file: mls.stor.IFileInfo,
    userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {


    if (userPrompt) throw new Error(`[beforePromptAtomic] invalid args: '${userPrompt}'`);
    const data = await getMoleculeSkill(file);
    const skillByGroup = await getGroupSkill(data.group);

    console.info({
        skillMolecule: data.skill,
        skillGroup: skillByGroup
    });

    const system2 = `

    ## File Reference : ${data.fileReference}
    
    ## Skill Group: ${data.group}
    \`\`\`
        ${skillByGroup}
    \`\`\`


    `

    const inputs: mls.msg.IAMessageInputType[] = [
        {
            type: "system", content: system1
                .replace("{{systemSkillDesign}}", skillDesing)
                .replace("{{systemSkillAura}}", skillAura)
                .replace("{{systemSkillMolecule}}", skillMolecule)
        },
        { type: "system", content: system2 },
        { type: "human", content: data.skill }
    ]

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: inputs,
            taskTitle: `Generating defs file ${mls.stor.getShortPath(file)}`,
            threadId: context.message.threadId,
            userMessage: context.message.content,
            longTermMemory: {}
        }
    }
    return [addMessageAI];

};

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
                    .replace("{{systemSkillDesign}}", skillDesing)
                    .replace("{{systemSkillAura}}", skillAura)
                    .replace("{{systemSkillMolecule}}", skillMolecule)
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

async function processOutput(context: mls.msg.ExecutionContext, output: string): Promise<mls.msg.AgentIntent[]> {

    console.info(output);
    await updateFiles(context, output);
    return [];
}

async function updateFiles(context: mls.msg.ExecutionContext, molecule: string): Promise<void> {

    const fileReference = molecule.trim().split('\n')[0];
    const tripleSlash = mls.common.tripleslash.parseXMLTripleSlash(fileReference);
    let fileInfo = mls.stor.convertFileReferenceToFile(tripleSlash.variables['fileReference']);
    if (!fileReference || fileInfo.project < 1) throw new Error(`Invalid step in create file, incorrect meta fileRecerence: ${fileReference}`);

    const paramsTs = { ...fileInfo, content: molecule, versionRef: new Date().toISOString(), extension: ".ts" };

    await createStorFile(paramsTs);

}

async function createStorFile(params: { project: number, shortName: string, level: number, folder: string, content: string, extension: string, versionRef: string }): Promise<mls.stor.IFileInfo> {
    const file = await mls.stor.addOrUpdateFile(params);
    if (!file) throw new Error('[agentToBePage] Invalid storFile');
    const path = mls.stor.getKeyToFile(params);
    console.log(`[agentToBePage] creating new file: ${path}`)
    file.status = 'new';
    const fileInfo: mls.stor.IFileInfoValue = {
        content: params.content,
        contentType: 'string',
    };
    file.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(file, fileInfo);
    return file;
}


async function getGroupSkill(group: string) {
    const path = `/_102020_/skills/molecules/${group}.js`;
    const module = await import(path);
    if (!module || !module.skill) throw new Error(`[getGroupSkill] skill for group not found: ${path}`);
    if (typeof module.skill !== 'string') throw new Error(`[getGroupSkill] invalid type of skill: ${path}, must be string`);
    return module.skill;

}
async function getMoleculeSkill(file: mls.stor.IFileInfo): Promise<{ skill: string, group: string, fileReference: string }> {

    const path = `/_${file.project}_/${file.folder ? file.folder + '/' : ''}${file.shortName}.defs.js`;
    const defs = await import(path);
    const fileReference = mls.stor.convertFileToFileReference(file);
    if (!defs) throw new Error(`[getMoleculeSkill] defs not found: ${path}`);
    if (!defs.skill) throw new Error(`[getMoleculeSkill] defs skill not found: ${path}`);
    if (!defs.group) throw new Error(`[getMoleculeSkill] defs group not found: ${path}`);

    return {
        skill: defs.skill,
        group: defs.group,
        fileReference
    }

}


const system1 = `
<!-- modelType: codereasoning-->
<!-- modelTypeList: geminiChat (2.5 pro), code (grok), deepseekchat, codeflash (gemini), deepseekreasoner, mini (4.1) ou nano (openai), codeinstruct (4.1), codereasoning(gpt5), code2 (kimi 2.5) -->

You are a senior Frontend Architect and Staff Software Engineer with 20+ years of experience building large-scale web applications using TypeScript, Lit, and state-driven architectures.

You must generate production-ready code that compiles without errors.
Task: Generate a molecule according the user request.

## Aura Overview
\`\`\`
{{systemSkillAura}}
\`\`\`

## Molecule Skill
\`\`\`
{{systemSkillMolecule}}
\`\`\`

## Desing Skill
\`\`\`
{{systemSkillDesign}}
\`\`\`


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


