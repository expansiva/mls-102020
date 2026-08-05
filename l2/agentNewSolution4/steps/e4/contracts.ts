/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/contracts.ts" enhancement="_blank"/>

import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_ONTOLOGY_SCHEMA_VERSION = '2026-08-05-ns4-ontology-v1' as const;

export type Ns4EntityKind = 'core' | 'event' | 'supporting' | 'mdm' | 'projection' | 'valueObject';
export type Ns4EntityOwnership = 'moduleOwned' | 'external' | 'derived';
export type Ns4ConstraintSource = 'database' | 'journey' | 'user' | 'inferred' | 'legacyCode';

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
}

export interface Ns4EntityInvariant {
  invariantId: string;
  description: string;
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
  invariants: Ns4EntityInvariant[];
  storage: {
    mode: 'new';
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
  action: 'approve' | 'requestChanges';
  adjustment: string;
  review: Ns4E4Review;
}

export interface Ns4OntologyEntityArtifact extends Ns4OntologyEntity {
  schemaVersion: typeof NS4_ONTOLOGY_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  solutionMode: 'new';
  ontologyHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
}

export interface Ns4OntologyIndexArtifact {
  schemaVersion: typeof NS4_ONTOLOGY_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  solutionMode: 'new';
  title: string;
  businessDomain: string;
  entities: Array<{ entityId: string; title: string; kind: Ns4EntityKind; definitionRef: string }>;
  relationships: Ns4OntologyRelationship[];
  ontologyHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
  realization: { status: 'pending'; compiledFromOntologyHash: string };
}

export function normalizeNs4E4Review(value: unknown, fallbackModule = ''): Ns4E4Review {
  const root = record(value);
  return {
    planId: 'e4-ontology-review',
    moduleName: text(root.moduleName) || fallbackModule,
    userLanguage: text(root.userLanguage) || 'en',
    title: text(root.title) || 'Business ontology',
    reviewRound: positiveInteger(root.reviewRound, 1),
    solutionMode: 'new',
    businessDomain: text(root.businessDomain),
    entities: array(root.entities).map(item => normalizeEntity(item)),
    relationships: array(root.relationships).map(item => {
      const relationship = record(item);
      return {
        relationshipId: text(relationship.relationshipId),
        fromEntity: text(relationship.fromEntity) || text(relationship.sourceEntity) || text(relationship.from),
        toEntity: text(relationship.toEntity) || text(relationship.targetEntity) || text(relationship.to),
        type: relationshipType(relationship.type),
        required: relationship.required === true,
        description: text(relationship.description),
      };
    }),
    changeSummary: strings(root.changeSummary),
  };
}

export async function buildNs4OntologyArtifacts(
  review: Ns4E4Review,
  approvedBy: 'human' | 'auto',
  approvedAt: string,
): Promise<{ entities: Ns4OntologyEntityArtifact[]; index: Ns4OntologyIndexArtifact }> {
  const ontologyHash = await sha256Ns4({
    solutionMode: review.solutionMode,
    businessDomain: review.businessDomain,
    entities: review.entities,
    relationships: review.relationships,
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
        definitionRef: `l4/${review.moduleName}/ontology/${entity.entityId}.defs.ts`,
      })),
      relationships: review.relationships,
      ontologyHash,
      approvedBy,
      approvedAt,
      realization: { status: 'pending', compiledFromOntologyHash: ontologyHash },
    },
  };
}

function normalizeEntity(value: unknown): Ns4OntologyEntity {
  const entity = record(value);
  const sourceRefs = record(entity.sourceRefs);
  const storage = record(entity.storage);
  return {
    entityId: text(entity.entityId),
    title: text(entity.title),
    description: text(entity.description),
    kind: entityKind(entity.kind),
    ownership: ownership(entity.ownership),
    sourceRefs: {
      journeyIds: strings(sourceRefs.journeyIds),
      featureIds: strings(sourceRefs.featureIds),
      authorityRefs: strings(sourceRefs.authorityRefs),
    },
    fields: array(entity.fields).map(item => {
      const field = record(item);
      return {
        fieldId: text(field.fieldId),
        title: text(field.title),
        type: fieldType(field.type),
        required: field.required === true,
        description: text(field.description),
        constraints: array(field.constraints).map(constraintValue => {
          const constraint = record(constraintValue);
          return {
            constraintId: text(constraint.constraintId),
            kind: constraintKind(constraint.kind),
            value: text(constraint.value),
            description: text(constraint.description),
            source: constraintSource(constraint.source),
          };
        }),
      };
    }),
    lifecycleStates: strings(entity.lifecycleStates),
    invariants: array(entity.invariants).map(item => {
      const invariant = record(item);
      return {
        invariantId: text(invariant.invariantId),
        description: text(invariant.description),
        source: constraintSource(invariant.source),
      };
    }),
    storage: { mode: 'new', notes: text(storage.notes) },
  };
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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
