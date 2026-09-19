/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/contracts.ts" enhancement="_blank"/>

import {
  collectP2WorkspaceCandidates,
  type P2L4Sources,
  type P2WorkspaceCandidate,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

export const P2_MENU_SCHEMA_VERSION = '2026-09-19-p2-menu-v2' as const;
export const MENU_NODE_KINDS = ['hub', 'page', 'group'] as const;
export type MenuNodeKind = typeof MENU_NODE_KINDS[number];
export const MENU_ORGANISM_KINDS = ['list', 'detail', 'form', 'summary', 'highlights', 'timeline', 'actions'] as const;
export type MenuOrganismKind = typeof MENU_ORGANISM_KINDS[number];

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

export interface MenuV2 {
  tree: MenuNode[];
  authorities: Record<string, string[]>;
  meta: {
    journeys: Record<string, string[]>;
    processes: Record<string, never>;
  };
}

export interface P2MenuFile {
  schemaVersion: typeof P2_MENU_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  tree: MenuNode[];
  authorities: Record<string, string[]>;
  meta: MenuV2['meta'];
}

export interface P2GrantView {
  grantId: string;
  actorRef: string;
  title: string;
  entityRefs: string[];
  dataScope: { mode: string; anchorEntity: string; description: string };
  disclosure: { mode: string; description: string };
}

export interface P2ProcessView {
  processId: string;
  trigger: { kind: string; schedule: string; event: string; actorRef: string };
  tasks: Array<{ taskId: string; kind: string; description: string }>;
}

export interface P2MenuHubCandidate {
  entityRef: string;
  actorRefs: string[];
}

export interface P2MenuCandidates {
  hubs: P2MenuHubCandidate[];
  pages: P2WorkspaceCandidate[];
}

export function isMenuNodeKind(value: string): value is MenuNodeKind {
  return (MENU_NODE_KINDS as readonly string[]).includes(value);
}

export function isMenuOrganismKind(value: string): value is MenuOrganismKind {
  return (MENU_ORGANISM_KINDS as readonly string[]).includes(value);
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
        };
      }).filter(task => task.taskId),
    };
  }).filter(process => process.processId);
}

/** Hubs = grant anchors; pages = (entity, actor) groups from workspaces20. Candidates, not the answer. */
export function menuCandidates(sources: P2L4Sources, grants: readonly P2GrantView[]): P2MenuCandidates {
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
  return { hubs, pages: collectP2WorkspaceCandidates(sources) };
}

export function normalizeMenuV2(value: unknown): MenuV2 {
  const root = asRecord(value, '$');
  exactKeys(root, ['tree', 'authorities', 'meta'], '$');
  const meta = asRecord(root.meta, '$.meta');
  exactKeys(meta, ['journeys', 'processes'], '$.meta');
  const processes = asRecord(meta.processes, '$.meta.processes');
  if (Object.keys(processes).length) throw new Error('$.meta.processes must be an empty object.');
  return {
    tree: list(root.tree, '$.tree').map((item, index) => normalizeNode(item, `$.tree[${index}]`)),
    authorities: normalizeAuthorities(root.authorities, '$.authorities'),
    meta: {
      journeys: normalizeJourneyMap(meta.journeys, '$.meta.journeys'),
      processes: {},
    },
  };
}

export function buildP2MenuFile(input: {
  moduleName: string;
  userLanguage: string;
  draft: MenuV2;
}): P2MenuFile {
  return {
    schemaVersion: P2_MENU_SCHEMA_VERSION,
    moduleName: input.moduleName,
    userLanguage: input.userLanguage,
    tree: input.draft.tree,
    authorities: input.draft.authorities,
    meta: input.draft.meta,
  };
}

export function buildP2MenuTool(schema: Record<string, unknown>): mls.msg.LLMTool {
  return createP2ArtifactTool(
    'submitP2Menu',
    'Submit the module menu tree: hubs, pages with organisms, authorities by actor, and journey mapping.',
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

function normalizeJourneyMap(value: unknown, path: string): Record<string, string[]> {
  if (Array.isArray(value)) {
    const out: Record<string, string[]> = {};
    value.forEach((item, index) => {
      const row = asRecord(item, `${path}[${index}]`);
      exactKeys(row, ['journeyId', 'pages'], `${path}[${index}]`);
      const journeyId = memberIdRequired(row.journeyId, `${path}[${index}].journeyId`);
      if (out[journeyId]) throw new Error(`${path}[${index}]: duplicate journeyId ${journeyId}.`);
      out[journeyId] = stringIdList(row.pages, `${path}[${index}].pages`, nodeId);
    });
    return out;
  }
  const source = asRecord(value, path);
  const out: Record<string, string[]> = {};
  for (const [key, pages] of Object.entries(source)) {
    const journeyId = memberIdRequired(key, `${path}.${key}`);
    out[journeyId] = stringIdList(pages, `${path}.${journeyId}`, nodeId);
  }
  return out;
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
