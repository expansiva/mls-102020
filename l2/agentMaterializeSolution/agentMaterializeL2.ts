/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeSolution/agentMaterializeL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  toMlsPath,
  getFileContent,
  createDefsFile,
  listDepLayerPaths,
  extractToolCallArgs,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type { PipelineItem } from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeL2',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Create L2 sub-files and L1 controller .defs.ts from a L2 page definition',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

const TOOL_NAME = 'submitL2Files';

interface StepArgs {
  planId: string;
  moduleName: string;
  shortName: string; // page shortName, e.g. "painelCozinha"
}

interface FileSpec {
  definition: Record<string, unknown>; // JSON object for the definition block
  outputPath: string;                   // _project_/l../... .ts path
  dependsFiles: string[];
  dependsOn: string[];
}

interface ToolOutput {
  controllerSpec: FileSpec; // l1/{module}/layer_2_controllers/{page}.defs.ts
  contractSpec: FileSpec;   // l2/{module}/web/contracts/{page}.defs.ts
  sharedSpec: FileSpec;     // l2/{module}/web/shared/{page}.defs.ts
  pageSpec: FileSpec;       // l2/{module}/web/desktop/{page}/{page}.defs.ts
}

const toolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Submit the definitions and pipelines for the 4 files derived from this L2 page.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['controllerSpec', 'contractSpec', 'sharedSpec', 'pageSpec'],
      properties: {
        controllerSpec: { $ref: '#/$defs/FileSpec' },
        contractSpec:   { $ref: '#/$defs/FileSpec' },
        sharedSpec:     { $ref: '#/$defs/FileSpec' },
        pageSpec:       { $ref: '#/$defs/FileSpec' },
      },
      $defs: {
        FileSpec: {
          type: 'object',
          additionalProperties: false,
          required: ['definition', 'outputPath', 'dependsFiles', 'dependsOn'],
          properties: {
            definition: {
              type: 'object',
              description: 'JSON object describing this artifact (will be embedded in the .defs.ts)',
            },
            outputPath: {
              type: 'string',
              description: 'MLS path of the .ts file to be generated',
            },
            dependsFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'MLS paths of already-generated .ts files the executor needs',
            },
            dependsOn: {
              type: 'array',
              items: { type: 'string' },
              description: 'Pipeline item IDs that must complete before this one',
            },
          },
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
  if (!args) throw new Error('[agentMaterializeL2] missing args');

  const { moduleName, shortName }: StepArgs = JSON.parse(args);
  const project = mls.actualProject || 0;

  // Read the source L2 page .defs.ts
  const content = await getFileContent(project, 2, moduleName, shortName, '.defs.ts');
  if (!content) throw new Error(`[agentMaterializeL2] page not found: l2/${moduleName}/${shortName}.defs.ts`);

  // List available L1 usecase .ts paths for BFF context (layer_3_usecases)
  const usecasePaths = listDepLayerPaths(project, moduleName, 'layer_3_usecases');
  // Also pass layer_2_controllers output paths if any already exist
  const controllerFolder = `${moduleName}/layer_2_controllers`;
  const controllerPaths: string[] = [];
  for (const f of Object.values(mls.stor.files as Record<string, any>)) {
    if (f.project !== project) continue;
    if (f.level !== 1) continue;
    if (f.folder !== controllerFolder) continue;
    if (f.extension !== '.defs.ts') continue;
    if (f.status === 'deleted') continue;
    controllerPaths.push(toMlsPath(project, 1, controllerFolder, f.shortName, '.defs.ts'));
  }

  const pageDefPath = toMlsPath(project, 2, moduleName, shortName, '.defs.ts');

  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(project, moduleName, shortName),
    humanPrompt: buildHumanPrompt(pageDefPath, moduleName, shortName, content, usecasePaths, controllerPaths),
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
  const { moduleName, shortName }: StepArgs = JSON.parse(step.prompt || '{}');
  const project = mls.actualProject || 0;

  const raw = step.interaction?.payload?.[0] as any;
  const out = extractToolCallArgs<ToolOutput>(raw, TOOL_NAME);

  if (!out) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', '[agentMaterializeL2] missing tool output')];
  }

  const errors: string[] = [];

  // 1. L1 controller: l1/{module}/layer_2_controllers/{shortName}.defs.ts
  const ok1 = await createDefsFile(
    project, 1, `${moduleName}/layer_2_controllers`, shortName,
    out.controllerSpec.definition,
    [mkItem(`${shortName}__layer_2_controllers`, 'layer_2_controllers', out.controllerSpec, project, 1, `${moduleName}/layer_2_controllers`, shortName)],
  );
  if (!ok1) errors.push('controller');

  // 2. L2 contract: l2/{module}/web/contracts/{shortName}.defs.ts
  const ok2 = await createDefsFile(
    project, 2, `${moduleName}/web/contracts`, shortName,
    out.contractSpec.definition,
    [mkItem(`${shortName}__l2_contract`, 'l2_contract', out.contractSpec, project, 2, `${moduleName}/web/contracts`, shortName)],
  );
  if (!ok2) errors.push('contract');

  // 3. L2 shared: l2/{module}/web/shared/{shortName}.defs.ts
  const ok3 = await createDefsFile(
    project, 2, `${moduleName}/web/shared`, shortName,
    out.sharedSpec.definition,
    [mkItem(`${shortName}__l2_shared`, 'l2_shared', out.sharedSpec, project, 2, `${moduleName}/web/shared`, shortName)],
  );
  if (!ok3) errors.push('shared');

  // 4. L2 page: l2/{module}/web/desktop/{shortName}/{shortName}.defs.ts
  const ok4 = await createDefsFile(
    project, 2, `${moduleName}/web/desktop/${shortName}`, shortName,
    out.pageSpec.definition,
    [mkItem(`${shortName}__l2_page`, 'l2_page', out.pageSpec, project, 2, `${moduleName}/web/desktop/${shortName}`, shortName)],
  );
  if (!ok4) errors.push('page');

  const failed = errors.length > 0;
  return [mkStatus(
    context, parentStep, step, hookSequential,
    failed ? 'failed' : 'completed',
    failed ? `failed to create: ${errors.join(', ')}` : undefined,
  )];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkItem(
  id: string,
  type: string,
  spec: FileSpec,
  project: number,
  level: number,
  folder: string,
  shortName: string,
): PipelineItem {
  return {
    id,
    type,
    outputPath: spec.outputPath,
    defPath: toMlsPath(project, level, folder, shortName, '.defs.ts'),
    dependsFiles: spec.dependsFiles || [],
    dependsOn: spec.dependsOn || [],
    agent: 'agentMaterializeDef',
  };
}

function mkStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
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
  };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(project: number, moduleName: string, shortName: string): string {
  return `<!-- modelType: codeinstruct -->

You generate 4 .defs.ts planning artifacts from a L2 page definition.

Given a page .defs.ts, produce specs for:
1. controllerSpec — L1 BFF controller: _${project}_/l1/${moduleName}/layer_2_controllers/${shortName}.defs.ts
2. contractSpec   — L2 BFF contract:   _${project}_/l2/${moduleName}/web/contracts/${shortName}.defs.ts
3. sharedSpec     — L2 shared calls:   _${project}_/l2/${moduleName}/web/shared/${shortName}.defs.ts
4. pageSpec       — L2 page layout:    _${project}_/l2/${moduleName}/web/desktop/${shortName}/${shortName}.defs.ts

Path format: _<project>_/l<level>/<folder>/<FileName>.ts

For each spec:
- definition: a JSON object summarizing what this artifact contains (purpose, commands, fields, etc.)
- outputPath: the .ts file the executor will generate
- dependsFiles: .ts files the executor needs to read as context (already generated)
  - controller needs layer_3_usecases .ts files
  - contract needs the controller .ts
  - shared needs the contract .ts and controller .ts
  - page needs the shared .ts and contract .ts
- dependsOn: pipeline item IDs that must complete first (e.g. "${shortName}__l2_contract")

Call ${TOOL_NAME} with all 4 specs.`;
}

function buildHumanPrompt(
  pageDefPath: string,
  moduleName: string,
  shortName: string,
  content: string,
  usecasePaths: string[],
  controllerPaths: string[],
): string {
  return [
    `## Source page definition`,
    `Path: ${pageDefPath}`,
    ``,
    `## Content`,
    '```typescript',
    content,
    '```',
    ``,
    `## Available layer_3_usecases .defs.ts (for controller dependsFiles)`,
    usecasePaths.length ? usecasePaths.join('\n') : '(none)',
    ``,
    `## Existing layer_2_controllers .defs.ts`,
    controllerPaths.length ? controllerPaths.join('\n') : '(none)',
    ``,
    `Generate the 4 file specs. For dependsFiles use .ts output paths (not .defs.ts).`,
    `Follow naming: controller/shared/contract/page output files use camelCase or PascalCase per layer conventions.`,
  ].join('\n');
}
