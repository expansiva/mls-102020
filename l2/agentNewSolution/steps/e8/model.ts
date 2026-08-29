/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/model.ts" enhancement="_blank"/>

/**
 * The E8 workspace model: every screen of the module, in the shape E9 transposes into the classic
 * L4 format without taking a single decision of its own.
 *
 * A screen is a place: the record catalogue of an entity (tier 1), an approved journey that is
 * itself a place (tier 2: distinct actor, eventDriven/contextRequired, or more than one entity),
 * or the hub of the dominant anchor when it has related lists or projection tiles (tier 3).
 * A journey of the same actor on an entity the catalogue already shows is hosted there
 * (`hostedStepRefs`); it is not a fourth kind of page.
 */

import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution/helpers/ns4Resolve.js';

export const NS4_E8_MODEL_VERSION = '2026-08-14-ns4-e8-model-v1' as const;

export type Ns4WorkspaceTier = 'recordCatalogue' | 'journey' | 'hub' | 'projection';

/**
 * The only origins a page can render by, in the vocabulary the frontend actually reads from an
 * operation input: userInput is a form field, selectedEntity is a picker over a query on the page,
 * routeParam comes from the URL, and the rest is resolved at runtime and never rendered.
 */
export type Ns4E8InputSource = 'userInput' | 'selectedEntity' | 'routeParam' | 'actorSession' | 'systemDefault';

/**
 * The record-owner handle: `ownerId` / `ownerUserId` / `customerId` / `clientId`, or a field
 * ending in `OwnerId`. Not every person FK — `assignedUserId` is a choice the actor makes.
 */
export function isNs4OwnerHandleField(fieldId: string): boolean {
  return /^(owner(?:User)?|customer|client)Id$/i.test(fieldId) || /OwnerId$/u.test(fieldId);
}

export type Ns4E8AccessPatternKind = 'list' | 'getById' | 'create' | 'update' | 'delete' | 'transition' | 'commandInput';

export interface Ns4E8FieldRef {
  entityId: string;
  fieldId: string;
}

export interface Ns4E8Input {
  inputId: string;
  fieldRef: Ns4E8FieldRef;
  source: Ns4E8InputSource;
  required: boolean;
  description: string;
  /** The literal union of an enumerated field, carried from the approved ontology. */
  enumValues?: string[];
}

/**
 * One operation of the module. A journey step compiles into the E7 use case it already owns; a
 * record catalogue synthesizes its five operations from the ontology (list, getById, create,
 * update, and delete or the mdm inactivate/reactivate pair), because E7 only compiles journeys
 * and a catalogue is not a journey. getById is emitted even when no page consumes it.
 */
/**
 * Master-data semantics of one operation. Master data is referenced by other
 * records, so an mdm catalogue deactivates instead of deleting.
 *
 * It is ONE optional block on purpose. The backend generator reads this artifact
 * as JSON and its accessPattern vocabulary is a closed set, so the lifecycle pair
 * keeps `kind: 'update'` — a command that mutates one identified record, which the
 * consumer already understands — and the meaning travels here. A consumer that
 * ignores the block behaves exactly as before.
 */
export interface Ns4E8MdmSemantics {
  /** The command replaces a hard delete: route it to the MDM record lifecycle. */
  lifecycle?: 'inactivate' | 'reactivate';
  /** Optional request flag on a list: absent means only active records. */
  activeFilterInput?: 'includeInactive';
  /**
   * Response member carrying the situation. Derived from the MDM record lifecycle,
   * so it is NOT an ontology field and deliberately has no field ref: the ontology
   * declares no `active` field and the model must not invent one.
   */
  situationOutput?: 'active';
}

export interface Ns4E8Operation {
  operationId: string;
  title: string;
  kind: 'query' | 'command';
  entityRef: string;
  entityRefs: string[];
  accessPattern: { kind: Ns4E8AccessPatternKind; pagination?: 'optional' };
  inputs: Ns4E8Input[];
  outputRefs: string[];
  useRules: string[];
  transitionRefs: string[];
  story: string[];
  /** Present when the operation is an approved E7 use case; absent when the catalogue derived it. */
  useCaseId?: string;
  /** Present only on a catalogue operation of an entity whose storage.target is mdm. */
  mdm?: Ns4E8MdmSemantics;
}

export interface Ns4E8BffCall {
  bffId: string;
  kind: 'query' | 'command';
  operationId: string;
  outputKind: 'object' | 'list' | 'paginated';
  entityRef: string;
  /**
   * Which LOCAL call feeds each input of this one. Operations are shared and calls are per workspace,
   * so "where the user picks this record from" is a property of the call, never of the operation.
   * Without it the screen knows an id must be chosen and not which query to choose it from.
   */
  inputSources?: Array<{ inputId: string; bffId: string }>;
}

export type Ns4E8OrganismRole = 'primarySurface' | 'detailPanel' | 'filterControl' | 'contextualAction';

export interface Ns4E8Organism {
  role: Ns4E8OrganismRole;
  dataSource?: string;
  action?: string;
  /** A picker is a query rendered to choose the record another call consumes. summary is counts of that list, not a row. */
  usage?: 'picker' | 'summary';
  /** Query bffId whose optional list inputs (search/sort) this filterControl drives. */
  attachTo?: string;
}

export interface Ns4E8Section {
  sectionId: string;
  intent: string;
  organisms: Ns4E8Organism[];
}

export interface Ns4E8ModelWorkspace {
  workspaceId: string;
  tier: Ns4WorkspaceTier;
  title: string;
  purpose: string;
  /** Classic workspace kind: operation, workflow, landing or record. */
  kind: 'operation' | 'workflow' | 'landing' | 'record';
  entity: string;
  workflowId?: string;
  actors: string[];
  profileRefs: string[];
  featureRefs: string[];
  hostedStepRefs: string[];
  journeyRef?: string;
  categoryRef: string;
  bffCalls: Ns4E8BffCall[];
  sections: Ns4E8Section[];
  /** Only a hub carries the closed catalogue its composition call may order and name. */
  hubCatalogue?: Ns4E8HubCatalogue;
  /** Workspaces this one links to; the site map turns them into navigation edges. */
  navigation?: Ns4E8NavigationTarget[];
}

export interface Ns4E8HubCatalogueItem {
  itemId: string;
  kind: 'projectionTile' | 'relatedList' | 'action' | 'pending';
  label: string;
  entityRef: string;
  /** The workspace the item belongs to; never invented by the composition call. */
  targetRef: string;
  /**
   * For an item the hub READS: the operation behind it. Operations are shared across the module and
   * calls are per workspace, so a tile becomes a local call of the hub over the same operation — an
   * organism only ever consumes a call of its own workspace.
   */
  sourceOperationId?: string;
  sourceBffId?: string;
  /** The shape the source call declares; a list read as an object would project a single record. */
  sourceOutputKind?: 'object' | 'list' | 'paginated';
  score: number;
}

/**
 * A journey reached from the hub is NAVIGATION, not an embedded command: it leaves the sections and
 * travels to the site map, carrying the prominence and order the composition chose.
 */
export interface Ns4E8NavigationTarget {
  targetWorkspaceId: string;
  label: string;
  prominence: 'primary' | 'contextual';
  order: number;
}

export interface Ns4E8HubCatalogue {
  anchorEntity: string;
  items: Ns4E8HubCatalogueItem[];
}

export interface Ns4E8HubComposition {
  workspaceId: string;
  title: string;
  /** Catalogue item ids, in display order. Never a new id. */
  tileOrder: string[];
  primaryActionIds: string[];
  labels: Array<{ itemId: string; label: string }>;
  menuGroups: Array<{ groupId: string; label: string; itemIds: string[] }>;
}

export interface Ns4E8MenuEntry {
  workspaceId: string;
  label: string;
  featureRef: string;
  tier: Ns4WorkspaceTier;
  profileRefs: string[];
}

export interface Ns4E8Model {
  planId: 'e8-workspace-model';
  schemaVersion: typeof NS4_E8_MODEL_VERSION;
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  hubEntity: string;
  workspaces: Ns4E8ModelWorkspace[];
  operations: Ns4E8Operation[];
  /** The menu lists places only: catalogues, hubs and projections. A journey is never a menu item. */
  menu: Ns4E8MenuEntry[];
  landings: Array<{ profileRef: string; workspaceId: string }>;
  systemDecisions: Ns4SystemDecision[];
  modelHash?: string;
}
