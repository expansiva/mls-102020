/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/gate.ts" enhancement="_blank"/>

import { type P2GrantView } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  P2_NEEDS_FAMILIES,
  P2_NEEDS_OPERATIONS,
  P2_NEEDS_SCOPES,
  P2_NEEDS_SCHEMA_VERSION,
  p2WidestScope,
  isP2NeedsFamily,
  isP2NeedsOperation,
  isP2NeedsScope,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import type { PoolMenuFile, PoolNeedsFile } from '/_102035_/l2/solution/poolPlan.js';

export interface P2NeedsGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2NeedsGateResult {
  ok: boolean;
  issues: P2NeedsGateIssue[];
}

export function validateP2Needs(
  file: PoolNeedsFile,
  menu: PoolMenuFile,
  sources: P2L4Sources,
  grants: readonly P2GrantView[],
): P2NeedsGateResult {
  const issues: P2NeedsGateIssue[] = [];
  if (file.schemaVersion !== P2_NEEDS_SCHEMA_VERSION) {
    error(issues, 'P2_NEEDS_SCHEMA', `schemaVersion must be ${P2_NEEDS_SCHEMA_VERSION}.`, '$.schemaVersion');
  }
  const entityIds = new Set(sources.entities.map(entity => entity.entityId).filter(Boolean));
  const pageIds = collectMenuPageIds(menu);
  const transitionsByEntity = new Map(
    sources.entities.map(entity => [entity.entityId, new Set(entity.transitions.map(item => item.transitionId))]),
  );
  const journeysById = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const relationships = readRelationships(sources);

  file.pages.forEach((page, pageIndex) => {
    const path = `$.pages[${pageIndex}]`;
    if (!pageIds.has(page.pageId)) {
      error(issues, 'P2_NEEDS_PAGE_UNKNOWN', `Unknown page ${page.pageId}.`, `${path}.pageId`);
    }
    page.reads.forEach((read, readIndex) => {
      const at = `${path}.reads[${readIndex}]`;
      if (!entityIds.has(read.entity)) {
        error(issues, 'P2_NEEDS_ENTITY_UNKNOWN', `Unknown entity ${read.entity}.`, `${at}.entity`);
      }
      if (!isP2NeedsFamily(read.family)) {
        error(issues, 'P2_NEEDS_FAMILY', `family must be ${P2_NEEDS_FAMILIES.join('|')}.`, `${at}.family`);
      }
      if (!isP2NeedsScope(read.scope)) {
        error(issues, 'P2_NEEDS_SCOPE', `scope must be ${P2_NEEDS_SCOPES.join('|')}.`, `${at}.scope`);
      }
      validateReadSources(read.from, read.entity, read.scope, page, menu, journeysById, relationships, grants, issues, `${at}.from`);
    });
    page.writes.forEach((write, writeIndex) => {
      const at = `${path}.writes[${writeIndex}]`;
      if (!entityIds.has(write.entity)) {
        error(issues, 'P2_NEEDS_ENTITY_UNKNOWN', `Unknown entity ${write.entity}.`, `${at}.entity`);
      }
      if (!isP2NeedsOperation(write.operation)) {
        error(issues, 'P2_NEEDS_OPERATION', `operation must be ${P2_NEEDS_OPERATIONS.join('|')}.`, `${at}.operation`);
      }
      if (write.operation === 'transition') {
        const known = transitionsByEntity.get(write.entity);
        if (!write.transitionRef) {
          error(issues, 'P2_NEEDS_TRANSITION_UNKNOWN', `transitionRef is required for operation transition.`, `${at}.transitionRef`);
        } else if (known && !known.has(write.transitionRef)) {
          error(
            issues,
            'P2_NEEDS_TRANSITION_UNKNOWN',
            `Unknown transition ${write.transitionRef} on ${write.entity}.`,
            `${at}.transitionRef`,
          );
        }
      }
    });
  });

  return { ok: issues.every(issue => issue.severity !== 'error'), issues };
}

interface NeedsRelationship { left: string; right: string; reference: string; }

function validateReadSources(
  from: readonly string[],
  entity: string,
  scope: string,
  page: PoolNeedsFile['pages'][number],
  menu: PoolMenuFile,
  journeysById: ReadonlyMap<string, P2L4Sources['journeys'][number]>,
  relationships: ReadonlyMap<string, NeedsRelationship>,
  grants: readonly P2GrantView[],
  issues: P2NeedsGateIssue[],
  path: string,
): void {
  const grantIds = from.filter(reference => reference.startsWith('grant:')).map(reference => reference.slice('grant:'.length));
  if (!grantIds.length) {
    error(issues, 'P2_NEEDS_ACCESS_SOURCE_MISSING', 'A read must cite the grant used to authorize its scope.', path);
  } else {
    const citedGrants = grantIds.map(grantId => grants.find(grant => grant.grantId === grantId));
    const applicable = citedGrants.filter((grant): grant is P2GrantView =>
      Boolean(grant && page.actors.includes(grant.actorRef) && grant.entityRefs.includes(entity)),
    );
    if (
      applicable.length !== citedGrants.length ||
      !applicable.length ||
      p2WidestScope(applicable.map(grant => grant.dataScope.mode)) !== scope
    ) {
      error(issues, 'P2_NEEDS_ACCESS_GRANT_INVALID', 'Cited grants must exist, apply to a page actor and entity, and authorize the read scope.', path);
    }
  }
  for (const reference of from) {
    if (reference.startsWith('journey:')) {
      const match = /^journey:([^/]+)\/([^/]+)$/u.exec(reference);
      const journey = match ? journeysById.get(match[1]) : undefined;
      if (!match || !journey?.steps.some(step => step.stepId === match[2]) || !(menu.meta.journeys[match[1]] || []).includes(page.pageId)) {
        error(issues, 'P2_NEEDS_JOURNEY_SOURCE_UNKNOWN', `Unknown or unrelated journey source ${reference}.`, path);
      }
    }
    if (reference.startsWith('relationship:')) {
      const key = reference.slice('relationship:'.length);
      if (!relationships.has(key)) {
        error(issues, 'P2_NEEDS_RELATIONSHIP_SOURCE_UNKNOWN', `Unknown relationship source ${reference}.`, path);
      }
    }
  }
  const citedEdges = from.flatMap(reference => {
    if (!reference.startsWith('relationship:')) return [];
    const edge = relationships.get(reference.slice('relationship:'.length));
    return edge ? [edge] : [];
  });
  if (!citedEdges.length) return;
  const journeyEntities = from.flatMap(reference => {
    if (!reference.startsWith('journey:')) return [];
    const match = /^journey:([^/]+)\/([^/]+)$/u.exec(reference);
    const step = match && journeysById.get(match[1])?.steps.find(item => item.stepId === match[2]);
    return step?.entity ? [step.entity] : [];
  });
  const adjacency = new Map<string, Set<string>>();
  for (const edge of citedEdges) {
    const left = adjacency.get(edge.left) || new Set<string>();
    const right = adjacency.get(edge.right) || new Set<string>();
    left.add(edge.right);
    right.add(edge.left);
    adjacency.set(edge.left, left);
    adjacency.set(edge.right, right);
  }
  if (!journeyEntities.some(start => isConnected(start, entity, adjacency))) {
    error(issues, 'P2_NEEDS_RELATIONSHIP_PATH_INVALID', `Cited relationships do not connect a journey entity to ${entity}.`, path);
  }
}

function readRelationships(sources: P2L4Sources): Map<string, NeedsRelationship> {
  const out = new Map<string, NeedsRelationship>();
  for (const raw of sources.ontologyEntities) {
    const entity = asRecord(raw);
    const left = typeof entity.entityId === 'string' ? entity.entityId.trim() : '';
    const relationships = asRecord(entity.relationships);
    for (const rawRelationship of Object.values(relationships)) {
      const relationship = asRecord(rawRelationship);
      const right = typeof relationship.to === 'string' ? relationship.to.trim() : '';
      const relationshipId = typeof relationship.relationshipId === 'string' ? relationship.relationshipId.trim() : '';
      if (!left || !right || !relationshipId) continue;
      const reference = `${left}/${relationshipId}`;
      out.set(reference, { left, right, reference });
    }
  }
  return out;
}

function isConnected(start: string, target: string, adjacency: ReadonlyMap<string, ReadonlySet<string>>): boolean {
  const pending = [start];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.shift();
    if (!current || visited.has(current)) continue;
    if (current === target) return true;
    visited.add(current);
    for (const next of adjacency.get(current) || []) if (!visited.has(next)) pending.push(next);
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function formatP2NeedsGate(issues: readonly P2NeedsGateIssue[]): string {
  return issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

function collectMenuPageIds(menu: PoolMenuFile): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: PoolMenuFile['tree']) => {
    for (const node of nodes) {
      if (node.kind === 'page') out.add(node.id);
      else walk(node.children);
    }
  };
  walk(menu.tree);
  return out;
}

function error(issues: P2NeedsGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
