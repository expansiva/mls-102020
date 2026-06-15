/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeResolveDeps.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  getAvailableDepFiles,
  typeToFileInfo,
  toFilePath,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type { ScannedDefType } from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeResolveDeps',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Resolve which dependency files a single L1 .defs.ts file requires',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

const TOOL_NAME = 'submitResolvedDependencies';

// Args encoded in step.prompt (set by agentMaterialize)
interface ResolveArgs {
  planId: string;
  moduleName: string;
  shortName: string;
  type: ScannedDefType;
}

// Tool output returned by the LLM
export interface ResolveOutput {
  moduleName: string;
  shortName: string;
  type: string;
  dependsFiles: string[]; // filePaths of .defs.ts files this file depends on
  notes: string[];
}

const resolveToolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Submit which dependency files this .defs.ts requires.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['moduleName', 'shortName', 'type', 'dependsFiles', 'notes'],
      properties: {
        moduleName: { type: 'string' },
        shortName: { type: 'string' },
        type: { type: 'string' },
        dependsFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'filePaths (from the provided available list) that this file depends on',
        },
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[agentMaterializeResolveDeps] missing args`);

  const parsed: ResolveArgs = JSON.parse(args);
  const { moduleName, shortName, type } = parsed;
  const project = mls.actualProject || 0;

  // Read the source .defs.ts
  const { level, folder } = typeToFileInfo(moduleName, shortName, type);
  const fileInfo = { project, level, folder, shortName, extension: '.defs.ts' };
  const key = mls.stor.getKeyToFile(fileInfo);
  const file = (mls.stor.files as Record<string, any>)[key];

  if (!file || file.status === 'deleted') {
    throw new Error(
      `[agentMaterializeResolveDeps] .defs.ts not found: ${toFilePath(project, level, folder, shortName, '.defs.ts')}`,
    );
  }

  const defContent = String(await file.getContent());

  // List files from the dependency layer
  const available = getAvailableDepFiles(project, moduleName, type);
  const availableLines = available
    .map(f => `- ${f.shortName} → ${f.filePath}`)
    .join('\n');

  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(type),
    humanPrompt: buildHumanPrompt(moduleName, shortName, type, defContent, availableLines),
    tools: [resolveToolSchema as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  };

  return [intent];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const payload = step.interaction?.payload?.[0] as ResolveOutput | undefined;

  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;

  if (!payload || !Array.isArray(payload.dependsFiles)) {
    status = 'failed';
    traceMsg = '[agentMaterializeResolveDeps] missing or invalid payload';
  }

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
    // Keep output payload in task so agentMaterializeAssemble can read it
    cleaner: status === 'completed' ? 'input' : undefined,
  };

  return [updateStatus];
}

// ─── Prompt builders ───────────────────────────────────────────────────────────

const DEP_LAYER_LABEL: Record<string, string> = {
  layer_4_entities:    'layer_1_external (physical tables)',
  layer_3_usecases:    'layer_4_entities (entity contracts)',
  layer_2_controllers: 'layer_3_usecases (use cases)',
};

function buildSystemPrompt(type: ScannedDefType): string {
  const depLabel = DEP_LAYER_LABEL[type] || 'dependency layer';
  return `<!-- modelType: codeinstruct -->

You analyze a TypeScript definition file (.defs.ts) to determine which ${depLabel} files it depends on.

Inspect the file content: look for referenced entity names, table IDs, type imports, use case names, and any explicit identifiers that match files in the provided list.

Return ONLY the files from the available list that this definition actually uses or references.

Call ${TOOL_NAME} with the result. Return an empty dependsFiles array if none apply.`;
}

function buildHumanPrompt(
  moduleName: string,
  shortName: string,
  type: string,
  defContent: string,
  availableLines: string,
): string {
  return [
    `## File to analyze`,
    `Module: ${moduleName}`,
    `File: ${shortName}.defs.ts`,
    `Type: ${type}`,
    ``,
    `## Content`,
    '```typescript',
    defContent,
    '```',
    ``,
    `## Available dependency files`,
    availableLines || '(none found in the dependency layer)',
    ``,
    `Return the filePaths (second column after →) of the files this definition depends on.`,
  ].join('\n');
}
