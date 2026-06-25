/// <mls fileReference="_102020_/l2/agentNewSolution/agentPlanEntityDefinition.ts" enhancement="_102027_/l2/enhancementAgent"/>

// F-02 (enriquecimentoFluxo): per-entity ontology enrichment fan-out.
// The blueprint/final plan carries a slim ontology MAP (title/description/ownership). This agent
// runs one child per entity (spawned by agentFinalizeSolutionPlan after approval) and produces the
// CANONICAL entity shape: complete fields (with per-field enum), statusEnum, lifecycleStates and
// rulesApplied. Saved as l2/{module}/ontology/{entityId}.defs.ts (artifactType 'ontologyEntity');
// downstream consumers (entity catalog, table/page/workflow definition prompts) read the enriched
// shape via getEnrichedOntologyEntities.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPlannerPromptReadyIntent,
  createPlannerUpdateStatusIntent,
  createPlannerVariableToolSchema,
  createParallelDynamicAgentStepIntent,
  extractPlannerOutput,
  findStepByPlanId,
  getPlannerOutputs,
  hydrateNewSolutionOutputs,
  isRecord,
  pickRecordsByIds,
  reconcileParallelDynamicFanOut,
} from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';
import { readSavedPlanArtifactDataList, saveNewSolutionAgentTracePayload, saveNewSolutionPlanArtifacts } from '/_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.js';
import { getFinalizeSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';
import type { FinalSolutionPlanOutput } from '/_102020_/l2/agentNewSolution/agentFinalizeSolutionPlan.js';
import { entityFieldSchema } from '/_102020_/l2/agentNewSolution/agentSolutionPlanSchemas.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentPlanEntityDefinition',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Detail one ontology entity (canonical fields, enums, lifecycle) from the slim final plan map',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

export const PLAN_ENTITY_DEFINITION_TOOL_NAME = 'submitEntityDefinitionPlan';
export const PLAN_ENTITY_DEFINITION_STEP_ID = 'plan-entity-definition';
const PLAN_ENTITY_DEFINITION_ALIASES = [PLAN_ENTITY_DEFINITION_STEP_ID, 'plan-entity-definition'];

export interface OntologyEntityDefinition {
  entityId: string;
  title: string;
  description: string;
  ownership?: string;
  kind?: string;
  fields: Record<string, unknown>[];
  statusEnum?: string[];
  lifecycleStates?: string[];
  rulesApplied?: string[];
}

export interface PlanEntityDefinitionResult {
  entityDefinition: OntologyEntityDefinition;
}

export type PlanEntityDefinitionOutput = PlannerOutput<PlanEntityDefinitionResult>;

const planEntityDefinitionToolSchema = createPlannerVariableToolSchema(
  PLAN_ENTITY_DEFINITION_TOOL_NAME,
  'Submit the detailed definition (canonical fields/enums/lifecycle) for the current entity selector.',
  {
    type: 'object',
    additionalProperties: false,
    required: ['entityDefinition'],
    properties: {
      entityDefinition: {
        type: 'object',
        additionalProperties: false,
        // T-001 lives HERE now (moved from the blueprint): fields is required with min 1 item.
        required: ['entityId', 'title', 'description', 'fields'],
        properties: {
          entityId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          ownership: { enum: ['moduleOwned', 'mdmOwned', 'horizontalOwned', 'pluginOwned', 'existingModuleOwned', 'external'] },
          kind: { type: 'string' },
          fields: { type: 'array', items: entityFieldSchema, minItems: 1 },
          statusEnum: { type: 'array', items: { type: 'string' } },
          lifecycleStates: { type: 'array', items: { type: 'string' } },
          rulesApplied: { type: 'array', items: { type: 'string' } },
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
  if (!agent || !step) throw new Error('[agentPlanEntityDefinition](beforePromptStep) invalid params');
  if (!args) throw new Error(`[${agent.agentName}](beforePromptStep) entity selector args invalid`);
  if (!context.task) throw new Error(`[${agent.agentName}](beforePromptStep) task invalid`);

  const finalPlan = getFinalizeSolutionPlanOutput(context);
  const fp = finalPlan.result;
  const mapEntity = (fp.ontology.entities as Record<string, unknown>)[args];
  if (!mapEntity) throw new Error(`[${agent.agentName}](beforePromptStep) entity selector not found in the final plan ontology: ${args}`);

  // Reduced context: the map entry, the relationships touching this entity and the rules citing it.
  const relationships = (Array.isArray(fp.relationships) ? fp.relationships : []).filter(rel =>
    isRecord(rel) && (rel.fromEntity === args || rel.toEntity === args));
  const ruleIds = new Set<string>();
  for (const rule of (Array.isArray(fp.rules) ? fp.rules : [])) {
    if (isRecord(rule) && Array.isArray(rule.appliesTo) && rule.appliesTo.includes(args) && typeof rule.ruleId === 'string') {
      ruleIds.add(rule.ruleId);
    }
  }
  const reduced = {
    entitySelector: args,
    module: fp.module,
    entityMap: mapEntity,
    relationships,
    rules: pickRecordsByIds(fp.rules as unknown[], ruleIds, ['ruleId']),
    // sibling names only, so reference fields use the right entity ids
    otherEntityIds: Object.keys(fp.ontology.entities as Record<string, unknown>).filter(id => id !== args),
  };

  return [
    createPlannerPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args,
      systemPrompt.split('{{toolName}}').join(PLAN_ENTITY_DEFINITION_TOOL_NAME),
      `## Current entity selector\n${args}\n\n## Reduced entity context\n${JSON.stringify(reduced, null, 2)}\n`,
      planEntityDefinitionToolSchema,
      PLAN_ENTITY_DEFINITION_TOOL_NAME
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
  let output: PlanEntityDefinitionOutput | undefined;
  const selector = (step.prompt || '').trim();

  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlanEntityDefinitionOutput(payload);
    // Deterministic id coercion: the selector (ontology map key) is authoritative.
    if (selector && output.result.entityDefinition.entityId !== selector) {
      console.warn(`[${agent.agentName}](afterPromptStep) coercing entityId '${output.result.entityDefinition.entityId}' to selector '${selector}'`);
      output.result.entityDefinition.entityId = selector;
    }
    if (output.status === 'ok' && output.result.entityDefinition.fields.length === 0) {
      throw new Error(`entity ${selector} definition has no fields (T-001)`);
    }
    if (output.status === 'failed') {
      status = 'failed';
      traceMsg = 'agentPlanEntityDefinition returned status failed';
    } else if (output.status === 'needs_input') {
      traceMsg = `agentPlanEntityDefinition returned needs_input; saving INCOMPLETE entity definition with ${output.questions.length} pending question(s).`;
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}](afterPromptStep) ${traceMsg}`);
  }

  await saveNewSolutionAgentTracePayload(context, agent.agentName, step);

  let cleaner: 'input' | 'input_output' | undefined;
  if (status === 'completed' && output) {
    const saved = await saveNewSolutionPlanArtifacts(context, agent.agentName, step, output);
    cleaner = saved.length > 0 ? 'input_output' : 'input';
  }

  // T-006: reconcile the fan-out against the ontology map (re-spawn missing entities).
  const reconcileIntents = await buildEntityFanOutReconcileIntents(context, parentStep, step, hookSequential);

  const updateIntent = createPlannerUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg, cleaner);
  return [...reconcileIntents, updateIntent];
}

async function buildEntityFanOutReconcileIntents(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const expectedSelectors = Object.keys(getFinalizeSolutionPlanOutput(context).result.ontology.entities as Record<string, unknown>);
    const savedSelectors = new Set<string>();
    for (const data of await readSavedPlanArtifactDataList(context, 'ontologyEntity')) {
      const def = data.entityDefinition;
      const id = def && typeof def === 'object' ? (def as Record<string, unknown>).entityId : undefined;
      if (typeof id === 'string' && id) savedSelectors.add(id);
    }
    return reconcileParallelDynamicFanOut(context, parentStep, step, hookSequential, { expectedSelectors, savedSelectors });
  } catch (error) {
    console.warn('[agentPlanEntityDefinition] fan-out reconcile skipped:', error);
    return [];
  }
}

/** Spawner — called by agentFinalizeSolutionPlan once the final plan is approved. One child per
 * ontology entity, targeting the planned 'plan-entity-definition' placeholder step. */
export function createEntityDefinitionParallelIntent(context: mls.msg.ExecutionContext, output: FinalSolutionPlanOutput): mls.msg.AgentIntent[] {
  const placeholder = findStepByPlanId(context, 'plan-entity-definition') as mls.msg.AIAgentStep | null;
  if (!placeholder || placeholder.type !== 'agent' || placeholder.status === 'completed') return [];

  const entityIds = Object.keys(output.result.ontology.entities as Record<string, unknown>).filter(Boolean);
  if (entityIds.length === 0) {
    return [createPlannerUpdateStatusIntent(context, placeholder, placeholder, 0, 'completed', 'No ontology entities to detail.')];
  }

  return [
    createParallelDynamicAgentStepIntent(
      context,
      placeholder,
      'agentPlanEntityDefinition',
      'plan-entity-definition:parallel',
      'Detail entities {{completed}}/{{total}}, errors: {{failed}}',
      entityIds,
      5
    ),
  ];
}

/**
 * I-05: enriched ontology — the slim final plan MAP overlaid with the per-entity definitions
 * (file-first from the saved 'ontologyEntity' artifacts, task payloads taking precedence).
 * Falls back to the map alone (legacy runs where the blueprint still carried fields).
 */
export async function getEnrichedOntologyEntities(context: mls.msg.ExecutionContext): Promise<Record<string, unknown>> {
  const finalPlan = getFinalizeSolutionPlanOutput(context);
  const enriched: Record<string, unknown> = { ...(finalPlan.result.ontology.entities as Record<string, unknown>) };

  const overlay = (def: unknown) => {
    if (!isRecord(def)) return;
    const id = typeof def.entityId === 'string' ? def.entityId : '';
    if (!id) return;
    const base = isRecord(enriched[id]) ? enriched[id] as Record<string, unknown> : {};
    enriched[id] = { ...base, ...def };
  };

  try {
    for (const data of await readSavedPlanArtifactDataList(context, 'ontologyEntity')) overlay(data.entityDefinition);
  } catch (error) {
    console.warn('[getEnrichedOntologyEntities] saved definitions unavailable', error);
  }
  // Task payloads override file copies (more recent within the same run).
  try {
    for (const output of getPlannerOutputs(context, 'agentPlanEntityDefinition', planEntityDefinitionConfig)) {
      if (output.status === 'ok') overlay(output.result.entityDefinition as unknown);
    }
  } catch {
    // no in-task outputs: file copies (or the bare map) win
  }
  return enriched;
}

function extractPlanEntityDefinitionOutput(payload: unknown): PlanEntityDefinitionOutput {
  return extractPlannerOutput(payload, planEntityDefinitionConfig);
}

const planEntityDefinitionConfig = {
  toolName: PLAN_ENTITY_DEFINITION_TOOL_NAME,
  stepId: PLAN_ENTITY_DEFINITION_STEP_ID,
  stepIdAliases: PLAN_ENTITY_DEFINITION_ALIASES,
  normalizeResult: normalizePlanEntityDefinitionResult,
};

function normalizePlanEntityDefinitionResult(value: unknown): PlanEntityDefinitionResult {
  const result = assertRecord(value, 'result');
  const def = assertRecord(result.entityDefinition, 'result.entityDefinition');
  return {
    entityDefinition: {
      entityId: assertString(def.entityId, 'result.entityDefinition.entityId'),
      title: assertString(def.title, 'result.entityDefinition.title'),
      description: assertString(def.description, 'result.entityDefinition.description'),
      ownership: typeof def.ownership === 'string' ? def.ownership : undefined,
      kind: typeof def.kind === 'string' ? def.kind : undefined,
      fields: assertArray(def.fields || [], 'result.entityDefinition.fields')
        .map((item, index) => assertRecord(item, `result.entityDefinition.fields[${index}]`)),
      statusEnum: normalizeOptionalStringArray(def.statusEnum),
      lifecycleStates: normalizeOptionalStringArray(def.lifecycleStates),
      rulesApplied: normalizeOptionalStringArray(def.rulesApplied),
    },
  };
}

function normalizeOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are agentPlanEntityDefinition for the collab.codes "newSolution" flow.
Detail exactly ONE ontology entity (the current selector) from the slim final plan map into its
canonical shape: the COMPLETE field list, per-field enums, status/lifecycle enums and applied rules.
Use the same language as the user for titles, descriptions, and trace.
Use English camelCase identifiers for fieldId; PascalCase entity ids stay as given.

## Tool mode
Call the "{{toolName}}" tool with only these top-level arguments: status, result, questions, and trace. Put questions and trace beside result, never inside result. Do not include type, runId, stepId, schemaVersion, toolName, or arguments; the harness fills those fields.
Do not return prose.

## Rules
- Detail only the entity whose id equals the current selector; entityId must match it exactly.
- fields must list EVERY attribute of the entity: fieldId (camelCase), type (uuid, string, text, number, money, boolean, date, datetime, or an entity id for references), required, description. Include identity, references (use {entity}Id naming for the relationships provided), business attributes, and audit timestamps (createdAt/updatedAt) when the entity is persisted.
- A field with a discrete set of allowed values must declare them in the field's "enum" array (e.g. paymentStatus: ["pendente","pago","cancelado"]). Entity-level lifecycle goes in statusEnum/lifecycleStates.
- rulesApplied lists the ruleIds (from the provided rules) that constrain this entity.
- Respect the relationships provided: every relationship this entity participates in as the "many" side needs the corresponding reference field.
- Do not invent new entities, rules or relationships; if a needed reference entity is missing from otherEntityIds, return status "needs_input" with questions.
- Never return an empty fields array (T-001): an entity without fields cannot be materialized.
`;
