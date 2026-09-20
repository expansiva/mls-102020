/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/contracts.ts" enhancement="_blank"/>

import {
  P2_MENU_DEVICE,
  type P2MenuDevice,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import { countMenuActions, diffMenuTrees } from '/_102020_/l2/agentPlannerL2/steps/menu20/diff.js';
import {
  collectP2WorkspaceCandidates,
  isDdmEntity,
  type P2L4Sources,
  type P2WorkspaceCandidate,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

export const P2_MENU_SCHEMA_VERSION = '2026-09-20-p2-menu-v2.2' as const;
export const MENU_NODE_KINDS = ['hub', 'page', 'group'] as const;
export type MenuNodeKind = typeof MENU_NODE_KINDS[number];
export const MENU_ORGANISM_KINDS = [
  'list', 'detail', 'form', 'summary', 'highlights', 'timeline', 'actions', 'inbox', 'alerts',
] as const;
export type MenuOrganismKind = typeof MENU_ORGANISM_KINDS[number];
export const MENU_MECHANICAL_EFFECTS = ['transition', 'create', 'update'] as const;
export const MENU_ACTIONS = ['new', 'change', 'keep', 'remove'] as const;
export type MenuAction = typeof MENU_ACTIONS[number];

const NODE_ID = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ENTITY_ID = /^[A-Z][A-Za-z0-9]*$/;
const ACTOR_KEY = /^actor:([a-z][A-Za-z0-9]*)$/;

export interface MenuOrganism {
  kind: MenuOrganismKind;
  text: string;
}

export interface MenuHubNode {
  id: string;
  kind: 'hub';
  label: string;
  context: string;
  text: string;
  children: MenuNode[];
}

export interface MenuPageNode {
  id: string;
  kind: 'page';
  label: string;
  organisms: MenuOrganism[];
}

export interface MenuGroupNode {
  id: string;
  kind: 'group';
  label: string;
  text: string;
  children: MenuNode[];
}

export type MenuNode = MenuHubNode | MenuPageNode | MenuGroupNode;

export type MenuStampedHubNode = Omit<MenuHubNode, 'children'> & {
  action: MenuAction;
  children: MenuStampedNode[];
};
export type MenuStampedPageNode = MenuPageNode & { action: MenuAction };
export type MenuStampedGroupNode = Omit<MenuGroupNode, 'children'> & {
  action: MenuAction;
  children: MenuStampedNode[];
};
export type MenuStampedNode = MenuStampedHubNode | MenuStampedPageNode | MenuStampedGroupNode;

export interface MenuV2Meta {
  journeys: Record<string, string[]>;
  processes: Record<string, string[]>;
  entities: Record<string, string[]>;
}

export interface MenuFileMeta extends MenuV2Meta {
  removed: MenuStampedNode[];
}

export interface MenuV2 {
  tree: MenuNode[];
  authorities: Record<string, string[]>;
  meta: MenuV2Meta;
}

export interface P2MenuFile {
  schemaVersion: typeof P2_MENU_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  device: P2MenuDevice;
  tree: MenuStampedNode[];
  authorities: Record<string, string[]>;
  meta: MenuFileMeta;
}

export interface P2GrantView {
  grantId: string;
  actorRef: string;
  title: string;
  entityRefs: string[];
  dataScope: { mode: string; anchorEntity: string; description: string };
  disclosure: { mode: string; description: string };
}

export interface P2ProcessTaskView {
  taskId: string;
  kind: string;
  description: string;
  actorRef: string;
  entityRef: string;
  effect: string;
  journeyRef: string;
  transitionRef: string;
}

export interface P2ProcessView {
  processId: string;
  trigger: { kind: string; schedule: string; event: string; actorRef: string };
  tasks: P2ProcessTaskView[];
}

export interface P2MenuHubCandidate {
  entityRef: string;
  actorRefs: string[];
}

export interface P2ActorMustSeeTask {
  processId: string;
  taskId: string;
  description: string;
}

export interface P2ActorMustSeeEffect extends P2ActorMustSeeTask {
  entityRef: string;
  effect: string;
}

export interface P2ActorMustSeeDerived {
  entityRef: string;
  fieldId?: string;
  title: string;
}

/** Per actor, what the person must see beyond journeys (classes 1–4). */
export interface P2ActorMustSee {
  actorRef: string;
  human: P2ActorMustSeeTask[];
  alerts: P2ActorMustSeeTask[];
  mechanicalEffects: P2ActorMustSeeEffect[];
  derived: P2ActorMustSeeDerived[];
}

export interface P2RecordMaintained {
  actorRef: string;
  entityRef: string;
  writer: 'crud' | 'mdm';
}

export interface P2MenuCandidates {
  hubs: P2MenuHubCandidate[];
  pages: P2WorkspaceCandidate[];
  beyondJourneys: P2ActorMustSee[];
  recordsMaintained: P2RecordMaintained[];
}

export function isMenuNodeKind(value: string): value is MenuNodeKind {
  return (MENU_NODE_KINDS as readonly string[]).includes(value);
}

export function isMenuOrganismKind(value: string): value is MenuOrganismKind {
  return (MENU_ORGANISM_KINDS as readonly string[]).includes(value);
}

export function isMenuAction(value: string): value is MenuAction {
  return (MENU_ACTIONS as readonly string[]).includes(value);
}

export function actorAuthorityKey(actorRef: string): string {
  return `actor:${actorRef}`;
}

export function parseP2Grants(access: unknown): P2GrantView[] {
  return list(record(access).grants).map(item => {
    const grant = record(item);
    const dataScope = record(grant.dataScope);
    const disclosure = record(grant.disclosure);
    return {
      grantId: memberId(text(grant.grantId)),
      actorRef: memberId(text(grant.actorRef)),
      title: text(grant.title),
      entityRefs: uniqueIds(grant.entityRefs, entityId),
      dataScope: {
        mode: text(dataScope.mode),
        anchorEntity: text(dataScope.anchorEntity),
        description: text(dataScope.description),
      },
      disclosure: {
        mode: text(disclosure.mode),
        description: text(disclosure.description),
      },
    };
  }).filter(grant => grant.grantId);
}

export function parseP2Processes(workflows: unknown): P2ProcessView[] {
  return list(record(workflows).processes).map(item => {
    const process = record(item);
    const trigger = record(process.trigger);
    return {
      processId: memberId(text(process.processId)),
      trigger: {
        kind: text(trigger.kind),
        schedule: text(trigger.schedule),
        event: text(trigger.event),
        actorRef: memberId(text(trigger.actorRef)),
      },
      tasks: list(process.tasks).map(taskItem => {
        const task = record(taskItem);
        return {
          taskId: memberId(text(task.taskId)),
          kind: text(task.kind),
          description: text(task.description),
          actorRef: memberId(text(task.actorRef)),
          entityRef: text(task.entityRef),
          effect: text(task.effect),
          journeyRef: memberId(text(task.journeyRef)),
          transitionRef: memberId(text(task.transitionRef)),
        };
      }).filter(task => task.taskId),
    };
  }).filter(process => process.processId);
}

/** Hubs = grant anchors; pages = (entity, actor) groups from workspaces20. Candidates, not the answer. */
export function menuCandidates(
  sources: P2L4Sources,
  grants: readonly P2GrantView[],
  processes: readonly P2ProcessView[] = [],
): P2MenuCandidates {
  const hubActors = new Map<string, Set<string>>();
  for (const grant of grants) {
    const anchor = grant.dataScope.anchorEntity;
    if (!anchor) continue;
    let actors = hubActors.get(anchor);
    if (!actors) {
      actors = new Set();
      hubActors.set(anchor, actors);
    }
    if (grant.actorRef) actors.add(grant.actorRef);
  }
  const hubs = [...hubActors.entries()]
    .map(([entityRef, actors]) => ({ entityRef, actorRefs: [...actors].sort((a, b) => a.localeCompare(b)) }))
    .sort((left, right) => left.entityRef.localeCompare(right.entityRef));
  return {
    hubs,
    pages: collectP2WorkspaceCandidates(sources),
    beyondJourneys: collectBeyondJourneys(sources, grants, processes),
    recordsMaintained: collectRecordsMaintained(sources, grants),
  };
}

/** Pure. Per actor: `writer: crud` entities in that actor's grant — records they maintain. */
export function collectRecordsMaintained(
  sources: P2L4Sources,
  grants: readonly P2GrantView[],
): P2RecordMaintained[] {
  const crudIds = new Set(
    sources.entities.filter(entity => entity.writer === 'crud' && entity.entityId).map(entity => entity.entityId),
  );
  const seen = new Set<string>();
  const out: P2RecordMaintained[] = [];
  for (const grant of grants) {
    if (!grant.actorRef) continue;
    for (const entityRef of grant.entityRefs) {
      if (!entityRef || !crudIds.has(entityRef)) continue;
      const key = `${grant.actorRef}:${entityRef}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ actorRef: grant.actorRef, entityRef, writer: 'crud' });
    }
  }
  return out.sort((left, right) => {
    const actor = left.actorRef.localeCompare(right.actorRef);
    return actor !== 0 ? actor : left.entityRef.localeCompare(right.entityRef);
  });
}

export function isMechanicalEffectTask(task: P2ProcessTaskView): boolean {
  return (task.kind === 'mechanical' || task.kind === 'llm')
    && (MENU_MECHANICAL_EFFECTS as readonly string[]).includes(task.effect);
}

/** Pure. Per actor: human stages, alerts, mechanical effects, derived/ddm their grant reaches. */
export function collectBeyondJourneys(
  sources: P2L4Sources,
  grants: readonly P2GrantView[],
  processes: readonly P2ProcessView[],
): P2ActorMustSee[] {
  const grantEntities = new Map<string, Set<string>>();
  for (const grant of grants) {
    if (!grant.actorRef) continue;
    let entities = grantEntities.get(grant.actorRef);
    if (!entities) {
      entities = new Set();
      grantEntities.set(grant.actorRef, entities);
    }
    for (const entityRef of grant.entityRefs) {
      if (entityRef) entities.add(entityRef);
    }
  }
  const ddmIds = new Set(sources.entities.filter(isDdmEntity).map(entity => entity.entityId));
  const derivedByEntity = new Map<string, P2ActorMustSeeDerived[]>();
  for (const entity of sources.ontologyEntities) {
    const entityId = text(record(entity).entityId);
    if (!entityId) continue;
    derivedByEntity.set(entityId, collectDerivedOfEntity(entity, ddmIds.has(entityId)));
  }
  const byActor = new Map<string, P2ActorMustSee>();
  const actorOf = (actorRef: string): P2ActorMustSee => {
    let row = byActor.get(actorRef);
    if (!row) {
      row = { actorRef, human: [], alerts: [], mechanicalEffects: [], derived: [] };
      byActor.set(actorRef, row);
    }
    return row;
  };
  for (const actor of sources.actors) {
    if (actor.actorId) actorOf(actor.actorId);
  }
  for (const process of processes) {
    for (const task of process.tasks) {
      if (task.kind === 'human' && task.actorRef) {
        actorOf(task.actorRef).human.push({
          processId: process.processId,
          taskId: task.taskId,
          description: task.description,
        });
      }
      if (task.kind === 'alert' && task.actorRef) {
        actorOf(task.actorRef).alerts.push({
          processId: process.processId,
          taskId: task.taskId,
          description: task.description,
        });
      }
      if (isMechanicalEffectTask(task) && task.entityRef) {
        for (const [actorRef, entities] of grantEntities) {
          if (!entities.has(task.entityRef)) continue;
          actorOf(actorRef).mechanicalEffects.push({
            processId: process.processId,
            taskId: task.taskId,
            description: task.description,
            entityRef: task.entityRef,
            effect: task.effect,
          });
        }
      }
    }
  }
  for (const [actorRef, entities] of grantEntities) {
    const row = actorOf(actorRef);
    const derived: P2ActorMustSeeDerived[] = [];
    for (const entityRef of [...entities].sort((left, right) => left.localeCompare(right))) {
      derived.push(...(derivedByEntity.get(entityRef) || []));
    }
    row.derived = derived;
  }
  return [...byActor.values()].sort((left, right) => left.actorRef.localeCompare(right.actorRef));
}

export function normalizeMenuV2(value: unknown): MenuV2 {
  const root = asRecord(value, '$');
  exactKeys(root, ['tree', 'authorities', 'meta'], '$');
  const meta = asRecord(root.meta, '$.meta');
  exactKeys(meta, ['journeys', 'processes', 'entities'], '$.meta');
  return {
    tree: list(root.tree, '$.tree').map((item, index) => normalizeNode(item, `$.tree[${index}]`)),
    authorities: normalizeAuthorities(root.authorities, '$.authorities'),
    meta: {
      journeys: normalizeIdPagesMap(meta.journeys, '$.meta.journeys', 'journeyId'),
      processes: normalizeIdPagesMap(meta.processes, '$.meta.processes', 'processId'),
      entities: normalizeEntityPagesMap(meta.entities, '$.meta.entities'),
    },
  };
}

export function buildP2MenuFile(input: {
  moduleName: string;
  userLanguage: string;
  draft: MenuV2;
  device?: P2MenuDevice;
  previousTree?: readonly MenuNode[] | null;
}): P2MenuFile {
  const diff = diffMenuTrees(input.previousTree, input.draft.tree);
  return {
    schemaVersion: P2_MENU_SCHEMA_VERSION,
    moduleName: input.moduleName,
    userLanguage: input.userLanguage,
    device: input.device || P2_MENU_DEVICE,
    tree: diff.tree,
    authorities: input.draft.authorities,
    meta: {
      journeys: input.draft.meta.journeys,
      processes: input.draft.meta.processes,
      entities: input.draft.meta.entities,
      removed: diff.removed,
    },
  };
}

export function menuActionCounts(file: P2MenuFile): Record<MenuAction, number> {
  return countMenuActions({ tree: file.tree, removed: file.meta.removed });
}

/** Previous on-disk menu (v2.1 or v2.2). Strips `action` so the structural diff is clean. */
export function parsePreviousMenuTree(value: unknown): MenuNode[] {
  const root = asRecord(value, '$');
  return list(root.tree, '$.tree').map((item, index) => (
    normalizeNode(stripAction(item), `$.tree[${index}]`)
  ));
}

export function buildP2MenuTool(schema: Record<string, unknown>): mls.msg.LLMTool {
  return createP2ArtifactTool(
    'submitP2Menu',
    'Submit the module menu tree: hubs, pages with organisms, authorities by actor, and journey/process/entity mapping.',
    schema,
  );
}

function normalizeNode(value: unknown, path: string): MenuNode {
  const source = asRecord(value, path);
  const kind = text(source.kind);
  if (kind === 'hub') return normalizeHub(source, path);
  if (kind === 'page') return normalizePage(source, path);
  if (kind === 'group') return normalizeGroup(source, path);
  throw new Error(`${path}.kind must be hub, page or group.`);
}

function normalizeHub(source: Record<string, unknown>, path: string): MenuHubNode {
  exactKeys(source, ['id', 'kind', 'label', 'context', 'text', 'children'], path);
  const children = list(source.children, `${path}.children`);
  return {
    id: nodeId(source.id, `${path}.id`),
    kind: 'hub',
    label: requiredText(source.label, `${path}.label`),
    context: entityIdRequired(source.context, `${path}.context`),
    text: requiredText(source.text, `${path}.text`),
    children: children.map((item, index) => normalizeNode(item, `${path}.children[${index}]`)),
  };
}

function normalizePage(source: Record<string, unknown>, path: string): MenuPageNode {
  exactKeys(source, ['id', 'kind', 'label', 'organisms'], path);
  return {
    id: nodeId(source.id, `${path}.id`),
    kind: 'page',
    label: requiredText(source.label, `${path}.label`),
    organisms: list(source.organisms, `${path}.organisms`).map((item, index) => (
      normalizeOrganism(item, `${path}.organisms[${index}]`)
    )),
  };
}

function normalizeGroup(source: Record<string, unknown>, path: string): MenuGroupNode {
  exactKeys(source, ['id', 'kind', 'label', 'text', 'children'], path);
  const children = list(source.children, `${path}.children`);
  return {
    id: nodeId(source.id, `${path}.id`),
    kind: 'group',
    label: requiredText(source.label, `${path}.label`),
    text: requiredText(source.text, `${path}.text`),
    children: children.map((item, index) => normalizeNode(item, `${path}.children[${index}]`)),
  };
}

function normalizeOrganism(value: unknown, path: string): MenuOrganism {
  const source = asRecord(value, path);
  exactKeys(source, ['kind', 'text'], path);
  const kind = text(source.kind);
  if (!isMenuOrganismKind(kind)) {
    throw new Error(`${path}.kind must be one of ${MENU_ORGANISM_KINDS.join(', ')}.`);
  }
  return { kind, text: requiredText(source.text, `${path}.text`) };
}

function normalizeAuthorities(value: unknown, path: string): Record<string, string[]> {
  if (Array.isArray(value)) {
    const out: Record<string, string[]> = {};
    value.forEach((item, index) => {
      const row = asRecord(item, `${path}[${index}]`);
      exactKeys(row, ['actorRef', 'nodes'], `${path}[${index}]`);
      const actorRef = memberIdRequired(row.actorRef, `${path}[${index}].actorRef`);
      const key = actorAuthorityKey(actorRef);
      if (out[key]) throw new Error(`${path}[${index}]: duplicate actorRef ${actorRef}.`);
      out[key] = stringIdList(row.nodes, `${path}[${index}].nodes`, nodeId);
    });
    return out;
  }
  const source = asRecord(value, path);
  const out: Record<string, string[]> = {};
  for (const [key, nodes] of Object.entries(source)) {
    if (!ACTOR_KEY.test(key)) throw new Error(`${path}.${key}: authority key must be actor:<lowerCamel>.`);
    out[key] = stringIdList(nodes, `${path}[${JSON.stringify(key)}]`, nodeId);
  }
  return out;
}

function normalizeIdPagesMap(value: unknown, path: string, idKey: 'journeyId' | 'processId'): Record<string, string[]> {
  if (Array.isArray(value)) {
    const out: Record<string, string[]> = {};
    value.forEach((item, index) => {
      const row = asRecord(item, `${path}[${index}]`);
      exactKeys(row, [idKey, 'pages'], `${path}[${index}]`);
      const id = memberIdRequired(row[idKey], `${path}[${index}].${idKey}`);
      if (out[id]) throw new Error(`${path}[${index}]: duplicate ${idKey} ${id}.`);
      out[id] = stringIdList(row.pages, `${path}[${index}].pages`, nodeId);
    });
    return out;
  }
  const source = asRecord(value, path);
  const out: Record<string, string[]> = {};
  for (const [key, pages] of Object.entries(source)) {
    const id = memberIdRequired(key, `${path}.${key}`);
    out[id] = stringIdList(pages, `${path}.${id}`, nodeId);
  }
  return out;
}

function normalizeEntityPagesMap(value: unknown, path: string): Record<string, string[]> {
  if (Array.isArray(value)) {
    const out: Record<string, string[]> = {};
    value.forEach((item, index) => {
      const row = asRecord(item, `${path}[${index}]`);
      exactKeys(row, ['entityId', 'pages'], `${path}[${index}]`);
      const id = entityIdRequired(row.entityId, `${path}[${index}].entityId`);
      if (out[id]) throw new Error(`${path}[${index}]: duplicate entityId ${id}.`);
      out[id] = stringIdList(row.pages, `${path}[${index}].pages`, nodeId);
    });
    return out;
  }
  const source = asRecord(value, path);
  const out: Record<string, string[]> = {};
  for (const [key, pages] of Object.entries(source)) {
    const id = entityIdRequired(key, `${path}.${key}`);
    out[id] = stringIdList(pages, `${path}.${id}`, nodeId);
  }
  return out;
}

function collectDerivedOfEntity(entity: unknown, isDdm: boolean): P2ActorMustSeeDerived[] {
  const root = record(entity);
  const entityRef = text(root.entityId);
  if (!entityRef) return [];
  const title = text(root.title) || entityRef;
  if (isDdm) return [{ entityRef, title }];
  const out: P2ActorMustSeeDerived[] = [];
  walkDerivedFields(record(record(root.record).fields), false, '', (fieldId, fieldTitle) => {
    out.push({ entityRef, fieldId, title: fieldTitle });
  });
  return out;
}

function walkDerivedFields(
  fields: Record<string, unknown>,
  platform: boolean,
  prefix: string,
  visit: (fieldId: string, title: string) => void,
): void {
  for (const [id, raw] of Object.entries(fields)) {
    const field = record(raw);
    const nextPlatform = platform || text(field.owner) === 'platform';
    const path = prefix ? `${prefix}.${id}` : id;
    const nested = field.fields;
    const container = isRecord(nested) && Object.keys(nested).length > 0;
    if (!nextPlatform && field.derived === true && id !== 'id' && id !== 'version' && !container) {
      visit(path, text(field.title) || path);
    }
    if (isRecord(nested)) walkDerivedFields(nested, nextPlatform, path, visit);
  }
}

function createP2ArtifactTool(
  toolName: string,
  description: string,
  artifactSchema: Record<string, unknown>,
): mls.msg.LLMTool {
  const result: Record<string, unknown> = { ...artifactSchema };
  const defs = result.$defs;
  delete result.$defs;
  delete result.$id;
  delete result.$schema;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'result'],
    properties: {
      type: { type: 'string', const: 'flexible' },
      result,
    },
  };
  if (isRecord(defs)) parameters.$defs = defs;
  return { type: 'function', function: { name: toolName, description, parameters } } as mls.msg.LLMTool;
}

function stringIdList(
  value: unknown,
  path: string,
  normalize: (raw: unknown, at: string) => string,
): string[] {
  return list(value, path).map((item, index) => normalize(item, `${path}[${index}]`));
}

function uniqueIds(value: unknown, normalize: (raw: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    const id = normalize(typeof item === 'string' ? item : text(record(item).id));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function exactKeys(source: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(source)) {
    if (!allowedSet.has(key)) throw new Error(`${path}: unexpected field '${key}'.`);
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) throw new Error(`${path}: missing field '${key}'.`);
  }
}

function stripAction(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripAction);
  if (!isRecord(value)) return value;
  const { action: _action, ...rest } = value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(rest)) out[key] = stripAction(item);
  return out;
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object.`);
  return value;
}

function list(value: unknown, path?: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (path) throw new Error(`${path} must be an array.`);
  return [];
}

function nodeId(value: unknown, path: string): string {
  const id = text(value);
  if (!NODE_ID.test(id)) throw new Error(`${path} must be snake_case.`);
  return id;
}

function memberIdRequired(value: unknown, path: string): string {
  const id = text(value);
  if (!MEMBER_ID.test(id)) throw new Error(`${path} must be lowerCamel.`);
  return id;
}

function entityIdRequired(value: unknown, path: string): string {
  const id = text(value);
  if (!ENTITY_ID.test(id)) throw new Error(`${path} must be an l4 entity id.`);
  return id;
}

function requiredText(value: unknown, path: string): string {
  const trimmed = text(value);
  if (!trimmed) throw new Error(`${path} must be a non-empty string.`);
  return trimmed;
}

function memberId(value: string): string {
  const trimmed = value.trim();
  return MEMBER_ID.test(trimmed) ? trimmed : trimmed;
}

function entityId(value: string): string {
  return value.trim();
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
