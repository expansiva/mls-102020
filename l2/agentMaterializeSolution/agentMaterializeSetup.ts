/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeSetup.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeSetup',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Prepare module environment: create singleton files then scan pages',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── input ────────────────────────────────────────────────────────────────────

interface AgentInput {
  moduleName: string;
}

function parseInput(raw: string): AgentInput {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const moduleName = parsed['moduleName'];
    if (typeof moduleName !== 'string' || !moduleName)
      throw new Error('[agentMaterializeSetup] missing "moduleName"');
    return { moduleName };
  }
  const line = trimmed.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean)[0];
  if (!line) throw new Error('[agentMaterializeSetup] moduleName is required');
  return { moduleName: line };
}

// ─── templates ────────────────────────────────────────────────────────────────

function buildModuleTs(project: number, moduleName: string): string {
  return `/// <mls fileReference="_${project}_/l2/${moduleName}/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition, IPaths, IGenomeConfig } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome: Record<string, IGenomeConfig> = {
  'web/desktop/page11': {
    designSystem: 'default',
    device: 'desktop',
    layout: 'standard',
  }
} as const;

export const skills: IPaths = {
  web: {
    sharedPath: '/_${project}_/l2/${moduleName}/web/shared',
    sharedSkill: '/_102020_/l2/agentMaterializeSolution/skills/genPageShared.ts'
  }
}

export const moduleStates = {} as const;

export const moduleShellPreferences = {
  layout: {
    asideMode: { desktop: 'inline', mobile: 'fullscreen' },
  },
} as const;

export const moduleFrontendDefinition: AuraModuleFrontendDefinition = {
  pageTitle: '${moduleName}',
  device: 'desktop',
  navigation: [],
  routes: [],
};
`;
}

function buildIndexTs(project: number, moduleName: string): string {
  return `/// <mls fileReference="_${project}_/l2/${moduleName}/index.ts" enhancement="_blank" />
import { bootstrapCollabApp } from '/_102033_/l2/core/bootstrap.js';

void bootstrapCollabApp({
  projectId: '${project}',
  appId: '${moduleName}',
  title: 'Collab Test · ${moduleName}',
  shellMode: 'spa',
  navigation: [
    { label: 'Monitor', href: '/monitor' },
  ],
  pages: [],
});
`;
}

function buildRouterTs(project: number, moduleName: string): string {
  const fnName = `create${moduleName.charAt(0).toUpperCase()}${moduleName.slice(1)}Router`;
  return `/// <mls fileReference="_${project}_/l1/${moduleName}/layer_2_controllers/router.ts" enhancement="_blank" />
import type { BffHandler } from '/_102034_/l1/server/layer_2_controllers/contracts.js';

export function ${fnName}(): Map<string, BffHandler> {
  return new Map<string, BffHandler>([
  ]);
}
`;
}

function buildPersistenceTs(project: number, moduleName: string): string {
  return `/// <mls fileReference="_${project}_/l1/${moduleName}/layer_1_external/persistence.ts" enhancement="_blank" />
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinitions: TableDefinition[] = [
];
`;
}

// ─── ensure file ──────────────────────────────────────────────────────────────

async function ensureFile(ref: string, src: string): Promise<void> {
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  if (mls.stor.files[key]) return;
  const param: IReqCreateStorFile = { ...info, source: src };
  await createStorFile(param, true, true, true);
}

async function ensureSingletons(moduleName: string): Promise<void> {
  const project = mls.actualProject || 0;
  await ensureFile(`_${project}_/l2/${moduleName}/module.ts`,     buildModuleTs(project, moduleName));
  await ensureFile(`_${project}_/l2/${moduleName}/index.ts`,      buildIndexTs(project, moduleName));
  await ensureFile(`_${project}_/l1/${moduleName}/layer_2_controllers/router.ts`,     buildRouterTs(project, moduleName));
  await ensureFile(`_${project}_/l1/${moduleName}/layer_1_external/persistence.ts`,   buildPersistenceTs(project, moduleName));
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const { moduleName } = parseInput(userPrompt);
  await ensureSingletons(moduleName);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: JSON.stringify({ moduleName }) },
      ],
      taskTitle: `setup:${moduleName}`,
      threadId: context.message.threadId,
      userMessage: userPrompt,
      longTermMemory: { moduleName },
    },
  };

  return [addMessageAI];
}

// ─── beforePromptStep ─────────────────────────────────────────────────────────

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args is required`);

  const { moduleName } = parseInput(args);
  await ensureSingletons(moduleName);

  const promptReady: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: JSON.stringify({ moduleName }),
    systemPrompt,
  };

  return [promptReady];
}

// ─── afterPromptStep ──────────────────────────────────────────────────────────

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!agent || !context || !step) throw new Error(`(${agent.agentName})[afterPromptStep] invalid params`);

  const moduleName = context.task?.iaCompressed?.longMemory['moduleName'] as string;
  if (!moduleName) throw new Error('[agentMaterializeSetup] missing moduleName in longMemory');

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    cleaner: 'input_output',
    status: 'completed',
  };

  const newStep: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepTitle: `scan-pages:${moduleName}`,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: 'agentL2MaterializePages',
      prompt: JSON.stringify({ moduleName }),
      rags: [],
    },
  };

  return [newStep, updateStatus];
}

// ─── system prompt ────────────────────────────────────────────────────────────

const systemPrompt = `
<!-- modelType: nano -->

Echo back the moduleName.

## Output format
Return ONLY valid JSON, no markdown fences, no prose.

{
  "type": "flexible",
  "result": {
    "moduleName": "<echo moduleName>"
  }
}
`;

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    moduleName: string;
  };
};
//#endregion
