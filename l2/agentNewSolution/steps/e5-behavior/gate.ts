/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e5-behavior/gate.ts" enhancement="_blank"/>

// E5 gate: pure functions only (no stor access). Entity fields/statusEnum arrive as
// parameters (NsE5EntityDefsInfo) so tests run without the browser runtime. isRecord and
// sameStringSet are local on purpose: importing them (nsFs / e3 gate) would pull libStor
// into the node test harness, which has no mls runtime.

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';

export const E5_CLASSIFICATION_SCHEMA_VERSION = '2026-07-11-ns-e5-v2';

export const NS_OPERATION_KINDS = ['create', 'update', 'delete', 'query', 'view'] as const;
// Explicit business decision for every managed (mdm/cadastral) entity: how records leave the base.
// 'delete' requires a delete operation; 'inactivate' requires a lifecycle state; 'immutable'
// requires a reason. Silent omission (the 102051 gap: no delete anywhere) is a gate error.
export const NS_E5_DELETION_POLICIES = ['delete', 'inactivate', 'immutable'] as const;
export const NS_E5_EXECUTION_MODES = ['sequential', 'parallel_static', 'parallel_dynamic'] as const;
export const NS_E5_ACCESS_PATTERN_KINDS = ['list', 'getById', 'lookup', 'commandInput'] as const;
export const NS_E5_PAGINATIONS = ['none', 'optional', 'required'] as const;
export const NS_E5_SELECTIONS = ['none', 'single', 'multiple'] as const;
// Shared source vocabulary for operation inputs AND contextResolution entries.
export const NS_E5_SOURCES = [
  'userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity',
  'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault',
] as const;
// Highest first: capability priority = highest priority among the item featureRefs.
export const NS_E5_PRIORITY_ORDER = ['now', 'soon', 'later', 'never'] as const;

// copied from _102029_/l2/runtimeConfigTypes.ts L4_CONTEXT_ORIGIN_CATALOG — keep in sync.
// Local copy on purpose: importing runtimeConfigTypes could pull browser deps into the
// node test harness, and this gate must stay pure.
export const NS_L4_CONTEXT_ORIGIN_CATALOG = {
  actorSession: ['actorSession.actorId', 'actorSession.scope'],
  businessContext: ['businessContext.activeCompanyId', 'businessContext.activeUnitId'],
  currentWorkspace: ['currentWorkspace.workspaceId'],
  systemDefault: ['systemDefault.now', 'systemDefault.uuid', 'systemDefault.locale'],
} as const;

// Sources whose originRef must resolve to a saved entity field ('Entity.field').
const ENTITY_ORIGIN_SOURCES = ['selectedEntity', 'activeLifecycleInstance', 'workflowState', 'previousStepOutput'] as const;

export type NsOperationKind = typeof NS_OPERATION_KINDS[number];
export type NsE5ExecutionMode = typeof NS_E5_EXECUTION_MODES[number];
export type NsE5AccessPatternKind = typeof NS_E5_ACCESS_PATTERN_KINDS[number];
export type NsE5Pagination = typeof NS_E5_PAGINATIONS[number];
export type NsE5Selection = typeof NS_E5_SELECTIONS[number];
export type NsE5Source = typeof NS_E5_SOURCES[number];
export type NsE5Priority = typeof NS_E5_PRIORITY_ORDER[number];

const QUERY_ACCESS_KINDS: readonly NsE5AccessPatternKind[] = ['list', 'getById', 'lookup'];
const WRITE_OPERATION_KINDS: readonly NsOperationKind[] = ['create', 'update', 'delete'];

// ---------------------------------------------------------------------------
// types — classification
// ---------------------------------------------------------------------------

export interface NsE5ClassificationWorkflow {
  workflowId: string;
  title: string;
  actorId: string;
  primaryEntity: string;
  featureRefs: string[];
  operationIds: string[];
}

export interface NsE5ClassificationOperation {
  operationId: string;
  title: string;
  actorId: string;
  entity: string;
  kind: NsOperationKind;
  featureRefs: string[];
  workflowId?: string;
}

export type NsE5DeletionPolicy = typeof NS_E5_DELETION_POLICIES[number];

export interface NsE5ManagedEntity {
  entity: string;
  deletionPolicy: NsE5DeletionPolicy;
  /** Required when deletionPolicy is 'inactivate': a state of the entity statusEnum. */
  inactivationState?: string;
  /** Required when deletionPolicy is 'immutable': the business justification. */
  reason?: string;
}

export interface NsE5ClassificationArtifact {
  schemaVersion: typeof E5_CLASSIFICATION_SCHEMA_VERSION;
  moduleName: string;
  createdAt: string;
  workflows: NsE5ClassificationWorkflow[];
  operations: NsE5ClassificationOperation[];
  managedEntities: NsE5ManagedEntity[];
}

// ---------------------------------------------------------------------------
// types — workflow / operation artifacts
// ---------------------------------------------------------------------------

export interface NsE5Transition {
  from: string;
  to: string;
  on: string;
  by?: string;
  guard?: string;
}

export interface NsE5Story {
  actor: string;
  goal: string;
  steps: string[];
  outcome: string;
}

export interface NsE5Capability {
  capabilityId: string;
  title: string;
  actor: string;
  priority: NsE5Priority;
}

export interface NsE5WorkflowArtifact {
  workflowId: string;
  title: string;
  executionMode: NsE5ExecutionMode;
  trigger: string;
  actors: string[];
  states: string[];
  transitions: NsE5Transition[];
  operationIds: string[];
  entities: string[];
  rulesApplied: string[];
  story: NsE5Story;
}

// Written to l4/{module}/workflows/{workflowId}.defs.ts — LLM artifact + deterministic attach.
export interface NsE5WorkflowDefs extends NsE5WorkflowArtifact {
  pageId: string;
  capabilities: NsE5Capability[];
  statusFrontend: 'toCreate';
  statusBackend: 'toCreate';
}

export interface NsE5AccessPattern {
  kind: NsE5AccessPatternKind;
  description?: string;
  entity: string;
  keyField: string;
  filters?: string[];
  sort?: string[];
  pagination: NsE5Pagination;
  selection: NsE5Selection;
  output: string[];
}

// Canonical output STRUCTURE (Option 3): l4 declares the wire shape once so both masters copy it
// deterministically (neither re-infers) — killing the FE×BE contract drift. Top-level shape + one
// level of item fields. Entity-backed fields carry `fieldRef` (leaf/item types derive from the entity
// as before); computed/aggregate fields (totalSales, topSellers, lowStockAlerts) have NO fieldRef and
// declare their type — and, for computed collections, their item fields — inline (there is no entity to
// derive them from, which is exactly why only the LLM knew them and why l4 must now carry them).
export type NsE5OutputShapeKind = 'object' | 'list' | 'paginated';

export interface NsE5OutputField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  fieldRef?: string;
  item?: { fields: NsE5OutputField[] };
}

export interface NsE5OutputShape {
  kind: NsE5OutputShapeKind;
  fields: NsE5OutputField[];
}

export interface NsE5OperationInput {
  inputId: string;
  // Every input declares a resolvable `fieldRef` (type derives from the entity field) OR an explicit
  // `type` (free inputs: pagination, flags — nothing in the ontology to point at). Gap A5 of
  // newSolution_10: without one of the two the bffCall contract (N1) is not 100% derivable.
  fieldRef?: string;
  type?: 'string' | 'number' | 'boolean';
  required: boolean;
  source: NsE5Source;
  description: string;
}

export interface NsE5ContextResolution {
  inputId?: string;
  targetRef: string;
  source: NsE5Source;
  // REQUIRED: the server-side resolution recipe. Without it agentChangeBackend has no way to
  // materialize the value and the generated handler demands it from the request (viewDashboard incident).
  originRef: string;
  description: string;
}

export interface NsE5OperationArtifact {
  operationId: string;
  title: string;
  actors: string[];
  entity: string;
  kind: NsOperationKind;
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  story: NsE5Story;
  accessPattern: NsE5AccessPattern;
  outputShape: NsE5OutputShape;
  inputs: NsE5OperationInput[];
  contextResolution: NsE5ContextResolution[];
  acceptanceAssertions: string[];
}

// Written to l4/{module}/operations/{operationId}.defs.ts — LLM artifact + deterministic attach.
export interface NsE5OperationDefs extends NsE5OperationArtifact {
  pageId: string;
  commandName: string;
  /**
   * @deprecated (newSolution_10 N3) The wire ROUTE is now derived from the workspace as
   * `<module>.<workspaceId>.<bffId>` (helpers e6 deriveE6BffRoutes) — a page concern, not an
   * operation one. `bffName` stays only as a back-compat READ for older l4 layouts; the contracts
   * emitter (N4) keys on the bffCall route, never on this field.
   */
  bffName: string;
  capability: NsE5Capability;
  statusFrontend: 'toCreate';
  statusBackend: 'toCreate';
}

// ---------------------------------------------------------------------------
// gate contexts (data arrives as parameters — no stor access here)
// ---------------------------------------------------------------------------

export interface NsE5FeatureRef {
  featureId: string;
  priority: NsE5Priority;
}

export interface NsE5EntityDefsInfo {
  fields: Array<{ fieldId: string }>;
  statusEnum?: string[];
}

export interface E5ClassificationGateContext {
  moduleName: string;
  actorIds: string[];
  entityIds: string[];
  features: NsE5FeatureRef[];
  /** E3 entity defs on disk — used to verify managedEntities.inactivationState against statusEnum. */
  entityDefs: Record<string, NsE5EntityDefsInfo>;
  /** E3 entity kinds (core|supporting|event|metric|mdm) — scopes the managedEntities requirement. */
  entityKinds: Record<string, string>;
}

export interface E5WorkflowGateContext {
  itemId: string;
  classification: NsE5ClassificationWorkflow;
  actorIds: string[];
  entityIds: string[];
  ruleIds: string[];
  entityDefs: Record<string, NsE5EntityDefsInfo>;
}

export interface E5OperationGateContext {
  itemId: string;
  moduleName: string;
  classification: NsE5ClassificationOperation;
  actorIds: string[];
  entityIds: string[];
  ruleIds: string[];
  entityDefs: Record<string, NsE5EntityDefsInfo>;
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

export function prepareE5Classification(input: unknown, context: { moduleName: string }): NsE5ClassificationArtifact {
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
      kind: (readString(item.kind) || '') as NsOperationKind,
      featureRefs: readStringArray(item.featureRefs),
      ...(readString(item.workflowId) ? { workflowId: readString(item.workflowId) } : {}),
    })),
    managedEntities: (Array.isArray(record.managedEntities) ? record.managedEntities.filter(isRecord) : []).map(item => ({
      entity: readString(item.entity) || '',
      // Invalid values pass through so the schema check reports them (no silent fallback).
      deletionPolicy: (readString(item.deletionPolicy) || '') as NsE5DeletionPolicy,
      ...(readString(item.inactivationState) ? { inactivationState: readString(item.inactivationState) } : {}),
      ...(readString(item.reason) ? { reason: readString(item.reason) } : {}),
    })),
  };
}

export function prepareE5Workflow(input: unknown): NsE5WorkflowArtifact {
  const record = isRecord(input) ? input : {};
  const transitions = Array.isArray(record.transitions) ? record.transitions.filter(isRecord) : [];
  return {
    workflowId: readString(record.workflowId) || '',
    title: readString(record.title) || '',
    executionMode: (readString(record.executionMode) || '') as NsE5ExecutionMode,
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

function readOutputField(input: unknown): NsE5OutputField | null {
  if (!isRecord(input)) return null;
  const name = readString(input.name) || '';
  const type = (readString(input.type) || '') as NsE5OutputField['type'];
  if (!name || !type) return null;
  const field: NsE5OutputField = { name, type, required: input.required === true };
  const fieldRef = readString(input.fieldRef);
  if (fieldRef) field.fieldRef = fieldRef;
  if (isRecord(input.item) && Array.isArray(input.item.fields)) {
    const fields = input.item.fields.map(readOutputField).filter((f): f is NsE5OutputField => f !== null);
    if (fields.length) field.item = { fields };
  }
  return field;
}

function readOutputShape(input: unknown): NsE5OutputShape {
  const record = isRecord(input) ? input : {};
  const kind = (readString(record.kind) || '') as NsE5OutputShapeKind;
  const fields = Array.isArray(record.fields)
    ? record.fields.map(readOutputField).filter((f): f is NsE5OutputField => f !== null)
    : [];
  return { kind, fields };
}

export function prepareE5Operation(input: unknown): NsE5OperationArtifact {
  const record = isRecord(input) ? input : {};
  const access = isRecord(record.accessPattern) ? record.accessPattern : {};
  const inputs = Array.isArray(record.inputs) ? record.inputs.filter(isRecord) : [];
  const contextResolution = Array.isArray(record.contextResolution) ? record.contextResolution.filter(isRecord) : [];
  return {
    operationId: readString(record.operationId) || '',
    title: readString(record.title) || '',
    actors: readActors(record),
    entity: readString(record.entity) || '',
    kind: (readString(record.kind) || '') as NsOperationKind,
    reads: readStringArray(record.reads),
    writes: readStringArray(record.writes),
    rulesApplied: readStringArray(record.rulesApplied),
    story: readStory(record.story),
    accessPattern: {
      kind: (readString(access.kind) || '') as NsE5AccessPatternKind,
      ...(readString(access.description) ? { description: readString(access.description) } : {}),
      entity: readString(access.entity) || '',
      keyField: readString(access.keyField) || '',
      ...(readStringArray(access.filters).length ? { filters: readStringArray(access.filters) } : {}),
      ...(readStringArray(access.sort).length ? { sort: readStringArray(access.sort) } : {}),
      pagination: (readString(access.pagination) || '') as NsE5Pagination,
      selection: (readString(access.selection) || '') as NsE5Selection,
      output: readStringArray(access.output),
    },
    outputShape: readOutputShape(record.outputShape),
    inputs: inputs.map(item => {
      const fieldRef = readString(item.fieldRef);
      const type = readString(item.type);
      return {
        inputId: readString(item.inputId) || '',
        ...(fieldRef ? { fieldRef } : {}),
        ...(type === 'string' || type === 'number' || type === 'boolean' ? { type } : {}),
        required: item.required === true,
        source: (readString(item.source) || '') as NsE5Source,
        description: readString(item.description) || '',
      };
    }),
    contextResolution: contextResolution.map(item => ({
      ...(readString(item.inputId) ? { inputId: readString(item.inputId) } : {}),
      targetRef: readString(item.targetRef) || '',
      source: (readString(item.source) || '') as NsE5Source,
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

export function priorityFromFeatures(featureRefs: string[], features: NsE5FeatureRef[]): NsE5Priority {
  let bestIndex = -1;
  for (const ref of featureRefs) {
    const feature = features.find(item => item.featureId === ref);
    if (!feature) continue;
    const index = NS_E5_PRIORITY_ORDER.indexOf(feature.priority);
    if (index >= 0 && (bestIndex < 0 || index < bestIndex)) bestIndex = index;
  }
  return bestIndex >= 0 ? NS_E5_PRIORITY_ORDER[bestIndex] : 'later';
}

export function attachWorkflowDeterministic(
  artifact: NsE5WorkflowArtifact,
  args: { classification: NsE5ClassificationWorkflow; features: NsE5FeatureRef[] },
): NsE5WorkflowDefs {
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

// Common pagination input ids — typed as number when the LLM leaves them bare.
const NS_E5_PAGINATION_INPUT_IDS = new Set(['page', 'pageSize', 'offset', 'limit', 'pageNumber', 'size', 'perPage']);

// Make every input typeable by CODE instead of hard-failing the run (gap A5 was designed as an LLM
// gate, but the LLM systematically omits BOTH fieldRef and type on getById keys, filters and
// pagination — petShop: searchProducts/browseProducts came back with searchTerm/petTypeId/categoryId/
// priceRange/sortBy/page/pageSize all untyped, and the retry made it WORSE, so no run reached e6).
// The contract emitter already defaults untyped inputs (pagination -> number, else -> string), so the
// type IS derivable; attach it here so the operation persists (and the type is explicit on disk):
//   1. key input (inputId == accessPattern.keyField's field): fieldRef = keyField (already gate-validated
//      to exist, so never an invalid ref);
//   2. a known pagination id: type = number;
//   3. anything else still bare: type = string (matches the emitter default; the LLM keeps fieldRef when
//      it knows the entity field, so this only catches genuinely free filters like priceRange/sortBy).
// `operation.input.untyped` stays as a safety net (unreachable through this attach path).
export function backfillE5OperationInputs(artifact: NsE5OperationArtifact): NsE5OperationArtifact {
  const keyField = artifact.accessPattern?.keyField || '';
  const parts = keyField.split('.');
  const keyFieldName = parts.length === 2 && parts[0] && parts[1] ? parts[1] : '';
  for (const input of artifact.inputs) {
    if (input.fieldRef || input.type) continue;
    if (keyFieldName && input.inputId === keyFieldName) { input.fieldRef = keyField; continue; }
    input.type = NS_E5_PAGINATION_INPUT_IDS.has(input.inputId) ? 'number' : 'string';
  }
  return artifact;
}

export function attachOperationDeterministic(
  artifact: NsE5OperationArtifact,
  args: {
    moduleName: string;
    classification: NsE5ClassificationOperation;
    owningWorkflow?: NsE5ClassificationWorkflow;
    features: NsE5FeatureRef[];
  },
): NsE5OperationDefs {
  backfillE5OperationInputs(artifact);
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
  artifact: NsE5ClassificationArtifact,
  context: E5ClassificationGateContext,
): { artifact: NsE5ClassificationArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
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

// Managed (mdm/cadastral) entities and the deletionPolicy requirement. Scope (refined after the
// 102048 run — kind must not force a single UX and core lifecycle entities exit via their own
// states):
//   - mdm entity with ANY write operation (standalone or workflow-owned): entry REQUIRED (error).
//   - non-mdm entity with standalone writes and NO statusEnum: entry required (error) — nothing
//     else models how records leave the base.
//   - non-mdm entity with standalone writes and a statusEnum: entry recommended (warning) — the
//     lifecycle usually models the exit (e.g. Project.cancelled).
// This is the guard against the 102051 gap (CRUDs without delete/inactivation, silently).
function validateManagedEntities(
  artifact: NsE5ClassificationArtifact,
  context: E5ClassificationGateContext,
  issues: NsGateIssue[],
): void {
  const standaloneWrites = new Map<string, Set<NsOperationKind>>();
  const anyWrites = new Map<string, Set<NsOperationKind>>();
  for (const operation of artifact.operations) {
    if (!WRITE_OPERATION_KINDS.includes(operation.kind)) continue;
    const all = anyWrites.get(operation.entity) ?? new Set<NsOperationKind>();
    all.add(operation.kind);
    anyWrites.set(operation.entity, all);
    if (operation.workflowId) continue;
    const kinds = standaloneWrites.get(operation.entity) ?? new Set<NsOperationKind>();
    kinds.add(operation.kind);
    standaloneWrites.set(operation.entity, kinds);
  }

  // Entities whose policy must be validated: mdm with any write + entities with standalone writes.
  const underManagement = new Map<string, Set<NsOperationKind>>(standaloneWrites);
  for (const [entity, kinds] of anyWrites) {
    if (context.entityKinds[entity] === 'mdm' && !underManagement.has(entity)) {
      underManagement.set(entity, kinds);
    }
  }

  const declared = new Map(artifact.managedEntities.map(item => [item.entity, item]));

  for (const [entity, kinds] of underManagement) {
    const policy = declared.get(entity);
    if (!policy) {
      const isMdm = context.entityKinds[entity] === 'mdm';
      const hasLifecycle = (context.entityDefs[entity]?.statusEnum || []).length > 0;
      const message = `entity "${entity}" has write operations but no managedEntities entry — declare its deletionPolicy (delete | inactivate | immutable)`;
      if (isMdm || !hasLifecycle) issues.push(errorIssue('classification.managedEntity.missing', message, entity));
      else issues.push(warningIssue('classification.managedEntity.missing', `${message}; its statusEnum may already model the exit — declare it explicitly if so (inactivate)`, entity));
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
    if (!underManagement.has(policy.entity)) {
      issues.push(warningIssue('classification.managedEntity.unused', `managedEntities entry "${policy.entity}" has no write operations under management — entry is inert`, policy.entity));
    }
  }
}

// ---------------------------------------------------------------------------
// finalize reconciliation (102048 finding: workflow engulfment)
// ---------------------------------------------------------------------------

export interface NsE5Demotion {
  workflowId: string;
  operationId: string;
}

/**
 * Operations listed in a workflow that neither create the lifecycle instance (the trigger) nor
 * cause any REAL transition (from !== to) do not belong to the workflow — they are management/
 * cadastral operations that must be standalone. Deterministic; runs at e5-finalize over the saved
 * workflow defs (transitions only exist after the per-workflow calls, so the classification gate
 * cannot see this).
 */
export function computeE5WorkflowDemotions(
  workflows: Array<Pick<NsE5WorkflowArtifact, 'workflowId' | 'operationIds' | 'transitions'>>,
  classification: NsE5ClassificationArtifact,
): NsE5Demotion[] {
  const kindById = new Map(classification.operations.map(operation => [operation.operationId, operation.kind]));
  const demotions: NsE5Demotion[] = [];
  for (const workflow of workflows) {
    const realTransitionOns = new Set(
      workflow.transitions.filter(transition => transition.from !== transition.to).map(transition => transition.on),
    );
    for (const operationId of workflow.operationIds) {
      if (kindById.get(operationId) === 'create') continue; // the trigger stays
      if (realTransitionOns.has(operationId)) continue;
      demotions.push({ workflowId: workflow.workflowId, operationId });
    }
  }
  return demotions;
}

/** Rewrites the deterministic attach of a demoted operation: standalone pageId/bffName. */
export function demoteE5OperationDefs(defs: NsE5OperationDefs, moduleName: string): NsE5OperationDefs {
  return {
    ...defs,
    pageId: defs.operationId,
    commandName: defs.operationId,
    bffName: `${moduleName}.${defs.operationId}.${defs.operationId}`,
  };
}

export function validateE5Workflow(
  artifact: NsE5WorkflowArtifact,
  context: E5WorkflowGateContext,
): { artifact: NsE5WorkflowArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
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
    // Self-transitions are FORBIDDEN (102048 finding): "planning -> planning on updateProject" is
    // a cadastral edit dressed as a transition — it laundered management operations into workflows,
    // emptied managedEntities and created accidental state guards on data edits. An operation that
    // does not change the state does not belong to the workflow: drop the transition (creation is
    // the trigger, not a transition; data edits are standalone operations).
    if (transition.from === transition.to) {
      issues.push(errorIssue('workflow.transition.self', `workflow ${artifact.workflowId}: self-transition "${transition.from}" -> "${transition.to}" on ${transition.on} — transitions must change the state; remove it (creation is the workflow trigger; cadastral edits are standalone operations)`));
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
  defs: NsE5OperationDefs,
  context: E5OperationGateContext,
): { artifact: NsE5OperationDefs; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];

  if (defs.operationId !== context.itemId) {
    issues.push(errorIssue('operation.id.mismatch', `operationId must be "${context.itemId}", got "${defs.operationId}"`));
  }
  if (defs.kind !== context.classification.kind) {
    issues.push(errorIssue('operation.kind.mismatch', `operation ${defs.operationId}: kind "${defs.kind}" differs from the classification ("${context.classification.kind}")`));
  }
  // D6: an operation may serve several actors; each must be in the E4 roster (mirrors workflow.actors).
  if (defs.actors.length === 0) {
    issues.push(errorIssue('operation.actors.empty', `operation ${defs.operationId}: declares no actors`));
  }
  for (const actor of defs.actors) {
    if (!context.actorIds.includes(actor)) {
      issues.push(errorIssue('operation.actor.unknown', `operation ${defs.operationId}: actor "${actor}" is not in the E4 roster`, actor));
    }
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
    if (!(NS_E5_SOURCES as readonly string[]).includes(input.source)) {
      issues.push(errorIssue('operation.input.source.invalid', `operation ${defs.operationId}: input "${input.inputId}" source "${input.source}" is not a valid source`, input.inputId));
    }
    // Gap A5: every input must be typeable — a resolvable fieldRef OR an explicit type. Without one the
    // bffCall wire contract (N1) cannot derive the input type deterministically.
    if (!input.fieldRef && !input.type) {
      issues.push(errorIssue('operation.input.untyped', `operation ${defs.operationId}: input "${input.inputId}" must declare a fieldRef or an explicit type`, input.inputId));
    }
    if (input.required && (!input.inputId || (!input.fieldRef && !input.type) || !input.source)) {
      issues.push(errorIssue('operation.input.incomplete', `operation ${defs.operationId}: required input must declare inputId, a fieldRef or type, and source`, input.inputId));
    }
    if (input.fieldRef) validateFieldRef(defs.operationId, `input "${input.inputId}"`, input.fieldRef, context, issues);
  }
  for (const resolution of defs.contextResolution) {
    if (!(NS_E5_SOURCES as readonly string[]).includes(resolution.source)) {
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
  classification: NsE5ClassificationArtifact,
  workflows: NsE5WorkflowDefs[],
  operations: NsE5OperationDefs[],
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
    lines.push(`| ${operation.operationId} | ${operation.kind} | ${operation.entity} | ${operation.actors.join('/')} | \`${operation.bffName}\` |`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// private helpers
// ---------------------------------------------------------------------------

function validateKeyField(defs: NsE5OperationDefs, context: E5OperationGateContext, issues: NsGateIssue[]): void {
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
  resolution: NsE5ContextResolution,
  context: E5OperationGateContext,
  issues: NsGateIssue[],
): void {
  const { source, originRef, targetRef } = resolution;
  if (!originRef) {
    issues.push(errorIssue('operation.context.origin.missing', `operation ${operationId}: contextResolution "${targetRef || '?'}" is missing originRef (the server-side resolution recipe)`, targetRef));
    return;
  }
  if (source === 'actorSession' || source === 'businessContext' || source === 'currentWorkspace' || source === 'systemDefault') {
    const allowed = NS_L4_CONTEXT_ORIGIN_CATALOG[source] as readonly string[];
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
  issues: NsGateIssue[],
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

function readStory(value: unknown): NsE5Story {
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
