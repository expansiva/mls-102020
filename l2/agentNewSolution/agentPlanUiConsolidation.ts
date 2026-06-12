/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanUiConsolidation.ts" enhancement="_102027_/l2/enhancementAgent"/>

// F-04 (enriquecimentoFluxo): cross-page UI consolidation — re-port of the previous flow's
// agentToBePage2 into the staged architecture. Runs AFTER the page-definition fan-out: a
// deterministic pre-pass detects organisms repeated across pages (same/similar names), then ONE
// LLM call proposes the shared components (canonical name, owning pages, merged responsibilities)
// and naming fixes. v1 produces a consolidation REPORT (l2/{module}/uiConsolidation.defs.ts,
// artifactType 'uiConsolidation') consumed by the future materialization; page defs are NOT
// rewritten here.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPlannerPromptReadyIntent,
  createPlannerUpdateStatusIntent,
  createPlannerVariableToolSchema,
  extractPlannerOutput,
  hydrateNewSolutionOutputs,
} from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';
import { saveNewSolutionAgentTracePayload, saveNewSolutionPlanArtifacts } from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import { getPlanPageDefinitionOutputs } from '/_102020_/l2/agentNewSolution/agentPlanPageDefinition.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentPlanUiConsolidation',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Consolidate organisms across page definitions (shared components, naming consistency)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const PLAN_UI_CONSOLIDATION_TOOL_NAME = 'submitUiConsolidationPlan';
export const PLAN_UI_CONSOLIDATION_STEP_ID = 'plan-ui-consolidation';
const PLAN_UI_CONSOLIDATION_ALIASES = [PLAN_UI_CONSOLIDATION_STEP_ID, 'plan-ui-consolidation'];

export interface SharedComponentPlan {
  componentId: string;
  title: string;
  kind: string;
  pages: string[];
  replacesOrganisms: string[];
  responsibilities: string;
}

export interface UiNamingFix {
  pageId: string;
  organismName: string;
  suggestedName: string;
  reason: string;
}

export interface PlanUiConsolidationResult {
  sharedComponents: SharedComponentPlan[];
  namingFixes: UiNamingFix[];
  notes: string[];
}

export type PlanUiConsolidationOutput = PlannerOutput<PlanUiConsolidationResult>;

const planUiConsolidationToolSchema = createPlannerVariableToolSchema(
  PLAN_UI_CONSOLIDATION_TOOL_NAME,
  'Submit the cross-page UI consolidation report (shared components and naming fixes).',
  {
    type: 'object',
    additionalProperties: false,
    required: ['sharedComponents', 'namingFixes', 'notes'],
    properties: {
      sharedComponents: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['componentId', 'title', 'kind', 'pages', 'replacesOrganisms', 'responsibilities'],
          properties: {
            componentId: { type: 'string' },
            title: { type: 'string' },
            kind: { enum: ['organism', 'molecule'] },
            pages: { type: 'array', items: { type: 'string' } },
            replacesOrganisms: { type: 'array', items: { type: 'string' } },
            responsibilities: { type: 'string' },
          },
        },
      },
      namingFixes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['pageId', 'organismName', 'suggestedName', 'reason'],
          properties: {
            pageId: { type: 'string' },
            organismName: { type: 'string' },
            suggestedName: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
      notes: { type: 'array', items: { type: 'string' } },
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
  if (!agent || !step) throw new Error('[agentPlanUiConsolidation](beforePromptStep) invalid params');
  if (!context.task) throw new Error(`[${agent.agentName}](beforePromptStep) task invalid`);

  const pageDefinitions = await getPlanPageDefinitionOutputs(context);
  // Compact cross-page inventory: pageId + per-organism summary (name/purpose/actions/entities).
  const inventory = pageDefinitions.map(pd => ({
    pageId: pd.result.pageDefinition.pageId,
    organisms: pd.result.pageDefinition.sections.flatMap(section => section.organisms.map(organism => ({
      organismName: organism.organismName,
      purpose: organism.purpose,
      userActions: organism.userActions,
      requiredEntities: organism.requiredEntities,
    }))),
  }));

  // Deterministic pre-pass: candidate duplicates by normalized organism name across pages.
  const byNormalizedName = new Map<string, string[]>();
  for (const page of inventory) {
    for (const organism of page.organisms) {
      const key = organism.organismName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const list = byNormalizedName.get(key) || [];
      list.push(`${page.pageId}.${organism.organismName}`);
      byNormalizedName.set(key, list);
    }
  }
  const duplicateCandidates = [...byNormalizedName.values()].filter(list => list.length > 1);

  const humanPrompt = `## Planned step args
${args || PLAN_UI_CONSOLIDATION_STEP_ID}

## Cross-page organism inventory
${JSON.stringify(inventory, null, 2)}

## Deterministic duplicate candidates (same normalized organism name on more than one page)
${JSON.stringify(duplicateCandidates, null, 2)}
`;

  return [
    createPlannerPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args || PLAN_UI_CONSOLIDATION_STEP_ID,
      systemPrompt.split('{{toolName}}').join(PLAN_UI_CONSOLIDATION_TOOL_NAME),
      humanPrompt,
      planUiConsolidationToolSchema,
      PLAN_UI_CONSOLIDATION_TOOL_NAME
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
  let output: PlanUiConsolidationOutput | undefined;

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlanUiConsolidationOutput(payload);
    if (output.status === 'needs_input' && output.questions.length === 0) throw new Error('needs_input ui consolidation must include questions');
    if (output.status === 'failed') {
      status = 'failed';
      traceMsg = 'agentPlanUiConsolidation returned status failed';
    }
  } catch (error) {
    // Consolidation is an ENRICHMENT step: a failure here must not block the flow's tail
    // (coverage/final). Record the failure and complete with an empty report.
    traceMsg = `agentPlanUiConsolidation failed (non-blocking): ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[${agent.agentName}](afterPromptStep) ${traceMsg}`);
    output = undefined;
    status = 'completed';
  }

  const canonicalSaved = await saveNewSolutionAgentTracePayload(context, agent.agentName, step); // F-06
  if (status === 'completed' && output && output.status === 'ok') {
    await saveNewSolutionPlanArtifacts(context, agent.agentName, step, output);
  }
  return [createPlannerUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, status === 'completed' ? (canonicalSaved ? 'input_output' : 'input') : undefined)];
}

function extractPlanUiConsolidationOutput(payload: unknown): PlanUiConsolidationOutput {
  return extractPlannerOutput(payload, planUiConsolidationConfig);
}

const planUiConsolidationConfig = {
  toolName: PLAN_UI_CONSOLIDATION_TOOL_NAME,
  stepId: PLAN_UI_CONSOLIDATION_STEP_ID,
  stepIdAliases: PLAN_UI_CONSOLIDATION_ALIASES,
  normalizeResult: normalizePlanUiConsolidationResult,
};

function normalizePlanUiConsolidationResult(value: unknown): PlanUiConsolidationResult {
  const result = assertRecord(value, 'result');
  return {
    sharedComponents: assertArray(result.sharedComponents || [], 'result.sharedComponents').map((item, index) => {
      const component = assertRecord(item, `result.sharedComponents[${index}]`);
      return {
        componentId: assertString(component.componentId, `result.sharedComponents[${index}].componentId`),
        title: assertString(component.title, `result.sharedComponents[${index}].title`),
        kind: assertString(component.kind, `result.sharedComponents[${index}].kind`),
        pages: assertArray(component.pages, `result.sharedComponents[${index}].pages`).map((id, i) => assertString(id, `result.sharedComponents[${index}].pages[${i}]`)),
        replacesOrganisms: assertArray(component.replacesOrganisms, `result.sharedComponents[${index}].replacesOrganisms`).map((id, i) => assertString(id, `result.sharedComponents[${index}].replacesOrganisms[${i}]`)),
        responsibilities: assertString(component.responsibilities, `result.sharedComponents[${index}].responsibilities`),
      };
    }),
    namingFixes: assertArray(result.namingFixes || [], 'result.namingFixes').map((item, index) => {
      const fix = assertRecord(item, `result.namingFixes[${index}]`);
      return {
        pageId: assertString(fix.pageId, `result.namingFixes[${index}].pageId`),
        organismName: assertString(fix.organismName, `result.namingFixes[${index}].organismName`),
        suggestedName: assertString(fix.suggestedName, `result.namingFixes[${index}].suggestedName`),
        reason: assertString(fix.reason, `result.namingFixes[${index}].reason`),
      };
    }),
    notes: assertArray(result.notes || [], 'result.notes').map((item, index) => assertString(item, `result.notes[${index}]`)),
  };
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are agentPlanUiConsolidation for the collab.codes "newSolution" flow.
Consolidate the UI plan ACROSS pages: identify organisms that should become shared components and
naming inconsistencies between pages. Your output is a report consumed by the materialization —
do not redesign pages.
Use the same language as the user for titles, responsibilities, reasons, and notes.
Use English camelCase identifiers for componentId and organism names.

## Tool mode
Call the "{{toolName}}" tool with only these top-level arguments: status, result, questions, and trace. Put questions and trace beside result, never inside result. Do not include type, runId, stepId, schemaVersion, toolName, or arguments; the harness fills those fields.
Do not return prose.

## Rules
- A shared component is justified when 2+ pages have organisms with the SAME responsibility (the deterministic duplicate candidates are a starting point; also detect semantic duplicates with different names — e.g. filtroLista vs listFilters).
- Each sharedComponent lists the pages it serves and the organisms it replaces (page.organismName refs from the inventory).
- namingFixes align organism names to one consistent camelCase convention across pages; suggest the fix, never invent new responsibilities.
- Be conservative: page-specific organisms stay page-specific. An empty sharedComponents list is a valid answer for small solutions.
- notes record consolidation decisions the materialization should know (max 10, one line each).
`;
