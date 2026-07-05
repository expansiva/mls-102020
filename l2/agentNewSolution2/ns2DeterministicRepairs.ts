/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2DeterministicRepairs.ts" enhancement="_blank"/>

import { isRuntimeAnchorOriginRef } from '/_102020_/l2/agentNewSolution2/ns2MdmModeling.js';

export interface RepairableEntityDefinition {
  entityId: string;
  ownership?: string;
  kind?: string;
  moduleType?: string;
  anchor?: {
    entityId?: string;
    source?: string;
    originRef?: string;
    relationshipType?: string;
    description?: string;
  };
}

export interface RepairableOperationInput {
  inputId: string;
  fieldRef: string;
  required: boolean;
  source: string;
  description: string;
}

export interface RepairableOperationContextResolution {
  inputId?: string;
  targetRef: string;
  source: string;
  originRef: string;
  description: string;
}

export interface RepairableOperationDefinition {
  entity: string;
  kind: string;
  reads?: string[];
  writes: string[];
  inputs: RepairableOperationInput[];
  contextResolution?: RepairableOperationContextResolution[];
}

export interface RepairableDomainPlan {
  ontology: { entities: Record<string, unknown> };
  relationships: unknown[];
}

export function repairMdmEntityDefinition(def: RepairableEntityDefinition, moduleName: string): void {
  const isMdm = def.kind === 'mdm' || def.ownership === 'mdmOwned';
  if (!isMdm) return;

  def.kind = 'mdm';
  def.ownership = 'mdmOwned';
  if (moduleName && !def.moduleType?.startsWith(`${moduleName}.`)) {
    def.moduleType = `${moduleName}.${def.entityId}`;
  }
  repairRuntimeContextAnchor(def);
}

export function repairRuntimeAnchorRelationships(plan: RepairableDomainPlan): void {
  const entities = plan.ontology?.entities || {};
  const entityIds = new Set(Object.keys(entities).filter(Boolean));
  const runtimeAnchorPairs = new Set<string>();

  for (const [entityId, rawEntity] of Object.entries(entities)) {
    if (!isRecord(rawEntity)) continue;
    const entity = rawEntity as RepairableEntityDefinition & Record<string, unknown>;
    if (!entity.entityId) entity.entityId = entityId;
    const anchor = repairRuntimeContextAnchor(entity);
    const anchorEntityId = typeof anchor?.entityId === 'string' ? anchor.entityId : '';
    if (!anchorEntityId || entityIds.has(anchorEntityId)) continue;
    if (anchor?.source === 'runtimeContext') {
      runtimeAnchorPairs.add(`${entityId}\u0000${anchorEntityId}`);
      runtimeAnchorPairs.add(`${anchorEntityId}\u0000${entityId}`);
    }
  }

  if (runtimeAnchorPairs.size === 0) return;
  plan.relationships = (plan.relationships || []).filter((relationship) => {
    if (!isRecord(relationship)) return true;
    const fromEntity = typeof relationship.fromEntity === 'string' ? relationship.fromEntity : '';
    const toEntity = typeof relationship.toEntity === 'string' ? relationship.toEntity : '';
    return !runtimeAnchorPairs.has(`${fromEntity}\u0000${toEntity}`);
  });
}

export function repairComposedInputs(
  def: RepairableOperationDefinition,
  ontology: Record<string, Record<string, unknown>>,
  relationships: unknown[],
): void {
  if (def.kind !== 'create' && def.kind !== 'update') return;

  const root = stripField(def.entity);
  const writeEntities = new Set((def.writes || []).map(stripField));
  const inputEntities = new Set((def.inputs || []).map(input => stripField(input.fieldRef)));
  const usedInputIds = new Set((def.inputs || []).map(input => input.inputId));

  for (const relationship of relationships) {
    if (!isRecord(relationship)) continue;
    if (relationship.type !== 'partOf' || relationship.toEntity !== root) continue;
    const child = typeof relationship.fromEntity === 'string' ? relationship.fromEntity : '';
    if (!child || !writeEntities.has(child) || inputEntities.has(child)) continue;

    const childKind = typeof ontology[child]?.kind === 'string' ? ontology[child].kind : '';
    const inputId = uniqueInputId(`${lowerFirst(child)}Items`, usedInputIds);
    def.inputs.push({
      inputId,
      fieldRef: child,
      required: true,
      source: childKind === 'event' ? 'systemDefault' : 'userInput',
      description: childKind === 'event'
        ? `System-generated composed ${child} records written with the ${root} command.`
        : `Composed ${child} collection submitted with the ${root} command.`,
    });
  }
}

export function repairRuntimeAnchorReferences(
  def: RepairableOperationDefinition,
  ontology: Record<string, Record<string, unknown>>,
): void {
  const runtimeAnchors = new Map<string, string>();
  for (const entity of Object.values(ontology)) {
    const anchor = isRecord(entity.anchor) ? entity.anchor : null;
    const entityId = typeof anchor?.entityId === 'string' ? anchor.entityId : '';
    const originRef = typeof anchor?.originRef === 'string' ? anchor.originRef : '';
    if (anchor?.source === 'runtimeContext' && entityId && isRuntimeAnchorOriginRef(originRef)) {
      runtimeAnchors.set(entityId, originRef);
    }
  }
  if (runtimeAnchors.size === 0) return;

  const touched = new Map<string, string>();
  const filterRefs = (refs?: string[]) => (refs || []).filter((ref) => {
    const alias = stripField(ref);
    const originRef = runtimeAnchors.get(alias);
    if (!originRef) return true;
    touched.set(alias, originRef);
    return false;
  });

  def.reads = filterRefs(def.reads);
  def.writes = filterRefs(def.writes);
  if (touched.size === 0) return;

  if (!Array.isArray(def.contextResolution)) def.contextResolution = [];
  for (const [alias, originRef] of touched) {
    if (def.contextResolution.some(item => item.originRef === originRef && item.targetRef === originRef)) {
      continue;
    }
    def.contextResolution.push({
      targetRef: originRef,
      source: contextSourceForOriginRef(originRef),
      originRef,
      description: `Resolve runtime anchor ${alias} from ${originRef}.`,
    });
  }
}

function stripField(ref: string): string {
  return ref.includes('.') ? ref.split('.')[0] : ref;
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function uniqueInputId(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  const inputId = `${base}${suffix}`;
  used.add(inputId);
  return inputId;
}

function contextSourceForOriginRef(originRef: string): string {
  return originRef.slice(0, originRef.indexOf('.'));
}

function repairRuntimeContextAnchor(def: RepairableEntityDefinition): RepairableEntityDefinition['anchor'] | undefined {
  const anchor = isRecord(def.anchor) ? def.anchor : undefined;
  const originRef = typeof anchor?.originRef === 'string' ? anchor.originRef : '';
  if (anchor && isRuntimeAnchorOriginRef(originRef)) {
    anchor.source = 'runtimeContext';
  }
  return anchor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
