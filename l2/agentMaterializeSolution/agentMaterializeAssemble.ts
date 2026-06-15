/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializeAssemble.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  scanModuleDefsFiles,
  computeOutputPath,
  makeItemId,
  saveMaterializePipeline,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type {
  PipelineItem,
  PipelineItemType,
  ScannedDefFile,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';
import type { ResolveOutput } from '/_102020_/l2/agentMaterializeSolution/agentMaterializeResolveDeps.js';

declare const mls: any;

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentMaterializeAssemble',
    agentProject: 102020,
    agentFolder: 'agentMaterializeSolution',
    agentDescription: 'Assemble materialize.pipeline.json from resolved dependencies',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

const TOOL_NAME = 'submitAssembleResult';

interface AssembleArgs {
  planId: string;
  moduleName: string;
}

// Tool output returned by the LLM (minimal confirmation)
interface AssembleOutput {
  moduleName: string;
  status: 'ok' | 'failed';
  notes: string[];
}

const assembleToolSchema = {
  type: 'function',
  function: {
    name: TOOL_NAME,
    description: 'Confirm the materialize pipeline assembly result.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['moduleName', 'status', 'notes'],
      properties: {
        moduleName: { type: 'string' },
        status: { enum: ['ok', 'failed'] },
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;

// beforePromptStep: do all assembly work, then hand summary to LLM for confirmation
async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[agentMaterializeAssemble] missing args`);

  const { moduleName }: AssembleArgs = JSON.parse(args);
  const project = mls.actualProject || 0;

  // 1. Collect resolve-deps outputs for this module from sibling steps
  const allSteps = getAllSteps(context.task);
  const resolvedMap = collectResolvedDeps(allSteps, moduleName);

  // 2. Scan all .defs.ts for this module
  const scanned = scanModuleDefsFiles(project, moduleName);

  // 3. Build pipeline items
  const items = buildPipelineItems(project, moduleName, scanned, resolvedMap);

  // 4. Save pipeline with read-back verify (F-06)
  const saved = await saveMaterializePipeline(moduleName, items);

  // 5. Pass summary to LLM for a lightweight confirmation call
  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: systemPrompt,
    humanPrompt: buildHumanPrompt(moduleName, items, saved),
    tools: [assembleToolSchema as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  };

  return [intent];
}

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const payload = step.interaction?.payload?.[0] as AssembleOutput | undefined;

  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;

  if (!payload) {
    status = 'failed';
    traceMsg = '[agentMaterializeAssemble] missing payload';
  } else if (payload.status === 'failed') {
    status = 'failed';
    traceMsg = payload.notes?.join('; ') || 'assemble reported failed';
  } else {
    traceMsg = payload.notes?.length ? payload.notes.join('; ') : undefined;
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
    cleaner: status === 'completed' ? 'input_output' : undefined,
  };

  return [updateStatus];
}

// ─── Resolve deps collector ────────────────────────────────────────────────────

function collectResolvedDeps(
  allSteps: mls.msg.AIPayload[],
  moduleName: string,
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const s of allSteps) {
    const agentStep = s as any;
    if (agentStep.agentName !== 'agentMaterializeResolveDeps') continue;
    if (agentStep.status !== 'completed') continue;

    let promptArgs: { moduleName?: string; shortName?: string } | null = null;
    try { promptArgs = JSON.parse(agentStep.prompt || '{}'); } catch { continue; }
    if (!promptArgs || promptArgs.moduleName !== moduleName) continue;

    const payload = agentStep.interaction?.payload?.[0] as ResolveOutput | undefined;
    if (!payload || !Array.isArray(payload.dependsFiles)) continue;

    result.set(promptArgs.shortName || '', payload.dependsFiles);
  }

  return result;
}

// ─── Pipeline builder ─────────────────────────────────────────────────────────

function buildPipelineItems(
  project: number,
  moduleName: string,
  scanned: ScannedDefFile[],
  resolvedMap: Map<string, string[]>,
): PipelineItem[] {
  const items: PipelineItem[] = [];

  for (const file of scanned) {
    if (file.type === 'l2_layer2contracts') {
      items.push(makeItem(project, moduleName, file.shortName, file.filePath, 'l2_layer2contracts', [], []));
      continue;
    }

    if (file.type === 'l2_page') {
      // One source .defs.ts → 3 separate pipeline items.
      // page and shared depend on contract being generated first.
      const contractId = makeItemId(file.shortName, 'l2_contract');
      items.push(makeItem(project, moduleName, file.shortName, file.filePath, 'l2_contract', [file.filePath], []));
      items.push(makeItem(project, moduleName, file.shortName, file.filePath, 'l2_shared',   [file.filePath], [contractId]));
      items.push(makeItem(project, moduleName, file.shortName, file.filePath, 'l2_page',     [file.filePath], [contractId]));
      continue;
    }

    // L1 item — dependency files resolved by agentMaterializeResolveDeps
    const l1Type = file.type as PipelineItemType;
    const dependsFiles = resolvedMap.get(file.shortName) || [];
    const dependsOn = dependsFiles.map(defPathToItemId).filter(Boolean);
    items.push(makeItem(project, moduleName, file.shortName, file.filePath, l1Type, dependsFiles, dependsOn));
  }

  return items;
}

function makeItem(
  project: number,
  moduleName: string,
  shortName: string,
  defPath: string,
  type: PipelineItemType,
  dependsFiles: string[],
  dependsOn: string[],
): PipelineItem {
  return {
    id: makeItemId(shortName, type),
    type,
    layer: type.startsWith('l2') ? 'l2' : 'l1',
    moduleName,
    defPath,
    outputPath: computeOutputPath(project, moduleName, shortName, type),
    dependsFiles,
    dependsOn,
    agent: 'agentMaterializeDef',
  };
}

// ─── Prompt builders ───────────────────────────────────────────────────────────

const systemPrompt = `<!-- modelType: codeinstruct -->

You confirm the result of a materialize pipeline assembly.

You receive a summary of what was assembled and saved. Verify the summary is coherent and call ${TOOL_NAME}.

Set status to "ok" if the pipeline was saved with a positive item count.
Set status to "failed" only if itemCount is 0 or savedOk is false.
Add short notes for any anomalies you observe.`;

function buildHumanPrompt(moduleName: string, items: PipelineItem[], savedOk: boolean): string {
  const byType: Record<string, number> = {};
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
  }
  const breakdown = Object.entries(byType)
    .map(([type, count]) => `  ${type}: ${count}`)
    .join('\n');

  return [
    `## Assembly result for module: ${moduleName}`,
    ``,
    `totalItems: ${items.length}`,
    `savedOk: ${savedOk}`,
    ``,
    `## Items by type`,
    breakdown || '  (none)',
  ].join('\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// "102043/l1/cafeFlow/layer_4_entities/pedidoEntity.defs.ts" → "pedidoEntity__layer_4_entities"
function defPathToItemId(defPath: string): string {
  const clean = defPath.replace(/\.defs\.ts$/, '');
  const parts = clean.split('/');
  const shortName = parts[parts.length - 1];
  const layerFolder = parts[parts.length - 2];

  const typeMap: Record<string, PipelineItemType> = {
    layer_1_external:    'layer_1_external',
    layer_4_entities:    'layer_4_entities',
    layer_3_usecases:    'layer_3_usecases',
    layer_2_controllers: 'layer_2_controllers',
  };
  const type = typeMap[layerFolder];
  if (!type || !shortName) return '';
  return makeItemId(shortName, type);
}
