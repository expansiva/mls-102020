/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2Plugins.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Plan external plugins as REFERENCES, reusing an existing plugin by brand before drafting a new one.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getPlannerOutput,
  optionalString,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { pluginsResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';

const AGENT_NAME = 'agentNs2Plugins';
const TOOL_NAME = 'submitPluginsPlan';

export interface PluginRef { pluginId: string; title: string; brand: string; resolution: 'existing' | 'draft'; reason?: string }
export interface PluginsResult { plugins: PluginRef[] }
export type PluginsOutput = PlannerOutput<PluginsResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the plugin references.', pluginsResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Plan external plugin references', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const fp = getFinalizeOutput(context).result;
  const human = `## Plugin signals\n${JSON.stringify(fp.approvedArtifacts.plugins, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    const output = extractPlannerOutput(payload, config);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

export function getPluginsOutput(context: mls.msg.ExecutionContext): PluginsOutput | null {
  try { return getPlannerOutput(context, AGENT_NAME, config); } catch { return null; }
}

const config: PlannerExtractConfig<PluginsResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): PluginsResult {
  const result = assertRecord(value, 'result');
  const plugins = assertArray(result.plugins || [], 'result.plugins').map((item, index) => {
    const p = assertRecord(item, `result.plugins[${index}]`);
    return {
      pluginId: assertString(p.pluginId, `result.plugins[${index}].pluginId`),
      title: optionalString(p.title) || '',
      brand: optionalString(p.brand) || '',
      resolution: p.resolution === 'draft' ? 'draft' as const : 'existing' as const,
      reason: optionalString(p.reason),
    };
  });
  return { plugins };
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Plan external plugins as REFERENCES. Reuse an existing plugin by brand before drafting a new one.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.plugins, each: pluginId (camelCase), title, brand, resolution ('existing'|'draft'), reason.
Empty array allowed when no external integration is needed.

`;
