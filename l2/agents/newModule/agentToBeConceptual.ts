/// <mls fileReference="_102020_/l2/agents/newModule/agentToBeConceptual.ts" enhancement="_102027_/l2/enhancementAgent" />

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: "agentToBeConceptual",
    agentProject: 102020,
    agentFolder: "agents/newModule",
    agentDescription: "Create New ToBe Conceptual",
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
  const inTest = true; // todo: resolve

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: "add-message-ai",
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [{
        type: "system",
        content: system2.replace("{{outputPrompt}}", outputPrompt)
      }, {
        type: "human",
        content: userPrompt
      }],
      taskTitle: agent.agentDescription,
      threadId: context.message.threadId,
      userMessage: inTest ? `test ${agent.agentName}` : 'defining ToBe conceptual',
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
    systemPrompt: system2.replace("{{outputPrompt}}", outputPrompt)
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
  if (payload?.type === "result") {
    throw new Error(payload?.result);
  }
  if (payload?.type !== 'flexible' || !payload.result) throw new Error(`[afterPromptStep] invalid payload: ${payload}`)
  let status: mls.msg.AIStepStatus = 'completed';
  let intents: mls.msg.AgentIntent[] = [];

  try {
    const output = payload.result;
    intents = await processToBeConceptual(context, output as ModuleToBe);
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
    cleaner: 'input_output',
    status
  };
  return [...intents, updateStatus];

}

async function processToBeConceptual(context: mls.msg.ExecutionContext, moduleToBe: ModuleToBe): Promise<mls.msg.AgentIntent[]> {

  console.log("=== processToBeConceptual new")
  console.log(JSON.stringify(moduleToBe, null, 2));

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
      agentName: "agentToBeConceptual2",
      prompt: JSON.stringify(moduleToBe, null, 2),
      rags: null,
    }
  };

  return [newStep];

}

/**
  "t1, gemini-2.5-flash, 4/10",
  "t2, gemini-2.5-pro, 7/10",
  "t3, gpt-5.2, 9/10",
  "t4, kimi-2.5, 8.5/10"
 */
const system2 = `
<!-- modelType: codeinstruct -->
<!-- modelTypeList: geminiChat (2.5 pro) 7/10 , code (grok) ?/10, deepseekchat ?/10, codeflash (gemini) 4/10, deepseekreasoner ?/10, mini (4.1) ou nano (openai) ?/10, codeinstruct (4.1) ?/10, codereasoning(gpt5) 9/10, code2 (kimi 2.5) 8.5/10 -->

You are a Senior Software Engineer at Collab.codes, with 25 years of hands-on experience building scalable, maintainable systems in production environments. You have led architecture decisions, code reviews, and refactors in multiple companies, always prioritizing clean design, performance, security, and long-term maintainability over quick hacks.

You will receive a user request ("userPrompt") to create a new module, followed by a clarification section containing questions and answers that provide additional context, constraints, requirements, or refinements to the original request.

Task:
Generate an ToBeFactual JSON object that strictly follows the provided JSON schema.

## Details
[[Constraints]]

{{outputPrompt}}

`

export const outputPrompt = `
## Output format
You must return the object strictly as JSON
[[OutputSection]]

[[Defs1]]
`;

//#region Constraints
const constraints = [
  'Output MUST be valid JSON only.',
  'NO indentation, NO newlines except when strictly required by JSON syntax.',
  'NO extra spaces or whitespace.',
  "All field names and keys MUST be in English.",
  "All descriptions and string values MUST be written in the language specified by the 'userLanguage' field.",
  "All relevant information provided by the user in their answers MUST be converted into explicit 'rules' in the output. Always summarize and register them as clear, permanent rules.",
  "The 'moduleName' field MUST follow camelCase format (e.g., 'myModuleName') and MUST NOT contain hyphens ('-'), underscores ('_'), or spaces.",
  "The 'ui.visualStyle' field MUST be populated from the user's answer to the visual style question in the clarification. Use the exact value the user chose."
];
//#endregion

//#region OutputSection
export type Output =
  {
    type: "flexible";
    result: ModuleToBe;
  } | {
    type: "result"; // for errors
    result: string;
  };
//#endregion 

//#region Defs1
export interface ModuleToBe {
  meta: {
    userLanguage: string;
    moduleName: string;
    userPromptOriginal: string;
    userPromptFinal: string; // Final consolidated prompt, merging relevant clarification answers
  };
  ui: {
    visualStyle: string; // e.g. 'Clean & minimalist', 'Dark & modern', 'Light & friendly', 'Corporate & professional', 'Bold & vibrant'
  };
  ontology?: OntologyDefinition;
  rules?: RulesRegistry;
  capabilities?: CapabilityMap;
}

/* =========================
 * Ontology / Domain model
 * ========================= */

export interface OntologyDefinition {
  entities: Record<string, EntityDefinition>;
}

export interface EntityDefinition {
  description?: string;

  fields: Record<string, EntityField>;

  // References business/platform rules that apply to this entity
  rules?: string[];
}

export interface EntityField {
  type: string;
  required?: boolean; // default = true
  values?: string[]; // Closed set, used for validation, DB schema and UI generation
  constraints?: string; // Free-text helper for LLMs and humans (never executable)
}

/* =========================
 * Business / Platform Rules
 * ========================= */

export interface RulesRegistry {
  [ruleId: string]: RuleDefinition;
}

export interface RuleDefinition {
  kind: "domain" | "platform" | "policy";

  description: string;

  // Declares where this rule is applicable (entities, capabilities, or global)
  scope?: string[];

  // Declarative expectations used by LLMs and humans
  acceptanceCriteria?: string[];

}

/* =========================
 * Capability Map / Use Cases
 * ========================= */

export interface CapabilityMap {
  [capabilityId: string]: CapabilityDefinition;
}

export interface CapabilityDefinition {
  description?: string;

  // References rule IDs used by this capability
  usesRules?: string[];

  // Indicates whether this capability is optional and can be enabled or disabled via admin configuration
  isOptional?: boolean; // default false

  // High-level actions exposed by this capability
  actions?: CapabilityAction[];
}

export interface CapabilityAction {
  actionId: string;
  description?: string;
}
//#endregion

