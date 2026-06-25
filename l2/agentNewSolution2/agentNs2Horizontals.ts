/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2Horizontals.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Plan horizontal modules as REFERENCES (finance/notifications/documents...). Platform-provided
// concerns (auth/i18n/monitoring/audit/notifications-as-infra) are NOT planned here.

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
  readPlatformSkill,
  withPlatformSkill,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { horizontalsResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';

const AGENT_NAME = 'agentNs2Horizontals';
const TOOL_NAME = 'submitHorizontalsPlan';

export interface HorizontalModule { horizontalModuleId: string; title: string; resolution: 'reference' | 'draft'; reason?: string }
export interface HorizontalsResult { horizontalModules: HorizontalModule[] }
export type HorizontalsOutput = PlannerOutput<HorizontalsResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the horizontal module references.', horizontalsResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Plan horizontal module references', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const fp = getFinalizeOutput(context).result;
  const platformSkill = await readPlatformSkill();
  const human = `## Horizontal signals\n${JSON.stringify(fp.approvedArtifacts.horizontals, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, withPlatformSkill(systemPrompt.split('{{toolName}}').join(TOOL_NAME), platformSkill), human, toolSchema, TOOL_NAME)];
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

export function getHorizontalsOutput(context: mls.msg.ExecutionContext): HorizontalsOutput | null {
  try { return getPlannerOutput(context, AGENT_NAME, config); } catch { return null; }
}

const config: PlannerExtractConfig<HorizontalsResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): HorizontalsResult {
  const result = assertRecord(value, 'result');
  const horizontalModules = assertArray(result.horizontalModules || [], 'result.horizontalModules').map((item, index) => {
    const h = assertRecord(item, `result.horizontalModules[${index}]`);
    return {
      horizontalModuleId: assertString(h.horizontalModuleId, `result.horizontalModules[${index}].horizontalModuleId`),
      title: optionalString(h.title) || '',
      resolution: h.resolution === 'draft' ? 'draft' as const : 'reference' as const,
      reason: optionalString(h.reason),
    };
  });
  return { horizontalModules };
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Plan horizontal modules as REFERENCES (reference if it already exists, otherwise draft).

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.horizontalModules, each: horizontalModuleId (camelCase), title, resolution
('reference'|'draft'), reason. Only domain capabilities the platform does NOT provide (finance,
notifications, documents). Never plan auth/i18n/multi-tenant/monitoring/audit. Empty array allowed.

`;
