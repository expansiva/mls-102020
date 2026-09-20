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
  type MenuStampedNode,
  type MenuStampedPageNode,
  type P2GrantView,
  type P2MenuFile,
  type P2ProcessView,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { journeyStepOf } from '/_102020_/l2/agentPlannerL2/steps/requests50/contracts.js';
import {
  isDdmEntity,
  type P2JourneyView,
  type P2L4Sources,
  type P2OntologyEntityView,
  type P2Workspace,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

export const P2_NEEDS_SCHEMA_VERSION = '2026-09-21-p2-needs-v1' as const;
export const P2_NEEDS_OPERATIONS = ['create', 'update', 'transition', 'delete'] as const;
export type P2NeedsOperation = typeof P2_NEEDS_OPERATIONS[number];
export const P2_NEEDS_SCOPES = ['own', 'related', 'organization'] as const;
export type P2NeedsScope = typeof P2_NEEDS_SCOPES[number];
export const P2_NEEDS_FAMILIES = ['mdm', 'ddm', 'tdm'] as const;
export type P2NeedsFamily = typeof P2_NEEDS_FAMILIES[number];
export const P2_NEEDS_ARTIFACT = 'pool/l1/web/needs.json' as const;

const HOME_ID = /^inicio_/;
const READ_STEP_KINDS = new Set(['locate', 'inspect']);
const SCOPE_RANK: Record<P2NeedsScope, number> = { own: 0, related: 1, organization: 2 };

export interface P2NeedsRead {
  entity: string;
  family: P2NeedsFamily;
  scope: P2NeedsScope;
  derived: string[];
  from: string[];
}

export interface P2NeedsWrite {
  entity: string;
  operation: P2NeedsOperation;
  transitionRef: string;
  from: string[];
}

export interface P2NeedsPage {
  pageId: string;
  actors: string[];
  reads: P2NeedsRead[];
  writes: P2NeedsWrite[];
}

export interface P2NeedsFile {
  schemaVersion: typeof P2_NEEDS_SCHEMA_VERSION;
  moduleName: string;
  device: P2MenuDevice;
  menuSchema: typeof P2_MENU_SCHEMA_VERSION;
  pages: P2NeedsPage[];
  meta: { sourceMenu: string; generatedAt: string };
}

export interface P2BuildNeedsInput {
  menu: P2MenuFile;
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

export function p2NeedsBody(file: P2NeedsFile): string {
  return file.pages.map(page => `${page.pageId}: ${page.reads.length} reads / ${page.writes.length} writes`).join('\n');
}

export function buildP2NeedsFile(input: P2BuildNeedsInput): P2NeedsFile {
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
  file: P2NeedsFile;
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

export function collectP2NeedsPages(input: P2BuildNeedsInput): P2NeedsPage[] {
  const { menu, sources, grants, processes } = input;
  const pages = stampedPages(menu.tree);
  const actorsOfPage = pageActors(menu, pages);
  const journeysOfPage = invertIdPages(menu.meta.journeys);
  const processesOfPage = invertIdPages(menu.meta.processes);
  const journeyById = new Map(sources.journeys.map(journey => [journey.journeyId, journey]));
  const entityById = new Map(sources.entities.map(entity => [entity.entityId, entity]));
  const beyond = collectBeyondJourneys(sources, grants, processes);
  const homeIds = homePageIds(menu, pages, journeysOfPage);
  const processById = new Map(processes.map(process => [process.processId, process]));

  const out: P2NeedsPage[] = [];
  for (const page of pages) {
    const actors = actorsOfPage.get(page.id) || [];
    if (homeIds.has(page.id)) {
      out.push(finishPage(page.id, actors, homeReads(page, actors, beyond, entityById, grants, sources), []));
      continue;
    }

    const reads = new Map<string, P2NeedsRead>();
    const writes = new Map<string, P2NeedsWrite>();
    const addRead = (entityId: string, from: string) => {
      pushRead(reads, entityId, from, entityById, grants, actors, sources);
    };
    const addWrite = (entityId: string, operation: P2NeedsOperation, transitionRef: string, from: string) => {
      pushWrite(writes, entityId, operation, transitionRef, from);
    };

    for (const journeyId of journeysOfPage.get(page.id) || []) {
      const journey = journeyById.get(journeyId);
      if (!journey) continue;
      for (const step of journey.steps) {
        const from = journeyFrom(step.stepId, journey, sources);
        if (READ_STEP_KINDS.has(step.kind) && step.entity) addRead(step.entity, from);
        if (step.kind !== 'act' || !step.entity) continue;
        addRead(step.entity, from);
        const operation = isP2NeedsOperation(step.effect || '') ? step.effect as P2NeedsOperation : '';
        if (!operation) continue;
        addWrite(step.entity, operation, operation === 'transition' ? (step.transitionRef || '') : '', from);
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

    if (hasOrganism(page, 'form') && (journeysOfPage.get(page.id) || []).length === 0) {
      for (const entity of crudReachedBy(actors, grants, sources)) {
        addRead(entity.entityId, 'organism:form');
        addWrite(entity.entityId, 'create', '', 'organism:form');
        addWrite(entity.entityId, 'update', '', 'organism:form');
      }
    }

    out.push(finishPage(page.id, actors, [...reads.values()], [...writes.values()]));
  }
  return out;
}

function homeReads(
  page: MenuStampedPageNode,
  actors: readonly string[],
  beyond: ReturnType<typeof collectBeyondJourneys>,
  entityById: Map<string, P2OntologyEntityView>,
  grants: readonly P2GrantView[],
  sources: P2L4Sources,
): P2NeedsRead[] {
  const reads = new Map<string, P2NeedsRead>();
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
  return [...reads.values()];
}

function pushRead(
  reads: Map<string, P2NeedsRead>,
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
  const scope = p2WidestScope(scopeModes(actors, entityId, grants));
  if (!scope) return;
  const derived = derivedFieldNames(entityId, sources);
  const current = reads.get(entityId);
  if (!current) {
    reads.set(entityId, {
      entity: entityId,
      family,
      scope,
      derived,
      from: mergeFrom([from]),
    });
    return;
  }
  current.scope = p2WidestScope([current.scope, scope]) || current.scope;
  current.from = mergeFrom([...current.from, from]);
  current.derived = mergeNames([...current.derived, ...derived]);
}

function pushWrite(
  writes: Map<string, P2NeedsWrite>,
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
  reads: P2NeedsRead[],
  writes: P2NeedsWrite[],
): P2NeedsPage {
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

function scopeModes(actors: readonly string[], entityId: string, grants: readonly P2GrantView[]): string[] {
  const modes: string[] = [];
  for (const grant of grants) {
    if (!actors.includes(grant.actorRef)) continue;
    if (!grant.entityRefs.includes(entityId)) continue;
    if (grant.dataScope.mode) modes.push(grant.dataScope.mode);
  }
  return modes;
}

function crudReachedBy(
  actors: readonly string[],
  grants: readonly P2GrantView[],
  sources: P2L4Sources,
): P2OntologyEntityView[] {
  const crud = new Set(
    sources.entities.filter(entity => entity.writer === 'crud' && entity.entityId).map(entity => entity.entityId),
  );
  const reached = new Set<string>();
  for (const grant of grants) {
    if (!actors.includes(grant.actorRef)) continue;
    for (const entityRef of grant.entityRefs) {
      if (crud.has(entityRef)) reached.add(entityRef);
    }
  }
  return sources.entities.filter(entity => reached.has(entity.entityId));
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
  menu: P2MenuFile,
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

function firstVisiblePage(menu: P2MenuFile, actorRef: string, pageIds: Set<string>): string {
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

function pageActors(menu: P2MenuFile, pages: readonly MenuStampedPageNode[]): Map<string, string[]> {
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
