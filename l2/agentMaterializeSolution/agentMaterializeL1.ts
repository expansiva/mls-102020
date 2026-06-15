/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeL1.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  toMlsPath,
  getFileContent,
  appendPipelineToFile,
  listDepLayerPaths,
  extractToolCallArgs,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type { PipelineItem, L1LayerFolder } from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeL1',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Add export const pipeline to an existing L1 .defs.ts file',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

const TOOL_NAME = 'submitL1Pipeline';

interface StepArgs {
  planId: string;
  moduleName: string;
  shortName: string;
  layerFolder: string;
}

interface ToolOutput {
  outputPath: string;
  dependsFiles: string[];
  dependsOn: string[];
}

const toolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Submit the pipeline item for this L1 .defs.ts file.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['outputPath', 'dependsFiles', 'dependsOn'],
      properties: {
        outputPath: {
          type: 'string',
          description: 'MLS path of the .ts file to be generated, e.g. _102043_/l1/cafeFlow/layer_4_entities/PedidoEntity.ts',
        },
        dependsFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'MLS paths of already-generated .ts files the executor needs as context',
        },
        dependsOn: {
          type: 'array',
          items: { type: 'string' },
          description: 'Pipeline item IDs that must complete before this one',
        },
      },
    },
  },
} as const;

// ─── beforePromptStep ─────────────────────────────────────────────────────────

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error('[agentMaterializeL1] missing args');

  const { moduleName, shortName, layerFolder }: StepArgs = JSON.parse(args);
  const project = mls.actualProject || 0;
  const folder = `${moduleName}/${layerFolder}`;

  // Read the .defs.ts content
  const content = await getFileContent(project, 1, folder, shortName, '.defs.ts');
  if (!content) throw new Error(`[agentMaterializeL1] file not found: ${folder}/${shortName}.defs.ts`);

  // Already has pipeline — skip LLM, complete immediately
  if (content.includes('export const pipeline')) {
    return [{
      type: 'update-status',
      hookSequential,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      stepId: step.stepId,
      status: 'completed',
      traceMsg: 'pipeline already present — skipped',
    } as mls.msg.AgentIntentUpdateStatus];
  }

  // layer_1_external has no deps — handle deterministically without LLM
  if (layerFolder === 'layer_1_external') {
    const item: PipelineItem = {
      id: `${shortName}__layer_1_external`,
      type: 'layer_1_external',
      outputPath: toMlsPath(project, 1, folder, shortName, '.ts'),
      defPath: toMlsPath(project, 1, folder, shortName, '.defs.ts'),
      dependsFiles: [],
      dependsOn: [],
      agent: 'agentMaterializeDef',
    };
    const ok = await appendPipelineToFile(project, 1, folder, shortName, [item]);
    return [{
      type: 'update-status',
      hookSequential,
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: parentStep.stepId,
      stepId: step.stepId,
      status: ok ? 'completed' : 'failed',
      traceMsg: ok ? undefined : 'appendPipelineToFile failed',
    } as mls.msg.AgentIntentUpdateStatus];
  }

  // For layer_4 and layer_3 — use LLM to determine deps
  const depPaths = listDepLayerPaths(project, moduleName, layerFolder as L1LayerFolder);
  const defPath = toMlsPath(project, 1, folder, shortName, '.defs.ts');

  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(layerFolder, depPaths),
    humanPrompt: buildHumanPrompt(defPath, layerFolder, content, depPaths),
    tools: [toolSchema as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  };

  return [intent];
}

// ─── afterPromptStep ──────────────────────────────────────────────────────────

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const { moduleName, shortName, layerFolder }: StepArgs = JSON.parse(step.prompt || '{}');
  const project = mls.actualProject || 0;
  const folder = `${moduleName}/${layerFolder}`;

  const raw = step.interaction?.payload?.[0] as any;
  const out = extractToolCallArgs<ToolOutput>(raw, TOOL_NAME);

  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;

  if (!out?.outputPath) {
    status = 'failed';
    traceMsg = '[agentMaterializeL1] missing or invalid tool output';
  } else {
    const item: PipelineItem = {
      id: `${shortName}__${layerFolder}`,
      type: layerFolder,
      outputPath: out.outputPath,
      defPath: toMlsPath(project, 1, folder, shortName, '.defs.ts'),
      dependsFiles: out.dependsFiles || [],
      dependsOn: out.dependsOn || [],
      agent: 'agentMaterializeDef',
    };
    const ok = await appendPipelineToFile(project, 1, folder, shortName, [item]);
    if (!ok) {
      status = 'failed';
      traceMsg = '[agentMaterializeL1] appendPipelineToFile failed';
    }
  }

  return [{
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
    cleaner: status === 'completed' ? 'input_output' : undefined,
  } as mls.msg.AgentIntentUpdateStatus];
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(layerFolder: string, depPaths: string[]): string {
  const depLayerLabel: Record<string, string> = {
    layer_4_entities: 'layer_1_external (physical table .ts files)',
    layer_3_usecases: 'layer_4_entities (entity .ts files)',
  };
  const depLabel = depLayerLabel[layerFolder] || 'dependency layer';

  return `<!-- modelType: codeinstruct -->

You analyze a ${layerFolder} .defs.ts planning artifact and determine its pipeline item.

The pipeline item describes how to materialize this file into its final .ts implementation.

Path format: _<project>_/l<level>/<folder>/<filename><ext>
  - outputPath: the .ts file to be generated (use the naming from materialization/className metadata in the file)
  - dependsFiles: .ts files (already generated) from ${depLabel} that the executor needs as context
  - dependsOn: pipeline item IDs of the dep items (format: <shortName>__<layerFolder>)

Available ${depLabel} files:
${depPaths.length ? depPaths.map(p => `  ${p}`).join('\n') : '  (none)'}

Call ${TOOL_NAME} with the result.`;
}

function buildHumanPrompt(
  defPath: string,
  layerFolder: string,
  content: string,
  depPaths: string[],
): string {
  return [
    `## File to process`,
    `Path: ${defPath}`,
    `Layer: ${layerFolder}`,
    ``,
    `## Content`,
    '```typescript',
    content,
    '```',
    ``,
    `## Available dependency files`,
    depPaths.length ? depPaths.join('\n') : '(none)',
    ``,
    `Determine the outputPath and which dependsFiles this artifact needs.`,
    `For dependsFiles, use the .ts output path (replace .defs.ts with .ts and apply naming conventions from the file's metadata).`,
  ].join('\n');
}
