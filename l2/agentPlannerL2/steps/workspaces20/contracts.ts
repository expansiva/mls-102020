/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.ts" enhancement="_blank"/>

export const P2_WORKSPACES_SCHEMA_VERSION = '2026-09-18-p2-workspaces-v1' as const;
export const P2_WORKSPACE_KINDS = ['catalogue', 'hub', 'command'] as const;
export type P2WorkspaceKind = typeof P2_WORKSPACE_KINDS[number];

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface P2JourneyStepView {
  stepId: string;
  kind: string;
  entity: string;
}

export interface P2JourneyView {
  journeyId: string;
  actorRef: string;
  title: string;
  steps: P2JourneyStepView[];
}

export interface P2OntologyEntityView {
  entityId: string;
  kind: string;
  class?: string;
  family?: string;
  storageKind?: string;
  displayField?: string;
  idField?: string;
  capabilities: string[];
}

export interface P2AccessActorView {
  actorId: string;
  title: string;
  kind: string;
}

export interface P2L4Sources {
  moduleName: string;
  userLanguage: string;
  journeys: P2JourneyView[];
  actors: P2AccessActorView[];
  entities: P2OntologyEntityView[];
}

/**
 * One workspace cut from l4 journeys. Downstream readers are named on each field.
 * Structure is consumed only through those named readers — contracts30 / shared40.
 */
export interface P2Workspace {
  /** contracts30: file `web/contracts/{workspaceId}.defs.ts`. shared40: pageId, routePattern, origin.workspaceId. */
  workspaceId: string;
  /** shared40: pageName. */
  title: string;
  /** contracts30: qry* vs cmd* mix. shared40: origin.workspaceKind (catalogue→operation, hub→landing, command→operation). */
  kind: P2WorkspaceKind;
  /** contracts30: ontology fields of this entity. shared40: origin.entity. */
  entityRef: string;
  /** contracts30: grant filter. shared40: origin.actor (first) and actor list. */
  actorRefs: string[];
  /** contracts30: which journey steps become BFF calls. shared40: origin.microUserFlow. */
  journeyRefs: string[];
  /** contracts30: one call per relevant step. shared40: operation/step mapping. */
  stepRefs: string[];
}

export interface P2WorkspacesDraft {
  schemaVersion: typeof P2_WORKSPACES_SCHEMA_VERSION;
  moduleName: string;
  workspaces: P2Workspace[];
}

export interface P2WorkspaceCandidate {
  candidateId: string;
  entityRef: string;
  actorRef: string;
  kind: P2WorkspaceKind;
  journeyRefs: string[];
  stepRefs: string[];
}

export function isP2WorkspaceKind(value: string): value is P2WorkspaceKind {
  return (P2_WORKSPACE_KINDS as readonly string[]).includes(value);
}

export function isDdmEntity(entity: P2OntologyEntityView): boolean {
  if (entity.family === 'ddm') return true;
  if (entity.storageKind === 'timeSeries') return true;
  return entity.capabilities.includes('aggregate.byWindow');
}

export function suggestedWorkspaceKind(journey: P2JourneyView, entities: readonly P2OntologyEntityView[]): P2WorkspaceKind {
  const onlyAct = journey.steps.length > 0 && journey.steps.every(step => step.kind === 'act');
  const hasLocate = journey.steps.some(step => step.kind === 'locate');
  if (onlyAct && !hasLocate) return 'command';

  const hasAct = journey.steps.some(step => step.kind === 'act');
  const hasInspect = journey.steps.some(step => step.kind === 'inspect');
  if (journey.steps.some(step => entityIsDdm(entities, step.entity))) return 'hub';
  if (hasInspect && !hasLocate && !hasAct) return 'hub';
  return 'catalogue';
}

export function collectP2WorkspaceCandidates(sources: P2L4Sources): P2WorkspaceCandidate[] {
  const groups = new Map<string, P2WorkspaceCandidate>();
  for (const journey of sources.journeys) {
    const kind = suggestedWorkspaceKind(journey, sources.entities);
    for (const step of journey.steps) {
      const candidateId = workspaceCandidateId(journey.actorRef, step.entity, kind);
      let candidate = groups.get(candidateId);
      if (!candidate) {
        candidate = {
          candidateId,
          entityRef: step.entity,
          actorRef: journey.actorRef,
          kind,
          journeyRefs: [],
          stepRefs: [],
        };
        groups.set(candidateId, candidate);
      }
      if (!candidate.journeyRefs.includes(journey.journeyId)) candidate.journeyRefs.push(journey.journeyId);
      if (!candidate.stepRefs.includes(step.stepId)) candidate.stepRefs.push(step.stepId);
    }
  }
  return [...groups.values()].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
}

export function workspaceCandidateId(actorRef: string, entityRef: string, kind: P2WorkspaceKind): string {
  return `${actorRef}${entityRef}${capitalize(kind)}`;
}

export function parseP2L4Sources(input: {
  moduleName?: string;
  userLanguage?: string;
  journeyIndex?: unknown;
  journeys: unknown[];
  access: unknown;
  ontologyIndex: unknown;
  ontologyEntities?: unknown[];
}): P2L4Sources {
  const access = record(input.access);
  const ontologyIndex = record(input.ontologyIndex);
  const indexEntities = list(ontologyIndex.entities).map(item => record(item));
  const entityFiles = (input.ontologyEntities || []).map(item => record(item));
  const entitiesById = new Map<string, Record<string, unknown>>();
  for (const entity of entityFiles) {
    const entityId = text(entity.entityId);
    if (entityId) entitiesById.set(entityId, entity);
  }

  const actors = list(access.actors).map(item => {
    const actor = record(item);
    return {
      actorId: memberId(text(actor.actorId)),
      title: text(actor.title),
      kind: text(actor.kind),
    };
  }).filter(actor => actor.actorId);

  const entities: P2OntologyEntityView[] = indexEntities.map(row => {
    const entityId = text(row.entityId);
    const file = entitiesById.get(entityId) || {};
    const storage = record(file.storage);
    const capabilities = record(file.capabilities);
    const recordNode = record(file.record);
    const fields = record(recordNode.fields);
    return {
      entityId,
      kind: text(row.kind) || text(file.kind),
      class: text(row.class) || text(file.class) || undefined,
      family: text(file.family) || undefined,
      storageKind: text(storage.kind) || undefined,
      displayField: text(file.displayField) || undefined,
      idField: fields.id ? 'id' : undefined,
      capabilities: Object.keys(capabilities),
    };
  }).filter(entity => entity.entityId);

  const journeys = input.journeys.map(item => parseJourney(item)).filter(journey => journey.journeyId);

  return {
    moduleName: memberId(text(input.moduleName) || text(record(input.journeyIndex).moduleName) || text(access.moduleName)),
    userLanguage: text(input.userLanguage) || 'en',
    journeys,
    actors,
    entities,
  };
}

export function normalizeP2WorkspacesPayload(value: unknown, moduleName: string): P2WorkspacesDraft {
  const root = record(value);
  const workspaces = list(root.workspaces).map(item => normalizeWorkspace(item)).filter(workspace => workspace.workspaceId || workspace.title);
  return {
    schemaVersion: P2_WORKSPACES_SCHEMA_VERSION,
    moduleName: memberId(text(root.moduleName) || moduleName),
    workspaces,
  };
}

export function buildP2WorkspacesTool(
  schema: Record<string, unknown>,
): mls.msg.LLMTool {
  return createP2ArtifactTool(
    'submitP2Workspaces',
    'Submit the workspace cut: named workspaces chosen from the deterministic candidates.',
    schema,
  );
}

export function unwrapP2ArtifactPayload(value: unknown): unknown {
  const root = parseMaybeJson(value);
  const payload = isRecord(root) && root.type === 'flexible' ? parseMaybeJson(root.result) : root;
  const argumentsValue = toolArguments(payload);
  if (argumentsValue === undefined) return payload;
  const argumentsPayload = parseMaybeJson(argumentsValue);
  return isRecord(argumentsPayload) && argumentsPayload.type === 'flexible'
    ? parseMaybeJson(argumentsPayload.result)
    : argumentsPayload;
}

function createP2ArtifactTool(
  toolName: string,
  description: string,
  artifactSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  const result: Record<string, unknown> = { ...artifactSchema };
  const defs = result.$defs;
  delete result.$defs;
  delete result.$id;
  delete result.$schema;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'result'],
    properties: {
      type: { type: 'string', const: 'flexible' },
      result,
    },
  };
  if (isRecord(defs)) parameters.$defs = defs;
  return { type: 'function', function: { name: toolName, description, parameters } } as mls.msg.LLMTool;
}

function parseJourney(value: unknown): P2JourneyView {
  const source = record(value);
  const business = record(source.business);
  return {
    journeyId: memberId(text(source.journeyId)),
    actorRef: memberId(text(business.actorRef)),
    title: text(business.title),
    steps: list(business.steps).map(item => {
      const step = record(item);
      return {
        stepId: memberId(text(step.stepId)),
        kind: text(step.kind),
        entity: text(step.entity),
      };
    }).filter(step => step.stepId),
  };
}

function normalizeWorkspace(value: unknown): P2Workspace {
  const source = record(value);
  const kind = text(source.kind);
  return {
    workspaceId: memberId(text(source.workspaceId) || text(source.title)),
    title: text(source.title),
    kind: isP2WorkspaceKind(kind) ? kind : '' as P2WorkspaceKind,
    entityRef: text(source.entityRef),
    actorRefs: uniqueMemberIds(source.actorRefs),
    journeyRefs: uniqueMemberIds(source.journeyRefs),
    stepRefs: uniqueMemberIds(source.stepRefs),
  };
}

function entityIsDdm(entities: readonly P2OntologyEntityView[], entityId: string): boolean {
  return entities.some(entity => entity.entityId === entityId && isDdmEntity(entity));
}

function uniqueMemberIds(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list(value)) {
    const id = memberId(typeof item === 'string' ? item : text(record(item).id));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function toolArguments(value: unknown): unknown {
  if (!isRecord(value)) return undefined;
  if ('arguments' in value) return value.arguments;
  const calls = value.tool_calls;
  if (!Array.isArray(calls) || !isRecord(calls[0])) return undefined;
  const call = calls[0];
  return isRecord(call.function) && 'arguments' in call.function ? call.function.arguments : call.arguments;
}

function capitalize(value: string): string {
  return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : '';
}

function memberId(value: string): string {
  const trimmed = value.trim();
  return MEMBER_ID.test(trimmed) ? trimmed : trimmed;
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
