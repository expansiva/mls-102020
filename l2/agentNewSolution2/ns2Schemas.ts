/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Schemas.ts" enhancement="_102027_/l2/enhancementAgent"/>

// JSON schemas for every agentNewSolution2 tool call. These are the contract: collab-llm forces the
// model to satisfy them and ns2Extract re-validates locally, so the agents trust the shape and only
// add semantic guards (id resolution). Stage 1 covers the behavior contract only — there are no
// page/table/metric schemas here on purpose.

const str = { type: 'string' } as const;
const bool = { type: 'boolean' } as const;
const strArray = { type: 'array', items: str } as const;
const priority = { enum: ['now', 'soon', 'later', 'never'] } as const;

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

// Blueprint/finalize ontology is a slim MAP (no fields). The canonical shape is produced per entity.
const ontologyEntityMapSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'ownership'],
  properties: {
    title: str,
    description: str,
    kind: { enum: ['core', 'mdm', 'event', 'metric', 'supporting'] },
    ownership: { enum: ['moduleOwned', 'mdmOwned', 'horizontalOwned', 'pluginOwned', 'existingModuleOwned', 'external'] },
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
  required: ['relationshipId', 'fromEntity', 'toEntity', 'type', 'description'],
  properties: { relationshipId: str, fromEntity: str, toEntity: str, type: str, description: str },
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
      required: ['entityId', 'title', 'description', 'fields'],
      properties: {
        entityId: str,
        title: str,
        description: str,
        ownership: { enum: ['moduleOwned', 'mdmOwned', 'horizontalOwned', 'pluginOwned', 'existingModuleOwned', 'external'] },
        kind: str,
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

export const operationDefinitionResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['operationDefinition'],
  properties: {
    operationDefinition: {
      type: 'object',
      additionalProperties: false,
      required: ['operationId', 'title', 'actor', 'entity', 'kind', 'reads', 'writes', 'rulesApplied', 'story'],
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
      },
    },
  },
} as const;
