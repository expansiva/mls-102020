/// <mls fileReference="_102020_/l2/aura/agentManageLanguages/agentAddLanguage.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skill as skilli18n } from '/_102020_/l2/skills/aura/language.js';
import { waitModelIdle } from '/_102027_/l2/libModel.js';
import {
    applyTranslatedI18nBlock, decideQueue, extractI18nBlock,
    isPageCatalogueFileName, isPageCatalogueFolder,
} from '/_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.js';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentAddLanguage",
        agentProject: 102020,
        agentFolder: "aura/agentManageLanguages",
        agentDescription: "New i18n language",
        visibility: "private",
        beforePromptImplicit,
        beforePromptStep,
        afterPromptStep,
    };
}

async function beforePromptImplicit(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {

    const [dataUser] = JSON.parse(userPrompt) as { languages: { code: string, name: string }[], projectId: number, moduleName: string, force?: boolean }[];
    const paths: { languages: string[], fileReference: string }[] = await getPaths(dataUser.languages, dataUser.projectId, dataUser.moduleName, dataUser.force === true);
    if (paths.length === 0) throw new Error('No find files to add language');

    const inputs: mls.msg.IAMessageInputType[] = [{ type: "system", content: system1.replace('{{ skillLanguage }}', skilli18n) }];

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: inputs,
            taskTitle: `Add language`,
            threadId: context.message.threadId,
            userMessage: context.message.content,
            longTermMemory: {},
        },
        executionMode: {
            type: 'parallel',
            args: paths.map((item) => JSON.stringify(item))
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

    if (!args) throw new Error(`[beforePromptStep] args invalid`)
    const data = JSON.parse(args);
    console.info(`===process with args: ${args}`)
    const actuali18n = await getPagei18nBlock(data.fileReference);

    const continueParallel: mls.msg.AgentIntentPromptReady = {
        type: "prompt_ready",
        args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        hookSequential,
        parentStepId: parentStep.stepId,
        humanPrompt: `

        Add languages: ${data.languages}

        ##File Reference: ${data.fileReference}

        ## Actual i18n:
        \`\`\`typescript 
        ${actuali18n}
        \`\`\`
        
        `
    }
    return [continueParallel];

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

    const output: Output = payload;
    intents = await processOutput(context, output.result.i18n, output.result.fileReference);

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

async function getPaths(
    languages: { code: string, name: string }[],
    project: number,
    moduleName: string,
    force = false,
): Promise<{ languages: string[], fileReference: string }[]> {
    if (!project) throw new Error(`[getPaths] invalid project`);
    // Languages are per module — never translate the whole project by accident.
    if (!moduleName) throw new Error(`[getPaths] moduleName is required`);

    const result: { languages: string[], fileReference: string }[] = [];
    const requested = languages.map(lang => lang.code);
    const counters = { scanned: 0, queued: 0, complete: 0, noCatalogue: 0 };

    // The catalogue lives in the PAGES now (and in the organisms of a split page, which share the page
    // folders). The shared no longer emits one, so scanning it would queue nothing at all.
    const pageFiles = Object.values(mls.stor.files).filter((f: mls.stor.IFileInfo) =>
        f.project === project &&
        isPageCatalogueFolder(f.folder, moduleName) &&
        isPageCatalogueFileName(f.shortName, f.extension)
    );

    for (const storFile of pageFiles as mls.stor.IFileInfo[]) {
        // getContent, not getOrCreateModel: this walks ~100 files per module and a model per file is a
        // Monaco resource nobody releases. Translation needs the text, never a compile.
        const content = await storFile.getContent('');
        const source = typeof content === 'string' ? content : '';
        if (!source) continue;
        counters.scanned += 1;

        const decision = decideQueue(source, requested, force);
        if (decision.languages.length === 0) {
            if (decision.reason === 'noCatalogue') counters.noCatalogue += 1; else counters.complete += 1;
            continue;
        }
        counters.queued += 1;
        const fileReference = mls.stor.convertFileToFileReference(storFile);
        result.push({ languages: decision.languages, fileReference });
    }

    console.info(`[agentAddLanguage] ${moduleName}: scanned ${counters.scanned}, queued ${counters.queued}, already translated ${counters.complete}, without catalogue ${counters.noCatalogue}${force ? ' (force)' : ''}`);
    return result;
}


async function getPagei18nBlock(fileReference: string) {

    const path = mls.stor.getPathToFile(fileReference);
    const files = await mls.stor.getFiles({ ...path, loadContent: false });
    if (!files.ts) throw new Error(`[getPagei18nBlock] invalid file: ${fileReference}`);
    const i18nBlock = await geti18nByFile(files.ts);
    return i18nBlock;
}

async function geti18nByFile(stor: mls.stor.IFileInfo) {
    // Reading the text, not creating a model: same reason as getPaths.
    const content = await stor.getContent('');
    const source = typeof content === 'string' ? content : '';
    return extractI18nBlock(source) || '';
}

async function processOutput(context: mls.msg.ExecutionContext, newi18n: string, fileReference: string) {

    if (context.isTest) return [];
    if (!fileReference) throw new Error('[processOutput] Invalid fileReference')
    let fileInfo = mls.stor.convertFileReferenceToFile(fileReference);
    if (!fileReference || fileInfo.project < 1) throw new Error(`[processOutput] Invalid step in create file, incorrect meta fileRecerence: ${fileReference}`);
    const path = mls.stor.getPathToFile(fileReference);
    const files = await mls.stor.getFiles({ ...path, loadContent: false });
    if (!files.ts) throw new Error(`[processOutput] invalid file: ${fileReference}`);
    const modelTS = await files.ts.getOrCreateModel();
    if (!modelTS) throw new Error(`[processOutput] invalid models`);
    const source = modelTS.model.getValue();
    // Guarded: a block that lost a locale const or its parity annotation is rejected instead of written
    // over a good file, and the untranslated markers are consumed here — the translation is what clears
    // them, so this file stops being queued on the next run.
    const newValue = applyTranslatedI18nBlock(source, newi18n);
    const paramsTs = { ...fileInfo, content: newValue, versionRef: new Date().toISOString(), extension: ".ts" };
    await updateStorFile(paramsTs);
    return [];

}

async function updateStorFile(params: { project: number, shortName: string, level: number, folder: string, content: string, extension: string, versionRef: string }): Promise<mls.editor.IModelBase> {

    const file = await mls.stor.addOrUpdateFile(params);
    if (!file) throw new Error('[agentNewMolecule] Invalid storFile');
    const models = await file.getOrCreateModel();
    models.model.pushEditOperations(
        [],
        [{
            range: models.model.getFullModelRange(),
            text: params.content,
        }],
        () => null,
    );

    mls.editor.forceModelUpdate(models.model);
    await waitModelIdle(models);
    return models;

}

const system1 = `
<!-- modelType: translate -->

You are a translation specialist responsible for adding a new i18n language, following the established standard.

{{ skillLanguage }}

## Output format
You must return the object strictly as JSON
[[OutputSection]]

`

//#region OutputSection
export type Output =
    {
        type: "flexible";
        result: Result;
    }

export type Result = {
    i18n: string,
    fileReference: string // same prompt
}
//#endregion 

