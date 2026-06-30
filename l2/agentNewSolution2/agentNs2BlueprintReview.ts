/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2BlueprintReview.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Detect domain/coverage gaps in the blueprint before the specialized plans. Non-blocking: findings
// are advice for agentNs2Finalize; this step never fails the task on findings alone.

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
import { blueprintReviewResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getBlueprintOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Blueprint.js';

const AGENT_NAME = 'agentNs2BlueprintReview';
const TOOL_NAME = 'submitBlueprintReview';

export interface ReviewFinding { severity: 'error' | 'warning' | 'info'; code: string; message: string; path?: string }
export interface BlueprintReviewResult { summary: string; findings: ReviewFinding[] }
export type BlueprintReviewOutput = PlannerOutput<BlueprintReviewResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit blueprint review findings.', blueprintReviewResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Review the blueprint for domain gaps', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const blueprint = getBlueprintOutput(context);
  const human = `## Blueprint to review\n${JSON.stringify(blueprint.result, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let traceMsg: string | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    extractPlannerOutput(payload, config); // validate shape only; findings never block
  } catch (error) {
    traceMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[${AGENT_NAME}] ${traceMsg}`);
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  // Non-blocking: complete even when parsing failed, so a flaky review never stalls the flow.
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', traceMsg)];
}

export function getBlueprintReviewOutput(context: mls.msg.ExecutionContext): BlueprintReviewOutput | null {
  try {
    return getPlannerOutput(context, AGENT_NAME, config);
  } catch {
    return null;
  }
}

const config: PlannerExtractConfig<BlueprintReviewResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): BlueprintReviewResult {
  const result = assertRecord(value, 'result');
  const findings = assertArray(result.findings || [], 'result.findings').map((item, index) => {
    const f = assertRecord(item, `result.findings[${index}]`);
    const severity = (f.severity === 'error' || f.severity === 'warning' || f.severity === 'info' ? f.severity : 'info') as ReviewFinding['severity'];
    return { severity, code: optionalString(f.code) || 'finding', message: assertString(f.message, `result.findings[${index}].message`), path: optionalString(f.path) };
  });
  return { summary: optionalString(result.summary) || '', findings };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Review the blueprint for domain/coverage gaps before the specialized plans run.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result: a short summary and findings[] ({ severity error|warning|info, code, message, path? }).
Look for: capabilities with no owning entity, entities with no actor/capability, missing lifecycle on
stateful entities, rules referencing unknown entities, and behaviorHint mismatches (a clearly stateful
process marked operation, or vice-versa). Do NOT comment on pages/tables/persistence (out of Stage 1).

`;
