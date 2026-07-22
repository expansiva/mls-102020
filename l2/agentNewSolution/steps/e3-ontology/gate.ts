/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3-ontology/gate.ts" enhancement="_blank"/>

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';

// isRecord is LOCAL (not imported from nsFs) so this gate stays node-safe / unit-testable — nsFs pulls the
// libStor → libCommom (DOM) chain, which crashes under node:test. Same reason the e5 gate keeps it local.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const E3_MODEL_SCHEMA_VERSION = '2026-07-07-ns-e3-v1';

export const NS_ENTITY_KINDS = ['core', 'supporting', 'event', 'metric', 'mdm'] as const;
export const NS_OWNERSHIPS = ['moduleOwned', 'mdmOwned', 'horizontalOwned', 'pluginOwned', 'existingModuleOwned', 'external'] as const;
export const NS_SCALAR_FIELD_TYPES = ['uuid', 'string', 'text', 'number', 'money', 'boolean', 'date', 'datetime'] as const;
export const NS_RELATIONSHIP_TYPES = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany', 'partOf'] as const;

export type NsEntityKind = typeof NS_ENTITY_KINDS[number];
export type NsOwnership = typeof NS_OWNERSHIPS[number];
export type NsRelationshipType = typeof NS_RELATIONSHIP_TYPES[number];

export interface NsE3ModuleBlock {
  title: string;
  purpose: string;
  businessDomain: string;
  languages: string[];
  visualStyle: string;
}

export interface NsE3ModelEntity {
  entityId: string;
  title: string;
  description: string;
  kind: NsEntityKind;
  ownership: NsOwnership;
  statusEnum?: string[];
  lifecycleStates?: string[];
  sourceRefs?: { journeyIds?: string[]; featureIds?: string[] };
}

export interface NsE3Relationship {
  relationshipId: string;
  fromEntity: string;
  toEntity: string;
  type: NsRelationshipType;
  description: string;
}

export interface NsE3ModelArtifact {
  schemaVersion: typeof E3_MODEL_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  version: number;
  createdAt: string;
  module: NsE3ModuleBlock;
  entities: NsE3ModelEntity[];
  relationships: NsE3Relationship[];
}

export interface NsE3Field {
  fieldId: string;
  type: string;
  required: boolean;
  description: string;
  enum?: string[];
}

export interface NsE3EntityArtifact {
  entityId: string;
  title: string;
  description: string;
  kind: NsEntityKind;
  ownership: NsOwnership;
  fields: NsE3Field[];
  statusEnum?: string[];
  lifecycleStates?: string[];
  eventPolicy?: { purpose: 'telemetry' | 'audit' | 'reaction'; retentionDays?: number };
  rulesApplied?: string[];
}

export interface E3ModelGateContext {
  moduleName: string;
  userLanguage: string;
  e2FeatureIds: string[];
  e2JourneyIds: string[];
  e2NonNeverFeatureIds: string[];
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

export function prepareE3ModelArtifact(input: unknown, context: Pick<E3ModelGateContext, 'moduleName' | 'userLanguage'>): NsE3ModelArtifact {
  const record = isRecord(input) ? input : {};
  const entities = Array.isArray(record.entities) ? record.entities.filter(isRecord) : [];
  const relationships = Array.isArray(record.relationships) ? record.relationships.filter(isRecord) : [];
  const moduleBlock = isRecord(record.module) ? record.module : {};
  return {
    schemaVersion: E3_MODEL_SCHEMA_VERSION,
    moduleName: readString(record.moduleName) || context.moduleName,
    userLanguage: readString(record.userLanguage) || context.userLanguage,
    version: typeof record.version === 'number' ? record.version : 1,
    createdAt: new Date().toISOString(),
    module: {
      title: readString(moduleBlock.title) || '',
      purpose: readString(moduleBlock.purpose) || '',
      businessDomain: readString(moduleBlock.businessDomain) || '',
      languages: readStringArray(moduleBlock.languages),
      visualStyle: readString(moduleBlock.visualStyle) || '',
    },
    entities: entities.map(entity => ({
      entityId: toPascalCase(readString(entity.entityId) || ''),
      title: readString(entity.title) || '',
      description: readString(entity.description) || '',
      kind: readEnum(entity.kind, NS_ENTITY_KINDS, 'core'),
      ownership: readEnum(entity.ownership, NS_OWNERSHIPS, 'moduleOwned'),
      ...(readStringArray(entity.statusEnum).length ? { statusEnum: readStringArray(entity.statusEnum) } : {}),
      ...(readStringArray(entity.lifecycleStates).length ? { lifecycleStates: readStringArray(entity.lifecycleStates) } : {}),
      ...(isRecord(entity.sourceRefs) ? {
        sourceRefs: {
          journeyIds: readStringArray(entity.sourceRefs.journeyIds),
          featureIds: readStringArray(entity.sourceRefs.featureIds),
        },
      } : {}),
    })),
    relationships: relationships.map(rel => ({
      relationshipId: readString(rel.relationshipId) || '',
      fromEntity: toPascalCase(readString(rel.fromEntity) || ''),
      toEntity: toPascalCase(readString(rel.toEntity) || ''),
      type: readEnum(rel.type, NS_RELATIONSHIP_TYPES, 'manyToOne'),
      description: readString(rel.description) || '',
    })),
  };
}

export function prepareE3EntityArtifact(input: unknown): NsE3EntityArtifact {
  const record = isRecord(input) ? input : {};
  const fields = Array.isArray(record.fields) ? record.fields.filter(isRecord) : [];
  return {
    entityId: toPascalCase(readString(record.entityId) || ''),
    title: readString(record.title) || '',
    description: readString(record.description) || '',
    kind: readEnum(record.kind, NS_ENTITY_KINDS, 'core'),
    ownership: readEnum(record.ownership, NS_OWNERSHIPS, 'moduleOwned'),
    fields: fields.map(field => ({
      fieldId: readString(field.fieldId) || '',
      type: readString(field.type) || '',
      required: field.required === true,
      description: readString(field.description) || '',
      ...(readStringArray(field.enum).length ? { enum: readStringArray(field.enum) } : {}),
    })),
    ...(readStringArray(record.statusEnum).length ? { statusEnum: readStringArray(record.statusEnum) } : {}),
    ...(readStringArray(record.lifecycleStates).length ? { lifecycleStates: readStringArray(record.lifecycleStates) } : {}),
    ...(isRecord(record.eventPolicy) && readString(record.eventPolicy.purpose) ? {
      eventPolicy: {
        purpose: readEnum(record.eventPolicy.purpose, ['telemetry', 'audit', 'reaction'] as const, 'audit'),
        ...(typeof record.eventPolicy.retentionDays === 'number' ? { retentionDays: record.eventPolicy.retentionDays } : {}),
      },
    } : {}),
    ...(readStringArray(record.rulesApplied).length ? { rulesApplied: readStringArray(record.rulesApplied) } : {}),
  };
}

// ---------------------------------------------------------------------------
// invariants
// ---------------------------------------------------------------------------

export function validateE3ModelInvariants(
  artifact: NsE3ModelArtifact,
  context: E3ModelGateContext,
): { artifact: NsE3ModelArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const entityIds = new Set<string>();

  if (artifact.moduleName !== context.moduleName) {
    issues.push(errorIssue('model.moduleName.mismatch', `moduleName must be "${context.moduleName}", got "${artifact.moduleName}"`));
  }

  for (const entity of artifact.entities) {
    if (entityIds.has(entity.entityId)) {
      issues.push(errorIssue('entity.id.duplicate', `duplicated entityId ${entity.entityId}`));
    }
    entityIds.add(entity.entityId);
    // Anti use-case guard (v2 heritage): the ontology holds DATA NOUNS only.
    if (/^(uc|usecase)/i.test(entity.entityId)) {
      issues.push(errorIssue('entity.id.usecase', `entity ${entity.entityId} looks like a use case; ontology must contain data nouns only`, entity.entityId));
    }
    // Entity ids are PascalCase nouns; a verb-first id (ManageMenu, CreateOrder) is a use-case leak. The
    // verbs must be Capitalized to match PascalCase, with an uppercase boundary so real nouns pass
    // (Management/Viewer are NOT flagged; ManageMenu is). Case-sensitive on purpose — the boundary matters.
    if (/^(Create|Update|Delete|Manage|View|Browse|Generate|Record|Process|Send|Close|Open)[A-Z]/.test(entity.entityId)) {
      issues.push(errorIssue('entity.id.verb', `entity ${entity.entityId} starts with a verb; ontology must contain data nouns only`, entity.entityId));
    }
    if (entity.statusEnum?.length && entity.lifecycleStates?.length && !sameStringSet(entity.statusEnum, entity.lifecycleStates)) {
      issues.push(warningIssue('entity.lifecycle.mismatch', `entity ${entity.entityId}: statusEnum and lifecycleStates differ`, entity.entityId));
    }
    if (entity.kind === 'event' && entity.statusEnum && entity.statusEnum.length > 3) {
      issues.push(warningIssue('entity.event.status', `event entity ${entity.entityId} has a rich statusEnum; events are usually append-only (posted/voided)`, entity.entityId));
    }
    for (const journeyId of entity.sourceRefs?.journeyIds || []) {
      if (!context.e2JourneyIds.includes(journeyId)) {
        issues.push(errorIssue('entity.sourceRef.journey.unknown', `entity ${entity.entityId} references unknown journey ${journeyId}`, entity.entityId));
      }
    }
    for (const featureId of entity.sourceRefs?.featureIds || []) {
      if (!context.e2FeatureIds.includes(featureId)) {
        issues.push(errorIssue('entity.sourceRef.feature.unknown', `entity ${entity.entityId} references unknown feature ${featureId}`, entity.entityId));
      }
    }
  }

  const relationshipIds = new Set<string>();
  for (const rel of artifact.relationships) {
    if (relationshipIds.has(rel.relationshipId)) {
      issues.push(errorIssue('relationship.id.duplicate', `duplicated relationshipId ${rel.relationshipId}`));
    }
    relationshipIds.add(rel.relationshipId);
    if (!entityIds.has(rel.fromEntity)) {
      issues.push(errorIssue('relationship.entity.unknown', `relationship ${rel.relationshipId}: fromEntity ${rel.fromEntity} is not a declared entity`, rel.relationshipId));
    }
    if (!entityIds.has(rel.toEntity)) {
      issues.push(errorIssue('relationship.entity.unknown', `relationship ${rel.relationshipId}: toEntity ${rel.toEntity} is not a declared entity`, rel.relationshipId));
    }
  }

  const coveredFeatures = new Set(artifact.entities.flatMap(entity => entity.sourceRefs?.featureIds || []));
  for (const featureId of context.e2NonNeverFeatureIds) {
    if (!coveredFeatures.has(featureId)) {
      issues.push(warningIssue('feature.uncovered', `no entity declares sourceRefs.featureIds containing "${featureId}"`, featureId));
    }
  }

  return { artifact, issues };
}

export interface E3EntityGateContext {
  model: NsE3ModelArtifact;
}

export function validateE3EntityInvariants(
  entity: NsE3EntityArtifact,
  context: E3EntityGateContext,
): { artifact: NsE3EntityArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const modelEntity = context.model.entities.find(item => item.entityId === entity.entityId);
  const knownEntityIds = new Set(context.model.entities.map(item => item.entityId));

  if (!modelEntity) {
    issues.push(errorIssue('entity.unknown', `entity ${entity.entityId} is not part of e3-model.json`));
    return { artifact: entity, issues };
  }
  if (entity.kind !== modelEntity.kind) {
    issues.push(errorIssue('entity.kind.mismatch', `entity ${entity.entityId}: kind ${entity.kind} differs from the model (${modelEntity.kind})`));
  }
  if (entity.ownership !== modelEntity.ownership) {
    issues.push(errorIssue('entity.ownership.mismatch', `entity ${entity.entityId}: ownership ${entity.ownership} differs from the model (${modelEntity.ownership})`));
  }

  const fieldIds = new Set<string>();
  for (const field of entity.fields) {
    if (fieldIds.has(field.fieldId)) {
      issues.push(errorIssue('field.id.duplicate', `entity ${entity.entityId}: duplicated fieldId ${field.fieldId}`, field.fieldId));
    }
    fieldIds.add(field.fieldId);
    const isScalar = (NS_SCALAR_FIELD_TYPES as readonly string[]).includes(field.type);
    if (!isScalar && !knownEntityIds.has(field.type)) {
      issues.push(errorIssue('field.type.invalid', `entity ${entity.entityId}: field ${field.fieldId} type "${field.type}" is neither a scalar (${NS_SCALAR_FIELD_TYPES.join('|')}) nor a declared entity`, field.fieldId));
    }
    if (field.enum && field.type !== 'string') {
      issues.push(errorIssue('field.enum.type', `entity ${entity.entityId}: field ${field.fieldId} declares enum but type is ${field.type} (must be string)`, field.fieldId));
    }
    for (const value of field.enum || []) {
      if (looksNonEnglishValue(value)) {
        issues.push(warningIssue('field.enum.language', `entity ${entity.entityId}: enum value "${value}" on ${field.fieldId} does not look like English lower camelCase`, field.fieldId));
      }
    }
  }

  const primaryId = `${lowerFirst(entity.entityId)}Id`;
  if (!fieldIds.has(primaryId)) {
    issues.push(errorIssue('field.primaryId.missing', `entity ${entity.entityId}: missing primary id field "${primaryId}" (type uuid, required)`));
  }
  if (entity.kind !== 'metric') {
    if (!fieldIds.has('createdAt')) issues.push(warningIssue('field.audit.missing', `entity ${entity.entityId}: missing createdAt audit field`));
    if (entity.kind !== 'event' && !fieldIds.has('updatedAt')) issues.push(warningIssue('field.audit.missing', `entity ${entity.entityId}: missing updatedAt audit field`));
  }

  const statusEnum = entity.statusEnum || modelEntity.statusEnum || [];
  if (statusEnum.length > 0) {
    const statusField = entity.fields.find(field => field.fieldId === 'status');
    if (!statusField) {
      issues.push(errorIssue('field.status.missing', `entity ${entity.entityId}: statusEnum declared but there is no "status" field`));
    } else if (!statusField.enum || !sameStringSet(statusField.enum, statusEnum)) {
      issues.push(errorIssue('field.status.enum.mismatch', `entity ${entity.entityId}: "status" field enum must match statusEnum [${statusEnum.join(', ')}]`));
    }
  }
  if (entity.kind === 'event' && !entity.eventPolicy) {
    issues.push(warningIssue('entity.eventPolicy.missing', `event entity ${entity.entityId}: eventPolicy (purpose/retentionDays) is recommended`));
  }

  return { artifact: entity, issues };
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

export function renderE3OntologyMarkdown(
  model: NsE3ModelArtifact,
  entities: NsE3EntityArtifact[],
  options: { generatedAt?: string } = {},
): string {
  const lines: string[] = [];
  lines.push(`# E3 — Ontology: ${model.module.title || model.moduleName}`);
  lines.push('');
  lines.push(`- module: \`${model.moduleName}\``);
  lines.push(`- domain: ${model.module.businessDomain}`);
  lines.push(`- entities: ${entities.length} / relationships: ${model.relationships.length}`);
  if (options.generatedAt) lines.push(`- generatedAt: ${options.generatedAt}`);
  lines.push('');
  lines.push('## Entities');
  lines.push('');
  for (const entity of entities) {
    const status = entity.statusEnum?.length ? ` — status: ${entity.statusEnum.join(' → ')}` : '';
    lines.push(`### ${entity.entityId} (${entity.kind}, ${entity.ownership})${status}`);
    lines.push('');
    lines.push(entity.description);
    lines.push('');
    for (const field of entity.fields) {
      const flags = [field.required ? 'required' : 'optional', field.enum ? `enum: ${field.enum.join('|')}` : ''].filter(Boolean).join(', ');
      lines.push(`- \`${field.fieldId}\` (${field.type}; ${flags}) — ${field.description}`);
    }
    lines.push('');
  }
  lines.push('## Relationships');
  lines.push('');
  for (const rel of model.relationships) {
    lines.push(`- \`${rel.relationshipId}\`: ${rel.fromEntity} ${rel.type} ${rel.toEntity} — ${rel.description}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// small utils (exported for tests and sibling steps)
// ---------------------------------------------------------------------------

export function toPascalCase(value: string): string {
  const clean = value.trim();
  if (!clean) return clean;
  return `${clean.slice(0, 1).toUpperCase()}${clean.slice(1)}`.replace(/[^A-Za-z0-9]/g, '');
}

export function lowerFirst(value: string): string {
  return value ? `${value.slice(0, 1).toLowerCase()}${value.slice(1)}` : value;
}

// Heuristic guard for the values-are-code-identifiers convention (enums/units are English
// camelCase regardless of userLanguage; only titles/descriptions are localized). It cannot prove
// a value is English: the non-ASCII check catches any accented language (unité, açúcar, café) and
// the word list holds LOCALIZED VALUES ALREADY SEEN IN RUNS (currently pt-BR — extend it when a
// run in another language leaks values). Warning-level by design; the prompt is the real defense.
const NON_ENGLISH_VALUE_WORDS = new Set([
  'unidade', 'porcao', 'litro', 'caixa', 'pacote', 'aberto', 'fechado', 'pendente',
  'pronto', 'entregue', 'cancelado', 'ativo', 'inativo', 'mesa', 'retirada',
]);

export function looksNonEnglishValue(value: string): boolean {
  if (/[^\x00-\x7F]/.test(value)) return true;
  return NON_ENGLISH_VALUE_WORDS.has(value.toLowerCase());
}

export function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every(item => setB.has(item));
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => readString(item)).filter((item): item is string => !!item)
    : [];
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}
