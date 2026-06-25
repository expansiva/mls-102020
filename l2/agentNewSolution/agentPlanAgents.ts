/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanAgents.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerOutput,
  Priority,
  assertArray,
  assertPriority,
  assertRecord,
  assertString,
  createPlannerPromptReadyIntent,
  createPlannerVariableToolSchema,
  createPlannerUpdateStatusIntent,
  extractPlannerOutput,
  getPlannerOutput,
  hydrateNewSolutionOutputs,
} from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';
import { getFinalizeSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';
import type { FinalSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';
import { saveNewSolutionAgentTracePayload } from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import { getPlanPluginsOutput } from '/_102020_/l2/agentNewSolution/agentPlanPlugins.js';
import type { PlanPluginsOutput } from '/_102020_/l2/agentNewSolution/agentPlanPlugins.js';
import { getPlanUsecaseEntitiesOutput } from '/_102020_/l2/agentNewSolution/agentPlanUsecaseEntities.js';
import type { PlanUsecaseEntitiesOutput } from '/_102020_/l2/agentNewSolution/agentPlanUsecaseEntities.js';
import { getPlanWorkflowDefinitionOutputs } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowDefinition.js';
import type { PlanWorkflowDefinitionOutput } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowDefinition.js';
import { getPlanWorkflowIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowIndex.js';
import type { PlanWorkflowIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowIndex.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentPlanAgents',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Plan operational agents for the solution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const PLAN_AGENTS_TOOL_NAME = 'submitAgentPlan';
export const PLAN_AGENTS_STEP_ID = '20-plan-agents';
const PLAN_AGENTS_ALIASES = [PLAN_AGENTS_STEP_ID, 'plan-agents'];

export interface OperationalAgentPlan {
  agentId: string;
  title: string;
  purpose: string;
  priority: Priority;
  trigger: string;
  input: string[];
  output: string[];
  persistenceRefs: string[];
  usecaseRefs: string[];
  metricRefs: string[];
  allowedTools: string[];
  permissions: string[];
  stopCriteria: string[];
}

export interface PlanAgentsResult {
  agents: OperationalAgentPlan[];
}

export type PlanAgentsOutput = PlannerOutput<PlanAgentsResult>;

const planAgentsToolSchema = createPlannerVariableToolSchema(
  PLAN_AGENTS_TOOL_NAME,
  'Submit operational agent planning for the newSolution flow.',
  {
    type: 'object',
    additionalProperties: false,
    required: ['agents'],
    properties: {
      agents: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'agentId',
            'title',
            'purpose',
            'priority',
            'trigger',
            'input',
            'output',
            'persistenceRefs',
            'usecaseRefs',
            'metricRefs',
            'allowedTools',
            'permissions',
            'stopCriteria',
          ],
          properties: {
            agentId: { type: 'string' },
            title: { type: 'string' },
            purpose: { type: 'string' },
            priority: { enum: ['now', 'soon', 'later', 'never'] },
            trigger: { type: 'string' },
            input: { type: 'array', items: { type: 'string' } },
            output: { type: 'array', items: { type: 'string' } },
            persistenceRefs: { type: 'array', items: { type: 'string' } },
            usecaseRefs: { type: 'array', items: { type: 'string' } },
            metricRefs: { type: 'array', items: { type: 'string' } },
            allowedTools: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
            stopCriteria: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }
);

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  await hydrateNewSolutionOutputs(context); // F-06: outputs/ cache for cleaned payloads
  if (!agent || !step) throw new Error('[agentPlanAgents](beforePromptStep) invalid params');
  if (!args) throw new Error(`[${agent.agentName}](beforePromptStep) args invalid`);
  if (!context.task) throw new Error(`[${agent.agentName}](beforePromptStep) task invalid`);

  const finalPlan = getFinalizeSolutionPlanOutput(context);
  const plugins = getPlanPluginsOutput(context);
  const usecasePlan = getPlanUsecaseEntitiesOutput(context);
  const workflowIndex = getPlanWorkflowIndexOutput(context);
  const workflowDefinitions = await getPlanWorkflowDefinitionOutputs(context);

  return [
    createPlannerPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args,
      systemPrompt.split('{{toolName}}').join(PLAN_AGENTS_TOOL_NAME),
      buildHumanPrompt(args, finalPlan, plugins, usecasePlan, workflowIndex, workflowDefinitions),
      planAgentsToolSchema,
      PLAN_AGENTS_TOOL_NAME
    ),
  ];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  await hydrateNewSolutionOutputs(context); // F-06: outputs/ cache for cleaned payloads
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    const output = extractPlanAgentsOutput(payload);
    validatePlanAgentsOutput(output);
    if (output.status === 'failed') {
      status = 'failed';
      traceMsg = 'agentPlanAgents returned status failed';
    } else if (output.status === 'needs_input') {
      traceMsg = 'agentPlanAgents returned status needs_input; keeping agent plan draft.';
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}](afterPromptStep) ${traceMsg}`);
  }

  const canonicalSaved = await saveNewSolutionAgentTracePayload(context, agent.agentName, step); // F-06
  return [createPlannerUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, status === 'completed' ? (canonicalSaved ? 'input_output' : 'input') : undefined)];
}

export function getPlanAgentsOutput(context: mls.msg.ExecutionContext): PlanAgentsOutput {
  return getPlannerOutput(context, 'agentPlanAgents', planAgentsConfig, validatePlanAgentsOutput);
}

function extractPlanAgentsOutput(payload: unknown): PlanAgentsOutput {
  return extractPlannerOutput(payload, planAgentsConfig);
}

const planAgentsConfig = {
  toolName: PLAN_AGENTS_TOOL_NAME,
  stepId: PLAN_AGENTS_STEP_ID,
  stepIdAliases: PLAN_AGENTS_ALIASES,
  normalizeResult: normalizePlanAgentsResult,
};

function normalizePlanAgentsResult(value: unknown): PlanAgentsResult {
  const result = assertRecord(value, 'result');
  return {
    agents: assertArray(result.agents, 'result.agents').map((item, index) => normalizeOperationalAgent(item, `result.agents[${index}]`)),
  };
}

function normalizeOperationalAgent(value: unknown, path: string): OperationalAgentPlan {
  const agent = assertRecord(value, path);
  return {
    agentId: assertString(agent.agentId, `${path}.agentId`),
    title: assertString(agent.title, `${path}.title`),
    purpose: assertString(agent.purpose, `${path}.purpose`),
    priority: assertPriority(agent.priority, `${path}.priority`),
    trigger: assertString(agent.trigger, `${path}.trigger`),
    input: normalizeStringArray(agent.input, `${path}.input`),
    output: normalizeStringArray(agent.output, `${path}.output`),
    persistenceRefs: normalizeStringArray(agent.persistenceRefs, `${path}.persistenceRefs`),
    usecaseRefs: normalizeStringArray(agent.usecaseRefs, `${path}.usecaseRefs`),
    metricRefs: normalizeStringArray(agent.metricRefs, `${path}.metricRefs`),
    allowedTools: normalizeStringArray(agent.allowedTools, `${path}.allowedTools`),
    permissions: normalizeStringArray(agent.permissions, `${path}.permissions`),
    stopCriteria: normalizeStringArray(agent.stopCriteria, `${path}.stopCriteria`),
  };
}

function normalizeStringArray(value: unknown, path: string): string[] {
  return assertArray(value, path).map((item, index) => assertString(item, `${path}[${index}]`));
}

function validatePlanAgentsOutput(output: PlanAgentsOutput): void {
  const ids = new Set<string>();
  for (const agent of output.result.agents) {
    if (ids.has(agent.agentId)) throw new Error(`duplicate agentId: ${agent.agentId}`);
    ids.add(agent.agentId);
    if (!agent.trigger.trim()) throw new Error(`agent ${agent.agentId} must include trigger`);
  }
  if (output.status === 'needs_input' && output.questions.length === 0) {
    throw new Error('needs_input agent plan must include questions');
  }
}

function buildHumanPrompt(
  args: string,
  finalPlan: FinalSolutionPlanOutput,
  plugins: PlanPluginsOutput,
  usecasePlan: PlanUsecaseEntitiesOutput,
  workflowIndex: PlanWorkflowIndexOutput,
  workflowDefinitions: PlanWorkflowDefinitionOutput[],
): string {
  return `## Planned step args
${args}

## Final solution plan
${JSON.stringify(finalPlan, null, 2)}

## Plugin plan
${JSON.stringify(plugins, null, 2)}

## Usecase plan
${JSON.stringify(usecasePlan, null, 2)}

## Workflow index
${JSON.stringify(workflowIndex, null, 2)}

## Workflow definitions
${JSON.stringify(workflowDefinitions, null, 2)}
`;
}

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are agentPlanAgents for the collab.codes "newSolution" flow.
Plan operational agents only where they add value.
Use the same language as the user for titles, purposes, questions, and trace.
Use English camelCase identifiers for agentId.

## Tool mode
Call the "{{toolName}}" tool with only these top-level arguments: status, result, questions, and trace. Put questions and trace beside result, never inside result. Do not include type, runId, stepId, schemaVersion, toolName, or arguments; the harness fills those fields.
Do not return prose.

## Rules
- Agents must not execute external actions without approved plugin or horizontal tool.
- Do not hard-code agents from a sample domain.
- Create agents only from approved capabilities, workflow needs, automation needs, or explicit implementation suggestions.
- Include persistenceRefs only when the agent reads or writes module-owned tables.
- Include usecaseRefs when the agent must request backend behavior through layer_3_usecases.
- Include metricRefs when the agent reads metrics or triggers operational checks based on metrics.
- Do not reference MDM, horizontal, or plugin-owned tables as local persistence; use approved tools or refs for them.
- Reminder, follow-up, reconciliation, escalation, or monitoring agents may be soon when useful, but must be tied to a concrete workflow, rule, or operational risk.
- Do not invent autonomous payment, messaging, or external-action agents unless the corresponding plugin or horizontal tool is approved for that priority.
- If a workflow has createsTask false, do not create a task-management agent for it unless implementation suggestions justify it.
- Return an empty agents array when no operational agent adds value in the current scope.
- Do not generate TypeScript code.
`;