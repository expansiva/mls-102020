/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e5-behavior/gate.ts" enhancement="_blank"/>

// E5 gate: pure functions only (no stor access). Entity fields/statusEnum arrive as
// parameters (Ns3E5EntityDefsInfo) so tests run without the browser runtime. isRecord and
// sameStringSet are local on purpose: importing them (ns3Fs / e3 gate) would pull libStor
// into the node test harness, which has no mls runtime.

import { errorIssue, Ns3GateIssue, warningIssue } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';

export const E5_CLASSIFICATION_SCHEMA_VERSION = '2026-07-11-ns3-e5-v2';

export const NS3_OPERATION_KINDS = ['create', 'update', 'delete', 'query', 'view'] as const;
// Explicit business decision for every managed (mdm/cadastral) entity: how records leave the base.
// 'delete' requires a delete operation; 'inactivate' requires a lifecycle state; 'immutable'
// requires a reason. Silent omission (the 102051 gap: no delete anywhere) is a gate error.
export const NS3_E5_DELETION_POLICIES = ['delete', 'inactivate', 'immutable'] as const;
export const NS3_E5_EXECUTION_MODES = ['sequential', 'parallel_static', 'parallel_dynamic'] as const;
export const NS3_E5_ACCESS_PATTERN_KINDS = ['list', 'getById', 'lookup', 'commandInput'] as const;
export const NS3_E5_PAGINATIONS = ['none', 'optional', 'required'] as const;
export const NS3_E5_SELECTIONS = ['none', 'single', 'multiple'] as const;
// Shared source vocabulary for operation inputs AND contextResolution entries.
export const NS3_E5_SOURCES = [
  'userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity',
  'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault',
] as const;
// Highest first: capability priority = highest priority among the item featureRefs.
export const NS3_E5_PRIORITY_ORDER = ['now', 'soon', 'later', 'never'] as const;

// copied from _102029_/l2/runtimeConfigTypes.ts L4_CONTEXT_ORIGIN_CATALOG — keep in sync.
// Local copy on purpose: importing runtimeConfigTypes could pull browser deps into the
// node test harness, and this gate must stay pure.
export const NS3_L4_CONTEXT_ORIGIN_CATALOG = {
  actorSession: ['actorSession.actorId', 'actorSession.scope'],
  businessContext: ['businessContext.activeCompanyId', 'businessContext.activeUnitId'],
  currentWorkspace: ['currentWorkspace.workspaceId'],
  systemDefault: ['systemDefault.now', 'systemDefault.uuid', 'systemDefault.locale'],
} as const;

// Sources whose originRef must resolve to a saved entity field ('Entity.field').
const ENTITY_ORIGIN_SOURCES = ['selectedEntity', 'activeLifecycleInstance', 'workflowState', 'previousStepOutput'] as const;

export type Ns3OperationKind = typeof NS3_OPERATION_KINDS[number];
export type Ns3E5ExecutionMode = typeof NS3_E5_EXECUTION_MODES[number];
export type Ns3E5AccessPatternKind = typeof NS3_E5_ACCESS_PATTERN_KINDS[number];
export type Ns3E5Pagination = typeof NS3_E5_PAGINATIONS[number];
export type Ns3E5Selection = typeof NS3_E5_SELECTIONS[number];
export type Ns3E5Source = typeof NS3_E5_SOURCES[number];
export type Ns3E5Priority = typeof NS3_E5_PRIORITY_ORDER[number];

const QUERY_ACCESS_KINDS: readonly Ns3E5AccessPatternKind[] = ['list', 'getById', 'lookup'];
const WRITE_OPERATION_KINDS: readonly Ns3OperationKind[] = ['create', 'update', 'delete'];

// ---------------------------------------------------------------------------
// types — classification
// ---------------------------------------------------------------------------

export interface Ns3E5ClassificationWorkflow {
  workflowId: string;
  title: string;
  actorId: string;
  primaryEntity: string;
  featureRefs: string[];
  operationIds: string[];
}

export interface Ns3E5ClassificationOperation {
  operationId: string;
  title: string;
  actorId: string;
  entity: string;
  kind: Ns3OperationKind;
  featureRefs: string[];
  workflowId?: string;
}

export type Ns3E5DeletionPolicy = typeof NS3_E5_DELETION_POLICIES[number];

export interface Ns3E5ManagedEntity {
  entity: string;
  deletionPolicy: Ns3E5DeletionPolicy;
  /** Required when deletionPolicy is 'inactivate': a state of the entity statusEnum. */
  inactivationState?: string;
  /** Required when deletionPolicy is 'immutable': the business justification. */
  reason?: string;
}

export interface Ns3E5ClassificationArtifact {
  schemaVersion: typeof E5_CLASSIFICATION_SCHEMA_VERSION;
  moduleName: string;
  createdAt: string;
  workflows: Ns3E5ClassificationWorkflow[];
  operations: Ns3E5ClassificationOperation[];
  managedEntities: Ns3E5ManagedEntity[];
}

// ---------------------------------------------------------------------------
// types — workflow / operation artifacts
// ---------------------------------------------------------------------------

export interface Ns3E5Transition {
  from: string;
  to: string;
  on: string;
  by?: string;
  guard?: string;
}

export interface Ns3E5Story {
  actor: string;
  goal: string;
  steps: string[];
  outcome: string;
}

export interface Ns3E5Capability {
  capabilityId: string;
  title: string;
  actor: string;
  priority: Ns3E5Priority;
}

export interface Ns3E5WorkflowArtifact {
  workflowId: string;
  title: string;
  executionMode: Ns3E5ExecutionMode;
  trigger: string;
  actors: string[];
  states: string[];
  transitions: Ns3E5Transition[];
  operationIds: string[];
  entities: string[];
  rulesApplied: string[];
  story: Ns3E5Story;
}

// Written to l4/workflows/{workflowId}.defs.ts — LLM artifact + deterministic attach.
export interface Ns3E5WorkflowDefs extends Ns3E5WorkflowArtifact {
  pageId: string;
  capabilities: Ns3E5Capability[];
  statusFrontend: 'toCreate';
  statusBackend: 'toCreate';
}

export interface Ns3E5AccessPattern {
  kind: Ns3E5AccessPatternKind;
  description?: string;
  entity: string;
  keyField: string;
  filters?: string[];
  sort?: string[];
  pagination: Ns3E5Pagination;
  selection: Ns3E5Selection;
  output: string[];
}

export interface Ns3E5OperationInput {
  inputId: string;
  fieldRef: string;
  required: boolean;
  source: Ns3E5Source;
  description: string;
}

export interface Ns3E5ContextResolution {
  inputId?: string;
  targetRef: string;
  source: Ns3E5Source;
  // REQUIRED: the server-side resolution recipe. Without it agentChangeBackend has no way to
  // materialize the value and the generated handler demands it from the request (viewDashboard incident).
  originRef: string;
  description: string;
}

export interface Ns3E5OperationArtifact {
  operationId: string;
  title: string;
  actor: string;
  entity: string;
  kind: Ns3OperationKind;
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  story: Ns3E5Story;
  accessPattern: Ns3E5AccessPattern;
  inputs: Ns3E5OperationInput[];
  contextResolution: Ns3E5ContextResolution[];
  acceptanceAssertions: string[];
}

// Written to l4/operations/{operationId}.defs.ts — LLM artifact + deterministic attach.
export interface Ns3E5OperationDefs extends Ns3E5OperationArtifact {
  pageId: string;
  commandName: string;
  bffName: string;
  capability: Ns3E5Capability;
  statusFrontend: 'toCreate';
  statusBackend: 'toCreate';
}

// ---------------------------------------------------------------------------
// gate contexts (data arrives as parameters — no stor access here)
// ---------------------------------------------------------------------------

export interface Ns3E5FeatureRef {
  featureId: string;
  priority: Ns3E5Priority;
}

export interface Ns3E5EntityDefsInfo {
  fields: Array<{ fieldId: string }>;
  statusEnum?: string[];
}

export interface E5ClassificationGateContext {
  moduleName: string;
  actorIds: string[];
  entityIds: string[];
  features: Ns3E5FeatureRef[];
  /** E3 entity defs on disk — used to verify managedEntities.inactivationState against statusEnum. */
  entityDefs: Record<string, Ns3E5EntityDefsInfo>;
}

export interface E5WorkflowGateContext {
  itemId: string;
  classification: Ns3E5ClassificationWorkflow;
  actorIds: string[];
  entityIds: string[];
  ruleIds: string[];
  entityDefs: Record<string, Ns3E5EntityDefsInfo>;
}

export interface E5OperationGateContext {
  itemId: string;
  moduleName: string;
  classification: Ns3E5ClassificationOperation;
  actorIds: string[];
  entityIds: string[];
  ruleIds: string[];
  entityDefs: Record<string, Ns3E5EntityDefsInfo>;
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

export function prepareE5Classification(input: unknown, context: { moduleName: string }): Ns3E5ClassificationArtifact {
  const record = isRecord(input) ? input : {};
  const workflows = Array.isArray(record.workflows) ? record.workflows.filter(isRecord) : [];
  const operations = Array.isArray(record.operations) ? record.operations.filter(isRecord) : [];
  return {
    schemaVersion: E5_CLASSIFICATION_SCHEMA_VERSION,
    moduleName: readString(record.moduleName) || context.moduleName,
    createdAt: new Date().toISOString(),
    workflows: workflows.map(item => ({
      workflowId: readString(item.workflowId) || '',
      title: readString(item.title) || '',
      actorId: readString(item.actorId) || '',
      primaryEntity: readString(item.primaryEntity) || '',
      featureRefs: readStringArray(item.featureRefs),
      operationIds: readStringArray(item.operationIds),
    })),
    operations: operations.map(item => ({
      operationId: readString(item.operationId) || '',
      title: readString(item.title) || '',
      actorId: readString(item.actorId) || '',
      entity: readString(item.entity) || '',
      // Invalid values pass through so the schema check reports them (no silent fallback).
      kind: (readString(item.kind) || '') as Ns3OperationKind,
      featureRefs: readStringArray(item.featureRefs),
      ...(readString(item.workflowId) ? { workflowId: readString(item.workflowId) } : {}),
    })),
    managedEntities: (Array.isArray(record.managedEntities) ? record.managedEntities.filter(isRecord) : []).map(item => ({
      entity: readString(item.entity) || '',
      // Invalid values pass through so the schema check reports them (no silent fallback).
      deletionPolicy: (readString(item.deletionPolicy) || '') as Ns3E5DeletionPolicy,
      ...(readString(item.inactivationState) ? { inactivationState: readString(item.inactivationState) } : {}),
      ...(readString(item.reason) ? { reason: readString(item.reason) } : {}),
    })),
  };
}

export function prepareE5Workflow(input: unknown): Ns3E5WorkflowArtifact {
  const record = isRecord(input) ? input : {};
  const transitions = Array.isArray(record.transitions) ? record.transitions.filter(isRecord) : [];
  return {
    workflowId: readString(record.workflowId) || '',
    title: readString(record.title) || '',
    executionMode: (readString(record.executionMode) || '') as Ns3E5ExecutionMode,
    trigger: readString(record.trigger) || '',
    actors: readStringArray(record.actors),
    states: readStringArray(record.states),
    transitions: transitions.map(item => ({
      from: readString(item.from) || '',
      to: readString(item.to) || '',
      on: readString(item.on) || '',
      ...(readString(item.by) ? { by: readString(item.by) } : {}),
      ...(readString(item.guard) ? { guard: readString(item.guard) } : {}),
    })),
    operationIds: readStringArray(record.operationIds),
    entities: readStringArray(record.entities),
    rulesApplied: readStringArray(record.rulesApplied),
    story: readStory(record.story),
  };
}

export function prepareE5Operation(input: unknown): Ns3E5OperationArtifact {
  const record = isRecord(input) ? input : {};
  const access = isRecord(record.accessPattern) ? record.accessPattern : {};
  const inputs = Array.isArray(record.inputs) ? record.inputs.filter(isRecord) : [];
  const contextResolution = Array.isArray(record.contextResolution) ? record.contextResolution.filter(isRecord) : [];
  return {
    operationId: readString(record.operationId) || '',
    title: readString(record.title) || '',
    actor: readString(record.actor) || '',
    entity: readString(record.entity) || '',
    kind: (readString(record.kind) || '') as Ns3OperationKind,
    reads: readStringArray(record.reads),
    writes: readStringArray(record.writes),
    rulesApplied: readStringArray(record.rulesApplied),
    story: readStory(record.story),
    accessPattern: {
      kind: (readString(access.kind) || '') as Ns3E5AccessPatternKind,
      ...(readString(access.description) ? { description: readString(access.description) } : {}),
      entity: readString(access.entity) || '',
      keyField: readString(access.keyField) || '',
      ...(readStringArray(access.filters).length ? { filters: readStringArray(access.filters) } : {}),
      ...(readStringArray(access.sort).length ? { sort: readStringArray(access.sort) } : {}),
      pagination: (readString(access.pagination) || '') as Ns3E5Pagination,
      selection: (readString(access.selection) || '') as Ns3E5Selection,
      output: readStringArray(access.output),
    },
    inputs: inputs.map(item => ({
      inputId: readString(item.inputId) || '',
      fieldRef: readString(item.fieldRef) || '',
      required: item.required === true,
      source: (readString(item.source) || '') as Ns3E5Source,
      description: readString(item.description) || '',
    })),
    contextResolution: contextResolution.map(item => ({
      ...(readString(item.inputId) ? { inputId: readString(item.inputId) } : {}),
      targetRef: readString(item.targetRef) || '',
      source: (readString(item.source) || '') as Ns3E5Source,
      // Empty string when missing so the schema (minLength 1) and the gate both report it.
      originRef: readString(item.originRef) || '',
      description: readString(item.description) || '',
    })),
    acceptanceAssertions: readStringArray(record.acceptanceAssertions),
  };
}

// ---------------------------------------------------------------------------
// deterministic attach (NEVER produced by the LLM)
// ---------------------------------------------------------------------------

export function priorityFromFeatures(featureRefs: string[], features: Ns3E5FeatureRef[]): Ns3E5Priority {
  let bestIndex = -1;
  for (const ref of featureRefs) {
    const feature = features.find(item => item.featureId === ref);
    if (!feature) continue;
    const index = NS3_E5_PRIORITY_ORDER.indexOf(feature.priority);
    if (index >= 0 && (bestIndex < 0 || index < bestIndex)) bestIndex = index;
  }
  return bestIndex >= 0 ? NS3_E5_PRIORITY_ORDER[bestIndex] : 'later';
}

export function attachWorkflowDeterministic(
  artifact: Ns3E5WorkflowArtifact,
  args: { classification: Ns3E5ClassificationWorkflow; features: Ns3E5FeatureRef[] },
): Ns3E5WorkflowDefs {
  return {
    ...artifact,
    pageId: args.classification.workflowId,
    capabilities: [{
      capabilityId: args.classification.workflowId,
      title: artifact.title,
      actor: artifact.actors[0] || args.classification.actorId,
      priority: priorityFromFeatures(args.classification.featureRefs, args.features),
    }],
    statusFrontend: 'toCreate',
    statusBackend: 'toCreate',
  };
}

export function attachOperationDeterministic(
  artifact: Ns3E5OperationArtifact,
  args: {
    moduleName: string;
    classification: Ns3E5ClassificationOperation;
    owningWorkflow?: Ns3E5ClassificationWorkflow;
    features: Ns3E5FeatureRef[];
  },
): Ns3E5OperationDefs {
  const pageId = args.classification.workflowId || args.classification.operationId;
  const commandName = args.classification.operationId;
  // The capability represents the owning workflow when there is one (title and
  // priority follow the workflow); standalone operations carry their own capability.
  const capabilityRefs = args.owningWorkflow ? args.owningWorkflow.featureRefs : args.classification.featureRefs;
  return {
    ...artifact,
    pageId,
    commandName,
    bffName: `${args.moduleName}.${pageId}.${commandName}`,
    capability: {
      capabilityId: pageId,
      title: args.owningWorkflow ? args.owningWorkflow.title : artifact.title,
      actor: args.classification.actorId,
      priority: priorityFromFeatures(capabilityRefs, args.features),
    },
    statusFrontend: 'toCreate',
    statusBackend: 'toCreate',
  };
}

// ---------------------------------------------------------------------------
// invariants
// ---------------------------------------------------------------------------

export function validateE5Classification(
  artifact: Ns3E5ClassificationArtifact,
  context: E5ClassificationGateContext,
): { artifact: Ns3E5ClassificationArtifact; issues: Ns3GateIssue[] } {
  const issues: Ns3GateIssue[] = [];
  const featureIds = new Set(context.features.map(item => item.featureId));
  const workflowIds = new Set(artifact.workflows.map(item => item.workflowId));
  const operationIds = new Set(artifact.operations.map(item => item.operationId));

  if (artifact.moduleName !== context.moduleName) {
    issues.push(errorIssue('classification.moduleName.mismatch', `moduleName must be "${context.moduleName}", got "${artifact.moduleName}"`));
  }

  const allIds = new Set<string>();
  for (const id of [...artifact.workflows.map(item => item.workflowId), ...artifact.operations.map(item => item.operationId)]) {
    if (allIds.has(id)) issues.push(errorIssue('classification.id.duplicate', `duplicated id "${id}" across workflows+operations`, id));
    allIds.add(id);
  }

  for (const workflow of artifact.workflows) {
    if (!context.actorIds.includes(workflow.actorId)) {
      issues.push(errorIssue('classification.actor.unknown', `workflow ${workflow.workflowId}: actorId "${workflow.actorId}" is not in the E4 roster`, workflow.workflowId));
    }
    if (!context.entityIds.includes(workflow.primaryEntity)) {
      issues.push(errorIssue('classification.entity.unknown', `workflow ${workflow.workflowId}: primaryEntity "${workflow.primaryEntity}" is not an E3 entity`, workflow.workflowId));
    }
    for (const operationId of workflow.operationIds) {
      if (!operationIds.has(operationId)) {
        issues.push(errorIssue('classification.workflow.operation.unknown', `workflow ${workflow.workflowId}: operationId "${operationId}" is not a declared operation`, workflow.workflowId));
      }
    }
    for (const ref of workflow.featureRefs) {
      if (!featureIds.has(ref)) {
        issues.push(warningIssue('classification.featureRef.unknown', `workflow ${workflow.workflowId}: featureRef "${ref}" is not an E2 feature`, workflow.workflowId));
      }
    }
  }

  for (const operation of artifact.operations) {
    if (!context.actorIds.includes(operation.actorId)) {
      issues.push(errorIssue('classification.actor.unknown', `operation ${operation.operationId}: actorId "${operation.actorId}" is not in the E4 roster`, operation.operationId));
    }
    if (!context.entityIds.includes(operation.entity)) {
      issues.push(errorIssue('classification.entity.unknown', `operation ${operation.operationId}: entity "${operation.entity}" is not an E3 entity`, operation.operationId));
    }
    if (operation.workflowId) {
      const owner = artifact.workflows.find(item => item.workflowId === operation.workflowId);
      if (!owner) {
        issues.push(errorIssue('classification.operation.workflow.unknown', `operation ${operation.operationId}: workflowId "${operation.workflowId}" is not a declared workflow`, operation.operationId));
      } else if (!owner.operationIds.includes(operation.operationId)) {
        issues.push(errorIssue('classification.operation.workflow.unlisted', `operation ${operation.operationId}: owning workflow ${operation.workflowId} does not list it in operationIds`, operation.operationId));
      }
    }
    for (const ref of operation.featureRefs) {
      if (!featureIds.has(ref)) {
        issues.push(warningIssue('classification.featureRef.unknown', `operation ${operation.operationId}: featureRef "${ref}" is not an E2 feature`, operation.operationId));
      }
    }
  }

  // Feature coverage: every non-never E2 feature must be realized by >=1 item.
  // Missing 'now' coverage blocks; soon/later coverage gaps only warn.
  const covered = new Set([
    ...artifact.workflows.flatMap(item => item.featureRefs),
    ...artifact.operations.flatMap(item => item.featureRefs),
  ]);
  for (const feature of context.features) {
    if (feature.priority === 'never' || covered.has(feature.featureId)) continue;
    const message = `no workflow/operation featureRefs cover feature "${feature.featureId}" (priority ${feature.priority})`;
    if (feature.priority === 'now') issues.push(errorIssue('classification.feature.uncovered', message, feature.featureId));
    else issues.push(warningIssue('classification.feature.uncovered', message, feature.featureId));
  }

  if (workflowIds.size === 0 && artifact.operations.length === 0) {
    issues.push(errorIssue('classification.empty', 'classification declares no workflows and no operations'));
  }

  validateManagedEntities(artifact, context, issues);

  return { artifact, issues };
}

// Managed (mdm/cadastral) entities: any entity with a STANDALONE write operation (create/update/
// delete outside a workflow) is under management and requires an explicit deletionPolicy. This is
// the guard against the 102051 gap (CRUDs generated without delete and without a declared
// inactivation — the omission was silent).
function validateManagedEntities(
  artifact: Ns3E5ClassificationArtifact,
  context: E5ClassificationGateContext,
  issues: Ns3GateIssue[],
): void {
  const standaloneWrites = new Map<string, Set<Ns3OperationKind>>();
  for (const operation of artifact.operations) {
    if (operation.workflowId) continue;
    if (!WRITE_OPERATION_KINDS.includes(operation.kind)) continue;
    const kinds = standaloneWrites.get(operation.entity) ?? new Set<Ns3OperationKind>();
    kinds.add(operation.kind);
    standaloneWrites.set(operation.entity, kinds);
  }

  const declared = new Map(artifact.managedEntities.map(item => [item.entity, item]));

  for (const [entity, kinds] of standaloneWrites) {
    const policy = declared.get(entity);
    if (!policy) {
      issues.push(errorIssue('classification.managedEntity.missing', `entity "${entity}" has standalone write operations but no managedEntities entry — declare its deletionPolicy (delete | inactivate | immutable)`, entity));
      continue;
    }
    if (policy.deletionPolicy === 'delete' && !kinds.has('delete')) {
      issues.push(errorIssue('classification.managedEntity.delete.missing', `entity "${entity}" declares deletionPolicy "delete" but has no standalone delete operation`, entity));
    }
    if (policy.deletionPolicy === 'inactivate') {
      const state = policy.inactivationState || '';
      if (!state) {
        issues.push(errorIssue('classification.managedEntity.inactivation.missing', `entity "${entity}" declares deletionPolicy "inactivate" but no inactivationState`, entity));
      } else {
        const defs = context.entityDefs[entity];
        if (!defs) {
          issues.push(warningIssue('classification.managedEntity.inactivation.unverified', `entity "${entity}": no defs on disk; inactivationState "${state}" cannot be verified`, entity));
        } else if (!(defs.statusEnum || []).includes(state)) {
          issues.push(errorIssue('classification.managedEntity.inactivation.unknown', `entity "${entity}": inactivationState "${state}" is not in the entity statusEnum [${(defs.statusEnum || []).join(', ')}]`, entity));
        }
      }
      if (!kinds.has('update')) {
        issues.push(errorIssue('classification.managedEntity.inactivation.noUpdate', `entity "${entity}" declares deletionPolicy "inactivate" but has no standalone update operation to change the state`, entity));
      }
    }
    if (policy.deletionPolicy === 'immutable') {
      if (!(policy.reason || '').trim()) {
        issues.push(errorIssue('classification.managedEntity.immutable.reason', `entity "${entity}" declares deletionPolicy "immutable" without a business reason`, entity));
      }
      if (kinds.has('delete')) {
        issues.push(errorIssue('classification.managedEntity.immutable.conflict', `entity "${entity}" declares deletionPolicy "immutable" but has a standalone delete operation`, entity));
      }
    }
    // Management completeness: an entity under management needs create+update (browse/query is
    // checked downstream by the workspace derivation, not here).
    if (!kinds.has('create')) {
      issues.push(warningIssue('classification.managedEntity.create.missing', `entity "${entity}" is under management but has no standalone create operation`, entity));
    }
  }

  for (const policy of artifact.managedEntities) {
    if (!context.entityIds.includes(policy.entity)) {
      issues.push(errorIssue('classification.managedEntity.entity.unknown', `managedEntities entry "${policy.entity}" is not an E3 entity`, policy.entity));
      continue;
    }
    if (!standaloneWrites.has(policy.entity)) {
      issues.push(warningIssue('classification.managedEntity.unused', `managedEntities entry "${policy.entity}" has no standalone write operations — entry is inert`, policy.entity));
    }
  }
}

export function validateE5Workflow(
  artifact: Ns3E5WorkflowArtifact,
  context: E5WorkflowGateContext,
): { artifact: Ns3E5WorkflowArtifact; issues: Ns3GateIssue[] } {
  const issues: Ns3GateIssue[] = [];
  const states = new Set(artifact.states);
  const operationIds = new Set(artifact.operationIds);

  if (artifact.workflowId !== context.itemId) {
    issues.push(errorIssue('workflow.id.mismatch', `workflowId must be "${context.itemId}", got "${artifact.workflowId}"`));
  }
  if (!sameStringSet(artifact.operationIds, context.classification.operationIds)) {
    issues.push(errorIssue('workflow.operations.mismatch', `workflow ${artifact.workflowId}: operationIds must exactly equal the classification set [${context.classification.operationIds.join(', ')}]`));
  }

  for (const transition of artifact.transitions) {
    if (!states.has(transition.from)) {
      issues.push(errorIssue('workflow.transition.state.unknown', `workflow ${artifact.workflowId}: transition "from" state "${transition.from}" is not declared in states`));
    }
    if (!states.has(transition.to)) {
      issues.push(errorIssue('workflow.transition.state.unknown', `workflow ${artifact.workflowId}: transition "to" state "${transition.to}" is not declared in states`));
    }
    if (!operationIds.has(transition.on)) {
      issues.push(errorIssue('workflow.transition.operation.unknown', `workflow ${artifact.workflowId}: transition "on" "${transition.on}" is not one of the workflow operationIds`));
    }
    // Self-transition in the INITIAL state usually means E3 missed a pre-hand-off state
    // (e.g. Order without a "registered"/"draft" state before sentToKitchen) — cafeFlow run finding.
    if (transition.from === transition.to && artifact.states.length > 0 && transition.from === artifact.states[0]) {
      issues.push(warningIssue('workflow.transition.self.initial', `workflow ${artifact.workflowId}: self-transition in the initial state "${transition.from}" (operation ${transition.on}) — the entity statusEnum probably misses an explicit initial state`));
    }
  }

  // States must mirror the primary entity lifecycle (equal or subset of statusEnum).
  const primaryDefs = context.entityDefs[context.classification.primaryEntity];
  const statusEnum = primaryDefs?.statusEnum || [];
  if (statusEnum.length > 0) {
    for (const state of artifact.states) {
      if (!statusEnum.includes(state)) {
        issues.push(errorIssue('workflow.state.unknown', `workflow ${artifact.workflowId}: state "${state}" is not in ${context.classification.primaryEntity}.statusEnum [${statusEnum.join(', ')}]`, state));
      }
    }
  } else {
    issues.push(warningIssue('workflow.states.unverified', `workflow ${artifact.workflowId}: primary entity ${context.classification.primaryEntity} has no statusEnum; states cannot be verified`));
  }

  for (const actor of artifact.actors) {
    if (!context.actorIds.includes(actor)) {
      issues.push(errorIssue('workflow.actor.unknown', `workflow ${artifact.workflowId}: actor "${actor}" is not in the E4 roster`, actor));
    }
  }
  for (const entity of artifact.entities) {
    if (!context.entityIds.includes(entity)) {
      issues.push(errorIssue('workflow.entity.unknown', `workflow ${artifact.workflowId}: entity "${entity}" is not an E3 entity`, entity));
    }
  }
  for (const ruleId of artifact.rulesApplied) {
    if (!context.ruleIds.includes(ruleId)) {
      issues.push(warningIssue('workflow.rule.unknown', `workflow ${artifact.workflowId}: rulesApplied "${ruleId}" is not an E4 ruleId`, ruleId));
    }
  }

  return { artifact, issues };
}

export function validateE5Operation(
  defs: Ns3E5OperationDefs,
  context: E5OperationGateContext,
): { artifact: Ns3E5OperationDefs; issues: Ns3GateIssue[] } {
  const issues: Ns3GateIssue[] = [];

  if (defs.operationId !== context.itemId) {
    issues.push(errorIssue('operation.id.mismatch', `operationId must be "${context.itemId}", got "${defs.operationId}"`));
  }
  if (defs.kind !== context.classification.kind) {
    issues.push(errorIssue('operation.kind.mismatch', `operation ${defs.operationId}: kind "${defs.kind}" differs from the classification ("${context.classification.kind}")`));
  }
  if (!context.entityIds.includes(defs.entity)) {
    issues.push(errorIssue('operation.entity.unknown', `operation ${defs.operationId}: entity "${defs.entity}" is not an E3 entity`));
  }
  for (const entity of defs.reads) {
    if (!context.entityIds.includes(entity)) {
      issues.push(errorIssue('operation.reads.unknown', `operation ${defs.operationId}: reads entity "${entity}" is not an E3 entity`, entity));
    }
  }
  for (const entity of defs.writes) {
    if (!context.entityIds.includes(entity)) {
      issues.push(errorIssue('operation.writes.unknown', `operation ${defs.operationId}: writes entity "${entity}" is not an E3 entity`, entity));
    }
  }

  if (!context.entityIds.includes(defs.accessPattern.entity)) {
    issues.push(errorIssue('operation.accessPattern.entity.unknown', `operation ${defs.operationId}: accessPattern.entity "${defs.accessPattern.entity}" is not an E3 entity`));
  }
  validateKeyField(defs, context, issues);

  if (QUERY_ACCESS_KINDS.includes(defs.accessPattern.kind) && defs.accessPattern.output.length === 0) {
    issues.push(errorIssue('operation.accessPattern.output.empty', `operation ${defs.operationId}: accessPattern.kind "${defs.accessPattern.kind}" requires a non-empty output[]`));
  }
  if (defs.accessPattern.kind === 'commandInput' && defs.inputs.length === 0) {
    issues.push(errorIssue('operation.inputs.empty', `operation ${defs.operationId}: accessPattern.kind "commandInput" requires non-empty inputs`));
  }

  for (const input of defs.inputs) {
    if (!(NS3_E5_SOURCES as readonly string[]).includes(input.source)) {
      issues.push(errorIssue('operation.input.source.invalid', `operation ${defs.operationId}: input "${input.inputId}" source "${input.source}" is not a valid source`, input.inputId));
    }
    if (input.required && (!input.inputId || !input.fieldRef || !input.source)) {
      issues.push(errorIssue('operation.input.incomplete', `operation ${defs.operationId}: required input must declare inputId, fieldRef and source`, input.inputId));
    }
    validateFieldRef(defs.operationId, `input "${input.inputId}"`, input.fieldRef, context, issues);
  }
  for (const resolution of defs.contextResolution) {
    if (!(NS3_E5_SOURCES as readonly string[]).includes(resolution.source)) {
      issues.push(errorIssue('operation.context.source.invalid', `operation ${defs.operationId}: contextResolution "${resolution.targetRef}" source "${resolution.source}" is not a valid source`, resolution.targetRef));
      continue;
    }
    validateContextOriginRef(defs.operationId, resolution, context, issues);
  }

  if (WRITE_OPERATION_KINDS.includes(defs.kind) && defs.writes.length === 0) {
    issues.push(errorIssue('operation.writes.empty', `operation ${defs.operationId}: kind "${defs.kind}" requires non-empty writes`));
  }
  for (const ruleId of defs.rulesApplied) {
    if (!context.ruleIds.includes(ruleId)) {
      issues.push(warningIssue('operation.rule.unknown', `operation ${defs.operationId}: rulesApplied "${ruleId}" is not an E4 ruleId`, ruleId));
    }
  }

  // Recheck the deterministic attach (defense against code drift and LLM leakage).
  const expectedPageId = context.classification.workflowId || context.classification.operationId;
  const expectedCommand = context.classification.operationId;
  const expectedBff = `${context.moduleName}.${expectedPageId}.${expectedCommand}`;
  if (defs.pageId !== expectedPageId || defs.commandName !== expectedCommand || defs.bffName !== expectedBff) {
    issues.push(errorIssue('operation.bffName.mismatch', `operation ${defs.operationId}: pageId/commandName/bffName must be the deterministic values "${expectedPageId}"/"${expectedCommand}"/"${expectedBff}"`));
  }

  return { artifact: defs, issues };
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

export function renderE5Markdown(
  classification: Ns3E5ClassificationArtifact,
  workflows: Ns3E5WorkflowDefs[],
  operations: Ns3E5OperationDefs[],
  options: { generatedAt?: string } = {},
): string {
  const lines: string[] = [];
  lines.push(`# E5 — Workflows & Operations: ${classification.moduleName}`);
  lines.push('');
  lines.push(`- module: \`${classification.moduleName}\``);
  lines.push(`- workflows: ${workflows.length} / operations: ${operations.length}`);
  if (options.generatedAt) lines.push(`- generatedAt: ${options.generatedAt}`);
  lines.push('');
  lines.push('## Workflows');
  lines.push('');
  for (const workflow of workflows) {
    lines.push(`### ${workflow.workflowId} — ${workflow.title}`);
    lines.push('');
    lines.push(`- actor: ${workflow.actors.join(', ')} — trigger: ${workflow.trigger}`);
    lines.push(`- states: ${workflow.states.length} (${workflow.states.join(' → ')})`);
    lines.push(`- transitions: ${workflow.transitions.length}`);
    lines.push(`- operations: ${workflow.operationIds.join(', ')}`);
    lines.push('');
  }
  lines.push('## Operations');
  lines.push('');
  lines.push('| operationId | kind | entity | actor | bffName |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const operation of operations) {
    lines.push(`| ${operation.operationId} | ${operation.kind} | ${operation.entity} | ${operation.actor} | \`${operation.bffName}\` |`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// private helpers
// ---------------------------------------------------------------------------

function validateKeyField(defs: Ns3E5OperationDefs, context: E5OperationGateContext, issues: Ns3GateIssue[]): void {
  const parts = defs.accessPattern.keyField.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    issues.push(errorIssue('operation.accessPattern.key.unknown', `operation ${defs.operationId}: keyField "${defs.accessPattern.keyField}" must have the format "Entity.field"`));
    return;
  }
  const [entityId, fieldId] = parts;
  if (!context.entityIds.includes(entityId)) {
    issues.push(errorIssue('operation.accessPattern.key.unknown', `operation ${defs.operationId}: keyField entity "${entityId}" is not an E3 entity`));
    return;
  }
  const entityDefs = context.entityDefs[entityId];
  if (!entityDefs) {
    issues.push(warningIssue('operation.accessPattern.key.unverified', `operation ${defs.operationId}: keyField entity "${entityId}" has no defs on disk; field cannot be verified`));
    return;
  }
  if (!entityDefs.fields.some(field => field.fieldId === fieldId)) {
    issues.push(errorIssue('operation.accessPattern.key.unknown', `operation ${defs.operationId}: keyField field "${fieldId}" does not exist in ${entityId} defs`));
  }
}

// Ported from agentNewSolution2 validateContextResolutionRef: every contextResolution entry must
// carry a resolvable originRef — the server-side resolution recipe agentChangeBackend materializes.
function validateContextOriginRef(
  operationId: string,
  resolution: Ns3E5ContextResolution,
  context: E5OperationGateContext,
  issues: Ns3GateIssue[],
): void {
  const { source, originRef, targetRef } = resolution;
  if (!originRef) {
    issues.push(errorIssue('operation.context.origin.missing', `operation ${operationId}: contextResolution "${targetRef || '?'}" is missing originRef (the server-side resolution recipe)`, targetRef));
    return;
  }
  if (source === 'actorSession' || source === 'businessContext' || source === 'currentWorkspace' || source === 'systemDefault') {
    const allowed = NS3_L4_CONTEXT_ORIGIN_CATALOG[source] as readonly string[];
    if (!allowed.includes(originRef)) {
      issues.push(errorIssue('operation.context.origin.invalid', `operation ${operationId}: ${source} originRef "${originRef}" must be one of ${allowed.join(', ')}`, targetRef));
    }
    return;
  }
  if ((ENTITY_ORIGIN_SOURCES as readonly string[]).includes(source)) {
    const parts = originRef.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      issues.push(errorIssue('operation.context.origin.unknown', `operation ${operationId}: ${source} originRef "${originRef}" must have the format "Entity.field"`, targetRef));
      return;
    }
    const [entityId, fieldId] = parts;
    if (!context.entityIds.includes(entityId)) {
      issues.push(errorIssue('operation.context.origin.unknown', `operation ${operationId}: ${source} originRef entity "${entityId}" is not an E3 entity`, targetRef));
      return;
    }
    const entityDefs = context.entityDefs[entityId];
    if (!entityDefs) {
      // Entity is known but its defs are not on disk yet: downgrade the field check to a warning.
      issues.push(warningIssue('operation.context.origin.unverified', `operation ${operationId}: ${source} originRef entity "${entityId}" has no defs on disk; field "${fieldId}" cannot be verified`, targetRef));
      return;
    }
    if (!entityDefs.fields.some(field => field.fieldId === fieldId)) {
      issues.push(errorIssue('operation.context.origin.unknown', `operation ${operationId}: ${source} originRef field "${fieldId}" does not exist in ${entityId} defs`, targetRef));
    }
    return;
  }
  if (source === 'routeParam' && !/^routeParam\.[A-Za-z0-9_-]+$/.test(originRef)) {
    issues.push(errorIssue('operation.context.origin.invalid', `operation ${operationId}: routeParam originRef "${originRef}" must be routeParam.<name>`, targetRef));
    return;
  }
  if (source === 'userInput' && !/^userInput\.[A-Za-z0-9_-]+$/.test(originRef)) {
    issues.push(errorIssue('operation.context.origin.invalid', `operation ${operationId}: userInput originRef "${originRef}" must be userInput.<name>`, targetRef));
  }
}

function validateFieldRef(
  operationId: string,
  label: string,
  fieldRef: string,
  context: E5OperationGateContext,
  issues: Ns3GateIssue[],
): void {
  const parts = fieldRef.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    issues.push(errorIssue('operation.input.fieldRef.unknown', `operation ${operationId}: ${label} fieldRef "${fieldRef}" must have the format "Entity.field"`));
    return;
  }
  const [entityId, fieldId] = parts;
  if (!context.entityIds.includes(entityId)) {
    issues.push(errorIssue('operation.input.fieldRef.unknown', `operation ${operationId}: ${label} fieldRef entity "${entityId}" is not an E3 entity`));
    return;
  }
  const entityDefs = context.entityDefs[entityId];
  if (entityDefs && !entityDefs.fields.some(field => field.fieldId === fieldId)) {
    issues.push(warningIssue('operation.input.field.unknown', `operation ${operationId}: ${label} field "${fieldId}" does not exist in ${entityId} defs`));
  }
}

function readStory(value: unknown): Ns3E5Story {
  const record = isRecord(value) ? value : {};
  return {
    actor: readString(record.actor) || '',
    goal: readString(record.goal) || '',
    steps: readStringArray(record.steps),
    outcome: readString(record.outcome) || '',
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => readString(item)).filter((item): item is string => !!item)
    : [];
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every(item => setB.has(item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
