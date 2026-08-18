/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4ForeignKeys.ts" enhancement="_blank"/>

/**
 * Where a foreign key POINTS.
 *
 * An input's `fieldRef` names the entity that OWNS the field (`BillingLaborAllocation.clientBillingSummaryId`),
 * never the entity the id refers to. Reading the target off that prefix is how the E8 picker check
 * ended up comparing an entity with itself and passing in silence, while 48 command inputs across 15
 * workspaces asked the user to pick a record the screen could not show. The target only exists in the
 * relationship graph, so it is resolved here, once, for every consumer.
 */

export interface Ns4FkRelationship {
  fromEntity: string;
  toEntity: string;
  type: string;
  required: boolean;
  realization?: { ownerEntity?: string; from?: { fieldIds?: string[] } };
}

export interface Ns4FkParent {
  parent: string;
  fieldId: string;
  required: boolean;
}

/** Owner entity -> the parents it references, with the field that holds each id. */
export function buildNs4ParentIndex(relationships: readonly Ns4FkRelationship[]): Map<string, Ns4FkParent[]> {
  const index = new Map<string, Ns4FkParent[]>();
  for (const relationship of relationships) {
    if (relationship.type !== 'manyToOne' && relationship.type !== 'oneToOne') continue;
    // The realization says which side stores the key; only the owner carries the field.
    const owner = relationship.realization?.ownerEntity || relationship.fromEntity;
    if (owner !== relationship.fromEntity) continue;
    const fieldId = relationship.realization?.from?.fieldIds?.[0] || '';
    if (!fieldId) continue;
    const current = index.get(relationship.fromEntity) || [];
    current.push({ parent: relationship.toEntity, fieldId, required: relationship.required });
    index.set(relationship.fromEntity, current);
  }
  return index;
}

/** The entity a given field of a given entity points at, or null when the field is not a key. */
export function ns4FkParentOf(
  index: Map<string, Ns4FkParent[]>, entityId: string, fieldId: string,
): Ns4FkParent | null {
  return (index.get(entityId) || []).find(parent => parent.fieldId === fieldId) || null;
}
