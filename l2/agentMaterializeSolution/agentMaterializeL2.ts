/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeL2.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { IFileInfoBase } from '/_102020_/l2/utils.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeL2',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Scan mat1 defs, detect outdated/missing .ts outputs and dispatch agentMaterializeDef',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── types ────────────────────────────────────────────────────────────────────

type DefType = 'contract' | 'shared' | 'page';

interface MaterializeTask {
  defsPath: string;
  moduleName: string;
  type: DefType;
}

// ─── project.json ─────────────────────────────────────────────────────────────

async function readProjectModules(project: number): Promise<string[]> {
  const ref = `_${project}_/l5/project.json`;
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  const sf = mls.stor.files[key];
  if (!sf) throw new Error(`[agentMaterializeL2] project.json not found: ${ref}`);
  const content = await sf.getContent();
  const config = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content)) as {
    modules?: Array<{ moduleName: string }>;
  };
  return (config.modules ?? []).map(m => m.moduleName);
}

// ─── detection ────────────────────────────────────────────────────────────────

function findTasksNeedingMaterialization(moduleNames: string[], project: number): MaterializeTask[] {
  const files = mls.stor.files as Record<string, IFileInfoBase>;
  const tasks: MaterializeTask[] = [];

  for (const moduleName of moduleNames) {
    for (const key of Object.keys(files)) {
      const file = files[key];

      if (file.project !== project || file.extension !== '.defs.ts') continue;

      let type: DefType | null = null;
      let outputLevel = 2;
      let outputFolder = '';

      // L1 contract defs: _P_/l1/${module}/layer_2_controllers/${pageId}.defs.ts
      if (file.level === 1 && file.folder === `${moduleName}/layer_2_controllers`) {
        type = 'contract';
        outputFolder = `${moduleName}/web/contracts`;
      }
      // L2 shared defs: _P_/l2/${module}/web/shared/${pageId}.defs.ts
      else if (file.level === 2 && file.folder === `${moduleName}/web/shared`) {
        type = 'shared';
        outputFolder = file.folder;
      }
      // L2 device defs: _P_/l2/${module}/web/${device}/${deviceType}/.../${pageId}.defs.ts
      else if (file.level === 2 && file.folder.startsWith(`${moduleName}/web/`)) {
        type = 'page';
        outputFolder = file.folder;
      }

      if (!type) continue;

      const defsPath = `_${project}_/l${file.level}/${file.folder}/${file.shortName}${file.extension}`;
      const defsUpdatedAt: number = (file as any).updatedAt ?? 0;

      const tsKey = mls.stor.getKeyToFile({
        project, level: outputLevel, folder: outputFolder,
        shortName: file.shortName, extension: '.ts',
      });
      const tsFile = mls.stor.files[tsKey];

      if (!tsFile || defsUpdatedAt > ((tsFile as any).updatedAt ?? 0)) {
        tasks.push({ defsPath, moduleName, type });
      }
    }
  }

  return tasks;
}

// ─── beforePromptImplicit ─────────────────────────────────────────────────────

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const project = mls.actualProject || 0;
  const moduleNames = await readProjectModules(project);
  const tasks = findTasksNeedingMaterialization(moduleNames, project);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: JSON.stringify({ project, totalTasks: tasks.length }) },
      ],
      taskTitle: `materialize-l2:project-${project}`,
      threadId: context.message.threadId,
      userMessage: userPrompt || `project:${project}`,
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
  const moduleNames = await readProjectModules(project);
  const tasks = findTasksNeedingMaterialization(moduleNames, project);

  const promptReady: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args || '',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt: JSON.stringify({ project, totalTasks: tasks.length }),
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

  const project = mls.actualProject || 0;
  const moduleNames = await readProjectModules(project);
  const tasks = findTasksNeedingMaterialization(moduleNames, project);

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

  if (tasks.length === 0) return [updateStatus];

  const newSteps: mls.msg.AgentIntentAddStep[] = tasks.map(task => {
    const pageId = task.defsPath.split('/').pop()?.replace(/\.defs\.ts$/, '') ?? '';
    return {
      type: 'add-step' as const,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      stepTitle: `${task.type}:${pageId}`,
      step: {
        type: 'agent' as const,
        stepId: 0,
        interaction: null,
        status: 'waiting_human_input' as const,
        nextSteps: [],
        agentName: 'agentMaterializeDef',
        prompt: JSON.stringify({ pathDefs: task.defsPath, moduleName: task.moduleName, type: task.type }),
        rags: [],
      },
    };
  });

  return [...newSteps, updateStatus];
}

// ─── system prompt ────────────────────────────────────────────────────────────

const systemPrompt = `
<!-- modelType: nano -->

Echo back the summary.

## Output format
Return ONLY valid JSON, no markdown fences, no prose.

{
  "type": "flexible",
  "result": {
    "project": <echo project>,
    "totalTasks": <echo totalTasks>
  }
}
`;

//#region OutputSection
export type AgentOutput = {
  type: 'flexible';
  result: {
    project: number;
    totalTasks: number;
  };
};
//#endregion
