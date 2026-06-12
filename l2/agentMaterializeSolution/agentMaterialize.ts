/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterialize.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile, IReqCreateStorFile } from '/_102027_/l2/libStor.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterialize',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Read project.json, discover modules with defs, create singletons and trigger page scanning',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── project.json ─────────────────────────────────────────────────────────────

interface ProjectModule {
  moduleName: string;
}

interface ProjectConfig {
  modules?: ProjectModule[];
}

async function readProjectConfig(project: number): Promise<ProjectConfig> {
  const ref = `_${project}_/l5/project.json`;
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  const sf = mls.stor.files[key];
  if (!sf) throw new Error(`[agentMaterialize] project.json not found: ${ref}`);
  const content = await sf.getContent();
  return JSON.parse(typeof content === 'string' ? content : JSON.stringify(content)) as ProjectConfig;
}

function scanModuleDefsFiles(moduleName: string, project: number): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(mls.stor.files)) {
    const file = mls.stor.files[key];
    if (
      file.level === 2 &&
      file.extension === '.defs.ts' &&
      file.folder === moduleName &&
      file.project === project &&
      !['module', 'index'].includes(file.shortName)
    ) {
      paths.push(`_${file.project}_/l2/${file.folder}/${file.shortName}${file.extension}`);
    }
  }
  return paths;
}

async function findModulesWithDefs(project: number): Promise<string[]> {
  const config = await readProjectConfig(project);
  const result: string[] = [];
  for (const mod of config.modules ?? []) {
    const defs = scanModuleDefsFiles(mod.moduleName, project);
    if (defs.length > 0) result.push(mod.moduleName);
  }
  return result;
}

// ─── templates ────────────────────────────────────────────────────────────────

function buildModuleTs(project: number, moduleName: string): string {
  return `/// <mls fileReference="_${project}_/l2/${moduleName}/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition, IPaths, ISkill, IGenomeConfig } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome: Record<string, IGenomeConfig> = {
  'web/desktop/page11': {
    designSystem: 'default',
    device: 'desktop',
    layout: 'standard',
  }
} as const;

export const shared: IPaths = {
  web: {
    sharedPath: '/_${project}_/l2/${moduleName}/web/shared',
    sharedSkill: '/_102020_/l2/agentMaterializeSolution/skills/genPageShared.ts'
  }
}

export const skills: ISkill = {
  layer1: {
    skillPath:  [],
  },
  layer2: {
    skillPath:  [],
  },
  layer3: {
    skillPath:  [],
  },
  layer4: {
    skillPath:  [],
  },
  contract: {
    skillPath: ["_102020_/l2/agentMaterializeSolution/skills/genContract.ts"],
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

// ─── ensure singletons ────────────────────────────────────────────────────────

async function ensureFile(ref: string, src: string): Promise<void> {
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  if (mls.stor.files[key]) return;
  const param: IReqCreateStorFile = { ...info, source: src };
  await createStorFile(param, true, true, true);
}

async function ensureSingletons(project: number, moduleName: string): Promise<void> {
  await ensureFile(`_${project}_/l2/${moduleName}/module.ts`,                          buildModuleTs(project, moduleName));
  await ensureFile(`_${project}_/l2/${moduleName}/index.ts`,                           buildIndexTs(project, moduleName));
  await ensureFile(`_${project}_/l1/${moduleName}/layer_2_controllers/router.ts`,      buildRouterTs(project, moduleName));
  await ensureFile(`_${project}_/l1/${moduleName}/layer_1_external/persistence.ts`,    buildPersistenceTs(project, moduleName));
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const project = mls.actualProject || 0;
  const modulesWithDefs = await findModulesWithDefs(project);

  if (modulesWithDefs.length === 0)
    throw new Error(`[agentMaterialize] no modules with .defs.ts found in project ${project}`);

  for (const moduleName of modulesWithDefs) {
    await ensureSingletons(project, moduleName);
  }

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: JSON.stringify({ project, modulesWithDefs }) },
      ],
      taskTitle: `materialize:project-${project}`,
      threadId: context.message.threadId,
      userMessage: userPrompt || `project:${project}`,
      longTermMemory: { modulesJson: JSON.stringify(modulesWithDefs) },
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
  const project = mls.actualProject || 0;
  const modulesWithDefs = await findModulesWithDefs(project);

  if (modulesWithDefs.length === 0)
    throw new Error(`[agentMaterialize] no modules with .defs.ts found in project ${project}`);

  for (const moduleName of modulesWithDefs) {
    await ensureSingletons(project, moduleName);
  }

  const promptReady: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args || '',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: JSON.stringify({ project, modulesWithDefs }),
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

  const modulesJson = context.task?.iaCompressed?.longMemory['modulesJson'] as string | undefined;
  if (!modulesJson) throw new Error('[agentMaterialize] missing modulesJson in longMemory');

  const modulesWithDefs = JSON.parse(modulesJson) as string[];

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

  const newSteps: mls.msg.AgentIntentAddStep[] = modulesWithDefs.map(moduleName => ({
    type: 'add-step' as const,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepTitle: `scan-pages:${moduleName}`,
    step: {
      type: 'agent' as const,
      stepId: 0,
      interaction: null,
      status: 'waiting_human_input' as const,
      nextSteps: [],
      agentName: 'agentMaterializePages',
      prompt: JSON.stringify({ moduleName }),
      rags: [],
    },
  }));

  return [...newSteps, updateStatus];
}

// ─── system prompt ────────────────────────────────────────────────────────────

const systemPrompt = `
<!-- modelType: nano -->

Echo back the content passed.

## Output format
Return ONLY valid JSON, no markdown fences, no prose.

{
  "type": "flexible",
  "result": {
    "project": <echo project>,
    "modulesWithDefs": ["<echo each module name>"]
  }
}
`;

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    project: number;
    modulesWithDefs: string[];
  };
};
//#endregion
