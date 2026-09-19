/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/contracts.ts" enhancement="_blank"/>

export const P2_MENU_SCHEMA_VERSION = '2026-09-18-p2-menu-v1' as const;
export const P2_MENU_ITEM_KINDS = ['place', 'action'] as const;
export type P2MenuItemKind = typeof P2_MENU_ITEM_KINDS[number];

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export interface P2MenuOrigins {
  journeys: string[];
  entities: string[];
  processes: string[];
}

export interface P2MenuItem {
  itemId: string;
  kind: P2MenuItemKind;
  label: string;
  placeRef?: string;
  origins: P2MenuOrigins;
  description: string;
}

export interface P2ActorMenu {
  actorRef: string;
  items: P2MenuItem[];
}

export interface P2MenuFile {
  schemaVersion: typeof P2_MENU_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  sourceMessages: string[];
  generatedAt: string;
  menu: P2ActorMenu[];
  workflows: [];
}

export interface P2MenuDraft {
  menu: P2ActorMenu[];
  workflows: [];
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

export function isP2MenuItemKind(value: string): value is P2MenuItemKind {
  return (P2_MENU_ITEM_KINDS as readonly string[]).includes(value);
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

export function normalizeP2MenuPayload(value: unknown): P2MenuDraft {
  const root = record(value);
  return {
    menu: list(root.menu).map(normalizeActorMenu).filter(entry => entry.actorRef || entry.items.length),
    workflows: [],
  };
}

export function buildP2MenuFile(input: {
  moduleName: string;
  userLanguage: string;
  sourceMessages: string[];
  generatedAt: string;
  draft: P2MenuDraft;
}): P2MenuFile {
  return {
    schemaVersion: P2_MENU_SCHEMA_VERSION,
    moduleName: input.moduleName,
    userLanguage: input.userLanguage,
    sourceMessages: [...input.sourceMessages],
    generatedAt: input.generatedAt,
    menu: input.draft.menu,
    workflows: [],
  };
}

export function buildP2MenuTool(schema: Record<string, unknown>): mls.msg.LLMTool {
  return createP2ArtifactTool(
    'submitP2Menu',
    'Submit the per-actor menu: places and actions with origins and a prose description.',
    schema,
  );
}

function normalizeActorMenu(value: unknown): P2ActorMenu {
  const source = record(value);
  return {
    actorRef: memberId(text(source.actorRef)),
    items: list(source.items).map(normalizeItem).filter(item => item.itemId || item.label),
  };
}

function normalizeItem(value: unknown): P2MenuItem {
  const source = record(value);
  const kind = text(source.kind);
  const placeRef = memberId(text(source.placeRef));
  const item: P2MenuItem = {
    itemId: memberId(text(source.itemId) || text(source.label)),
    kind: isP2MenuItemKind(kind) ? kind : '' as P2MenuItemKind,
    label: text(source.label),
    origins: normalizeOrigins(source.origins),
    description: text(source.description),
  };
  if (placeRef) item.placeRef = placeRef;
  return item;
}

function normalizeOrigins(value: unknown): P2MenuOrigins {
  const source = record(value);
  return {
    journeys: uniqueIds(source.journeys, memberId),
    entities: uniqueIds(source.entities, entityId),
    processes: uniqueIds(source.processes, memberId),
  };
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

function uniqueIds(value: unknown, normalize: (raw: string) => string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list(value)) {
    const id = normalize(typeof item === 'string' ? item : text(record(item).id));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
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

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
