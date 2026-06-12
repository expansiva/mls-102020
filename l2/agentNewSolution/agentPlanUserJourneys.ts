/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanUserJourneys.ts" enhancement="_102027_/l2/enhancementAgent"/>

// F-01 (enriquecimentoFluxo): user journeys per actor × capability — re-port of the previous
// flow's agentToBeUserJourney into the staged architecture. Journeys are the PRIMARY input for
// the page index (F-03): pages emerge from journey steps (kanban, tracker, agenda are journeys,
// not CRUDs), instead of being inferred from capabilities alone. Saved as
// l2/{module}/journeys.defs.ts (artifactType 'userJourneys').

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  compactFinalPlan,
  createPlannerPromptReadyIntent,
  createPlannerUpdateStatusIntent,
  createPlannerVariableToolSchema,
  extractPlannerOutput,
  getActorIdSet,
  getPlannerOutput,
  hydrateNewSolutionOutputs,
  isRecord,
} from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';
import { saveNewSolutionAgentTracePayload, saveNewSolutionPlanArtifacts } from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import { getFinalizeSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentPlanUserJourneys',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Plan user journeys per actor and capability (primary input for the page index)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const PLAN_USER_JOURNEYS_TOOL_NAME = 'submitUserJourneysPlan';
export const PLAN_USER_JOURNEYS_STEP_ID = 'plan-user-journeys';
const PLAN_USER_JOURNEYS_ALIASES = [PLAN_USER_JOURNEYS_STEP_ID, 'plan-user-journeys'];

export interface UserJourneyStep {
  intent: string;
  action: string;
  entities: string[];
  pageHint?: string;
  outcome: string;
}

export interface UserJourney {
  journeyId: string;
  title: string;
  actor: string;
  capabilityIds: string[];
  description: string;
  steps: UserJourneyStep[];
}

export interface PlanUserJourneysResult {
  journeys: UserJourney[];
}

export type PlanUserJourneysOutput = PlannerOutput<PlanUserJourneysResult>;

const journeyStepSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'action', 'entities', 'outcome'],
  properties: {
    intent: { type: 'string' },
    action: { type: 'string' },
    entities: { type: 'array', items: { type: 'string' } },
    pageHint: { type: 'string' },
    outcome: { type: 'string' },
  },
};

const planUserJourneysToolSchema = createPlannerVariableToolSchema(
  PLAN_USER_JOURNEYS_TOOL_NAME,
  'Submit the user journeys (per actor and capability) for the approved solution plan.',
  {
    type: 'object',
    additionalProperties: false,
    required: ['journeys'],
    properties: {
      journeys: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['journeyId', 'title', 'actor', 'capabilityIds', 'description', 'steps'],
          properties: {
            journeyId: { type: 'string' },
            title: { type: 'string' },
            actor: { type: 'string' },
            capabilityIds: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            steps: { type: 'array', items: journeyStepSchema, minItems: 1 },
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
  if (!agent || !step) throw new Error('[agentPlanUserJourneys](beforePromptStep) invalid params');
  if (!context.task) throw new Error(`[${agent.agentName}](beforePromptStep) task invalid`);

  const finalPlan = getFinalizeSolutionPlanOutput(context);
  const humanPrompt = `## Planned step args
${args || PLAN_USER_JOURNEYS_STEP_ID}

## Final solution plan (compact)
${JSON.stringify(compactFinalPlan(finalPlan.result), null, 2)}
`;

  return [
    createPlannerPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args || PLAN_USER_JOURNEYS_STEP_ID,
      systemPrompt.split('{{toolName}}').join(PLAN_USER_JOURNEYS_TOOL_NAME),
      humanPrompt,
      planUserJourneysToolSchema,
      PLAN_USER_JOURNEYS_TOOL_NAME
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
  let output: PlanUserJourneysOutput | undefined;

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlanUserJourneysOutput(payload);
    validatePlanUserJourneysOutput(output, context);
    if (output.status === 'failed') {
      status = 'failed';
      traceMsg = 'agentPlanUserJourneys returned status failed';
    } else if (output.status === 'needs_input') {
      traceMsg = 'agentPlanUserJourneys returned status needs_input; keeping journeys draft.';
    } else {
      // Deterministic coverage checkpoint: every priority-now capability needs >= 1 journey.
      const uncovered = findUncoveredNowCapabilities(output, context);
      if (uncovered.length > 0) {
        traceMsg = `journeys approved with uncovered priority-now capabilities (page index must still cover them): ${uncovered.join(', ')}`;
        console.warn(`[${agent.agentName}] ${traceMsg}`);
      }
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}](afterPromptStep) ${traceMsg}`);
  }

  const canonicalSaved = await saveNewSolutionAgentTracePayload(context, agent.agentName, step); // F-06
  if (status === 'completed' && output) await saveNewSolutionPlanArtifacts(context, agent.agentName, step, output);
  return [createPlannerUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, status === 'completed' ? (canonicalSaved ? 'input_output' : 'input') : undefined)];
}

export function getPlanUserJourneysOutput(context: mls.msg.ExecutionContext): PlanUserJourneysOutput {
  return getPlannerOutput(context, 'agentPlanUserJourneys', planUserJourneysConfig, output => validatePlanUserJourneysOutput(output, context));
}

/** Safe variant for consumers that must tolerate runs created before F-01 existed. */
export function getPlanUserJourneysOutputSafe(context: mls.msg.ExecutionContext): PlanUserJourneysOutput | null {
  try {
    return getPlanUserJourneysOutput(context);
  } catch {
    return null;
  }
}

function findUncoveredNowCapabilities(output: PlanUserJourneysOutput, context: mls.msg.ExecutionContext): string[] {
  try {
    const covered = new Set<string>();
    for (const journey of output.result.journeys) for (const id of journey.capabilityIds) covered.add(id);
    const uncovered: string[] = [];
    for (const value of getFinalizeSolutionPlanOutput(context).result.capabilities) {
      if (!isRecord(value)) continue;
      const id = typeof value.capabilityId === 'string' ? value.capabilityId : '';
      if (id && value.priority === 'now' && !covered.has(id)) uncovered.push(id);
    }
    return uncovered;
  } catch {
    return [];
  }
}

function extractPlanUserJourneysOutput(payload: unknown): PlanUserJourneysOutput {
  return extractPlannerOutput(payload, planUserJourneysConfig);
}

const planUserJourneysConfig = {
  toolName: PLAN_USER_JOURNEYS_TOOL_NAME,
  stepId: PLAN_USER_JOURNEYS_STEP_ID,
  stepIdAliases: PLAN_USER_JOURNEYS_ALIASES,
  normalizeResult: normalizePlanUserJourneysResult,
};

function normalizePlanUserJourneysResult(value: unknown): PlanUserJourneysResult {
  const result = assertRecord(value, 'result');
  return {
    journeys: assertArray(result.journeys, 'result.journeys').map((item, index) => normalizeJourney(item, `result.journeys[${index}]`)),
  };
}

function normalizeJourney(value: unknown, path: string): UserJourney {
  const journey = assertRecord(value, path);
  return {
    journeyId: assertString(journey.journeyId, `${path}.journeyId`),
    title: assertString(journey.title, `${path}.title`),
    actor: assertString(journey.actor, `${path}.actor`),
    capabilityIds: assertArray(journey.capabilityIds, `${path}.capabilityIds`).map((id, i) => assertString(id, `${path}.capabilityIds[${i}]`)),
    description: assertString(journey.description, `${path}.description`),
    steps: assertArray(journey.steps, `${path}.steps`).map((item, i) => normalizeJourneyStep(item, `${path}.steps[${i}]`)),
  };
}

function normalizeJourneyStep(value: unknown, path: string): UserJourneyStep {
  const step = assertRecord(value, path);
  return {
    intent: assertString(step.intent, `${path}.intent`),
    action: assertString(step.action, `${path}.action`),
    entities: assertArray(step.entities, `${path}.entities`).map((id, i) => assertString(id, `${path}.entities[${i}]`)),
    pageHint: typeof step.pageHint === 'string' && step.pageHint.trim() ? step.pageHint.trim() : undefined,
    outcome: assertString(step.outcome, `${path}.outcome`),
  };
}

function validatePlanUserJourneysOutput(output: PlanUserJourneysOutput, context: mls.msg.ExecutionContext): void {
  if (output.status === 'needs_input' && output.questions.length === 0) throw new Error('needs_input journeys plan must include questions');
  if (output.status !== 'ok') return;
  // Actors are a hard contract (same rule as every other index).
  const actorIds = getActorIdSet(getFinalizeSolutionPlanOutput(context).result.actors);
  if (actorIds.size === 0) return;
  for (const journey of output.result.journeys) {
    if (!actorIds.has(journey.actor)) {
      throw new Error(`journey ${journey.journeyId} actor '${journey.actor}' is not a final plan actorId`);
    }
  }
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are agentPlanUserJourneys for the collab.codes "newSolution" flow.
Produce the USER JOURNEYS of the approved solution: for each actor and priority-now capability,
describe how the user actually accomplishes the goal, step by step. The journeys are the PRIMARY
input for the page index — pages will be derived from journey steps, so a missing journey means a
missing screen.
Use the same language as the user for titles, descriptions, intents, actions, and outcomes.
Use English camelCase identifiers for journeyId and pageHint.

## Tool mode
Call the "{{toolName}}" tool with only these top-level arguments: status, result, questions, and trace. Put questions and trace beside result, never inside result. Do not include type, runId, stepId, schemaVersion, toolName, or arguments; the harness fills those fields.
Do not return prose.

## Rules
- Cover EVERY priority-now capability with at least one journey; soon capabilities may share journeys.
- actor must be a final plan actorId, never an invented or translated name.
- Each journey is a realistic sequence: steps with intent (what the user wants), action (what they do), entities (ontology entity ids touched), outcome (what changes), and an optional pageHint (camelCase screen id suggestion, e.g. leadsKanban, ordersTracker, visitsAgenda).
- Think in WORK SURFACES, not CRUD: pipelines/kanbans, trackers by stage, agendas/calendars, POS-style fast flows, dashboards — when the domain implies one, the journey must walk through it and hint the page.
- Include the unhappy paths that matter operationally (cancel, reschedule, reject) as steps or separate journeys.
- Journeys describe interaction, not implementation: no tables, no BFF, no components.
- If the plan lacks information for a coherent journey, return status "needs_input" with questions.
`;
