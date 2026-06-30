/// <mls fileReference="_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerOutput,
  assertArray,
  assertRecord,
  createPlannerPromptReadyIntent,
  createPlannerVariableToolSchema,
  createPlannerUpdateStatusIntent,
  extractPlannerOutput,
  findStepByPlanId,
  getActorIdSet,
  getPlannerOutput,
  getPlanningContextSnapshot,
  hasAcceptedNowArtifact,
  hydrateNewSolutionOutputs,
  coerceOntologyEnumArrays,
} from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';
import {
  TEMP_MODULE_FOLDER,
  getApprovedModuleName,
  getInitialModuleName,
  migrateTempModuleFolder,
  reserveAvailableModuleName,
  saveNewSolutionAgentTracePayload,
  saveNewSolutionPlanArtifacts,
} from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import { getBlueprintReviewOutput } from '/_102020_/l2/agentNewSolution/agentBlueprintReview.js';
import type { BlueprintReviewOutput } from '/_102020_/l2/agentNewSolution/agentBlueprintReview.js';
import { createModuleNameFinalResultIntent, getSolutionBlueprintOutput } from '/_102020_/l2/agentNewSolution/agentSolutionBlueprint.js';
import { createEntityDefinitionParallelIntent } from '/_102020_/l2/agentNewSolution/agentPlanEntityDefinition.js';
import type { SolutionBlueprintOutput } from '/_102020_/l2/agentNewSolution/agentSolutionBlueprint.js';
import { finalSolutionPlanResultSchema } from '/_102020_/l2/agentNewSolution/agentSolutionPlanSchemas.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentFinalizeSolutionPlan',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Finalize the solution plan after blueprint review',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const FINALIZE_SOLUTION_PLAN_TOOL_NAME = 'submitFinalSolutionPlan';
export const FINALIZE_SOLUTION_PLAN_STEP_ID = '08-finalize-solution-plan';
const FINALIZE_SOLUTION_PLAN_ALIASES = [FINALIZE_SOLUTION_PLAN_STEP_ID, 'plan-finalize-solution-plan'];

export interface FinalSolutionPlanResult {
  module: Record<string, unknown>;
  actors: unknown[];
  capabilities: unknown[];
  ontology: {
    entities: Record<string, unknown>;
  };
  rules: unknown[];
  relationships: unknown[];
  userActions: unknown[];
  approvedArtifacts: {
    pages: unknown[];
    workflows: unknown[];
    plugins: unknown[];
    agents: unknown[];
    horizontalModules: unknown[];
    mdm: unknown[];
    metricTables: unknown[];
    metricDashboards: unknown[];
    /**
     * Approved usecase entity groups (by usecaseEntityId, e.g. 'OrderEntity').
     * These are entity-level groupings — not individual usecases.
     * Individual usecases (with usecaseId) live in PlanUsecaseEntitiesResult.usecases.
     * Validators and usecaseRefs always reference usecaseId, never usecaseEntityId.
     */
    usecaseEntities: unknown[];
  };
  decisions: unknown[];
  deferredItems: unknown[];
}

export type FinalSolutionPlanOutput = PlannerOutput<FinalSolutionPlanResult>;

const finalizeSolutionPlanToolSchema = createPlannerVariableToolSchema(
  FINALIZE_SOLUTION_PLAN_TOOL_NAME,
  'Submit the final solution plan after applying blueprint review findings.',
  finalSolutionPlanResultSchema
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
  if (!agent || !step) throw new Error('[agentFinalizeSolutionPlan](beforePromptStep) invalid params');
  if (!args) throw new Error(`[${agent.agentName}](beforePromptStep) args invalid`);
  if (!context.task) throw new Error(`[${agent.agentName}](beforePromptStep) task invalid`);

  const snapshot = getPlanningContextSnapshot(context);
  const blueprint = getSolutionBlueprintOutput(context);
  const review = getBlueprintReviewOutput(context);
  return [
    createPlannerPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args,
      systemPrompt.split('{{toolName}}').join(FINALIZE_SOLUTION_PLAN_TOOL_NAME),
      buildHumanPrompt(args, blueprint, review, snapshot),
      finalizeSolutionPlanToolSchema,
      FINALIZE_SOLUTION_PLAN_TOOL_NAME
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
  let output: FinalSolutionPlanOutput | undefined;

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractFinalizeSolutionPlanOutput(payload);
    validateFinalizeSolutionPlanOutput(output, context);
    if (output.status === 'failed') {
      status = 'failed';
      traceMsg = 'agentFinalizeSolutionPlan returned status failed';
    } else if (output.status === 'needs_input') {
      traceMsg = 'agentFinalizeSolutionPlan returned status needs_input; keeping corrected plan draft.';
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}](afterPromptStep) ${traceMsg}`);
  }

  // advisory actor-contract check at the source. Every actor reference in the
  // final plan must be one of actors[].actorId (no hard-coded/translated names). Non-fatal here
  // (downstream index validators are the hard gates); surfaces drift early via console.warn.
  if (status === 'completed' && output && output.status === 'ok') warnFinalizeActorConsistency(output);

  const canonicalSaved = await saveNewSolutionAgentTracePayload(context, agent.agentName, step); // F-06
  if (status === 'completed' && output) await saveNewSolutionPlanArtifacts(context, agent.agentName, step, output);

  const intents: mls.msg.AgentIntent[] = [];

  // Temp-folder naming FALLBACK: normally agentSolutionBlueprint confirms the module name and
  // migrates _traceTemp. If that hook failed after the LLM succeeded (e.g. extraction error on a
  // retry) the run may reach finalize still on the temp folder — confirm from THIS output.
  const alreadyConfirmed = getApprovedModuleName(context);
  if (status === 'completed' && output && output.status === 'ok' && (!alreadyConfirmed || alreadyConfirmed === TEMP_MODULE_FOLDER)) {
    try {
      const requested = (output.result.module as Record<string, unknown>).moduleName;
      const finalName = reserveAvailableModuleName(requested, getInitialModuleName(context));
      await migrateTempModuleFolder(finalName);
      intents.push(createModuleNameFinalResultIntent(context, parentStep, finalName));
      console.log(`[${agent.agentName}] module name confirmed (fallback): ${finalName}`);
    } catch (error) {
      console.warn(`[${agent.agentName}] module name fallback confirmation failed:`, error);
    }
  }

  // F-02: spawn the per-entity ontology enrichment fan-out (one child per map entity) BEFORE
  // completing this step, so the placeholder keeps a non-terminal child (orchestration constraint).
  if (status === 'completed' && output && output.status === 'ok') {
    intents.push(...createEntityDefinitionParallelIntent(context, output));
  }

  intents.push(
    createPlannerUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, status === 'completed' ? (canonicalSaved ? 'input_output' : 'input') : undefined),
  );

  if (status === 'completed') {
    const blueprintStep = findStepByPlanId(context, 'plan-solution-blueprint') as mls.msg.AIAgentStep | null;
    if (blueprintStep?.type === 'agent') {
      intents.push(createPlannerUpdateStatusIntent(context, parentStep, blueprintStep, hookSequential, 'completed', undefined, 'input_output'));
    }
  }

  return intents;
}

export function getFinalizeSolutionPlanOutput(context: mls.msg.ExecutionContext): FinalSolutionPlanOutput {
  return getPlannerOutput(context, 'agentFinalizeSolutionPlan', finalizeSolutionPlanConfig, output => validateFinalizeSolutionPlanOutput(output, context));
}

function extractFinalizeSolutionPlanOutput(payload: unknown): FinalSolutionPlanOutput {
  return extractPlannerOutput(payload, finalizeSolutionPlanConfig);
}

const finalizeSolutionPlanConfig = {
  toolName: FINALIZE_SOLUTION_PLAN_TOOL_NAME,
  stepId: FINALIZE_SOLUTION_PLAN_STEP_ID,
  preNormalizeResult: coerceOntologyEnumArrays,
  stepIdAliases: FINALIZE_SOLUTION_PLAN_ALIASES,
  normalizeResult: normalizeFinalSolutionPlanResult,
};

function normalizeFinalSolutionPlanResult(value: unknown): FinalSolutionPlanResult {
  const result = assertRecord(value, 'result');
  const ontology = assertRecord(result.ontology, 'result.ontology');
  const approvedArtifacts = assertRecord(result.approvedArtifacts, 'result.approvedArtifacts');

  return {
    module: assertRecord(result.module, 'result.module'),
    actors: assertArray(result.actors, 'result.actors'),
    capabilities: assertArray(result.capabilities, 'result.capabilities'),
    ontology: {
      entities: assertRecord(ontology.entities, 'result.ontology.entities'),
    },
    rules: assertArray(result.rules, 'result.rules'),
    relationships: assertArray(result.relationships, 'result.relationships'),
    userActions: assertArray(result.userActions, 'result.userActions'),
    approvedArtifacts: {
      pages: assertArray(approvedArtifacts.pages, 'result.approvedArtifacts.pages'),
      workflows: assertArray(approvedArtifacts.workflows, 'result.approvedArtifacts.workflows'),
      plugins: assertArray(approvedArtifacts.plugins, 'result.approvedArtifacts.plugins'),
      agents: assertArray(approvedArtifacts.agents, 'result.approvedArtifacts.agents'),
      horizontalModules: assertArray(approvedArtifacts.horizontalModules, 'result.approvedArtifacts.horizontalModules'),
      mdm: assertArray(approvedArtifacts.mdm, 'result.approvedArtifacts.mdm'),
      metricTables: assertArray(approvedArtifacts.metricTables, 'result.approvedArtifacts.metricTables'),
      metricDashboards: assertArray(approvedArtifacts.metricDashboards, 'result.approvedArtifacts.metricDashboards'),
      usecaseEntities: assertArray(approvedArtifacts.usecaseEntities, 'result.approvedArtifacts.usecaseEntities'),
    },
    decisions: assertArray(result.decisions, 'result.decisions'),
    deferredItems: assertArray(result.deferredItems, 'result.deferredItems'),
  };
}

function validateFinalizeSolutionPlanOutput(output: FinalSolutionPlanOutput, context: mls.msg.ExecutionContext): void {
  const snapshot = getPlanningContextSnapshot(context);
  if (output.status === 'ok' && output.result.approvedArtifacts.mdm.length === 0) throw new Error('final solution plan must keep MDM');
  // T-001 moved to the per-entity definition fan-out (F-02): the final plan keeps the slim
  // ontology MAP; canonical fields live in the plan-entity-definition artifacts.
  if (output.status === 'ok' && snapshot.initialMetricsRequested) {
    if (output.result.approvedArtifacts.metricTables.length === 0) throw new Error('initial metrics requested, but final plan has no metricTables');
    if (output.result.approvedArtifacts.metricDashboards.length === 0) throw new Error('initial metrics requested, but final plan has no metricDashboards');
  }
  if (output.status === 'ok' && hasAcceptedNowArtifact(snapshot.implementationDecisions, 'usecaseEntity') && output.result.approvedArtifacts.usecaseEntities.length === 0) {
    throw new Error('accepted usecaseEntity planning, but final plan has no usecaseEntities');
  }
  if (output.status === 'needs_input' && output.questions.length === 0) throw new Error('needs_input final plan must include questions');
}

// warn (non-fatal) about actor references that are not declared in actors[].actorId.
function warnFinalizeActorConsistency(output: FinalSolutionPlanOutput): void {
  const actorIds = getActorIdSet(output.result.actors);
  if (actorIds.size === 0) return;
  const unknown = new Set<string>();
  const check = (value: unknown) => {
    if (typeof value === 'string' && value.trim() && !actorIds.has(value)) unknown.add(value);
  };
  const asRecords = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object') : [];

  for (const cap of asRecords(output.result.capabilities)) check(cap.actor);
  for (const ua of asRecords(output.result.userActions)) check(ua.actor);
  for (const page of asRecords(output.result.approvedArtifacts.pages)) check(page.actor);
  for (const dash of asRecords(output.result.approvedArtifacts.metricDashboards)) check(dash.actor);
  for (const wf of asRecords(output.result.approvedArtifacts.workflows)) {
    if (Array.isArray(wf.actors)) wf.actors.forEach(check);
    else check(wf.actor);
  }

  if (unknown.size > 0) {
    console.warn(`[agentFinalizeSolutionPlan] actor refs not in actors[].actorId: ${[...unknown].join(', ')}. Downstream index validators will reject these.`);
  }
}

function buildHumanPrompt(
  args: string,
  blueprint: SolutionBlueprintOutput,
  review: BlueprintReviewOutput,
  snapshot: ReturnType<typeof getPlanningContextSnapshot>,
): string {
  return `## Planned step args
${args}

## Solution blueprint
${JSON.stringify(blueprint, null, 2)}

## Blueprint review
${JSON.stringify(review, null, 2)}

## Accepted implementation decisions
${JSON.stringify(snapshot.implementationDecisions, null, 2)}

## Initial metrics/dashboard requested
${snapshot.initialMetricsRequested}
`;
}

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are agentFinalizeSolutionPlan for the collab.codes "newSolution" flow.
Apply the blueprint review and produce the final solution plan.
Use the same language as the user for labels, descriptions, questions, and trace.
Use English camelCase identifiers for ids and PascalCase for entity names.

## Tool mode
Call the "{{toolName}}" tool with only these top-level arguments: status, result, questions, and trace. Put questions and trace beside result, never inside result. Do not include type, runId, stepId, schemaVersion, toolName, or arguments; the harness fills those fields.
Do not return prose.

## Rules
- Fix all review issues with severity "error".
- Keep later items in deferredItems.
- Do not remove MDM.
- Do not remove approved initial metrics/dashboard.
- Do not remove layer_3 usecase planning when BFF commands, writes, lifecycle changes, or metric updates exist.
- Keep rules centralized in rules with stable ruleId values.
- Page definitions and BFF commands must reference rules by ruleId.
- Keep ontology.entities as an object map keyed by PascalCase entity id. Do not require duplicating entityId inside each entity value.
- The ontology is a MAP: keep every entity's title/description/ownership (and statusEnum/lifecycleStates when present). Do NOT invent or expand field lists here — fields are detailed later by the per-entity definition stage; preserve any fields that the blueprint already declared, unchanged.
- DECISIONS REQUIRE EVIDENCE: every decision's reason must cite something that actually exists in the inputs (a blueprint artifact, a review issue, or an accepted implementation decision). Never justify a decision with an approval or artifact that is not present — e.g. do not claim a page "was already approved" unless it appears in approvedArtifacts. affectedArtifacts must list real artifact ids from this plan.
- Do not continue if an error cannot be fixed from available context; return status "needs_input" with questions.
`;
