/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/contracts.ts" enhancement="_blank"/>

import type { PoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  P2_MENU_DEVICE,
  type P2MenuDevice,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_MENU_SCHEMA_VERSION,
  actorAuthorityKey,
  collectBeyondJourneys,
  type MenuOrganismKind,
  type P2GrantView,
  type P2ProcessView,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { journeyStepOf } from '/_102020_/l2/agentPlannerL2/steps/requests50/contracts.js';
import { transitionAllowedFor, transitionGroups } from '/_102020_/l2/agentPlannerL2/helpers/p2Transitions.js';
import {
  isDdmEntity,
  type P2JourneyView,
  type P2L4Sources,
  type P2OntologyEntityView,
  type P2Workspace,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import type {
  MenuStampedNode,
  MenuStampedPageNode,
  PoolMenuFile,
  PoolNeedsFile,
  PoolNeedsPage,
  PoolNeedsRead,
  PoolNeedsWrite,
} from '/_102035_/l2/solution/poolPlan.js';
import { POOL_NEEDS_FAMILIES, POOL_NEEDS_OPERATIONS, POOL_NEEDS_SCHEMA_VERSION, POOL_NEEDS_SCOPES } from '/_102035_/l2/solution/poolPlan.js';

// Lists and version of needs.json come from the pool's one type (p2_34).
export const P2_NEEDS_SCHEMA_VERSION = POOL_NEEDS_SCHEMA_VERSION;
export const P2_NEEDS_OPERATIONS = POOL_NEEDS_OPERATIONS;
export type P2NeedsOperation = typeof P2_NEEDS_OPERATIONS[number];
export const P2_NEEDS_SCOPES = POOL_NEEDS_SCOPES;
export type P2NeedsScope = typeof P2_NEEDS_SCOPES[number];
export const P2_NEEDS_FAMILIES = POOL_NEEDS_FAMILIES;
export type P2NeedsFamily = typeof P2_NEEDS_FAMILIES[number];
export const P2_NEEDS_ARTIFACT = 'pool/l1/web/needs.json' as const;

const HOME_ID = /^inicio_/;
const READ_STEP_KINDS = new Set(['locate', 'inspect']);
const SCOPE_RANK: Record<P2NeedsScope, number> = { own: 0, related: 1, organization: 2 };

export interface P2BuildNeedsInput {
  menu: PoolMenuFile;
  sources: P2L4Sources;
  grants: readonly P2GrantView[];
  processes: readonly P2ProcessView[];
  now: Date;
}

export function isP2NeedsOperation(value: string): value is P2NeedsOperation {
  return (P2_NEEDS_OPERATIONS as readonly string[]).includes(value);
}

export function isP2NeedsScope(value: string): value is P2NeedsScope {
  return (P2_NEEDS_SCOPES as readonly string[]).includes(value);
}

export function isP2NeedsFamily(value: string): value is P2NeedsFamily {
  return (P2_NEEDS_FAMILIES as readonly string[]).includes(value);
}

/** kind role → mdm; ddm via isDdmEntity; else tdm. Family is not on the defs. */
export function p2EntityFamily(entity: P2OntologyEntityView): P2NeedsFamily {
  if (entity.kind === 'role') return 'mdm';
  if (isDdmEntity(entity)) return 'ddm';
  return 'tdm';
}

/** Widest grant wins: own < related < organization. */
export function p2WidestScope(modes: readonly string[]): P2NeedsScope | '' {
  let best: P2NeedsScope | '' = '';
  let rank = -1;
  for (const mode of modes) {
    if (!isP2NeedsScope(mode)) continue;
    if (SCOPE_RANK[mode] > rank) {
      best = mode;
      rank = SCOPE_RANK[mode];
    }
  }
  return best;
}

export function p2NeedsSubject(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): string {
  return `needs of ${moduleName} (${device})`;
}

export function p2NeedsBody(file: PoolNeedsFile): string {
  return file.pages.map(page => `${page.pageId}: ${page.reads.length} reads / ${page.writes.length} writes`).join('\n');
}

export function buildP2NeedsFile(input: P2BuildNeedsInput): PoolNeedsFile {
  const pages = collectP2NeedsPages(input);
  return {
    schemaVersion: P2_NEEDS_SCHEMA_VERSION,
    moduleName: input.menu.moduleName || input.sources.moduleName,
    device: input.menu.device || P2_MENU_DEVICE,
    menuSchema: P2_MENU_SCHEMA_VERSION,
    pages,
    meta: {
      sourceMenu: `pool/l2/${input.menu.device || P2_MENU_DEVICE}/menu.json`,
      generatedAt: input.now.toISOString(),
    },
  };
}

export function buildP2NeedsMessage(input: {
  file: PoolNeedsFile;
  received: Pick<PoolMessage, 'thread' | 'round' | 'mode'>;
}): PoolMessage {
  return {
    from: 'l2',
    to: 'l1',
    thread: input.received.thread,
    round: input.received.round,
    mode: input.received.mode,
    subject: p2NeedsSubject(input.file.moduleName, input.file.device),
    artifacts: [P2_NEEDS_ARTIFACT],
    body: p2NeedsBody(input.file),
  };
}

export function collectP2NeedsPages(input: P2BuildNeedsInput): PoolNeedsPage[] {
  const { menu, sources, grants, processes } = input;
  const issues: string[] = [];
  const pages = stampedPages(menu.tree);
  const actorsOfPage = pageActors(menu, pages);
  const journeysOfPage = invertIdPages(menu.meta.journeys);
  const processesOfPage = invertIdPages(menu.meta.processes);
  if (!menu.meta.records) throw new Error('P2_NEEDS_MENU_RECORDS_MISSING: menu.json has no meta.records; run menu20 again so each form page names the record it keeps.');
  const recordsOfPage = invertIdPages(menu.meta.records);
  const journeyById = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const entityById = new Map(sources.entities.map(entity => [entity.entityId, entity]));
  const beyond = collectBeyondJourneys(sources, grants, processes);
  const homeIds = homePageIds(menu, pages, journeysOfPage);
  const processById = new Map(processes.map(process => [process.processId, process]));

  const out: PoolNeedsPage[] = [];
  for (const page of pages) {
    const actors = actorsOfPage.get(page.id) || [];
    if (homeIds.has(page.id)) {
      out.push(finishPage(page.id, actors, homeReads(page, actors, beyond, entityById, grants, sources), []));
      continue;
    }

    const reads = new Map<string, PoolNeedsRead>();
    const writes = new Map<string, PoolNeedsWrite>();
    const addRead = (entityId: string, from: string) => {
      pushRead(reads, entityId, from, entityById, grants, actors, sources);
    };
    const addWrite = (entityId: string, operation: P2NeedsOperation, transitionRef: string, from: string) => {
      pushWrite(writes, entityId, operation, transitionRef, from);
    };

    for (const journeyId of journeysOfPage.get(page.id) || []) {
      const journey = journeyById.get(journeyId);
      if (!journey) continue;
      const journeySources: string[] = [];
      for (const [stepIndex, step] of journey.steps.entries()) {
        const from = journeyFrom(step.stepId, journey, sources);
        if (step.kind === 'decide' && step.entity) {
          for (const transitionRef of decideTransitions(journey, stepIndex, sources, issues)) addWrite(step.entity, 'transition', transitionRef, from);
        }
        if (READ_STEP_KINDS.has(step.kind) && step.entity) {
          addRead(step.entity, from);
          journeySources.push(from);
        }
        if (step.kind !== 'act' || !step.entity) continue;
        addRead(step.entity, from);
        journeySources.push(from);
        const operation = isP2NeedsOperation(step.effect || '') ? step.effect as P2NeedsOperation : '';
        if (!operation) continue;
        if (operation === 'transition' && !step.transitionRef) {
          issues.push(`P2_NEEDS_TRANSITION_WITHOUT_REF: journey ${journey.journeyId} step ${step.stepId} writes ${step.entity}.transition without a transitionRef.`);
          continue;
        }
        addWrite(step.entity, operation, operation === 'transition' ? step.transitionRef! : '', from);
      }
      for (const relational of collectJourneyRelationalReads(journey, page, journeySources, sources, entityById, grants, actors)) {
        for (const from of relational.from) addRead(relational.entity, from);
      }
    }

    for (const processId of processesOfPage.get(page.id) || []) {
      const process = processById.get(processId);
      if (!process) continue;
      const from = `process:${processId}`;
      for (const task of process.tasks) {
        if (task.entityRef) addRead(task.entityRef, from);
      }
    }

    if (hasOrganism(page, 'summary') || hasOrganism(page, 'highlights')) {
      for (const actorRef of actors) {
        for (const entity of ddmGrantedTo(actorRef, grants, sources)) {
          addRead(entity.entityId, hasOrganism(page, 'summary') ? 'organism:summary' : 'organism:highlights');
        }
      }
    }

    // A form page without a journey keeps only the records menu20 assigned to it.
    if (hasOrganism(page, 'form') && (journeysOfPage.get(page.id) || []).length === 0) {
      for (const entityId of recordsOfPage.get(page.id) || []) {
        if (!entityById.has(entityId)) continue;
        addRead(entityId, 'organism:form');
        addWrite(entityId, 'create', '', 'organism:form');
        addWrite(entityId, 'update', '', 'organism:form');
      }
    }

    out.push(finishPage(page.id, actors, [...reads.values()], [...writes.values()]));
  }
  if (issues.length) throw new Error([...new Set(issues)].join(' | '));
  return out;
}

/**
 * The transitions a decide step offers that no act of the journey already writes. The group is the
 * origin-state group of the act that follows the decision; without one, the branching group the
 * journey actor may fire. Only transitions the lifecycle lets that actor fire become writes.
 */
function decideTransitions(journey: P2JourneyView, stepIndex: number, sources: P2L4Sources, issues: string[]): string[] {
  const step = journey.steps[stepIndex];
  const groups = transitionGroups(step.entity, sources);
  const written = new Set(journey.steps.filter(item => item.kind === 'act' && item.entity === step.entity && item.transitionRef).map(item => item.transitionRef!));
  const next = journey.steps.slice(stepIndex + 1).find(item => item.kind === 'act' && item.entity === step.entity && item.transitionRef);
  const candidates = next
    ? groups.filter(group => group.some(item => item.transitionId === next.transitionRef))
    : groups.filter(group => group.length >= 2 && group.every(item => transitionAllowedFor(item, journey.actorRef)));
  const where = `journey ${journey.journeyId} step ${step.stepId} (${step.entity})`;
  if (!candidates.length) {
    issues.push(`P2_NEEDS_DECIDE_GROUP_EMPTY: ${where} has no transition group to decide between.`);
    return [];
  }
  if (candidates.length > 1) {
    issues.push(`P2_NEEDS_DECIDE_GROUP_AMBIGUOUS: ${where} matches the groups ${candidates.map(group => `[${group.map(item => item.transitionId).join(', ')}]`).join(' and ')}.`);
    return [];
  }
  return candidates[0].filter(item => !written.has(item.transitionId) && transitionAllowedFor(item, journey.actorRef)).map(item => item.transitionId);
}

function homeReads(
  page: MenuStampedPageNode,
  actors: readonly string[],
  beyond: ReturnType<typeof collectBeyondJourneys>,
  entityById: Map<string, P2OntologyEntityView>,
  grants: readonly P2GrantView[],
  sources: P2L4Sources,
): PoolNeedsRead[] {
  const reads = new Map<string, PoolNeedsRead>();
  const see = beyond.filter(row => actors.includes(row.actorRef));
  const add = (entityId: string, from: string) => {
    pushRead(reads, entityId, from, entityById, grants, actors, sources);
  };
  if (hasOrganism(page, 'summary') || hasOrganism(page, 'highlights')) {
    const from = hasOrganism(page, 'summary') ? 'organism:summary' : 'organism:highlights';
    for (const row of see) {
      for (const item of row.derived) {
        if (item.entityRef) add(item.entityRef, from);
      }
    }
  }
  if (hasOrganism(page, 'alerts')) {
    for (const row of see) {
      for (const task of row.mechanicalEffects) {
        if (task.entityRef) add(task.entityRef, 'organism:alerts');
      }
    }
  }
  if (hasOrganism(page, 'inbox')) {
    for (const row of see) {
      for (const task of row.human) {
        if (task.entityRef) add(task.entityRef, 'organism:inbox');
      }
    }
  }
  return [...reads.values()];
}

function pushRead(
  reads: Map<string, PoolNeedsRead>,
  entityId: string,
  from: string,
  entityById: Map<string, P2OntologyEntityView>,
  grants: readonly P2GrantView[],
  actors: readonly string[],
  sources: P2L4Sources,
): void {
  if (!entityId) return;
  const entity = entityById.get(entityId);
  const family = entity ? p2EntityFamily(entity) : 'tdm';
  const eligibleGrants = grants.filter(grant => actors.includes(grant.actorRef) && grant.entityRefs.includes(entityId));
  const scope = p2WidestScope(eligibleGrants.map(grant => grant.dataScope.mode));
  if (!scope) return;
  const provenance = [...from.split('\n'), ...eligibleGrants.map(grant => `grant:${grant.grantId}`)];
  const derived = derivedFieldNames(entityId, sources);
  const current = reads.get(entityId);
  if (!current) {
    reads.set(entityId, {
      entity: entityId,
      family,
      scope,
      derived,
      from: mergeFrom(provenance),
    });
    return;
  }
  current.scope = p2WidestScope([current.scope, scope]) || current.scope;
  current.from = mergeFrom([...current.from, ...provenance]);
  current.derived = mergeNames([...current.derived, ...derived]);
}

interface P2RelationalRead { entity: string; from: string[]; }

interface P2RelationshipEdge {
  left: string;
  right: string;
  reference: string;
  prose: string;
}

function collectJourneyRelationalReads(
  journey: P2JourneyView,
  page: MenuStampedPageNode,
  journeySources: readonly string[],
  sources: P2L4Sources,
  entityById: Map<string, P2OntologyEntityView>,
  grants: readonly P2GrantView[],
  actors: readonly string[],
): P2RelationalRead[] {
  const edges = relationshipEdges(sources);
  const context = semanticTerms([
    journey.title,
    journey.goal || '',
    ...page.organisms.map(organism => organism.text),
  ].join(' '));
  const queue = journey.steps
    .filter(step => step.entity && (READ_STEP_KINDS.has(step.kind) || step.kind === 'act'))
    .map(step => ({ entity: step.entity, depth: 0, path: [] as string[] }));
  const visited = new Set<string>();
  const out = new Map<string, P2RelationalRead>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current.entity)) continue;
    visited.add(current.entity);
    for (const edge of edges) {
      const next = edge.left === current.entity ? edge.right : edge.right === current.entity ? edge.left : '';
      if (!next || next === current.entity || !entityById.has(next)) continue;
      const candidate = sources.ontologyEntities.find(item => text(record(item).entityId) === next);
      if (!hasSemanticRelation(context, edge.prose, candidate)) continue;
      const nextPath = [...current.path, edge.reference];
      const access = grants.some(grant => actors.includes(grant.actorRef) && grant.entityRefs.includes(next));
      if (!access) continue;
      const sourceRefs = mergeFrom([
        ...journeySources,
        ...nextPath.map(reference => `relationship:${reference}`),
      ]);
      const existing = out.get(next);
      if (existing) existing.from = mergeFrom([...existing.from, ...sourceRefs]);
      else out.set(next, { entity: next, from: sourceRefs });
      if (!visited.has(next)) queue.push({ entity: next, depth: current.depth + 1, path: nextPath });
    }
  }
  return [...out.values()];
}

function relationshipEdges(sources: P2L4Sources): P2RelationshipEdge[] {
  const edges = new Map<string, P2RelationshipEdge>();
  for (const raw of sources.ontologyEntities) {
    const entity = record(raw);
    const left = text(entity.entityId);
    if (!left) continue;
    const relationships = record(entity.relationships);
    for (const relationship of Object.values(relationships)) {
      const item = record(relationship);
      const right = text(item.to);
      const relationshipId = text(item.relationshipId);
      if (!right || !relationshipId) continue;
      const reference = `${left}/${relationshipId}`;
      edges.set(reference, {
        left,
        right,
        reference,
        prose: [text(item.title), text(item.description)].filter(Boolean).join(' '),
      });
    }
  }
  return [...edges.values()];
}

function hasSemanticRelation(
  context: ReadonlySet<string>,
  relationshipProse: string,
  candidate: unknown,
): boolean {
  if (context.size === 0) return false;
  const entity = record(candidate);
  const relationshipOverlap = semanticOverlap(context, semanticTerms(relationshipProse));
  const entityOverlap = semanticOverlap(context, semanticTerms(text(entity.description)));
  return relationshipOverlap.length > 0 && new Set([...relationshipOverlap, ...entityOverlap]).size >= 2;
}

function semanticOverlap(context: ReadonlySet<string>, evidence: ReadonlySet<string>): string[] {
  const matches = new Set<string>();
  for (const left of context) {
    for (const right of evidence) {
      if (left === right || left.startsWith(right) || right.startsWith(left)) {
        matches.add(left.length >= right.length ? left : right);
      }
    }
  }
  return [...matches];
}

function semanticTerms(value: string): Set<string> {
  return new Set(normalizeTokens(value).filter(word => word.length >= 5));
}

function normalizeTokens(value: string): string[] {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLocaleLowerCase()
    .split(/[^a-z0-9]+/u).filter(Boolean);
}

function pushWrite(
  writes: Map<string, PoolNeedsWrite>,
  entityId: string,
  operation: P2NeedsOperation,
  transitionRef: string,
  from: string,
): void {
  const key = `${entityId}\0${operation}\0${transitionRef}`;
  const current = writes.get(key);
  if (!current) {
    writes.set(key, { entity: entityId, operation, transitionRef, from: mergeFrom([from]) });
    return;
  }
  current.from = mergeFrom([...current.from, from]);
}

function finishPage(
  pageId: string,
  actors: readonly string[],
  reads: PoolNeedsRead[],
  writes: PoolNeedsWrite[],
): PoolNeedsPage {
  return {
    pageId,
    actors: [...actors].sort((left, right) => left.localeCompare(right)),
    reads: reads.sort((left, right) => left.entity.localeCompare(right.entity)),
    writes: writes.sort((left, right) => {
      const entity = left.entity.localeCompare(right.entity);
      if (entity !== 0) return entity;
      const operation = left.operation.localeCompare(right.operation);
      return operation !== 0 ? operation : left.transitionRef.localeCompare(right.transitionRef);
    }),
  };
}

function journeyFrom(stepId: string, journey: P2JourneyView, sources: P2L4Sources): string {
  const workspace: P2Workspace = {
    workspaceId: journey.journeyId,
    title: journey.title,
    kind: 'catalogue',
    entityRef: '',
    actorRefs: [journey.actorRef],
    journeyRefs: [journey.journeyId],
    stepRefs: [stepId],
  };
  const resolved = journeyStepOf(stepId, workspace, sources);
  return `journey:${resolved.journeyId}/${resolved.stepId}`;
}

function derivedFieldNames(entityId: string, sources: P2L4Sources): string[] {
  const raw = sources.ontologyEntities.find(item => item.entityId === entityId);
  if (!raw) return [];
  const names: string[] = [];
  const entity = record(raw);
  walkDerivedFields(record(record(entity.record).fields), false, '', (path) => names.push(path));
  return mergeNames(names);
}

function walkDerivedFields(
  fields: Record<string, unknown>,
  platform: boolean,
  prefix: string,
  visit: (path: string) => void,
): void {
  for (const [id, raw] of Object.entries(fields)) {
    const field = record(raw);
    const nextPlatform = platform || text(field.owner) === 'platform';
    const path = prefix ? `${prefix}.${id}` : id;
    const nested = field.fields;
    const container = isRecord(nested) && Object.keys(nested).length > 0;
    if (!nextPlatform && field.derived === true && id !== 'id' && id !== 'version' && !container) {
      visit(path);
    }
    if (isRecord(nested)) walkDerivedFields(nested, nextPlatform, path, visit);
  }
}

function ddmGrantedTo(
  actorRef: string,
  grants: readonly P2GrantView[],
  sources: P2L4Sources,
): P2OntologyEntityView[] {
  const granted = new Set<string>();
  for (const grant of grants) {
    if (grant.actorRef !== actorRef) continue;
    for (const entityRef of grant.entityRefs) granted.add(entityRef);
  }
  return sources.entities.filter(entity => granted.has(entity.entityId) && isDdmEntity(entity));
}

function homePageIds(
  menu: PoolMenuFile,
  pages: readonly MenuStampedPageNode[],
  journeysOfPage: Map<string, string[]>,
): Set<string> {
  const pageIds = new Set(pages.map(page => page.id));
  const homes = new Set<string>();
  for (const page of pages) {
    const journeys = journeysOfPage.get(page.id) || [];
    if (journeys.length) continue;
    if (HOME_ID.test(page.id)) homes.add(page.id);
  }
  for (const actorRef of Object.keys(menu.authorities).map(actorFromKey).filter(Boolean)) {
    const first = firstVisiblePage(menu, actorRef, pageIds);
    if (first && !(journeysOfPage.get(first) || []).length) homes.add(first);
  }
  return homes;
}

function firstVisiblePage(menu: PoolMenuFile, actorRef: string, pageIds: Set<string>): string {
  const listed = menu.authorities[actorAuthorityKey(actorRef)] || [];
  const byId = indexTree(menu.tree);
  for (const id of listed) {
    const first = firstPageFrom(byId.get(id), pageIds);
    if (first) return first;
  }
  return '';
}

function firstPageFrom(node: MenuStampedNode | undefined, pageIds: Set<string>): string {
  if (!node) return '';
  if (node.kind === 'page' && pageIds.has(node.id)) return node.id;
  if (node.kind === 'hub' || node.kind === 'group') {
    for (const child of node.children) {
      const found = firstPageFrom(child, pageIds);
      if (found) return found;
    }
  }
  return '';
}

function pageActors(menu: PoolMenuFile, pages: readonly MenuStampedPageNode[]): Map<string, string[]> {
  const pageIds = new Set(pages.map(page => page.id));
  const out = new Map<string, string[]>();
  for (const page of pages) out.set(page.id, []);
  for (const [key, listed] of Object.entries(menu.authorities)) {
    const actorRef = actorFromKey(key);
    if (!actorRef) continue;
    const visible = new Set<string>();
    const byId = indexTree(menu.tree);
    for (const id of listed) collectPageIds(byId.get(id), pageIds, visible);
    for (const pageId of visible) {
      const row = out.get(pageId);
      if (row && !row.includes(actorRef)) row.push(actorRef);
    }
  }
  return out;
}

function collectPageIds(node: MenuStampedNode | undefined, pageIds: Set<string>, out: Set<string>): void {
  if (!node) return;
  if (node.kind === 'page' && pageIds.has(node.id)) out.add(node.id);
  if (node.kind === 'hub' || node.kind === 'group') {
    for (const child of node.children) collectPageIds(child, pageIds, out);
  }
}

function indexTree(nodes: readonly MenuStampedNode[]): Map<string, MenuStampedNode> {
  const out = new Map<string, MenuStampedNode>();
  const walk = (list: readonly MenuStampedNode[]) => {
    for (const node of list) {
      out.set(node.id, node);
      if (node.kind === 'hub' || node.kind === 'group') walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function stampedPages(nodes: readonly MenuStampedNode[]): MenuStampedPageNode[] {
  const out: MenuStampedPageNode[] = [];
  const walk = (list: readonly MenuStampedNode[]) => {
    for (const node of list) {
      if (node.kind === 'page') out.push(node);
      else walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function invertIdPages(map: Record<string, string[]> | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [id, pages] of Object.entries(map || {})) {
    for (const pageId of pages) {
      const row = out.get(pageId) || [];
      if (!row.includes(id)) row.push(id);
      out.set(pageId, row);
    }
  }
  return out;
}

function hasOrganism(page: MenuStampedPageNode, kind: MenuOrganismKind): boolean {
  return page.organisms.some(organism => organism.kind === kind);
}

function actorFromKey(key: string): string {
  return key.startsWith('actor:') ? key.slice('actor:'.length) : '';
}

function mergeFrom(values: readonly string[]): string[] {
  return mergeNames(values.filter(Boolean));
}

function mergeNames(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value !== 'function' && typeof value === 'object' && !Array.isArray(value);
}
