/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2Recommend.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Recommend Stage-1 artifacts with a priority (now/soon/later/never). Behavior level ONLY: ontology
// entities, workflows, operations, rules, MDM, horizontals, plugins, agents. Never pages or tables.
// The client confirms/defers these in the implementation-decisions clarification.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  Priority,
  assertArray,
  assertPriority,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getInitialPlanSummary,
  getPlannerOutput,
  normalizeStringList,
  optionalString,
  readPlatformSkill,
  withPlatformSkill,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput, isRecord } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { recommendResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getDiscoverScopeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2DiscoverScope.js';

const AGENT_NAME = 'agentNs2Recommend';
const TOOL_NAME = 'submitRecommendations';

export type RecommendArtifactType = 'ontologyEntity' | 'workflow' | 'operation' | 'rule' | 'mdm' | 'horizontalModule' | 'plugin' | 'agent';

export interface ImplementationRecommendation {
  recommendationId: string;
  artifactType: RecommendArtifactType;
  title: string;
  description: string;
  priority: Priority;
  defaultPriority: Priority;
  reason: string;
  requiresClientDecision: boolean;
  dependencies: string[];
}
export interface RecommendResult { recommendations: ImplementationRecommendation[] }
export type RecommendOutput = PlannerOutput<RecommendResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the prioritized Stage-1 recommendations.', recommendResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Recommend Stage-1 artifacts with priority', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const initialPlan = getInitialPlanSummary(context);
  const scope = getDiscoverScopeOutput(context);
  const platformSkill = await readPlatformSkill();
  const human = `## Initial prompt\n${initialPlan.userPrompt}\n\n## Discovered scope\n${JSON.stringify(scope.result, null, 2)}\n`;
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

export function getRecommendOutput(context: mls.msg.ExecutionContext): RecommendOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
}

const config: PlannerExtractConfig<RecommendResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): RecommendResult {
  const result = assertRecord(value, 'result');
  const recommendations = assertArray(result.recommendations, 'result.recommendations').map((item, index) => {
    const r = assertRecord(item, `result.recommendations[${index}]`);
    const priority = assertPriority(r.priority, `result.recommendations[${index}].priority`);
    return {
      recommendationId: assertString(r.recommendationId, `result.recommendations[${index}].recommendationId`),
      artifactType: assertString(r.artifactType, `result.recommendations[${index}].artifactType`) as RecommendArtifactType,
      title: assertString(r.title, `result.recommendations[${index}].title`),
      description: optionalString(r.description) || '',
      priority,
      defaultPriority: isRecord(r) && (r.defaultPriority === 'now' || r.defaultPriority === 'soon' || r.defaultPriority === 'later' || r.defaultPriority === 'never') ? r.defaultPriority : priority,
      reason: optionalString(r.reason) || '',
      requiresClientDecision: r.requiresClientDecision === true,
      dependencies: normalizeStringList(r.dependencies, `result.recommendations[${index}].dependencies`),
    };
  });
  return { recommendations };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Turn the discovered scope into prioritized recommendations the client can accept or defer.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.recommendations, each item has: recommendationId (camelCase), artifactType (one of
ontologyEntity, workflow, operation, rule, mdm, horizontalModule, plugin, agent), title, description,
priority and defaultPriority (now/soon/later/never), reason, requiresClientDecision, dependencies[].

Rules:
- Recommend ONLY behavior-level artifacts. NEVER recommend pages, screens, tables, persistence or
  metrics — those belong to later stages.
- defaultPriority "now" for the MVP core; "soon/later" for nice-to-haves; "never" only to flag an
  out-of-scope item the user might expect.
- requiresClientDecision=true when a recommendation is genuinely optional or ambiguous.
- Derive everything from the scope; do not reuse a sample domain.

`;
