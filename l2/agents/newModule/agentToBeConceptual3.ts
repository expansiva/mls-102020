/// <mls fileReference="_102020_/l2/agents/newModule/agentToBeConceptual3.ts" enhancement="_102027_/l2/enhancementAgent" />

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllAgentStepByAgentName, appendLongTermMemory } from '/_102027_/l2/aiAgentHelper.js';
import { outputPrompt, Output, ModuleToBe } from '/_102020_/l2/agents/newModule/agentToBeConceptual.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';
import { updateVariableJson } from '/_102027_/l2/defsAST.js';


export function createAgent(): IAgentAsync {
  return {
    agentName: "agentToBeConceptual3",
    agentProject: 102020,
    agentFolder: "agents/newModule",
    agentDescription: "Apply suggestions",
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

  const inTest = true;
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: "add-message-ai",
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [{
        type: "system",
        content: system3.replace("{{outputPrompt}}", outputPrompt)
      }, {
        type: "human",
        content: userPrompt
      }],
      taskTitle: agent.agentDescription,
      threadId: context.message.threadId,
      userMessage: inTest ? `test ${agent.agentName}` : agent.agentDescription,
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
    systemPrompt: system3.replace("{{outputPrompt}}", outputPrompt)
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

  const payload = (step.interaction?.payload?.[0]) as Output || undefined;
  if (payload?.type === 'result') throw new Error(`[afterPromptStep] Error: #{payload?.result} `);
  if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)
  let status: mls.msg.AIStepStatus = 'completed';
  let intents: mls.msg.AgentIntent[] = [];

  if (context.isTest) return [];

  try {
    const output = payload.result;
    const prompt = step.prompt || '';
    const info = extractInfoFromPrompt(prompt)
    intents = await processOutputToBeConceptual3(info.agentName || '', context, output as ModuleToBe);
  } catch (e) {
    console.error(e);
    status = 'failed';
  }

  if (context.isTest) return [];

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    cleaner: 'input',
    status
  };

  return [...intents, updateStatus];

}

async function processOutputToBeConceptual3(fromAgent: string, context: mls.msg.ExecutionContext, moduleToBe: ModuleToBe): Promise<mls.msg.AgentIntent[]> {

  console.log("processOutputToBeConceptual3 === ModuleToBe");
  console.log({ fromAgent });
  console.log(JSON.stringify(moduleToBe, null, 2));

  if (!fromAgent) throw new Error(`[processOutputToBeConceptual3] invalid fromAgent: ${fromAgent}`)

  if (context.isTest) return [];
  if (fromAgent === 'agentToBeUserJourney') {

    await configModule(context);

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
        agentName: "agentToBeExperienceModel",
        prompt: JSON.stringify(moduleToBe),
        rags: null,
      }
    };
    return [newStep];
  }

  if (fromAgent === 'agentToBeConceptual2') {
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
        agentName: "agentToBeUserJourney",
        prompt: moduleToBe.meta.userPromptFinal,
        rags: null,
      }
    };
    return [newStep];
  }

  return [];


}

async function configModule(context: mls.msg.ExecutionContext) {
  const moduleTobe: ModuleToBe | undefined = await getPayloadToBeConceptual3(context);
  if (!moduleTobe) return;
  const auraStart = '_102020_start';
  const auraBuild = '_102020_build';
  const auraLiveView = '_102020_collabAuraLiveView';
  const project: number = mls.actualProject as number;
  const moduleName: string = moduleTobe.meta.moduleName;
/*  const res = await addModule(project, moduleName, true);
  if (!res.ok) throw new Error(`[configModule](addModule) ${res.message}`)
  const res2 = await configureMasterFrontEnd(project, auraStart, auraBuild, auraLiveView);
  if (!res2.ok) throw new Error(`[configModule](configureMasterFrontEnd) ${res.message}`)
  const res3 = await saveModuleToBe(project, moduleTobe.meta.moduleName, moduleTobe, undefined);
  if (!res3.ok) throw new Error(`[configModule](saveToBe) ${res.message}`)*/

  await appendLongTermMemory(context, { "moduleName": moduleName });
  const ref = `_${mls.actualProject || 0}_/l2/${moduleName}/module.defs.ts`;
  const info = mls.stor.convertFileReferenceToFile(ref);
  const k = mls.stor.getKeyToFile(info);
  let sf = mls.stor.files[k];


  if (!sf) {
    const param: IReqCreateStorFile = {
      ...info,
      source: updateVariableJson('', 'ontology', moduleTobe)
    }

    sf = await createStorFile(param, false, false, false);
  } else {

    const m = await sf.getOrCreateModel();
    let src = m.model.getValue();
    src = updateVariableJson(src, 'ontology', moduleTobe);
    m.model.setValue(src);

    console.info('passou');

  }


}

export function getPayloadToBeConceptual3(context: mls.msg.ExecutionContext): ModuleToBe | undefined {

  if (!context.task) return undefined;
  const agentName = 'agentToBeConceptual3'
  const agentSteps = getAllAgentStepByAgentName(context.task, agentName); // Only one agent execution must exist in this task
  if (!agentSteps) throw new Error(`[${agentName}] [getPayload] no agent found`);
  const lastConceptual = agentSteps ? agentSteps[agentSteps.length - 1] : undefined;
  if (!lastConceptual) throw new Error(`[afterPromptStep] no find agent:${agentName} with moduleTobe in actual task`);
  const resultStep = lastConceptual.interaction?.payload?.[0];
  if (!resultStep || resultStep.type !== "flexible" || !resultStep.result) throw new Error(`[${agentName}] [getPayload] No step clarification found for this agent.`);
  let payload3: ModuleToBe | string = resultStep.result;
  if (typeof payload3 === "string") payload3 = JSON.parse(payload3) as ModuleToBe;
  return payload3;
}

function extractInfoFromPrompt(text: string) {

  const match = text.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);

  const agentName = match?.[1];
  const prompt = match?.[2];

  return {
    agentName,
    prompt
  }


}

/**
"t1, grok-code-fast-1, 17s, $0.0070, 8.7/10",
"t2, gpt-5.2, 60s, $0.0800, 8.3/10, **json formatting issues**",
"t3, gemini-2.5-pro, 68s, $0.0291, 7.6/10"
 */
const system3 = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat ?/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) ?/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) ?/10, code2 (kimi 2.5) ?/10 -->

You are a senior BUSINESS Analyst with 20+ years of experience in system design, requirements analysis, and business process optimization.

Your task is to UPDATE an existing TO-BE conceptual model by applying a list of user-provided suggestions.

You must:
- Apply ONLY suggestions that are relevant to the TO-BE model.
- Translate each valid suggestion into concrete changes in entities, rules, or capabilities.
- When a suggestion represents an optional or configurable feature, mark the related capability with isOptional = true.
- Do NOT introduce technical or implementation details.
- Do NOT remove existing capabilities unless explicitly required by a suggestion.
- Preserve all existing rules and constraints unless a suggestion clearly extends them.
- Apply only suggestions where yagni = "now".

If the suggestions are invalid, contradictory, or not applicable to the TO-BE model, return an explicit error.

{{outputPrompt}}
`

