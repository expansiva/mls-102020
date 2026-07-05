/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Schemas.ts" enhancement="_102027_/l2/enhancementAgent"/>

// JSON schemas for every agentNewSolution2 tool call. These are the contract: collab-llm forces the
// model to satisfy them and ns2Extract re-validates locally, so the agents trust the shape and only
// add semantic guards (id resolution). Stage 1 covers the behavior contract only — there are no
// page/table/metric schemas here on purpose.

import { L4_RELATIONSHIP_TYPES, MDM_RELATIONSHIP_TYPES, MDM_SUBTYPES } from '/_102020_/l2/agentNewSolution2/ns2MdmModeling.js';

const str = { type: 'string' } as const;
const bool = { type: 'boolean' } as const;
const strArray = { type: 'array', items: str } as const;
const priority = { enum: ['now', 'soon', 'later', 'never'] } as const;
const contextSource = { enum: ['userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault'] } as const;

const mdmAnchorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['entityId', 'relationshipType', 'description'],
  properties: {
    entityId: str,
    relationshipType: { enum: MDM_RELATIONSHIP_TYPES },
    description: str,
  },
} as const;

// ── ontology ─────────────────────────────────────────────────────────────────────

export const entityFieldSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fieldId', 'type', 'required', 'description'],
  properties: {
    fieldId: str,
    type: str, // uuid|string|text|number|money|boolean|date|datetime|<EntityId> (reference)
    required: bool,
    description: str,
    enum: strArray, // discrete allowed values of this field
  },
} as const;

// Persistence intent for kind:"event" entities. Stage 1 does NOT plan tables, but it MUST classify
// the event's purpose so Stage 3 (agentChangeBackend) knows where it lives and for how long, instead
// of leaving the event as a dead in-memory object:
//   telemetry -> durable log table with retention (TTL), aggregated for metrics/reports
//   audit     -> durable append-only table, long/permanent retention (omit retentionDays)
//   reaction  -> transient trigger delivered via the platform outbox (no local table)
const eventPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['purpose'],
  properties: {
    purpose: { enum: ['telemetry', 'audit', 'reaction'] },
    retentionDays: { type: 'number' }, // telemetry default 90 when omitted; audit may omit for permanent
  },
} as const;

// Blueprint/finalize ontology is a slim MAP (no fields). The canonical shape is produced per entity.
const ontologyEntityMapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'ownership', 'modelingDecision'],
  properties: {
    title: str,
    description: str,
    kind: { enum: ['core', 'mdm', 'event', 'metric', 'supporting'] },
    ownership: { enum: ['moduleOwned', 'mdmOwned', 'horizontalOwned', 'pluginOwned', 'existingModuleOwned', 'external'] },
    modelingDecision: str,
    moduleType: str, // required by semantic validator for kind=mdm / ownership=mdmOwned
    mdmSubtype: { enum: MDM_SUBTYPES },
    requiresAnchor: bool,
    anchor: mdmAnchorSchema,
    eventPolicy: eventPolicySchema, // required-by-prompt when kind === 'event'
    statusEnum: strArray,
    lifecycleStates: strArray,
  },
} as const;

const ontologyMapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['entities'],
  properties: { entities: { type: 'object', additionalProperties: ontologyEntityMapSchema } },
} as const;

const moduleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['moduleName', 'purpose', 'businessDomain', 'languages'],
  properties: { moduleName: str, title: str, purpose: str, businessDomain: str, languages: strArray, visualStyle: str },
} as const;

const actorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actorId', 'title', 'description'],
  properties: { actorId: str, title: str, description: str },
} as const;

// behaviorHint: the blueprint's first guess of whether a capability becomes a stateful Workflow or a
// direct Operation. agentClassifyBehavior makes the final call.
const capabilitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['capabilityId', 'title', 'description', 'actor', 'priority', 'behaviorHint'],
  properties: { capabilityId: str, title: str, description: str, actor: str, priority, behaviorHint: { enum: ['workflow', 'operation', 'either'] } },
} as const;

const ruleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ruleId', 'title', 'description', 'appliesTo'],
  properties: { ruleId: str, title: str, description: str, appliesTo: strArray, layer: str },
} as const;

const relationshipSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['relationshipId', 'fromEntity', 'toEntity', 'type', 'description', 'decisionReason'],
  properties: { relationshipId: str, fromEntity: str, toEntity: str, type: { enum: L4_RELATIONSHIP_TYPES }, description: str, decisionReason: str },
} as const;

// Embedded user story — the transient journey absorbed into each workflow/operation owner.
const storySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actor', 'goal', 'steps', 'outcome'],
  properties: { actor: str, goal: str, soThat: str, steps: strArray, outcome: str },
} as const;

// ── requirements: discover + recommend ───────────────────────────────────────────

const signalSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'reason'],
  properties: { title: str, reason: str },
} as const;

export const discoverScopeResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scopeSummary', 'signals'],
  properties: {
    scopeSummary: str,
    signals: {
      type: 'object',
      additionalProperties: false,
      required: ['workflows', 'operations', 'mdm', 'horizontals', 'plugins', 'agents'],
      properties: {
        workflows: { type: 'array', items: signalSchema },
        operations: { type: 'array', items: signalSchema },
        mdm: { type: 'array', items: signalSchema },
        horizontals: { type: 'array', items: signalSchema },
        plugins: { type: 'array', items: signalSchema },
        agents: { type: 'array', items: signalSchema },
      },
    },
  },
} as const;

const recommendationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendationId', 'artifactType', 'title', 'description', 'priority', 'defaultPriority', 'reason', 'requiresClientDecision', 'dependencies'],
  properties: {
    recommendationId: str,
    // Behavior-level only — NO pages/tables/metrics (those belong to Stage 2/3).
    artifactType: { enum: ['ontologyEntity', 'workflow', 'operation', 'rule', 'mdm', 'horizontalModule', 'plugin', 'agent'] },
    title: str,
    description: str,
    priority,
    defaultPriority: priority,
    reason: str,
    requiresClientDecision: bool,
    dependencies: strArray,
  },
} as const;

export const recommendResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendations'],
  properties: { recommendations: { type: 'array', items: recommendationSchema } },
} as const;

// ── domain: blueprint / review / finalize / entity ────────────────────────────────

const behaviorPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mdm', 'horizontals', 'plugins', 'agents'],
  properties: {
    mdm: { type: 'array', items: signalSchema },
    horizontals: { type: 'array', items: signalSchema },
    plugins: { type: 'array', items: signalSchema },
    agents: { type: 'array', items: signalSchema },
  },
} as const;

export const blueprintResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['module', 'actors', 'capabilities', 'ontology', 'rules', 'relationships', 'behaviorPlan'],
  properties: {
    module: moduleSchema,
    actors: { type: 'array', items: actorSchema },
    capabilities: { type: 'array', items: capabilitySchema },
    ontology: ontologyMapSchema,
    rules: { type: 'array', items: ruleSchema },
    relationships: { type: 'array', items: relationshipSchema },
    behaviorPlan: behaviorPlanSchema,
  },
} as const;

const reviewFindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['severity', 'code', 'message'],
  properties: { severity: { enum: ['error', 'warning', 'info'] }, code: str, message: str, path: str },
} as const;

export const blueprintReviewResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings'],
  properties: { summary: str, findings: { type: 'array', items: reviewFindingSchema } },
} as const;

const decisionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['decisionId', 'title', 'decision', 'reason'],
  properties: { decisionId: str, title: str, decision: str, reason: str, affectedArtifacts: strArray },
} as const;

const namedTextSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description'],
  properties: { title: str, description: str },
} as const;

export const finalizeResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['module', 'actors', 'capabilities', 'ontology', 'rules', 'relationships', 'approvedArtifacts', 'decisions', 'deferredItems'],
  properties: {
    module: moduleSchema,
    actors: { type: 'array', items: actorSchema },
    capabilities: { type: 'array', items: capabilitySchema },
    ontology: ontologyMapSchema,
    rules: { type: 'array', items: ruleSchema },
    relationships: { type: 'array', items: relationshipSchema },
    approvedArtifacts: behaviorPlanSchema,
    decisions: { type: 'array', items: decisionSchema },
    deferredItems: { type: 'array', items: namedTextSchema },
  },
} as const;

export const entityDefinitionResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['entityDefinition'],
  properties: {
    entityDefinition: {
      type: 'object',
      additionalProperties: false,
      required: ['entityId', 'title', 'description', 'modelingDecision', 'fields'],
      properties: {
        entityId: str,
        title: str,
        description: str,
        ownership: { enum: ['moduleOwned', 'mdmOwned', 'horizontalOwned', 'pluginOwned', 'existingModuleOwned', 'external'] },
        kind: str,
        modelingDecision: str,
        moduleType: str,
        mdmSubtype: { enum: MDM_SUBTYPES },
        requiresAnchor: bool,
        anchor: mdmAnchorSchema,
        eventPolicy: eventPolicySchema, // carry the event classification onto the canonical entity def
        fields: { type: 'array', minItems: 1, items: entityFieldSchema },
        statusEnum: strArray,
        lifecycleStates: strArray,
        rulesApplied: strArray,
      },
    },
  },
} as const;

// ── domain refs: mdm / horizontals / plugins ──────────────────────────────────────

export const mdmResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mdmDomains'],
  properties: {
    mdmDomains: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['domainId', 'title', 'masterEntities', 'resolution'],
        properties: { domainId: str, title: str, masterEntities: strArray, resolution: { enum: ['referenceSharedInfra', 'draft'] }, reason: str },
      },
    },
  },
} as const;

export const horizontalsResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['horizontalModules'],
  properties: {
    horizontalModules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['horizontalModuleId', 'title', 'resolution'],
        properties: { horizontalModuleId: str, title: str, resolution: { enum: ['reference', 'draft'] }, reason: str },
      },
    },
  },
} as const;

export const pluginsResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['plugins'],
  properties: {
    plugins: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pluginId', 'title', 'brand', 'resolution'],
        properties: { pluginId: str, title: str, brand: str, resolution: { enum: ['existing', 'draft'] }, reason: str },
      },
    },
  },
} as const;

// ── behavior: classify / workflows / operations ───────────────────────────────────

const workflowClassItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workflowId', 'title', 'actor', 'entities', 'capabilityIds', 'operationIds', 'story'],
  // operationIds: the operations this workflow orchestrates — they MUST also appear in operations[].
  properties: { workflowId: str, title: str, actor: str, entities: strArray, capabilityIds: strArray, operationIds: strArray, story: storySchema },
} as const;

const operationClassItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['operationId', 'title', 'actor', 'entity', 'kind', 'capabilityId', 'story'],
  properties: { operationId: str, title: str, actor: str, entity: str, kind: { enum: ['create', 'update', 'delete', 'query', 'view'] }, capabilityId: str, story: storySchema },
} as const;

export const behaviorClassificationResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workflows', 'operations'],
  properties: {
    workflows: { type: 'array', items: workflowClassItemSchema },
    operations: { type: 'array', items: operationClassItemSchema },
  },
} as const;

export const workflowIndexResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workflows'],
  properties: {
    workflows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['workflowId', 'title', 'executionMode', 'trigger', 'actors', 'entities', 'operationIds'],
        properties: {
          workflowId: str,
          title: str,
          executionMode: { enum: ['sequential', 'parallel_static', 'parallel_dynamic'] },
          trigger: str,
          actors: strArray,
          entities: strArray,
          operationIds: strArray,
        },
      },
    },
  },
} as const;

const transitionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['from', 'to', 'on'],
  properties: { from: str, to: str, on: str, by: str, guard: str },
} as const;

export const workflowDefinitionResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workflowDefinition'],
  properties: {
    workflowDefinition: {
      type: 'object',
      additionalProperties: false,
      required: ['workflowId', 'title', 'trigger', 'actors', 'states', 'transitions', 'operationIds', 'entities', 'rulesApplied', 'story'],
      properties: {
        workflowId: str,
        title: str,
        executionMode: { enum: ['sequential', 'parallel_static', 'parallel_dynamic'] },
        trigger: str,
        actors: strArray,
        states: strArray,
        transitions: { type: 'array', items: transitionSchema },
        operationIds: strArray,
        entities: strArray,
        rulesApplied: strArray,
        story: storySchema,
      },
    },
  },
} as const;

export const operationIndexResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['operations'],
  properties: {
    operations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['operationId', 'title', 'actor', 'entity', 'kind'],
        properties: { operationId: str, title: str, actor: str, entity: str, kind: { enum: ['create', 'update', 'delete', 'query', 'view'] } },
      },
    },
  },
} as const;

const operationInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['inputId', 'fieldRef', 'required', 'source', 'description'],
  properties: {
    inputId: str,
    fieldRef: str, // Entity.field or Entity. Must resolve to ontology.
    required: bool,
    source: contextSource,
    description: str,
  },
} as const;

const operationContextResolutionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['targetRef', 'source', 'originRef', 'description'],
  properties: {
    inputId: str,
    // targetRef is the operation/BFF/ontology field being resolved: Entity.field, input.<inputId>,
    // filter.<name> or a catalogued runtime attr. fieldRef is kept out on purpose: previous
    // generations confused the target with runtime origins such as actorSession/currentWorkspace.
    targetRef: str,
    source: contextSource,
    originRef: str,
    description: str,
  },
} as const;

const operationAccessPatternSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'description'],
  properties: {
    kind: { enum: ['list', 'getById', 'lookup', 'commandInput'] },
    description: str,
    entity: str,
    keyField: str,
    filters: strArray,
    sort: strArray,
    pagination: { enum: ['none', 'optional', 'required'] },
    selection: { enum: ['none', 'single', 'multiple'] },
    output: strArray,
  },
} as const;

export const operationDefinitionResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['operationDefinition'],
  properties: {
    operationDefinition: {
      type: 'object',
      additionalProperties: false,
      required: ['operationId', 'title', 'actor', 'entity', 'kind', 'reads', 'writes', 'rulesApplied', 'story', 'accessPattern', 'inputs', 'contextResolution'],
      properties: {
        operationId: str,
        title: str,
        actor: str,
        entity: str,
        kind: { enum: ['create', 'update', 'delete', 'query', 'view'] },
        reads: strArray,
        writes: strArray,
        rulesApplied: strArray,
        story: storySchema,
        accessPattern: operationAccessPatternSchema,
        inputs: { type: 'array', items: operationInputSchema },
        contextResolution: { type: 'array', items: operationContextResolutionSchema },
        acceptanceAssertions: strArray,
      },
    },
  },
} as const;

// ── behavior: module journey map ────────────────────────────────────────────────

const journeyLandingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['actor', 'workspaceId', 'reason'],
  properties: { actor: str, workspaceId: str, reason: str },
} as const;

const journeyWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspaceId', 'title', 'actor', 'kind', 'operationIds', 'purpose'],
  properties: {
    workspaceId: str,
    title: str,
    actor: str,
    kind: { enum: ['entityManagement', 'workflow', 'dashboard', 'task', 'support'] },
    entity: str,
    workflowId: str,
    operationIds: strArray,
    purpose: str,
  },
} as const;

const journeyDataTransportSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'from', 'to', 'source'],
  properties: { name: str, from: str, to: str, source: contextSource, description: str },
} as const;

const journeyNavigationEdgeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['from', 'to', 'trigger', 'data', 'description'],
  properties: {
    from: str,
    to: str,
    operationId: str,
    trigger: str,
    data: { type: 'array', items: journeyDataTransportSchema },
    description: str,
  },
} as const;

const journeyInputResolutionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['operationId', 'inputId', 'source', 'via', 'description'],
  properties: {
    operationId: str,
    inputId: str,
    source: contextSource,
    via: str,
    description: str,
  },
} as const;

export const journeyMapResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['journeyMap'],
  properties: {
    journeyMap: {
      type: 'object',
      additionalProperties: false,
      required: ['moduleName', 'landings', 'workspaces', 'navigationEdges', 'inputResolutions', 'acceptanceAssertions'],
      properties: {
        moduleName: str,
        landings: { type: 'array', items: journeyLandingSchema },
        workspaces: { type: 'array', items: journeyWorkspaceSchema },
        navigationEdges: { type: 'array', items: journeyNavigationEdgeSchema },
        inputResolutions: { type: 'array', items: journeyInputResolutionSchema },
        acceptanceAssertions: strArray,
      },
    },
  },
} as const;
