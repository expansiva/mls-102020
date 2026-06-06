/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanPageIndex.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createDynamicAgentStepIntent,
  createPlannerPromptReadyIntent,
  createPlannerVariableToolSchema,
  createPlannerUpdateStatusIntent,
  extractPlannerOutput,
  findStepByPlanId,
  getPlannerOutput,
  getPlanningContextSnapshot,
} from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';
import { getFinalizeSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';
import type { FinalSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';
import { saveNewSolutionAgentTracePayload } from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import { getPlanAgentsOutput } from '/_102020_/l2/agentNewSolution/agentPlanAgents.js';
import type { PlanAgentsOutput } from '/_102020_/l2/agentNewSolution/agentPlanAgents.js';
import { getPlanHorizontalsOutput } from '/_102020_/l2/agentNewSolution/agentPlanHorizontals.js';
import type { PlanHorizontalsOutput } from '/_102020_/l2/agentNewSolution/agentPlanHorizontals.js';
import { getPlanMDMOutput } from '/_102020_/l2/agentNewSolution/agentPlanMDM.js';
import type { PlanMDMOutput } from '/_102020_/l2/agentNewSolution/agentPlanMDM.js';
import { getPlanMetricTableDefinitionOutputs } from '/_102020_/l2/agentNewSolution/agentPlanMetricTableDefinition.js';
import type { PlanMetricTableDefinitionOutput } from '/_102020_/l2/agentNewSolution/agentPlanMetricTableDefinition.js';
import { getPlanMetricsIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanMetricsIndex.js';
import type { PlanMetricsIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanMetricsIndex.js';
import { getPlanPersistenceIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanPersistenceIndex.js';
import type { PlanPersistenceIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanPersistenceIndex.js';
import { getPlanPluginsOutput } from '/_102020_/l2/agentNewSolution/agentPlanPlugins.js';
import type { PlanPluginsOutput } from '/_102020_/l2/agentNewSolution/agentPlanPlugins.js';
import { getPlanTableDefinitionOutputs } from '/_102020_/l2/agentNewSolution/agentPlanTableDefinition.js';
import type { PlanTableDefinitionOutput } from '/_102020_/l2/agentNewSolution/agentPlanTableDefinition.js';
import { getPlanUsecaseEntitiesOutput } from '/_102020_/l2/agentNewSolution/agentPlanUsecaseEntities.js';
import type { PlanUsecaseEntitiesOutput } from '/_102020_/l2/agentNewSolution/agentPlanUsecaseEntities.js';
import { getPlanWorkflowDefinitionOutputs } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowDefinition.js';
import type { PlanWorkflowDefinitionOutput } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowDefinition.js';
import { getPlanWorkflowIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowIndex.js';
import type { PlanWorkflowIndexOutput } from '/_102020_/l2/agentNewSolution/agentPlanWorkflowIndex.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentPlanPageIndex',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Plan the page index for the solution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const PLAN_PAGE_INDEX_TOOL_NAME = 'submitPageIndexPlan';
export const PLAN_PAGE_INDEX_STEP_ID = '21-plan-page-index';
const PLAN_PAGE_INDEX_ALIASES = [PLAN_PAGE_INDEX_STEP_ID, 'plan-page-index'];

export interface PageIndexItem {
  pageId: string;
  pageName: string;
  actor: string;
  purpose: string;
  capabilities: string[];
  flowRefs: {
    experienceFlows: string[];
    entityLifecycles: string[];
    taskWorkflows: string[];
    automations: string[];
  };
  pluginRefs: string[];
  mdmRefs: string[];
  primaryUserActions: string[];
  pageInputHints: string[];
  navigationRefs: unknown[];
  persistenceHints: string[];
  usecaseHints: string[];
  metricRefs: string[];
  rulesApplied: string[];
  bffCommandHints: unknown[];
}

export interface PlanPageIndexResult {
  pages: PageIndexItem[];
}

export type PlanPageIndexOutput = PlannerOutput<PlanPageIndexResult>;

const navigationRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['direction', 'pageId', 'trigger'],
  properties: {
    direction: { enum: ['inbound', 'outbound'] },
    pageId: { type: 'string' },
    trigger: { type: 'string' },
  },
};

const bffCommandHintSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'purpose', 'input', 'output'],
  properties: {
    name: { type: 'string' },
    purpose: { type: 'string' },
    input: { type: 'string' },
    output: { type: 'string' },
  },
};

const planPageIndexToolSchema = createPlannerVariableToolSchema(
  PLAN_PAGE_INDEX_TOOL_NAME,
  'Submit the page index for the newSolution plan.',
  {
    type: 'object',
    additionalProperties: false,
    required: ['pages'],
    properties: {
      pages: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'pageId',
            'pageName',
            'actor',
            'purpose',
            'capabilities',
            'flowRefs',
            'pluginRefs',
            'mdmRefs',
            'primaryUserActions',
            'pageInputHints',
            'navigationRefs',
            'persistenceHints',
            'usecaseHints',
            'metricRefs',
            'rulesApplied',
            'bffCommandHints',
          ],
          properties: {
            pageId: { type: 'string' },
            pageName: { type: 'string' },
            actor: { type: 'string' },
            purpose: { type: 'string' },
            capabilities: { type: 'array', items: { type: 'string' } },
            flowRefs: {
              type: 'object',
              additionalProperties: false,
              required: ['experienceFlows', 'entityLifecycles', 'taskWorkflows', 'automations'],
              properties: {
                experienceFlows: { type: 'array', items: { type: 'string' } },
                entityLifecycles: { type: 'array', items: { type: 'string' } },
                taskWorkflows: { type: 'array', items: { type: 'string' } },
                automations: { type: 'array', items: { type: 'string' } },
              },
            },
            pluginRefs: { type: 'array', items: { type: 'string' } },
            mdmRefs: { type: 'array', items: { type: 'string' } },
            primaryUserActions: { type: 'array', items: { type: 'string' } },
            pageInputHints: { type: 'array', items: { type: 'string' } },
            navigationRefs: { type: 'array', items: navigationRefSchema },
            persistenceHints: { type: 'array', items: { type: 'string' } },
            usecaseHints: { type: 'array', items: { type: 'string' } },
            metricRefs: { type: 'array', items: { type: 'string' } },
            rulesApplied: { type: 'array', items: { type: 'string' } },
            bffCommandHints: { type: 'array', items: bffCommandHintSchema },
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
  if (!agent || !step) throw new Error('[agentPlanPageIndex](beforePromptStep) invalid params');
  if (!args) throw new Error(`[${agent.agentName}](beforePromptStep) args invalid`);
  if (!context.task) throw new Error(`[${agent.agentName}](beforePromptStep) task invalid`);

  const planningContext = getPlanningContextSnapshot(context);
  const finalPlan = getFinalizeSolutionPlanOutput(context);
  const mdm = getPlanMDMOutput(context);
  const horizontals = getPlanHorizontalsOutput(context);
  const plugins = getPlanPluginsOutput(context);
  const persistenceIndex = getPlanPersistenceIndexOutput(context);
  const tableDefinitions = getPlanTableDefinitionOutputs(context);
  const metricsIndex = getPlanMetricsIndexOutput(context);
  const metricTableDefinitions = getPlanMetricTableDefinitionOutputs(context);
  const usecasePlan = getPlanUsecaseEntitiesOutput(context);
  const workflowIndex = getPlanWorkflowIndexOutput(context);
  const workflowDefinitions = getPlanWorkflowDefinitionOutputs(context);
  const agentsPlan = getPlanAgentsOutput(context);

  return [
    createPlannerPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args,
      systemPrompt.split('{{toolName}}').join(PLAN_PAGE_INDEX_TOOL_NAME),
      buildHumanPrompt(
        args,
        planningContext.initialMetricsRequested,
        finalPlan,
        mdm,
        horizontals,
        plugins,
        persistenceIndex,
        tableDefinitions,
        metricsIndex,
        metricTableDefinitions,
        usecasePlan,
        workflowIndex,
        workflowDefinitions,
        agentsPlan
      ),
      planPageIndexToolSchema,
      PLAN_PAGE_INDEX_TOOL_NAME
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
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: PlanPageIndexOutput | undefined;

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlanPageIndexOutput(payload);
    validatePlanPageIndexOutput(output, getPlanningContextSnapshot(context).initialMetricsRequested);
    if (output.status === 'failed') {
      status = 'failed';
      traceMsg = 'agentPlanPageIndex returned status failed';
    } else if (output.status === 'needs_input') {
      traceMsg = 'agentPlanPageIndex returned status needs_input; keeping page index draft.';
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}](afterPromptStep) ${traceMsg}`);
  }

  await saveNewSolutionAgentTracePayload(context, agent.agentName, step);

  const intents: mls.msg.AgentIntent[] = [
    createPlannerUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, status === 'completed' ? 'input' : undefined),
  ];

  if (status === 'completed' && output) intents.push(...createFirstPageDefinitionIntent(context, output));
  return intents;
}

export function getPlanPageIndexOutput(context: mls.msg.ExecutionContext): PlanPageIndexOutput {
  return getPlannerOutput(context, 'agentPlanPageIndex', planPageIndexConfig, output =>
    validatePlanPageIndexOutput(output, getPlanningContextSnapshot(context).initialMetricsRequested)
  );
}

function extractPlanPageIndexOutput(payload: unknown): PlanPageIndexOutput {
  return extractPlannerOutput(payload, planPageIndexConfig);
}

const planPageIndexConfig = {
  toolName: PLAN_PAGE_INDEX_TOOL_NAME,
  stepId: PLAN_PAGE_INDEX_STEP_ID,
  stepIdAliases: PLAN_PAGE_INDEX_ALIASES,
  normalizeResult: normalizePlanPageIndexResult,
};

function normalizePlanPageIndexResult(value: unknown): PlanPageIndexResult {
  const result = assertRecord(value, 'result');
  return {
    pages: assertArray(result.pages, 'result.pages').map((item, index) => normalizePageIndexItem(item, `result.pages[${index}]`)),
  };
}

function normalizePageIndexItem(value: unknown, path: string): PageIndexItem {
  const page = assertRecord(value, path);
  const flowRefs = assertRecord(page.flowRefs, `${path}.flowRefs`);
  return {
    pageId: assertString(page.pageId, `${path}.pageId`),
    pageName: assertString(page.pageName, `${path}.pageName`),
    actor: assertString(page.actor, `${path}.actor`),
    purpose: assertString(page.purpose, `${path}.purpose`),
    capabilities: normalizeStringArray(page.capabilities, `${path}.capabilities`),
    flowRefs: {
      experienceFlows: normalizeStringArray(flowRefs.experienceFlows, `${path}.flowRefs.experienceFlows`),
      entityLifecycles: normalizeStringArray(flowRefs.entityLifecycles, `${path}.flowRefs.entityLifecycles`),
      taskWorkflows: normalizeStringArray(flowRefs.taskWorkflows, `${path}.flowRefs.taskWorkflows`),
      automations: normalizeStringArray(flowRefs.automations, `${path}.flowRefs.automations`),
    },
    pluginRefs: normalizeStringArray(page.pluginRefs, `${path}.pluginRefs`),
    mdmRefs: normalizeStringArray(page.mdmRefs, `${path}.mdmRefs`),
    primaryUserActions: normalizeStringArray(page.primaryUserActions, `${path}.primaryUserActions`),
    pageInputHints: normalizeStringArray(page.pageInputHints, `${path}.pageInputHints`),
    navigationRefs: assertArray(page.navigationRefs, `${path}.navigationRefs`),
    persistenceHints: normalizeStringArray(page.persistenceHints, `${path}.persistenceHints`),
    usecaseHints: normalizeStringArray(page.usecaseHints, `${path}.usecaseHints`),
    metricRefs: normalizeStringArray(page.metricRefs, `${path}.metricRefs`),
    rulesApplied: normalizeStringArray(page.rulesApplied, `${path}.rulesApplied`),
    bffCommandHints: assertArray(page.bffCommandHints, `${path}.bffCommandHints`),
  };
}

function normalizeStringArray(value: unknown, path: string): string[] {
  return assertArray(value, path).map((item, index) => assertString(item, `${path}[${index}]`));
}

function validatePlanPageIndexOutput(output: PlanPageIndexOutput, initialMetricsRequested: boolean): void {
  const ids = new Set<string>();
  for (const page of output.result.pages) {
    if (ids.has(page.pageId)) throw new Error(`duplicate pageId: ${page.pageId}`);
    ids.add(page.pageId);
  }

  if (output.status === 'ok' && output.result.pages.length === 0) {
    throw new Error('page index must include at least one page');
  }

  if (output.status === 'ok' && initialMetricsRequested) {
    const hasAdminMetricsPage = output.result.pages.some(page => page.actor === 'admin' && page.metricRefs.length > 0);
    if (!hasAdminMetricsPage) throw new Error('initial metrics dashboard requested, but no admin metric page was planned');
  }

  if (output.status === 'needs_input' && output.questions.length === 0) {
    throw new Error('needs_input page index must include questions');
  }
}

function createFirstPageDefinitionIntent(context: mls.msg.ExecutionContext, output: PlanPageIndexOutput): mls.msg.AgentIntent[] {
  const placeholder = findStepByPlanId(context, 'plan-page-definition') as mls.msg.AIAgentStep | null;
  if (!placeholder || placeholder.type !== 'agent' || placeholder.status === 'completed') return [];

  const firstPage = output.result.pages[0];
  if (!firstPage) {
    return [createPlannerUpdateStatusIntent(context, placeholder, placeholder, 0, 'completed', 'No pages to define.')];
  }

  return [
    createDynamicAgentStepIntent(
      context,
      placeholder,
      'agentPlanPageDefinition',
      `plan-page-definition:${firstPage.pageId}`,
      `Plan page ${firstPage.pageId}`,
      firstPage.pageId
    ),
  ];
}

function buildHumanPrompt(
  args: string,
  initialMetricsRequested: boolean,
  finalPlan: FinalSolutionPlanOutput,
  mdm: PlanMDMOutput,
  horizontals: PlanHorizontalsOutput,
  plugins: PlanPluginsOutput,
  persistenceIndex: PlanPersistenceIndexOutput,
  tableDefinitions: PlanTableDefinitionOutput[],
  metricsIndex: PlanMetricsIndexOutput,
  metricTableDefinitions: PlanMetricTableDefinitionOutput[],
  usecasePlan: PlanUsecaseEntitiesOutput,
  workflowIndex: PlanWorkflowIndexOutput,
  workflowDefinitions: PlanWorkflowDefinitionOutput[],
  agentsPlan: PlanAgentsOutput,
): string {
  return `## Planned step args
${args}

## Initial metrics dashboard requested
${initialMetricsRequested}

## Final solution plan
${JSON.stringify(finalPlan, null, 2)}

## MDM plan
${JSON.stringify(mdm, null, 2)}

## Horizontals plan
${JSON.stringify(horizontals, null, 2)}

## Plugin plan
${JSON.stringify(plugins, null, 2)}

## Persistence index
${JSON.stringify(persistenceIndex, null, 2)}

## Table definitions
${JSON.stringify(tableDefinitions, null, 2)}

## Metrics index
${JSON.stringify(metricsIndex, null, 2)}

## Metric table definitions
${JSON.stringify(metricTableDefinitions, null, 2)}

## Usecase plan
${JSON.stringify(usecasePlan, null, 2)}

## Workflow index
${JSON.stringify(workflowIndex, null, 2)}

## Workflow definitions
${JSON.stringify(workflowDefinitions, null, 2)}

## Agents plan
${JSON.stringify(agentsPlan, null, 2)}
`;
}

const systemPrompt = `
<!-- modelType: codepro -->

You are agentPlanPageIndex for the collab.codes "newSolution" flow.
Plan only the page index. Do not define full page sections or organisms in this step.
Use the same language as the user for page names, purposes, questions, and trace.
Use English camelCase identifiers for pageId and command hint names.

## Tool mode
Call the "{{toolName}}" tool with only these top-level arguments: status, result, questions, and trace. Put questions and trace beside result, never inside result. Do not include type, runId, stepId, schemaVersion, toolName, or arguments; the harness fills those fields.
Do not return prose.

## Rules
- Return only page summaries.
- Do not hard-code pages from a sample domain.
- Derive page ids and page names from actors, capabilities, workflows, and core user actions in the final solution plan.
- Include pages for every now capability that requires user interaction.
- Include staff or admin pages only when the domain has internal operations, backoffice review, fulfillment, setup, governance, or task workflows.
- Include admin-only metric dashboard pages when the metrics plan enables initial dashboards or initial metrics dashboard requested is true.
- Metric dashboard pages must use actor admin.
- A commitment page such as booking, order, request, subscription, or contract must include the required subject, resource, service, or product selection before confirmation.
- Add pageInputHints only when they help the later single-page step infer required page boundary inputs.
- Add navigationRefs only as lightweight references to related source or destination pages; do not include input mappings.
- Add persistenceHints only when they help the later single-page step connect BFF commands to module-owned table definitions.
- Add usecaseHints when they help the later single-page step connect BFF commands to layer_3_usecases.
- Add metricRefs for pages that display metric tables.
- If a page needs data from the backend, add command hints with name, purpose, and expected input or output summary.
- Use rule ids; do not write loose rule text.
- Do not generate materialization details or TypeScript code.
`;