/// <mls fileReference="_102020_/l2/aura/molecules/agentsManageMolecules/agentMoleculeMaterializeLess.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { appendLongTermMemory } from '/_102027_/l2/aiAgentHelper.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import { convertFileToTag } from '/_102020_/l2/utils';
import { skill as skillMolecule } from '/_102020_/l2/aura/molecules/skills/moleculeGeneration.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';

// Header enforced deterministically so a new molecule can never inherit the `_blank` scaffold header again.
const LESS_ENHANCEMENT = '_102020_/l2/enhancementStyleAura';

export function createAgent(): IAgentAsync {
    return {
        agentName: "agentMoleculeMaterializeLess",
        agentProject: 102020,
        agentFolder: "aura/molecules/agentsManageMolecules",
        agentDescription: "Generates or updates the .less of a molecule from its final .ts and the style contract",
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

    if (!userPrompt || userPrompt.length < 5) throw new Error('invalid prompt');

    const data: IDataPrompt = JSON.parse(userPrompt);
    const { systemPrompt, humanContent } = await preparePrompts(context, data);

    const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
        type: "add-message-ai",
        request: {
            action: 'addMessageAI',
            agentName: agent.agentName,
            inputAI: [{
                type: "system",
                content: systemPrompt
            }, {
                type: "human",
                content: humanContent
            }],
            taskTitle: `Materializing styles...`,
            threadId: context.message.threadId,
            userMessage: context.message.content,
            longTermMemory: { fileReference: data.fileReference }
        }
    };
    return [addMessageAI];
}

async function beforePromptStep(
    agent: IAgentMeta,
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    _step: mls.msg.AIAgentStep,
    hookSequential: number,
    args?: string
): Promise<mls.msg.AgentIntent[]> {

    if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args invalid`);

    const data: IDataPrompt = JSON.parse(args);
    const { systemPrompt, humanContent } = await preparePrompts(context, data);

    const continueIntent: mls.msg.AgentIntentPromptReady = {
        type: "prompt_ready",
        args,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        hookSequential,
        parentStepId: parentStep.stepId,
        humanPrompt: humanContent,
        systemPrompt
    };

    return [continueIntent];
}

async function preparePrompts(context: mls.msg.ExecutionContext, data: IDataPrompt): Promise<{ systemPrompt: string; humanContent: string }> {

    if (!data.fileReference) throw new Error('[agentMoleculeMaterializeLess] missing fileReference');

    const fileReference = normalizeFileReference(data.fileReference);

    const currentTs = await getContentByExtension(fileReference, 'ts');
    if (!currentTs) throw new Error(`[agentMoleculeMaterializeLess] ts not found: ${fileReference}`);
    const currentLess = await getContentByExtension(fileReference, 'less');

    const group = await resolveGroup(context, fileReference, data.group);
    const groupSkill = group ? await getGroupSkill(group) : '';

    const path = mls.stor.getPathToFile(stripExtension(fileReference));
    const tagName = convertFileToTag(path);

    if (context.task) await appendLongTermMemory(context, {
        group,
        fileReference,
        nextPlayground: data.nextPlayground ? 'true' : 'false'
    });

    const systemPrompt = system1
        .replace("{{systemSkillMolecule}}", skillMolecule)
        .replace("{{systemSkillGroup}}", groupSkill || '(no group contract found)')
        .replace(/\{\{tagName\}\}/g, tagName);

    const changeRequest = data.prompt
        ? `## Style change request\nApply the following change to the existing .less, preserving everything else:\n${data.prompt}`
        : `## Task\nNo existing styles to preserve — generate the complete .less body for this molecule from its .ts and the style contract.`;

    const humanContent = `${changeRequest}

## Molecule .ts source (source of truth for the semantic classes)
\`\`\`typescript
${currentTs}
\`\`\`

## Current .less (empty body when the molecule is new)
\`\`\`less
${currentLess || '(no less content yet)'}
\`\`\`
`;

    return { systemPrompt, humanContent };
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
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`);

    let status: mls.msg.AIStepStatus = 'completed';
    let intents: mls.msg.AgentIntent[] = [];

    try {
        intents = await processOutput(context, payload.result);
    } catch (e) {
        console.error(e);
        status = 'failed';
    }

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

async function processOutput(context: mls.msg.ExecutionContext, result: IResult): Promise<mls.msg.AgentIntent[]> {

    const fileReference = context.task?.iaCompressed?.longMemory['fileReference'] || '';
    if (!fileReference) throw new Error('[agentMoleculeMaterializeLess] missing fileReference in memory');

    const finalLess = buildLessWithHeader(fileReference, result.less);

    if (context.isTest) {
        console.info(finalLess);
        return [];
    }

    await writeLess(fileReference, finalLess);

    const nextPlayground = context.task?.iaCompressed?.longMemory['nextPlayground'] === 'true';
    if (!nextPlayground) return [];

    const group = context.task?.iaCompressed?.longMemory['group'] || '';
    const newStep: mls.msg.AgentIntentAddStep = {
        type: "add-step",
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: 1,
        stepTitle: 'Preparing playground',
        step: {
            type: 'agent',
            stepId: 0,
            interaction: null,
            status: 'waiting_human_input',
            nextSteps: [],
            agentName: "agentNewMoleculePlayground",
            prompt: JSON.stringify({ group, fileReference }),
            rags: null,
        }
    };

    return [newStep];
}

// Strip any header the model may have emitted and prepend the correct one deterministically.
function buildLessWithHeader(tsFileReference: string, less: string): string {
    const lessFileReference = stripExtension(tsFileReference) + '.less';
    const header = `/// <mls fileReference="${lessFileReference}" enhancement="${LESS_ENHANCEMENT}"/>`;
    const body = less.replace(/^\s*\/\/\/\s*<mls[^>]*\/>\s*\n?/, '').trimStart();
    return `${header}\n\n${body}\n`;
}

async function writeLess(tsFileReference: string, content: string): Promise<void> {
    // Resolve against the .less reference: convertFileReferenceToFile needs an extension to parse,
    // and the improve-less route passes the molecule reference without one.
    const lessFileReference = stripExtension(tsFileReference) + '.less';
    const fileInfo = mls.stor.convertFileReferenceToFile(lessFileReference);
    if (fileInfo.project < 1) throw new Error(`[agentMoleculeMaterializeLess] invalid fileReference: ${lessFileReference}`);

    const files = await mls.stor.getFiles({ ...fileInfo, loadContent: false });

    // New molecule: the .less was never scaffolded — create it locally (status 'new'), like the .ts/.defs.ts.
    // getOrCreateModel must not hit the github driver for a file that does not exist remotely.
    if (!files.less) {
        const storFile = await createStorFile({
            extension: '.less',
            folder: fileInfo.folder,
            level: fileInfo.level,
            project: fileInfo.project,
            shortName: fileInfo.shortName,
            source: content,
            status: 'new'
        }, true, true, true);

        const model = await storFile.getOrCreateModel();
        if (model) mls.editor.forceModelUpdate(model.model);
        return;
    }

    // Existing .less (improve / re-run): update it.
    // Params go through a variable so the excess-property check does not reject `content` (set via setValue below).
    const params = { ...fileInfo, content, versionRef: new Date().toISOString(), extension: ".less" };
    const file = await mls.stor.addOrUpdateFile(params);
    if (!file) throw new Error('[agentMoleculeMaterializeLess] addOrUpdateFile returned null');

    const models = await file.getOrCreateModel();
    models.model.setValue(content);
}

async function resolveGroup(context: mls.msg.ExecutionContext, fileReference: string, provided?: string): Promise<string> {
    if (provided) return provided;
    const fromMemory = context.task?.iaCompressed?.longMemory['group'];
    if (fromMemory) return fromMemory;

    const path = mls.stor.getPathToFile(stripExtension(fileReference));
    const files = await mls.stor.getFiles({ ...path, loadContent: false });
    if (!files.defs) return '';
    const defsPath = `/_${files.defs.project}_/${files.defs.folder ? files.defs.folder + '/' : ''}${files.defs.shortName}.defs.js`;
    const defs = await import(defsPath);
    return defs?.group || '';
}

async function getGroupSkill(group: string): Promise<string> {
    const path = skillList.find((item) => item.name === group)?.skillReference;
    if (!path) return '';
    const module = await import(path);
    if (!module?.skill || typeof module.skill !== 'string') return '';
    return module.skill;
}

async function getContentByExtension(fileReference: string, ext: 'ts' | 'less' | 'html' | 'defs'): Promise<string> {
    const path = mls.stor.getPathToFile(stripExtension(fileReference));
    const files = await mls.stor.getFiles({ ...path, loadContent: false });
    const file = (files as any)[ext] as mls.stor.IFileInfo | undefined;
    if (!file) return '';
    const source = (await file.getContent()) as string | null;
    return source || '';
}

function stripExtension(fileReference: string): string {
    return fileReference.replace(/\.(ts|less|html|defs\.ts)$/, '');
}

// Ensure the `_NNNNN_` prefix is followed by `/l2/` (callers may pass a bare project prefix), matching sibling agents.
function normalizeFileReference(fileReference: string): string {
    return fileReference.replace(/^(_\d+_)(?!\/l2\/)/, '$1/l2/');
}

const system1 = `
<!-- modelType: design -->

You are a senior Frontend Architect specialized in the collab.codes design system.
Your only job is to produce the **.less** stylesheet for a Lit molecule, derived from its final .ts and the style contract.

## Component tag (top-level selector)
All rules MUST be scoped under this exact selector (no Shadow DOM is used); the ONLY exception is the portal block described below:
\`\`\`
{{tagName}} { /* ... */ }
\`\`\`

## Portal exception (body-level panels)
When the .ts renders a panel into a portal container appended to \`document.body\` (it sets \`portalWidgetName\` and the container gets a \`data-widget\` attribute), the panel lives OUTSIDE \`{{tagName}}\` at runtime. Style the panel classes through a selector list at the TOP LEVEL of the file, as a sibling of the main block:
\`\`\`
{{tagName}} { /* all non-portal rules */ }

{{tagName}},
div[data-widget="{{tagName}}"] { /* portal panel rules only */ }
\`\`\`
NEVER nest the \`div[data-widget="..."]\` block inside \`{{tagName}}\` — nesting compiles to a descendant selector that never matches the body-level portal, leaving the panel unstyled. The \`data-widget\` value is ALWAYS this molecule's own tag (\`{{tagName}}\`), never another molecule's tag.

## RULES
1. Output ONLY the .less content, starting at the top-level selector \`{{tagName}} { ... }\`. Do NOT include the \`/// <mls .../>\` header — it is added automatically.
2. Provide a rule for every semantic class (\`.ml-*\`) used in the molecule's \`render()\`. Do NOT invent classes that are not referenced by the .ts.
3. Layout/utility classes (Tailwind: flex, grid, gap, padding, etc.) stay in the .ts — they must NOT be redeclared in the .less. Only visual/semantic styling belongs here.
4. Use design tokens with fallbacks: \`var(--ml-*, <fallback>)\` — colors, typography, borders, radius, transitions, opacity, etc. Never hardcode raw values without a token.
5. When a style change request is provided, apply ONLY what is asked and preserve every other existing rule untouched.

## Style contract — Molecule Generation Skill
\`\`\`
{{systemSkillMolecule}}
\`\`\`

## Group Contract
\`\`\`
{{systemSkillGroup}}
\`\`\`

## Output format
You must return the object strictly as JSON
[[OutputSection]]
`;

//#region OutputSection
export type Output =
    {
        type: "flexible";
        result: IResult;
    }

interface IResult {
    less: string;
}

interface IDataPrompt {
    fileReference: string;    // molecule .ts fileReference (_NNNNN_/l2/.../ml-x.ts)
    prompt?: string;          // optional style change request; absent => generate from scratch
    group?: string;           // optional; resolved from defs when absent
    nextPlayground?: boolean; // whether to chain the playground agent after writing the .less
}
//#endregion
