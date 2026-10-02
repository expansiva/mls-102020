/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2PageRequests.ts" enhancement="_blank"/>

import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2Page11Definition, type D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2WriteByKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';

export interface D2PageRequestsIssue { code: string; path: string; message: string }

export interface D2PageRequestsNeedRead {
  entity: string;
  derived: string[];
  from: string[];
  family?: string;
  scope?: string;
}
export interface D2PageRequestsNeedWrite { entity: string; operation: string; transitionRef?: string }
export interface D2PageRequestsNeedPage {
  pageId: string;
  actors: string[];
  reads: D2PageRequestsNeedRead[];
  writes: D2PageRequestsNeedWrite[];
}
export interface D2PageRequestsMenuNode { id: string; kind: string; organisms?: Array<{ kind: string }>; children?: D2PageRequestsMenuNode[] }
export interface D2PageRequestsMenu {
  tree: D2PageRequestsMenuNode[];
  authorities: Record<string, string[]>;
  meta?: { journeys?: Record<string, string[]> };
  userLanguage?: string;
}
export interface D2PageRequestsGrant {
  grantId: string;
  actorRef: string;
  entityRefs: string[];
  dataScope?: { mode: string };
  disclosure: { mode: string; allowedFields?: string[]; deniedFields?: string[] };
}
export interface D2PageRequestsCategory { categoryId: string; minimumRequired?: { query?: { outputKind?: string } } }
export interface D2PageRequestsSibling {
  pageId: string;
  desktop: unknown;
  mobile: unknown;
  draftDesktop: unknown;
  draftMobile: unknown;
}
export interface D2PageRequestsInput {
  module: string;
  pageId: string;
  desktop: unknown;
  mobile: unknown;
  draftDesktop: unknown;
  draftMobile: unknown;
  siblings: D2PageRequestsSibling[];
  needsPages: D2PageRequestsNeedPage[];
  menu: D2PageRequestsMenu;
  entities: Record<string, Ns5OntologyAnyEntity>;
  access: { grants: D2PageRequestsGrant[] };
  rules: { rules: Record<string, string> };
  categories: D2PageRequestsCategory[];
}

export interface D2DerivedParam {
  type: string;
  sources: ['url', 'localStorage'];
  effect: string;
  persist: boolean;
}
export interface D2DerivedForm {
  organism: string;
  submit: string;
  section: string;
  entity: string;
  ambiguous: boolean;
}
export interface D2DerivedRequest {
  id: string;
  kind: 'qry' | 'cmd';
  trigger: string;
  /** The write key (`Entity.<transitionRef>` for a transition). */
  writes?: string;
  /** The operation of that write, resolved from the page needs (create, update, transition…). */
  operation?: string;
  returns: string[];
  /** Collection or singular return key → ontology entityId. Never derived by uncasing the key. */
  returnEntities: Record<string, string>;
  inputPaths: string[];
  organisms: string[];
  params: string[];
  /** key = load output key of the list; load<Key> serves filter<List> and loadMore<List>. */
  lists: Array<{ filter: string; loadMore: string; organismId: string; key: string; params: string[] }>;
}
export interface D2DerivedProjection {
  requestId: string;
  entityId: string;
  paths: string[];
  includeVersion: boolean;
}
export interface D2DerivedPageRequests {
  module: string;
  pageId: string;
  requests: D2DerivedRequest[];
  forms: Record<string, D2DerivedForm>;
  entry: { params: Record<string, D2DerivedParam> };
  projections: D2DerivedProjection[];
  /** Rule candidates per request: every rule of the entities the request touches. */
  rules: Record<string, string[]>;
  /** Rules of each touched entity; a command keeps at least one rule of the entity it writes. */
  entityRules: Record<string, string[]>;
  access: { actors: string[]; grants: string[]; scope: string };
  issues: D2PageRequestsIssue[];
}

interface OrganismUnit {
  id: string;
  kind: string;
  reads: string[];
  edits: string[];
  selects: string;
  submits: Array<{ intentId: string; write: string }>;
  intents: Array<{ id: string; kind: 'submit' | 'navigate'; to?: string }>;
  section: string;
}

export function deriveD2PageRequests(input: D2PageRequestsInput): D2DerivedPageRequests {
  const desktop = buildD2Page11Definition(input.desktop);
  const mobile = buildD2Page11Definition(input.mobile);
  const draft = mergeDrafts(buildD2Page11Needs(input.draftDesktop), buildD2Page11Needs(input.draftMobile));
  const organisms = units(desktop, draft);
  const issues: D2PageRequestsIssue[] = [];
  const add = (code: string, path: string, message: string): void => {
    // A sibling is read by several derivations; report it once.
    if (code === 'D2_REQUESTS_SIBLING_INVALID' && issues.some(item => item.code === code && item.path === path)) return;
    issues.push({ code, path, message });
  };

  const pageNeeds = input.needsPages.find(item => item.pageId === input.pageId);
  const actors = pageNeeds?.actors ?? [];
  const derivedByEntity = new Map((pageNeeds?.reads ?? []).map(read => [read.entity, new Set(read.derived.map(item => `${read.entity}.${item}`))]));
  const categoryId = categoryIdFromTemplate(desktop.template.category);
  const category = input.categories.find(item => item.categoryId === categoryId);
  const paginatedCategory = category?.minimumRequired?.query?.outputKind === 'paginated';

  for (const unit of organisms) {
    for (const path of [...unit.reads, ...unit.edits]) {
      const entityId = path.split('.')[0];
      const entity = input.entities[entityId];
      if (!entity || !resolvableFieldPaths(entity).includes(path)) add('D2_REQUESTS_PATH_UNKNOWN', `organisms.${unit.id}`, `Path ${path} is absent from the ontology.`);
      else if (!granted(path, actors, input.access.grants)) add('D2_REQUESTS_PATH_GRANT', `organisms.${unit.id}`, `No disclosure grant covers ${path}.`);
    }
    for (const path of unit.edits) {
      const entityId = path.split('.')[0];
      if (derivedByEntity.get(entityId)?.has(path)) add('D2_REQUESTS_DERIVED_EDIT', `organisms.${unit.id}`, `Derived path ${path} cannot be edited.`);
    }
  }

  const selectTargets = new Set(organisms.map(item => item.selects).filter(Boolean));
  const listUnits = organisms.filter(item => item.kind === 'list');
  const forms = bindForms(organisms, add);
  const commands = commandRequests(organisms, forms, input.entities, input.needsPages.find(item => item.pageId === input.pageId)?.writes ?? [], add);
  const loadUnits = organisms.filter(item => !selectTargets.has(item.id));
  const loadEntities = unique(loadUnits.flatMap(item => item.reads.map(path => path.split('.')[0])).filter(Boolean));
  const returnEntities: Record<string, string> = {};
  const loadReturns: string[] = [];
  for (const entityId of loadEntities) {
    const key = collectionKey(entityId, input.pageId, listUnits, input.siblings, add);
    if (!loadReturns.includes(key)) loadReturns.push(key);
    returnEntities[key] = entityId;
  }
  const load: D2DerivedRequest = {
    id: 'load', kind: 'qry', trigger: 'onLoad', returns: loadReturns, returnEntities, inputPaths: [],
    organisms: loadUnits.map(item => item.id), params: [], lists: [],
  };

  for (const list of listUnits) {
    const entityId = primaryEntity(list.reads);
    if (!entityId) continue;
    const caps = capabilities(input.entities[entityId]);
    const hasLocate = caps.has('locate.byName') || caps.has('locate.byColumn') || caps.has('listByForeignKey');
    if (!hasLocate && !paginatedCategory) continue;
    if (list.reads.length && entityId && !caps.size) add('D2_REQUESTS_CAPABILITY_MISSING', `organisms.${list.id}`, `List has no ontology capability for locate or foreign-key listing.`);
    const params: string[] = [];
    if (caps.has('locate.byName')) params.push('search');
    if (caps.has('listByForeignKey')) {
      const fk = foreignKeyParam(input.entities, entityId);
      if (fk) params.push(fk);
    }
    if (hasLocate || paginatedCategory) { params.push('page', 'pageSize'); }
    load.params = unique([...load.params, ...params]);
    const key = collectionKey(entityId, input.pageId, listUnits, input.siblings, add);
    if (returnEntities[key] !== entityId) add('D2_REQUESTS_LIST_KEY', `organisms.${list.id}`, `List ${list.id} has no load output key for ${entityId}.`);
    load.lists.push({ filter: `filter${pascal(identifier(list.id))}`, loadMore: `loadMore${pascal(identifier(list.id))}`, organismId: list.id, key, params });
  }

  const listRequests: D2DerivedRequest[] = [];
  for (const list of load.lists) {
    const id = `load${pascal(list.key)}`;
    const existing = listRequests.find(item => item.id === id);
    if (existing) {
      existing.lists.push(list);
      existing.params = unique([...existing.params, ...list.params]);
      existing.organisms = unique([...existing.organisms, list.organismId]);
      continue;
    }
    listRequests.push({
      id, kind: 'qry', trigger: id, returns: [list.key], returnEntities: { [list.key]: returnEntities[list.key] }, inputPaths: [],
      organisms: [list.organismId], params: [...list.params], lists: [list],
    });
  }

  const originEntities = new Set(loadEntities);
  const detailRequests: D2DerivedRequest[] = [];
  for (const targetId of selectTargets) {
    const detail = organisms.find(item => item.id === targetId);
    if (!detail) continue;
    const detailEntities = unique(detail.reads.map(path => path.split('.')[0]));
    if (detailEntities.every(entityId => originEntities.has(entityId))) continue;
    const entityId = primaryEntity(detail.reads);
    const key = camel(entityId);
    detailRequests.push({
      id: `load${entityId}`, kind: 'qry', trigger: `load${entityId}`, returns: [key], returnEntities: { [key]: entityId },
      inputPaths: [`${entityId}.id`], organisms: [detail.id], params: ['id'], lists: [],
    });
  }

  const requests = [load, ...listRequests, ...detailRequests, ...commands].filter(item => item.returns.length || item.kind === 'cmd');
  const seen = new Set<string>();
  for (const request of requests) {
    if (seen.has(request.id)) add('D2_REQUESTS_ID_COLLISION', `requests.${request.id}`, `Two requests derive the same id ${request.id}.`);
    seen.add(request.id);
  }
  const projections = project(requests, organisms, pageNeeds, input.entities);
  const rulesOf = (entityId: string): string[] => ((input.entities[entityId] as { rules?: string[] } | undefined)?.rules ?? []).filter(id => id in input.rules.rules);
  const rules: Record<string, string[]> = {};
  for (const request of requests) {
    rules[request.id] = unique(entitiesOf(request, projections, organisms).flatMap(rulesOf));
  }
  const touched = unique(projections.map(item => item.entityId));
  const entityRules: Record<string, string[]> = {};
  for (const entityId of touched) entityRules[entityId] = rulesOf(entityId);
  const grants = input.access.grants.filter(grant => actors.includes(grant.actorRef) && grant.entityRefs.some(id => touched.includes(id)));
  const entry = { params: entryParams(input, organisms, forms, load, listUnits, add) };
  const scope = grants[0]?.dataScope?.mode || (pageNeeds?.reads[0]?.scope ?? 'organization');
  return {
    module: input.module, pageId: input.pageId, requests, forms, entry, projections, rules, entityRules,
    access: { actors, grants: unique(grants.map(item => item.grantId)), scope },
    issues,
  };
}

function mergeDrafts(left: D2Page11Needs, right: D2Page11Needs): D2Page11Needs {
  const ids = unique([...Object.keys(left.organisms), ...Object.keys(right.organisms)]);
  const organisms: D2Page11Needs['organisms'] = {};
  for (const id of ids) {
    const a = left.organisms[id] ?? { reads: [], edits: [], selects: '', submits: [] };
    const b = right.organisms[id] ?? { reads: [], edits: [], selects: '', submits: [] };
    organisms[id] = {
      reads: unique([...a.reads, ...b.reads]),
      edits: unique([...a.edits, ...b.edits]),
      selects: a.selects || b.selects,
      submits: [...a.submits, ...b.submits.filter(item => !a.submits.some(other => other.intentId === item.intentId))],
    };
  }
  return { organisms };
}

function units(definition: D2Page11Definition, draft: D2Page11Needs): OrganismUnit[] {
  const sectionOf = new Map<string, string>();
  for (const section of definition.sections) for (const id of section.organisms) sectionOf.set(id, section.id);
  return Object.keys(definition.organisms).map(id => {
    const organism = definition.organisms[id];
    const unit = draft.organisms[id] ?? { reads: [], edits: [], selects: '', submits: [] };
    return { id, kind: organism.kind, reads: unit.reads, edits: unit.edits, selects: unit.selects, submits: unit.submits, intents: organism.intents, section: sectionOf.get(id) ?? '' };
  });
}

function bindForms(organisms: OrganismUnit[], add: (code: string, path: string, message: string) => void): Record<string, D2DerivedForm> {
  const forms: Record<string, D2DerivedForm> = {};
  const formUnits = organisms.filter(item => item.kind === 'form' || item.edits.length);
  for (const unit of organisms) {
    for (const submit of unit.submits) {
      const entity = submit.write.split('.')[0];
      const sameSection = unit.section
        ? formUnits.filter(item => item.section === unit.section && item.id !== unit.id && editsEntity(item, entity))
        : [];
      const uniqueForm = formUnits.filter(item => editsEntity(item, entity));
      const chosen = sameSection.length === 1 ? sameSection[0] : uniqueForm.length === 1 ? uniqueForm[0] : undefined;
      if (!chosen) {
        if (uniqueForm.length > 1) {
          forms[submit.intentId] = { organism: '', submit: submit.intentId, section: unit.section, entity, ambiguous: true };
        } else {
          add('D2_REQUESTS_SUBMIT_UNBOUND', `organisms.${unit.id}.submits.${submit.intentId}`, `Submit ${submit.intentId} has no bindable form after section and entity matching.`);
        }
        continue;
      }
      // Keyed by submit: one form may serve several submits (create and update of the same record).
      forms[submit.intentId] = { organism: chosen.id, submit: submit.intentId, section: chosen.section, entity, ambiguous: false };
    }
  }
  return forms;
}

function commandRequests(
  organisms: OrganismUnit[],
  forms: Record<string, D2DerivedForm>,
  entities: Record<string, Ns5OntologyAnyEntity>,
  pageWrites: D2PageRequestsNeedWrite[],
  add: (code: string, path: string, message: string) => void,
): D2DerivedRequest[] {
  const out: D2DerivedRequest[] = [];
  for (const unit of organisms) {
    for (const submit of unit.submits) {
      const form = forms[submit.intentId];
      if (!form) continue; // bindForms already reported D2_REQUESTS_SUBMIT_UNBOUND
      const formUnit = form.organism ? organisms.find(item => item.id === form.organism) : undefined;
      if (form.organism && !formUnit) {
        add('D2_REQUESTS_FORM_MISSING', `organisms.${unit.id}.submits.${submit.intentId}`, `Submit ${submit.intentId} is bound to form ${form.organism}, which is not an organism of the page.`);
        continue;
      }
      const entityId = submit.write.split('.')[0];
      const entity = entities[entityId];
      const caps = capabilities(entity);
      // The key of a transition is its transitionRef; the operation comes from the page write, never from the key text.
      const pageWrite = d2WriteByKey(pageWrites, submit.write);
      if (!pageWrite) {
        add('D2_REQUESTS_WRITE_UNKNOWN', `organisms.${unit.id}.submits.${submit.intentId}`, `Submit ${submit.intentId} writes ${submit.write}, which is not a write of the page needs.`);
        continue;
      }
      const operation = pageWrite.operation;
      if (operation === 'create' && entity && !caps.has('create') && !caps.has('register.createOrAttach') && ![...caps].some(item => item.endsWith(`.${operation}`) || item === operation)) {
        add('D2_REQUESTS_CAPABILITY_MISSING', `organisms.${unit.id}.submits.${submit.intentId}`, `Write ${submit.write} has no matching ontology capability.`);
      }
      const edits = formUnit?.edits ?? [];
      const contextIds = requiredContextIds(entityId, entity, edits);
      const identity = operation === 'update' || operation === 'transition' ? [`${entityId}.id`, `${entityId}.version`] : [];
      const key = camel(entityId);
      out.push({
        id: submit.intentId, kind: 'cmd', trigger: submit.intentId, writes: submit.write, operation,
        returns: [key], returnEntities: { [key]: entityId },
        inputPaths: unique([...edits, ...contextIds, ...identity]),
        organisms: [form.organism, unit.id].filter(Boolean), params: [], lists: [],
      });
    }
  }
  return out;
}

function project(requests: D2DerivedRequest[], organisms: OrganismUnit[], pageNeeds: D2PageRequestsNeedPage | undefined, entities: Record<string, Ns5OntologyAnyEntity>): D2DerivedProjection[] {
  const writes = pageNeeds?.writes ?? [];
  const loadOrganisms = requests.find(item => item.id === 'load')?.organisms ?? [];
  const out: D2DerivedProjection[] = [];
  for (const request of requests) {
    // load<Key> returns the same item shape as load, so the next page appends to the same state.
    const listRequest = request.id !== 'load' && request.lists.length > 0;
    const listEntities = new Set(Object.values(request.returnEntities));
    const served = organisms.filter(item => (listRequest ? loadOrganisms : request.organisms).includes(item.id));
    const paths = unique(served.flatMap(item => request.kind === 'cmd' ? item.edits : item.reads))
      .filter(path => !listRequest || listEntities.has(path.split('.')[0]));
    const entityIds = unique([
      ...Object.values(request.returnEntities),
      ...(request.writes ? [request.writes.split('.')[0]] : []),
      ...paths.map(path => path.split('.')[0]),
    ]).filter(entityId => entities[entityId]);
    for (const entityId of unique(entityIds.filter(Boolean))) {
      const entityPaths = unique(['id', ...paths.filter(path => path.split('.')[0] === entityId).map(stripEntity)]);
      const includeVersion = writes.some(write => write.entity === entityId && (write.operation === 'update' || write.operation === 'transition'));
      if (includeVersion && !entityPaths.includes('version')) entityPaths.push('version');
      if (!entityPaths.includes('id')) entityPaths.unshift('id');
      out.push({ requestId: request.id, entityId, paths: entityPaths.filter(path => path !== `${entityId}`), includeVersion });
    }
  }
  return out;
}

function entryParams(
  input: D2PageRequestsInput,
  organisms: OrganismUnit[],
  forms: Record<string, D2DerivedForm>,
  load: D2DerivedRequest,
  listUnits: OrganismUnit[],
  add: (code: string, path: string, message: string) => void,
): Record<string, D2DerivedParam> {
  const params: Record<string, D2DerivedParam> = {};
  const pageNeeds = input.needsPages.find(item => item.pageId === input.pageId);
  const needEntities = new Set((pageNeeds?.reads ?? []).map(item => item.entity));
  for (const sibling of input.siblings) {
    if (sibling.pageId === input.pageId) continue;
    let definition: D2Page11Definition;
    let draft: D2Page11Needs;
    try {
      definition = buildD2Page11Definition(sibling.desktop);
      draft = mergeDrafts(buildD2Page11Needs(sibling.draftDesktop), buildD2Page11Needs(sibling.draftMobile));
    } catch (error) {
      add('D2_REQUESTS_SIBLING_INVALID', `siblings.${sibling.pageId}`, `Sibling page ${sibling.pageId} has an invalid page11 or draft: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const [id, organism] of Object.entries(definition.organisms)) {
      for (const intent of organism.intents) {
        if (intent.kind !== 'navigate' || intent.to !== input.pageId) continue;
        const selected = draft.organisms[id]?.selects;
        const target = selected ? draft.organisms[selected] ?? draft.organisms[id] : draft.organisms[id];
        const entityId = primaryEntity(target?.reads ?? []);
        if (!entityId || !needEntities.has(entityId)) continue;
        const name = `${camel(entityId)}Id`;
        params[name] = { type: 'string', sources: ['url', 'localStorage'], effect: `select:${entityId}`, persist: true };
      }
    }
  }
  for (const unit of organisms) {
    if (!unit.selects) continue;
    const target = organisms.find(item => item.id === unit.selects);
    const entityId = primaryEntity(target?.reads ?? unit.reads);
    if (!entityId) continue;
    const name = `${camel(entityId)}Id`;
    params[name] = { type: 'string', sources: ['url', 'localStorage'], effect: `select:${unit.selects}`, persist: true };
  }
  if (load.params.includes('search')) params.search = { type: 'string', sources: ['url', 'localStorage'], effect: `filter:${listUnits[0]?.id ?? 'load'}`, persist: true };
  for (const key of load.params.filter(item => item !== 'search' && item !== 'page' && item !== 'pageSize')) {
    params[key] = { type: 'string', sources: ['url', 'localStorage'], effect: `filter:${listUnits[0]?.id ?? 'load'}`, persist: true };
  }
  if (load.params.includes('page')) params.page = { type: 'number', sources: ['url', 'localStorage'], effect: `filter:${listUnits[0]?.id ?? 'load'}`, persist: true };
  for (const form of Object.values(forms)) {
    const unit = organisms.find(item => item.id === form.organism);
    for (const path of unit?.edits ?? []) {
      if (!path.endsWith('Id')) continue;
      const name = path.split('.').slice(-1)[0];
      params[name] = params[name] ?? { type: 'string', sources: ['url', 'localStorage'], effect: `prefill:${form.organism}`, persist: false };
    }
  }
  return params;
}

function editsEntity(unit: OrganismUnit, entity: string): boolean {
  if (unit.kind === 'form' && (!unit.edits.length || unit.edits.every(path => path.split('.')[0] === entity))) return unit.edits.length ? true : unit.kind === 'form';
  return unit.edits.some(path => path.split('.')[0] === entity);
}
function capabilities(entity: Ns5OntologyAnyEntity | undefined): Set<string> {
  const raw = (entity as { capabilities?: Record<string, string> } | undefined)?.capabilities ?? {};
  return new Set(Object.keys(raw));
}
function foreignKeyParam(entities: Record<string, Ns5OntologyAnyEntity>, entityId: string): string {
  const rels = (entities[entityId] as { relationships?: Record<string, { via?: string }> } | undefined)?.relationships ?? {};
  for (const rel of Object.values(rels)) {
    const via = rel.via ?? '';
    if (via.startsWith(`${entityId}.`)) return via.slice(entityId.length + 1);
  }
  return '';
}
function requiredContextIds(entityId: string, entity: Ns5OntologyAnyEntity | undefined, edits: string[]): string[] {
  if (!entity) return [];
  const rels = (entity as { relationships?: Record<string, { via?: string; required?: unknown }> }).relationships ?? {};
  const prefix = `${entityId}.`;
  const have = new Set(edits);
  const out: string[] = [];
  for (const rel of Object.values(rels)) {
    const via = rel.via ?? '';
    const required = rel.required === true || (typeof rel.required === 'string' && rel.required.trim().length > 0);
    if (!via.startsWith(prefix) || !required || have.has(via)) continue;
    out.push(via);
  }
  return out;
}
function granted(path: string, actors: string[], grants: D2PageRequestsGrant[]): boolean {
  const entity = path.split('.')[0];
  return grants.some(grant => {
    if (!actors.includes(grant.actorRef) || !grant.entityRefs.includes(entity)) return false;
    if ((grant.disclosure.deniedFields ?? []).some(ref => path === ref || path.startsWith(`${ref}.`))) return false;
    if (grant.disclosure.mode === 'fullRecord') return true;
    if (grant.disclosure.mode === 'fieldsOnly') return (grant.disclosure.allowedFields ?? []).some(ref => path === ref || path.startsWith(`${ref}.`));
    return false;
  });
}
function categoryIdFromTemplate(category: string): string {
  const match = /templates\/([^/]+)\//u.exec(category);
  return match?.[1] ?? (category === 'bespoke' ? 'bespoke' : category);
}
/** Output keys and request ids are identifiers: a page id such as `a_b` becomes `aB` (paths and page ids stay as they are). */
function collectionKey(
  entityId: string, pageId: string, listUnits: OrganismUnit[], siblings: D2PageRequestsSibling[],
  add: (code: string, path: string, message: string) => void,
): string {
  const local = listUnits.filter(item => primaryEntity(item.reads) === entityId);
  if (local.length) {
    const distinct = unique(listUnits.map(item => primaryEntity(item.reads)).filter(Boolean));
    return identifier(distinct.length === 1 ? pageId : local[0].id);
  }
  for (const sibling of siblings) {
    let definition: D2Page11Definition;
    let draft: D2Page11Needs;
    try {
      definition = buildD2Page11Definition(sibling.desktop);
      draft = mergeDrafts(buildD2Page11Needs(sibling.draftDesktop), buildD2Page11Needs(sibling.draftMobile));
    } catch (error) {
      add('D2_REQUESTS_SIBLING_INVALID', `siblings.${sibling.pageId}`, `Sibling page ${sibling.pageId} has an invalid page11 or draft: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const lists = Object.entries(definition.organisms).filter(([, organism]) => organism.kind === 'list');
    if (lists.some(([id]) => primaryEntity(draft.organisms[id]?.reads ?? []) === entityId)) return identifier(sibling.pageId);
  }
  return camel(entityId);
}
function identifier(value: string): string {
  const parts = value.split(/[^A-Za-z0-9]+/u).filter(Boolean);
  return parts.map((part, index) => index === 0 ? camel(part) : pascal(part)).join('');
}
function primaryEntity(paths: string[]): string { return paths[0]?.split('.')[0] ?? ''; }
function camel(value: string): string { return value ? value[0].toLowerCase() + value.slice(1) : value; }
function pascal(value: string): string { return value ? value[0].toUpperCase() + value.slice(1) : value; }
function stripEntity(path: string): string { return path.includes('.') ? path.split('.').slice(1).join('.') : 'id'; }
function unique(values: string[]): string[] { return [...new Set(values)]; }
function entitiesOf(request: D2DerivedRequest, projections: D2DerivedProjection[], organisms: OrganismUnit[]): string[] {
  const fromProj = projections.filter(item => item.requestId === request.id).map(item => item.entityId);
  if (fromProj.length) return unique(fromProj);
  return unique(organisms.filter(item => request.organisms.includes(item.id)).flatMap(item => [...item.reads, ...item.edits].map(path => path.split('.')[0])));
}
