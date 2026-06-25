/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Per-entity ontology enrichment (one fan-out child per entity, spawned by agentNs2Finalize). Turns
// a slim map entry into the canonical shape (fields with per-field enum, status/lifecycle, applied
// rules) and writes l4/{module}/ontology/{EntityId}.defs.ts.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getPlannerOutputs,
  isRecord,
  optionalString,
  optionalStringArray,
  pickRecordsByIds,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { extractPlannerOutput, createPlannerToolSchema } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { getApprovedModuleName, ontologyEntityFileInfo, saveAgentTrace, saveDefsArtifact } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { entityDefinitionResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';

const AGENT_NAME = 'agentNs2EntityDefinition';
const TOOL_NAME = 'submitEntityDefinition';

export interface EntityDefinition {
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
export interface EntityDefinitionResult { entityDefinition: EntityDefinition }
export type EntityDefinitionOutput = PlannerOutput<EntityDefinitionResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the canonical definition for the current entity selector.', entityDefinitionResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Detail one ontology entity into its canonical shape', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] entity selector args invalid`);
  const fp = getFinalizeOutput(context).result;
  const mapEntity = fp.ontology.entities[args];
  if (!mapEntity) throw new Error(`[${AGENT_NAME}] entity selector not in ontology: ${args}`);

  const relationships = (Array.isArray(fp.relationships) ? fp.relationships : []).filter(rel => isRecord(rel) && (rel.fromEntity === args || rel.toEntity === args));
  const ruleIds = new Set<string>();
  for (const rule of (Array.isArray(fp.rules) ? fp.rules : [])) {
    if (isRecord(rule) && Array.isArray(rule.appliesTo) && rule.appliesTo.includes(args) && typeof rule.ruleId === 'string') ruleIds.add(rule.ruleId);
  }
  const reduced = {
    entitySelector: args,
    entityMap: mapEntity,
    relationships,
    rules: pickRecordsByIds(fp.rules as unknown[], ruleIds, ['ruleId']),
    otherEntityIds: Object.keys(fp.ontology.entities).filter(id => id !== args),
  };
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), `## Current entity selector\n${args}\n\n## Reduced context\n${JSON.stringify(reduced, null, 2)}\n`, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: EntityDefinitionOutput | undefined;
  const selector = (step.prompt || '').trim();
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    // The selector (ontology map key) is authoritative for the id.
    if (selector && output.result.entityDefinition.entityId !== selector) output.result.entityDefinition.entityId = selector;
    if (output.status === 'ok' && output.result.entityDefinition.fields.length === 0) throw new Error(`entity ${selector} has no fields`);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }

  if (status === 'completed' && output && output.status === 'ok') {
    const moduleName = getApprovedModuleName(context);
    if (moduleName) {
      try {
        await saveDefsArtifact(ontologyEntityFileInfo(moduleName, output.result.entityDefinition.entityId), `${moduleName}Entity${capitalize(output.result.entityDefinition.entityId)}`, output.result.entityDefinition);
      } catch (error) {
        console.warn(`[${AGENT_NAME}] save failed for ${selector}`, error);
      }
    }
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

/** The slim final-plan ontology map overlaid with the per-entity canonical definitions (task payloads). */
export function getEnrichedOntology(context: mls.msg.ExecutionContext): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...getFinalizeOutput(context).result.ontology.entities };
  for (const output of getPlannerOutputs(context, AGENT_NAME, config)) {
    if (output.status !== 'ok') continue;
    const def = output.result.entityDefinition;
    const base = isRecord(enriched[def.entityId]) ? (enriched[def.entityId] as Record<string, unknown>) : {};
    enriched[def.entityId] = { ...base, ...def };
  }
  return enriched;
}

const config: PlannerExtractConfig<EntityDefinitionResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): EntityDefinitionResult {
  const result = assertRecord(value, 'result');
  const def = assertRecord(result.entityDefinition, 'result.entityDefinition');
  return {
    entityDefinition: {
      entityId: assertString(def.entityId, 'result.entityDefinition.entityId'),
      title: assertString(def.title, 'result.entityDefinition.title'),
      description: assertString(def.description, 'result.entityDefinition.description'),
      ownership: optionalString(def.ownership),
      kind: optionalString(def.kind),
      fields: assertArray(def.fields || [], 'result.entityDefinition.fields').map((item, index) => assertRecord(item, `result.entityDefinition.fields[${index}]`)),
      statusEnum: optionalStringArray(def.statusEnum),
      lifecycleStates: optionalStringArray(def.lifecycleStates),
      rulesApplied: optionalStringArray(def.rulesApplied),
    },
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Detail exactly ONE ontology entity (the current selector) into its canonical shape.
Use the user's language for titles/descriptions; camelCase fieldId; the PascalCase entityId stays as given.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

Rules:
- entityId must equal the selector exactly.
- fields lists EVERY attribute: fieldId, type (uuid|string|text|number|money|boolean|date|datetime or
  an entity id for references), required, description. Include identity, references ({entity}Id for the
  relationships provided), business attributes and audit timestamps (createdAt/updatedAt) when persisted.
- A field with discrete values declares them in "enum". Entity lifecycle goes in statusEnum/lifecycleStates.
- rulesApplied lists ruleIds (from the provided rules) constraining this entity.
- Do not invent entities/rules/relationships; if a needed reference entity is missing from
  otherEntityIds, return status "needs_input" with questions. Never return empty fields.

`;
