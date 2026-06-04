/// <mls fileReference="_102020_/l2/agentNewSolution/agentRecommendImplementations.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAgentStepByAgentName, getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import {
  DiscoverSolutionScopeOutput,
  RequirementsClarificationAnswer,
  getDiscoverSolutionScopeOutput,
  wantsInitialMetricsDashboard,
} from '/_102020_/l2/agentNewSolution/agentDiscoverSolutionScope.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentRecommendImplementations',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Recommend prioritized implementation artifacts for a new solution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const RECOMMEND_IMPLEMENTATIONS_TOOL_NAME = 'submitImplementationRecommendations';
export const RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION = '2026-06-02';
export const RECOMMEND_IMPLEMENTATIONS_STEP_ID = '04-recommend-implementations';
const RECOMMEND_IMPLEMENTATIONS_STEP_ID_ALIASES = [RECOMMEND_IMPLEMENTATIONS_STEP_ID, 'req-recommend-implementations'];
const RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION_ALIASES = [RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION, '1.0'];

type RecommendationStatus = 'ok' | 'needs_input' | 'failed';
type Priority = 'now' | 'soon' | 'later' | 'never';
type ArtifactType = 'page' | 'workflow' | 'plugin' | 'agent' | 'horizontalModule' | 'mdm' | 'ontology' | 'metric' | 'metricTable' | 'usecaseEntity';

interface InitialNewSolutionPlanSummary {
  userLanguage: string;
  requestKind: string;
  userPrompt: string;
  titles?: Record<string, string>;
  todoItems?: unknown[];
  openDetails?: unknown[];
}

export interface ImplementationRecommendation {
  recommendationId: string;
  artifactType: ArtifactType;
  title: string;
  description: string;
  priority: Priority;
  defaultPriority: Priority;
  reason: string;
  requiresClientDecision: boolean;
  dependencies: string[];
}

export interface RecommendImplementationsOutput {
  runId: string;
  stepId: typeof RECOMMEND_IMPLEMENTATIONS_STEP_ID;
  schemaVersion: typeof RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION;
  status: RecommendationStatus;
  result: {
    recommendations: ImplementationRecommendation[];
  };
  questions: string[];
  trace: string[];
}

export interface RecommendImplementationsToolArguments {
  type: 'flexible';
  result: RecommendImplementationsOutput;
}

export interface RecommendImplementationsToolCall {
  toolName: typeof RECOMMEND_IMPLEMENTATIONS_TOOL_NAME;
  arguments: RecommendImplementationsToolArguments | RecommendImplementationsOutput | string;
}

export type Output =
  {
    type: 'flexible';
    result: RecommendImplementationsOutput | RecommendImplementationsToolCall | RecommendImplementationsToolArguments;
  } | RecommendImplementationsToolCall | {
    type: 'result';
    result: string;
  };

export const recommendImplementationsToolSchema = {
  type: 'function',
  function: {
    name: RECOMMEND_IMPLEMENTATIONS_TOOL_NAME,
    description: 'Submit prioritized implementation recommendations for the newSolution planner.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'result'],
      properties: {
        type: { const: 'flexible' },
        result: {
          type: 'object',
          additionalProperties: false,
          required: ['runId', 'stepId', 'schemaVersion', 'status', 'result', 'questions', 'trace'],
          properties: {
            runId: { type: 'string' },
            stepId: { const: RECOMMEND_IMPLEMENTATIONS_STEP_ID },
            schemaVersion: { const: RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION },
            status: { enum: ['ok', 'needs_input', 'failed'] },
            result: {
              type: 'object',
              additionalProperties: false,
              required: ['recommendations'],
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                      'recommendationId',
                      'artifactType',
                      'title',
                      'description',
                      'priority',
                      'defaultPriority',
                      'reason',
                      'requiresClientDecision',
                      'dependencies',
                    ],
                    properties: {
                      recommendationId: { type: 'string' },
                      artifactType: {
                        enum: ['page', 'workflow', 'plugin', 'agent', 'horizontalModule', 'mdm', 'ontology', 'metric', 'metricTable', 'usecaseEntity'],
                      },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { enum: ['now', 'soon', 'later', 'never'] },
                      defaultPriority: { enum: ['now', 'soon', 'later', 'never'] },
                      reason: { type: 'string' },
                      requiresClientDecision: { type: 'boolean' },
                      dependencies: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            questions: {
              type: 'array',
              items: { type: 'string' },
            },
            trace: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
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
  if (!args) throw new Error(`(${agent.agentName})[beforePromptStep] args invalid`);
  if (!context.task) throw new Error(`(${agent.agentName})[beforePromptStep] task invalid`);

  const initialPlan = getInitialNewSolutionPlanSummary(context);
  const clarificationAnswer = getRequirementsClarificationAnswer(context);
  const discoveredScope = getDiscoverSolutionScopeOutput(context);

  const continueIntent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(),
    humanPrompt: buildHumanPrompt(args, initialPlan, clarificationAnswer, discoveredScope),
    tools: [recommendImplementationsToolSchema as unknown as mls.msg.LLMTool],
    toolChoice: {
      type: 'function',
      function: { name: RECOMMEND_IMPLEMENTATIONS_TOOL_NAME },
    },
  };

  return [continueIntent];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!agent || !context || !step) throw new Error(`[afterPromptStep] invalid params`);

  const payload = step.interaction?.payload?.[0] as Output | undefined;
  let status: mls.msg.AIStepStatus = 'completed';

  try {
    if (!payload) throw new Error('missing payload');
    const output = extractRecommendImplementationsOutput(payload);
    const discoveredScope = context.task ? getDiscoverSolutionScopeOutput(context) : undefined;
    const requirementsAnswer = context.task ? getRequirementsClarificationAnswer(context) : undefined;

    validateRecommendImplementationsOutput(output, {
      discoveredScope,
      initialMetricsRequested: wantsInitialMetricsDashboard(requirementsAnswer),
    });

    if (output.status !== 'ok') status = 'failed';
  } catch (error) {
    console.error(`[${agent.agentName}](afterPromptStep) ${error instanceof Error ? error.message : error}`);
    status = 'failed';
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
  };

  if (status === 'completed') updateStatus.cleaner = 'input';
  return [updateStatus];
}

function buildSystemPrompt(): string {
  return systemPrompt
    .split('{{toolName}}').join(RECOMMEND_IMPLEMENTATIONS_TOOL_NAME);
}

function buildHumanPrompt(
  args: string,
  initialPlan: InitialNewSolutionPlanSummary,
  clarificationAnswer: RequirementsClarificationAnswer,
  discoveredScope: DiscoverSolutionScopeOutput,
): string {
  return `## Planned step args
${args}

## Initial user prompt
${initialPlan.userPrompt}

## Initial new solution plan
${JSON.stringify(initialPlan, null, 2)}

## First clarification answer
${JSON.stringify(clarificationAnswer, null, 2)}

## Initial metrics/dashboard requested
${wantsInitialMetricsDashboard(clarificationAnswer)}

## Discovered scope
${JSON.stringify(discoveredScope, null, 2)}
`;
}

function getInitialNewSolutionPlanSummary(context: mls.msg.ExecutionContext): InitialNewSolutionPlanSummary {
  if (!context.task) throw new Error('[getInitialNewSolutionPlanSummary] task invalid');

  const agentStep = getAgentStepByAgentName(context.task, 'agentNewSolution') as mls.msg.AIAgentStep | null;
  const payload = agentStep?.interaction?.payload?.[0] as mls.msg.AIFlexibleResultStep | undefined;
  const result = payload?.type === 'flexible' ? payload.result as InitialNewSolutionPlanSummary : undefined;

  if (!result || typeof result !== 'object') throw new Error('[getInitialNewSolutionPlanSummary] initial plan not found');
  if (!result.userPrompt || typeof result.userPrompt !== 'string') throw new Error('[getInitialNewSolutionPlanSummary] user prompt not found');
  return result;
}

function getRequirementsClarificationAnswer(context: mls.msg.ExecutionContext): RequirementsClarificationAnswer {
  if (!context.task) throw new Error('[getRequirementsClarificationAnswer] task invalid');

  const allSteps = getAllSteps(context.task.iaCompressed?.nextSteps);
  const answerStep = allSteps.find(item =>
    item.type === 'result' &&
    (item as any).planning?.planId === 'req-clarification-answer' &&
    (item as mls.msg.AIResultStep).result
  ) as mls.msg.AIResultStep | undefined;

  if (!answerStep?.result) throw new Error('[getRequirementsClarificationAnswer] clarification answer not found');
  const parsed = JSON.parse(answerStep.result) as RequirementsClarificationAnswer;
  if (!parsed.answers || typeof parsed.answers !== 'object') throw new Error('[getRequirementsClarificationAnswer] invalid clarification answer');
  return parsed;
}

export function getRecommendImplementationsOutput(context: mls.msg.ExecutionContext): RecommendImplementationsOutput {
  if (!context.task) throw new Error('[getRecommendImplementationsOutput] task invalid');

  const agentStep = getAgentStepByAgentName(context.task, 'agentRecommendImplementations') as mls.msg.AIAgentStep | null;
  if (!agentStep) throw new Error('[getRecommendImplementationsOutput] recommendations agent step not found');

  const payload = agentStep.interaction?.payload?.[0] as Output | undefined;
  if (!payload) throw new Error('[getRecommendImplementationsOutput] recommendations payload not found');

  const output = extractRecommendImplementationsOutput(payload);
  validateRecommendImplementationsOutput(output, {
    discoveredScope: getDiscoverSolutionScopeOutput(context),
    initialMetricsRequested: wantsInitialMetricsDashboard(getRequirementsClarificationAnswer(context)),
  });
  return output;
}

function extractRecommendImplementationsOutput(payload: unknown): RecommendImplementationsOutput {
  const value = parseMaybeJson(payload);
  if (!isRecord(value)) throw new Error('tool payload must be an object');

  if (value.type === 'result') throw new Error(String(value.result || 'agent returned result error'));

  const directOutput = tryNormalizeOutput(value);
  if (directOutput) return directOutput;

  if (value.type === 'flexible') {
    const flexibleResult = parseMaybeJson(value.result);
    const outputFromFlexibleResult = tryNormalizeOutput(flexibleResult);
    if (outputFromFlexibleResult) return outputFromFlexibleResult;

    const outputFromFlexibleTool = tryExtractToolArguments(flexibleResult);
    if (outputFromFlexibleTool) return outputFromFlexibleTool;
  }

  const outputFromTool = tryExtractToolArguments(value);
  if (outputFromTool) return outputFromTool;

  const outputFromOpenAIToolCall = tryExtractOpenAIToolCall(value);
  if (outputFromOpenAIToolCall) return outputFromOpenAIToolCall;

  throw new Error('payload does not contain a recognized tool call or implementation recommendation output');
}

function tryExtractOpenAIToolCall(value: Record<string, unknown>): RecommendImplementationsOutput | null {
  const toolCalls = value.tool_calls;
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

  const call = toolCalls.find(item => {
    const record = isRecord(item) ? item : null;
    const fn = record && isRecord(record.function) ? record.function : null;
    return fn?.name === RECOMMEND_IMPLEMENTATIONS_TOOL_NAME;
  });

  if (!isRecord(call)) return null;
  const fn = call.function;
  if (!isRecord(fn)) return null;
  return normalizeToolArguments(fn.arguments);
}

function tryExtractToolArguments(value: unknown): RecommendImplementationsOutput | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record)) return null;
  if (record.toolName !== RECOMMEND_IMPLEMENTATIONS_TOOL_NAME) return null;
  return normalizeToolArguments(record.arguments);
}

function normalizeToolArguments(value: unknown): RecommendImplementationsOutput {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');

  const directOutput = tryNormalizeOutput(args);
  if (directOutput) return directOutput;

  const output = tryNormalizeOutput(parseMaybeJson(args.result));
  if (output) return output;

  throw new Error('tool arguments do not contain implementation recommendations output');
}

function tryNormalizeOutput(value: unknown): RecommendImplementationsOutput | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output)) return null;
  if (!isKnownRecommendationStepId(output.stepId) || !isKnownRecommendationSchemaVersion(output.schemaVersion)) return null;
  return normalizeRecommendImplementationsOutput(output);
}

function normalizeRecommendImplementationsOutput(value: Record<string, unknown>): RecommendImplementationsOutput {
  const result = assertRecord(value.result, 'result');

  return {
    runId: assertString(value.runId, 'runId'),
    stepId: normalizeRecommendationStepId(value.stepId, 'stepId'),
    schemaVersion: normalizeRecommendationSchemaVersion(value.schemaVersion, 'schemaVersion'),
    status: assertStatus(value.status, 'status'),
    result: {
      recommendations: normalizeRecommendations(result.recommendations, 'result.recommendations'),
    },
    questions: assertStringArray(value.questions, 'questions'),
    trace: assertStringArray(value.trace, 'trace'),
  };
}

function normalizeRecommendations(value: unknown, path: string): ImplementationRecommendation[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);

  return value.map((item, index) => {
    const record = assertRecord(item, `${path}[${index}]`);
    return {
      recommendationId: assertString(record.recommendationId, `${path}[${index}].recommendationId`),
      artifactType: assertArtifactType(record.artifactType, `${path}[${index}].artifactType`),
      title: assertString(record.title, `${path}[${index}].title`),
      description: assertString(record.description, `${path}[${index}].description`),
      priority: assertPriority(record.priority, `${path}[${index}].priority`),
      defaultPriority: assertPriority(record.defaultPriority, `${path}[${index}].defaultPriority`),
      reason: assertString(record.reason, `${path}[${index}].reason`),
      requiresClientDecision: assertBoolean(record.requiresClientDecision, `${path}[${index}].requiresClientDecision`),
      dependencies: assertStringArray(record.dependencies, `${path}[${index}].dependencies`),
    };
  });
}

function validateRecommendImplementationsOutput(
  output: RecommendImplementationsOutput,
  options: { discoveredScope?: DiscoverSolutionScopeOutput; initialMetricsRequested: boolean },
): void {
  const recommendations = output.result.recommendations;

  if (output.status === 'ok' && recommendations.length === 0) {
    throw new Error('recommendations must not be empty');
  }

  const ids = new Set<string>();
  for (const recommendation of recommendations) {
    if (ids.has(recommendation.recommendationId)) throw new Error(`duplicate recommendationId: ${recommendation.recommendationId}`);
    ids.add(recommendation.recommendationId);
  }

  if (output.status === 'ok' && !hasNowArtifact(recommendations, 'mdm')) {
    throw new Error('MDM is mandatory and must include at least one now recommendation');
  }

  if (output.status === 'ok' && options.initialMetricsRequested) {
    if (!hasNowArtifact(recommendations, 'metric')) {
      throw new Error('initial metrics/dashboard was requested, but no now metric recommendation exists');
    }
    if (!hasNowAdminDashboard(recommendations)) {
      throw new Error('initial metrics/dashboard was requested, but no now admin dashboard page recommendation exists');
    }
  }

  if (output.status === 'ok' && options.discoveredScope && requiresUsecasePlanning(options.discoveredScope) && !hasNowArtifact(recommendations, 'usecaseEntity')) {
    throw new Error('scope requires backend/usecase planning, but no now usecaseEntity recommendation exists');
  }

  if (output.status === 'needs_input' && output.questions.length === 0) {
    throw new Error('needs_input output must include questions');
  }
}

function hasNowArtifact(recommendations: ImplementationRecommendation[], artifactType: ArtifactType): boolean {
  return recommendations.some(item => item.artifactType === artifactType && item.priority === 'now');
}

function hasNowAdminDashboard(recommendations: ImplementationRecommendation[]): boolean {
  return recommendations.some(item =>
    item.artifactType === 'page' &&
    item.priority === 'now' &&
    /\b(admin|administrativo|dashboard|painel|metric|metrica)\b/.test(normalizeText(`${item.recommendationId} ${item.title} ${item.description}`))
  );
}

function requiresUsecasePlanning(scope: DiscoverSolutionScopeOutput): boolean {
  const signals = scope.result.artifactSignals;
  return signals.usecases.length > 0 || signals.workflows.length > 0 || signals.metrics.length > 0;
}

function isKnownRecommendationStepId(value: unknown): boolean {
  return RECOMMEND_IMPLEMENTATIONS_STEP_ID_ALIASES.includes(value as string);
}

function isKnownRecommendationSchemaVersion(value: unknown): boolean {
  return RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION_ALIASES.includes(value as string);
}

function normalizeRecommendationStepId(value: unknown, path: string): typeof RECOMMEND_IMPLEMENTATIONS_STEP_ID {
  if (isKnownRecommendationStepId(value)) return RECOMMEND_IMPLEMENTATIONS_STEP_ID;
  throw new Error(`${path} must be ${RECOMMEND_IMPLEMENTATIONS_STEP_ID}`);
}

function normalizeRecommendationSchemaVersion(value: unknown, path: string): typeof RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION {
  if (isKnownRecommendationSchemaVersion(value)) return RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION;
  throw new Error(`${path} must be ${RECOMMEND_IMPLEMENTATIONS_SCHEMA_VERSION}`);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  return JSON.parse(trimmed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  return value;
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${path} must be a non-empty string`);
  return value.trim();
}

function assertStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((item, index) => assertString(item, `${path}[${index}]`));
}

function assertBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean`);
  return value;
}

function assertStatus(value: unknown, path: string): RecommendationStatus {
  if (value === 'ok' || value === 'needs_input' || value === 'failed') return value;
  throw new Error(`${path} must be ok, needs_input, or failed`);
}

function assertPriority(value: unknown, path: string): Priority {
  if (value === 'now' || value === 'soon' || value === 'later' || value === 'never') return value;
  throw new Error(`${path} must be now, soon, later, or never`);
}

function assertArtifactType(value: unknown, path: string): ArtifactType {
  if (
    value === 'page' ||
    value === 'workflow' ||
    value === 'plugin' ||
    value === 'agent' ||
    value === 'horizontalModule' ||
    value === 'mdm' ||
    value === 'ontology' ||
    value === 'metric' ||
    value === 'metricTable' ||
    value === 'usecaseEntity'
  ) return value;
  throw new Error(`${path} must be a valid artifactType`);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const systemPrompt = `
<!-- modelType: codepro -->

You are agentRecommendImplementations for the collab.codes "newModule" flow.
Use the discovered scope and clarification answer to recommend implementation artifacts for the next planning decision.
Use the same language as the user for titles, descriptions, reasons, questions, and trace.
Use English camelCase identifiers for recommendationId.

## Tool mode
Call the "{{toolName}}" tool with the complete structured result.
Do not return prose.

## Rules
- The tool arguments must satisfy the provided schema.
- artifactType must be one of: page, workflow, plugin, agent, horizontalModule, mdm, ontology, metric, metricTable, usecaseEntity.
- priority and defaultPriority must be now, soon, later, or never.
- Always include at least one MDM recommendation with priority "now".
- Include operational metric recommendations with priority "now" when the clarification answer accepted initial metrics/dashboard.
- Include an admin dashboard page recommendation with priority "now" when the clarification answer accepted initial metrics/dashboard.
- Include usecaseEntity planning with priority "now" when the discovered scope contains writes, lifecycle workflows, metric updates, table updates, commands, or backend usecase signals.
- Include payment plugins only when payment, billing, subscription, checkout, invoice, or financial collection is materially relevant.
- Mark payment plugins as "now" only when online payment is required for the MVP; otherwise use "soon" or "later".
- Include finance horizontal recommendations only when accounting, billing, receivables, payables, pricing, invoicing, payment, or reconciliation is relevant.
- Include notification agent or horizontal recommendations when reminders, alerts, approvals, follow-ups, or operational communication are useful.
- Do not hard-code providers, priorities, artifact ids, or domain details from examples.
- Do not recommend agendamento or adocao when the prompt excluded them.
- Set requiresClientDecision to true when the client must choose, approve, defer, or configure the recommendation.
- Set requiresClientDecision to false for mandatory structural recommendations derived from the scope.
- Keep dependencies as recommendationId values from the same output.
- Use status "needs_input" only when recommendations cannot be safely drafted without another client decision.
- Use status "failed" only for structural impossibility.

## Content Memory
actualDate: 2026-06-04
userName: Wagner
taskName: newModule
flowName: newSolution
`;
