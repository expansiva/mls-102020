/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2DiscoverScope.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Identify the behavior-level scope and signals from the prompt + first clarification. Stage 1 only
// cares about signals that shape the durable model: workflows, operations, MDM, horizontals, plugins
// and agents. Platform concerns (auth/audit/monitoring/notifications) are out of scope.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getInitialPlanSummary,
  getPlannerOutput,
  optionalString,
  readPlatformSkill,
  withPlatformSkill,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { discoverScopeResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getRequirementsClarificationAnswer } from '/_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.js';

const AGENT_NAME = 'agentNs2DiscoverScope';
const TOOL_NAME = 'submitDiscoverScope';

export interface Signal { title: string; reason: string }
export interface DiscoverScopeResult {
  scopeSummary: string;
  signals: { workflows: Signal[]; operations: Signal[]; mdm: Signal[]; horizontals: Signal[]; plugins: Signal[]; agents: Signal[] };
}
export type DiscoverScopeOutput = PlannerOutput<DiscoverScopeResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the discovered Stage-1 scope and signals.', discoverScopeResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Discover Stage-1 scope and signals', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const initialPlan = getInitialPlanSummary(context);
  const clarification = getRequirementsClarificationAnswer(context);
  const platformSkill = await readPlatformSkill();
  const human = `## Initial prompt\n${initialPlan.userPrompt}\n\n## Clarification answer\n${JSON.stringify(clarification, null, 2)}\n`;
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

export function getDiscoverScopeOutput(context: mls.msg.ExecutionContext): DiscoverScopeOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
}

const config: PlannerExtractConfig<DiscoverScopeResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): DiscoverScopeResult {
  const result = assertRecord(value, 'result');
  const signals = assertRecord(result.signals, 'result.signals');
  const list = (key: string) => assertArray(signals[key] || [], `result.signals.${key}`).map((item, index) => {
    const record = assertRecord(item, `result.signals.${key}[${index}]`);
    return { title: assertString(record.title, `result.signals.${key}[${index}].title`), reason: optionalString(record.reason) || '' };
  });
  return {
    scopeSummary: assertString(result.scopeSummary, 'result.scopeSummary'),
    signals: { workflows: list('workflows'), operations: list('operations'), mdm: list('mdm'), horizontals: list('horizontals'), plugins: list('plugins'), agents: list('agents') },
  };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1 — the durable business model).
Read the prompt and the first clarification and identify the behavior-level scope.

Call the "{{toolName}}" tool with: status, result, questions, trace (questions/trace beside result).
Do not return prose.

In result:
- scopeSummary: one paragraph, in the user's language.
- signals grouped by category. Each signal is { title, reason }.
  - workflows: stateful, multi-step or multi-actor processes over time (a request/order/approval lifecycle).
  - operations: direct single-actor actions on one entity (create/update/delete/query/view, dashboards as query/view).
  - mdm: stable master data (customers, products, suppliers, staff, locations).
  - horizontals: cross-cutting domain modules NOT provided by the platform (finance, notifications, documents).
  - plugins: external integrations by brand.
  - agents: autonomous operational agents the domain needs.

Rules:
- Derive everything from THIS prompt; never reuse a sample domain.
- Do NOT signal pages, tables, persistence or metrics — those are later stages.
- Do NOT signal platform-provided concerns (auth, RBAC, i18n, multi-tenant, file storage, monitoring, audit, notifications-as-infra).
- Empty categories are allowed (return []).

`;
