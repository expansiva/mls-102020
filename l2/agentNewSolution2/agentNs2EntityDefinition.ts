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
import { getApprovedModuleName, ontologyEntityFileInfo, readOntologyEntities, saveAgentTrace, saveDefsArtifact } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
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
  modelingDecision?: string;
  moduleType?: string;
  mdmSubtype?: string;
  requiresAnchor?: boolean;
  anchor?: { entityId: string; relationshipType: string; description: string };
  // Classification for kind:"event" entities so Stage 3 persists them (telemetry/audit) or routes
  // them to the outbox (reaction) instead of dropping them. Omitted for non-event entities.
  eventPolicy?: { purpose: string; retentionDays?: number };
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
    // Send id + title + description of the other entities (not just ids) so a needed reference can be
    // matched by meaning even when the exact name differs (e.g. line-item vs OrderItem).
    otherEntities: Object.entries(fp.ontology.entities)
      .filter(([id]) => id !== args)
      .map(([id, meta]) => ({ entityId: id, ...(isRecord(meta) ? { title: meta.title, description: meta.description } : {}) })),
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
    // Any non-ok status (failed OR needs_input) fails the step loudly with the questions in the trace.
    // needs_input used to fall through silently: the step stayed 'completed' and the entity was never
    // saved, only surfacing later as plan.disk.divergence. Surfacing it lets the step be reprocessed.
    if (output.status !== 'ok') {
      status = 'failed';
      const questions = Array.isArray(output.questions) && output.questions.length ? ` — questions: ${output.questions.join(' | ')}` : '';
      traceMsg = `${AGENT_NAME} returned '${output.status}' for entity ${selector}${questions}`;
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }

  if (status === 'completed' && output && output.status === 'ok') {
    const moduleName = getApprovedModuleName(context);
    if (!moduleName) {
      status = 'failed';
      traceMsg = `approved module name unavailable while saving entity ${selector}`;
    } else {
      const fileInfo = ontologyEntityFileInfo(moduleName, output.result.entityDefinition.entityId);
      const exportName = `${moduleName}Entity${capitalize(output.result.entityDefinition.entityId)}`;
      try {
        await saveDefsArtifact(fileInfo, exportName, output.result.entityDefinition);
      } catch (firstError) {
        try {
          await saveDefsArtifact(fileInfo, exportName, output.result.entityDefinition);
        } catch (secondError) {
          status = 'failed';
          traceMsg = `save failed for entity ${selector}: ${secondError instanceof Error ? secondError.message : String(secondError)}`;
          console.error(`[${AGENT_NAME}] ${traceMsg}`, firstError);
        }
      }
    }
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

/**
 * The slim final-plan ontology MAP overlaid with the per-entity canonical definitions. The fan-out
 * children are deleted by the backend after completion, so the canonical shapes are read FROM THE
 * SAVED FILES (l4/{module}/ontology/*.defs.ts), not from task payloads. Any still-live in-task
 * payloads take precedence (most recent within the same run).
 */
export async function getEnrichedOntology(context: mls.msg.ExecutionContext): Promise<Record<string, unknown>> {
  const enriched: Record<string, unknown> = { ...getFinalizeOutput(context).result.ontology.entities };
  const overlay = (def: Record<string, unknown>) => {
    const id = typeof def.entityId === 'string' ? def.entityId : '';
    if (!id) return;
    const base = isRecord(enriched[id]) ? (enriched[id] as Record<string, unknown>) : {};
    enriched[id] = { ...base, ...def };
  };
  const moduleName = getApprovedModuleName(context);
  if (moduleName) {
    try {
      for (const def of Object.values(await readOntologyEntities(moduleName))) overlay(def);
    } catch (error) {
      console.warn(`[${AGENT_NAME}] readOntologyEntities failed`, error);
    }
  }
  for (const output of getPlannerOutputs(context, AGENT_NAME, config)) {
    if (output.status === 'ok') overlay(output.result.entityDefinition as unknown as Record<string, unknown>);
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
      modelingDecision: assertString(def.modelingDecision, 'result.entityDefinition.modelingDecision'),
      moduleType: optionalString(def.moduleType),
      mdmSubtype: optionalString(def.mdmSubtype),
      requiresAnchor: def.requiresAnchor === true,
      anchor: normalizeMdmAnchor(def.anchor),
      eventPolicy: normalizeEventPolicy(def.eventPolicy),
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

// eventPolicy is optional and only meaningful for kind:"event"; keep it shape-safe (purpose string +
// optional numeric retentionDays) and drop anything malformed rather than failing the whole entity.
function normalizeEventPolicy(value: unknown): { purpose: string; retentionDays?: number } | undefined {
  if (!isRecord(value)) return undefined;
  const purpose = optionalString(value.purpose);
  if (!purpose) return undefined;
  const retentionDays = typeof value.retentionDays === 'number' ? value.retentionDays : undefined;
  return retentionDays === undefined ? { purpose } : { purpose, retentionDays };
}

function normalizeMdmAnchor(value: unknown): { entityId: string; relationshipType: string; description: string } | undefined {
  if (!isRecord(value)) return undefined;
  const entityId = optionalString(value.entityId);
  const relationshipType = optionalString(value.relationshipType);
  const description = optionalString(value.description);
  return entityId && relationshipType && description ? { entityId, relationshipType, description } : undefined;
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
- Keep ownership/kind/modelingDecision from the entity map. modelingDecision explains why this entity is
  moduleOwned, mdmOwned, embedded-by-relationship, horizontal, plugin or external.
- fields lists EVERY attribute: fieldId, type (uuid|string|text|number|money|boolean|date|datetime or
  an entity id for references), required, description. Include identity, references ({entity}Id for the
  relationships provided), business attributes and audit timestamps (createdAt/updatedAt) when persisted.
- A field with discrete values declares them in "enum". Entity lifecycle goes in statusEnum/lifecycleStates.
- If the entity map kind is "event", you MUST set eventPolicy.purpose so Stage 3 knows how to persist it
  (otherwise the event becomes a dead in-memory object). Choose: "telemetry" for status/activity logs read
  for metrics, dashboards or reports (set retentionDays, default 90 if you omit it); "audit" for a
  compliance/history trail that must be kept (omit retentionDays for permanent); "reaction" only for a
  transient trigger consumed by another process (delivered via outbox, no stored history). An event with
  createdAt/updatedAt and queried history is telemetry or audit, NOT reaction. Do not set eventPolicy for
  non-event entities.
- If you set ownership, it MUST be EXACTLY one of: moduleOwned, mdmOwned, horizontalOwned, pluginOwned,
  existingModuleOwned, external (keep the value from the entity map; never invent another). Omit it if unsure.
- For ownership=mdmOwned or kind=mdm, you MUST carry:
  - moduleType in the canonical <moduleId>.<PascalType> format, e.g. cafeFlow.Table.
  - mdmSubtype as one of the 102034 subtypes (Person, Company, Product, Service, Location,
    AssetGeneric, AssetVehicle, AssetProperty, AssetEquipment, Animal, BankAccount, Document,
    ContactChannel).
  - requiresAnchor=true and anchor when the MDM record is scoped to a company, unit, location or parent
    object. anchor = { entityId, relationshipType, description }; relationshipType must be a 102034 MDM
    relationship such as Owns, LocatedAt, SubsidiaryOf, BelongsToGroup, PartOfUnit, SupplierOf,
    CustomerOf, OffersProduct, OffersService or HasContact.
  - requiresAnchor=false only for globally meaningful records such as the primary Company itself.
- rulesApplied lists ruleIds (from the provided rules) constraining this entity.
- Do not invent entities/rules/relationships; the available entities are in "otherEntities" (each with
  entityId + title + description). Match a needed reference by MEANING, not just exact name (e.g. an order
  line item may already exist under a different id). Only if a genuinely needed reference entity is absent
  from otherEntities, return status "needs_input" with specific questions. Never return empty fields.

`;
