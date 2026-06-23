/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeL2Def.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  toMlsPath,
  getFileContent,
  createDefsFile,
  listDepLayerPaths,
  extractToolCallArgs,
  extractJsonArrayField,
  loadModuleByBuild,
  readProjectJson,
} from '/_102027_/l2/agentMaterializeSolution/artifactsMaterialize.js';
import type { PipelineItem, ProjectJson } from '/_102027_/l2/agentMaterializeSolution/artifactsMaterialize.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeL2Def',
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
  shortName: string;
}

/**
 * The LLM extracts definitions verbatim from the source and determines
 * which layer_3_usecases .ts files the controller depends on.
 * outputPath and all other dependsFiles are computed deterministically in afterPromptStep.
 * dependsOn is always [] in this first version.
 */
interface ToolOutput {
  /** Extracted from bffCommands — the BFF endpoint definitions */
  controllerDefinition: Record<string, unknown>;
  /** Extracted from bffCommands — the contract/interface aspect for the frontend */
  contractDefinition: Record<string, unknown>;
  /** Extracted from bffCommands + navigationRefs */
  sharedDefinition: Record<string, unknown>;
  /** Extracted from pageDefinition (sections + organisms) */
  pageDefinition: Record<string, unknown>;
  /** layer_3_usecases .ts paths the controller actually calls (from usecaseRefs in bffCommands) */
  controllerDependsFiles: string[];
}

const toolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Submit the definitions (extracted from source) and controller dependsFiles for the 4 derived files.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['controllerDefinition', 'contractDefinition', 'sharedDefinition', 'pageDefinition', 'controllerDependsFiles'],
      properties: {
        controllerDefinition: {
          type: 'object',
          description: 'Original bffCommands data from the source — copied verbatim, not summarized',
        },
        contractDefinition: {
          type: 'object',
          description: 'Original bffCommands contract/interface data — copied verbatim',
        },
        sharedDefinition: {
          type: 'object',
          description: 'Original bffCommands + navigationRefs data — copied verbatim',
        },
        pageDefinition: {
          type: 'object',
          description: 'Original pageDefinition sections/organisms data — copied verbatim',
        },
        controllerDependsFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'layer_3_usecases .ts paths (not .defs.ts) that this controller calls — extracted from usecaseRefs in bffCommands',
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
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error('[agentMaterializeL2Def] missing args');

  const { moduleName, shortName }: StepArgs = JSON.parse(args);
  const project = mls.actualProject || 0;

  const content = await getFileContent(project, 2, moduleName, shortName, '.defs.ts');
  if (!content) throw new Error(`[agentMaterializeL2Def] not found: l2/${moduleName}/${shortName}.defs.ts`);

  // Already processed — derived controller .defs.ts exists with pipeline
  const controllerContent = await getFileContent(project, 1, `${moduleName}/layer_2_controllers`, shortName, '.defs.ts');
  if (controllerContent?.includes('export const pipeline')) {
    return [mkStatus(context, parentStep, _step, hookSequential, 'completed', 'already present')];
  }

  // Available layer_3_usecases as .ts paths (LLM picks which ones the controller uses)
  const usecaseDefsPaths = listDepLayerPaths(project, moduleName, 'layer_3_usecases');
  const usecaseTsPaths = usecaseDefsPaths.map(p => p.replace(/\.defs\.ts$/, '.ts'));

  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(project, moduleName, shortName),
    humanPrompt: buildHumanPrompt(
      toMlsPath(project, 2, moduleName, shortName, '.defs.ts'),
      content,
      usecaseTsPaths,
    ),
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
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', 'missing tool output')];
  }

  // ── Deterministic output paths ──────────────────────────────────────────────
  const base = `_${project}_`;
  const controllerOutputPath = `${base}/l1/${moduleName}/layer_2_controllers/${shortName}.ts`;
  const contractOutputPath   = `${base}/l2/${moduleName}/web/contracts/${shortName}.ts`;
  const sharedOutputPath     = `${base}/l2/${moduleName}/web/shared/${shortName}.ts`;
  const pageOutputPath       = `${base}/l2/${moduleName}/web/desktop/page11/${shortName}.ts`;

  // ── Deterministic dependsFiles per file ─────────────────────────────────────
  const contractDependsFiles: string[] = [];
  const sharedDependsFiles   = [contractOutputPath];
  const pageDependsFiles     = [sharedOutputPath, contractOutputPath];

  // ── Load module.ts and projectJson for skills ────────────────────────────────
  const moduleTs = await loadModuleByBuild(toMlsPath(project, 2, moduleName, 'module', '.ts'));
  const projectJson: ProjectJson | null = await readProjectJson();

  const controllerSkills: string[] = moduleTs?.skills?.layer2?.skillPath ?? [];
  const contractSkills: string[]   = moduleTs?.skills?.contract?.skillPath ?? [];
  const sharedSkill: string | undefined = moduleTs?.shared?.web?.sharedSkill;
  const sharedSkills: string[] = sharedSkill ? [sharedSkill] : [];

  const genome = moduleTs?.moduleGenome?.['web/desktop/page11'];
  const pageSkills: string[] = [];
  if (genome?.layout && projectJson) {
    const entry = Object.values(projectJson.layouts ?? {}).find((l: any) => l.name === genome.layout);
    if ((entry as any)?.skill) pageSkills.push((entry as any).skill);
  }
  if (genome?.designSystem && projectJson) {
    const entry = Object.values(projectJson.designSystems ?? {}).find((d: any) => d.name === genome.designSystem);
    if ((entry as any)?.skill) pageSkills.push((entry as any).skill);
  }

  const pageVisualStyle = projectJson?.modules.find(m => m.moduleName === moduleName)?.module?.visualStyle;

  const errors: string[] = [];

  // 1. L1 controller
  const controllerRules = extractJsonArrayField(JSON.stringify(out.controllerDefinition), 'rulesApplied');
  const controllerUsecaseRefs = extractJsonArrayField(JSON.stringify(out.controllerDefinition), 'usecaseRefs');
  const controllerDependsFiles = [
    ...controllerUsecaseRefs.map(ref =>
      toMlsPath(project, 1, `${moduleName}/layer_3_usecases`, ref, '.d.ts'),
    ),
    contractOutputPath,
  ];
  const controllerRulesPath = controllerRules.length > 0 ? toMlsPath(project, 5, moduleName, 'rules', '.defs.ts') : undefined;
  const ok1 = await createDefsFile(
    project, 1, `${moduleName}/layer_2_controllers`, shortName,
    out.controllerDefinition,
    [mkItem(`${shortName}__layer_2_controllers`, 'layer_2_controllers',
      controllerOutputPath, project, 1, `${moduleName}/layer_2_controllers`, shortName,
      controllerDependsFiles, [], controllerRules, {
        skills: controllerSkills,
        afterSaveBackEnd: '_102021_/l2/agentMaterializeSolution/registerBackEnd.ts?registerController',
        rulesPath: controllerRulesPath,
      })],
  );
  if (!ok1) errors.push('controller');

  // 2. L2 contract
  const ok2 = await createDefsFile(
    project, 2, `${moduleName}/web/contracts`, shortName,
    out.contractDefinition,
    [mkItem(`${shortName}__l2_contract`, 'l2_contract',
      contractOutputPath, project, 2, `${moduleName}/web/contracts`, shortName,
      contractDependsFiles, [], undefined, { skills: contractSkills })],
  );
  if (!ok2) errors.push('contract');

  // 3. L2 shared
  const sharedRules = extractJsonArrayField(JSON.stringify(out.sharedDefinition), 'rulesApplied');
  const sharedRulesPath = sharedRules.length > 0 ? toMlsPath(project, 5, moduleName, 'rules', '.defs.ts') : undefined;
  const ok3 = await createDefsFile(
    project, 2, `${moduleName}/web/shared`, shortName,
    out.sharedDefinition,
    [mkItem(`${shortName}__l2_shared`, 'l2_shared',
      sharedOutputPath, project, 2, `${moduleName}/web/shared`, shortName,
      sharedDependsFiles, [], sharedRules, { skills: sharedSkills, rulesPath: sharedRulesPath })],
  );
  if (!ok3) errors.push('shared');

  // 4. L2 page — path: l2/{module}/web/desktop/page11/{shortName}.defs.ts
  const ok4 = await createDefsFile(
    project, 2, `${moduleName}/web/desktop/page11`, shortName,
    out.pageDefinition,
    [mkItem(`${shortName}__l2_page`, 'l2_page',
      pageOutputPath, project, 2, `${moduleName}/web/desktop/page11`, shortName,
      pageDependsFiles, [], undefined, {
        skills: pageSkills,
        afterSaveFrontEnd: '_102020_/l2/agentMaterializeSolution/registerFrontEnd.ts?registerPage',
        visualStyle: pageVisualStyle as Record<string, unknown> | undefined,
      })],
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

interface MkItemOpts {
  skills?: string[];
  afterSaveBackEnd?: string;
  afterSaveFrontEnd?: string;
  visualStyle?: Record<string, unknown>;
  rulesPath?: string;
}

function mkItem(
  id: string,
  type: string,
  outputPath: string,
  project: number,
  level: number,
  folder: string,
  shortName: string,
  dependsFiles: string[],
  dependsOn: string[],
  rulesApplied?: string[],
  opts?: MkItemOpts,
): PipelineItem {
  return {
    id,
    type,
    outputPath,
    defPath: toMlsPath(project, level, folder, shortName, '.defs.ts'),
    dependsFiles,
    dependsOn,
    skills: opts?.skills ?? [],
    ...(opts?.afterSaveBackEnd ? { afterSaveBackEnd: opts.afterSaveBackEnd } : {}),
    ...(opts?.afterSaveFrontEnd ? { afterSaveFrontEnd: opts.afterSaveFrontEnd } : {}),
    ...(opts?.visualStyle ? { visualStyle: opts.visualStyle } : {}),
    ...(opts?.rulesPath ? { rulesPath: opts.rulesPath } : {}),
    ...(rulesApplied && rulesApplied.length > 0 ? { rulesApplied } : {}),
    agent: 'agentMaterializeGen',
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
  return `<!-- modelType: codeinstruct2 -->

You extract and organize data from a L2 page .defs.ts to produce definitions for 4 derived files.

IMPORTANT: Copy data verbatim from the source — do NOT summarize or invent content.

Files to produce:
1. controllerDefinition — L1 BFF controller (_${project}_/l1/${moduleName}/layer_2_controllers/${shortName}.defs.ts)
   Content: the bffCommands array from the source, copied verbatim

2. contractDefinition — L2 BFF contract (_${project}_/l2/${moduleName}/web/contracts/${shortName}.defs.ts)
   Content: the bffCommands from the source (contract/interface aspect), copied verbatim

3. sharedDefinition — L2 shared (_${project}_/l2/${moduleName}/web/shared/${shortName}.defs.ts)
   Content: ALL bffCommands + navigationRefs from the source, copied verbatim

4. pageDefinition — L2 page (_${project}_/l2/${moduleName}/web/desktop/page11/${shortName}.defs.ts)
   Content: the pageDefinition (sections + organisms) from the source, copied verbatim

Additionally provide:
- controllerDependsFiles: the layer_3_usecases .ts paths (not .defs.ts) that this controller calls
  Look at usecaseRefs inside each bffCommand and find the matching path from the available list

Call ${TOOL_NAME} with the result.`;
}

function buildHumanPrompt(
  pageDefPath: string,
  content: string,
  usecaseTsPaths: string[],
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
    `## Available layer_3_usecases .ts files`,
    usecaseTsPaths.length ? usecaseTsPaths.join('\n') : '(none)',
    ``,
    `Extract the 4 definitions verbatim from the source content.`,
    `For controllerDependsFiles: look at usecaseRefs in each bffCommand and match to the available list above.`,
  ].join('\n');
}
