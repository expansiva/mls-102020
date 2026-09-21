/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/contracts.ts" enhancement="_blank"/>

import type { PoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  P2_MENU_DEVICE,
  type P2MenuDevice,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  type MenuAction,
  type MenuStampedNode,
  type MenuStampedPageNode,
  type P2MenuFile,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import type { P2NeedsFile, P2NeedsPage } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';

export const P2_EFFORT_SCHEMA_VERSION = '2026-09-21-p2-effort-v1.1' as const;
export const P2_L4DIFF_SCHEMA = '2026-09-21-p4-l4diff-v1' as const;
export const P2_BACKEND_SCHEMA_VERSION = '2026-09-21-p1-backend-v1' as const;
export const P2_EFFORT_ARTIFACT = 'pool/l2/web/effort.json' as const;

/**
 * Subset of OwnerStatus in mls-102021/l2/agentChangeBackend/helpers/cbShared.ts:95
 * (`'toCreate' | 'toUpdate' | 'toRemove' | 'inProgress' | 'done'`, ALL_STATUSES at :105).
 * `inProgress` is left out on purpose — effort.json is a review snapshot, never a live run.
 * Do not import OwnerStatus from mls-102021.
 */
export const P2_EFFORT_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'done'] as const;
export type P2EffortStatus = typeof P2_EFFORT_STATUSES[number];

export const P2_EFFORT_ENDPOINT_KINDS = ['qry', 'cmd'] as const;
export type P2EffortEndpointKind = typeof P2_EFFORT_ENDPOINT_KINDS[number];

export const P2_EFFORT_REMOVED_KINDS = ['endpoint', 'usecase', 'table'] as const;
export type P2EffortRemovedKind = typeof P2_EFFORT_REMOVED_KINDS[number];

const ACTION_TO_STATUS: Record<MenuAction, P2EffortStatus> = {
  new: 'toCreate',
  change: 'toUpdate',
  remove: 'toRemove',
  keep: 'done',
};

export interface P2EffortTotalsBucket {
  toCreate: number;
  toUpdate: number;
  toRemove: number;
  done: number;
}

export interface P2EffortTotals {
  screens: P2EffortTotalsBucket;
  endpoints: P2EffortTotalsBucket;
  usecases: P2EffortTotalsBucket;
  tables: P2EffortTotalsBucket;
}

export interface P2EffortScreen {
  pageId: string;
  label: string;
  actors: string[];
  status: P2EffortStatus;
  endpoints: string[];
}

export interface P2EffortEndpoint {
  route: string;
  page: string;
  kind: P2EffortEndpointKind;
  usecaseRef: string;
  status: P2EffortStatus;
}

export interface P2EffortUsecase {
  usecaseId: string;
  entity: string;
  operation: string;
  status: P2EffortStatus;
  existing: string;
}

export interface P2EffortTable {
  tableId: string;
  entity: string;
  status: P2EffortStatus;
}

export interface P2EffortRemoved {
  kind: P2EffortRemovedKind;
  id: string;
  status: 'toRemove';
}

/** l4diff item that did not reach any page. Reader: the person, in this JSON. */
export interface P2EffortUnattributed {
  changeId: string;
  kind: string;
  op: string;
  reason: string;
}

export interface P2EffortFile {
  schemaVersion: typeof P2_EFFORT_SCHEMA_VERSION;
  moduleName: string;
  device: P2MenuDevice;
  totals: P2EffortTotals;
  screens: P2EffortScreen[];
  endpoints: P2EffortEndpoint[];
  usecases: P2EffortUsecase[];
  tables: P2EffortTable[];
  removed: P2EffortRemoved[];
  unattributed: P2EffortUnattributed[];
  meta: { sourceMenu: string; sourceBackend: string; generatedAt: string };
}

export interface P2EffortL4DiffItem {
  changeId: string;
  kind: string;
  op: string;
  entity: string;
  source: string;
}

export interface P2EffortL4DiffFile {
  schemaVersion: string;
  moduleName: string;
  base: string;
  candidate: string;
  items: P2EffortL4DiffItem[];
}

export interface P2BuildEffortCandidate {
  canonicalMenu: P2MenuFile | null;
  l4diff: P2EffortL4DiffFile;
  needs: P2NeedsFile;
  entityRules: ReadonlyMap<string, readonly string[]>;
}

export interface P2BackendEndpoint {
  route: string;
  page: string;
  kind: P2EffortEndpointKind;
  usecaseRef: string;
  status: P2EffortStatus;
}

export interface P2BackendUsecase {
  usecaseId: string;
  entity: string;
  operation: string;
  status: P2EffortStatus;
  existing: string;
}

export interface P2BackendTable {
  tableId: string;
  entity: string;
  status: P2EffortStatus;
}

export interface P2BackendRemoved {
  kind: P2EffortRemovedKind;
  id: string;
  status: 'toRemove';
}

export interface P2BackendFile {
  schemaVersion: string;
  moduleName: string;
  device: P2MenuDevice;
  endpoints: P2BackendEndpoint[];
  usecases: P2BackendUsecase[];
  tables: P2BackendTable[];
  removed: P2BackendRemoved[];
}

export interface P2BuildEffortInput {
  menu: P2MenuFile;
  backend: P2BackendFile;
  now: Date;
  /** Present only in `/candidate`. Screen status then comes from canonical + l4diff, not menu action. */
  candidate?: P2BuildEffortCandidate;
}

export function isP2EffortStatus(value: string): value is P2EffortStatus {
  return (P2_EFFORT_STATUSES as readonly string[]).includes(value);
}

export function isP2EffortEndpointKind(value: string): value is P2EffortEndpointKind {
  return (P2_EFFORT_ENDPOINT_KINDS as readonly string[]).includes(value);
}

export function isP2EffortRemovedKind(value: string): value is P2EffortRemovedKind {
  return (P2_EFFORT_REMOVED_KINDS as readonly string[]).includes(value);
}

export function p2StatusFromMenuAction(action: MenuAction): P2EffortStatus {
  return ACTION_TO_STATUS[action];
}

export function emptyP2EffortTotalsBucket(): P2EffortTotalsBucket {
  return { toCreate: 0, toUpdate: 0, toRemove: 0, done: 0 };
}

export function countP2EffortStatuses(rows: readonly { status: P2EffortStatus }[]): P2EffortTotalsBucket {
  const totals = emptyP2EffortTotalsBucket();
  for (const row of rows) totals[row.status] += 1;
  return totals;
}

export function p2EffortSubject(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): string {
  return `effort of ${moduleName} (${device}) ready`;
}

export function p2EffortBody(file: P2EffortFile): string {
  const { screens, endpoints, usecases, tables } = file.totals;
  return [
    `screens ${formatBucket(screens)}`,
    `endpoints ${formatBucket(endpoints)}`,
    `usecases ${formatBucket(usecases)}`,
    `tables ${formatBucket(tables)}`,
  ].join('\n');
}

function formatBucket(bucket: P2EffortTotalsBucket): string {
  return P2_EFFORT_STATUSES.map(status => `${status}:${bucket[status]}`).join(' ');
}

export function buildP2EffortFile(input: P2BuildEffortInput): P2EffortFile {
  const device = input.menu.device || input.backend.device || P2_MENU_DEVICE;
  const endpoints = input.backend.endpoints.map(copyEndpoint);
  const usecases = input.backend.usecases.map(copyUsecase);
  const tables = input.backend.tables.map(copyTable);
  const removed = input.backend.removed.map(copyRemoved);
  const attributed = input.candidate
    ? attributeL4Diff(input.candidate.l4diff.items, input.candidate.needs, input.candidate.entityRules)
    : { pageIds: new Set<string>(), unattributed: [] as P2EffortUnattributed[] };
  const screens = input.candidate
    ? collectScreensFromL4Diff(input.menu, endpoints, input.candidate, attributed.pageIds)
    : collectScreens(input.menu, endpoints);
  return {
    schemaVersion: P2_EFFORT_SCHEMA_VERSION,
    moduleName: input.menu.moduleName || input.backend.moduleName,
    device,
    totals: {
      screens: countP2EffortStatuses(screens),
      endpoints: countP2EffortStatuses(endpoints),
      usecases: countP2EffortStatuses(usecases),
      tables: countP2EffortStatuses(tables),
    },
    screens,
    endpoints,
    usecases,
    tables,
    removed,
    unattributed: attributed.unattributed,
    meta: {
      sourceMenu: `pool/l2/${device}/menu.json`,
      sourceBackend: `pool/l2/${device}/backend.json`,
      generatedAt: input.now.toISOString(),
    },
  };
}

export function buildP2EffortMessage(input: {
  file: P2EffortFile;
  received: Pick<PoolMessage, 'thread' | 'round' | 'mode'>;
}): PoolMessage {
  return {
    from: 'l2',
    to: 'l4',
    thread: input.received.thread,
    round: input.received.round,
    mode: input.received.mode,
    subject: p2EffortSubject(input.file.moduleName, input.file.device),
    artifacts: [P2_EFFORT_ARTIFACT],
    body: p2EffortBody(input.file),
  };
}

export function parseP2BackendFile(value: unknown): P2BackendFile {
  if (!isRecord(value)) throw new Error('backend.json must be an object.');
  const device = typeof value.device === 'string' && value.device.trim() ? value.device.trim() : P2_MENU_DEVICE;
  if (device !== P2_MENU_DEVICE) throw new Error(`backend.json device must be ${P2_MENU_DEVICE}.`);
  return {
    schemaVersion: text(value.schemaVersion) || P2_BACKEND_SCHEMA_VERSION,
    moduleName: text(value.moduleName),
    device,
    endpoints: asArray(value.endpoints).map((item, index) => parseEndpoint(item, index)),
    usecases: asArray(value.usecases).map((item, index) => parseUsecase(item, index)),
    tables: asArray(value.tables).map((item, index) => parseTable(item, index)),
    removed: asArray(value.removed).map((item, index) => parseRemoved(item, index)),
  };
}

export function parseP2L4DiffFile(value: unknown): P2EffortL4DiffFile {
  if (!isRecord(value)) throw new Error('l4diff.json must be an object.');
  return {
    schemaVersion: text(value.schemaVersion) || P2_L4DIFF_SCHEMA,
    moduleName: text(value.moduleName),
    base: text(value.base),
    candidate: text(value.candidate),
    items: asArray(value.items).map((item, index) => parseL4DiffItem(item, index)),
  };
}

export function p2EntityRulesMap(
  entities: readonly { entityId: string; rules?: readonly string[] }[],
): Map<string, readonly string[]> {
  const out = new Map<string, readonly string[]>();
  for (const entity of entities) {
    if (!entity.entityId) continue;
    out.set(entity.entityId, [...(entity.rules || [])]);
  }
  return out;
}

export function attributeL4Diff(
  items: readonly P2EffortL4DiffItem[],
  needs: P2NeedsFile,
  entityRules: ReadonlyMap<string, readonly string[]>,
): { pageIds: Set<string>; unattributed: P2EffortUnattributed[] } {
  const pageIds = new Set<string>();
  const unattributed: P2EffortUnattributed[] = [];
  for (const item of items) {
    const cited = pagesCitingChange(item, needs, entityRules);
    if (cited.length === 0) {
      unattributed.push({
        changeId: item.changeId,
        kind: item.kind,
        op: item.op,
        reason: unattributedReason(item, entityRules),
      });
      continue;
    }
    for (const pageId of cited) pageIds.add(pageId);
  }
  return { pageIds, unattributed };
}

function collectScreensFromL4Diff(
  menu: P2MenuFile,
  endpoints: readonly P2EffortEndpoint[],
  candidate: P2BuildEffortCandidate,
  updatedIds: ReadonlySet<string>,
): P2EffortScreen[] {
  const pages = stampedPages(menu.tree);
  const canonicalPages = candidate.canonicalMenu ? stampedPages(candidate.canonicalMenu.tree) : [];
  const canonicalIds = new Set(canonicalPages.map(page => page.id));
  const actorsOfPage = pageActors(menu, pages);
  const canonicalActors = candidate.canonicalMenu
    ? pageActors(candidate.canonicalMenu, canonicalPages)
    : new Map<string, string[]>();
  const routesByPage = routesByPageId(endpoints);
  const seen = new Set<string>();
  const screens: P2EffortScreen[] = [];
  for (const page of pages) {
    seen.add(page.id);
    const status: P2EffortStatus = !canonicalIds.has(page.id)
      ? 'toCreate'
      : updatedIds.has(page.id) ? 'toUpdate' : 'done';
    screens.push({
      pageId: page.id,
      label: page.label,
      actors: actorsOfPage.get(page.id) || [],
      status,
      endpoints: routesByPage.get(page.id) || [],
    });
  }
  for (const page of canonicalPages) {
    if (seen.has(page.id)) continue;
    seen.add(page.id);
    screens.push({
      pageId: page.id,
      label: page.label,
      actors: canonicalActors.get(page.id) || [],
      status: 'toRemove',
      endpoints: routesByPage.get(page.id) || [],
    });
  }
  return screens;
}

function collectScreens(menu: P2MenuFile, endpoints: readonly P2EffortEndpoint[]): P2EffortScreen[] {
  const pages = stampedPages(menu.tree);
  const actorsOfPage = pageActors(menu, pages);
  const routesByPage = routesByPageId(endpoints);
  const seen = new Set<string>();
  const screens: P2EffortScreen[] = [];
  for (const page of pages) {
    seen.add(page.id);
    screens.push({
      pageId: page.id,
      label: page.label,
      actors: actorsOfPage.get(page.id) || [],
      status: p2StatusFromMenuAction(page.action),
      endpoints: routesByPage.get(page.id) || [],
    });
  }
  for (const node of menu.meta.removed) {
    for (const page of stampedPages([node])) {
      if (seen.has(page.id)) continue;
      seen.add(page.id);
      screens.push({
        pageId: page.id,
        label: page.label,
        actors: actorsOfPage.get(page.id) || [],
        status: 'toRemove',
        endpoints: routesByPage.get(page.id) || [],
      });
    }
  }
  return screens;
}

function routesByPageId(endpoints: readonly P2EffortEndpoint[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const endpoint of endpoints) {
    const list = out.get(endpoint.page) || [];
    if (!list.includes(endpoint.route)) list.push(endpoint.route);
    out.set(endpoint.page, list);
  }
  return out;
}

function copyEndpoint(item: P2BackendEndpoint): P2EffortEndpoint {
  return {
    route: item.route,
    page: item.page,
    kind: item.kind,
    usecaseRef: item.usecaseRef,
    status: item.status,
  };
}

function copyUsecase(item: P2BackendUsecase): P2EffortUsecase {
  return {
    usecaseId: item.usecaseId,
    entity: item.entity,
    operation: item.operation,
    status: item.status,
    existing: item.existing,
  };
}

function copyTable(item: P2BackendTable): P2EffortTable {
  return {
    tableId: item.tableId,
    entity: item.entity,
    status: item.status,
  };
}

function copyRemoved(item: P2BackendRemoved): P2EffortRemoved {
  return {
    kind: item.kind,
    id: item.id,
    status: 'toRemove',
  };
}

function parseEndpoint(value: unknown, index: number): P2BackendEndpoint {
  if (!isRecord(value)) throw new Error(`backend.json endpoints[${index}] must be an object.`);
  return {
    route: requiredText(value.route, `endpoints[${index}].route`),
    page: requiredText(value.page, `endpoints[${index}].page`),
    kind: parseKind(value.kind, `endpoints[${index}].kind`),
    usecaseRef: requiredText(value.usecaseRef, `endpoints[${index}].usecaseRef`),
    status: parseStatus(value.status, `endpoints[${index}].status`),
  };
}

function parseUsecase(value: unknown, index: number): P2BackendUsecase {
  if (!isRecord(value)) throw new Error(`backend.json usecases[${index}] must be an object.`);
  return {
    usecaseId: requiredText(value.usecaseId, `usecases[${index}].usecaseId`),
    entity: requiredText(value.entity, `usecases[${index}].entity`),
    operation: requiredText(value.operation, `usecases[${index}].operation`),
    status: parseStatus(value.status, `usecases[${index}].status`),
    existing: text(value.existing),
  };
}

function parseTable(value: unknown, index: number): P2BackendTable {
  if (!isRecord(value)) throw new Error(`backend.json tables[${index}] must be an object.`);
  return {
    tableId: requiredText(value.tableId, `tables[${index}].tableId`),
    entity: requiredText(value.entity, `tables[${index}].entity`),
    status: parseStatus(value.status, `tables[${index}].status`),
  };
}

function parseRemoved(value: unknown, index: number): P2BackendRemoved {
  if (!isRecord(value)) throw new Error(`backend.json removed[${index}] must be an object.`);
  const kind = requiredText(value.kind, `removed[${index}].kind`);
  if (!isP2EffortRemovedKind(kind)) {
    throw new Error(`backend.json removed[${index}].kind must be ${P2_EFFORT_REMOVED_KINDS.join('|')}.`);
  }
  const status = parseStatus(value.status, `removed[${index}].status`);
  if (status !== 'toRemove') {
    throw new Error(`backend.json removed[${index}].status must be toRemove.`);
  }
  return { kind, id: requiredText(value.id, `removed[${index}].id`), status };
}

function parseStatus(value: unknown, path: string): P2EffortStatus {
  const status = requiredText(value, path);
  if (!isP2EffortStatus(status)) {
    throw new Error(`backend.json ${path} must be ${P2_EFFORT_STATUSES.join('|')}.`);
  }
  return status;
}

function parseKind(value: unknown, path: string): P2EffortEndpointKind {
  const kind = requiredText(value, path);
  if (!isP2EffortEndpointKind(kind)) {
    throw new Error(`backend.json ${path} must be ${P2_EFFORT_ENDPOINT_KINDS.join('|')}.`);
  }
  return kind;
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

function pageActors(menu: P2MenuFile, pages: readonly MenuStampedPageNode[]): Map<string, string[]> {
  const pageIds = new Set(pages.map(page => page.id));
  const out = new Map<string, string[]>();
  for (const page of pages) out.set(page.id, []);
  const byId = indexTree(menu.tree);
  for (const [key, listed] of Object.entries(menu.authorities)) {
    const actorRef = actorFromKey(key);
    if (!actorRef) continue;
    const visible = new Set<string>();
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

function actorFromKey(key: string): string {
  return key.startsWith('actor:') ? key.slice('actor:'.length) : '';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredText(value: unknown, path: string): string {
  const out = text(value);
  if (!out) throw new Error(`backend.json ${path} is required.`);
  return out;
}

function parseL4DiffItem(value: unknown, index: number): P2EffortL4DiffItem {
  if (!isRecord(value)) throw new Error(`l4diff.json items[${index}] must be an object.`);
  return {
    changeId: requiredDiffText(value.changeId, `items[${index}].changeId`),
    kind: requiredDiffText(value.kind, `items[${index}].kind`),
    op: requiredDiffText(value.op, `items[${index}].op`),
    entity: text(value.entity),
    source: text(value.source),
  };
}

function requiredDiffText(value: unknown, path: string): string {
  const out = text(value);
  if (!out) throw new Error(`l4diff.json ${path} is required.`);
  return out;
}

function pagesCitingChange(
  item: P2EffortL4DiffItem,
  needs: P2NeedsFile,
  entityRules: ReadonlyMap<string, readonly string[]>,
): string[] {
  if (item.kind === 'rule') {
    const ruleId = stripKindPrefix(item.changeId, 'rule');
    const entities = entitiesDeclaringRule(ruleId, entityRules);
    if (entities.size === 0) return [];
    return needs.pages.filter(page => pageCitesAnyEntity(page, entities)).map(page => page.pageId);
  }
  if (item.kind === 'transition') {
    const transitionId = stripKindPrefix(item.changeId, 'transition');
    const byRef = needs.pages.filter(page => page.writes.some(write => write.transitionRef === transitionId));
    if (byRef.length) return byRef.map(page => page.pageId);
    if (item.entity) return needs.pages.filter(page => pageCitesEntity(page, item.entity)).map(page => page.pageId);
    return [];
  }
  if (item.kind === 'process') {
    const processId = stripKindPrefix(item.changeId, 'process');
    const marker = `process:${processId}`;
    const byFrom = needs.pages.filter(page => pageCitesFrom(page, marker));
    if (byFrom.length) return byFrom.map(page => page.pageId);
  }
  const entityId = item.entity || (item.kind === 'entity' ? stripKindPrefix(item.changeId, 'entity') : '');
  if (!entityId) return [];
  return needs.pages.filter(page => pageCitesEntity(page, entityId)).map(page => page.pageId);
}

function unattributedReason(
  item: P2EffortL4DiffItem,
  entityRules: ReadonlyMap<string, readonly string[]>,
): string {
  if (item.kind === 'rule') {
    const ruleId = stripKindPrefix(item.changeId, 'rule');
    const declared = entitiesDeclaringRule(ruleId, entityRules);
    if (declared.size === 0) return `rule '${ruleId}' is not in any entity.rules[]`;
    return `rule '${ruleId}' is declared on ${[...declared].join(', ')} but no page reads or writes those entities`;
  }
  if (item.kind === 'transition') {
    return `transition '${stripKindPrefix(item.changeId, 'transition')}' is not in any page writes.transitionRef`;
  }
  if (!item.entity) return `${item.kind} '${item.changeId}' has empty entity and cites no page`;
  return `entity '${item.entity}' is not read or written by any page`;
}

function entitiesDeclaringRule(
  ruleId: string,
  entityRules: ReadonlyMap<string, readonly string[]>,
): Set<string> {
  const out = new Set<string>();
  if (!ruleId) return out;
  for (const [entityId, rules] of entityRules) {
    if (rules.includes(ruleId)) out.add(entityId);
  }
  return out;
}

function pageCitesEntity(page: P2NeedsPage, entityId: string): boolean {
  return page.reads.some(read => read.entity === entityId) || page.writes.some(write => write.entity === entityId);
}

function pageCitesAnyEntity(page: P2NeedsPage, entities: ReadonlySet<string>): boolean {
  return page.reads.some(read => entities.has(read.entity)) || page.writes.some(write => entities.has(write.entity));
}

function pageCitesFrom(page: P2NeedsPage, marker: string): boolean {
  return page.reads.some(read => read.from.includes(marker)) || page.writes.some(write => write.from.includes(marker));
}

function stripKindPrefix(changeId: string, kind: string): string {
  const prefix = `${kind}:`;
  return changeId.startsWith(prefix) ? changeId.slice(prefix.length) : changeId;
}
