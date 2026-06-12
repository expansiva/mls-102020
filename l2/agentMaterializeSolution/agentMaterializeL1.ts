/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeL1.ts" enhancement="_102027_/l2/enhancementAgent.ts"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { IFileInfoBase } from '/_102020_/l2/utils.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeL1',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Scan L1 defs, detect outdated/missing .ts outputs and dispatch agentMaterializeLayer',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── types ────────────────────────────────────────────────────────────────────

interface MaterializeTask {
  defsPath: string;
  moduleName: string;
  layer: string; // e.g. 'layer_1_external', 'layer_3_usecases'
}

// ─── project.json ─────────────────────────────────────────────────────────────

async function readProjectModules(project: number): Promise<string[]> {
  const ref = `_${project}_/l5/project.json`;
  const info = mls.stor.convertFileReferenceToFile(ref);
  const key = mls.stor.getKeyToFile(info);
  const sf = mls.stor.files[key];
  if (!sf) throw new Error(`[agentMaterializeL1] project.json not found: ${ref}`);
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

      if (file.project !== project || file.level !== 1 || file.extension !== '.defs.ts') continue;

      // must be inside ${moduleName}/layer_*
      if (!file.folder.startsWith(`${moduleName}/layer_`)) continue;

      // extract the layer segment: first part after moduleName/
      const afterModule = file.folder.slice(moduleName.length + 1); // e.g. 'layer_3_usecases' or 'layer_3_usecases/sub'
      const layer = afterModule.split('/')[0]; // e.g. 'layer_3_usecases'

      const defsPath = `_${project}_/l1/${file.folder}/${file.shortName}${file.extension}`;
      const defsUpdatedAt: number = (file as any).updatedAt ?? 0;

      const tsKey = mls.stor.getKeyToFile({
        project, level: 1,
        folder: file.folder,
        shortName: file.shortName,
        extension: '.ts',
      });
      const tsFile = mls.stor.files[tsKey];

      if (!tsFile || defsUpdatedAt > ((tsFile as any).updatedAt ?? 0)) {
        tasks.push({ defsPath, moduleName, layer });
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
      taskTitle: `materialize-l1:project-${project}`,
      threadId: context.message.threadId,
      userMessage: userPrompt || `@@${agent.agentName} project:${project}`,
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
    const fileId = task.defsPath.split('/').pop()?.replace(/\.defs\.ts$/, '') ?? '';
    return {
      type: 'add-step' as const,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      stepTitle: `${task.layer}:${fileId}`,
      step: {
        type: 'agent' as const,
        stepId: 0,
        interaction: null,
        status: 'waiting_human_input' as const,
        nextSteps: [],
        agentName: 'agentMaterializeLayer',
        prompt: JSON.stringify({ pathDefs: task.defsPath, moduleName: task.moduleName, layer: task.layer }),
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
