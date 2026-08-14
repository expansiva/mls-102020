/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/contracts.ts" enhancement="_blank"/>

import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_ONTOLOGY_SCHEMA_VERSION = '2026-08-11-ns4-ontology-v6' as const;

export type Ns4EntityKind = 'core' | 'event' | 'supporting' | 'mdm' | 'projection' | 'valueObject';
export type Ns4EntityOwnership = 'moduleOwned' | 'external' | 'derived';
export type Ns4ConstraintSource = 'database' | 'journey' | 'user' | 'inferred' | 'legacyCode';
export type Ns4StorageTarget = 'mdm' | 'moduleDatabase' | 'derived' | 'external' | 'embedded';
export type Ns4StorageScope = 'organization' | 'module' | 'platform' | 'none';
export type Ns4RelationshipPersistenceMode = 'mdmRelationship' | 'moduleReference' | 'crossStoreReference'
  | 'derivedJoin' | 'externalReference' | 'embedded';
export type Ns4RelationshipRealizationKind = 'fieldReference' | 'fieldCollection' | 'mdmRelationship'
  | 'derived' | 'externalReference' | 'embedded';

export interface Ns4RelationshipEndpointBinding {
  entityId: string;
  fieldIds: string[];
}

/** Concrete implementation of one semantic edge using fields that already exist in E4 entities. */
export interface Ns4RelationshipRealization {
  kind: Ns4RelationshipRealizationKind;
  ownerEntity: string;
  from: Ns4RelationshipEndpointBinding;
  to: Ns4RelationshipEndpointBinding;
  description: string;
}

export interface Ns4FieldConstraint {
  constraintId: string;
  kind: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'enum' | 'format' | 'unique' | 'custom';
  value: string;
  description: string;
  source: Ns4ConstraintSource;
}

export interface Ns4OntologyField {
  fieldId: string;
  title: string;
  type: 'uuid' | 'string' | 'text' | 'number' | 'integer' | 'boolean' | 'money' | 'date' | 'datetime' | 'json';
  required: boolean;
  description: string;
  constraints: Ns4FieldConstraint[];
  /**
   * The literal values of an enumerated field, derived from its enum constraint (or from the entity
   * lifecycle for a status field). It is what turns a decision into a closed selector on the page
   * instead of a free text box; the constraint stays as the human-readable rule.
   */
  enum?: string[];
}

export interface Ns4LifecyclePredicate {
  predicateId: string;
  description: string;
  stateIds: string[];
  source: Ns4ConstraintSource;
}

export interface Ns4OntologyEntity {
  entityId: string;
  title: string;
  description: string;
  kind: Ns4EntityKind;
  ownership: Ns4EntityOwnership;
  sourceRefs: {
    journeyIds: string[];
    featureIds: string[];
    authorityRefs: string[];
  };
  fields: Ns4OntologyField[];
  lifecycleStates: string[];
  /** The lifecycle values as a literal union; mirrors lifecycleStates and is never a second truth. */
  statusEnum?: string[];
  initialState?: string;
  terminalStates?: string[];
  lifecyclePredicates: Ns4LifecyclePredicate[];
  useRules: string[];
  storage: {
    target: Ns4StorageTarget;
    scope: Ns4StorageScope;
    idField?: string;
    mdmType?: string;
    notes: string;
  };
}

export interface Ns4OntologyRelationship {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  required: boolean;
  description: string;
  persistence: { mode: Ns4RelationshipPersistenceMode };
  /** Absent only in the compact overview; mandatory before review and permanent emission. */
  realization?: Ns4RelationshipRealization;
}

export type Ns4ResolvedOntologyRelationship = Ns4OntologyRelationship & {
  realization: Ns4RelationshipRealization;
};

export type Ns4OntologyEntityPlan = Omit<Ns4OntologyEntity, 'fields' | 'useRules'>;

export interface Ns4E4PlanDraft {
  planId: 'e4-ontology-plan';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  solutionMode: 'new';
  businessDomain: string;
  entities: Ns4OntologyEntityPlan[];
  relationships: Ns4OntologyRelationship[];
  changeSummary: string[];
}

export interface Ns4E4EntityDraft {
  planId: 'e4-ontology-entity';
  moduleName: string;
  reviewRound: number;
  entityId: string;
  fields: Ns4OntologyField[];
  useRules: string[];
}

export interface Ns4E4RelationshipBinding {
  relationshipId: string;
  realization: Ns4RelationshipRealization;
}

export interface Ns4E4RelationshipBindingsDraft {
  planId: 'e4-relationship-bindings';
  moduleName: string;
  reviewRound: number;
  bindings: Ns4E4RelationshipBinding[];
}

export interface Ns4E4Review {
  planId: 'e4-ontology-review';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  solutionMode: 'new';
  businessDomain: string;
  entities: Ns4OntologyEntity[];
  relationships: Ns4OntologyRelationship[];
  changeSummary: string[];
}

export interface Ns4E4ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E4Review;
}

export interface Ns4OntologyEntityArtifactV5 extends Ns4OntologyEntity {
  schemaVersion: typeof NS4_ONTOLOGY_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  solutionMode: 'new';
  ontologyHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
}

/** Compile-only compatibility for already generated v3 L4 artifacts. */
export interface Ns4OntologyEntityArtifactV4 extends Omit<Ns4OntologyEntityArtifactV5, 'schemaVersion'> {
  schemaVersion: '2026-08-09-ns4-ontology-v4';
}

export interface Ns4OntologyEntityArtifactV3 extends Omit<Ns4OntologyEntityArtifactV5, 'schemaVersion' | 'useRules'> {
  schemaVersion: '2026-08-08-ns4-ontology-v3';
  invariants: Array<{ invariantId: string; description: string; source: Ns4ConstraintSource }>;
}

export type Ns4OntologyEntityArtifact = Ns4OntologyEntityArtifactV5 | Ns4OntologyEntityArtifactV4 | Ns4OntologyEntityArtifactV3;

interface Ns4OntologyIndexArtifactBase {
  moduleName: string;
  userLanguage: string;
  solutionMode: 'new';
  title: string;
  businessDomain: string;
  entities: Array<{
    entityId: string;
    title: string;
    kind: Ns4EntityKind;
    storage: Pick<Ns4OntologyEntity['storage'], 'target' | 'scope' | 'idField' | 'mdmType'>;
    definitionRef: string;
  }>;
  ontologyHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
  realization: { status: 'pending'; compiledFromOntologyHash: string };
}

export interface Ns4OntologyIndexArtifactV5 extends Ns4OntologyIndexArtifactBase {
  schemaVersion: typeof NS4_ONTOLOGY_SCHEMA_VERSION;
  relationships: Ns4ResolvedOntologyRelationship[];
}

/** Compile-only compatibility for already generated v3/v4 L4 artifacts. */
export interface Ns4OntologyIndexArtifactLegacy extends Ns4OntologyIndexArtifactBase {
  schemaVersion: '2026-08-09-ns4-ontology-v4' | '2026-08-08-ns4-ontology-v3';
  relationships: Ns4OntologyRelationship[];
}

export type Ns4OntologyIndexArtifact = Ns4OntologyIndexArtifactV5 | Ns4OntologyIndexArtifactLegacy;

export function normalizeNs4E4Review(value: unknown, fallbackModule = ''): Ns4E4Review {
  const root = record(value);
  const moduleName = text(root.moduleName) || fallbackModule;
  const entities = array(root.entities).map(item => normalizeEntity(item, moduleName));
  return {
    planId: 'e4-ontology-review',
    moduleName,
    userLanguage: text(root.userLanguage) || 'en',
    title: text(root.title) || 'Business ontology',
    reviewRound: positiveInteger(root.reviewRound, 1),
    solutionMode: 'new',
    businessDomain: text(root.businessDomain),
    entities,
    relationships: array(root.relationships).map(item => {
      const relationship = record(item);
      const fromEntity = text(relationship.fromEntity) || text(relationship.sourceEntity) || text(relationship.from);
      const toEntity = text(relationship.toEntity) || text(relationship.targetEntity) || text(relationship.to);
      const realization = normalizeRelationshipRealization(relationship.realization, fromEntity, toEntity);
      return {
        relationshipId: text(relationship.relationshipId),
        fromEntity,
        toEntity,
        type: relationshipType(relationship.type),
        required: relationship.required === true,
        description: text(relationship.description),
        persistence: { mode: relationshipPersistenceMode(entities, fromEntity, toEntity) },
        ...(realization ? { realization } : {}),
      };
    }),
    changeSummary: strings(root.changeSummary),
  };
}

export function normalizeNs4E4PlanDraft(value: unknown, fallbackModule = ''): Ns4E4PlanDraft {
  const root = record(value);
  const moduleName = text(root.moduleName) || fallbackModule;
  const full = normalizeNs4E4Review({
    ...root,
    moduleName,
    entities: array(root.entities).map(item => ({ ...record(item), fields: [], useRules: [] })),
  }, moduleName);
  return {
    planId: 'e4-ontology-plan',
    moduleName,
    userLanguage: full.userLanguage,
    title: full.title,
    reviewRound: full.reviewRound,
    solutionMode: 'new',
    businessDomain: full.businessDomain,
    entities: full.entities.map(({ fields, useRules, ...entity }) => entity),
    relationships: full.relationships,
    changeSummary: full.changeSummary,
  };
}

export function normalizeNs4E4EntityDraft(
  value: unknown,
  moduleName: string,
  reviewRound: number,
  entityId: string,
): Ns4E4EntityDraft {
  const root = record(value);
  const normalized = normalizeEntity({
    entityId,
    fields: root.fields,
    useRules: root.useRules,
  }, moduleName);
  return {
    planId: 'e4-ontology-entity',
    moduleName,
    reviewRound,
    entityId,
    // The worker tool schema is strict and owns no union key: the entity draft is the worker's own
    // contract, so the derived union is stripped back out here and lives only in the review artifact.
    fields: stripNs4DerivedFieldUnions(normalized.fields),
    useRules: normalized.useRules,
  };
}

/**
 * Removes the derived literal union from fields before they are echoed back to an entity worker.
 * The union is a projection E4 adds for the consumers; the worker's strict tool schema forbids the
 * key, so showing it in a prompt would invite an invalid repair answer.
 */
export function stripNs4DerivedFieldUnions<T extends { fields?: unknown }>(value: T): T;
export function stripNs4DerivedFieldUnions(value: Ns4OntologyField[]): Ns4OntologyField[];
export function stripNs4DerivedFieldUnions(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => {
      const { enum: _union, ...field } = record(item);
      return field;
    });
  }
  const source = record(value);
  if (!Array.isArray(source.fields)) return value;
  const { statusEnum: _states, ...entity } = source;
  return { ...entity, fields: stripNs4DerivedFieldUnions(source.fields as Ns4OntologyField[]) };
}

export function assembleNs4E4Review(
  plan: Ns4E4PlanDraft,
  details: Ns4E4EntityDraft[],
): Ns4E4Review {
  const byEntity = new Map(details.map(detail => [detail.entityId, detail]));
  return normalizeNs4E4Review({
    ...plan,
    planId: 'e4-ontology-review',
    entities: plan.entities.map(entity => ({
      ...entity,
      fields: byEntity.get(entity.entityId)?.fields || [],
      useRules: byEntity.get(entity.entityId)?.useRules || [],
    })),
  }, plan.moduleName);
}

export function normalizeNs4E4RelationshipBindings(
  value: unknown,
  moduleName: string,
  reviewRound: number,
): Ns4E4RelationshipBindingsDraft {
  const root = record(value);
  return {
    planId: 'e4-relationship-bindings',
    moduleName: text(root.moduleName) || moduleName,
    reviewRound: positiveInteger(root.reviewRound, reviewRound),
    bindings: array(root.bindings).map(item => {
      const binding = record(item);
      return {
        relationshipId: text(binding.relationshipId),
        realization: normalizeRelationshipRealization(binding.realization, '', '') || {
          kind: 'derived', ownerEntity: '',
          from: { entityId: '', fieldIds: [] }, to: { entityId: '', fieldIds: [] }, description: '',
        },
      };
    }),
  };
}

export function applyNs4E4RelationshipBindings(
  review: Ns4E4Review,
  draft: Ns4E4RelationshipBindingsDraft,
): Ns4E4Review {
  const bindings = new Map(draft.bindings.map(binding => [binding.relationshipId, binding.realization]));
  return normalizeNs4E4Review({
    ...review,
    relationships: review.relationships.map(relationship => ({
      ...relationship,
      ...(bindings.has(relationship.relationshipId) ? { realization: bindings.get(relationship.relationshipId) } : {}),
    })),
  }, review.moduleName);
}

export async function buildNs4OntologyArtifacts(
  review: Ns4E4Review,
  approvedBy: 'human' | 'auto',
  approvedAt: string,
): Promise<{ entities: Ns4OntologyEntityArtifactV5[]; index: Ns4OntologyIndexArtifactV5 }> {
  const relationships = requireResolvedRelationships(review.relationships);
  const ontologyHash = await sha256Ns4({
    solutionMode: review.solutionMode,
    businessDomain: review.businessDomain,
    entities: review.entities,
    relationships,
  });
  const entities = review.entities.map(entity => ({
    schemaVersion: NS4_ONTOLOGY_SCHEMA_VERSION,
    moduleName: review.moduleName,
    userLanguage: review.userLanguage,
    solutionMode: review.solutionMode,
    ...entity,
    ontologyHash,
    approvedBy,
    approvedAt,
  }));
  return {
    entities,
    index: {
      schemaVersion: NS4_ONTOLOGY_SCHEMA_VERSION,
      moduleName: review.moduleName,
      userLanguage: review.userLanguage,
      solutionMode: review.solutionMode,
      title: review.title,
      businessDomain: review.businessDomain,
      entities: review.entities.map(entity => ({
        entityId: entity.entityId,
        title: entity.title,
        kind: entity.kind,
        storage: {
          target: entity.storage.target,
          scope: entity.storage.scope,
          ...(entity.storage.idField ? { idField: entity.storage.idField } : {}),
          ...(entity.storage.mdmType ? { mdmType: entity.storage.mdmType } : {}),
        },
        definitionRef: `l4/${review.moduleName}/ontology/${entity.entityId}.defs.ts`,
      })),
      relationships,
      ontologyHash,
      approvedBy,
      approvedAt,
      realization: { status: 'pending', compiledFromOntologyHash: ontologyHash },
    },
  };
}

function requireResolvedRelationships(relationships: Ns4OntologyRelationship[]): Ns4ResolvedOntologyRelationship[] {
  return relationships.map(relationship => {
    if (!relationship.realization) {
      throw new Error(`Relationship ${relationship.relationshipId || '<unknown>'} has no field realization.`);
    }
    return { ...relationship, realization: relationship.realization };
  });
}

/** A status field is the one the lifecycle names; the suffix is the only stable structural marker. */
function isStatusFieldId(fieldId: string): boolean {
  return /(^|[a-z0-9])status$/i.test(fieldId);
}

/**
 * Reads the literal values out of an enum constraint. The constraint value is authored as free text,
 * so the three shapes the generators actually produce are all accepted: a JSON array, a
 * comma-separated list and a pipe-separated list. Anything else yields no values, and the field
 * simply stays without a union.
 */
function enumValues(constraints: Ns4FieldConstraint[]): string[] {
  const raw = constraints.find(constraint => constraint.kind === 'enum')?.value || '';
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return unique(parsed.map(item => text(item)));
    } catch { /* not JSON: fall through to the separated forms */ }
  }
  const separator = trimmed.includes('|') ? '|' : ',';
  return unique(trimmed.replace(/^[[(]|[\])]$/g, '').split(separator).map(item => text(item).replace(/^['"]|['"]$/g, '')));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeEntity(value: unknown, moduleName: string): Ns4OntologyEntity {
  const entity = record(value);
  const sourceRefs = record(entity.sourceRefs);
  const storage = record(entity.storage);
  const entityId = text(entity.entityId);
  const kind = entityKind(entity.kind);
  const entityOwnership = ownership(entity.ownership);
  const lifecycleStates = strings(entity.lifecycleStates);
  const fields = array(entity.fields).map(item => {
    const field = record(item);
    const fieldId = text(field.fieldId);
    const constraints = array(field.constraints).map(constraintValue => {
      const constraint = record(constraintValue);
      return {
        constraintId: text(constraint.constraintId),
        kind: constraintKind(constraint.kind),
        value: text(constraint.value),
        description: text(constraint.description),
        source: constraintSource(constraint.source),
      };
    });
    const declared = enumValues(constraints);
    const values = declared.length ? declared : (isStatusFieldId(fieldId) ? lifecycleStates : []);
    return {
      fieldId,
      title: text(field.title),
      type: fieldType(field.type),
      required: field.required === true,
      description: text(field.description),
      constraints,
      ...(values.length ? { enum: values } : {}),
    };
  });
  const target = storageTarget(storage.target, kind, entityOwnership);
  const idField = text(storage.idField)
    || fields.find(field => field.required && /Id$/.test(field.fieldId))?.fieldId
    || '';
  return {
    entityId,
    title: text(entity.title),
    description: text(entity.description),
    kind,
    ownership: entityOwnership,
    sourceRefs: {
      journeyIds: strings(sourceRefs.journeyIds),
      featureIds: strings(sourceRefs.featureIds),
      authorityRefs: strings(sourceRefs.authorityRefs),
    },
    fields,
    lifecycleStates,
    ...(lifecycleStates.length ? { statusEnum: lifecycleStates } : {}),
    ...(text(entity.initialState) ? { initialState: text(entity.initialState) } : {}),
    ...(strings(entity.terminalStates).length ? { terminalStates: strings(entity.terminalStates) } : {}),
    lifecyclePredicates: array(entity.lifecyclePredicates).map(item => {
      const predicate = record(item);
      return {
        predicateId: text(predicate.predicateId),
        description: text(predicate.description),
        stateIds: strings(predicate.stateIds),
        source: constraintSource(predicate.source),
      };
    }),
    useRules: strings(entity.useRules),
    storage: {
      target,
      scope: storageScope(storage.scope, target),
      ...(idField && (target === 'mdm' || target === 'moduleDatabase') ? { idField } : {}),
      ...(target === 'mdm' ? { mdmType: text(storage.mdmType) || `${moduleName}.${entityId}` } : {}),
      notes: text(storage.notes),
    },
  };
}

function storageTarget(value: unknown, kind: Ns4EntityKind, entityOwnership: Ns4EntityOwnership): Ns4StorageTarget {
  if (value === 'mdm' || value === 'moduleDatabase' || value === 'derived'
    || value === 'external' || value === 'embedded') return value;
  if (entityOwnership === 'external') return 'external';
  if (kind === 'mdm') return 'mdm';
  if (kind === 'projection') return 'derived';
  if (kind === 'valueObject') return 'embedded';
  return 'moduleDatabase';
}

function storageScope(value: unknown, target: Ns4StorageTarget): Ns4StorageScope {
  if (value === 'organization' || value === 'module' || value === 'platform' || value === 'none') return value;
  if (target === 'mdm') return 'organization';
  if (target === 'moduleDatabase') return 'module';
  if (target === 'external') return 'platform';
  return 'none';
}

function entityKind(value: unknown): Ns4EntityKind {
  if (value === 'event' || value === 'supporting' || value === 'mdm' || value === 'projection' || value === 'valueObject') return value;
  return 'core';
}

function ownership(value: unknown): Ns4EntityOwnership {
  if (value === 'external' || value === 'derived') return value;
  return 'moduleOwned';
}

function fieldType(value: unknown): Ns4OntologyField['type'] {
  if (value === 'uuid' || value === 'text' || value === 'number' || value === 'integer' || value === 'boolean'
    || value === 'money' || value === 'date' || value === 'datetime' || value === 'json') return value;
  return 'string';
}

function constraintKind(value: unknown): Ns4FieldConstraint['kind'] {
  if (value === 'min' || value === 'max' || value === 'minLength' || value === 'maxLength'
    || value === 'pattern' || value === 'enum' || value === 'format' || value === 'unique') return value;
  return 'custom';
}

function constraintSource(value: unknown): Ns4ConstraintSource {
  if (value === 'database' || value === 'journey' || value === 'user' || value === 'legacyCode') return value;
  return 'inferred';
}

function relationshipType(value: unknown): Ns4OntologyRelationship['type'] {
  if (value === 'oneToOne' || value === 'manyToOne' || value === 'manyToMany') return value;
  return 'oneToMany';
}

function relationshipPersistenceMode(
  entities: Ns4OntologyEntity[],
  fromEntity: string,
  toEntity: string,
): Ns4RelationshipPersistenceMode {
  const from = entities.find(entity => entity.entityId === fromEntity)?.storage.target;
  const to = entities.find(entity => entity.entityId === toEntity)?.storage.target;
  if (from === 'embedded' || to === 'embedded') return 'embedded';
  if (from === 'external' || to === 'external') return 'externalReference';
  if (from === 'derived' || to === 'derived') return 'derivedJoin';
  if (from === 'mdm' && to === 'mdm') return 'mdmRelationship';
  if ((from === 'mdm' && to === 'moduleDatabase') || (from === 'moduleDatabase' && to === 'mdm')) {
    return 'crossStoreReference';
  }
  return 'moduleReference';
}

function normalizeRelationshipRealization(
  value: unknown,
  fallbackFromEntity: string,
  fallbackToEntity: string,
): Ns4RelationshipRealization | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const realization = record(value);
  const from = record(realization.from);
  const to = record(realization.to);
  return {
    kind: relationshipRealizationKind(realization.kind),
    ownerEntity: text(realization.ownerEntity),
    from: { entityId: text(from.entityId) || fallbackFromEntity, fieldIds: strings(from.fieldIds) },
    to: { entityId: text(to.entityId) || fallbackToEntity, fieldIds: strings(to.fieldIds) },
    description: text(realization.description),
  };
}

function relationshipRealizationKind(value: unknown): Ns4RelationshipRealizationKind {
  if (value === 'fieldCollection' || value === 'mdmRelationship' || value === 'derived'
    || value === 'externalReference' || value === 'embedded') return value;
  return 'fieldReference';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
