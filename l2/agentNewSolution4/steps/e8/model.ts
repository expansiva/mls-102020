/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e8/model.ts" enhancement="_blank"/>

/**
 * The E8 workspace model: every screen of the module, in the shape E9 transposes into the classic
 * L4 format without taking a single decision of its own.
 *
 * A screen is one of three things and never a fourth: the record catalogue of an entity (tier 1),
 * an approved journey (tier 2), or the hub of the dominant anchor and its standalone projections
 * (tier 3). There is no partition of steps into invented workspaces.
 */

import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';

export const NS4_E8_MODEL_VERSION = '2026-08-14-ns4-e8-model-v1' as const;

export type Ns4WorkspaceTier = 'recordCatalogue' | 'journey' | 'hub' | 'projection';

/**
 * The only origins a page can render by, in the vocabulary the frontend actually reads from an
 * operation input: userInput is a form field, selectedEntity is a picker over a query on the page,
 * routeParam comes from the URL, and the rest is resolved at runtime and never rendered.
 */
export type Ns4E8InputSource = 'userInput' | 'selectedEntity' | 'routeParam' | 'actorSession' | 'systemDefault';

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
 * record catalogue synthesizes its four operations from the ontology, because E7 only compiles
 * journeys and a catalogue is not a journey.
 */
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
}

export interface Ns4E8BffCall {
  bffId: string;
  kind: 'query' | 'command';
  operationId: string;
  outputKind: 'object' | 'list' | 'paginated';
  entityRef: string;
}

export type Ns4E8OrganismRole = 'primarySurface' | 'detailPanel' | 'filterControl' | 'contextualAction';

export interface Ns4E8Organism {
  role: Ns4E8OrganismRole;
  dataSource?: string;
  action?: string;
  /** A picker is a query rendered to choose the record another call consumes. */
  usage?: 'picker';
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
