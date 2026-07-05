/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2MdmModeling.ts" enhancement="_blank"/>

export const MDM_SUBTYPES = [
  'Person',
  'Company',
  'Product',
  'Service',
  'Location',
  'AssetGeneric',
  'AssetVehicle',
  'AssetProperty',
  'AssetEquipment',
  'Animal',
  'BankAccount',
  'Document',
  'ContactChannel',
] as const;

export const MDM_RELATIONSHIP_TYPES = [
  'Owns',
  'Employs',
  'OffersProduct',
  'OffersService',
  'StocksAt',
  'Teaches',
  'HappensAt',
  'FranchiseOf',
  'BelongsToGroup',
  'PartOfUnit',
  'ManagedBy',
  'ReportsTo',
  'AssignedTo',
  'Attends',
  'SuppliesProduct',
  'PartnersWith',
  'Family',
  'GuardianOf',
  'CustomerOf',
  'SupplierOf',
  'MemberOf',
  'HoldsAccount',
  'SubsidiaryOf',
  'LocatedAt',
  'Signed',
  'HasContact',
] as const;

export const STRUCTURAL_RELATIONSHIP_TYPES = ['partOf'] as const;
export const L4_RELATIONSHIP_TYPES = [...MDM_RELATIONSHIP_TYPES, ...STRUCTURAL_RELATIONSHIP_TYPES] as const;

export interface MdmModelingIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface MdmModelingInput {
  moduleName: string;
  entities: Record<string, unknown>;
  relationships: unknown[];
}

export function collectMdmModelingIssues(input: MdmModelingInput): MdmModelingIssue[] {
  const issues: MdmModelingIssue[] = [];
  const entityIds = new Set(Object.keys(input.entities || {}));
  for (const [entityId, raw] of Object.entries(input.entities || {})) {
    if (!isRecord(raw)) continue;
    validateEntity(input.moduleName, entityId, raw, entityIds, issues);
  }
  for (const raw of input.relationships || []) validateRelationship(raw, entityIds, issues);
  return issues;
}

function validateEntity(moduleName: string, entityId: string, entity: Record<string, unknown>, entityIds: Set<string>, issues: MdmModelingIssue[]): void {
  const ownership = readString(entity.ownership);
  const kind = readString(entity.kind);
  const isMdm = ownership === 'mdmOwned' || kind === 'mdm';
  const where = `entity ${entityId}`;

  if (!readString(entity.modelingDecision)) {
    issues.push({ severity: 'error', code: 'entity.modelingDecision.missing', message: `${where}: missing modelingDecision explaining why it is MDM, embedded or local/module-owned` });
  }

  if (!isMdm) {
    if (readString(entity.moduleType) || readString(entity.mdmSubtype) || entity.anchor !== undefined) {
      issues.push({ severity: 'warning', code: 'entity.mdmMetadata.unused', message: `${where}: MDM metadata is present but entity is not kind=mdm/ownership=mdmOwned` });
    }
    return;
  }

  if (ownership !== 'mdmOwned') {
    issues.push({ severity: 'error', code: 'mdm.ownership.invalid', message: `${where}: kind=mdm must use ownership=mdmOwned` });
  }
  if (kind !== 'mdm') {
    issues.push({ severity: 'error', code: 'mdm.kind.invalid', message: `${where}: ownership=mdmOwned must use kind=mdm` });
  }

  const moduleType = readString(entity.moduleType);
  if (!moduleType) {
    issues.push({ severity: 'error', code: 'mdm.moduleType.missing', message: `${where}: MDM entity must declare moduleType in <moduleId>.<type> format` });
  } else {
    if (!/^[a-z][A-Za-z0-9]*\.[A-Z][A-Za-z0-9]*$/.test(moduleType)) {
      issues.push({ severity: 'error', code: 'mdm.moduleType.invalid', message: `${where}: moduleType '${moduleType}' must be formatted as <moduleId>.<PascalType>` });
    }
    if (moduleName && !moduleType.startsWith(`${moduleName}.`)) {
      issues.push({ severity: 'error', code: 'mdm.moduleType.moduleMismatch', message: `${where}: moduleType '${moduleType}' must start with '${moduleName}.'` });
    }
  }

  const subtype = readString(entity.mdmSubtype);
  if (!subtype) {
    issues.push({ severity: 'error', code: 'mdm.subtype.missing', message: `${where}: MDM entity must declare mdmSubtype` });
  } else if (!isMdmSubtype(subtype)) {
    issues.push({ severity: 'error', code: 'mdm.subtype.invalid', message: `${where}: mdmSubtype '${subtype}' is not a 102034 MDM subtype` });
  }

  const requiresAnchor = entity.requiresAnchor === true;
  if (requiresAnchor && !isRecord(entity.anchor)) {
    issues.push({ severity: 'error', code: 'mdm.anchor.missing', message: `${where}: requiresAnchor=true but no anchor was declared` });
  }
  if (isRecord(entity.anchor)) validateAnchor(where, entity.anchor, entityIds, issues);
}

function validateAnchor(where: string, anchor: Record<string, unknown>, entityIds: Set<string>, issues: MdmModelingIssue[]): void {
  const entityId = readString(anchor.entityId);
  const relationshipType = readString(anchor.relationshipType);
  if (!entityId || !entityIds.has(entityId)) {
    issues.push({ severity: 'error', code: 'mdm.anchor.entity.unknown', message: `${where}: anchor.entityId '${entityId || '?'}' does not resolve to an ontology entity` });
  }
  if (!relationshipType || !isMdmRelationshipType(relationshipType)) {
    issues.push({ severity: 'error', code: 'mdm.anchor.relationship.invalid', message: `${where}: anchor.relationshipType '${relationshipType || '?'}' must be a 102034 MDM relationship type` });
  }
  if (!readString(anchor.description)) {
    issues.push({ severity: 'error', code: 'mdm.anchor.description.missing', message: `${where}: anchor must explain why this relationship scopes the MDM entity` });
  }
}

function validateRelationship(raw: unknown, entityIds: Set<string>, issues: MdmModelingIssue[]): void {
  if (!isRecord(raw)) return;
  const relationshipId = readString(raw.relationshipId) || '?';
  const type = readString(raw.type);
  if (!type || !isL4RelationshipType(type)) {
    issues.push({ severity: 'error', code: 'relationship.type.invalid', message: `relationship ${relationshipId}: type '${type || '?'}' must be a known MDM relationship type or structural partOf` });
  }
  for (const key of ['fromEntity', 'toEntity']) {
    const value = readString(raw[key]);
    if (!value || !entityIds.has(value)) {
      issues.push({ severity: 'error', code: 'relationship.entity.unknown', message: `relationship ${relationshipId}: ${key} '${value || '?'}' does not resolve to an ontology entity` });
    }
  }
  if (!readString(raw.decisionReason)) {
    issues.push({ severity: 'error', code: 'relationship.decisionReason.missing', message: `relationship ${relationshipId}: missing decisionReason explaining why '${type || '?'}' is the right relationship` });
  }
}

function isMdmSubtype(value: string): boolean {
  return (MDM_SUBTYPES as readonly string[]).includes(value);
}

function isMdmRelationshipType(value: string): boolean {
  return (MDM_RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

function isL4RelationshipType(value: string): boolean {
  return (L4_RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
