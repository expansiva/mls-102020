/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/gate.ts" enhancement="_blank"/>

import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import {
  D2_INPUT_VERSION,
  D2InputValidationError,
  type D2AncestorContext,
  type D2Destination,
  type D2EffortStatus,
  type D2InputArtifacts,
  type D2InputProblem,
  type D2InputSnapshot,
  type D2SelectedPage,
} from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

const SUPPORTED = {
  module: '2026-09-10-ns5-module-v2',
  journey: '2026-09-10-ns5-journey-v1',
  ontology: '2026-09-17-ns5-ontology-v3.1',
  rules: '2026-09-16-ns5-rules-v2',
  workflows: '2026-09-17-ns5-workflows-v3',
  access: '2026-09-12-ns5-access-v3',
  integration: '2026-09-12-ns5-integration-v2',
  menu: '2026-09-20-p2-menu-v2.2',
  needs: '2026-09-21-p2-needs-v1',
  backend: '2026-09-21-p1-backend-v1.1',
  effort: '2026-09-21-p2-effort-v1.1',
} as const;

interface MenuPage {
  pageId: string;
  node: Record<string, unknown>;
  ancestors: D2AncestorContext[];
}

interface GateState {
  errors: D2InputProblem[];
  problems: D2InputProblem[];
  normalizations: Array<{ code: string; detail: string }>;
}

export async function buildD2InputSnapshot(
  identity: D2RunIdentity,
  artifacts: D2InputArtifacts,
  previous: D2InputSnapshot | null = null,
): Promise<D2InputSnapshot> {
  const state: GateState = { errors: [], problems: [], normalizations: [] };
  const module = rec(artifacts.module);
  const journeyIndex = rec(artifacts.journeyIndex);
  const ontologyIndex = rec(artifacts.ontologyIndex);
  const rules = rec(artifacts.rules);
  const workflows = rec(artifacts.workflows);
  const access = rec(artifacts.access);
  const integration = rec(artifacts.integration);
  const menu = rec(artifacts.menu);
  const needs = rec(artifacts.needs);
  const backend = rec(artifacts.backend);
  const effort = rec(artifacts.effort);

  checkVersion(state, module, SUPPORTED.module, 'l4/module.defs.ts');
  checkVersion(state, journeyIndex, SUPPORTED.journey, 'l4/journeys/index.defs.ts');
  checkVersion(state, ontologyIndex, SUPPORTED.ontology, 'l4/ontology/index.defs.ts');
  checkVersion(state, rules, SUPPORTED.rules, 'l4/rules.defs.ts');
  checkVersion(state, workflows, SUPPORTED.workflows, 'l4/workflows.defs.ts');
  checkVersion(state, access, SUPPORTED.access, 'l4/access.defs.ts');
  checkVersion(state, integration, SUPPORTED.integration, 'l4/integration.defs.ts');
  checkVersion(state, menu, SUPPORTED.menu, 'pool/l2/web/menu.json');
  checkVersion(state, needs, SUPPORTED.needs, 'pool/l1/web/needs.json');
  checkVersion(state, backend, SUPPORTED.backend, 'pool/l2/web/backend.json');
  checkVersion(state, effort, SUPPORTED.effort, 'pool/l2/web/effort.json');

  for (const [file, value] of [
    ['l4/module.defs.ts', module], ['l4/journeys/index.defs.ts', journeyIndex],
    ['l4/ontology/index.defs.ts', ontologyIndex], ['l4/rules.defs.ts', rules],
    ['l4/workflows.defs.ts', workflows], ['l4/access.defs.ts', access],
    ['l4/integration.defs.ts', integration], ['pool/l2/web/menu.json', menu],
    ['pool/l1/web/needs.json', needs], ['pool/l2/web/backend.json', backend],
    ['pool/l2/web/effort.json', effort],
  ] as const) checkIdentity(state, value, identity.module, file);

  for (const [file, value] of [
    ['pool/l2/web/menu.json', menu], ['pool/l1/web/needs.json', needs],
    ['pool/l2/web/backend.json', backend], ['pool/l2/web/effort.json', effort],
  ] as const) {
    if (text(value.device) !== 'web') error(state, 'UNSUPPORTED_DEVICE', file, `device must be web, got '${text(value.device)}'`);
  }
  if (text(needs.menuSchema) !== SUPPORTED.menu) {
    error(state, 'MENU_SCHEMA_MISMATCH', 'pool/l1/web/needs.json', `menuSchema must be ${SUPPORTED.menu}`);
  }

  const journeyIds = uniqueIds(state, rows(journeyIndex.journeys), 'journeyId', 'l4/journeys/index.defs.ts');
  const entityIds = uniqueIds(state, rows(ontologyIndex.entities), 'entityId', 'l4/ontology/index.defs.ts');
  validateResolvedFiles(state, identity, artifacts.journeys, journeyIds, 'journeyId', SUPPORTED.journey, 'l4/journeys');
  validateResolvedFiles(state, identity, artifacts.entities, entityIds, 'entityId', SUPPORTED.ontology, 'l4/ontology');

  const menuScan = scanMenu(state, menu);
  const authority = expandAuthorities(state, menu, menuScan);
  const journeyRefsByPage = menuJourneys(state, menu, journeyIds, menuScan.pages);
  const needRows = indexedRows(state, rows(needs.pages), 'pageId', 'pool/l1/web/needs.json');
  const effortScreens = indexedRows(state, rows(effort.screens), 'pageId', 'pool/l2/web/effort.json');
  const backendEndpoints = indexedRows(state, rows(backend.endpoints), 'route', 'pool/l2/web/backend.json');
  const backendUsecases = indexedRows(state, rows(backend.usecases), 'usecaseId', 'pool/l2/web/backend.json');
  const effortEndpoints = indexedRows(state, rows(effort.endpoints), 'route', 'pool/l2/web/effort.json');
  const effortUsecases = indexedRows(state, rows(effort.usecases), 'usecaseId', 'pool/l2/web/effort.json');
  const effortTables = indexedRows(state, rows(effort.tables), 'tableId', 'pool/l2/web/effort.json');

  validatePageSets(state, menuScan.pages, needRows, effortScreens);
  validateNeeds(state, needRows, entityIds, journeyIds);
  validateBackend(state, identity, menuScan.pages, entityIds, backendEndpoints, backendUsecases);
  validateEffort(state, effort, effortScreens, effortEndpoints, effortUsecases, effortTables, backendEndpoints, backendUsecases);

  const previousPages = new Map((previous?.selection.pages || []).map(page => [page.pageId, page]));
  const removeRows = [...effortScreens.values()].filter(row => text(row.status) === 'toRemove');
  const removedMeta = new Set(strings(rec(menu.meta).removed));
  const remove = removeRows.map(row => {
    const pageId = text(row.pageId);
    const prior = previousPages.get(pageId);
    if (!removedMeta.has(pageId)) error(state, 'REMOVED_PAGE_NOT_IN_MENU_META', 'pool/l2/web/menu.json', 'toRemove page is absent from meta.removed', pageId);
    if (!prior) error(state, 'REMOVED_PAGE_NOT_IN_INVENTORY', 'l2/pipeline/agentDefsL2/input.json', 'toRemove page has no prior owned inventory', pageId);
    return { pageId, status: 'toRemove' as const, destinations: prior?.destinations || [] };
  });
  for (const pageId of removedMeta) {
    if (!removeRows.some(row => text(row.pageId) === pageId)) {
      error(state, 'MENU_REMOVED_WITHOUT_EFFORT', 'pool/l2/web/menu.json', 'meta.removed page is not toRemove in effort', pageId);
    }
  }

  const pages: D2SelectedPage[] = [];
  for (const page of menuScan.pages.values()) {
    const pageId = page.pageId;
    const need = needRows.get(pageId) || {};
    const effortRow = effortScreens.get(pageId) || {};
    const status = effortStatus(state, effortRow.status, pageId);
    if (status === 'toRemove') continue;
    const endpointRows = [...backendEndpoints.values()].filter(endpoint => text(endpoint.page) === pageId)
      .sort((left, right) => text(left.route).localeCompare(text(right.route)));
    const usecaseIds = new Set(endpointRows.map(endpoint => text(endpoint.usecaseRef)).filter(Boolean));
    const destinations = destinationsFor(identity, pageId);
    pages.push({
      pageId,
      status,
      label: text(page.node.label),
      actors: unique([...strings(need.actors), ...(authority.actorsByPage.get(pageId) || [])]),
      authorityRefs: authority.refsByPage.get(pageId) || [],
      ancestors: page.ancestors,
      journeyRefs: journeyRefsByPage.get(pageId) || [],
      organisms: arr(page.node.organisms),
      reads: arr(need.reads),
      writes: arr(need.writes),
      endpoints: endpointRows,
      usecases: [...usecaseIds].map(id => backendUsecases.get(id) || {}).filter(row => Object.keys(row).length > 0),
      destinations,
    });
    if (endpointRows.length === 0 && arr(page.node.organisms).length > 0) {
      review(state, 'PAGE_WITHOUT_ENDPOINTS', 'pool/l2/web/backend.json', 'Page has declared organisms but no endpoint; static content may be valid and requires review.', pageId);
    }
  }
  pages.sort((left, right) => left.pageId.localeCompare(right.pageId));
  validateDestinationCollisions(state, pages, remove);
  semanticAccessFindings(state, access, entityIds, pages);
  semanticPageScopeFindings(state, pages);

  state.problems.push({
    severity: 'info',
    code: 'NO_COMMON_RELEASE_IDENTITY',
    file: 'input20',
    message: 'Sources have content hashes and structural consistency checks, but no shared release identity exists across all planners.',
  });
  if (hasMenuActions(menu)) state.normalizations.push({ code: 'menu-action-ignored', detail: 'effort.screens is the only selection authority' });
  if (authority.deduplicated > 0) state.normalizations.push({ code: 'authority-descendants-deduplicated', detail: `${authority.deduplicated} duplicate page grant(s) collapsed` });

  if (state.errors.length) throw new D2InputValidationError(state.errors);
  const l4 = resolvedL4(artifacts, journeyIds, entityIds);
  const draft = {
    schemaVersion: D2_INPUT_VERSION,
    project: identity.project,
    module: identity.module,
    device: 'web' as const,
    releaseIdentity: null,
    sources: [...artifacts.sources].sort((left, right) => left.path.localeCompare(right.path)),
    l4,
    selection: {
      pages,
      writePageIds: pages.filter(page => page.status === 'toCreate' || page.status === 'toUpdate').map(page => page.pageId),
      preservePageIds: pages.filter(page => page.status === 'done').map(page => page.pageId),
      remove,
      counts: {
        pages: pages.length,
        endpoints: backendEndpoints.size,
        usecases: backendUsecases.size,
        destinations: pages.length * 4,
        materializationItems: pages.length * 3,
      },
    },
    normalizations: state.normalizations,
    problems: state.problems,
  };
  const snapshotHash = await stableHash(draft);
  return { ...draft, snapshotHash };
}

export function destinationsFor(identity: D2RunIdentity, pageId: string): D2Destination[] {
  if (!/^[a-z][A-Za-z0-9_-]*$/.test(pageId)) throw new Error(`unsafe pageId '${pageId}'`);
  const prefix = `${identity.project}:${identity.module}:web:${pageId}`;
  const base = `l2/${identity.module}/web`;
  return [
    { kind: 'contract', path: `${base}/contracts/${pageId}.defs.ts`, artifactId: `${prefix}:contract` },
    { kind: 'shared', path: `${base}/shared/${pageId}.defs.ts`, artifactId: `${prefix}:shared`, materializationId: `${prefix}:shared:materialization` },
    { kind: 'desktopPage', path: `${base}/desktop/page11/${pageId}.defs.ts`, artifactId: `${prefix}:desktop:page11`, materializationId: `${prefix}:desktop:page11:materialization` },
    { kind: 'mobilePage', path: `${base}/mobile/page11/${pageId}.defs.ts`, artifactId: `${prefix}:mobile:page11`, materializationId: `${prefix}:mobile:page11:materialization` },
  ];
}

async function stableHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return `{${Object.keys(source).sort().map(key => `${JSON.stringify(key)}:${stableStringify(source[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function resolvedL4(artifacts: D2InputArtifacts, journeyIds: string[], entityIds: string[]) {
  const byPath = new Map(artifacts.sources.map(source => [source.path, source]));
  const required = (path: string) => {
    const source = byPath.get(path);
    if (!source) throw new Error(`source digest missing: ${path}`);
    return source;
  };
  const module = text(rec(artifacts.module).moduleName);
  return {
    module: required(`l4/${module}/module.defs.ts`),
    journeyIndex: required(`l4/${module}/journeys/index.defs.ts`),
    journeys: journeyIds.map(journeyId => ({ journeyId, source: required(`l4/${module}/journeys/${journeyId}.defs.ts`) })),
    ontologyIndex: required(`l4/${module}/ontology/index.defs.ts`),
    entities: entityIds.map(entityId => ({ entityId, source: required(`l4/${module}/ontology/${entityId}.defs.ts`) })),
    rules: required(`l4/${module}/rules.defs.ts`),
    workflows: required(`l4/${module}/workflows.defs.ts`),
    access: required(`l4/${module}/access.defs.ts`),
    integration: required(`l4/${module}/integration.defs.ts`),
  };
}

function validateResolvedFiles(state: GateState, identity: D2RunIdentity, values: Record<string, unknown>, expected: string[], idKey: string, version: string, folder: string): void {
  const actual = Object.keys(values).sort();
  if (actual.join('\0') !== [...expected].sort().join('\0')) error(state, 'INDEX_FILE_SET_MISMATCH', folder, 'resolved files do not equal index ids');
  for (const id of expected) {
    const value = rec(values[id]);
    checkIdentity(state, value, identity.module, `${folder}/${id}.defs.ts`);
    checkVersion(state, value, version, `${folder}/${id}.defs.ts`);
    if (text(value[idKey]) !== id) error(state, 'INDEX_ID_MISMATCH', `${folder}/${id}.defs.ts`, `${idKey} does not match index id`);
  }
}

function scanMenu(state: GateState, menu: Record<string, unknown>): { pages: Map<string, MenuPage>; nodes: Map<string, Record<string, unknown>>; descendantPages: Map<string, string[]> } {
  const pages = new Map<string, MenuPage>();
  const nodes = new Map<string, Record<string, unknown>>();
  const descendantPages = new Map<string, string[]>();
  const visit = (value: unknown, ancestors: D2AncestorContext[]): string[] => {
    const node = rec(value);
    const id = text(node.id);
    const kind = text(node.kind);
    if (!id) { error(state, 'MENU_ID_MISSING', 'pool/l2/web/menu.json', 'menu node id is missing'); return []; }
    if (nodes.has(id)) { error(state, 'DUPLICATE_ID', 'pool/l2/web/menu.json', `duplicate menu id '${id}'`); return []; }
    nodes.set(id, node);
    const context: D2AncestorContext = { id, kind, label: text(node.label), context: text(node.context) };
    if (kind === 'page') {
      pages.set(id, { pageId: id, node, ancestors });
      descendantPages.set(id, [id]);
      return [id];
    }
    if (kind !== 'hub' && kind !== 'group') error(state, 'MENU_KIND_INVALID', 'pool/l2/web/menu.json', `unsupported kind '${kind}'`, id);
    const descendants = arr(node.children).flatMap(child => visit(child, [...ancestors, context]));
    descendantPages.set(id, unique(descendants));
    return descendants;
  };
  for (const node of arr(menu.tree)) visit(node, []);
  return { pages, nodes, descendantPages };
}

function expandAuthorities(state: GateState, menu: Record<string, unknown>, scan: ReturnType<typeof scanMenu>) {
  const actorsByPage = new Map<string, string[]>();
  const refsByPage = new Map<string, string[]>();
  let deduplicated = 0;
  for (const [key, rawTargets] of Object.entries(rec(menu.authorities))) {
    if (!key.startsWith('actor:')) { error(state, 'AUTHORITY_KEY_INVALID', 'pool/l2/web/menu.json', `authority '${key}' is not actor:*`); continue; }
    const actor = key.slice('actor:'.length);
    const seen = new Set<string>();
    for (const target of strings(rawTargets)) {
      const descendants = scan.descendantPages.get(target);
      if (!descendants) { error(state, 'AUTHORITY_TARGET_MISSING', 'pool/l2/web/menu.json', `authority target '${target}' is missing`); continue; }
      for (const pageId of descendants) {
        if (seen.has(pageId)) { deduplicated += 1; continue; }
        seen.add(pageId);
        actorsByPage.set(pageId, unique([...(actorsByPage.get(pageId) || []), actor]));
        refsByPage.set(pageId, unique([...(refsByPage.get(pageId) || []), key]));
      }
    }
  }
  return { actorsByPage, refsByPage, deduplicated };
}

function menuJourneys(state: GateState, menu: Record<string, unknown>, journeyIds: string[], pages: Map<string, MenuPage>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [journeyId, rawPages] of Object.entries(rec(rec(menu.meta).journeys))) {
    if (!journeyIds.includes(journeyId)) error(state, 'JOURNEY_REF_MISSING', 'pool/l2/web/menu.json', `journey '${journeyId}' is not in the index`);
    for (const pageId of strings(rawPages)) {
      if (!pages.has(pageId)) error(state, 'JOURNEY_PAGE_MISSING', 'pool/l2/web/menu.json', `journey page '${pageId}' is missing`, pageId);
      result.set(pageId, unique([...(result.get(pageId) || []), journeyId]));
    }
  }
  return result;
}

function validatePageSets(state: GateState, pages: Map<string, MenuPage>, needs: Map<string, Record<string, unknown>>, effort: Map<string, Record<string, unknown>>): void {
  for (const pageId of pages.keys()) {
    if (!needs.has(pageId)) error(state, 'PAGE_MISSING_IN_NEEDS', 'pool/l1/web/needs.json', 'live menu page is missing from needs', pageId);
    const screen = effort.get(pageId);
    if (!screen || text(screen.status) === 'toRemove') error(state, 'PAGE_MISSING_IN_EFFORT', 'pool/l2/web/effort.json', 'live menu page is missing from active effort', pageId);
  }
  for (const pageId of needs.keys()) if (!pages.has(pageId)) error(state, 'NEEDS_PAGE_NOT_LIVE', 'pool/l1/web/needs.json', 'needs page is not a live menu page', pageId);
  for (const [pageId, screen] of effort) {
    const status = text(screen.status);
    if (status !== 'toRemove' && !pages.has(pageId)) error(state, 'EFFORT_PAGE_NOT_LIVE', 'pool/l2/web/effort.json', 'active effort page is not a live menu page', pageId);
  }
}

function validateNeeds(state: GateState, needs: Map<string, Record<string, unknown>>, entityIds: string[], journeyIds: string[]): void {
  for (const [pageId, page] of needs) {
    for (const item of [...rows(page.reads), ...rows(page.writes)]) {
      const entity = text(item.entity);
      if (!entityIds.includes(entity)) error(state, 'ENTITY_REF_MISSING', 'pool/l1/web/needs.json', `entity '${entity}' is not in ontology`, pageId);
      for (const source of strings(item.from)) {
        const match = /^journey:([^/]+)/.exec(source);
        if (match && !journeyIds.includes(match[1])) error(state, 'JOURNEY_REF_MISSING', 'pool/l1/web/needs.json', `journey '${match[1]}' is not in the index`, pageId);
      }
    }
  }
}

function validateBackend(state: GateState, identity: D2RunIdentity, pages: Map<string, MenuPage>, entityIds: string[], endpoints: Map<string, Record<string, unknown>>, usecases: Map<string, Record<string, unknown>>): void {
  for (const [usecaseId, usecase] of usecases) {
    const entity = text(usecase.entity);
    if (!entityIds.includes(entity)) error(state, 'ENTITY_REF_MISSING', 'pool/l2/web/backend.json', `usecase '${usecaseId}' entity '${entity}' is missing`);
  }
  for (const [route, endpoint] of endpoints) {
    const pageId = text(endpoint.page);
    if (!pages.has(pageId)) error(state, 'ENDPOINT_PAGE_MISSING', 'pool/l2/web/backend.json', 'endpoint page is not live', pageId, route);
    if (!route.startsWith(`${identity.module}.${pageId}.`)) error(state, 'ROUTE_IDENTITY_MISMATCH', 'pool/l2/web/backend.json', 'route does not match module/page', pageId, route);
    if (!usecases.has(text(endpoint.usecaseRef))) error(state, 'USECASE_REF_MISSING', 'pool/l2/web/backend.json', `usecase '${text(endpoint.usecaseRef)}' is missing`, pageId, route);
  }
}

function validateEffort(state: GateState, effort: Record<string, unknown>, screens: Map<string, Record<string, unknown>>, endpoints: Map<string, Record<string, unknown>>, usecases: Map<string, Record<string, unknown>>, tables: Map<string, Record<string, unknown>>, backendEndpoints: Map<string, Record<string, unknown>>, backendUsecases: Map<string, Record<string, unknown>>): void {
  for (const [route, endpoint] of endpoints) {
    const backend = backendEndpoints.get(route);
    if (!backend) { error(state, 'EFFORT_ROUTE_MISSING_IN_BACKEND', 'pool/l2/web/effort.json', 'effort route is absent from backend', text(endpoint.page), route); continue; }
    if (text(endpoint.page) !== text(backend.page) || text(endpoint.usecaseRef) !== text(backend.usecaseRef)) {
      error(state, 'EFFORT_ENDPOINT_MISMATCH', 'pool/l2/web/effort.json', 'effort endpoint differs from backend', text(endpoint.page), route);
    }
  }
  for (const route of backendEndpoints.keys()) if (!endpoints.has(route)) error(state, 'BACKEND_ROUTE_MISSING_IN_EFFORT', 'pool/l2/web/effort.json', 'backend route is absent from effort', undefined, route);
  for (const id of usecases.keys()) if (!backendUsecases.has(id)) error(state, 'EFFORT_USECASE_MISSING_IN_BACKEND', 'pool/l2/web/effort.json', `usecase '${id}' is absent from backend`);
  for (const id of backendUsecases.keys()) if (!usecases.has(id)) error(state, 'BACKEND_USECASE_MISSING_IN_EFFORT', 'pool/l2/web/effort.json', `usecase '${id}' is absent from effort`);
  for (const [pageId, screen] of screens) {
    const expected = [...endpoints.values()].filter(endpoint => text(endpoint.page) === pageId).map(endpoint => text(endpoint.route)).sort();
    const actual = strings(screen.endpoints).sort();
    if (actual.join('\0') !== expected.join('\0')) error(state, 'SCREEN_ENDPOINTS_MISMATCH', 'pool/l2/web/effort.json', 'screen endpoint list differs from endpoint rows', pageId);
  }
  const totals = rec(effort.totals);
  checkTotals(state, rec(totals.screens), [...screens.values()], 'pool/l2/web/effort.json#totals.screens');
  checkTotals(state, rec(totals.endpoints), [...endpoints.values()], 'pool/l2/web/effort.json#totals.endpoints');
  checkTotals(state, rec(totals.usecases), [...usecases.values()], 'pool/l2/web/effort.json#totals.usecases');
  checkTotals(state, rec(totals.tables), [...tables.values()], 'pool/l2/web/effort.json#totals.tables');
}

function checkTotals(state: GateState, totals: Record<string, unknown>, items: Record<string, unknown>[], file: string): void {
  for (const status of ['toCreate', 'toUpdate', 'toRemove', 'done'] as D2EffortStatus[]) {
    const actual = items.filter(item => text(item.status) === status).length;
    if (Number(totals[status]) !== actual) error(state, 'TOTALS_MISMATCH', file, `${status} is ${String(totals[status])}, expected ${actual}`);
  }
}

function semanticAccessFindings(
  state: GateState,
  access: Record<string, unknown>,
  entityIds: string[],
  pages: D2SelectedPage[],
): void {
  for (const grant of rows(access.grants)) {
    for (const entity of strings(grant.entityRefs)) if (!entityIds.includes(entity)) error(state, 'ENTITY_REF_MISSING', 'l4/access.defs.ts', `grant entity '${entity}' is missing`);
    const scope = rec(grant.dataScope);
    const anchor = text(scope.anchorEntity);
    if (anchor && !entityIds.includes(anchor)) error(state, 'ENTITY_REF_MISSING', 'l4/access.defs.ts', `grant anchor entity '${anchor}' is missing`);
    if (text(scope.mode) === 'own' && anchor && !strings(grant.entityRefs).includes(anchor)) {
      const actor = text(grant.actorRef);
      const granted = new Set(strings(grant.entityRefs));
      const matches = pages.flatMap(page => {
        if (actor && !page.actors.includes(actor)) return [];
        const usecases = new Map(page.usecases.map(usecase => [text(usecase.usecaseId), usecase]));
        return page.endpoints
          .filter(endpoint => granted.has(text(usecases.get(text(endpoint.usecaseRef))?.entity)))
          .map(endpoint => ({ pageId: page.pageId, route: text(endpoint.route) }));
      });
      const message = `own grant '${text(grant.grantId)}' anchors '${anchor}' outside entityRefs`;
      if (matches.length) for (const match of matches) {
        review(state, 'OWN_ANCHOR_OUTSIDE_GRANT_ENTITIES', 'l4/access.defs.ts', message, match.pageId, match.route);
      } else review(state, 'OWN_ANCHOR_OUTSIDE_GRANT_ENTITIES', 'l4/access.defs.ts', message);
    }
  }
}

function semanticPageScopeFindings(state: GateState, pages: D2SelectedPage[]): void {
  for (const page of pages) {
    const ownReads = new Set(rows(page.reads).filter(item => text(item.scope) === 'own').map(item => text(item.entity)).filter(Boolean));
    if (!ownReads.size) continue;
    const organizationReads = new Set(rows(page.reads).filter(item => text(item.scope) === 'organization').map(item => text(item.entity)).filter(Boolean));
    const crudWrites = new Set(rows(page.writes)
      .filter(item => text(item.operation) === 'create' || text(item.operation) === 'update')
      .map(item => text(item.entity)).filter(Boolean));
    const suspectEntities = [...crudWrites].filter(entity => organizationReads.has(entity) && !ownReads.has(entity));
    if (!suspectEntities.length) continue;
    const usecases = new Map(page.usecases.map(usecase => [text(usecase.usecaseId), usecase]));
    for (const endpoint of page.endpoints) {
      const usecase = usecases.get(text(endpoint.usecaseRef));
      const entity = text(usecase?.entity);
      const operation = text(usecase?.operation);
      if (!suspectEntities.includes(entity) || (operation !== 'create' && operation !== 'update')) continue;
      review(
        state,
        'PAGE_OWN_SCOPE_WITH_OTHER_ENTITY_CRUD',
        'pool/l1/web/needs.json',
        `page reads own identity ${[...ownReads].join(', ')} but exposes ${operation} for organization-scoped ${entity}`,
        page.pageId,
        text(endpoint.route),
      );
    }
  }
}

function validateDestinationCollisions(state: GateState, pages: D2SelectedPage[], remove: Array<{ pageId: string; destinations: D2Destination[] }>): void {
  const paths = new Set<string>();
  const ids = new Set<string>();
  for (const destination of [...pages.flatMap(page => page.destinations), ...remove.flatMap(page => page.destinations)]) {
    if (paths.has(destination.path)) error(state, 'DESTINATION_PATH_COLLISION', 'input20', `duplicate destination '${destination.path}'`);
    paths.add(destination.path);
    for (const id of [destination.artifactId, destination.materializationId].filter((value): value is string => !!value)) {
      if (ids.has(id)) error(state, 'DESTINATION_ID_COLLISION', 'input20', `duplicate destination id '${id}'`);
      ids.add(id);
    }
  }
}

function checkVersion(state: GateState, value: Record<string, unknown>, expected: string, file: string): void {
  if (text(value.schemaVersion) !== expected) error(state, 'UNSUPPORTED_VERSION', file, `expected ${expected}, got '${text(value.schemaVersion)}'`);
}

function checkIdentity(state: GateState, value: Record<string, unknown>, module: string, file: string): void {
  if (text(value.moduleName) !== module) error(state, 'MODULE_IDENTITY_MISMATCH', file, `expected module '${module}', got '${text(value.moduleName)}'`);
}

function uniqueIds(state: GateState, values: Record<string, unknown>[], key: string, file: string): string[] {
  return [...indexedRows(state, values, key, file).keys()];
}

function indexedRows(state: GateState, values: Record<string, unknown>[], key: string, file: string): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();
  for (const value of values) {
    const id = text(value[key]);
    if (!id) { error(state, 'ID_MISSING', file, `${key} is missing`); continue; }
    if (result.has(id)) { error(state, 'DUPLICATE_ID', file, `duplicate ${key} '${id}'`); continue; }
    result.set(id, value);
  }
  return result;
}

function effortStatus(state: GateState, value: unknown, pageId: string): D2EffortStatus {
  const status = text(value);
  if (status === 'toCreate' || status === 'toUpdate' || status === 'toRemove' || status === 'done') return status;
  error(state, 'EFFORT_STATUS_INVALID', 'pool/l2/web/effort.json', `invalid status '${status}'`, pageId);
  return 'done';
}

function hasMenuActions(menu: Record<string, unknown>): boolean {
  const visit = (values: unknown[]): boolean => values.some(value => {
    const node = rec(value);
    return typeof node.action === 'string' || visit(arr(node.children));
  });
  return visit(arr(menu.tree));
}

function error(state: GateState, code: string, file: string, message: string, pageId?: string, route?: string): void {
  state.errors.push({ severity: 'error', code, file, message, ...(pageId ? { pageId } : {}), ...(route ? { route } : {}) });
}

function review(state: GateState, code: string, file: string, message: string, pageId?: string, route?: string): void {
  state.problems.push({ severity: 'review', code, file, message, ...(pageId ? { pageId } : {}), ...(route ? { route } : {}) });
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function rows(value: unknown): Record<string, unknown>[] { return arr(value).map(rec); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function strings(value: unknown): string[] { return arr(value).map(text).filter(Boolean); }
function unique(values: string[]): string[] { return [...new Set(values)].sort(); }
