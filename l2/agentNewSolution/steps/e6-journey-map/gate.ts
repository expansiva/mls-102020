/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.ts" enhancement="_blank"/>

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';
import { NsCategoryCatalog, validateNsCatalogIntegrity } from '/_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.js';
import type { NsE6PageContext } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.js';

// isRecord is a leaf type-guard defined locally (not imported from nsFs) so this gate — and its
// unit test — stay free of the libStor/libModel import chain, which touches DOM globals at init.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const E6_JOURNEY_MAP_SCHEMA_VERSION = '2026-07-31-ns-e6-v7';

// Deterministic note attached after the LLM call (never produced by the model).
export const E6_JOURNEY_MAP_NOTE = 'Consolidated navigation map derived from workflows/operations stories (view, not source).';

// Canonical workspace kinds — the consumer (Stage 2 template selection) depends on this enum:
// 'entityManagement' selects list-first CRUD templates (tabular_classic); 'workflow' selects
// process/queue templates; 'operation' is the residual (dashboards, reports, commands).
export const NS_WORKSPACE_KINDS = ['workflow', 'operation', 'entityManagement', 'landing'] as const;

export type NsE6WorkspaceKind = typeof NS_WORKSPACE_KINDS[number];

// 'public' is a pseudo-actor for pre-login landings (D6/D7): it is NOT in the E4 roster and is exempt
// from the roster check and the ⊇ actor-union math.
export const NS_PUBLIC_ACTOR = 'public';

// Organism role enum — the LLM CLASSIFIES and ANCHORS operations into these roles; it never
// designs structure. Stage 2 (create-layout) reads the role to place each organism on the page.
//   primarySurface   — the section's main surface (list/queue/board); exactly 1 per section
//   filterControl    — refines a surface (search/filter); MUST declare attachTo = the query bffCall
//   contextualAction — a command launched from the surface (e.g. createReservation)
//   detailPanel      — a getById read shown as a side/detail panel
//   batchAction      — a command over a multi-selection (or with no public input)
//   navigationEntry  — a link/entry point to a bffCall surfaced on another workspace
export const NS_ORGANISM_ROLES = [
  'primarySurface', 'filterControl', 'contextualAction', 'detailPanel', 'batchAction', 'navigationEntry',
  // content roles (D7) — for landing pages; only `showcase` is backed by a bffCall (a query).
  'hero', 'banner', 'richText', 'imageSet', 'ctaLink', 'showcase',
] as const;

export type NsE6OrganismRole = typeof NS_ORGANISM_ROLES[number];

// A bffCall is consumed via `dataSource` (query-backed) or `action` (command-backed). navigationEntry
// links to a bffCall living on ANOTHER workspace (a cross-page pointer, validated against the global
// bffId set — never triggers a local identity-call synthesis).
const NS_QUERY_BACKED_ROLES = new Set<NsE6OrganismRole>(['primarySurface', 'detailPanel', 'showcase', 'navigationEntry']);
const NS_COMMAND_BACKED_ROLES = new Set<NsE6OrganismRole>(['contextualAction', 'batchAction']);
const NS_CONTENT_ROLES = new Set<NsE6OrganismRole>(['hero', 'banner', 'richText', 'imageSet', 'ctaLink']);

export const NS_BFF_KINDS = ['query', 'command'] as const;
export type NsE6BffKind = typeof NS_BFF_KINDS[number];
export type NsE6FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

// ── bffCall (the view contract): 1..N usecases composed + a projection of only what the page renders ──
export interface NsE6BffUse {
  operationId: string;
  optional?: boolean; // only allowed on a composed (uses N>1) query call: usecase failed → slice null
}

// Where a command input's VALUE comes from on the page. Declared so the T4 template-readiness lint
// can refuse a required id with no resolvable source (the 102045 billingWorkspace case: `projectId
// required` with no picker query became a typed-in text field). Optional in this phase: re-runs
// predating the field stay valid.
// `actorDirectory` (2026-08-03): the value is a PERSON holding an actor role, chosen from the platform
// roster — the sibling `actorSession` never had. sourceRef names the role. See readme "A person is not
// a record"; the frontend handoff is todo/changeFrontend/ajuste_actors.md.
export const NS_BFF_INPUT_SOURCES = ['userDecision', 'selection', 'pageInput', 'actorSession', 'derived', 'actorDirectory'] as const;
export type NsE6BffInputSource = typeof NS_BFF_INPUT_SOURCES[number];

export interface NsE6BffInput {
  name: string;
  from?: string; // <operationId>.<inputId> — absent only for free inputs (pagination/flags) that carry `type`
  type?: NsE6FieldType;
  required?: boolean;
  source?: NsE6BffInputSource;
  // Qualifies the source when needed: `selection` → the query bffId in the SAME workspace;
  // `derived` → `<bffId>.<outputField>` of an earlier command.
  sourceRef?: string;
}

export interface NsE6BffField {
  name: string;
  from: string; // <operationId>.<field> | <operationId>.$items.<field> — every projected field traces back
  type?: NsE6FieldType;
  required?: boolean;
  item?: { fields: NsE6BffField[] };
}

export interface NsE6BffOutput {
  kind: 'object' | 'list' | 'paginated';
  fields: NsE6BffField[];
}

export interface NsE6BffCall {
  bffId: string;
  kind: NsE6BffKind;
  uses: NsE6BffUse[];
  input?: NsE6BffInput[];
  output?: NsE6BffOutput; // absent for a command passthrough (1:1 with the operation)
  route?: string; // DERIVED (<module>.<workspaceId>.<bffId>) — never declared by the LLM
}

export interface NsE6Organism {
  operationId?: string; // legacy/simple LLM input only — normalized into dataSource/action by prepare
  role: NsE6OrganismRole;
  dataSource?: string; // bffId of the query call feeding this organism
  action?: string;     // bffId of the command call this organism launches
  attachTo?: string;   // filterControl: the query bffId it refines
  slice?: string;      // which top-level output field of a COMPOSED call (uses N>1) this organism consumes
}

export interface NsE6Section {
  sectionId: string;
  intent: string;
  organisms: NsE6Organism[];
}

// PRESENTATION (improveNewSolution T1/T2): the page CATEGORY (interaction shape) + STYLE the l2
// renderer resolves its template with (`_102040_/l4/templates/<styleRef>/<categoryRef>/template.md`).
// It classifies the FORM of the contract; it never changes the use case, the rules or the entities.
// `categoryRef` is deliberately NOT an enum anywhere — the catalog (categoryList.json) is the single
// source of truth and grows without a schema bump; existence is checked by the gate against the
// catalog handed in through the context.
export interface NsE6PresentationAlternate {
  categoryRef: string;
  confidence: number;
  reason?: string;
}

export interface NsE6Presentation {
  categoryRef: string;
  styleRef?: string;
  confidence: number; // 0–10 (analise1 scale; >= 8 = strong fit, < 6 = orphan candidate)
  alternates?: NsE6PresentationAlternate[];
  // RESERVED for the experience axis (UX variants per category) — accepted and carried, never
  // produced or validated in this phase.
  experienceRef?: string;
  // Written by the e7 template-readiness lint (T4), never by the model: false means the contract
  // does not meet the category's minimum, so the l2 renderer must use the generic fallback.
  templateReady?: boolean;
  classificationNote?: string;
}

// Consumer contract (agentChangeFrontend/helpers/.ts): workspaces are the page-grouping unit —
// one page per workspace. `bffCalls` are the wire contracts (the view); `operationIds` is DERIVED by
// code (flattened from bffCalls[].uses) so existing consumers and the e7 coverage/capability checks
// keep reading the same flat field.
export interface NsE6Workspace {
  workspaceId: string;
  title: string;
  actors: string[];
  kind: NsE6WorkspaceKind;
  entity: string;
  workflowId?: string;
  bffCalls: NsE6BffCall[];
  sections: NsE6Section[];
  operationIds: string[];
  purpose: string;
  presentation?: NsE6Presentation;
}

export interface NsE6Landing {
  actorId: string;
  workspaceId: string;
  reason?: string;
}

// Advisory for Stage 2 (warnings only, never machine-enforced navigation).
export interface NsE6NavigationEdge {
  from: string;
  to: string;
  operationId?: string;
  description?: string;
}

export interface NsE6JourneyMapArtifact {
  schemaVersion: typeof E6_JOURNEY_MAP_SCHEMA_VERSION;
  moduleName: string;
  note: string;
  workspaces: NsE6Workspace[];
  landings: NsE6Landing[];
  navigationEdges: NsE6NavigationEdge[];
}

// Per-operation facts needed by the deterministic gates. Built once from the frozen operation defs and
// passed in — the gate never reads disk (keeps it unit-testable).
export interface NsE6OperationFact {
  accessPatternKind: 'list' | 'getById' | 'lookup' | 'commandInput';
  selection: 'none' | 'single' | 'multiple';
  opKind: 'create' | 'update' | 'delete' | 'query' | 'view';
  hasPublicInput: boolean; // has an input whose source is userInput | selectedEntity | routeParam
  actors: string[]; // D6: the actors this operation serves (read tolerant of the old singular `actor`)
  inputNames: string[];  // A4.2: valid `from` suffixes for a bffCall.input entry (the operation inputIds)
  // A4.2 + P1: valid `from` suffixes for a bffCall.output field, SPLIT BY POSITION (top vs item).
  outputTopPaths: string[];
  outputItemPaths: string[];
  /** T5: the entity this operation acts on — an incoming edge that CREATES it cannot carry its id. */
  entity?: string;
}

export interface E6GateContext {
  moduleName: string;
  classificationWorkflowIds: string[];
  classificationOperationIds: string[];
  rosterActorIds: string[];
  entityIds: string[];
  nowCapabilityActorIds: string[];
  operationFacts: Record<string, NsE6OperationFact>;
  // Page-category catalog, READ FROM DISK BY THE AGENT and handed in (the gate never reads disk —
  // same contract as operationFacts). Three states on purpose:
  //   catalog   — classification is checked;
  //   null      — the agent TRIED and the file was unreachable: one run-level warning, checks skipped
  //               (a run cannot be blamed for a classification it could not make);
  //   undefined — the caller does not wire presentation at all (older callers/tests): fully silent.
  categoryCatalog?: NsCategoryCatalog | null;
  // Style ids that actually have a template folder in `_102040_/l4/templates/<styleRef>/`. Empty =
  // unknown (not "none") — the styleRef check then no-ops.
  templateStyleRefs?: string[];
  // T5: the records each page is known to be handed, derived from the human-approved journey
  // prerequisites (deriveNsE6PageContext). Absent = no journey declares any context.
  pageContext?: NsE6PageContext;
  // T5: false while a SINGLE workspace is being validated (the detail fan-out), where the other pages
  // may not exist on disk yet — the pageInput provider check needs the whole map and runs at finalize.
  wholeMap?: boolean;
}

// ---------------------------------------------------------------------------
// output-path derivation (A4.2) — shared with the fact builder in the agent
// ---------------------------------------------------------------------------

// P1 (newSolution_14): the valid `from` suffixes SPLIT BY POSITION, so the flat-list-mislabeled-as-
// paginated shape is INEXPRESSIBLE (not merely detected). A projection field's `from` is validated
// against `top` when the field sits at the bffCall output top level, and against `item` when it sits
// inside an `item.fields` block (or is a top field of a `kind: list` bffCall — its fields ARE items).
//   - top  = the operation's top-level output field NAMES, plus `$items` (the whole collection) when
//            the op returns a collection. NEVER a bare `$items.<col>`.
//   - item = the record columns: `$items.<col>` (primary-collection shorthand) and
//            `<arrayField>.$items.<col>` (explicit).
export interface NsE6OutputPathSets { top: string[]; item: string[] }

export function collectNsOutputPathSets(shape: unknown): NsE6OutputPathSets {
  const top = new Set<string>();
  const item = new Set<string>();
  const record = isRecord(shape) ? shape : {};
  const kind = typeof record.kind === 'string' ? record.kind : '';
  const fields = Array.isArray(record.fields) ? record.fields.filter(isRecord) : [];
  const asField = (raw: Record<string, unknown>) => ({
    name: typeof raw.name === 'string' ? raw.name : '',
    type: typeof raw.type === 'string' ? raw.type : '',
    itemFields: isRecord(raw.item) && Array.isArray(raw.item.fields) ? raw.item.fields.filter(isRecord) : [],
  });
  if (kind === 'list') {
    // The operation returns Item[]: its top is the whole array; its columns are the fields.
    top.add('$items');
    for (const raw of fields) {
      const f = asField(raw);
      if (f.name) item.add(`$items.${f.name}`);
    }
    return { top: [...top], item: [...item] };
  }
  // object | paginated: top field names + $items (the primary collection); columns live under item.
  let primaryArrayItems: string[] | null = null;
  for (const raw of fields) {
    const f = asField(raw);
    if (!f.name) continue;
    top.add(f.name);
    if (f.type === 'array' && f.itemFields.length) {
      const subNames = f.itemFields.map(sub => (typeof sub.name === 'string' ? sub.name : '')).filter(Boolean);
      for (const sub of subNames) item.add(`${f.name}.$items.${sub}`);
      if (!primaryArrayItems) primaryArrayItems = subNames;
    }
  }
  if (primaryArrayItems) {
    top.add('$items'); // the whole primary collection (referenced by the bffCall's array field)
    for (const sub of primaryArrayItems) item.add(`$items.${sub}`);
  }
  return { top: [...top], item: [...item] };
}

// Combined set (top ∪ item) — used only where position does not matter (the prompt vocabulary shown to
// the LLM). The gate validates position-aware via collectNsOutputPathSets.
export function collectNsOutputPaths(shape: unknown): string[] {
  const { top, item } = collectNsOutputPathSets(shape);
  return [...new Set([...top, ...item])];
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

// workflowId is DERIVABLE from the classification (each operation knows its owning workflow), and
// the LLM systematically omits it (cafeFlow run: both attempts failed 'workspace.workflow.missing').
// Deterministic repair, per the "derivable values are attached by code" convention: for a
// kind='workflow' workspace without workflowId, infer it when its operations resolve to exactly ONE
// owning workflow. Ambiguity (0 or >1 candidates) is left for the gate to report.
export function repairE6WorkflowIds(
  artifact: NsE6JourneyMapArtifact,
  classification: {
    workflows: { workflowId: string; operationIds: string[] }[];
    operations: { operationId: string; workflowId?: string }[];
  },
): NsE6JourneyMapArtifact {
  const ownerByOperation = new Map<string, string>();
  for (const workflow of classification.workflows) {
    for (const operationId of workflow.operationIds) ownerByOperation.set(operationId, workflow.workflowId);
  }
  for (const operation of classification.operations) {
    if (operation.workflowId) ownerByOperation.set(operation.operationId, operation.workflowId);
  }
  for (const workspace of artifact.workspaces) {
    if (workspace.kind !== 'workflow' || workspace.workflowId) continue;
    const candidates = new Set(
      workspace.operationIds
        .map(operationId => ownerByOperation.get(operationId))
        .filter((workflowId): workflowId is string => !!workflowId),
    );
    if (candidates.size === 1) workspace.workflowId = [...candidates][0];
  }
  return artifact;
}

// The workspace kind is DERIVABLE from the classification facts — never trusted from the LLM
// (the 102051 run labeled entity CRUDs as "workflow", which rejected the list-first CRUD template
// downstream by construction). Deterministic rule, applied after the LLM call:
//   1. any operation owned by a workflow                     -> 'workflow'
//   2. all standalone, create AND update on the workspace
//      entity, other-entity operations read-only (query/view
//      side lists like low-stock alerts don't demote a
//      management page)                                      -> 'entityManagement'
//   3. otherwise                                             -> 'operation'
export function deriveE6WorkspaceKinds(
  artifact: NsE6JourneyMapArtifact,
  classification: {
    workflows: { workflowId: string; operationIds: string[] }[];
    operations: { operationId: string; workflowId?: string; kind?: string; entity?: string }[];
  },
): NsE6JourneyMapArtifact {
  const ownerByOperation = new Map<string, string>();
  for (const workflow of classification.workflows) {
    for (const operationId of workflow.operationIds) ownerByOperation.set(operationId, workflow.workflowId);
  }
  const byId = new Map(classification.operations.map(operation => [operation.operationId, operation]));
  for (const operation of classification.operations) {
    if (operation.workflowId) ownerByOperation.set(operation.operationId, operation.workflowId);
  }

  for (const workspace of artifact.workspaces) {
    if (workspace.kind === 'landing') continue; // D7: landing is LLM-declared, not derived from operations
    const operations = workspace.operationIds
      .map(operationId => byId.get(operationId))
      .filter((operation): operation is NonNullable<typeof operation> => !!operation);
    if (operations.length === 0) continue; // unknown operations: left for the gate to report

    const hasWorkflowOperation = workspace.operationIds.some(operationId => ownerByOperation.has(operationId));
    if (hasWorkflowOperation) {
      workspace.kind = 'workflow';
      continue;
    }

    const ownKinds = new Set(operations.filter(operation => operation.entity === workspace.entity).map(operation => operation.kind));
    const foreignOpsReadOnly = operations.every(operation =>
      operation.entity === workspace.entity || operation.kind === 'query' || operation.kind === 'view');
    if (ownKinds.has('create') && ownKinds.has('update') && foreignOpsReadOnly) {
      workspace.kind = 'entityManagement';
      delete workspace.workflowId; // management pages never bind to a workflow
      continue;
    }

    workspace.kind = 'operation';
  }
  return artifact;
}

// N3: the route is DERIVED from the workspace, never declared — <module>.<workspaceId>.<bffId>.
// The emitter (N4) reads it from here; the operation bffName stays only as a deprecated back-compat
// read. Applied after the LLM call, like the kind/workflowId derivations.
export function deriveE6BffRoutes(artifact: NsE6JourneyMapArtifact): NsE6JourneyMapArtifact {
  for (const workspace of artifact.workspaces) {
    for (const call of workspace.bffCalls) {
      call.route = `${artifact.moduleName}.${workspace.workspaceId}.${call.bffId}`;
    }
  }
  return artifact;
}

// Run12 (102051): every failed detail wrote RELATIVE projection paths — the models systematically drop
// the "<op>." prefix inside item.fields ("$items.col", "lowStockAlerts.$items.col"), point an array
// field's `from` at "<op>.<array>.$items" instead of "<op>.<array>", and use the "$items" primary
// shorthand for a NON-primary array's columns. All of these are UNAMBIGUOUS when the call composes
// exactly ONE operation (the default granularity) — so, per the "derivable values are attached by code"
// convention, qualify them deterministically BEFORE the gate instead of burning repair rounds. A `from`
// is rewritten ONLY when the rewrite lands on a valid path of the single used operation; anything still
// ambiguous (composed calls, a prefix naming ANOTHER known operation, unknown names) is left untouched
// for the gate to report.
/**
 * Run 102046 (03/08): 24 of the 43 detail-gate errors — and 2 of the 4 workspaces that never got
 * written after two repair rounds — were ONE confusion, repeated identically on every attempt. The
 * model reads `action` as the button's LABEL and `dataSource` as "the call behind it":
 *
 *   contextualAction  action: "Create a project baseline"   dataSource: "createProject"
 *   primarySurface    action: "Browse and select projects"  dataSource: "queryProjects"
 *
 * The contract is the opposite: `action` is the bffId of a COMMAND, `dataSource` the bffId of a QUERY.
 * Both halves are wrong in a way that resolves the other, with no guessing left over:
 *   - `dataSource` naming a COMMAND is invalid by contract, and `action` naming no call is invalid too
 *     → the two were swapped: the command belongs in `action`.
 *   - `dataSource` naming a real query is valid, so an `action` that names no call is a LABEL, not a
 *     reference → drop it. The contract has no field for a label, and nothing downstream reads one.
 * Anything else (an `action` naming an unknown call while `dataSource` is also unusable) is left for
 * the gate to report: a repair may only fix what it can prove.
 */
export function repairE6OrganismReferences(artifact: NsE6JourneyMapArtifact): NsE6JourneyMapArtifact {
  for (const workspace of artifact.workspaces) {
    const commandIds = new Set(workspace.bffCalls.filter(call => call.kind === 'command').map(call => call.bffId));
    const queryIds = new Set(workspace.bffCalls.filter(call => call.kind === 'query').map(call => call.bffId));
    const localIds = new Set(workspace.bffCalls.map(call => call.bffId));
    for (const section of workspace.sections) {
      for (const organism of section.organisms) {
        // A reference field holding a "no value" WORD is not a reference — the model reached for a
        // placeholder because the field is optional and it filled everything in (run 102046/run04:
        // a command-only page wrote `dataSource: "none"` beside a perfectly correct `action`, and the
        // gate rejected the page for a field that should simply have been absent).
        for (const key of ['dataSource', 'action', 'attachTo'] as const) {
          const value = organism[key];
          if (value && !localIds.has(value) && NS_NO_VALUE_WORDS.has(value.trim().toLowerCase())) delete organism[key];
        }
        if (!organism.action || localIds.has(organism.action)) continue; // nothing to prove
        if (organism.dataSource && commandIds.has(organism.dataSource)) {
          organism.action = organism.dataSource;
          delete organism.dataSource;
          continue;
        }
        if (organism.dataSource && queryIds.has(organism.dataSource)) delete organism.action;
      }
    }
  }
  return artifact;
}

const NS_NO_VALUE_WORDS = new Set(['none', 'null', 'undefined', 'n/a', 'na', '-', '--', 'nenhum', 'nenhuma']);

export function repairE6BffFroms(
  artifact: NsE6JourneyMapArtifact,
  operationFacts: Record<string, Pick<NsE6OperationFact, 'inputNames' | 'outputTopPaths' | 'outputItemPaths'>>,
): NsE6JourneyMapArtifact {
  for (const workspace of artifact.workspaces) {
    for (const call of workspace.bffCalls) {
      if (call.uses.length !== 1) continue;
      const op = call.uses[0].operationId;
      const fact = operationFacts[op];
      if (!fact) continue;
      // The path with the op prefix stripped — or null when the prefix names ANOTHER known operation
      // (a real cross-op mistake the gate must report, never silently rewrite).
      const strip = (from: string): string | null => {
        const resolved = resolveFrom(from);
        if (resolved?.op === op) return resolved.rest;
        if (resolved && operationFacts[resolved.op]) return null;
        return from;
      };
      for (const entry of call.input || []) {
        if (!entry.from) continue;
        const stripped = strip(entry.from);
        if (stripped !== null && fact.inputNames.includes(stripped)) entry.from = `${op}.${stripped}`;
      }
      if (!call.output) continue;
      const tops = new Set(fact.outputTopPaths);
      const items = new Set(fact.outputItemPaths);
      for (const field of call.output.fields || []) {
        if (!field.from) continue;
        const stripped = strip(field.from);
        if (stripped === null) continue;
        if (isArrayField(field)) {
          // The array field references its COLLECTION: "<array>.$items" (and bare "$items") degrade to
          // the collection name the top pool knows.
          let ref = stripped;
          if (!tops.has(ref) && ref.endsWith('.$items')) {
            const collection = ref.slice(0, -'.$items'.length);
            if (tops.has(collection)) ref = collection;
          }
          if (tops.has(ref)) field.from = `${op}.${ref}`;
          // Columns inside item.fields: "$items.<col>" / "<array>.$items.<col>" / bare "<col>" — when
          // the column resolves under THIS array's item prefix, qualify it there.
          const itemPrefix = ref === '$items' ? '$items' : `${ref}.$items`;
          for (const sub of field.item?.fields || []) {
            if (!sub.from) continue;
            const subStripped = strip(sub.from);
            if (subStripped === null) continue;
            let subRef = subStripped;
            if (!items.has(subRef)) {
              const col = subRef.split('.').pop() || '';
              if (col && items.has(`${itemPrefix}.${col}`)) subRef = `${itemPrefix}.${col}`;
            }
            if (items.has(subRef)) sub.from = `${op}.${subRef}`;
          }
        } else {
          // Scalar field: a list output's fields ARE item columns; object/paginated scalars are top paths.
          const pool = call.output.kind === 'list' ? items : tops;
          let ref = stripped;
          if (call.output.kind === 'list' && !pool.has(ref) && items.has(`$items.${ref}`)) ref = `$items.${ref}`;
          if (pool.has(ref)) field.from = `${op}.${ref}`;
        }
      }
    }
  }
  return artifact;
}

export function prepareE6JourneyMap(input: unknown, context: Pick<E6GateContext, 'moduleName'>): NsE6JourneyMapArtifact {
  const record = isRecord(input) ? input : {};
  const workspaces = Array.isArray(record.workspaces) ? record.workspaces.filter(isRecord) : [];
  const landings = Array.isArray(record.landings) ? record.landings.filter(isRecord) : [];
  const edges = Array.isArray(record.navigationEdges) ? record.navigationEdges.filter(isRecord) : [];
  return {
    schemaVersion: E6_JOURNEY_MAP_SCHEMA_VERSION,
    moduleName: context.moduleName,
    note: E6_JOURNEY_MAP_NOTE,
    workspaces: workspaces.map(workspace => {
      const workflowId = readString(workspace.workflowId);
      const presentation = readPresentation(workspace.presentation);
      const sections = readSections(workspace.sections);
      // N2 default: when the LLM declares no explicit bffCalls, synthesize an identity call per
      // organism reference (bffId == operationId) — 1 identity query per query organism, 1 passthrough
      // command per command organism. This keeps A/B migration regression-free (the old operationId
      // organisms degrade to identity views).
      const bffCalls = normalizeBffCalls(readBffCalls(workspace.bffCalls), sections);
      return {
        workspaceId: readString(workspace.workspaceId) || '',
        title: readString(workspace.title) || '',
        actors: readActors(workspace),
        kind: readEnum(workspace.kind, NS_WORKSPACE_KINDS, 'operation'),
        entity: readString(workspace.entity) || '',
        ...(workflowId ? { workflowId } : {}),
        bffCalls,
        sections,
        // Derived from the bffCalls' uses (source of truth). First occurrence wins, order preserved.
        operationIds: deriveOperationIds(bffCalls),
        // purpose is no longer schema-required (models intermittently drop it); backfill from title. In
        // the detail phase it is overwritten with the sitemap slice's purpose (the sitemap owns it).
        purpose: readString(workspace.purpose) || readString(workspace.title) || readString(workspace.workspaceId) || 'workspace',
        ...(presentation ? { presentation } : {}),
      };
    }),
    landings: landings.map(landing => {
      const reason = readString(landing.reason);
      return {
        actorId: readString(landing.actorId) || '',
        workspaceId: readString(landing.workspaceId) || '',
        ...(reason ? { reason } : {}),
      };
    }),
    navigationEdges: edges.map(edge => {
      const operationId = readString(edge.operationId);
      const description = readString(edge.description);
      return {
        from: readString(edge.from) || '',
        to: readString(edge.to) || '',
        ...(operationId ? { operationId } : {}),
        ...(description ? { description } : {}),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// invariants
// ---------------------------------------------------------------------------

export function validateE6Invariants(
  artifact: NsE6JourneyMapArtifact,
  context: E6GateContext,
): { artifact: NsE6JourneyMapArtifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];
  const workspaceIds = new Set<string>();
  const knownWorkflows = new Set(context.classificationWorkflowIds);
  const knownOperations = new Set(context.classificationOperationIds);
  const knownActors = new Set(context.rosterActorIds);
  const knownEntities = new Set(context.entityIds);
  // Global sets: every bffId across the map (navigationEntry cross-page links) and every operation a
  // bffCall consumes (A4.4 coverage — no orphan operation on any page).
  const allBffIds = new Set<string>();
  const usedOperationIds = new Set<string>();
  for (const workspace of artifact.workspaces) {
    for (const call of workspace.bffCalls) {
      allBffIds.add(call.bffId);
      for (const use of call.uses) usedOperationIds.add(use.operationId);
    }
  }
  // A landing is opened COLD: no navigation hands it anything (improveJourneys T2).
  const landingWorkspaceIds = new Set(artifact.landings.map(landing => landing.workspaceId));
  // T5: what each page is actually handed — declared context (journeys) + what a navigation can carry.
  const carriedIntoWorkspace = context.wholeMap === false ? null : buildCarriedContext(artifact, context);

  for (const workspace of artifact.workspaces) {
    if (workspaceIds.has(workspace.workspaceId)) {
      issues.push(errorIssue('workspace.id.duplicate', `duplicated workspaceId ${workspace.workspaceId}`, workspace.workspaceId));
    }
    workspaceIds.add(workspace.workspaceId);
    const workspaceActorUnion = new Set<string>(); // D6: ∪ of the consumed operations' actors

    // ── bffCalls (the view contracts) ──
    const localBff = new Map<string, NsE6BffCall>();
    for (const call of workspace.bffCalls) {
      if (localBff.has(call.bffId)) {
        issues.push(errorIssue('bff.id.duplicate', `workspace ${workspace.workspaceId}: duplicated bffId ${call.bffId}`, workspace.workspaceId));
      }
      localBff.set(call.bffId, call);
      const isLanding = landingWorkspaceIds.has(workspace.workspaceId);
      validateBffCall(workspace, call, context, knownOperations, workspaceActorUnion, isLanding, issues);
      // A landing has no sender at all — T2 owns that message, so one input never gets two errors.
      if (carriedIntoWorkspace && !isLanding) {
        validatePageInputProviders(workspace, call, carriedIntoWorkspace[workspace.workspaceId], context, issues);
      }
    }

    if (workspace.sections.length === 0) {
      issues.push(errorIssue('workspace.sections.empty', `workspace ${workspace.workspaceId} declares no sections`, workspace.workspaceId));
    }
    for (const section of workspace.sections) {
      const surfaceCount = section.organisms.filter(organism => organism.role === 'primarySurface').length;
      // Exactly 1 primarySurface per section — EXCEPT landing pages (D7: a landing dispenses
      // operations, its sections are content organisms with no primarySurface).
      if (workspace.kind !== 'landing' && surfaceCount !== 1) {
        issues.push(errorIssue('section.primarySurface.count', `workspace ${workspace.workspaceId} section ${section.sectionId} must declare exactly 1 primarySurface, found ${surfaceCount}`, workspace.workspaceId));
      }
      for (const organism of section.organisms) {
        validateOrganism(workspace, section, organism, context, localBff, allBffIds, issues);
      }
    }

    if (workspace.kind === 'workflow') {
      if (!workspace.workflowId) {
        issues.push(errorIssue('workspace.workflow.missing', `workspace ${workspace.workspaceId} has kind "workflow" but declares no workflowId`, workspace.workspaceId));
      } else if (!knownWorkflows.has(workspace.workflowId)) {
        issues.push(errorIssue('workspace.workflow.unknown', `workspace ${workspace.workspaceId} references unclassified workflow ${workspace.workflowId}`, workspace.workspaceId));
      }
    }
    if (workspace.kind === 'entityManagement' && workspace.workflowId) {
      issues.push(errorIssue('workspace.management.workflow', `workspace ${workspace.workspaceId} has kind "entityManagement" but declares workflowId ${workspace.workflowId} — management pages never bind to a workflow`, workspace.workspaceId));
    }
    if (workspace.actors.length === 0) {
      issues.push(errorIssue('workspace.actors.empty', `workspace ${workspace.workspaceId} declares no actors`, workspace.workspaceId));
    }
    for (const actor of workspace.actors) {
      if (actor !== NS_PUBLIC_ACTOR && !knownActors.has(actor)) {
        issues.push(errorIssue('workspace.actor.unknown', `workspace ${workspace.workspaceId}: actor ${actor} is not in the E4 roster`, workspace.workspaceId));
      }
    }
    // D6 authorization gate: the workspace's actors must COVER every actor of the operations its
    // bffCalls consume (workspace.actors ⊇ ∪ operation.actors) — otherwise a login that can open the
    // page could not run one of its calls.
    const workspaceActors = new Set(workspace.actors);
    for (const actor of workspaceActorUnion) {
      if (!workspaceActors.has(actor)) {
        issues.push(errorIssue('workspace.actors.notCovering', `workspace ${workspace.workspaceId}: hosts an operation for actor "${actor}" not in the workspace actors [${workspace.actors.join(', ')}]`, workspace.workspaceId));
      }
    }
    if (!knownEntities.has(workspace.entity)) {
      issues.push(errorIssue('workspace.entity.unknown', `workspace ${workspace.workspaceId}: entity ${workspace.entity} is not a declared E3 entity`, workspace.workspaceId));
    }
    validateWorkspacePresentation(workspace, context, issues);
  }

  // Catalog integrity is a CONFIGURATION error (not a classification one) — reported once per run.
  // An ABSENT catalog is a warning, also once: classification is simply not enforceable this run.
  if (context.categoryCatalog) issues.push(...validateNsCatalogIntegrity(context.categoryCatalog));
  else if (context.categoryCatalog === null) {
    issues.push(warningIssue('presentation.catalog.unavailable', 'categoryList.json is not reachable from this runtime — workspaces are not classified and the presentation checks are skipped', 'presentation'));
  }

  // A4.4: every classified operation is used by ≥1 bffCall (no orphan operation on any page).
  for (const operationId of context.classificationOperationIds) {
    if (!usedOperationIds.has(operationId)) {
      issues.push(errorIssue('operation.unassigned', `classified operation ${operationId} is used by no bffCall`, operationId));
    }
  }

  const landedActors = new Set<string>();
  for (const landing of artifact.landings) {
    if (!workspaceIds.has(landing.workspaceId)) {
      issues.push(errorIssue('landing.workspace.unknown', `landing for ${landing.actorId} points to undeclared workspace ${landing.workspaceId}`, landing.actorId));
    }
    if (landing.actorId !== NS_PUBLIC_ACTOR && !knownActors.has(landing.actorId)) {
      issues.push(errorIssue('landing.actor.unknown', `landing actor ${landing.actorId} is not in the E4 roster`, landing.actorId));
    }
    landedActors.add(landing.actorId);
  }
  for (const actorId of context.nowCapabilityActorIds) {
    if (!landedActors.has(actorId)) {
      issues.push(warningIssue('actor.landing.missing', `actor ${actorId} owns now-priority behaviors but has no landing workspace`, actorId));
    }
  }

  for (const edge of artifact.navigationEdges) {
    if (!workspaceIds.has(edge.from) || !workspaceIds.has(edge.to)) {
      issues.push(warningIssue('edge.workspace.unknown', `edge ${edge.from} -> ${edge.to} references an undeclared workspace`, `${edge.from}->${edge.to}`));
    }
  }

  return { artifact, issues };
}

// ── presentation (improveNewSolution T3): is the classification VALID and coherent with the form? ──
//
// Severity policy, deliberately asymmetric:
//   error   — what the model owns and a retry CAN fix (an unknown categoryRef/alternate).
//   warning — what a retry canNOT fix (styleRef comes from run configuration, not from the LLM) and
//             the "finding" checks, which flag a suspicious shape for a human without blocking a run.
// Every check that names a category id degrades to a NO-OP when that id is no longer in the catalog
// (renamed/removed): the catalog is the single source of truth, so the gate must never outlive it.
function validateWorkspacePresentation(
  workspace: NsE6Workspace,
  context: E6GateContext,
  issues: NsGateIssue[],
): void {
  // Unavailable catalog: skip silently here — the run-level warning is emitted once by the caller.
  const catalog = context.categoryCatalog;
  if (!catalog) return;
  const presentation = workspace.presentation;
  if (!presentation) {
    issues.push(warningIssue('presentation.missing', `workspace ${workspace.workspaceId} has no presentation (category/style) — the l2 renderer falls back to the generic template`, workspace.workspaceId));
    return;
  }

  if (!catalog.byId.has(presentation.categoryRef)) {
    issues.push(errorIssue('presentation.category.unknown', `workspace ${workspace.workspaceId}: categoryRef "${presentation.categoryRef}" is not in categoryList.json`, workspace.workspaceId));
  }
  for (const alternate of presentation.alternates || []) {
    if (!catalog.byId.has(alternate.categoryRef)) {
      issues.push(errorIssue('presentation.alternate.unknown', `workspace ${workspace.workspaceId}: alternate categoryRef "${alternate.categoryRef}" is not in categoryList.json`, workspace.workspaceId));
    }
  }
  // styleRef is run configuration, never an LLM decision — a mismatch is reported as a warning
  // because no detail retry could fix it (same lesson as run12 siteMap.actors.notCovering).
  const styleRefs = context.templateStyleRefs || [];
  if (presentation.styleRef && styleRefs.length > 0 && !styleRefs.includes(presentation.styleRef)) {
    issues.push(warningIssue('presentation.style.unknown', `workspace ${workspace.workspaceId}: styleRef "${presentation.styleRef}" has no template folder (known: ${styleRefs.join(', ')})`, workspace.workspaceId));
  }
  if (presentation.confidence < 6) {
    issues.push(warningIssue('presentation.confidence.low', `workspace ${workspace.workspaceId}: classified as ${presentation.categoryRef} with confidence ${presentation.confidence} — candidate for a new catalog category`, workspace.workspaceId));
  }

  validatePresentationShape(workspace, presentation, catalog, issues);
}

// Coarse category × form coherence (deterministic, no LLM). Start with these three; the list grows
// with experience. Each one is skipped when its category id is absent from the catalog.
function validatePresentationShape(
  workspace: NsE6Workspace,
  presentation: NsE6Presentation,
  catalog: NsCategoryCatalog,
  issues: NsGateIssue[],
): void {
  const category = presentation.categoryRef;
  const known = (id: string): boolean => catalog.byId.has(id);
  const finding = (code: string, message: string): void => {
    issues.push(warningIssue(code, `workspace ${workspace.workspaceId} (${category}): ${message}`, workspace.workspaceId));
  };

  if (category === 'readOnlyDetailPortal' && known(category)) {
    if (workspace.bffCalls.some(call => call.kind === 'command')) {
      finding('presentation.shape.readOnlyHasCommand', 'a read-only portal declares a command bffCall');
    }
  }

  if ((category === 'operationsQueue' || category === 'inventoryControl') && known(category)) {
    const hasPaginated = workspace.bffCalls.some(call => call.kind === 'query' && call.output?.kind === 'paginated');
    if (!hasPaginated) {
      finding('presentation.shape.queueNotPaginated', 'a queue/inventory page has no paginated query (the template expects a paginated envelope)');
    }
  }

  if (category === 'dashboardCommandCenter' && known(category)) {
    const commandBffIds = new Set(workspace.bffCalls.filter(call => call.kind === 'command').map(call => call.bffId));
    const writeSurface = workspace.sections.some(section => section.organisms.some(organism =>
      organism.role === 'primarySurface' && !!organism.action && commandBffIds.has(organism.action)));
    if (writeSurface) {
      finding('presentation.shape.dashboardWriteSurface', 'a monitoring dashboard uses a write command as its primary surface');
    }
  }
}

/**
 * A REQUIRED id input on a command must say where its value comes from, and the reference must
 * resolve INSIDE this workspace. Two legitimate outs, both fixable by the detail retry:
 *   - `selection` + sourceRef = a query bffId of THIS workspace (a picker over an operation the
 *     workspace already hosts);
 *   - `pageInput` (the id arrives with the page — a navigation from another workspace),
 *     `actorSession` (it is the logged-in actor) or `derived` + sourceRef = "<bffId>.<field>".
 * `userDecision` on an id is always wrong: an id is never typed by hand (102045 billingWorkspace).
 */
function validateCommandIdSources(workspace: NsE6Workspace, call: NsE6BffCall, issues: NsGateIssue[], context?: E6GateContext): void {
  const label = `workspace ${workspace.workspaceId} bffCall ${call.bffId}`;
  const queryIds = new Set(workspace.bffCalls.filter(item => item.kind === 'query').map(item => item.bffId));
  const localIds = new Set(workspace.bffCalls.map(item => item.bffId));
  const knownActors = new Set(context?.rosterActorIds || []);
  for (const entry of call.input || []) {
    if (entry.required !== true || !isNsIdInputName(entry.name)) continue;
    if (!entry.source || entry.source === 'userDecision') {
      issues.push(errorIssue(
        'bff.input.idSourceMissing',
        `${label}: required id "${entry.name}" ${entry.source ? 'declares source "userDecision"' : 'declares no source'} — an id is never typed. Declare source "selection" with sourceRef = a query bffId of this workspace (add the picker query over an operation this workspace already hosts), or "pageInput" when the id arrives with the page, or "derived"/"actorSession". When the id names a PERSON rather than a record of this module (there is no entity for it, so no query can list it), use source "actorDirectory" with sourceRef = the actorId whose directory the platform offers`,
        workspace.workspaceId,
      ));
      continue;
    }
    // A PERSON is not a module record: the platform owns the roster, so the picker is the directory of
    // an actor ROLE, named by sourceRef. Verifiable like any other source — it says WHICH role.
    if (entry.source === 'actorDirectory') {
      const entityId = context ? nsEntityOfIdInput(entry.name, context.entityIds) : '';
      if (entityId) {
        issues.push(errorIssue(
          'bff.input.actorDirectoryOnRecord',
          `${label}: required id "${entry.name}" uses source "actorDirectory" but it names the declared entity ${entityId} — a record of this module is picked with source "selection" over a query, not from the actor directory`,
          workspace.workspaceId,
        ));
      } else if (!entry.sourceRef || (knownActors.size > 0 && !knownActors.has(entry.sourceRef))) {
        issues.push(errorIssue(
          'bff.input.idSourceUnresolved',
          `${label}: required id "${entry.name}" has source "actorDirectory" but sourceRef "${entry.sourceRef || '(none)'}" is not an actor of this module (${[...knownActors].join(', ') || 'roster unavailable'}) — name the role whose people can be chosen here`,
          workspace.workspaceId,
        ));
      }
      continue;
    }
    if (entry.source === 'selection') {
      if (!entry.sourceRef || !queryIds.has(entry.sourceRef)) {
        issues.push(errorIssue('bff.input.idSourceUnresolved', `${label}: required id "${entry.name}" has source "selection" but sourceRef "${entry.sourceRef || '(none)'}" is not a query bffCall of this workspace (${[...queryIds].join(', ') || 'none declared'})`, workspace.workspaceId));
      }
      continue;
    }
    if (entry.source === 'derived') {
      const head = (entry.sourceRef || '').split('.')[0];
      if (!head || !localIds.has(head)) {
        issues.push(errorIssue('bff.input.idSourceUnresolved', `${label}: required id "${entry.name}" has source "derived" but sourceRef "${entry.sourceRef || '(none)'}" does not start with a bffCall of this workspace`, workspace.workspaceId));
      }
    }
  }
}

/**
 * improveJourneys T2. Two holes the id-source rule above leaves open, both real in the 102045 run:
 *
 * 1. It only looks at COMMANDS and at id-shaped names, so a required input with NO `source` at all on a
 *    QUERY passed untouched — `viewJobCostSummary.projectId` sailed through e6 AND e7 with zero findings.
 *    Any required input must say where its value comes from (`bff.input.sourceMissing`).
 * 2. Nothing knew what a LANDING is. A landing is opened cold — no navigation hands it anything — so a
 *    required `pageInput` there has no sender by construction (`landing.requiresPageInput`), and a
 *    `selection`/`derived` that does not resolve inside the page is unreachable too
 *    (`landing.input.unresolved`). The way out named in the message is the one the model can act on
 *    while the page is being designed: host a query that resolves the record from the actor's own
 *    context (the open/current one) and feed the input from it, or take it from the session.
 *
 * Cases the command-id rule already reports with a richer message are skipped here — one input never
 * produces two errors.
 */
function validateRequiredInputSources(workspace: NsE6Workspace, call: NsE6BffCall, isLanding: boolean, issues: NsGateIssue[]): void {
  const label = `workspace ${workspace.workspaceId} bffCall ${call.bffId}`;
  const queryIds = new Set(workspace.bffCalls.filter(item => item.kind === 'query').map(item => item.bffId));
  const localIds = new Set(workspace.bffCalls.map(item => item.bffId));
  const landingWayOut = 'a landing receives nothing: host a query that resolves the record from the actor\'s own context and feed this input from it (source "selection"/"derived" over a local bffCall), or take the value from the session (source "actorSession")';
  for (const entry of call.input || []) {
    if (entry.required !== true) continue;
    const ownedByIdRule = call.kind === 'command' && isNsIdInputName(entry.name);
    if (!entry.source) {
      if (!ownedByIdRule) {
        issues.push(errorIssue(
          'bff.input.sourceMissing',
          `${label}: required input "${entry.name}" declares no source — every required value must say where it comes from (userDecision | selection | pageInput | actorSession | derived)${isLanding ? `. ${landingWayOut}` : ''}`,
          workspace.workspaceId,
        ));
      }
      continue;
    }
    if (!isLanding) continue;
    if (entry.source === 'pageInput') {
      issues.push(errorIssue('landing.requiresPageInput', `${label}: required input "${entry.name}" has source "pageInput" but ${workspace.workspaceId} is a LANDING — ${landingWayOut}`, workspace.workspaceId));
      continue;
    }
    if (ownedByIdRule) continue; // an unresolved selection/derived on a command id is idSourceUnresolved
    const unresolved = (entry.source === 'selection' && !queryIds.has(entry.sourceRef || ''))
      || (entry.source === 'derived' && !localIds.has((entry.sourceRef || '').split('.')[0]));
    if (unresolved) {
      issues.push(errorIssue('landing.input.unresolved', `${label}: required input "${entry.name}" has source "${entry.source}" with sourceRef "${entry.sourceRef || '(none)'}", which is not a call of this workspace — ${landingWayOut}`, workspace.workspaceId));
    }
  }
}

/** `id` / `<entity>Id` — the system-identifier convention shared with the e7 readiness lint. */
export function isNsIdInputName(name: string): boolean {
  return /^id$/i.test(name) || /Id$/.test(name);
}

// ---------------------------------------------------------------------------
// T5 — `pageInput` needs a creditor (the hole gate.test.ts used to assert was empty)
// ---------------------------------------------------------------------------

/** What a page is handed on arrival, and how sure we are about it. */
interface NsCarriedContext {
  /** Field names a navigation into this page can actually carry. */
  fields: Set<string>;
  /** EntityIds some journey declares the actor arriving with (prerequisite.carries, resolved). */
  entities: Set<string>;
  /** Declared carries that matched no entity: context is stated but unreadable — do not claim certainty. */
  unresolved: string[];
}

/**
 * `source: "pageInput"` is the model saying "this id arrives with the page". Until T3 nothing could
 * check that claim, and 20 of them shipped in one run with no provider. Two things can feed a page:
 *
 *  1. A NAVIGATION into it. An edge carries a field when the page it comes FROM displays that field
 *     (a query output) and both pages serve a common actor — an edge between disjoint actors is a
 *     HANDOFF: the other person's screen never had the value. And an edge whose operation CREATES a
 *     record cannot carry that record's id: it does not exist yet when the navigation is decided.
 *     That single rule is what separates the legitimate `projectId` (you were in the project) from the
 *     orphan `changeOrderId` (you arrive to create one, not carrying one) on the SAME edge.
 *  2. The DECLARED CONTEXT of a journey: `prerequisite.carries` approved by the human at the e2
 *     checkpoint, resolved to entities and matched against the id by the `<entity>Id` convention.
 *
 * Neither → `bff.input.pageInputUnfed` (ERROR). If the page HAS declared context that could not be
 * resolved to an entity, the answer is honestly unknown: `bff.input.pageInputUnverified` (WARNING).
 * Inventing an error over a naming convention would burn a repair round on a run that may be correct.
 */
function validatePageInputProviders(
  workspace: NsE6Workspace,
  call: NsE6BffCall,
  carried: NsCarriedContext | undefined,
  context: E6GateContext,
  issues: NsGateIssue[],
): void {
  const label = `workspace ${workspace.workspaceId} bffCall ${call.bffId}`;
  for (const entry of call.input || []) {
    if (entry.required !== true || entry.source !== 'pageInput' || !isNsIdInputName(entry.name)) continue;
    if (carried?.fields.has(entry.name)) continue;
    const entityId = nsEntityOfIdInput(entry.name, context.entityIds);
    if (entityId && carried?.entities.has(entityId)) continue;
    const unresolved = carried?.unresolved || [];
    if (!entityId || unresolved.length > 0) {
      issues.push(warningIssue(
        'bff.input.pageInputUnverified',
        `${label}: required id "${entry.name}" has source "pageInput" and no provider could be verified${entityId ? '' : ` (the name does not resolve to a declared entity)`}${unresolved.length ? ` (declared context ${unresolved.join(', ')} matches no entity)` : ''}`,
        workspace.workspaceId,
      ));
      continue;
    }
    issues.push(errorIssue(
      'bff.input.pageInputUnfed',
      `${label}: required id "${entry.name}" has source "pageInput" but nothing hands it to this page — no navigation into ${workspace.workspaceId} comes from a page of the same actor that displays "${entry.name}", and no journey declares arriving here with ${entityId}. Either add a query over an operation this workspace already hosts and use source "selection", or make the journey that leads here declare it (prerequisite carries)`,
      workspace.workspaceId,
    ));
  }
}

function buildCarriedContext(artifact: NsE6JourneyMapArtifact, context: E6GateContext): Record<string, NsCarriedContext> {
  const byId = new Map(artifact.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const carried: Record<string, NsCarriedContext> = {};
  for (const workspace of artifact.workspaces) {
    carried[workspace.workspaceId] = {
      fields: new Set<string>(),
      entities: new Set(context.pageContext?.entitiesByWorkspace[workspace.workspaceId] || []),
      unresolved: context.pageContext?.unresolvedByWorkspace[workspace.workspaceId] || [],
    };
  }
  for (const edge of artifact.navigationEdges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || !carried[edge.to]) continue;
    // A handoff is not navigation: the other actor's screen is not this actor's page context.
    if (!from.actors.some(actor => to.actors.includes(actor))) continue;
    const fact = edge.operationId ? context.operationFacts[edge.operationId] : undefined;
    const createdIdField = fact?.opKind === 'create' && fact.entity ? nsIdFieldOfEntity(fact.entity) : '';
    for (const call of from.bffCalls) {
      if (call.kind !== 'query') continue;
      for (const name of outputFieldNamesOf(call)) {
        if (name !== createdIdField) carried[edge.to].fields.add(name);
      }
    }
  }
  return carried;
}

function outputFieldNamesOf(call: NsE6BffCall): string[] {
  const names: string[] = [];
  const walk = (fields: NsE6BffField[]): void => {
    for (const field of fields) {
      names.push(field.name);
      if (field.item?.fields) walk(field.item.fields);
    }
  };
  walk(call.output?.fields || []);
  return names;
}

/** `<entity>Id` → the declared EntityId, or '' when the convention does not resolve. */
export function nsEntityOfIdInput(name: string, entityIds: readonly string[]): string {
  const head = name.replace(/Id$/, '');
  if (!head) return '';
  const target = head.toLowerCase();
  return entityIds.find(entityId => entityId.toLowerCase() === target) || '';
}

function nsIdFieldOfEntity(entityId: string): string {
  return `${entityId.slice(0, 1).toLowerCase()}${entityId.slice(1)}Id`;
}

// A4.2 (traceability) + A4.5/A4.5b (composition) for one bffCall.
function validateBffCall(
  workspace: NsE6Workspace,
  call: NsE6BffCall,
  context: E6GateContext,
  knownOperations: Set<string>,
  workspaceActorUnion: Set<string>,
  isLanding: boolean,
  issues: NsGateIssue[],
): void {
  const label = `workspace ${workspace.workspaceId} bffCall ${call.bffId}`;
  const usesOps = new Set<string>();
  // A4.5: composed calls (uses N>1) are query-only — commands compose via a workflow/usecase, never here.
  if (call.uses.length > 1 && call.kind !== 'query') {
    issues.push(errorIssue('bff.command.composed', `${label}: kind "${call.kind}" cannot compose ${call.uses.length} operations (only query calls compose)`, workspace.workspaceId));
  }
  for (const use of call.uses) {
    usesOps.add(use.operationId);
    if (!knownOperations.has(use.operationId)) {
      issues.push(errorIssue('workspace.operation.unknown', `${label}: uses unclassified operation ${use.operationId}`, workspace.workspaceId));
    }
    // A4.5b: `optional` only makes sense on a composed call (a single-use call has nothing to degrade to).
    if (use.optional && call.uses.length <= 1) {
      issues.push(errorIssue('bff.optional.notComposed', `${label}: use ${use.operationId} declares optional but the call composes a single operation`, workspace.workspaceId));
    }
    // Actor union follows the consumed operations (the call inherits the workspace actors for authz).
    for (const actor of context.operationFacts[use.operationId]?.actors || []) {
      if (actor !== NS_PUBLIC_ACTOR) workspaceActorUnion.add(actor);
    }
  }

  // The id-source rule, decided WHERE IT IS CHEAP (ajustesTemplates §2): a required id on a command
  // needs a resolvable origin. At e6 the workspace is still being DESIGNED, so the model can add a
  // picker query over an operation it already hosts, or declare that the id arrives with the page.
  // At e7 the same defect can only be reported (a cross-workspace query there would break the
  // detail/map equality and coverage gates) — hence the repair belongs here.
  if (call.kind === 'command') validateCommandIdSources(workspace, call, issues, context);
  validateRequiredInputSources(workspace, call, isLanding, issues);

  // A4.2: every `from` resolves to a real input / outputShape field of an operation in `uses`.
  for (const entry of call.input || []) {
    if (!entry.from) {
      // Free input (pagination/flags) — must then carry an explicit type (A5 convention).
      if (!entry.type) {
        issues.push(errorIssue('bff.input.untyped', `${label}: input "${entry.name}" must declare a from (traceable) or a type (free input)`, workspace.workspaceId));
      }
      continue;
    }
    const resolved = resolveFrom(entry.from);
    if (!resolved || !usesOps.has(resolved.op)) {
      issues.push(errorIssue('bff.input.from.unknownOp', `${label}: input "${entry.name}" from "${entry.from}" does not reference an operation in uses`, workspace.workspaceId));
      continue;
    }
    const fact = context.operationFacts[resolved.op];
    if (!fact) {
      issues.push(errorIssue('bff.fact.missing', `${label}: no operation def facts for ${resolved.op}`, workspace.workspaceId));
    } else if (!fact.inputNames.includes(resolved.rest)) {
      issues.push(errorIssue('bff.input.from.unknown', `${label}: input "${entry.name}" from "${entry.from}" is not an input of ${resolved.op}`, workspace.workspaceId));
    }
  }
  if (call.output) validateBffOutput(label, call.output, usesOps, context, workspace.workspaceId, issues);
}

function isArrayField(field: NsE6BffField): boolean {
  return field.type === 'array' && !!field.item && (field.item.fields?.length || 0) > 0;
}

// P1: validate the projected output BY SHAPE + BY POSITION.
//   list      -> fields ARE item columns (no array/envelope allowed at top); each from is an item path.
//   paginated -> EXACTLY 1 top array field (the collection) + scalar envelope (total/page); the array's
//                from is a top path ($items), its item.fields are item paths.
//   object    -> flat record; a nested array field's item.fields are item paths.
function validateBffOutput(
  label: string,
  output: NsE6BffOutput,
  usesOps: Set<string>,
  context: E6GateContext,
  workspaceId: string,
  issues: NsGateIssue[],
): void {
  const fields = output.fields || [];
  if (output.kind === 'list') {
    // P1.2: a list's fields are the item columns — an array/envelope field here is the flat-paginated
    // mistake wearing a different hat.
    for (const field of fields) {
      if (isArrayField(field)) {
        issues.push(errorIssue('bff.output.list.hasEnvelope', `${label}: output kind "list" field "${field.name}" is an array/envelope — a list's fields must be the item columns (use kind "paginated" for an { items[], total } envelope)`, workspaceId));
      }
      validateBffOutputField(label, field, 'item', usesOps, context, workspaceId, issues);
    }
    return;
  }
  if (output.kind === 'paginated') {
    const arrayFields = fields.filter(isArrayField);
    if (arrayFields.length !== 1) {
      issues.push(errorIssue('bff.output.paginated.noArray', `${label}: output kind "paginated" must have EXACTLY 1 array field (the collection) plus scalar envelope fields (total/page); found ${arrayFields.length} array field(s) — a flat list of item columns is not a paginated output`, workspaceId));
    }
    for (const field of fields) {
      validateBffOutputField(label, field, 'top', usesOps, context, workspaceId, issues);
      if (isArrayField(field)) for (const sub of field.item!.fields) validateBffOutputField(label, sub, 'item', usesOps, context, workspaceId, issues);
    }
    return;
  }
  // object
  for (const field of fields) {
    validateBffOutputField(label, field, 'top', usesOps, context, workspaceId, issues);
    if (isArrayField(field)) for (const sub of field.item!.fields) validateBffOutputField(label, sub, 'item', usesOps, context, workspaceId, issues);
  }
}

// A4.2 + P1.1: a field's `from` must resolve to an operation in `uses` and to a path VALID AT ITS
// POSITION (top vs item) — so `<op>.$items.<col>` at the top level is inexpressible, not just detected.
function validateBffOutputField(
  label: string,
  field: NsE6BffField,
  position: 'top' | 'item',
  usesOps: Set<string>,
  context: E6GateContext,
  workspaceId: string,
  issues: NsGateIssue[],
): void {
  if (!field.from) {
    issues.push(errorIssue('bff.field.from.missing', `${label}: output field "${field.name}" has no from`, workspaceId));
    return;
  }
  const resolved = resolveFrom(field.from);
  if (!resolved || !usesOps.has(resolved.op)) {
    issues.push(errorIssue('bff.output.from.unknownOp', `${label}: output field "${field.name}" from "${field.from}" does not reference an operation in uses`, workspaceId));
    return;
  }
  const fact = context.operationFacts[resolved.op];
  if (!fact) {
    issues.push(errorIssue('bff.fact.missing', `${label}: no operation def facts for ${resolved.op}`, workspaceId));
    return;
  }
  const pool = position === 'item' ? fact.outputItemPaths : fact.outputTopPaths;
  if (!pool.includes(resolved.rest)) {
    issues.push(errorIssue('bff.output.from.unknown', `${label}: output field "${field.name}" from "${field.from}" is not a valid ${position}-level path of ${resolved.op} (a $items.<col> column belongs inside an item.fields block, not at the output top level)`, workspaceId));
  }
}

// A4.3 (organism references an existing bffCall) + the role-specific gates rewired through the
// organism → bffCall.uses → operation indirection.
function validateOrganism(
  workspace: NsE6Workspace,
  section: NsE6Section,
  organism: NsE6Organism,
  context: E6GateContext,
  localBff: Map<string, NsE6BffCall>,
  allBffIds: Set<string>,
  issues: NsGateIssue[],
): void {
  const label = `workspace ${workspace.workspaceId} section ${section.sectionId}`;
  const role = organism.role;

  // Content organisms only belong on landing pages (D7); they carry no bffCall reference.
  if (NS_CONTENT_ROLES.has(role)) {
    if (workspace.kind !== 'landing') {
      issues.push(errorIssue('content.role.notLanding', `${label}: content role "${role}" is only allowed on a landing page`, workspace.workspaceId));
    }
    if (organism.dataSource || organism.action) {
      issues.push(errorIssue('content.role.hasReference', `${label}: content role "${role}" must not reference a bffCall`, workspace.workspaceId));
    }
    return;
  }

  if (role === 'filterControl') {
    if (!organism.attachTo) {
      issues.push(errorIssue('filterControl.attachTo.missing', `${label}: filterControl declares no attachTo`, workspace.workspaceId));
    } else {
      const target = localBff.get(organism.attachTo);
      if (!target || target.kind !== 'query') {
        issues.push(errorIssue('filterControl.attachTo.invalid', `${label}: filterControl attaches to "${organism.attachTo}", which is not a query bffCall in this workspace`, workspace.workspaceId));
      }
    }
    return;
  }

  if (role === 'navigationEntry') {
    // Cross-page link: the target bffId may live on ANOTHER workspace (validated against the global set).
    if (!organism.dataSource) {
      issues.push(errorIssue('navigationEntry.dataSource.missing', `${label}: navigationEntry declares no dataSource`, workspace.workspaceId));
    } else if (!allBffIds.has(organism.dataSource)) {
      issues.push(errorIssue('navigationEntry.target.unknown', `${label}: navigationEntry targets "${organism.dataSource}", which is not a bffCall anywhere in the map`, workspace.workspaceId));
    }
    return;
  }

  // A primarySurface is usually a LIST/QUEUE surface (dataSource → query). But a COMMAND-ONLY page (a
  // "create X" form whose only operation is a command) has the FORM as its surface: primarySurface via
  // `action` → a command bffCall. changeFrontend renders exactly this as the single_form template
  // (slots.primarySurface = "commandForm", appliesWhen.accessPatterns = ["commandInput"]). Without this,
  // a command-only workspace is inexpressible (no query for the surface) and the gate hard-fails.
  if (role === 'primarySurface' && organism.action && !organism.dataSource) {
    const call = localBff.get(organism.action);
    if (!call) {
      issues.push(errorIssue('organism.reference.unknown', `${label}: primarySurface action "${organism.action}" is not a bffCall in this workspace`, workspace.workspaceId));
    } else if (call.kind !== 'command') {
      issues.push(errorIssue('organism.reference.kind', `${label}: primarySurface action "${organism.action}" must be a command bffCall (is ${call.kind})`, workspace.workspaceId));
    }
    return;
  }

  // command-backed vs query-backed roles reference `action` / `dataSource` — a LOCAL bffCall.
  const isCommandRole = NS_COMMAND_BACKED_ROLES.has(role);
  const ref = isCommandRole ? organism.action : organism.dataSource;
  const refKey = isCommandRole ? 'action' : 'dataSource';
  if (!ref) {
    issues.push(errorIssue('organism.reference.missing', `${label}: role "${role}" requires a ${refKey}`, workspace.workspaceId));
    return;
  }
  const call = localBff.get(ref);
  if (!call) {
    issues.push(errorIssue('organism.reference.unknown', `${label}: role "${role}" ${refKey} "${ref}" is not a bffCall in this workspace`, workspace.workspaceId));
    return;
  }
  const expectedKind: NsE6BffKind = isCommandRole ? 'command' : 'query';
  if (call.kind !== expectedKind) {
    issues.push(errorIssue('organism.reference.kind', `${label}: role "${role}" ${refKey} "${ref}" must be a ${expectedKind} bffCall (is ${call.kind})`, workspace.workspaceId));
  }

  // A4.5b: a composed call (uses N>1) demands a valid `slice` from every consuming organism.
  const composed = call.uses.length > 1;
  if (composed) {
    if (!organism.slice) {
      issues.push(errorIssue('organism.slice.missing', `${label}: role "${role}" consumes composed call "${ref}" but declares no slice`, workspace.workspaceId));
    } else if (!(call.output?.fields || []).some(field => field.name === organism.slice)) {
      issues.push(errorIssue('organism.slice.invalid', `${label}: role "${role}" slice "${organism.slice}" is not a top-level output field of "${ref}"`, workspace.workspaceId));
    }
  }

  // The operation this organism actually consumes (single-use call, or the sliced field's source op).
  const consumedOp = resolveConsumedOperation(call, organism);
  if (role === 'showcase' || role === 'detailPanel' || role === 'batchAction') {
    const fact = consumedOp ? context.operationFacts[consumedOp] : undefined;
    if (!fact) {
      issues.push(errorIssue('organism.fact.missing', `${label}: no operation def facts for ${role} ${ref}`, workspace.workspaceId));
      return;
    }
    if (role === 'showcase' && fact.opKind !== 'query' && fact.opKind !== 'view') {
      issues.push(errorIssue('showcase.notQuery', `${label}: showcase "${ref}" must be a read-only query (kind=${fact.opKind})`, workspace.workspaceId));
    }
    if (role === 'detailPanel' && fact.accessPatternKind !== 'getById') {
      issues.push(errorIssue('detailPanel.notGetById', `${label}: detailPanel "${ref}" is accessPattern "${fact.accessPatternKind}", must be "getById"`, workspace.workspaceId));
    }
    if (role === 'batchAction') {
      const isCommand = fact.opKind === 'create' || fact.opKind === 'update' || fact.opKind === 'delete';
      const eligible = isCommand && (fact.selection === 'multiple' || !fact.hasPublicInput);
      if (!eligible) {
        issues.push(errorIssue('batchAction.invalid', `${label}: batchAction "${ref}" must be a command over a multiple selection or with no public input (kind=${fact.opKind}, selection=${fact.selection}, publicInput=${fact.hasPublicInput})`, workspace.workspaceId));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

export function renderE6Markdown(
  artifact: NsE6JourneyMapArtifact,
  options: { generatedAt?: string } = {},
): string {
  const lines: string[] = [];
  lines.push(`# E6 — Journey map: ${artifact.moduleName}`);
  lines.push('');
  lines.push(`- module: \`${artifact.moduleName}\``);
  lines.push(`- workspaces: ${artifact.workspaces.length} / landings: ${artifact.landings.length} / edges: ${artifact.navigationEdges.length}`);
  if (options.generatedAt) lines.push(`- generatedAt: ${options.generatedAt}`);
  lines.push(`- ${artifact.note}`);
  lines.push('');
  lines.push('## Workspaces by actor');
  lines.push('');
  const actors = [...new Set(artifact.workspaces.flatMap(workspace => workspace.actors))];
  for (const actor of actors) {
    lines.push(`### ${actor}`);
    lines.push('');
    for (const workspace of artifact.workspaces.filter(item => item.actors.includes(actor))) {
      const workflow = workspace.workflowId ? ` — workflow \`${workspace.workflowId}\`` : '';
      lines.push(`- \`${workspace.workspaceId}\` (${workspace.kind}, ${workspace.entity})${workflow}: ${workspace.title} — ${workspace.purpose}`);
      for (const call of workspace.bffCalls) {
        const route = call.route ? ` \`${call.route}\`` : '';
        lines.push(`  - bffCall \`${call.bffId}\` [${call.kind}] uses ${call.uses.map(use => use.operationId).join(', ')}${route}`);
      }
      for (const section of workspace.sections) {
        lines.push(`  - section \`${section.sectionId}\` — ${section.intent}`);
        for (const organism of section.organisms) {
          const ref = organism.dataSource || organism.action || organism.attachTo || '';
          const slice = organism.slice ? ` slice \`${organism.slice}\`` : '';
          lines.push(`    - [${organism.role}]${ref ? ` \`${ref}\`` : ''}${slice}`);
        }
      }
    }
    lines.push('');
  }
  lines.push('## Landings');
  lines.push('');
  for (const landing of artifact.landings) {
    const reason = landing.reason ? ` — ${landing.reason}` : '';
    lines.push(`- ${landing.actorId} → \`${landing.workspaceId}\`${reason}`);
  }
  lines.push('');
  lines.push('## Navigation edges (advisory)');
  lines.push('');
  for (const edge of artifact.navigationEdges) {
    const operation = edge.operationId ? ` via \`${edge.operationId}\`` : '';
    const description = edge.description ? ` — ${edge.description}` : '';
    lines.push(`- \`${edge.from}\` → \`${edge.to}\`${operation}${description}`);
  }
  if (artifact.navigationEdges.length === 0) lines.push('- (none)');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

// Split a `from` into its operation prefix and the remaining path ("op.$items.field" -> op, "$items.field").
function resolveFrom(from: string): { op: string; rest: string } | null {
  const index = from.indexOf('.');
  if (index <= 0 || index >= from.length - 1) return null;
  return { op: from.slice(0, index), rest: from.slice(index + 1) };
}

// The operation an organism consumes: the single use, or (for a composed call) the source operation
// of the top-level output field named by `slice`.
function resolveConsumedOperation(call: NsE6BffCall, organism: NsE6Organism): string | undefined {
  if (call.uses.length === 1) return call.uses[0].operationId;
  if (!organism.slice) return undefined;
  const field = (call.output?.fields || []).find(item => item.name === organism.slice);
  if (!field?.from) return undefined;
  return resolveFrom(field.from)?.op;
}

function readSections(value: unknown): NsE6Section[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(section => ({
    sectionId: readString(section.sectionId) || '',
    intent: readString(section.intent) || '',
    organisms: Array.isArray(section.organisms)
      ? section.organisms.filter(isRecord).map(readOrganism)
      : [],
  }));
}

// Normalize an organism: legacy `operationId` (simple LLM output) becomes dataSource/action by role,
// so downstream sees a single representation (a bffId reference).
function readOrganism(raw: Record<string, unknown>): NsE6Organism {
  const role = readEnum(raw.role, NS_ORGANISM_ROLES, 'contextualAction');
  const operationId = readString(raw.operationId);
  let dataSource = readString(raw.dataSource);
  let action = readString(raw.action);
  const attachTo = readString(raw.attachTo);
  const slice = readString(raw.slice);
  if (operationId) {
    if (NS_COMMAND_BACKED_ROLES.has(role) && !action) action = operationId;
    else if (NS_QUERY_BACKED_ROLES.has(role) && !dataSource) dataSource = operationId;
    // filterControl (attachTo carries the ref) and pure content roles drop the legacy operationId.
  }
  return {
    role,
    ...(dataSource ? { dataSource } : {}),
    ...(action ? { action } : {}),
    ...(attachTo ? { attachTo } : {}),
    ...(slice ? { slice } : {}),
  };
}

function readBffCalls(value: unknown): NsE6BffCall[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(raw => {
    const call: NsE6BffCall = {
      bffId: readString(raw.bffId) || '',
      kind: readEnum(raw.kind, NS_BFF_KINDS, 'query'),
      uses: Array.isArray(raw.uses)
        ? raw.uses.filter(isRecord).map(use => ({
            operationId: readString(use.operationId) || '',
            ...(use.optional === true ? { optional: true } : {}),
          }))
        : [],
    };
    const route = readString(raw.route);
    if (route) call.route = route;
    if (Array.isArray(raw.input)) {
      call.input = raw.input.filter(isRecord).map(entry => {
        const from = readString(entry.from);
        const type = readFieldType(entry.type);
        const source = readOptionalEnum(entry.source, NS_BFF_INPUT_SOURCES);
        const sourceRef = readString(entry.sourceRef);
        return {
          name: readString(entry.name) || '',
          ...(from ? { from } : {}),
          ...(type ? { type } : {}),
          ...(entry.required === true ? { required: true } : {}),
          ...(source ? { source } : {}),
          ...(sourceRef ? { sourceRef } : {}),
        };
      });
    }
    if (isRecord(raw.output)) {
      call.output = {
        kind: readEnum(raw.output.kind, ['object', 'list', 'paginated'] as const, 'object'),
        fields: readBffFields(raw.output.fields),
      };
    }
    return call;
  });
}

function readBffFields(value: unknown): NsE6BffField[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(raw => {
    const type = readFieldType(raw.type);
    const field: NsE6BffField = {
      name: readString(raw.name) || '',
      from: readString(raw.from) || '',
      ...(type ? { type } : {}),
      ...(raw.required === true ? { required: true } : {}),
    };
    if (isRecord(raw.item) && Array.isArray(raw.item.fields)) {
      const fields = readBffFields(raw.item.fields);
      if (fields.length) field.item = { fields };
    }
    return field;
  });
}

// N2 default: ONLY when the workspace declares NO bffCalls ("quando não declarar"), synthesize an
// identity bffCall (bffId == operationId) per organism dataSource/action. When the workspace DID
// declare calls, we do NOT fill gaps — a stray/typo dataSource must surface as organism.reference.unknown
// (a retry with context) instead of silently degrading the page to an unprojected identity view.
// navigationEntry references (cross-page) never synthesize locally.
function normalizeBffCalls(declared: NsE6BffCall[], sections: NsE6Section[]): NsE6BffCall[] {
  if (declared.length > 0) return declared;
  const byId = new Map(declared.map(call => [call.bffId, call]));
  const calls = [...declared];
  for (const section of sections) {
    for (const organism of section.organisms) {
      if (organism.role === 'navigationEntry') continue;
      const candidates: Array<{ ref: string; kind: NsE6BffKind }> = [];
      if (organism.dataSource) candidates.push({ ref: organism.dataSource, kind: 'query' });
      if (organism.action) candidates.push({ ref: organism.action, kind: 'command' });
      for (const candidate of candidates) {
        if (!candidate.ref || byId.has(candidate.ref)) continue;
        const call: NsE6BffCall = { bffId: candidate.ref, kind: candidate.kind, uses: [{ operationId: candidate.ref }] };
        byId.set(candidate.ref, call);
        calls.push(call);
      }
    }
  }
  return calls;
}

// Flatten bffCalls -> operationIds (first occurrence wins, order preserved).
function deriveOperationIds(bffCalls: NsE6BffCall[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const call of bffCalls) {
    for (const use of call.uses) {
      if (!use.operationId || seen.has(use.operationId)) continue;
      seen.add(use.operationId);
      ids.push(use.operationId);
    }
  }
  return ids;
}

function readFieldType(value: unknown): NsE6FieldType | undefined {
  return typeof value === 'string' && (['string', 'number', 'boolean', 'array', 'object'] as string[]).includes(value)
    ? value as NsE6FieldType
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

// Optional enum: an unknown value is DROPPED (not defaulted) — a wrong `source` must not silently
// look like a declared one; the T4 lint then treats the input as unsourced.
function readOptionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

// `presentation` is optional in this phase: absent (or unusable) means "not classified", which the
// gate reports as a warning — never a synthesized/guessed category.
function readPresentation(value: unknown): NsE6Presentation | undefined {
  if (!isRecord(value)) return undefined;
  const categoryRef = readString(value.categoryRef);
  const confidence = readNumber(value.confidence);
  if (!categoryRef || confidence === undefined) return undefined;
  const presentation: NsE6Presentation = { categoryRef, confidence };
  const styleRef = readString(value.styleRef);
  if (styleRef) presentation.styleRef = styleRef;
  const experienceRef = readString(value.experienceRef);
  if (experienceRef) presentation.experienceRef = experienceRef;
  if (typeof value.templateReady === 'boolean') presentation.templateReady = value.templateReady;
  const classificationNote = readString(value.classificationNote);
  if (classificationNote) presentation.classificationNote = classificationNote;
  if (Array.isArray(value.alternates)) {
    const alternates = value.alternates.filter(isRecord).map(raw => {
      const alternateRef = readString(raw.categoryRef);
      const alternateConfidence = readNumber(raw.confidence);
      if (!alternateRef || alternateConfidence === undefined) return null;
      const reason = readString(raw.reason);
      return { categoryRef: alternateRef, confidence: alternateConfidence, ...(reason ? { reason } : {}) };
    }).filter((item): item is NsE6PresentationAlternate => item !== null);
    if (alternates.length) presentation.alternates = alternates;
  }
  return presentation;
}
