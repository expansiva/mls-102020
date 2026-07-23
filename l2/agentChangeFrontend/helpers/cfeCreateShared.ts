/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import {
  assertArray,
  assertRecord,
  assertString,
  createPlannerToolSchema,
  extractPlannerOutput,
  normalizeStringList,
  optionalString,
  type PlannerExtractConfig,
  type PlannerOutput,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfePlanner.js';
import {
  frontendOutputShapeForOperation,
  frontendQueryStateDefaults,
  hasL4OperationInputs,
  hasL4OperationOutputRefs,
  frontendInputPresentation,
  isUserFacingOperationInput,
  l4OperationInputs,
  l4OperationOutputRefs,
  normalizeOutputShape,
  parseWorkspaceBffCalls,
  parseWorkspaceSections,
  bffCallCommandShape,
  buildWorkspaceContractSource,
  isContentOrganismRole,
  type CfeL4OperationInput,
  type CfeBffCall,
  type CfeBffCallField,
  type CfeContractField,
  type CfeContractCall,
  type CfeWorkspaceSection,
  type CfeWorkspaceOrganism,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.js';
import { convertFileToTag } from '/_102020_/l2/utils.js';
import { parseDefsSource } from '/_102020_/l2/aura/helpers/moduleLanguages.js';
import { selectUxTemplateCandidates, type UxScreenSignals } from '/_102020_/l2/agentChangeFrontend/uxTemplates/selectUxTemplates.js';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;
type OwnerStatus = 'toCreate' | 'toUpdate' | 'toRemove' | 'inProgress' | 'done';

interface CfeFieldDef { fieldId: string; type: string; required?: boolean; description?: string; enum?: string[] }
interface CfeEntityDef { entityId: string; title: string; fields: CfeFieldDef[]; rulesApplied: string[]; statusEnum: string[]; lifecycleStates: string[] }

interface CfeOperationDef {
  operationId: string;
  commandName: string;
  pageId: string;
  bffName: string;
  title: string;
  actor: string;
  entity: string;
  kind: string;
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  // Intent-level micro user flow (from l4 operation.story.steps). Drives field/organism ordering
  // in the layout prompt; layout-agnostic, so any genome (page11/page12) can reinterpret it.
  storySteps: string[];
  // Generation status now comes from l5/{module}/todoFrontend.defs.ts (single source of truth).
  todoStatus: string;
  // Legacy inline status read from l4 only to warn about divergence; never used for decisions.
  inlineStatusFrontend: string;
  capability?: Record<string, unknown>;
  moduleName: string;
  // Module taken verbatim from an l4 v2 module-scoped folder (l4/<module>/operations/…); empty for the
  // legacy flat l4/operations/ layout, where the module is inferred from the operation's entities.
  folderModule: string;
  fileInfo: FileInfo;
  exportName: string;
  data: Record<string, unknown>;
}

interface CfeWorkflowDef {
  workflowId: string;
  pageId: string;
  title: string;
  actors: string[];
  operationIds: string[];
  entities: string[];
  rulesApplied: string[];
  storySteps: string[];
  todoStatus: string;
  inlineStatusFrontend: string;
  capabilities: Record<string, unknown>[];
  moduleName: string;
  folderModule: string;
  fileInfo: FileInfo;
  exportName: string;
  data: Record<string, unknown>;
}

// L4 v2 workspace. Read either from a standalone l4/<module>/workspaces/<id>.defs.ts (preferred) or,
// as a fallback, nested inside a legacy l4/<module>/journeys/<module>Journeys.defs.ts. Workspaces are
// the unit of page grouping: one page per workspace (an actor's coherent area). The v2 workspace also
// carries bffCalls[] (the projected wire contracts of the page) and sections[].organisms[] (roles that
// reference a bffId); both are empty when reading a legacy operationIds-only workspace.
interface CfeJourneyWorkspace {
  workspaceId: string;
  title: string;
  actor: string;             // first actor (back-compat)
  actors: string[];          // v2: full actor list
  kind: string;              // workflow | operation | entityManagement | landing | dashboard | ...
  entity: string;
  workflowId?: string;
  operationIds: string[];
  purpose: string;
  bffCalls: CfeBffCall[];    // v2; [] for legacy
  sections: CfeWorkspaceSection[]; // v2; [] for legacy
}

// A landing entry (l4/<module>/siteMap.defs.ts or navigation.defs.ts): the workspace an actor starts on.
interface CfeLanding { actorId: string; workspaceId: string; reason: string }

interface CfeJourneyMap {
  moduleName: string;
  workspaces: CfeJourneyWorkspace[];
  navigationEdges: Record<string, unknown>[];
  landings: CfeLanding[];
}

// L4 v2 actor (l4/<module>/actors.defs.ts, singular). Menu/authz derive from this per module.
interface CfeActorDef { actorId: string; title: string; description: string; roleScope: string }

export interface CfePagePlan {
  pageId: string;
  pageName: string;
  moduleName: string;
  sourceKind: 'workflow' | 'operation';
  ownerIds: string[];
  actorIds: string[];
  entityIds: string[];
  operationIds: string[];
  rulesApplied: string[];
  capabilities: string[];
  origin: Record<string, unknown>;
}

interface CfeModuleInfo {
  moduleName: string;
  visualStyle?: unknown;
  entityIds: Set<string>;
  i18nLocales: string[];
  i18nDefaultLocale: string;
}

export interface CfeCreateContext {
  project: number;
  moduleNames: string[];
  moduleVisualStyle: Record<string, unknown>;
  moduleI18n: Record<string, { defaultLocale: string; activeLocales: string[] }>;
  entities: Map<string, CfeEntityDef>;
  operations: Map<string, CfeOperationDef>;
  workflows: Map<string, CfeWorkflowDef>;
  journeys: CfeJourneyMap[];
  actorsByModule: Record<string, CfeActorDef[]>;
  pages: CfePagePlan[];
  warnings: string[];
}

export interface CfePreparedPage {
  project: number;
  page: CfePagePlan;
  operations: CfeOperationDef[];
  commands: Record<string, unknown>[];
  // L4 v2 workspace backing this page (bffCalls[]/sections[]); undefined for legacy operationIds pages.
  workspace?: CfeJourneyWorkspace;
  // F3: per-bffCall l2 contract byte-copies (l4 -> l2). Empty for legacy pages (contract via LLM skill).
  contractCopies: CfeContractCopy[];
  navigationRefs: unknown[];
  baseDefinition: Record<string, unknown>;
  visualStyle: unknown;
  i18nMeta: { defaultLocale: string; activeLocales: string[] };
  entityFields: Record<string, string[]>;
  variantPlan: CfeLayoutVariantPlan[];
  userJourney: Record<string, unknown>;
}

export interface CfeLayoutVariantPlan {
  genome: string;
  templateId: string;
  template: Record<string, unknown>;
}

// F3: an l4->l2 contract copy. `tsRef` is the l2 contract path shared/pages import; `source` is the
// byte-copied l4 body with an l2 header; `contractName` = `<workspaceId>.<bffId>`.
export interface CfeContractCopy {
  contractName: string;
  fileInfo: FileInfo;
  tsRef: string;
  source: string;
}

interface CfeLayoutAction {
  id: string;
  action: string;
  labelKey: string;
  order: number;
  displayHint?: string;
  actionKey?: string;
}

interface CfeLayoutField {
  id: string;
  field: string;
  labelKey: string;
  order: number;
  required?: boolean;
  inputType?: string;
  format?: string;
  source?: string;
  stateKey?: string;
}

interface CfeLayoutIntent {
  id: string;
  intent: string;
  order: number;
  titleKey?: string;
  source?: string;
  binding?: string;
  action?: string;
  submitAction?: string;
  emptyKey?: string;
  displayHint?: string;
  stateKey?: string;
  fields: CfeLayoutField[];
  columns: CfeLayoutField[];
  filters: CfeLayoutField[];
  toolbar: CfeLayoutAction[];
  rowActions: CfeLayoutAction[];
  actions: CfeLayoutAction[];
}

interface CfeLayoutOrganism {
  id: string;
  type: string;
  organismName: string;
  titleKey: string;
  displayHint?: string;
  purpose: string;
  userActions: string[];
  requiredEntities: string[];
  readsFields: string[];
  writesFields: string[];
  rulesApplied: string[];
  order: number;
  intentions: CfeLayoutIntent[];
}

interface CfeLayoutSection {
  id: string;
  type: 'section' | 'sectionTab';
  sectionName: string;
  titleKey: string;
  mode: string;
  order: number;
  organisms: CfeLayoutOrganism[];
}

export interface CfePageLayoutDefinition {
  pageId: string;
  layoutId: string;
  sections: CfeLayoutSection[];
  i18n: Record<string, string>;
  dataBindings: { id: string; source: string; entity?: string; command?: string; description?: string; stateKey?: string; inputStateKeys?: string[] }[];
}

// LLM-facing composition (the tool output shape). Expanded into a full CfePageLayoutDefinition by
// expandLayoutComposition before any downstream repair/validate/reconcile/render runs.
interface CfeCompositionOrganism {
  id: string;
  organismName: string;
  purpose: string;
  order: number;
  displayHint?: string;
  uses: string[];
  notes?: string;
}

interface CfeCompositionSection {
  id: string;
  sectionName?: string;
  order: number;
  organisms: CfeCompositionOrganism[];
}

export interface CfeLayoutComposition {
  pageId: string;
  layoutId: string;
  sections: CfeCompositionSection[];
}

interface CfeBusinessContextRef {
  operationId: string;
  inputId?: string;
  contextKey: string;
  originRef: string;
  targetRef: string;
  required: boolean;
  description: string;
}

export interface CfePageLayoutResult { pageLayout: CfeLayoutComposition; objective?: unknown }
export type CfePageLayoutOutput = PlannerOutput<CfePageLayoutResult>;

const CFE_LAYOUT_TOOL_NAME = 'submitCfePageLayout';

const strSchema = { type: 'string' } as const;
const intSchema = { type: 'integer' } as const;
const strArraySchema = { type: 'array', items: strSchema } as const;

// LLM-facing tool contract: a SEMANTIC COMPOSITION, not the full render tree. The model decides which
// organisms exist, their order, a composition displayHint, and which bffCall ids each surfaces (`uses`).
// The concrete intentions/fields/columns/actions are NOT authored by the model — the agent expands each
// organism deterministically from L4 (expandLayoutComposition), reusing the same builders as the
// deterministic seed. This keeps the contract tiny (far less drift) and lets the model spend its budget
// on composition + beautiful presentation instead of filling a rigid field tree.
const compositionOrganismSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'organismName', 'purpose', 'order'],
  properties: {
    id: strSchema,
    organismName: strSchema,
    // What this organism shows/does and why — the semantic core the model is good at.
    purpose: strSchema,
    order: intSchema,
    // Composition hint the render skill honors (master-detail, card-board, summary-first, …).
    displayHint: strSchema,
    // bffCall/command ids (from shared.actions) this organism surfaces. The agent turns each id into the
    // concrete fields/columns/actions from L4 — the model must NOT enumerate them.
    uses: strArraySchema,
    // Optional free-text guidance for the render (grouping, emphasis) — advisory only.
    notes: strSchema,
  },
} as const;

const layoutSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'order', 'organisms'],
  properties: {
    id: strSchema,
    sectionName: strSchema,
    order: intSchema,
    organisms: { type: 'array', minItems: 1, items: compositionOrganismSchema },
  },
} as const;

const pageLayoutObjectSchema = {
  type: 'object',
  additionalProperties: false,
  // i18n and dataBindings are NOT part of the tool contract: i18n is a dynamic key->label map (backfilled
  // by repairMissingLayoutI18n) and dataBindings are derived from L4 commands during expansion. The model
  // authors only the composition; keeping the tool tiny + closed minimizes the drift surface.
  required: ['pageId', 'layoutId', 'sections'],
  properties: {
    pageId: strSchema,
    layoutId: strSchema,
    sections: { type: 'array', minItems: 1, items: layoutSectionSchema },
  },
} as const;

// page21 goal-first objective. All fields are flat strings / string lists (the model's strength, minimal
// drift) — never a deep tree. Optional as a whole (page11 omits it). The render skill lays the page out
// around it when present. Kept lint-clean/closed so the tool stays strict-ready.
const pageObjectiveSchema = {
  type: 'object',
  additionalProperties: false,
  required: [],
  properties: {
    actor: strSchema,
    jobToBeDone: strSchema,
    primaryDecision: strSchema,
    decisiveInfo: strArraySchema,
    usageFrequency: strSchema,
    informationHierarchy: strArraySchema,
    successCriteria: strSchema,
    antiPatterns: strArraySchema,
    criticalActions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['action'],
        properties: { action: strSchema, presentation: strSchema },
      },
    },
  },
} as const;

export const cfePageLayoutResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pageLayout'],
  properties: {
    pageLayout: pageLayoutObjectSchema,
    // Optional; only the goal-first genome (page21) emits it. Absent on the page11 baseline.
    objective: pageObjectiveSchema,
  },
} as const;

export const cfePageLayoutToolSchema = createRelaxedCfePageLayoutToolSchema();
export const cfePageLayoutToolName = CFE_LAYOUT_TOOL_NAME;

function relaxPageLayoutSchema(pageLayoutSchema: any): void {
  if (!pageLayoutSchema || typeof pageLayoutSchema !== 'object') return;
  // The composition schema is already minimal; this only reasserts the intended required sets so a bump
  // of the base schema never silently widens what the model MUST provide.
  pageLayoutSchema.required = ['pageId', 'layoutId', 'sections'];
  const sectionSchema = pageLayoutSchema.properties?.sections?.items;
  if (sectionSchema && typeof sectionSchema === 'object') {
    sectionSchema.required = ['id', 'order', 'organisms'];
    const organismSchema = sectionSchema.properties?.organisms?.items;
    if (organismSchema && typeof organismSchema === 'object') {
      organismSchema.required = ['id', 'organismName', 'purpose', 'order'];
    }
  }
}

function createRelaxedCfePageLayoutToolSchema(): mls.msg.LLMTool {
  const resultSchema = JSON.parse(JSON.stringify(cfePageLayoutResultSchema)) as Record<string, any>;
  relaxPageLayoutSchema(resultSchema.properties?.pageLayout);
  const tool = createPlannerToolSchema(CFE_LAYOUT_TOOL_NAME, 'Submit the semantic layout for one frontend page variant.', resultSchema) as mls.msg.LLMTool;
  const parameters = (tool as any).function?.parameters;
  if (parameters && Array.isArray(parameters.required)) parameters.required = ['status', 'result'];
  return tool;
}

export async function readCreateContext(): Promise<CfeCreateContext> {
  const project = mls.actualProject || 0;
  const modules = new Map<string, CfeModuleInfo>();
  const entityToModule = new Map<string, string>();
  const entities = new Map<string, CfeEntityDef>();
  const operations = new Map<string, CfeOperationDef>();
  const workflows = new Map<string, CfeWorkflowDef>();
  const journeys = new Map<string, CfeJourneyMap>();
  // L4 v2 (leitores tolerantes): standalone workspaces/navigation/siteMap/actors read from their own
  // files, keyed by module; merged with the legacy journeys-nested workspaces below (standalone wins).
  const standaloneWorkspaces = new Map<string, CfeJourneyWorkspace[]>();
  const navByModule = new Map<string, { edges: Record<string, unknown>[]; landings: CfeLanding[] }>();
  const siteMapByModule = new Map<string, { edges: Record<string, unknown>[]; landings: CfeLanding[] }>();
  const actorsByModule: Record<string, CfeActorDef[]> = {};

  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    const folder = String(file.folder || '');
    const shortName = String(file.shortName || '');
    const extension = String(file.extension || '');
    // l4 holds ONLY .defs.ts (it is not a compilable layer). Never read a .ts/.d.ts from l4 — the l2
    // contract .ts is generated deterministically from the bffCall in the workspace defs (F3).
    if (extension !== '.defs.ts') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) continue;
    const fileInfo: FileInfo = { project: file.project, level: file.level, folder, shortName, extension };
    // Module-scoped folder path (l4/<module>/operations/…) -> <module>; flat legacy layout -> '' (infer
    // from entities). Files that live directly under l4/<module>/ (module/actors/navigation/siteMap) have
    // no slash: their module IS the folder.
    const folderModule = folder.includes('/') ? folder.split('/')[0] : '';
    const topModule = folder && !folder.includes('/') ? folder : '';

    if (folder === 'workflows' || folder.endsWith('/workflows')) {
      const workflow = workflowFromData(parsed.data, fileInfo, parsed.exportName, folderModule);
      if (workflow) workflows.set(workflow.workflowId, workflow);
    } else if (folder === 'operations' || folder.endsWith('/operations')) {
      const operation = operationFromData(parsed.data, fileInfo, parsed.exportName, folderModule);
      if (operation) operations.set(operation.operationId, operation);
    } else if (folder.endsWith('/workspaces')) {
      const workspace = workspaceFromData(parsed.data);
      if (workspace && folderModule) {
        if (folderModule) ensureModule(modules, folderModule);
        if (!standaloneWorkspaces.has(folderModule)) standaloneWorkspaces.set(folderModule, []);
        standaloneWorkspaces.get(folderModule)!.push(workspace);
      }
    } else if (shortName === 'siteMap' && topModule) {
      ensureModule(modules, topModule);
      siteMapByModule.set(topModule, { edges: readRecordArray(parsed.data.navigationEdges), landings: landingsFromData(parsed.data) });
    } else if (shortName === 'navigation' && topModule) {
      ensureModule(modules, topModule);
      navByModule.set(topModule, { edges: readRecordArray(parsed.data.navigationEdges), landings: landingsFromData(parsed.data) });
    } else if (shortName === 'actors' && topModule) {
      ensureModule(modules, topModule);
      actorsByModule[topModule] = actorsFromData(parsed.data);
    } else if (shortName === 'module' && topModule) {
      const moduleData = isRecord(parsed.data.module) ? parsed.data.module : parsed.data;
      const designContext = isRecord(parsed.data.designContext) ? parsed.data.designContext : {};
      const moduleName = readString(moduleData.moduleName) || folder;
      const module = ensureModule(modules, moduleName);
      module.visualStyle = moduleData.visualStyle;
      module.i18nLocales = languageKeys(readStringArray(moduleData.languages));
      module.i18nDefaultLocale = languageKey(readString(designContext.userLanguage)) || module.i18nLocales[0] || '';
    } else if (folder.endsWith('/ontology')) {
      const moduleName = folder.split('/')[0];
      const entity = entityFromData(parsed.data, shortName);
      if (moduleName && entity) {
        ensureModule(modules, moduleName).entityIds.add(entity.entityId);
        entityToModule.set(entity.entityId, moduleName);
        entities.set(entity.entityId, entity);
      }
    } else if (folder.endsWith('/journeys')) {
      const journey = journeyFromData(parsed.data, folder.split('/')[0]);
      if (journey) journeys.set(journey.moduleName, journey);
    }
  }

  // Standalone workspaces (v2) supersede the legacy journeys-nested workspaces per module; navigation
  // edges/landings come from siteMap (preferred) or navigation.defs.ts.
  for (const [moduleName, workspaces] of standaloneWorkspaces) {
    const nav = siteMapByModule.get(moduleName) || navByModule.get(moduleName) || { edges: [], landings: [] };
    journeys.set(moduleName, { moduleName, workspaces, navigationEdges: nav.edges, landings: nav.landings });
  }
  // Modules that only ship siteMap/navigation (no standalone workspaces) still get their landings/edges.
  for (const [moduleName, nav] of [...siteMapByModule, ...navByModule]) {
    const existing = journeys.get(moduleName);
    if (existing && existing.landings.length === 0 && existing.navigationEdges.length === 0) {
      journeys.set(moduleName, { ...existing, navigationEdges: nav.edges, landings: nav.landings });
    }
  }

  const moduleNames = Array.from(modules.keys()).sort();
  const moduleFallback = moduleNames.length === 1 ? moduleNames[0] : 'unknown';
  const moduleVisualStyle: Record<string, unknown> = {};
  const moduleI18n: Record<string, { defaultLocale: string; activeLocales: string[] }> = {};
  for (const module of modules.values()) {
    moduleVisualStyle[module.moduleName] = module.visualStyle || {};
    const defaultLocale = module.i18nDefaultLocale || module.i18nLocales[0] || 'en';
    moduleI18n[module.moduleName] = { defaultLocale, activeLocales: unique([defaultLocale, ...module.i18nLocales]) };
  }

  // L4 v2 modules the folder path directly; the legacy flat layout infers from the owner's entities.
  for (const operation of operations.values()) operation.moduleName = operation.folderModule || inferModule(operationEntities(operation), entityToModule, moduleFallback);
  for (const workflow of workflows.values()) workflow.moduleName = workflow.folderModule || inferModule(workflow.entities, entityToModule, moduleFallback);

  // Generation status is owned by l5/{module}/todoFrontend.defs.ts; the l4 owner defs are read-only
  // for this agent. Merge the todo status into each owner and fail loudly on plan/disk divergence.
  // Scope the todo to modules that exist in l4 so an orphaned module's stale l5 never blocks the run.
  const todoState = await readFrontendTodoState(project, new Set(moduleNames));
  const warnings: string[] = [...todoState.warnings];
  const ownerKeys = new Set<string>([
    ...Array.from(operations.values()).map(op => `operation:${op.operationId}`),
    ...Array.from(workflows.values()).map(wf => `workflow:${wf.workflowId}`),
  ]);
  if (ownerKeys.size > 0 && todoState.files === 0) {
    throw new Error('l5/{module}/todoFrontend.defs.ts not found; frontend generation status must come from todoFrontend, not inline l4 statusFrontend.');
  }
  const missingTodo: string[] = [];
  for (const operation of operations.values()) {
    const todoOwner = todoState.ownersByKey.get(`operation:${operation.operationId}`);
    if (!todoOwner) { missingTodo.push(`operation:${operation.operationId}`); continue; }
    operation.todoStatus = todoOwner.status;
    if (operation.inlineStatusFrontend && operation.inlineStatusFrontend !== todoOwner.status) {
      warnings.push(`operation:${operation.operationId} inline statusFrontend=${operation.inlineStatusFrontend} ignored; todoFrontend=${todoOwner.status}`);
    }
  }
  for (const workflow of workflows.values()) {
    const todoOwner = todoState.ownersByKey.get(`workflow:${workflow.workflowId}`);
    if (!todoOwner) { missingTodo.push(`workflow:${workflow.workflowId}`); continue; }
    workflow.todoStatus = todoOwner.status;
    if (workflow.inlineStatusFrontend && workflow.inlineStatusFrontend !== todoOwner.status) {
      warnings.push(`workflow:${workflow.workflowId} inline statusFrontend=${workflow.inlineStatusFrontend} ignored; todoFrontend=${todoOwner.status}`);
    }
  }
  const extraTodo = [...todoState.ownersByKey.keys()].filter(key => !ownerKeys.has(key));
  if (missingTodo.length || extraTodo.length || todoState.errors.length) {
    throw new Error([
      ...todoState.errors,
      ...(missingTodo.length ? [`todoFrontend missing l4 owner(s): ${missingTodo.slice(0, 12).join(', ')}`] : []),
      ...(extraTodo.length ? [`todoFrontend has owner(s) absent from l4: ${extraTodo.slice(0, 12).join(', ')}`] : []),
    ].join('; '));
  }

  // Navigation edges are advisory in v1: recorded in trace, never blocking (decision improveL2Test §6.7).
  const journeyList = Array.from(journeys.values());
  for (const journey of journeyList) {
    const edgeCount = Array.isArray(journey.navigationEdges) ? journey.navigationEdges.length : 0;
    if (edgeCount === 0) warnings.push(`journey ${journey.moduleName}: no navigationEdges; navigation falls back to selectedEntity from inputs`);
  }

  return { project, moduleNames, moduleVisualStyle, moduleI18n, entities, operations, workflows, journeys: journeyList, actorsByModule, pages: buildPagePlans(workflows, operations, moduleFallback, journeyList), warnings };
}

export async function generatePageDefs(page: CfePagePlan): Promise<void> {
  const prepared = await preparePageCreate(page);
  await saveContractDefs(prepared);
  await saveBaseSharedDefs(prepared);
  const layout = await savePageLayoutDefs(prepared, deterministicLayoutFromBase(prepared));
  await reconcileSharedDefs(prepared, [layout]);
}

export async function preparePageCreate(page: CfePagePlan, context?: CfeCreateContext): Promise<CfePreparedPage> {
  const createContext = context || await readCreateContext();
  const operations = page.operationIds.map(id => createContext.operations.get(id) || syntheticOperation(page, id, createContext.project));
  // L4 v2: one command per bffCall (the wire contract of the page). Legacy: one command per operation.
  const workspace = workspaceForPage(createContext, page);
  const commands = workspace && workspace.bffCalls.length > 0
    ? workspace.bffCalls.map(call => commandFromBffCall(call, workspace, page.moduleName, operations, createContext.entities))
    : operations.map(operation => commandFromOperation(operation, createContext.entities));
  recordTechnicalIdLookupGaps(page, commands);
  const navigationRefs: unknown[] = [];
  const baseDefinition = pageDefinition(page, operations);
  const visualStyle = createContext.moduleVisualStyle[page.moduleName];
  const i18nMeta = createContext.moduleI18n[page.moduleName] || { defaultLocale: 'en', activeLocales: ['en'] };
  const entityFields = Object.fromEntries(
    unique([...page.entityIds, ...operations.flatMap(operationEntities)]).map(entityId => [
      entityId,
      (createContext.entities.get(entityId)?.fields || []).map(field => field.fieldId).filter(Boolean),
    ]),
  );
  const contractCopies = workspace && workspace.bffCalls.length > 0 ? buildContractCopies(createContext, page, workspace) : [];
  const variantPlan = buildLayoutVariantPlan(createContext, page, operations, commands);
  const userJourney = buildPageUserJourney(createContext, page, operations, commands);
  return { project: createContext.project, page, operations, commands, workspace, contractCopies, navigationRefs, baseDefinition, visualStyle, i18nMeta, entityFields, variantPlan, userJourney };
}

// F3: GENERATE ONE l2 contract .ts per WORKSPACE from the workspace defs (l4 holds only .defs.ts; we never
// read a .ts from l4). The single file holds every bffCall's Input/Output interfaces (Output is the
// projected item shape for a list/paginated call) + its `<bffId>Route` const; types are resolved from the
// referenced operations' inputs/outputShape. File name = `<workspaceId>.ts` (= the page id).
function buildContractCopies(createContext: CfeCreateContext, page: CfePagePlan, workspace: CfeJourneyWorkspace): CfeContractCopy[] {
  if (workspace.bffCalls.length === 0) return [];
  const operationsById = createContext.operations;
  const fileInfo: FileInfo = { project: createContext.project, level: 2, folder: `${page.moduleName}/web/contracts`, shortName: page.pageId, extension: '.ts' };
  const tsRef = toDisplayRef(fileInfo);
  const calls: CfeContractCall[] = workspace.bffCalls.map(call => ({
    interfaceName: toPascalCase(call.bffId),
    bffId: call.bffId,
    kind: call.kind,
    outputKind: call.output?.kind || 'object',
    route: call.route,
    input: call.input.map(field => ({
      name: field.name,
      type: bffFieldTsType(field, 'input', operationsById, createContext.entities),
      optional: !bffInputRequired(field, operationsById),
    })),
    output: (call.output?.fields || []).map(field => ({
      name: field.name,
      type: bffFieldTsType(field, 'output', operationsById, createContext.entities),
    })),
  }));
  const source = buildWorkspaceContractSource({ l2Ref: tsRef, workspaceId: workspace.workspaceId, calls });
  return [{ contractName: page.pageId, fileInfo, tsRef, source }];
}

// Resolve the TS type of a bffCall field. Nested array projections (a paginated envelope's `items`, or
// any field carrying `item.fields`) become an inline object array `{ … }[]`; scalars use the field's own
// `type` when present, else trace `from` = "<operationId>.<path>" back to the operation's inputs/outputShape.
export function bffFieldTsType(field: CfeBffCallField, direction: 'input' | 'output', operationsById: Map<string, CfeOperationDef>, entities: Map<string, CfeEntityDef>): string {
  if (field.item && Array.isArray(field.item.fields) && field.item.fields.length > 0) {
    const inner = field.item.fields.map(itemField => `${contractPropKey(itemField.name)}: ${bffFieldTsType(itemField, direction, operationsById, entities)}`).join('; ');
    return `{ ${inner} }[]`;
  }
  if (field.type) {
    const normalized = field.type.toLowerCase();
    if (normalized === 'array') return 'unknown[]';
    if (normalized === 'object' || normalized === 'json') return 'Record<string, unknown>';
    return l4TypeToTs(field.type);
  }
  const dot = field.from.indexOf('.');
  const operationId = dot < 0 ? '' : field.from.slice(0, dot);
  const path = dot < 0 ? field.from : field.from.slice(dot + 1);
  const operation = operationsById.get(operationId);
  if (!operation) return 'string';
  if (direction === 'input') {
    const raw = (Array.isArray(operation.data.inputs) ? operation.data.inputs : []).filter(isRecord).find(item => readString(item.inputId) === path);
    if (!raw) return 'string';
    const explicit = readString(raw.type);
    if (explicit) return l4TypeToTs(explicit);
    const resolved = resolveFieldRef(readString(raw.fieldRef), operation.entity, entities);
    return resolved.field ? l4TypeToTs(resolved.field.type) : 'string';
  }
  const shape = readCanonicalOutputShape(operation);
  if (!shape) return 'string';
  if (path.startsWith('$items.')) {
    const itemField = shape.fields.find(f => f.item)?.item?.fields.find(f => f.name === path.slice('$items.'.length));
    return itemField ? l4TypeToTs(itemField.type) : 'string';
  }
  const topField = shape.fields.find(f => f.name === path);
  return topField ? l4TypeToTs(topField.type) : 'string';
}

function bffInputRequired(field: CfeBffCallField, operationsById: Map<string, CfeOperationDef>): boolean {
  if (field.required === true) return true;
  const dot = field.from.indexOf('.');
  const operation = dot < 0 ? undefined : operationsById.get(field.from.slice(0, dot));
  if (!operation) return false;
  const inputId = dot < 0 ? field.from : field.from.slice(dot + 1);
  const raw = (Array.isArray(operation.data.inputs) ? operation.data.inputs : []).filter(isRecord).find(item => readString(item.inputId) === inputId);
  return raw ? raw.required === true : false;
}

// Map an l4 field type to a TS type for the generated contract (dates travel as ISO strings on the wire).
function l4TypeToTs(type: string): string {
  const frontend = toFrontendType(type);
  return frontend === 'number' ? 'number' : frontend === 'boolean' ? 'boolean' : 'string';
}

// Property key for an inline object type: bare when a valid identifier, quoted otherwise.
function contractPropKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

// Resolve the l4 v2 workspace backing a page. buildPagePlans records the workspaceId in page.origin
// ('l4-journey' source); match it within the page's module.
function workspaceForPage(createContext: CfeCreateContext, page: CfePagePlan): CfeJourneyWorkspace | undefined {
  const workspaceId = readString((page.origin as Record<string, unknown>).workspaceId);
  if (!workspaceId) return undefined;
  for (const journey of createContext.journeys) {
    if (journey.moduleName !== page.moduleName) continue;
    const found = journey.workspaces.find(ws => ws.workspaceId === workspaceId);
    if (found) return found;
  }
  return undefined;
}

// F3: one bffCall => one page command. Output/input shape and route come from the bffCall (the wire
// contract of record); the precise TS types are the byte-copied l4 contract, so this only carries what
// the deterministic pipeline consumes (shared state, page tests, layout context).
function commandFromBffCall(bffCall: CfeBffCall, workspace: CfeJourneyWorkspace, moduleName: string, operations: CfeOperationDef[], entities: Map<string, CfeEntityDef>): Record<string, unknown> {
  const operationInputs = new Map<string, CfeL4OperationInput[]>(
    bffCall.uses.map(operationId => {
      const operation = operations.find(op => op.operationId === operationId);
      return [operationId, operation ? l4OperationInputs(operation.data) : []] as const;
    }),
  );
  const shape = bffCallCommandShape(bffCall, operationInputs);
  const primaryOperation = operations.find(op => op.operationId === bffCall.uses[0]);
  const purpose = primaryOperation?.title || humanizeId(bffCall.bffId);
  const rulesApplied = unique(bffCall.uses.flatMap(id => operations.find(op => op.operationId === id)?.rulesApplied || []));
  const contractKey = `${workspace.workspaceId}.${bffCall.bffId}`;
  return {
    commandName: shape.commandName,
    bffName: shape.routeKey,
    routeKey: shape.routeKey,
    purpose,
    kind: shape.kind,
    outputShape: shape.outputShape,
    ...(shape.canonicalOutputShape ? { canonicalOutputShape: shape.canonicalOutputShape } : {}),
    input: shape.input.map(field => ({ name: field.name, type: 'string', required: field.required, source: field.source, presentation: field.presentation })),
    output: shape.output,
    rulesApplied,
    origin: {
      source: 'l4/workspace-bffCall',
      ownerId: `bffCall:${contractKey}`,
      workspaceId: workspace.workspaceId,
      bffId: bffCall.bffId,
      route: bffCall.route,
      uses: bffCall.uses,
      defPath: `_${mls.actualProject || 0}_/l4/${moduleName}/contracts/${contractKey}.ts`,
    },
  };
}

export async function saveContractDefs(prepared: CfePreparedPage): Promise<void> {
  await savePageCreateMarker(prepared, 'inProgress');
  // F3 (v2): the contract of record is the l4 bffCall contract, byte-copied to l2 deterministically —
  // no LLM, no readCanonicalOutputShape, no per-page contract .defs.ts. The shared imports these .ts.
  if (prepared.contractCopies.length > 0) {
    for (const copy of prepared.contractCopies) await saveStorContent(copy.fileInfo, copy.source);
    return;
  }
  await saveFrontendDefs(contractFileInfo(prepared.project, prepared.page), 'definition', prepared.commands, contractPipeline(prepared.project, prepared.page));
}

export async function saveBaseSharedDefs(prepared: CfePreparedPage): Promise<void> {
  const baseLayout = enrichLayoutWithStateRefs(prepared, deterministicLayoutFromBase(prepared));
  const definition = sharedDefinition(prepared, baseLayout);
  await saveFrontendDefs(sharedFileInfo(prepared.project, prepared.page), 'definition', definition, sharedPipeline(prepared));
}

// ---- Item 2a: generated BFF page tests (page11) ----
// Deterministic, declarative test cases (no LLM, no node:test) executed server-side by the monitor
// Tests runner (devenv). Written next to the page11 render at web/desktop/page11/<page>.test.ts.
// Params valued with the "<seedRef>" marker are resolved at run time from the harvested output of the
// page's parameterless queries (real seeded ids/values), so a validation case's ONLY wrong input is
// the omitted required field. Coverage: 1 "ok" case per BFF routine + 1 validation case per required
// command field. Compiled outside the defs->materialize pipeline (no .defs.ts), like seeds.ts.
const PAGE_TESTS_VARIANT = 'page11';
const SEED_REF_MARKER = '<seedRef>';

interface PageTestCase {
  id: string;
  routine: string;
  params: Record<string, unknown>;
  expect: { ok: boolean; errorCode?: string; minItems?: number; shape?: 'object' | 'array' | 'paginated' };
  mutating?: boolean;
}

export async function savePageTestsFile(prepared: CfePreparedPage): Promise<void> {
  const cases = buildPageTestCases(prepared);
  if (cases.length === 0) return;
  const fileInfo: FileInfo = { project: prepared.project, level: 2, folder: `${prepared.page.moduleName}/web/desktop/${PAGE_TESTS_VARIANT}`, shortName: prepared.page.pageId, extension: '.test.ts' };
  await saveStorContent(fileInfo, renderPageTestsFile(prepared, cases));
}

export function buildPageTestCases(prepared: CfePreparedPage): PageTestCase[] {
  const cases: PageTestCase[] = [];
  for (const command of prepared.commands) {
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    const kind = readString(command.kind) === 'query' ? 'query' : 'command';
    const routine = readString(command.routeKey) || `${prepared.page.moduleName}.${prepared.page.pageId}.${commandName}`;
    const inputFields = commandFieldRecords(command.input);
    const requiredFields = inputFields.filter(field => field.required).map(field => field.name);
    // Boundary cases omit a required FORM field only (route/selection ids stay present, resolved from
    // the seed pool) — matching the spec example: keep stockItemId, omit unit -> VALIDATION_ERROR.
    const requiredFormFields = inputFields
      .filter(field => field.required && (field.presentation ?? 'form') === 'form')
      .map(field => field.name);

    if (kind === 'query') {
      // shape asserts the wire shape the FE contract expects — the runner compares it against the
      // ACTUAL backend response, catching object×array drift (Item 5) that minItems alone misses.
      const outputShape = normalizeOutputShape(command.outputShape);
      const shape = outputShape === 'array' ? 'array' : outputShape === 'paginated' ? 'paginated' : 'object';
      const isList = shape === 'array' || shape === 'paginated';
      cases.push({ id: `${commandName}.ok`, routine, params: seedRefParams(requiredFields), expect: isList ? { ok: true, shape, minItems: 1 } : { ok: true, shape } });
    } else {
      // Command "ok" case writes -> mutating (runner isolates it in a rolled-back transaction).
      // A command returns its result object.
      cases.push({ id: `${commandName}.ok`, routine, params: seedRefParams(requiredFields), expect: { ok: true, shape: 'object' }, mutating: true });
      for (const field of requiredFormFields) {
        cases.push({ id: `${commandName}.${field}.required`, routine, params: seedRefParams(requiredFields.filter(other => other !== field)), expect: { ok: false, errorCode: 'VALIDATION_ERROR' } });
      }
    }
  }
  return cases;
}

function seedRefParams(fields: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of fields) params[field] = SEED_REF_MARKER;
  return params;
}

function renderPageTestsFile(prepared: CfePreparedPage, cases: PageTestCase[]): string {
  const header = `/// <mls fileReference="_${prepared.project}_/l2/${prepared.page.moduleName}/web/desktop/${PAGE_TESTS_VARIANT}/${prepared.page.pageId}.test.ts" enhancement="_blank"/>`;
  const body = { moduleName: prepared.page.moduleName, page: prepared.page.pageId, variant: PAGE_TESTS_VARIANT, cases };
  return `${header}\n\n`
    + `// GENERATED — declarative BFF test cases run server-side by the monitor Tests runner (devenv only).\n`
    + `// Data, not a runnable test module: no node:test import, so scripts/run-tests.mjs never captures it.\n`
    + `// Params valued "${SEED_REF_MARKER}" are resolved at run time from the harvested output of this\n`
    + `// page's parameterless queries.\n`
    + `export const pageTests = ${JSON.stringify(body, null, 2)} as const;\n`;
}

export async function savePageLayoutDefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition, genome = 'page11', objective?: unknown): Promise<CfePageLayoutDefinition> {
  // F4 (v2): the LLM often references the l4 operationId (e.g. browseHighlights) instead of the bffCall
  // id that serves it (browseHighlightsQuery). Remap operationId action-refs to their owning bffId FIRST,
  // before the drop/validate steps, since the mapping (bffCall.uses) is deterministic.
  const bffMapped = remapLayoutActionsToBff(prepared, layout);
  const repairedLayout = repairMissingLayoutI18n(prepared, repairUnknownLayoutFields(prepared, repairMissingOperationUserActions(prepared, repairUnknownLayoutActions(prepared, repairDuplicateLayoutIds(prepared.page.pageId, bffMapped)))));
  validatePageLayout(prepared, repairedLayout);
  const enrichedLayout = enrichLayoutWithStateRefs(prepared, repairedLayout);
  const definition = {
    ...prepared.baseDefinition,
    templateId: selectedTemplateId(prepared, genome),
    visualStyle: prepared.visualStyle,
    // The goal-first genome (page21) carries the synthesized objective so the render skill can
    // lay the page out around the actor's primary decision. Absent on the page11 baseline.
    ...(isRecord(objective) ? { pageObjective: objective } : {}),
    // The closed msg-key vocabulary is NOT duplicated here: the shared base class MessageType is the
    // authoritative, type-checked key set, and the render skill reads it from the shared .d.ts. An
    // invented or shortened key (102051: 'lane.registered', 'organism.dashboard.empty') still fails
    // the strict tsc against that type — the page defs no longer needs its own msgKeys list.
    sections: layoutSectionSummary(enrichedLayout.sections),
    layout: {
      id: enrichedLayout.layoutId,
      type: 'page',
      sections: enrichedLayout.sections,
    },
    dataBindings: enrichedLayout.dataBindings,
  };
  await saveFrontendDefs(pageFileInfo(prepared.project, prepared.page, genome), 'definition', definition, pagePipeline(prepared.project, prepared.page, prepared.visualStyle, genome));
  return enrichedLayout;
}

// Expand the LLM's minimal semantic composition into the full internal layout the rest of the pipeline
// (repairs, validate, reconcile, render, materialize) expects. Each organism's `uses` bffCall ids are
// turned into concrete intentions/fields/actions with the SAME deterministic builders as the seed, so the
// model never authors — and never drifts on — the rigid field tree. Composition-only signal (organism
// identity, order, purpose, displayHint) rides through; rich presentation is the render skill's job.
export function expandLayoutComposition(prepared: CfePreparedPage, composition: CfeLayoutComposition): CfePageLayoutDefinition {
  const pageId = prepared.page.pageId;
  const commandByBff = new Map(prepared.commands.map(command => [readString(command.commandName), command]));
  const i18n: Record<string, string> = {};
  const sections: CfeLayoutSection[] = [];
  composition.sections.forEach((section, sectionIndex) => {
    const sectionId = section.id && section.id.startsWith('section.') ? section.id : `section.${pageId}.${toSafeShortName(section.id || section.sectionName || `s${sectionIndex + 1}`) || 'main'}`;
    const sectionTitleKey = `${sectionId}.title`;
    i18n[sectionTitleKey] = section.sectionName || prepared.page.pageName;
    const organisms: CfeLayoutOrganism[] = [];
    let order = 0;
    let hasMutation = false;
    for (const compositionOrganism of section.organisms) {
      order += 10;
      const built = expandCompositionOrganism(pageId, compositionOrganism, commandByBff, order, i18n);
      if (!built) continue;
      if (built.intentions.some(intent => intent.intent === 'commandForm')) hasMutation = true;
      organisms.push(built);
    }
    if (organisms.length > 0) {
      sections.push({ id: sectionId, type: 'section', sectionName: section.sectionName || prepared.page.pageName, titleKey: sectionTitleKey, mode: hasMutation ? 'edit' : 'view', order: (sectionIndex + 1) * 10, organisms });
    }
  });
  // If the composition bound to no known bffCalls (all `uses` empty/unknown), fall back to the
  // deterministic L4 layout so the page still covers every command instead of failing coverage.
  if (sections.every(section => section.organisms.length === 0)) return deterministicLayoutFromBase(prepared);

  // Coverage guarantee (was implicit in the deterministic seed): validatePageLayout rejects any command
  // not surfaced by some organism ("does not represent operation"). The model's `uses` may omit one, so
  // append a deterministic organism for every uncovered command — no LLM, no failure.
  const covered = new Set(sections.flatMap(section => section.organisms.flatMap(organism => organism.userActions)));
  const uncovered = prepared.commands.map(command => readString(command.commandName)).filter(name => name && !covered.has(name));
  if (uncovered.length > 0) {
    const target = sections[sections.length - 1];
    let order = target.organisms.reduce((max, organism) => Math.max(max, organism.order), 0);
    for (const bffId of uncovered) {
      order += 10;
      const command = commandByBff.get(bffId) || {};
      const built = readString(command.kind) === 'query'
        ? buildQueryOrganism(pageId, bffId, 'list', order, commandByBff, i18n)
        : buildCommandOrganism(pageId, bffId, order, commandByBff, i18n);
      if (built.intentions.some(intent => intent.intent === 'commandForm')) target.mode = 'edit';
      target.organisms.push(built);
    }
    recordCreateWarning(`${pageId}: appended deterministic organism(s) for command(s) the composition left uncovered: ${uncovered.join(', ')}`);
  }

  return {
    pageId,
    layoutId: composition.layoutId || `page.${pageId}`,
    sections,
    i18n,
    dataBindings: prepared.commands.map(command => ({
      id: `binding.${pageId}.${readString(command.commandName)}`,
      source: `bff.${readString(command.commandName)}`,
      command: readString(command.commandName),
      description: readString(command.purpose),
    })),
  };
}

function expandCompositionOrganism(pageId: string, composition: CfeCompositionOrganism, commandByBff: Map<string, Record<string, unknown>>, order: number, i18n: Record<string, string>): CfeLayoutOrganism | null {
  const uses = composition.uses.filter(bffId => commandByBff.has(bffId));
  if (uses.length === 0) {
    // No data binding -> a content/landing organism; the displayHint is the content role (hero, showcase…).
    const content = buildContentOrganism(pageId, composition.displayHint || 'content', order, i18n);
    return { ...content, id: composition.id || content.id, organismName: composition.organismName || content.organismName, purpose: composition.purpose || content.purpose, displayHint: composition.displayHint, order };
  }
  const built = uses.map(bffId => {
    const command = commandByBff.get(bffId) || {};
    return readString(command.kind) === 'query'
      ? buildQueryOrganism(pageId, bffId, 'list', order, commandByBff, i18n)
      : buildCommandOrganism(pageId, bffId, order, commandByBff, i18n);
  });
  const base = built[0];
  // Merge every used bffCall's intentions into one organism; carry the model's identity/hint through.
  return {
    ...base,
    id: composition.id || base.id,
    organismName: composition.organismName || base.organismName,
    purpose: composition.purpose || base.purpose,
    displayHint: composition.displayHint || base.displayHint,
    order,
    userActions: unique(built.flatMap(organism => organism.userActions)),
    requiredEntities: unique(built.flatMap(organism => organism.requiredEntities)),
    readsFields: unique(built.flatMap(organism => organism.readsFields)),
    writesFields: unique(built.flatMap(organism => organism.writesFields)),
    rulesApplied: unique(built.flatMap(organism => organism.rulesApplied)),
    intentions: built.flatMap(organism => organism.intentions),
  };
}

// Persist the goal-first page objective as a per-page trace (flow.json output
// trace/frontend-page-objective/{page}.json). Best-effort: a trace write must never fail the run.
export async function savePageObjectiveTrace(prepared: CfePreparedPage, genome: string, objective: unknown): Promise<void> {
  if (!isRecord(objective)) return;
  const fileInfo: FileInfo = {
    project: prepared.project,
    level: 2,
    folder: `${prepared.page.moduleName}/trace/frontend-page-objective`,
    shortName: prepared.page.pageId,
    extension: '.json',
  };
  await saveStorContent(fileInfo, `${JSON.stringify({ savedAt: new Date().toISOString(), pageId: prepared.page.pageId, genome, objective }, null, 2)}\n`);
}

// Build shared from the union of all saved variants. States are contract-keyed, so the primary
// covers the base and extra variants can only add display-state references.
export async function reconcileSharedDefs(prepared: CfePreparedPage, enrichedLayouts: CfePageLayoutDefinition[]): Promise<void> {
  const unionLayout = mergeLayoutsForShared(enrichedLayouts);
  const definition = sharedDefinition(prepared, unionLayout);
  await saveFrontendDefs(sharedFileInfo(prepared.project, prepared.page), 'definition', definition, sharedPipeline(prepared));
  await savePageCreateMarker(prepared, 'done');
}

interface CfeCreateRunCache {
  context: CfeCreateContext;
  preparedByPage: Map<string, CfePreparedPage>;
  layoutsByPage: Map<string, Map<string, CfePageLayoutDefinition>>;
}

const CREATE_RUN_CACHE_KEY = '__agentChangeFrontendCreateRuns';

function getCreateRuns(): Map<string, CfeCreateRunCache> {
  const browser = window as unknown as Record<string, unknown>;
  const existing = browser[CREATE_RUN_CACHE_KEY];
  if (existing instanceof Map) return existing as Map<string, CfeCreateRunCache>;
  const runs = new Map<string, CfeCreateRunCache>();
  browser[CREATE_RUN_CACHE_KEY] = runs;
  return runs;
}

function getCreateRun(runId: string): CfeCreateRunCache {
  const run = getCreateRuns().get(runId);
  if (!run) throw new Error(`create execution cache not found for ${runId}; restart @@changeFrontend so L4 is scanned once for this run`);
  return run;
}

export function startCreateRun(runId: string, context: CfeCreateContext): void {
  if (!runId) throw new Error('missing create execution runId');
  getCreateRuns().set(runId, { context, preparedByPage: new Map(), layoutsByPage: new Map() });
}

export async function prepareCreateRunPage(runId: string, pageId: string): Promise<CfePreparedPage> {
  const run = getCreateRun(runId);
  const cached = run.preparedByPage.get(pageId);
  if (cached) return cached;
  const page = run.context.pages.find(item => item.pageId === pageId);
  if (!page) throw new Error(`page not found in create execution ${runId}: ${pageId}`);
  const prepared = await preparePageCreate(page, run.context);
  run.preparedByPage.set(pageId, prepared);
  return prepared;
}

export async function listCreateRunLayoutArgs(runId: string): Promise<{ pageId: string; genome: string; templateId: string; runId: string }[]> {
  const run = getCreateRun(runId);
  const args: { pageId: string; genome: string; templateId: string; runId: string }[] = [];
  for (const page of run.context.pages) {
    const prepared = await prepareCreateRunPage(runId, page.pageId);
    for (const variant of prepared.variantPlan) args.push({ pageId: page.pageId, genome: variant.genome, templateId: variant.templateId, runId });
  }
  return args;
}

export function listCreateRunPageArgs(runId: string): { pageId: string; runId: string }[] {
  return getCreateRun(runId).context.pages.map(page => ({ pageId: page.pageId, runId }));
}

export function createLayoutPromptContext(prepared: CfePreparedPage, genome: string, templateId: string): Record<string, unknown> {
  const variant = prepared.variantPlan.find(item => item.genome === genome);
  if (!variant || variant.templateId !== templateId) throw new Error(`template ${templateId} is not pinned for ${prepared.page.pageId}/${genome}`);
  const common = baseLayoutPromptContext(prepared);
  // page21 goal-first: no pinned template. Every scored candidate is supplied as inspiration
  // and the layout call first synthesizes the page objective (see promptGoalFirst.md).
  if (templateId === GOAL_FIRST_TEMPLATE_ID) {
    const candidates = (variant.template as Record<string, unknown>).candidates;
    return {
      ...common,
      mode: 'goal-first',
      templateCatalog: Array.isArray(candidates) ? candidates : [variant.template],
      renderVocabulary: goalFirstRenderVocabulary(),
      // Trimmed journey: keep the neutral signal (microUserFlow, operationsInOrder, lifecycle) but
      // drop recommendedStages and the commandForm-biased guidance — those pre-encode the
      // "list on top, one stacked form per mutation" shape the goal-first genome exists to escape.
      userJourney: goalFirstUserJourney(prepared.userJourney),
    };
  }
  return { ...common, template: variant.template, userJourney: prepared.userJourney };
}

// The full userJourney (buildPageUserJourney) carries recommendedStages (a commandForm stage per
// mutation) and a guidance array that instructs the baseline stacked layout. page11 needs both.
// page21 (goal-first) must NOT receive them — they contradict the objective-first framing — so this
// keeps only the neutral, useful signal.
function goalFirstUserJourney(userJourney: Record<string, unknown>): Record<string, unknown> {
  const { recommendedStages, guidance, ...rest } = userJourney;
  void recommendedStages;
  void guidance;
  return rest;
}

function baseLayoutPromptContext(prepared: CfePreparedPage): Record<string, unknown> {
  const baseLayout = enrichLayoutWithStateRefs(prepared, deterministicLayoutFromBase(prepared));
  const shared = sharedDefinition(prepared, baseLayout);
  return {
    page: {
      pageId: prepared.page.pageId,
      pageName: prepared.page.pageName,
      moduleName: prepared.page.moduleName,
      sourceKind: prepared.page.sourceKind,
    },
    shared: {
      baseClassName: shared.baseClassName,
      states: shared.states,
      actions: shared.actions,
      functions: (shared.actions as Record<string, unknown>[]).map(action => ({
        actionId: action.actionId,
        methodName: action.methodName,
        handlerName: action.handlerName,
        inputStateKeys: action.inputStateKeys,
        outputStateKeys: action.outputStateKeys,
      })),
      initialLoads: shared.initialLoads,
      businessContextRefs: shared.businessContextRefs,
      // Field vocabulary for layout fields/columns/filters. The strict validator rejects any
      // field name outside this catalog, so the LLM must see the exact allowed names (query
      // output fields are otherwise invisible: queryResult states only carry an outputShape).
      fieldCatalog: {
        byAction: prepared.commands.map(command => ({
          actionId: readString(command.commandName),
          kind: readString(command.kind) === 'query' ? 'query' : 'command',
          inputFields: commandFieldRecords(command.input).map(field => field.name),
          outputFields: commandFieldRecords(command.output).map(field => field.name),
        })),
        byEntity: prepared.entityFields,
      },
      statePolicy: 'All filters, form fields, query results, action statuses and navigation requests are shared/global state. Page render must not own mutable state.',
    },
    // Module locale metadata only — NOT an output field. The model does not author i18n (see tool
    // schema note); renamed away from `i18n` so it is not mirrored back as a rejected i18n output key.
    localeMeta: prepared.i18nMeta,
    // F4: the l4 v2 workspace declares the authoritative section/organism skeleton. The LLM lays out
    // AROUND these roles — it does NOT invent a section per query. Absent for legacy operationIds pages.
    ...(prepared.workspace && prepared.workspace.sections.length > 0 ? {
      workspace: {
        note: 'AUTHORITATIVE layout skeleton (l4 v2). Build the page from these sections and organism roles — do NOT turn every query into its own section. primarySurface = the section surface (list/table/panel per output kind); filterControl = filters bound to its surface query INPUTS (fold into that surface, never a separate section); detailPanel = a detail/master-detail panel of its query; contextualAction/batchAction = a command action/form acting on the surface; hero/banner/richText/imageSet/ctaLink/showcase = landing content. dataSource/action are bffCall ids present in shared.actions.',
        purpose: prepared.workspace.purpose,
        kind: prepared.workspace.kind,
        sections: prepared.workspace.sections.map(section => ({
          sectionId: section.sectionId,
          intent: section.intent,
          organisms: section.organisms.map(organism => ({ role: organism.role, dataSource: organism.dataSource, action: organism.action, attachTo: organism.attachTo, slice: organism.slice })),
        })),
      },
    } : {}),
  };
}

// Composite render patterns the goal-first genome (page21) may use, materialized by
// genCfePage21RenderTs. Generic capability vocabulary — never example-specific. The closed
// field/action catalog and the layout schema still apply; these only widen presentation.
function goalFirstRenderVocabulary(): Record<string, unknown> {
  return {
    note: 'You are NOT limited to one queryList + one commandForm per operation. Compose the layout around the page objective using these presentation patterns. Every field/action still comes from shared.fieldCatalog and shared.actions; intents keep the same schema (fields/columns/filters/toolbar/rowActions/actions).',
    displayHints: [
      { hint: 'master-detail', use: 'A selectable list/board on one side and a contextual detail/action panel for the selected item on the other. Prefer this over stacking a separate form section below a list.' },
      { hint: 'contextual-transition-actions', use: 'For a lifecycle/status mutation, render the allowed next states as one button per valid transition on the selected row/card. Never a free <select> over all enum values and never a manually typed id field.' },
      { hint: 'card-board', use: 'Group items into lanes by status/stage; the primary action lives inline on each card.' },
      { hint: 'inline-row-command', use: 'A one-decision command executed directly on a list row, without opening a separate form section.' },
      { hint: 'summary-first', use: 'Lead with the decisive numbers/status the actor needs, then detail below.' },
    ],
    rules: [
      'Order organisms by the page objective (primaryDecision first), informed by userJourney — not by mechanically mirroring every journey step as its own form.',
      'A context-derived or system-owned field (ids, status, timestamps) is read-only context or a derived action, never a manual input.',
      'Keep the layout honest: only actions/fields that exist in the catalog, only shared states.',
    ],
  };
}

export function rememberCreateLayout(runId: string, pageId: string, genome: string, layout: CfePageLayoutDefinition): void {
  const run = getCreateRun(runId);
  const variants = run.layoutsByPage.get(pageId) || new Map<string, CfePageLayoutDefinition>();
  variants.set(genome, layout);
  run.layoutsByPage.set(pageId, variants);
}

export async function reconcileCreateRunPage(runId: string, pageId: string): Promise<void> {
  const prepared = await prepareCreateRunPage(runId, pageId);
  const layouts = getCreateRun(runId).layoutsByPage.get(pageId);
  const primary = layouts?.get('page11');
  if (!primary) throw new Error(`primary layout page11 was not saved for ${pageId}`);
  const savedLayouts = prepared.variantPlan
    .map(variant => layouts?.get(variant.genome))
    .filter((layout): layout is CfePageLayoutDefinition => Boolean(layout));
  await reconcileSharedDefs(prepared, savedLayouts);
}

export function verifyCreateRunPrimaryLayouts(runId: string): string[] {
  const run = getCreateRun(runId);
  return run.context.pages
    .filter(page => !run.layoutsByPage.get(page.pageId)?.has('page11'))
    .map(page => `${page.pageId}: missing primary page11 layout`);
}

export async function saveCreateLayoutFailureTrace(
  runId: string,
  pageId: string,
  genome: string,
  templateId: string,
  stage: 'beforePromptStep' | 'afterPromptStep',
  message: string,
): Promise<void> {
  const prepared = await prepareCreateRunPage(runId, pageId);
  const fileInfo: FileInfo = {
    project: prepared.project,
    level: 2,
    folder: `${prepared.page.moduleName}/trace/frontend-create-layout-errors`,
    shortName: `${toSafeShortName(pageId)}--${toSafeShortName(genome)}`,
    extension: '.json',
  };
  await saveStorContent(fileInfo, `${JSON.stringify({
    savedAt: new Date().toISOString(),
    runId,
    pageId,
    genome,
    templateId,
    stage,
    message,
    agent: 'agentCfeCreateLayout',
  }, null, 2)}\n`);
}

export interface MaterializeVerifyBrokenTrace {
  planId: string;
  defPath: string;
  outputPath: string | null;
  typecheck: string;
  errors: string[];
  warnings: string[];
}

// Full, unbounded verify detail (every compile/typecheck error + warning per broken item) written to
// the file system so the msg-task step trace can stay a short summary (DynamoDB 400KB task cap). One
// file per verify invocation, keyed by its planId, at l2/trace/frontend-materialize-verify — NOT
// module-scoped because a materialize phase spans every frontend module; each entry carries its full
// defPath/outputPath. Best-effort: a trace write must never fail the verify. Returns the mls ref of
// the written file (for the summary to point at) or null when it could not be written.
export async function saveMaterializeVerifyTrace(planId: string, attempt: number, broken: MaterializeVerifyBrokenTrace[]): Promise<string | null> {
  try {
    const project = mls.actualProject || 0;
    if (!project) return null;
    const shortName = toSafeShortName(planId);
    const fileInfo: FileInfo = { project, level: 2, folder: 'trace/frontend-materialize-verify', shortName, extension: '.json' };
    await saveStorContent(fileInfo, `${JSON.stringify({
      savedAt: new Date().toISOString(),
      planId,
      attempt,
      brokenCount: broken.length,
      broken,
      agent: 'agentCfeMaterializePhase',
    }, null, 2)}\n`);
    return `_${project}_/l2/trace/frontend-materialize-verify/${shortName}.json`;
  } catch (error) {
    console.error(`[saveMaterializeVerifyTrace] ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function listCreateRunLayoutFailureTraces(runId: string): Promise<string[]> {
  const run = getCreateRun(runId);
  const traces: string[] = [];
  for (const page of run.context.pages) {
    const prepared = await prepareCreateRunPage(runId, page.pageId);
    for (const variant of prepared.variantPlan) {
      const fileInfo: FileInfo = {
        project: prepared.project,
        level: 2,
        folder: `${prepared.page.moduleName}/trace/frontend-create-layout-errors`,
        shortName: `${toSafeShortName(page.pageId)}--${toSafeShortName(variant.genome)}`,
        extension: '.json',
      };
      const trace = await readJsonFile(fileInfo);
      const record = isRecord(trace) ? trace : null;
      if (!record || readString(record.runId) !== runId) continue;
      const message = readString(record.message);
      if (message) traces.push(`${page.pageId}/${variant.genome}: ${message}`);
    }
  }
  return traces;
}

function mergeLayoutsForShared(layouts: CfePageLayoutDefinition[]): CfePageLayoutDefinition {
  const primary = layouts[0];
  const i18n: Record<string, string> = {};
  const dataBindings: CfePageLayoutDefinition['dataBindings'] = [];
  const seenBinding = new Set<string>();
  const sections: CfeLayoutSection[] = [];
  for (const layout of layouts) {
    Object.assign(i18n, layout.i18n);
    for (const binding of layout.dataBindings) {
      if (seenBinding.has(binding.id)) continue;
      seenBinding.add(binding.id);
      dataBindings.push(binding);
    }
    // Keep every section (dup ids are harmless here: shared collects stateKeys, deduped downstream).
    sections.push(...layout.sections);
  }
  return { pageId: primary.pageId, layoutId: primary.layoutId, sections, i18n, dataBindings };
}

export async function finalizeGeneratedPages(): Promise<{ pagesDone: string[]; ownersDone: string[]; skippedPages: string[]; configMsg: string }> {
  const context = await readCreateContext();
  const checkedPages = await Promise.all(context.pages.map(async page => ({ page, ok: await hasGeneratedDefs(context.project, page) && await hasRegisteredFrontend(context.project, page) })));
  const validPages = checkedPages.filter(item => item.ok).map(item => item.page);
  const skippedPages = checkedPages.filter(item => !item.ok).map(item => item.page.pageId);
  const ownersDone = await updateOwnerStatuses(context, validPages.flatMap(page => page.ownerIds), 'done');
  await saveCreateReport(context.project, validPages, ownersDone, skippedPages);
  const configMsg = await saveFrontendWorkspaceConfig(context, validPages);
  return { pagesDone: validPages.map(page => page.pageId), ownersDone, skippedPages, configMsg };
}

export async function listGeneratedCreatePages(): Promise<{ project: number; pages: CfePagePlan[]; skippedPages: string[] }> {
  const context = await readCreateContext();
  const checkedPages = await Promise.all(context.pages.map(async page => ({ page, ok: await hasGeneratedDefs(context.project, page) })));
  return {
    project: context.project,
    pages: checkedPages.filter(item => item.ok).map(item => item.page),
    skippedPages: checkedPages.filter(item => !item.ok).map(item => item.page.pageId),
  };
}

export async function registerGeneratedFrontendPages(): Promise<{ pagesRegistered: string[]; skippedPages: string[] }> {
  const context = await readCreateContext();
  const checkedPages = await Promise.all(context.pages.map(async page => ({ page, ok: await hasGeneratedDefs(context.project, page) && hasMaterializedPageTs(context.project, page) })));
  const validPages = checkedPages.filter(item => item.ok).map(item => item.page);
  const skippedPages = checkedPages.filter(item => !item.ok).map(item => item.page.pageId);
  await Promise.all(validPages.map(page => savePageHtml(context.project, page)));
  await updateL5FrontendSignature(context.project, validPages);
  await Promise.all(validPages.map(page => savePageRegisterMarker(context.project, page, 'done')));
  return { pagesRegistered: validPages.map(page => page.pageId), skippedPages };
}

export function parseCreatePageArgs(prompt: string | undefined): { pageId: string } {
  if (!prompt) throw new Error('missing page args');
  const parsed = JSON.parse(prompt);
  const pageId = isRecord(parsed) ? readString(parsed.pageId) : '';
  if (!pageId) throw new Error(`invalid page args: ${prompt}`);
  return { pageId };
}

export function createUpdateStatusIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, status: mls.msg.AIStepStatus, traceMsg?: string): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep?.stepId ?? step.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
  };
}

function recordCreateWarning(message: string): void {
  const full = `[agentChangeFrontend] ${message}`;
  const w = window as any;
  if (!Array.isArray(w.__agentChangeFrontendCreateDiagnostics)) w.__agentChangeFrontendCreateDiagnostics = [];
  w.__agentChangeFrontendCreateDiagnostics.push(full);
}

export function createPromptReadyIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  toolSchema: mls.msg.LLMTool,
  toolName: string,
): mls.msg.AgentIntentPromptReady {
  if (!context.task) throw new Error('[createPromptReadyIntent] task invalid');
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [toolSchema],
    toolChoice: { type: 'function', function: { name: toolName } },
  };
}

export function createAgentStepPayload(planId: string, agentName: string, stepTitle: string, prompt: unknown, dependsOn: string[], executionMode: 'sequential' | 'parallel_dynamic' = 'sequential', status: mls.msg.AIStepStatus = 'waiting_dependency'): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle,
    status,
    nextSteps: [],
    agentName,
    prompt: JSON.stringify(prompt),
    rags: [],
    planning: { planId, dependsOn, executionMode, executionHost: 'client' },
  } as any;
}

export function createAddStepIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, args?: string[], maxParallel = 10): mls.msg.AgentIntentAddStep {
  const intent: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
  if (args) intent.executionMode = { type: 'parallel', args, maxParallel };
  return intent;
}

export function extractCfePageLayoutOutput(payload: unknown): CfePageLayoutOutput {
  return extractPlannerOutput(payload, cfePageLayoutConfig);
}

const cfePageLayoutConfig: PlannerExtractConfig<CfePageLayoutResult> = {
  toolName: CFE_LAYOUT_TOOL_NAME,
  normalizeResult: normalizeCfePageLayoutResult,
};

function normalizeCfePageLayoutResult(value: unknown): CfePageLayoutResult {
  const result = assertRecord(value, 'result');
  const pageLayoutRaw = isRecord(result.pageLayout) ? result.pageLayout : result;
  return {
    pageLayout: normalizeComposition(pageLayoutRaw, 'result.pageLayout'),
    // Goal-first (page21) also emits the synthesized objective; passed through untyped and
    // persisted for audit (page21 defs.pageObjective + trace). Absent for page11.
    ...(result.objective !== undefined ? { objective: result.objective } : {}),
  };
}

function normalizeComposition(value: unknown, path: string): CfeLayoutComposition {
  const pageLayout = assertRecord(value, path);
  return {
    pageId: assertString(pageLayout.pageId, `${path}.pageId`),
    layoutId: assertString(pageLayout.layoutId, `${path}.layoutId`),
    sections: assertArray(pageLayout.sections, `${path}.sections`).map((item, index) => normalizeCompositionSection(item, `${path}.sections[${index}]`)),
  };
}

function normalizeCompositionSection(value: unknown, path: string): CfeCompositionSection {
  const section = assertRecord(value, path);
  return {
    id: assertString(section.id, `${path}.id`),
    sectionName: optionalString(section.sectionName),
    order: normalizeOrder(section.order, `${path}.order`),
    organisms: assertArray(section.organisms, `${path}.organisms`).map((item, index) => normalizeCompositionOrganism(item, `${path}.organisms[${index}]`)),
  };
}

function normalizeCompositionOrganism(value: unknown, path: string): CfeCompositionOrganism {
  const organism = assertRecord(value, path);
  return {
    id: assertString(organism.id, `${path}.id`),
    organismName: assertString(organism.organismName, `${path}.organismName`),
    purpose: assertString(organism.purpose, `${path}.purpose`),
    order: normalizeOrder(organism.order, `${path}.order`),
    displayHint: optionalString(organism.displayHint),
    uses: Array.isArray(organism.uses) ? normalizeStringList(organism.uses, `${path}.uses`) : [],
    notes: optionalString(organism.notes),
  };
}

function normalizeDataBindings(value: unknown): { id: string; source: string; entity?: string; command?: string; description?: string; stateKey?: string; inputStateKeys?: string[] }[] {
  if (value === undefined || value === null) return [];
  return assertArray(value, 'result.pageLayout.dataBindings').map((item, index) => normalizeDataBinding(item, `dataBindings[${index}]`));
}

function normalizeDataBinding(value: unknown, path: string): { id: string; source: string; entity?: string; command?: string; description?: string; stateKey?: string; inputStateKeys?: string[] } {
  const binding = assertRecord(value, path);
  return {
    id: assertString(binding.id, `${path}.id`),
    source: assertString(binding.source, `${path}.source`),
    entity: optionalString(binding.entity),
    command: optionalString(binding.command),
    description: optionalString(binding.description),
    stateKey: optionalString(binding.stateKey),
    inputStateKeys: Array.isArray(binding.inputStateKeys) ? normalizeStringList(binding.inputStateKeys, `${path}.inputStateKeys`) : undefined,
  };
}

function normalizeI18n(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};
  const { record, defaultLocale } = normalizeI18nSource(value);
  const normalized: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) {
    if (isI18nMetadataKey(key)) continue;
    const text = normalizeI18nText(item, defaultLocale);
    if (text) normalized[key] = text;
  }
  return normalized;
}

function normalizeI18nSource(value: unknown): { record: Record<string, unknown>; defaultLocale: string } {
  const record = assertRecord(value, 'result.pageLayout.i18n');
  const defaultLocale = readI18nLocale(record.defaultLocale) || readI18nLocale(record.locale) || readI18nLocale(record.language);
  const messages = isRecord(record.messages) ? record.messages : undefined;
  const localeCatalog = selectI18nLocaleCatalog(messages || record, defaultLocale);
  return { record: localeCatalog || record, defaultLocale };
}

function selectI18nLocaleCatalog(record: Record<string, unknown>, defaultLocale: string): Record<string, unknown> | undefined {
  const entries = Object.entries(record).filter(([key, item]) => isI18nLocaleKey(key) && isRecord(item)) as [string, Record<string, unknown>][];
  if (entries.length === 0) return undefined;
  if (defaultLocale) {
    const exact = entries.find(([key]) => sameI18nLocale(key, defaultLocale));
    if (exact) return exact[1];
  }
  return entries[0][1];
}

function normalizeI18nText(value: unknown, defaultLocale: string): string {
  if (typeof value === 'string') return value.trim();
  if (!isRecord(value)) return '';
  if (defaultLocale) {
    const explicit = Object.entries(value).find(([key, item]) => sameI18nLocale(key, defaultLocale) && typeof item === 'string' && item.trim());
    if (explicit && typeof explicit[1] === 'string') return explicit[1].trim();
  }
  const localized = Object.entries(value).find(([key, item]) => isI18nLocaleKey(key) && typeof item === 'string' && item.trim());
  if (localized && typeof localized[1] === 'string') return localized[1].trim();
  return optionalString(value.text) || optionalString(value.value) || optionalString(value.label) || optionalString(value.title) || '';
}

function readI18nLocale(value: unknown): string {
  const locale = readString(value);
  return isI18nLocaleKey(locale) ? locale : '';
}

function isI18nLocaleKey(key: string): boolean {
  return /^[a-z]{2}(?:[-_][a-z0-9]{2,8})*$/i.test(key.trim());
}

function sameI18nLocale(a: string, b: string): boolean {
  return normalizeI18nLocale(a) === normalizeI18nLocale(b);
}

function normalizeI18nLocale(value: string): string {
  return value.trim().replace(/_/g, '-').toLowerCase();
}

function languageKeys(values: string[]): string[] {
  return unique(values.map(languageKey).filter(Boolean));
}

function languageKey(value: string): string {
  const locale = readI18nLocale(value);
  const primary = normalizeI18nLocale(locale || value).split('-')[0] || '';
  return /^[a-z]{2,3}$/i.test(primary) ? primary.toLowerCase() : '';
}

function isI18nMetadataKey(key: string): boolean {
  return ['defaultlocale', 'locale', 'language', 'messages'].includes(key.trim().toLowerCase());
}

function normalizeOrder(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  throw new Error(`${path} must be an integer`);
}

// Exactly two genomes per page (flow.json genomePolicy): page11 is the baseline with the top
// deterministic template pinned; page21 is goal-first with no pinned template — every scored
// candidate is supplied only as inspiration. The module-level todoFrontend.variants count is
// intentionally ignored (always page11 + page21).
export const GOAL_FIRST_TEMPLATE_ID = 'goal_first';

function buildLayoutVariantPlan(context: CfeCreateContext, page: CfePagePlan, operations: CfeOperationDef[], commands: Record<string, unknown>[]): CfeLayoutVariantPlan[] {
  const candidates = selectUxTemplateCandidates(deriveUxSignals(context, page, operations, commands));
  const primary = candidates[0];
  return [
    { genome: pageGenome(0), templateId: primary.id, template: primary as unknown as Record<string, unknown> },
    { genome: pageGenome(1), templateId: GOAL_FIRST_TEMPLATE_ID, template: { mode: 'goal-first', candidates: candidates as unknown as Record<string, unknown>[] } },
  ];
}

// Machine-derivable UX signals for template scoring. Prose signals stay for the LLM.
function deriveUxSignals(context: CfeCreateContext, page: CfePagePlan, operations: CfeOperationDef[], commands: Record<string, unknown>[]): UxScreenSignals {
  const queryCommands = commands.filter(command => readString(command.kind) === 'query');
  const mutationCommands = commands.filter(command => readString(command.kind) !== 'query');
  const hasStatusOrLifecycle = unique(operations.flatMap(operationEntities))
    .map(entityId => context.entities.get(entityId))
    .some(entity => Boolean(entity && (entity.statusEnum.length > 0 || entity.lifecycleStates.length > 0)));
  const isWorkflow = page.sourceKind === 'workflow';

  const accessPatterns: string[] = [];
  if (queryCommands.length > 0) accessPatterns.push('list');
  if (isWorkflow && hasStatusOrLifecycle) accessPatterns.push('queue', 'board');
  if (mutationCommands.length > 0) accessPatterns.push('commandInput');
  if (queryCommands.length > 0 && mutationCommands.length === 0 && operations.length === 1) accessPatterns.push('detail');

  const operationKinds = unique([
    ...operations.map(operation => operation.kind).filter(Boolean),
    ...(isWorkflow ? ['transition'] : []),
    ...(mutationCommands.length > 0 ? ['command'] : []),
    ...(queryCommands.length > 0 ? ['query'] : []),
  ]);

  const selection = queryCommands.length > 0 && mutationCommands.length > 0 ? 'single' : 'none';

  return {
    workspaceKind: readString((page.origin as Record<string, unknown>).workspaceKind),
    accessPatterns: unique(accessPatterns),
    selection,
    operationKinds,
    hasStatusOrLifecycle,
    hasQueryList: queryCommands.length > 0,
    isMultiStep: isWorkflow || operations.length > 1 || mutationCommands.length > 1,
  };
}

function buildPageUserJourney(context: CfeCreateContext, page: CfePagePlan, operations: CfeOperationDef[], commands: Record<string, unknown>[]): Record<string, unknown> {
  const queryCommands = commands.filter(command => readString(command.kind) === 'query');
  const mutationCommands = commands.filter(command => readString(command.kind) !== 'query');
  const lifecycleEntities = unique(operations.flatMap(operationEntities))
    .map(entityId => context.entities.get(entityId))
    .filter((entity): entity is CfeEntityDef => Boolean(entity && (entity.statusEnum.length > 0 || entity.lifecycleStates.length > 0)))
    .map(entity => ({
      entityId: entity.entityId,
      statusEnum: entity.statusEnum,
      lifecycleStates: entity.lifecycleStates,
    }));
  const recommendedStages: Record<string, unknown>[] = [];

  if (queryCommands.length > 0) {
    recommendedStages.push({
      stageId: 'discover',
      intent: 'queryList',
      purpose: 'Listar, buscar ou selecionar dados existentes antes de executar comandos.',
      actions: queryCommands.map(command => readString(command.commandName)).filter(Boolean),
    });
  }

  for (const command of mutationCommands) {
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    recommendedStages.push({
      stageId: `execute.${commandName}`,
      intent: 'commandForm',
      purpose: readString(command.purpose) || humanizeId(commandName),
      actions: [commandName],
      fields: commandFieldRecords(command.input).map(field => field.name),
    });
  }

  if (page.sourceKind === 'workflow' || operations.length > 1) {
    recommendedStages.push({
      stageId: 'review',
      intent: 'summary',
      purpose: 'Revisar o contexto e o resultado das ações principais da página.',
      actions: [],
    });
  }

  const workflowSteps = page.ownerIds
    .filter(id => id.startsWith('workflow:'))
    .flatMap(id => context.workflows.get(id.slice('workflow:'.length))?.storySteps || []);

  return {
    pageId: page.pageId,
    sourceKind: page.sourceKind,
    isMultiStep: page.sourceKind === 'workflow' || operations.length > 1 || mutationCommands.length > 1,
    // Intent-level micro user flow from l4 story.steps: the primary ordering signal for fields/organisms.
    microUserFlow: {
      workflowSteps,
      operations: operations.map(operation => ({
        operationId: operation.operationId,
        commandName: operation.commandName || operation.operationId,
        steps: operation.storySteps,
      })),
    },
    operationsInOrder: operations.map(operation => ({
      operationId: operation.operationId,
      title: operation.title,
      kind: operation.kind,
      reads: operation.reads,
      writes: operation.writes,
      entities: operationEntities(operation),
    })),
    lifecycleEntities,
    recommendedStages,
    guidance: [
      'Order fields and organisms following microUserFlow (l4 story.steps): the steps are the intended user sequence within the page.',
      'Preserve the order of operations when laying out intentions.',
      'Place query/list/selection context before create/update/status commands when both exist.',
      'For order-like or parent-child flows, a composed input (e.g. items[]) is a repeatable sub-form inside the SAME single submit — never a separate save per child.',
      'Use progressive disclosure or wizard-like stages only as semantic intent; page11 implementation remains plain render.',
    ],
  };
}

// F4 (v2): map any layout action-ref that is an l4 operationId to the bffCall id that uses it. A ref
// already equal to a command name (bffId) is left untouched; an operationId used by exactly one bffCall
// is remapped; anything else is left as-is (the downstream drop/validate handles it). No-op for legacy
// pages (no bffCalls). This lets the LLM think in operations while the wire model stays bffCall-keyed.
export function remapLayoutActionsToBff(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const bffCalls = prepared.workspace?.bffCalls || [];
  if (bffCalls.length === 0) return layout;
  const commandNames = new Set(prepared.commands.map(command => readString(command.commandName)).filter(Boolean));
  const opToBffIds = new Map<string, string[]>();
  for (const call of bffCalls) {
    for (const operationId of call.uses) {
      if (!opToBffIds.has(operationId)) opToBffIds.set(operationId, []);
      if (!opToBffIds.get(operationId)!.includes(call.bffId)) opToBffIds.get(operationId)!.push(call.bffId);
    }
  }
  const remapped: string[] = [];
  const remap = (action: string | undefined): string | undefined => {
    if (!action || commandNames.has(action)) return action;
    const bffIds = opToBffIds.get(action);
    if (bffIds && bffIds.length === 1) { remapped.push(`${action}->${bffIds[0]}`); return bffIds[0]; }
    return action;
  };
  const remapList = (actions: CfeLayoutAction[]): CfeLayoutAction[] => actions.map(action => ({ ...action, action: remap(action.action) || action.action }));
  const sections = layout.sections.map(section => ({
    ...section,
    organisms: section.organisms.map(organism => ({
      ...organism,
      userActions: unique(organism.userActions.map(action => remap(action) || action)),
      intentions: organism.intentions.map(intent => ({
        ...intent,
        action: remap(intent.action),
        submitAction: remap(intent.submitAction),
        toolbar: remapList(intent.toolbar),
        rowActions: remapList(intent.rowActions),
        actions: remapList(intent.actions),
      })),
    })),
  }));
  if (remapped.length === 0) return layout;
  recordCreateWarning(`remapped operationId action-ref(s) to bffCall id for ${prepared.page.pageId}: ${unique(remapped).join('; ')}`);
  return { ...layout, sections };
}

function repairUnknownLayoutActions(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const allowedActions = new Set(prepared.commands.map(command => readString(command.commandName)).filter(Boolean));
  const dropped: string[] = [];

  const keepActionName = (action: string, path: string): boolean => {
    if (allowedActions.has(action)) return true;
    dropped.push(`${path}=${action}`);
    return false;
  };
  const cleanActionRef = (action: string | undefined, path: string): string | undefined => {
    if (!action) return undefined;
    return keepActionName(action, path) ? action : undefined;
  };
  const cleanActionList = (actions: CfeLayoutAction[], path: string): CfeLayoutAction[] => actions.filter(action => keepActionName(action.action, `${path}.${action.id}`));

  const sections = layout.sections.map(section => ({
    ...section,
    organisms: section.organisms.map(organism => ({
      ...organism,
      userActions: organism.userActions.filter(action => keepActionName(action, `${organism.id}.userActions`)),
      intentions: organism.intentions.map(intent => ({
        ...intent,
        action: cleanActionRef(intent.action, `${intent.id}.action`),
        submitAction: cleanActionRef(intent.submitAction, `${intent.id}.submitAction`),
        toolbar: cleanActionList(intent.toolbar, `${intent.id}.toolbar`),
        rowActions: cleanActionList(intent.rowActions, `${intent.id}.rowActions`),
        actions: cleanActionList(intent.actions, `${intent.id}.actions`),
      })),
    })),
  }));

  if (dropped.length > 0) {
    recordCreateWarning(`dropped unknown layout action(s) for ${prepared.page.pageId}: ${dropped.join('; ')}`);
  }
  return dropped.length > 0 ? { ...layout, sections } : layout;
}

// The strict "layout does not represent operation" check only counts organism.userActions, but the
// LLM legitimately represents a query as a queryList intention (intent.action/toolbar/rowActions)
// without repeating it in userActions (seen in 102051: browseMenuItems/browseStockItems killed
// page11). When an expected operation is referenced by any intention of an organism, list it in
// that organism's userActions instead of failing the variant.
function repairMissingOperationUserActions(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const seen = new Set<string>(layout.sections.flatMap(section => section.organisms.flatMap(organism => organism.userActions)));
  // Coverage unit is the page action (command name = v1 operationId / v2 bffCall id), matching validateCreateLayout.
  const actionNames = [...new Set(prepared.commands.map(command => readString(command.commandName)).filter(Boolean))];
  const missing = actionNames.filter(actionName => !seen.has(actionName));
  if (missing.length === 0) return layout;

  const intentActionRefs = (intent: CfeLayoutIntent): string[] => [
    intent.action,
    intent.submitAction,
    ...[...intent.toolbar, ...intent.rowActions, ...intent.actions].map(action => action.action),
  ].filter(Boolean) as string[];

  const repaired: string[] = [];
  const sections = layout.sections.map(section => ({
    ...section,
    organisms: section.organisms.map(organism => {
      const refs = new Set(organism.intentions.flatMap(intentActionRefs));
      const additions = missing.filter(actionName => refs.has(actionName) && !organism.userActions.includes(actionName));
      if (additions.length === 0) return organism;
      for (const actionName of additions) {
        repaired.push(`${organism.id}+=${actionName}`);
        missing.splice(missing.indexOf(actionName), 1);
      }
      return { ...organism, userActions: [...organism.userActions, ...additions] };
    }),
  }));

  if (repaired.length === 0) return layout;
  recordCreateWarning(`added intention-referenced action(s) to userActions for ${prepared.page.pageId}: ${repaired.join('; ')}`);
  return { ...layout, sections };
}

// Symmetric to repairUnknownLayoutActions: a field/column/filter whose field name is outside the
// allowed vocabulary is dropped with a warning instead of failing the whole variant (seen in
// 102051: invented query columns like orderNumber/currentLevel killed every page11 layout).
function repairUnknownLayoutFields(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const allowed = allowedLayoutFields(prepared);
  const dropped: string[] = [];
  const cleanFieldList = (fields: CfeLayoutField[], path: string): CfeLayoutField[] => fields.filter(field => {
    if (allowed.has(field.field)) return true;
    dropped.push(`${path}.${field.id}=${field.field}`);
    return false;
  });

  const sections = layout.sections.map(section => ({
    ...section,
    organisms: section.organisms.map(organism => ({
      ...organism,
      intentions: organism.intentions.map(intent => ({
        ...intent,
        fields: cleanFieldList(intent.fields, `${intent.id}.fields`),
        columns: cleanFieldList(intent.columns, `${intent.id}.columns`),
        filters: cleanFieldList(intent.filters, `${intent.id}.filters`),
      })),
    })),
  }));

  if (dropped.length === 0) return layout;
  recordCreateWarning(`dropped unknown layout field(s) for ${prepared.page.pageId}: ${dropped.join('; ')}`);
  return { ...layout, sections };
}

// Section/organism/intention ids are structural only (nothing references them: wiring uses action
// names, field refs, stateKeys and dataBinding ids), so renaming an LLM-duplicated id is safe.
// Without this repair a duplicated section id fails the strict page11 validation and kills the
// whole page (seen in 102049: two sections sharing sec_petManagement / sec_schedulingCapacity).
function repairDuplicateLayoutIds(pageId: string, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const seen = new Set<string>([layout.layoutId]);
  const renamed: string[] = [];
  const uniqueId = (id: string, path: string): string => {
    if (!seen.has(id)) { seen.add(id); return id; }
    let suffix = 2;
    while (seen.has(`${id}${suffix}`)) suffix++;
    const next = `${id}${suffix}`;
    seen.add(next);
    renamed.push(`${path}: ${id} -> ${next}`);
    return next;
  };

  const sections = layout.sections.map(section => ({
    ...section,
    id: uniqueId(section.id, `section:${section.sectionName}`),
    organisms: section.organisms.map(organism => ({
      ...organism,
      id: uniqueId(organism.id, `organism:${organism.organismName}`),
      intentions: organism.intentions.map(intent => ({
        ...intent,
        id: uniqueId(intent.id, `intent:${intent.intent}`),
      })),
    })),
  }));

  if (renamed.length === 0) return layout;
  recordCreateWarning(`renamed duplicate layout id(s) for ${pageId}: ${renamed.join('; ')}`);
  return { ...layout, sections };
}

function repairMissingLayoutI18n(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const i18n: Record<string, string> = { ...layout.i18n };
  const added: string[] = [];
  const ensure = (key: string | undefined, fallback: string, kind: 'title' | 'label' | 'empty'): void => {
    if (!key || i18n[key]) return;
    i18n[key] = fallbackI18nText(key, fallback, kind);
    added.push(key);
  };

  for (const section of layout.sections) {
    ensure(section.titleKey, section.sectionName || section.id, 'title');
    for (const organism of section.organisms) {
      ensure(organism.titleKey, organism.purpose || organism.organismName || organism.id, 'title');
      for (const intent of organism.intentions) {
        ensure(intent.titleKey, intent.intent || intent.id, 'title');
        ensure(intent.emptyKey, intent.intent || intent.id, 'empty');
        for (const field of [...intent.fields, ...intent.columns, ...intent.filters]) ensure(field.labelKey, field.field || field.id, 'label');
        for (const action of [...intent.toolbar, ...intent.rowActions, ...intent.actions]) ensure(action.labelKey, action.action || action.id, 'label');
      }
    }
  }

  return added.length > 0 ? { ...layout, i18n } : layout;
}

function fallbackI18nText(key: string, fallback: string, kind: 'title' | 'label' | 'empty'): string {
  if (kind === 'empty') return 'Nenhum registro encontrado';
  const source = fallback || key.replace(/\.(title|label|empty)$/i, '');
  const lastSegment = source.split('.').filter(Boolean).pop() || source;
  return humanizeId(lastSegment);
}

function fallbackLayoutTitleKey(id: string): string {
  const safeId = id.replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'layout';
  return `${safeId}.title`;
}

export function validatePageLayout(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): void {
  if (layout.pageId !== prepared.page.pageId) throw new Error(`layout pageId ${layout.pageId} does not match ${prepared.page.pageId}`);
  const ids = new Set<string>();
  const i18nKeys = new Set(Object.keys(layout.i18n));
  const actions = new Set(prepared.commands.map(command => readString(command.commandName)).filter(Boolean));
  // Coverage unit is the page ACTION (v1: operationId == commandName; v2: bffCall id). Using the command
  // names covers both — and for a composed v2 bffCall (uses N>1) one command legitimately represents all
  // its operations, so we must not demand each underlying operationId appear in the layout.
  const expectedActions = new Set(actions);
  const seenActions = new Set<string>();
  const fields = allowedLayoutFields(prepared);

  registerId(ids, layout.layoutId, 'layout.layoutId');
  for (const section of layout.sections) {
    registerId(ids, section.id, `section:${section.sectionName}`);
    assertI18nKey(i18nKeys, section.titleKey, `${section.id}.titleKey`);
    if (section.organisms.length === 0) throw new Error(`${section.id} must have organisms`);
    for (const organism of section.organisms) {
      registerId(ids, organism.id, `organism:${organism.organismName}`);
      assertI18nKey(i18nKeys, organism.titleKey, `${organism.id}.titleKey`);
      for (const action of organism.userActions) {
        if (!actions.has(action)) throw new Error(`${organism.id}.userActions references unknown action ${action}`);
        seenActions.add(action);
      }
      for (const entity of organism.requiredEntities) {
        if (entity && !prepared.page.entityIds.includes(entity) && !prepared.operations.some(operation => operationEntities(operation).includes(entity))) {
          throw new Error(`${organism.id}.requiredEntities references unknown entity ${entity}`);
        }
      }
      if (organism.intentions.length === 0) throw new Error(`${organism.id} must have intentions`);
      for (const intent of organism.intentions) validateIntent(ids, i18nKeys, actions, fields, intent);
    }
  }
  for (const action of expectedActions) {
    if (!seenActions.has(action)) throw new Error(`layout does not represent operation ${action}`);
  }
}

function validateIntent(ids: Set<string>, i18nKeys: Set<string>, actions: Set<string>, fields: Set<string>, intent: CfeLayoutIntent): void {
  registerId(ids, intent.id, `intent:${intent.id}`);
  if (intent.titleKey) assertI18nKey(i18nKeys, intent.titleKey, `${intent.id}.titleKey`);
  if (intent.emptyKey) assertI18nKey(i18nKeys, intent.emptyKey, `${intent.id}.emptyKey`);
  for (const action of [intent.action, intent.submitAction].filter(Boolean) as string[]) assertAction(actions, action, intent.id);
  // Element ids only need to be unique within their own list. The same underlying field or
  // action legitimately reuses its stable id across lists and intents (e.g. a field shown both
  // as a form field and a list column, or a total surfaced by more than one operation on the
  // page). Those references collapse to a single shared state downstream (addLayoutSupplementalStates
  // dedupes by stateKey), so a page-global id set produced false "duplicate layout id" failures.
  validateLayoutFieldGroup(intent.fields, 'field', i18nKeys, fields);
  validateLayoutFieldGroup(intent.columns, 'column', i18nKeys, fields);
  validateLayoutFieldGroup(intent.filters, 'filter', i18nKeys, fields);
  validateLayoutActionGroup(intent.toolbar, 'toolbar', i18nKeys, actions);
  validateLayoutActionGroup(intent.rowActions, 'rowAction', i18nKeys, actions);
  validateLayoutActionGroup(intent.actions, 'action', i18nKeys, actions);
}

function validateLayoutFieldGroup(group: CfeLayoutField[], kind: string, i18nKeys: Set<string>, fields: Set<string>): void {
  const groupIds = new Set<string>();
  for (const field of group) {
    registerId(groupIds, field.id, `${kind}:${field.id}`);
    assertI18nKey(i18nKeys, field.labelKey, `${field.id}.labelKey`);
    if (!fields.has(field.field)) throw new Error(`${field.id}.field references unknown field ${field.field}`);
  }
}

function validateLayoutActionGroup(group: CfeLayoutAction[], kind: string, i18nKeys: Set<string>, actions: Set<string>): void {
  const groupIds = new Set<string>();
  for (const action of group) {
    registerId(groupIds, action.id, `${kind}:${action.id}`);
    assertI18nKey(i18nKeys, action.labelKey, `${action.id}.labelKey`);
    assertAction(actions, action.action, action.id);
  }
}

function assertAction(actions: Set<string>, action: string, path: string): void {
  if (!actions.has(action)) throw new Error(`${path} references unknown action ${action}`);
}

function assertI18nKey(i18nKeys: Set<string>, key: string, path: string): void {
  if (!i18nKeys.has(key)) throw new Error(`${path} references missing i18n key ${key}`);
}

function registerId(ids: Set<string>, id: string, path: string): void {
  if (ids.has(id)) throw new Error(`duplicate layout id ${id} at ${path}`);
  ids.add(id);
}

function allowedLayoutFields(prepared: CfePreparedPage): Set<string> {
  const allowed = new Set<string>();
  for (const operation of prepared.operations) {
    for (const ref of [...fieldRefs(operation.reads), ...fieldRefs(operation.writes)]) {
      allowed.add(ref);
      allowed.add(ref.split('.')[1] || ref);
    }
  }
  for (const command of prepared.commands) {
    const commandName = readString(command.commandName);
    for (const field of [...commandFields(command.input), ...commandFields(command.output)]) {
      allowed.add(field);
      if (commandName) {
        allowed.add(`${commandName}.${field}`);
        allowed.add(`${commandName}.input.${field}`);
        allowed.add(`${commandName}.output.${field}`);
      }
    }
  }
  for (const ref of collectBusinessContextRefs(prepared.operations)) {
    allowed.add(ref.contextKey);
    allowed.add(ref.originRef);
    allowed.add(ref.targetRef);
  }
  for (const entityId of unique([...prepared.page.entityIds, ...prepared.operations.flatMap(operationEntities)])) {
    for (const fieldId of prepared.entityFields[entityId] || []) {
      if (!fieldId) continue;
      allowed.add(fieldId);
      allowed.add(`${entityId}.${fieldId}`);
    }
  }
  return allowed;
}

function commandFields(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => isRecord(item) ? readString(item.name) : '').filter(Boolean);
}

function recordTechnicalIdLookupGaps(page: CfePagePlan, commands: Record<string, unknown>[]): void {
  const lookupFields = new Set(commands
    .filter(command => readString(command.kind) === 'query')
    .flatMap(command => commandFieldRecords(command.output).map(field => field.name)));
  for (const command of commands) {
    if (readString(command.kind) === 'query') continue;
    for (const field of commandFieldRecords(command.input)) {
      if (field.presentation !== 'form' || !/Id$/i.test(field.name) || lookupFields.has(field.name)) continue;
      recordCreateWarning(`L4 lookup gap for ${page.pageId}.${readString(command.commandName)}.${field.name}: no query output can populate a contextual selector`);
    }
  }
}

export function deterministicLayoutFromBase(prepared: CfePreparedPage): CfePageLayoutDefinition {
  // F4: when the l4 v2 workspace declares bffCalls, the layout is bffCall-keyed (organisms reference
  // bffIds) — the SAME gate as prepared.commands, so the seed and shared.actions never diverge. Do NOT
  // tie this to contractCopies (an F3/materialize concern): if the l4 contracts aren't available the
  // commands are still bffCall-based, and a legacy per-operation seed here would reference operationIds
  // that are absent from shared.actions (deterministic "missing shared action" failure, no LLM).
  if (prepared.workspace && prepared.workspace.bffCalls.length > 0) {
    return deterministicWorkspaceLayout(prepared, prepared.workspace);
  }
  const i18n: Record<string, string> = {};
  const sectionId = `section.${prepared.page.pageId}.main`;
  const sectionTitleKey = `${sectionId}.title`;
  i18n[sectionTitleKey] = prepared.page.pageName;
  const contextOrganism = deterministicBusinessContextOrganism(prepared, i18n);
  const operationOffset = contextOrganism ? 1 : 0;
  const organisms = [
    ...(contextOrganism ? [contextOrganism] : []),
    ...prepared.operations.map((operation, index) => deterministicOrganism(prepared, operation, index + operationOffset, i18n)),
  ];
  return {
    pageId: prepared.page.pageId,
    layoutId: `page.${prepared.page.pageId}`,
    sections: [{
      id: sectionId,
      type: 'section',
      sectionName: prepared.page.pageName,
      titleKey: sectionTitleKey,
      mode: prepared.operations.some(op => op.kind !== 'query' && op.kind !== 'view') ? 'edit' : 'view',
      order: 10,
      organisms,
    }],
    i18n,
    dataBindings: prepared.commands.map(command => ({
      id: `binding.${prepared.page.pageId}.${readString(command.commandName)}`,
      source: `bff.${readString(command.commandName)}`,
      command: readString(command.commandName),
      description: readString(command.purpose),
    })),
  };
}

function deterministicBusinessContextOrganism(prepared: CfePreparedPage, i18n: Record<string, string>): CfeLayoutOrganism | null {
  const refs = collectBusinessContextRefs(prepared.operations);
  if (refs.length === 0) return null;
  const organismId = `organism.${prepared.page.pageId}.businessContext`;
  const organismTitleKey = `${organismId}.title`;
  const intentId = `intent.${prepared.page.pageId}.businessContext.summary`;
  const intentTitleKey = `${intentId}.title`;
  i18n[organismTitleKey] = 'Contexto de negocio';
  i18n[intentTitleKey] = 'Contexto de negocio';
  return {
    id: organismId,
    type: 'contextSummary',
    organismName: 'BusinessContext',
    titleKey: organismTitleKey,
    purpose: 'Mostrar o contexto de empresa/unidade usado pelas operacoes desta pagina.',
    userActions: [],
    requiredEntities: [],
    readsFields: refs.map(ref => ref.targetRef),
    writesFields: [],
    rulesApplied: [],
    order: 10,
    intentions: [{
      id: intentId,
      intent: 'summary',
      order: 10,
      titleKey: intentTitleKey,
      source: 'businessContext',
      fields: refs.map((ref, index) => deterministicBusinessContextField(prepared.page.pageId, intentId, ref, index, i18n)),
      columns: [],
      filters: [],
      toolbar: [],
      rowActions: [],
      actions: [],
    }],
  };
}

function deterministicBusinessContextField(pageId: string, intentId: string, ref: CfeBusinessContextRef, index: number, i18n: Record<string, string>): CfeLayoutField {
  const id = `${intentId}.field.${ref.contextKey}`;
  const labelKey = `${id}.label`;
  i18n[labelKey] = ref.contextKey === 'activeUnitId' ? 'Unidade ativa' : 'Empresa ativa';
  return { id, field: ref.contextKey, labelKey, order: (index + 1) * 10, source: ref.originRef, stateKey: businessContextStateKey(pageId, ref.contextKey) };
}

function deterministicOrganism(prepared: CfePreparedPage, operation: CfeOperationDef, index: number, i18n: Record<string, string>): CfeLayoutOrganism {
  const command = prepared.commands.find(item => item.commandName === operation.operationId) || {};
  const isQuery = command.kind === 'query';
  const organismId = `organism.${prepared.page.pageId}.${operation.operationId}`;
  const organismTitleKey = `${organismId}.title`;
  i18n[organismTitleKey] = operation.title || humanizeId(operation.operationId);
  const intentId = `intent.${prepared.page.pageId}.${operation.operationId}.${isQuery ? 'list' : 'form'}`;
  const intentTitleKey = `${intentId}.title`;
  const emptyKey = `${intentId}.empty`;
  i18n[intentTitleKey] = operation.title || humanizeId(operation.operationId);
  i18n[emptyKey] = 'Nenhum registro encontrado';
  // Only userInput fields are form controls. Route and selection values are browser context and
  // remain in the contract/action state without being rendered as values the user can type.
  const fields = commandFieldRecords(command.input)
    .filter(field => field.presentation === 'form')
    .map((field, fieldIndex) => deterministicField(`${intentId}.field.${field.name}`, field.name, fieldIndex, i18n));
  const columns = commandFields(command.output).map((field, fieldIndex) => deterministicField(`${intentId}.column.${field}`, field, fieldIndex, i18n));
  const actionKey = `${intentId}.action.${operation.operationId}`;
  i18n[actionKey] = operation.title || humanizeId(operation.operationId);
  return {
    id: organismId,
    type: isQuery ? 'queryResult' : 'commandForm',
    organismName: toPascalCase(operation.operationId),
    titleKey: organismTitleKey,
    purpose: operation.title || humanizeId(operation.operationId),
    userActions: [operation.operationId],
    requiredEntities: operationEntities(operation),
    readsFields: fieldRefs(operation.reads),
    writesFields: fieldRefs(operation.writes),
    rulesApplied: operation.rulesApplied,
    order: (index + 1) * 10,
    intentions: [{
      id: intentId,
      intent: isQuery ? 'queryList' : 'commandForm',
      order: 10,
      titleKey: intentTitleKey,
      source: `bff.${operation.operationId}`,
      binding: `binding.${prepared.page.pageId}.${operation.operationId}`,
      submitAction: isQuery ? undefined : operation.operationId,
      action: isQuery ? operation.operationId : undefined,
      emptyKey,
      fields: isQuery ? [] : fields,
      columns: isQuery ? columns : [],
      filters: isQuery ? fields : [],
      toolbar: [],
      rowActions: isQuery ? [{ id: `${intentId}.rowAction.${operation.operationId}`, action: operation.operationId, labelKey: actionKey, order: 10 }] : [],
      actions: isQuery ? [] : [{ id: `${intentId}.action.${operation.operationId}`, action: operation.operationId, labelKey: actionKey, order: 10 }],
    }],
  };
}

function deterministicField(id: string, field: string, index: number, i18n: Record<string, string>): CfeLayoutField {
  const labelKey = `${id}.label`;
  i18n[labelKey] = humanizeId(field);
  return { id, field, labelKey, order: (index + 1) * 10 };
}

// F4: the deterministic seed layout for an l4 v2 workspace. One layout section per workspace section;
// organisms come from the section's roles (not one per query). filterControl folds into its surface's
// filters; contextualAction/batchAction become command forms; content roles (F6) become content organisms.
function deterministicWorkspaceLayout(prepared: CfePreparedPage, workspace: CfeJourneyWorkspace): CfePageLayoutDefinition {
  const i18n: Record<string, string> = {};
  const pageId = prepared.page.pageId;
  const commandByBff = new Map(prepared.commands.map(command => [readString(command.commandName), command]));
  // Prefer the declared sections/organisms; if the workspace has bffCalls but no sections, synthesize a
  // single section with one organism per bffCall (query -> surface, command -> form) so the seed stays
  // bffCall-keyed and covers every command (never falls back to operationId refs).
  const workspaceSections: CfeWorkspaceSection[] = workspace.sections.length > 0
    ? workspace.sections
    : [{ sectionId: 'main', intent: workspace.purpose || prepared.page.pageName, organisms: workspace.bffCalls.map(call => ({ role: call.kind === 'command' ? 'contextualAction' : 'primarySurface', ...(call.kind === 'command' ? { action: call.bffId } : { dataSource: call.bffId }) })) }];
  const sections: CfeLayoutSection[] = [];
  workspaceSections.forEach((section, sectionIndex) => {
    const sectionId = `section.${pageId}.${toSafeShortName(section.sectionId) || 'main'}`;
    const sectionTitleKey = `${sectionId}.title`;
    i18n[sectionTitleKey] = section.intent || prepared.page.pageName;
    const organisms: CfeLayoutOrganism[] = [];
    let order = 0;
    let hasMutation = false;
    for (const organism of section.organisms) {
      if (organism.role === 'filterControl') continue; // folds into the surface it is attached to
      order += 10;
      const built = buildWorkspaceOrganism(pageId, organism, commandByBff, order, i18n);
      if (!built) continue;
      if (built.type === 'commandForm') hasMutation = true;
      organisms.push(built);
    }
    if (organisms.length > 0) {
      sections.push({ id: sectionId, type: 'section', sectionName: prepared.page.pageName, titleKey: sectionTitleKey, mode: hasMutation ? 'edit' : 'view', order: (sectionIndex + 1) * 10, organisms });
    }
  });
  if (sections.length === 0) {
    const fallbackId = `section.${pageId}.main`;
    i18n[`${fallbackId}.title`] = prepared.page.pageName;
    sections.push({ id: fallbackId, type: 'section', sectionName: prepared.page.pageName, titleKey: `${fallbackId}.title`, mode: 'view', order: 10, organisms: [] });
  }
  return {
    pageId,
    layoutId: `page.${pageId}`,
    sections,
    i18n,
    dataBindings: prepared.commands.map(command => ({
      id: `binding.${pageId}.${readString(command.commandName)}`,
      source: `bff.${readString(command.commandName)}`,
      command: readString(command.commandName),
      description: readString(command.purpose),
    })),
  };
}

function buildWorkspaceOrganism(pageId: string, organism: CfeWorkspaceOrganism, commandByBff: Map<string, Record<string, unknown>>, order: number, i18n: Record<string, string>): CfeLayoutOrganism | null {
  // Content roles (F6) carry no bffCall, except showcase which is fed by a query dataSource.
  if (isContentOrganismRole(organism.role)) {
    if (organism.role === 'showcase' && organism.dataSource && commandByBff.has(organism.dataSource)) {
      return buildQueryOrganism(pageId, organism.dataSource, 'showcase', order, commandByBff, i18n);
    }
    return buildContentOrganism(pageId, organism.role, order, i18n);
  }
  const bffId = organism.dataSource || organism.action || '';
  const command = bffId ? commandByBff.get(bffId) : undefined;
  if (!command) return null;
  if (readString(command.kind) === 'query') {
    return buildQueryOrganism(pageId, bffId, organism.role === 'detailPanel' ? 'detail' : 'list', order, commandByBff, i18n);
  }
  return buildCommandOrganism(pageId, bffId, order, commandByBff, i18n);
}

function buildQueryOrganism(pageId: string, bffId: string, mode: 'list' | 'detail' | 'showcase', order: number, commandByBff: Map<string, Record<string, unknown>>, i18n: Record<string, string>): CfeLayoutOrganism {
  const command = commandByBff.get(bffId) || {};
  const title = readString(command.purpose) || humanizeId(bffId);
  const organismId = `organism.${pageId}.${bffId}`;
  const organismTitleKey = `${organismId}.title`;
  i18n[organismTitleKey] = title;
  const intentId = `intent.${pageId}.${bffId}.${mode}`;
  const intentTitleKey = `${intentId}.title`;
  const emptyKey = `${intentId}.empty`;
  i18n[intentTitleKey] = title;
  i18n[emptyKey] = 'Nenhum registro encontrado';
  const columns = commandFields(command.output).map((field, index) => deterministicField(`${intentId}.column.${field}`, field, index, i18n));
  const filters = commandFieldRecords(command.input).filter(field => field.presentation === 'form').map((field, index) => deterministicField(`${intentId}.filter.${field.name}`, field.name, index, i18n));
  const intent = mode === 'detail' ? 'detail' : mode === 'showcase' ? 'showcase' : 'queryList';
  return {
    id: organismId,
    type: mode === 'showcase' ? 'showcase' : 'queryResult',
    organismName: toPascalCase(bffId),
    titleKey: organismTitleKey,
    purpose: title,
    userActions: [bffId],
    requiredEntities: [],
    readsFields: [],
    writesFields: [],
    rulesApplied: Array.isArray(command.rulesApplied) ? command.rulesApplied.map(String) : [],
    order,
    intentions: [{
      id: intentId,
      intent,
      order: 10,
      titleKey: intentTitleKey,
      source: `bff.${bffId}`,
      binding: `binding.${pageId}.${bffId}`,
      action: bffId,
      emptyKey,
      displayHint: mode === 'detail' ? 'master-detail' : undefined,
      fields: mode === 'detail' ? columns : [],
      columns: mode === 'detail' ? [] : columns,
      filters: mode === 'detail' ? [] : filters,
      toolbar: [],
      rowActions: [],
      actions: [],
    }],
  };
}

function buildCommandOrganism(pageId: string, bffId: string, order: number, commandByBff: Map<string, Record<string, unknown>>, i18n: Record<string, string>): CfeLayoutOrganism {
  const command = commandByBff.get(bffId) || {};
  const title = readString(command.purpose) || humanizeId(bffId);
  const organismId = `organism.${pageId}.${bffId}`;
  const organismTitleKey = `${organismId}.title`;
  i18n[organismTitleKey] = title;
  const intentId = `intent.${pageId}.${bffId}.form`;
  const intentTitleKey = `${intentId}.title`;
  const actionKey = `${intentId}.action.${bffId}`;
  i18n[intentTitleKey] = title;
  i18n[actionKey] = title;
  const fields = commandFieldRecords(command.input).filter(field => field.presentation === 'form').map((field, index) => deterministicField(`${intentId}.field.${field.name}`, field.name, index, i18n));
  return {
    id: organismId,
    type: 'commandForm',
    organismName: toPascalCase(bffId),
    titleKey: organismTitleKey,
    purpose: title,
    userActions: [bffId],
    requiredEntities: [],
    readsFields: [],
    writesFields: [],
    rulesApplied: Array.isArray(command.rulesApplied) ? command.rulesApplied.map(String) : [],
    order,
    intentions: [{
      id: intentId,
      intent: 'commandForm',
      order: 10,
      titleKey: intentTitleKey,
      source: `bff.${bffId}`,
      binding: `binding.${pageId}.${bffId}`,
      submitAction: bffId,
      fields,
      columns: [],
      filters: [],
      toolbar: [],
      rowActions: [],
      actions: [{ id: `${intentId}.action.${bffId}`, action: bffId, labelKey: actionKey, order: 10 }],
    }],
  };
}

// F6: content organism (no bffCall) for landing roles hero/banner/richText/imageSet/ctaLink.
function buildContentOrganism(pageId: string, role: string, order: number, i18n: Record<string, string>): CfeLayoutOrganism {
  const organismId = `organism.${pageId}.${role}${order}`;
  const organismTitleKey = `${organismId}.title`;
  i18n[organismTitleKey] = humanizeId(role);
  const intentId = `intent.${pageId}.${role}${order}.content`;
  const intentTitleKey = `${intentId}.title`;
  i18n[intentTitleKey] = humanizeId(role);
  if (role === 'ctaLink') i18n[`${intentId}.label`] = 'Ver mais';
  return {
    id: organismId,
    type: 'content',
    organismName: toPascalCase(role),
    titleKey: organismTitleKey,
    purpose: humanizeId(role),
    userActions: [],
    requiredEntities: [],
    readsFields: [],
    writesFields: [],
    rulesApplied: [],
    order,
    intentions: [{
      id: intentId,
      intent: role,
      order: 10,
      titleKey: intentTitleKey,
      displayHint: role,
      fields: [],
      columns: [],
      filters: [],
      toolbar: [],
      rowActions: [],
      actions: [],
    }],
  };
}

function sharedDefinition(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): Record<string, unknown> {
  const businessContextRefs = collectBusinessContextRefs(prepared.operations);
  const states = sharedStates(prepared, layout);
  const actions = sharedActions(prepared, states);
  const initialLoads = prepared.commands
    .filter(command => readString(command.kind) === 'query')
    // A query with a REQUIRED public input cannot run on connectedCallback: the input is empty at
    // boot and the BFF correctly rejects it (run 102049 Lima: shared auto-fired searchProducts with
    // {} -> 400 VALIDATION_ERROR searchTerm). Auto-load only parameterless/optional-input queries;
    // the required-input ones run on user action (search button / row selection).
    .filter(command => !commandFieldRecords(command.input).some(field => field.required))
    .map(command => ({ actionId: readString(command.commandName), stateKey: queryDataStateKey(prepared.page.pageId, readString(command.commandName)) }));
  validateSharedLayoutRefs(prepared, layout, states, actions, initialLoads);
  return {
    pageId: prepared.page.pageId,
    pageName: prepared.page.pageName,
    moduleName: prepared.page.moduleName,
    baseClassName: `${toPascalCase(prepared.page.moduleName)}${toPascalCase(prepared.page.pageId)}Base`,
    routePattern: pageRoutePattern(prepared.page, prepared.operations),
    sourceKind: prepared.page.sourceKind,
    ownerIds: prepared.page.ownerIds,
    operationIds: prepared.page.operationIds,
    origin: prepared.page.origin,
    // F3 (v2): ONE generated contract .ts per workspace holds every bffCall's Input/Output + `<bffId>Route`
    // const. The shared imports/re-exports from that single file and calls execBff with the imported route
    // const — never a typed route string. Legacy: a single per-page contract .ts built by the LLM skill.
    contractRef: prepared.contractCopies.length > 0
      ? {
          tsPath: prepared.contractCopies[0].tsRef,
          contracts: prepared.commands.map(command => ({ commandName: readString(command.commandName), routeConst: `${readString(command.commandName)}Route` })).filter(entry => entry.commandName),
        }
      : {
          defPath: toDisplayRef(contractFileInfo(prepared.project, prepared.page)),
          tsPath: contractTsPath(prepared.project, prepared.page),
        },
    layoutRef: {
      defPath: toDisplayRef(pageFileInfo(prepared.project, prepared.page)),
      layoutId: layout.layoutId,
    },
    states,
    actions,
    initialLoads,
    businessContextRefs,
    navigationRefs: prepared.navigationRefs,
    i18nMeta: prepared.i18nMeta,
    i18n: layout.i18n,
    automation: {
      statePrefix: `ui.${prepared.page.pageId}`,
      stateKeys: states.map(state => readString(state.stateKey)).filter(Boolean),
      actionIds: actions.map(action => readString(action.actionId)).filter(Boolean),
    },
  };
}

function sharedStates(prepared: CfePreparedPage, layout?: CfePageLayoutDefinition): Record<string, unknown>[] {
  const states = new Map<string, Record<string, unknown>>();
  addState(states, {
    stateKey: `ui.${prepared.page.pageId}.status`,
    name: 'status',
    kind: 'pageStatus',
    defaultValue: '',
  });

  for (const command of prepared.commands) {
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    const kind = readString(command.kind) === 'query' ? 'query' : 'command';
    addState(states, {
      stateKey: actionStatusStateKey(prepared.page.pageId, commandName),
      name: `${commandName}State`,
      kind: 'actionStatus',
      actionRef: commandName,
      valueSet: ['idle', 'loading', 'success', 'error'],
      defaultValue: 'idle',
    });

    for (const field of commandFieldRecords(command.input)) {
      addState(states, {
        stateKey: inputStateKey(prepared.page.pageId, commandName, field.name),
        name: inputStateName(commandName, field.name),
        kind: 'input',
        source: field.source,
        presentation: field.presentation,
        contractRef: { commandName, direction: 'input', field: field.name },
        defaultValue: defaultValueForField(field),
      });
    }

    if (kind === 'query') {
      const outputShape = normalizeOutputShape(command.outputShape);
      const queryDefaults = frontendQueryStateDefaults(outputShape);
      addState(states, {
        stateKey: queryDataStateKey(prepared.page.pageId, commandName),
        name: queryStateName(commandName),
        kind: 'queryResult',
        contractRef: { commandName, direction: 'output' },
        outputShape,
        collection: queryDefaults.collection,
        defaultValue: queryDefaults.defaultValue,
      });
    } else {
      addState(states, {
        stateKey: commandOutputStateKey(prepared.page.pageId, commandName),
        name: `${commandName}Output`,
        kind: 'commandOutput',
        contractRef: { commandName, direction: 'output' },
        defaultValue: null,
      });
      addState(states, {
        stateKey: actionErrorStateKey(prepared.page.pageId, commandName),
        name: `${commandName}Error`,
        kind: 'actionError',
        actionRef: commandName,
        defaultValue: '',
      });
    }
  }

  for (const ref of collectBusinessContextRefs(prepared.operations)) {
    addState(states, {
      stateKey: businessContextStateKey(prepared.page.pageId, ref.contextKey),
      name: ref.contextKey,
      kind: 'businessContext',
      source: ref.originRef,
      targetRef: ref.targetRef,
      required: ref.required,
      selector: ref.contextKey === 'activeUnitId' ? 'unit' : 'company',
      defaultValue: '',
    });
  }

  if (layout) addLayoutSupplementalStates(prepared, layout, states);
  return Array.from(states.values());
}

function sharedActions(prepared: CfePreparedPage, states: Record<string, unknown>[]): Record<string, unknown>[] {
  const actions: Record<string, unknown>[] = [];
  const stateKeys = new Set(states.map(state => readString(state.stateKey)).filter(Boolean));
  const queryActionIds = prepared.commands
    .filter(command => readString(command.kind) === 'query')
    .map(command => readString(command.commandName))
    .filter(Boolean);
  for (const command of prepared.commands) {
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    const kind = readString(command.kind) === 'query' ? 'query' : 'command';
    const commandOutputState = commandOutputStateKey(prepared.page.pageId, commandName);
    const refreshActionIds = kind === 'command' ? queryActionIds.filter(actionId => actionId !== commandName) : [];
    actions.push({
      actionId: commandName,
      kind,
      commandRef: commandName,
      routeKey: readString(command.routeKey) || `${prepared.page.moduleName}.${prepared.page.pageId}.${commandName}`,
      purpose: readString(command.purpose),
      methodName: kind === 'query' ? `load${toPascalCase(commandName)}` : commandName,
      handlerName: `handle${toPascalCase(commandName)}Click`,
      inputStateKeys: commandFieldRecords(command.input).map(field => inputStateKey(prepared.page.pageId, commandName, field.name)),
      routeParamInputStateKeys: commandFieldRecords(command.input)
        .filter(field => field.presentation === 'route')
        .map(field => inputStateKey(prepared.page.pageId, commandName, field.name)),
      selectedEntityInputStateKeys: commandFieldRecords(command.input)
        .filter(field => field.presentation === 'selection')
        .map(field => inputStateKey(prepared.page.pageId, commandName, field.name)),
      outputStateKeys: kind === 'query' ? [queryDataStateKey(prepared.page.pageId, commandName)] : (stateKeys.has(commandOutputState) ? [commandOutputState] : []),
      statusStateKey: actionStatusStateKey(prepared.page.pageId, commandName),
      ...(kind === 'command' ? {
        errorStateKey: actionErrorStateKey(prepared.page.pageId, commandName),
        feedback: {
          successMessageKey: `action.${commandName}.success`,
          errorMessageKey: `action.${commandName}.error`,
          dismissible: true,
        },
        clearInputStateKeys: commandFieldRecords(command.input)
          .filter(field => field.presentation === 'form' || field.presentation === 'selection')
          .map(field => inputStateKey(prepared.page.pageId, commandName, field.name)),
      } : {}),
      ...(refreshActionIds.length > 0 ? { refreshActionIds } : {}),
    });
  }

  const prefillBySelectorStateKey = buildManagePrefills(prepared, states);
  for (const state of states.filter(item => item.kind === 'input')) {
    const name = readString(state.name);
    if (!name) continue;
    const prefill = prefillBySelectorStateKey.get(readString(state.stateKey));
    actions.push({
      actionId: `set.${name}`,
      kind: 'stateSetter',
      stateKey: state.stateKey,
      methodName: `set${toPascalCase(name)}`,
      handlerName: `handle${toPascalCase(name)}Change`,
      ...(prefill ? { prefill } : {}),
    });
  }

  return actions;
}

// Item 1 (prefill): when a command has a selector input (route param or selected entity) whose id
// also appears in a query result on the same page, selecting a row should pre-populate the command's
// form inputs from the matching item. Emit a declarative `prefill` on the selector's stateSetter so
// genCfeSharedTs can materialize the lookup deterministically (input <-> browse-column match by name).
function buildManagePrefills(prepared: CfePreparedPage, states: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const prefills = new Map<string, Record<string, unknown>>();
  const stateByKey = new Map(states.map(state => [readString(state.stateKey), state]));
  const queryCommands = prepared.commands.filter(command => readString(command.kind) === 'query');
  if (queryCommands.length === 0) return prefills;

  for (const command of prepared.commands) {
    if (readString(command.kind) === 'query') continue;
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    const fields = commandFieldRecords(command.input);
    const selectorFields = fields.filter(field => field.presentation === 'route' || field.presentation === 'selection');
    const formFields = fields.filter(field => field.presentation === 'form');
    if (selectorFields.length === 0 || formFields.length === 0) continue;

    for (const selector of selectorFields) {
      let best: { queryName: string; matched: { name: string }[] } | undefined;
      for (const query of queryCommands) {
        const queryName = readString(query.commandName);
        if (!queryName) continue;
        const outputFields = new Set(commandFields(query.output));
        if (!outputFields.has(selector.name)) continue; // query must expose the id to match rows by
        const matched = formFields.filter(field => outputFields.has(field.name));
        if (matched.length > (best?.matched.length ?? 0)) best = { queryName, matched };
      }
      if (!best || best.matched.length === 0) continue;

      const dataStateKey = queryDataStateKey(prepared.page.pageId, best.queryName);
      const dataState = stateByKey.get(dataStateKey);
      prefills.set(inputStateKey(prepared.page.pageId, commandName, selector.name), {
        command: commandName,
        sourceStateKey: dataStateKey,
        sourceOutputShape: readString(dataState?.outputShape) || 'array',
        matchField: selector.name,
        fields: best.matched.map(field => ({
          itemField: field.name,
          targetStateKey: inputStateKey(prepared.page.pageId, commandName, field.name),
        })),
      });
    }
  }

  return prefills;
}

function addLayoutSupplementalStates(prepared: CfePreparedPage, layout: CfePageLayoutDefinition, states: Map<string, Record<string, unknown>>): void {
  const prefix = `ui.${prepared.page.pageId}.`;
  const added: string[] = [];
  for (const ref of collectLayoutStateRefs(layout)) {
    if (states.has(ref.stateKey)) continue;
    if (!ref.stateKey.startsWith(prefix)) throw new Error(`${ref.path} references state outside page namespace ${ref.stateKey}`);
    const state = layoutSupplementalState(prepared, ref.stateKey);
    addState(states, state);
    added.push(ref.stateKey);
  }
  if (added.length > 0) {
    recordCreateWarning(`added shared supplemental state(s) for ${prepared.page.pageId}: ${added.join('; ')}`);
  }
}

function layoutSupplementalState(prepared: CfePreparedPage, stateKey: string): Record<string, unknown> {
  const name = stateNameFromKey(prepared.page.pageId, stateKey);
  if (stateKey.includes('.input.')) {
    return { stateKey, name, kind: 'input', defaultValue: '' };
  }
  if (stateKey.includes('.data.')) {
    return { stateKey, name, kind: 'layoutData', collection: true, defaultValue: [] };
  }
  if (stateKey.includes('.output.')) {
    return { stateKey, name, kind: 'commandOutput', defaultValue: null };
  }
  throw new Error(`unbound layout state ${stateKey}: layout-only state must bind to a contract input, command output or query result`);
}

function validateSharedLayoutRefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition, states: Record<string, unknown>[], actions: Record<string, unknown>[], initialLoads: Record<string, unknown>[]): void {
  const stateKeys = new Set(states.map(state => readString(state.stateKey)).filter(Boolean));
  const actionIds = new Set(actions.map(action => readString(action.actionId)).filter(Boolean));
  const commandNames = new Set(prepared.commands.map(command => readString(command.commandName)).filter(Boolean));

  for (const action of actions) {
    const actionId = readString(action.actionId);
    const commandRef = readString(action.commandRef);
    if (commandRef && !commandNames.has(commandRef)) throw new Error(`shared action ${actionId} references unknown contract command ${commandRef}`);
    for (const stateKey of [...readStringArray(action.inputStateKeys), ...readStringArray(action.outputStateKeys), readString(action.statusStateKey), readString(action.errorStateKey), readString(action.stateKey), ...readStringArray(action.clearInputStateKeys)].filter(Boolean)) {
      if (!stateKeys.has(stateKey)) throw new Error(`shared action ${actionId} references missing state ${stateKey}`);
    }
    for (const refreshActionId of readStringArray(action.refreshActionIds)) {
      if (!actionIds.has(refreshActionId)) throw new Error(`shared action ${actionId} refreshes missing action ${refreshActionId}`);
    }
    if (isRecord(action.prefill)) {
      const prefill = action.prefill;
      const sourceStateKey = readString(prefill.sourceStateKey);
      if (!stateKeys.has(sourceStateKey)) throw new Error(`shared action ${actionId} prefill references missing source state ${sourceStateKey}`);
      if (Array.isArray(prefill.fields)) {
        for (const field of prefill.fields) {
          const targetStateKey = isRecord(field) ? readString(field.targetStateKey) : '';
          if (!stateKeys.has(targetStateKey)) throw new Error(`shared action ${actionId} prefill references missing target state ${targetStateKey}`);
        }
      }
    }
  }

  for (const load of initialLoads) {
    const actionId = readString(load.actionId);
    const stateKey = readString(load.stateKey);
    if (actionId && !actionIds.has(actionId)) throw new Error(`initialLoad references missing action ${actionId}`);
    if (stateKey && !stateKeys.has(stateKey)) throw new Error(`initialLoad references missing state ${stateKey}`);
  }

  for (const ref of collectLayoutStateRefs(layout)) {
    if (!stateKeys.has(ref.stateKey)) throw new Error(`${ref.path} references missing shared state ${ref.stateKey}`);
  }
  for (const ref of collectLayoutActionRefs(layout)) {
    if (!actionIds.has(ref.action)) throw new Error(`${ref.path} references missing shared action ${ref.action}`);
  }
}

function enrichLayoutWithStateRefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const cloned = JSON.parse(JSON.stringify(layout)) as CfePageLayoutDefinition;
  cloned.dataBindings = cloned.dataBindings.map(binding => {
    const commandName = binding.command || commandFromBindingSource(binding.source);
    const command = commandByName(prepared, commandName);
    return commandName && command ? {
      ...binding,
      stateKey: readString(command.kind) === 'query' ? queryDataStateKey(prepared.page.pageId, commandName) : commandOutputStateKey(prepared.page.pageId, commandName),
      inputStateKeys: commandInputStateKeys(prepared, commandName),
    } : binding;
  });

  for (const section of cloned.sections) {
    for (const organism of section.organisms) {
      for (const intent of organism.intentions) {
        const commandName = intentCommandName(intent, organism.userActions);
        const isQuery = isQueryCommand(prepared, commandName);
        if (commandName && isQuery && intentUsesQueryResult(intent)) intent.stateKey = queryDataStateKey(prepared.page.pageId, commandName);
        if (commandName) {
          for (const field of [...intent.fields, ...intent.filters]) {
            const inputField = resolveCommandFieldName(prepared, commandName, field.field, 'input');
            const outputField = resolveCommandFieldName(prepared, commandName, field.field, 'output');
            if (inputField) {
              field.field = inputField;
              field.stateKey = inputStateKey(prepared.page.pageId, commandName, inputField);
            } else if (isQuery && outputField) {
              field.field = outputField;
              field.stateKey = queryDataStateKey(prepared.page.pageId, commandName);
            }
          }
          for (const field of intent.columns) {
            const outputField = resolveCommandFieldName(prepared, commandName, field.field, 'output');
            const inputField = resolveCommandFieldName(prepared, commandName, field.field, 'input');
            if (isQuery && outputField) {
              field.field = outputField;
              field.stateKey = queryDataStateKey(prepared.page.pageId, commandName);
            } else if (inputField) {
              field.field = inputField;
              field.stateKey = inputStateKey(prepared.page.pageId, commandName, inputField);
            }
          }
        }
        for (const action of [...intent.toolbar, ...intent.rowActions, ...intent.actions]) action.actionKey = action.action;
      }
    }
  }
  return cloned;
}

function collectLayoutStateRefs(layout: CfePageLayoutDefinition): { stateKey: string; path: string }[] {
  const refs: { stateKey: string; path: string }[] = [];
  const add = (stateKey: string | undefined, path: string): void => {
    if (stateKey) refs.push({ stateKey, path });
  };

  for (const binding of layout.dataBindings) {
    add(binding.stateKey, `dataBinding:${binding.id}.stateKey`);
    for (const stateKey of binding.inputStateKeys || []) add(stateKey, `dataBinding:${binding.id}.inputStateKeys`);
  }
  for (const section of layout.sections) {
    for (const organism of section.organisms) {
      for (const intent of organism.intentions) {
        add(intent.stateKey, `${intent.id}.stateKey`);
        for (const field of [...intent.fields, ...intent.columns, ...intent.filters]) add(field.stateKey, `${field.id}.stateKey`);
      }
    }
  }
  return refs;
}

function collectLayoutActionRefs(layout: CfePageLayoutDefinition): { action: string; path: string }[] {
  const refs: { action: string; path: string }[] = [];
  const add = (action: string | undefined, path: string): void => {
    if (action) refs.push({ action, path });
  };

  for (const section of layout.sections) {
    for (const organism of section.organisms) {
      for (const action of organism.userActions) add(action, `${organism.id}.userActions`);
      for (const intent of organism.intentions) {
        add(intent.action, `${intent.id}.action`);
        add(intent.submitAction, `${intent.id}.submitAction`);
        for (const action of [...intent.toolbar, ...intent.rowActions, ...intent.actions]) add(action.action, `${action.id}.action`);
      }
    }
  }
  return refs;
}

function layoutSectionSummary(sections: CfeLayoutSection[]): Record<string, unknown>[] {
  return sections.map(section => ({
    id: section.id,
    type: section.type,
    sectionName: section.sectionName,
    titleKey: section.titleKey,
    mode: section.mode,
    order: section.order,
    organisms: section.organisms.map(organism => ({
      id: organism.id,
      type: organism.type,
      organismName: organism.organismName,
      titleKey: organism.titleKey,
      purpose: organism.purpose,
      userActions: organism.userActions,
      requiredEntities: organism.requiredEntities,
      readsFields: organism.readsFields,
      writesFields: organism.writesFields,
      rulesApplied: organism.rulesApplied,
      order: organism.order,
      intentionRefs: organism.intentions.map(intent => ({
        id: intent.id,
        intent: intent.intent,
        stateKey: intent.stateKey,
        action: intent.action,
        submitAction: intent.submitAction,
        order: intent.order,
      })),
    })),
  }));
}

function addState(states: Map<string, Record<string, unknown>>, state: Record<string, unknown>): void {
  const stateKey = readString(state.stateKey);
  if (stateKey && !states.has(stateKey)) states.set(stateKey, state);
}

function collectBusinessContextRefs(operations: CfeOperationDef[]): CfeBusinessContextRef[] {
  const refs: CfeBusinessContextRef[] = [];
  for (const operation of operations) {
    const resolutions = operationContextResolutions(operation.data);
    for (const input of l4OperationInputs(operation.data)) {
      if (input.source !== 'businessContext') continue;
      const resolution = resolutions.find(item => item.inputId === input.inputId || item.targetRef === `input.${input.inputId}` || item.targetRef === input.fieldRef);
      const originRef = resolution?.originRef || defaultBusinessContextOriginRef(input.inputId, input.fieldRef);
      refs.push({
        operationId: operation.operationId,
        inputId: input.inputId,
        contextKey: businessContextKey(originRef),
        originRef,
        targetRef: input.fieldRef,
        required: input.required,
        description: input.description,
      });
    }

    for (const resolution of resolutions) {
      if (resolution.source !== 'businessContext') continue;
      const originRef = resolution.originRef || defaultBusinessContextOriginRef(resolution.inputId || '', resolution.targetRef);
      refs.push({
        operationId: operation.operationId,
        inputId: resolution.inputId,
        contextKey: businessContextKey(originRef),
        originRef,
        targetRef: resolution.targetRef,
        required: true,
        description: resolution.description,
      });
    }
  }
  return uniqueBusinessContextRefs(refs);
}

function operationContextResolutions(data: Record<string, unknown>): { inputId?: string; targetRef: string; source: string; originRef: string; description: string }[] {
  const value = data.contextResolution;
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(item => ({
    inputId: readString(item.inputId) || undefined,
    targetRef: readString(item.targetRef),
    source: readString(item.source),
    originRef: readString(item.originRef),
    description: readString(item.description),
  })).filter(item => item.targetRef && item.source);
}

function uniqueBusinessContextRefs(refs: CfeBusinessContextRef[]): CfeBusinessContextRef[] {
  const seen = new Set<string>();
  const uniqueRefs: CfeBusinessContextRef[] = [];
  for (const ref of refs) {
    const key = `${ref.contextKey}:${ref.originRef}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueRefs.push(ref);
  }
  return uniqueRefs;
}

function businessContextKey(originRef: string): string {
  const local = originRef.split('.').filter(Boolean).pop() || originRef;
  if (local === 'activeUnitId') return 'activeUnitId';
  return 'activeCompanyId';
}

function defaultBusinessContextOriginRef(inputId: string, fieldRef: string): string {
  const text = `${inputId} ${fieldRef}`.toLowerCase();
  return text.includes('unit') || text.includes('unidade') ? 'businessContext.activeUnitId' : 'businessContext.activeCompanyId';
}

function commandFieldRecords(value: unknown): { name: string; required?: boolean; source?: string; presentation?: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => isRecord(item) ? {
    name: readString(item.name),
    required: item.required === true,
    source: readString(item.source),
    presentation: readString(item.presentation) || 'form',
  } : { name: '' }).filter(item => item.name);
}

function commandInputStateKeys(prepared: CfePreparedPage, commandName: string): string[] {
  const command = prepared.commands.find(item => readString(item.commandName) === commandName);
  return commandFieldRecords(command?.input).map(field => inputStateKey(prepared.page.pageId, commandName, field.name));
}

function commandByName(prepared: CfePreparedPage, commandName: string): Record<string, unknown> | undefined {
  return prepared.commands.find(item => readString(item.commandName) === commandName);
}

function resolveCommandFieldName(prepared: CfePreparedPage, commandName: string, fieldName: string, direction: 'input' | 'output'): string | undefined {
  const command = commandByName(prepared, commandName);
  const fields = commandFieldRecords(command?.[direction]);
  const exact = fields.find(field => field.name === fieldName);
  if (exact) return exact.name;
  const tail = fieldName.split('.').filter(Boolean).pop() || fieldName;
  return fields.find(field => field.name === tail)?.name;
}

function intentCommandName(intent: CfeLayoutIntent, userActions: string[]): string {
  return intent.submitAction || intent.action || commandFromBindingSource(intent.source) || userActions[0] || '';
}

function commandFromBindingSource(source?: string): string {
  const value = source || '';
  const bff = value.match(/^bff\.([A-Za-z0-9_-]+)$/);
  if (bff) return bff[1];
  const scoped = value.match(/^([A-Za-z0-9_-]+)\.(input|output)$/);
  return scoped ? scoped[1] : '';
}

function isQueryCommand(prepared: CfePreparedPage, commandName: string): boolean {
  const command = prepared.commands.find(item => readString(item.commandName) === commandName);
  return readString(command?.kind) === 'query';
}

function intentUsesQueryResult(intent: CfeLayoutIntent): boolean {
  return intent.source === undefined || intent.source.endsWith('.output') || intent.source.startsWith('bff.') || intent.columns.length > 0;
}

function defaultValueForField(field: { required?: boolean }): string {
  return field.required ? '' : '';
}

function inputStateKey(pageId: string, commandName: string, fieldName: string): string { return `ui.${pageId}.input.${commandName}.${fieldName}`; }
function queryDataStateKey(pageId: string, commandName: string): string { return `ui.${pageId}.data.${commandName}`; }
function commandOutputStateKey(pageId: string, commandName: string): string { return `ui.${pageId}.output.${commandName}`; }
function actionStatusStateKey(pageId: string, commandName: string): string { return `ui.${pageId}.action.${commandName}.status`; }
function actionErrorStateKey(pageId: string, commandName: string): string { return `ui.${pageId}.action.${commandName}.error`; }
function businessContextStateKey(pageId: string, contextKey: string): string { return `ui.${pageId}.businessContext.${contextKey}`; }
function inputStateName(commandName: string, fieldName: string): string { return `${commandName}${toPascalCase(fieldName)}`; }
function queryStateName(commandName: string): string { return `${commandName}Data`; }
function layoutFieldStateKey(pageId: string, field: CfeLayoutField): string { return `ui.${pageId}.layout.${toSafeShortName(field.id || field.field)}`; }
function stateNameFromKey(pageId: string, stateKey: string): string {
  const local = stateKey.replace(`ui.${pageId}.`, '');
  return toPascalCase(local) || 'layoutState';
}
function contractTsPath(project: number, page: CfePagePlan): string { return `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`; }

// Page grouping. When the L4 journey map declares workspaces, pages are derived per workspace
// (the L4 v2 model): this can split one workflow across actors and group entityManagement CRUD
// into a single page. Without a journey (or for owners not covered by any workspace), it falls
// back to the legacy workflow/operation grouping.
function buildPagePlans(workflows: Map<string, CfeWorkflowDef>, operations: Map<string, CfeOperationDef>, moduleFallback: string, journeys: CfeJourneyMap[] = []): CfePagePlan[] {
  const pendingWorkflows = Array.from(workflows.values()).filter(owner => owner.todoStatus === 'toCreate');
  const pendingOperations = Array.from(operations.values()).filter(owner => owner.todoStatus === 'toCreate');
  const workspaces = journeys.flatMap(journey => journey.workspaces);
  if (workspaces.length === 0) return buildLegacyPagePlans(pendingWorkflows, pendingOperations, moduleFallback);

  const pendingOpsById = new Map(pendingOperations.map(op => [op.operationId, op]));
  const pendingWfById = new Map(pendingWorkflows.map(wf => [wf.workflowId, wf]));
  const coveredOps = new Set<string>();
  const coveredWfs = new Set<string>();
  const pages: CfePagePlan[] = [];

  for (const ws of workspaces) {
    const wsOps = ws.operationIds.map(id => pendingOpsById.get(id)).filter((op): op is CfeOperationDef => !!op);
    const wsWf = ws.workflowId ? pendingWfById.get(ws.workflowId) : undefined;
    if (wsOps.length === 0 && !wsWf) continue; // nothing pending in this workspace
    wsOps.forEach(op => coveredOps.add(op.operationId));
    if (wsWf) coveredWfs.add(wsWf.workflowId);
    pages.push({
      pageId: toSafeShortName(ws.workspaceId),
      pageName: ws.title || humanizeId(ws.workspaceId),
      moduleName: wsWf?.moduleName || wsOps[0]?.moduleName || moduleFallback,
      sourceKind: ws.kind === 'workflow' ? 'workflow' : 'operation',
      ownerIds: unique([...(wsWf ? [`workflow:${wsWf.workflowId}`] : []), ...wsOps.map(op => `operation:${op.operationId}`)]),
      actorIds: unique([ws.actor, ...(wsWf ? wsWf.actors : []), ...wsOps.map(op => op.actor)]),
      entityIds: unique([ws.entity, ...(wsWf ? wsWf.entities : []), ...wsOps.flatMap(operationEntities)]),
      operationIds: unique(wsOps.map(op => op.operationId)),
      rulesApplied: unique([...(wsWf ? wsWf.rulesApplied : []), ...wsOps.flatMap(op => op.rulesApplied)]),
      capabilities: unique([...(wsWf ? wsWf.capabilities.map(capability => readString(capability.capabilityId)) : []), ...wsOps.map(op => readString(op.capability?.capabilityId))]),
      origin: workspaceOrigin(ws, wsWf, wsOps),
    });
  }

  // Pending owners not covered by any workspace keep the legacy grouping so nothing is dropped.
  const leftoverWorkflows = pendingWorkflows.filter(wf => !coveredWfs.has(wf.workflowId));
  const leftoverOperations = pendingOperations.filter(op => !coveredOps.has(op.operationId));
  pages.push(...buildLegacyPagePlans(leftoverWorkflows, leftoverOperations, moduleFallback));
  return pages.sort((a, b) => `${a.moduleName}:${a.pageId}`.localeCompare(`${b.moduleName}:${b.pageId}`));
}

function workspaceOrigin(ws: CfeJourneyWorkspace, workflow: CfeWorkflowDef | undefined, operations: CfeOperationDef[]): Record<string, unknown> {
  const owners: Record<string, unknown>[] = [];
  if (workflow) owners.push({ kind: 'workflow', id: workflow.workflowId, defPath: toDisplayRef(workflow.fileInfo) });
  for (const operation of operations) owners.push({ kind: 'operation', id: operation.operationId, defPath: toDisplayRef(operation.fileInfo) });
  return { source: 'l4-journey', workspaceId: ws.workspaceId, workspaceKind: ws.kind, workflowId: ws.workflowId, actor: ws.actor, entity: ws.entity, owners, microUserFlow: buildMicroUserFlow(workflow, operations) };
}

// Intent-level micro user flow recorded in the page origin (traceability) and fed to the layout
// prompt. Derived from l4 story.steps each generation; never a page11-specific persisted layout.
function buildMicroUserFlow(workflow: CfeWorkflowDef | undefined, operations: CfeOperationDef[]): Record<string, unknown> {
  return {
    source: 'l4/story.steps',
    workflowSteps: workflow ? workflow.storySteps : [],
    operations: operations.map(operation => ({ operationId: operation.operationId, commandName: operation.commandName || operation.operationId, steps: operation.storySteps })),
  };
}

function buildLegacyPagePlans(pendingWorkflows: CfeWorkflowDef[], pendingOperations: CfeOperationDef[], moduleFallback: string): CfePagePlan[] {
  const pendingOpsById = new Map(pendingOperations.map(op => [op.operationId, op]));
  const operationIdsUsedByWorkflow = new Set<string>();
  const pages: CfePagePlan[] = [];

  for (const workflow of pendingWorkflows) {
    for (const operationId of workflow.operationIds) operationIdsUsedByWorkflow.add(operationId);
    const linkedOperations = workflow.operationIds.map(id => pendingOpsById.get(id)).filter(Boolean) as CfeOperationDef[];
    pages.push({
      pageId: toSafeShortName(workflow.pageId || workflow.workflowId),
      pageName: workflow.title || humanizeId(workflow.workflowId),
      moduleName: workflow.moduleName || moduleFallback,
      sourceKind: 'workflow',
      ownerIds: unique([`workflow:${workflow.workflowId}`, ...linkedOperations.map(op => `operation:${op.operationId}`)]),
      actorIds: unique([...workflow.actors, ...linkedOperations.map(op => op.actor)]),
      entityIds: unique([...workflow.entities, ...linkedOperations.flatMap(operationEntities)]),
      operationIds: unique([...workflow.operationIds, ...linkedOperations.map(op => op.operationId)]),
      rulesApplied: unique([...workflow.rulesApplied, ...linkedOperations.flatMap(op => op.rulesApplied)]),
      capabilities: unique([...workflow.capabilities.map(c => readString(c.capabilityId)), ...linkedOperations.map(op => readString(op.capability?.capabilityId))]),
      origin: pageOrigin('workflow', workflow, linkedOperations),
    });
  }

  for (const operation of pendingOperations) {
    if (operationIdsUsedByWorkflow.has(operation.operationId)) continue;
    pages.push({
      pageId: toSafeShortName(operation.pageId || operation.operationId),
      pageName: operation.title || humanizeId(operation.operationId),
      moduleName: operation.moduleName || moduleFallback,
      sourceKind: 'operation',
      ownerIds: [`operation:${operation.operationId}`],
      actorIds: unique([operation.actor]),
      entityIds: operationEntities(operation),
      operationIds: [operation.operationId],
      rulesApplied: operation.rulesApplied,
      capabilities: unique([readString(operation.capability?.capabilityId)]),
      origin: pageOrigin('operation', operation, []),
    });
  }

  return pages.sort((a, b) => `${a.moduleName}:${a.pageId}`.localeCompare(`${b.moduleName}:${b.pageId}`));
}

function pageOrigin(sourceKind: CfePagePlan['sourceKind'], owner: CfeWorkflowDef | CfeOperationDef, linkedOperations: CfeOperationDef[]): Record<string, unknown> {
  const owners: Record<string, unknown>[] = [];
  if (sourceKind === 'workflow' && 'workflowId' in owner) {
    owners.push({ kind: 'workflow', id: owner.workflowId, defPath: toDisplayRef(owner.fileInfo) });
  }
  if (sourceKind === 'operation' && 'operationId' in owner) {
    owners.push({ kind: 'operation', id: owner.operationId, defPath: toDisplayRef(owner.fileInfo) });
  }
  for (const operation of linkedOperations) {
    owners.push({ kind: 'operation', id: operation.operationId, defPath: toDisplayRef(operation.fileInfo) });
  }
  const workflow = sourceKind === 'workflow' && 'workflowId' in owner ? owner : undefined;
  const flowOperations = sourceKind === 'operation' && 'operationId' in owner ? [owner, ...linkedOperations] : linkedOperations;
  return {
    source: 'l4',
    sourceKind,
    owners,
    microUserFlow: buildMicroUserFlow(workflow, flowOperations),
  };
}

// Option 3: canonical output structure declared by l4 (e5 `outputShape`). Reader mirrors the l4/backend
// shape; when present it is AUTHORITATIVE — both masters copy it, neither re-infers, so the FE contract
// and the backend usecase agree by construction (no order dependency, l4 stays the source of truth).
interface CfeCanonicalOutputField { name: string; type: string; required: boolean; fieldRef?: string; item?: { fields: CfeCanonicalOutputField[] }; }
interface CfeCanonicalOutputShape { kind: 'object' | 'list' | 'paginated'; fields: CfeCanonicalOutputField[]; }

function readCanonicalOutputField(value: unknown): CfeCanonicalOutputField | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name);
  const type = readString(value.type);
  if (!name || !type) return null;
  const field: CfeCanonicalOutputField = { name, type, required: value.required === true };
  const fieldRef = readString(value.fieldRef);
  if (fieldRef) field.fieldRef = fieldRef;
  if (isRecord(value.item) && Array.isArray(value.item.fields)) {
    const fields = value.item.fields.map(readCanonicalOutputField).filter((f): f is CfeCanonicalOutputField => f !== null);
    if (fields.length) field.item = { fields };
  }
  return field;
}

function readCanonicalOutputShape(operation: CfeOperationDef): CfeCanonicalOutputShape | null {
  const raw = isRecord(operation.data) ? operation.data.outputShape : undefined;
  if (!isRecord(raw)) return null;
  const kind = readString(raw.kind);
  if (kind !== 'object' && kind !== 'list' && kind !== 'paginated') return null;
  const fields = Array.isArray(raw.fields) ? raw.fields.map(readCanonicalOutputField).filter((f): f is CfeCanonicalOutputField => f !== null) : [];
  if (fields.length === 0) return null;
  return { kind, fields };
}

function commandFromOperation(operation: CfeOperationDef, entities: Map<string, CfeEntityDef>): Record<string, unknown> {
  const primaryEntity = operation.entity || firstEntity(operationEntities(operation));
  const entity = entities.get(primaryEntity);
  const kind = operation.kind === 'query' || operation.kind === 'view' ? 'query' : 'command';
  const commandName = operation.commandName || operation.operationId;
  // Prefer the l4 canonical outputShape (Option 3); fall back to the legacy l4-field-list inference.
  const canonical = readCanonicalOutputShape(operation);
  const outputShape = canonical
    ? (canonical.kind === 'list' ? 'array' : canonical.kind === 'paginated' ? 'paginated' : 'object')
    : frontendOutputShapeForOperation({ ...operation.data, kind: operation.kind });
  const output = canonical
    ? canonical.fields.map(field => ({ name: field.name, type: field.type, required: field.required }))
    : (kind === 'query' ? queryOutput(operation, entity, entities) : commandOutput(operation, entity, entities));
  return {
    commandName,
    ...(operation.bffName ? { bffName: operation.bffName } : {}),
    ...(operation.bffName ? { routeKey: operation.bffName } : {}),
    purpose: operation.title || humanizeId(operation.operationId),
    kind,
    outputShape,
    // Full structured l4 shape (top-level + one level of item fields) — the contract generator builds
    // the Output interface (incl. nested item interfaces) from this so it matches l4/backend exactly.
    ...(canonical ? { canonicalOutputShape: canonical } : {}),
    input: kind === 'query' ? queryInput(operation, entity, entities) : commandInput(operation, entity, entities),
    output,
    origin: {
      source: 'l4/operations',
      ownerId: `operation:${operation.operationId}`,
      operationId: operation.operationId,
      defPath: toDisplayRef(operation.fileInfo),
      ...(operation.bffName ? { bffName: operation.bffName } : {}),
    },
  };
}

function pageDefinition(page: CfePagePlan, operations: CfeOperationDef[]): Record<string, unknown> {
  return {
    pageId: page.pageId,
    pageName: page.pageName,
    baseClassName: `${toPascalCase(page.moduleName)}${toPascalCase(page.pageId)}Base`,
    actor: page.actorIds[0] || 'user',
    purpose: `Executar ${page.pageName}.`,
    capabilities: page.capabilities,
    flowRefs: {
      experienceFlows: page.sourceKind === 'workflow' ? page.ownerIds.filter(id => id.startsWith('workflow:')).map(id => id.slice('workflow:'.length)) : [],
      entityLifecycles: [],
      taskWorkflows: page.sourceKind === 'workflow' ? page.ownerIds.filter(id => id.startsWith('workflow:')).map(id => id.slice('workflow:'.length)) : [],
      automations: [],
    },
    pluginRefs: [],
    mdmRefs: [],
    origin: page.origin,
    pageInputs: collectBusinessContextRefs(operations),
    navigationRefs: [],
    sections: [{
      sectionName: page.pageName,
      mode: operations.some(op => op.kind !== 'query' && op.kind !== 'view') ? 'edit' : 'view',
      organisms: operations.map(op => ({
        organismName: toPascalCase(op.operationId),
        purpose: op.title || humanizeId(op.operationId),
        userActions: [op.operationId],
        requiredEntities: operationEntities(op),
        readsFields: fieldRefs(op.reads),
        writesFields: fieldRefs(op.writes),
        rulesApplied: op.rulesApplied,
      })),
    }],
  };
}

function contractPipeline(project: number, page: CfePagePlan): unknown[] {
  return [{ id: `${page.pageId}__l2_contract`, type: 'l2_contract', outputPath: `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`, defPath: `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`, dependsFiles: [], dependsOn: [], skills: ['_102020_/l2/agentChangeFrontend/skills/genCfeContractTs.ts'], agent: 'agentCfeMaterializeGen' }];
}

function sharedPipeline(prepared: CfePreparedPage): unknown[] {
  const { project, page, commands, contractCopies } = prepared;
  // F3 (v2): shared imports the per-bffCall contract copies (already on disk, deterministic) — no
  // dependsOn a contract materialize item. Legacy: the single per-page contract .ts built by the skill.
  const isV2 = contractCopies.length > 0;
  const contractFiles = isV2 ? contractCopies.map(copy => copy.tsRef) : [`_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`];
  return [{
    id: `${page.pageId}__l2_shared`,
    type: 'l2_shared',
    outputPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`,
    defPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`,
    dependsFiles: [...contractFiles, '_102029_.d.ts'],
    dependsOn: isV2 ? [] : [`${page.pageId}__l2_contract`],
    skills: ['_102020_/l2/agentChangeFrontend/skills/genCfeSharedTs.ts'],
    rulesApplied: unique(commands.flatMap(command => Array.isArray(command.rulesApplied) ? command.rulesApplied.map(String) : [])),
    agent: 'agentCfeMaterializeGen',
  }];
}

function pagePipeline(project: number, page: CfePagePlan, visualStyle: unknown, genome = 'page11'): unknown[] {
  const idSuffix = genome === 'page11' ? '' : `__${genome}`;
  return [{
    id: `${page.pageId}${idSuffix}__l2_page`,
    type: 'l2_page',
    outputPath: `_${project}_/l2/${page.moduleName}/web/desktop/${genome}/${page.pageId}.ts`,
    defPath: `_${project}_/l2/${page.moduleName}/web/desktop/${genome}/${page.pageId}.defs.ts`,
    // Context diet (flow.json materializationContextPolicy): the *.defs.ts of shared/contracts are
    // generator inputs, not render inputs — they no longer travel to the page LLM. The shared .ts is
    // sent as its compiled .d.ts (self-describing via JSDoc) and RE-EXPORTS every contract DTO type
    // (Input/Output/OutputItem), so the page imports all DTO types from shared and never needs the
    // contract in its context — the raw contract .ts was dropped here (item 4, 16/07). Field names
    // come from this page's layout defs; the contract still exists on disk and is compiled via the
    // shared dependency (page -> shared -> contract). designSystem.ts is summarized to token names by
    // the context builder. Missing files are tolerated by the materializer (readers skip null content).
    dependsFiles: [
      `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`,
      `_${project}_/l2/designSystem.ts`,
    ],
    dependsOn: [`${page.pageId}__l2_shared`],
    skills: [pageRenderSkillPath(genome)],
    visualStyle: typeof visualStyle === 'string' ? { description: visualStyle } : (isRecord(visualStyle) ? visualStyle : {}),
    agent: 'agentCfeMaterializeGen',
  }];
}

// Render skill per genome: page11 keeps the plain-operational baseline; page21 (goal-first) uses
// the richer patterns (master-detail, contextual transition buttons, card board).
function pageRenderSkillPath(genome: string): string {
  const skillName = genome === 'page11' ? 'genCfePage11RenderTs' : 'genCfePage21RenderTs';
  return `_102020_/l2/agentChangeFrontend/skills/${skillName}.ts`;
}

async function saveFrontendDefs(fileInfo: FileInfo, exportName: string, definition: unknown, pipeline: unknown[]): Promise<void> {
  const header = `/// <mls fileReference="${toDisplayRef(fileInfo)}" enhancement="_blank"/>\n\n`;
  await saveStorContent(fileInfo, `${header}export const ${exportName} = ${JSON.stringify(definition, null, 2)};\n\nexport const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;\n`);
}

async function updateL5FrontendSignature(project: number, pages: CfePagePlan[] = []): Promise<void> {
  const fileInfo: FileInfo = { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
  const existing = await readJsonFile(fileInfo);
  const cfg = isRecord(existing) ? existing : {};
  const masters = isRecord(cfg.masters) ? cfg.masters : (cfg.masters = {});
  masters.frontend = { masterProject: 102020, agentFolder: 'agentChangeFrontend', runtimeProject: 102033 };
  cfg.layouts = buildLayoutsConfig(project, pages, isRecord(cfg.layouts) ? cfg.layouts : {});
  await saveStorContent(fileInfo, `${JSON.stringify(cfg, null, 2)}\n`);
}

async function saveFrontendWorkspaceConfig(context: CfeCreateContext, pages: CfePagePlan[]): Promise<string> {
  const project = context.project;
  if (!project) return 'l5/config.json skipped: project unavailable';
  const l5 = await readProjectJson(project);
  const frontendSignature = isRecord(l5.masters) && isRecord(l5.masters.frontend) ? l5.masters.frontend : {};
  const runtimeId = readId(frontendSignature.runtimeProject) || '102033';
  const config = await readWorkspaceConfig(project);
  const customize = isRecord(l5.customize) ? l5.customize : {};

  config.defaultProjectId = readId(config.defaultProjectId) || String(project);
  config.shellTemplates = isRecord(customize.shellTemplates)
    ? customize.shellTemplates
    : (isRecord(config.shellTemplates) ? config.shellTemplates : { spa: `./_${runtimeId}_/l2/shared/spa/index.html`, pwa: `./_${runtimeId}_/l2/shared/pwa/index.html` });
  config.publication = isRecord(customize.publication)
    ? customize.publication
    : (isRecord(config.publication) ? config.publication : { defaultTarget: 'web', targets: { web: { assetBaseUrl: '', serveStaticFromServer: true, minify: false, sourcemap: true } } });
  config.clientShell = isRecord(customize.clientShell)
    ? customize.clientShell
    : (isRecord(config.clientShell) ? config.clientShell : {
      mode: 'spa',
      activeProfile: 'production',
      regions: {
        aside: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: {
              renderer: { entrypoint: `/_${runtimeId}_/l2/shared/layout/aura-aside.js`, source: `../mls-${runtimeId}/l2/shared/layout/aura-aside.ts`, tag: 'collab-aura-aside' },
              widthPx: 280,
            },
          },
        },
      },
    });

  const projects = ensureRecordProperty(config, 'projects');
  const client = ensureProjectConfig(projects, String(project), { root: '.', type: 'client', runtime: projectRuntimeMetadata(l5, String(project)) });
  projects[runtimeId] = { root: `../mls-${runtimeId}`, type: 'master frontend' };
  projects['102027'] = isRecord(projects['102027']) ? projects['102027'] : { root: '../mls-102027', type: 'lib' };
  projects['102029'] = isRecord(projects['102029']) ? projects['102029'] : { root: '../mls-102029', type: 'lib' };
  projects['102036'] = isRecord(projects['102036']) ? projects['102036'] : { root: '../mls-102036', type: 'lib' };
  addWorkspaceDependencies(projects, l5, String(project));

  const labels = isRecord(customize.navigationLabels) ? customize.navigationLabels : {};
  const clientModules = Array.isArray(client.modules) ? client.modules.filter(isRecord) : [];
  client.modules = clientModules;
  const pagesByModule = new Map<string, CfePagePlan[]>();
  for (const page of pages) {
    if (!pagesByModule.has(page.moduleName)) pagesByModule.set(page.moduleName, []);
    pagesByModule.get(page.moduleName)!.push(page);
  }

  for (const [moduleName, modulePages] of pagesByModule) {
    let mod = clientModules.find(item => readString(item.moduleId) === moduleName);
    if (!mod) { mod = { moduleId: moduleName, basePath: `/${moduleName}`, shellMode: 'spa' }; clientModules.push(mod); }
    mod.basePath = readString(mod.basePath) || `/${moduleName}`;
    mod.shellMode = readString(mod.shellMode) || 'spa';
    mod.navigation = mergeByKey(asRecords(mod.navigation), modulePages.map(page => ({
      id: page.pageId,
      label: readString(labels[page.pageId]) || page.pageName,
      href: `/${moduleName}/${page.pageId}`,
      description: readString(labels[page.pageId]) || page.pageName,
    })), 'id');
    const existingFrontend = isRecord(mod.frontend) ? mod.frontend : {};
    const pageTests = frontendPageTestPaths(project, modulePages);
    mod.frontend = {
      ...existingFrontend,
      layer: 'l2',
      pages: mergeByKey(asRecords(existingFrontend.pages), modulePages.flatMap(page => frontendConfigPages(project, context, page, labels)), 'pageId'),
      ...(pageTests.length > 0 ? { pageTests } : {}),
    };
  }

  await saveWorkspaceConfig(project, config);
  const pageCount = pages.reduce((sum, page) => sum + frontendConfigPages(project, context, page, labels).length, 0);
  return `l5/config.json frontend merged (${pageCount} page route(s), ${pagesByModule.size} module(s))`;
}

// Item 2a: project-relative resolver paths (compiled .js, _<id>_/... form used by
// resolveProjectModuleImportUrl) of the generated page11 test files that exist on disk.
function frontendPageTestPaths(project: number, pages: CfePagePlan[]): string[] {
  return pages
    .filter(page => hasPageTestsFile(project, page))
    .map(page => `_${project}_/l2/${page.moduleName}/web/desktop/${PAGE_TESTS_VARIANT}/${page.pageId}.test.js`);
}

function hasPageTestsFile(project: number, page: CfePagePlan): boolean {
  const fileInfo: FileInfo = { project, level: 2, folder: `${page.moduleName}/web/desktop/${PAGE_TESTS_VARIANT}`, shortName: page.pageId, extension: '.test.ts' };
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

function frontendConfigPages(project: number, context: CfeCreateContext, page: CfePagePlan, labels: Record<string, unknown>): Record<string, unknown>[] {
  const operations = page.operationIds.map(id => context.operations.get(id)).filter((item): item is CfeOperationDef => !!item);
  const title = readString(labels[page.pageId]) || page.pageName;
  const primaryRoute = pageRoutePattern(page, operations);
  const baseRoute = `/${page.moduleName}/${page.pageId}`;
  const routeParams = primaryRoute.startsWith(baseRoute) ? primaryRoute.slice(baseRoute.length) : '';
  const records: Record<string, unknown>[] = [{
    pageId: page.pageId,
    route: primaryRoute,
    source: `l2/${page.moduleName}/web/desktop/page11/${page.pageId}.ts`,
    definition: `l2/${page.moduleName}/web/desktop/page11/${page.pageId}.defs.ts`,
    componentTag: frontendComponentTag(project, page, 'page11'),
    title,
  }];
  for (let index = 1; index < MAX_UX_VARIANTS; index++) {
    const genome = pageGenome(index);
    const tsFile = mls.stor.files[mls.stor.getKeyToFile(pageTsFileInfo(project, page, genome))];
    const defsFile = mls.stor.files[mls.stor.getKeyToFile(pageFileInfo(project, page, genome))];
    if (!tsFile || tsFile.status === 'deleted' || !defsFile || defsFile.status === 'deleted') continue;
    const variantId = genome;
    records.push({
      pageId: `${page.pageId}-${variantId}`,
      route: `/${page.moduleName}/${page.pageId}-${variantId}${routeParams}`,
      source: `l2/${page.moduleName}/web/desktop/${genome}/${page.pageId}.ts`,
      definition: `l2/${page.moduleName}/web/desktop/${genome}/${page.pageId}.defs.ts`,
      componentTag: frontendComponentTag(project, page, genome),
      title: `${title} - ${variantId.toUpperCase()}`,
    });
  }
  return records;
}

function mergeByKey(existing: Record<string, unknown>[], next: Record<string, unknown>[], key: string): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const item of existing) {
    const id = readString(item[key]);
    if (id) map.set(id, item);
  }
  for (const item of next) {
    const id = readString(item[key]);
    if (id) map.set(id, item);
  }
  return [...map.values()];
}

function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function ensureRecordProperty(target: Record<string, unknown>, key: string): Record<string, unknown> {
  if (!isRecord(target[key])) target[key] = {};
  return target[key] as Record<string, unknown>;
}

function ensureProjectConfig(projects: Record<string, unknown>, id: string, patch: Record<string, unknown>): Record<string, unknown> {
  const existing = isRecord(projects[id]) ? projects[id] as Record<string, unknown> : {};
  projects[id] = { ...existing, ...patch };
  return projects[id] as Record<string, unknown>;
}

function addWorkspaceDependencies(projects: Record<string, unknown>, l5: Record<string, unknown>, clientId: string): void {
  const deps = Array.isArray(l5.dependencies) ? l5.dependencies.filter(isRecord) : [];
  for (const dep of deps) {
    const id = readId(dep.projectId);
    if (!/^\d+$/.test(id) || id === clientId) continue;
    if (!isRecord(projects[id])) projects[id] = { root: `../mls-${id}`, type: 'lib' };
  }
}

function projectRuntimeMetadata(l5: Record<string, unknown>, clientId: string): Record<string, unknown> {
  return {
    projectId: readId(l5.projectId) || clientId,
    domain: l5.domain,
    port: l5.port,
    databaseName: l5.databaseName,
    environment: l5.environment,
    studioEnabled: l5.studioEnabled,
  };
}

function readId(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return readString(value);
}

async function readProjectJson(project: number): Promise<Record<string, unknown>> {
  const json = await readJsonFile({ project, level: 5, folder: '', shortName: 'project', extension: '.json' });
  if (!isRecord(json)) throw new Error('l5/project.json not found or invalid; cannot compose l5/config.json');
  return json;
}

async function readWorkspaceConfig(project: number): Promise<Record<string, unknown>> {
  const json = await readJsonFile({ project, level: 5, folder: '', shortName: 'config', extension: '.json' });
  return isRecord(json) ? json : {};
}

async function saveWorkspaceConfig(project: number, config: Record<string, unknown>): Promise<void> {
  await saveStorContent({ project, level: 5, folder: '', shortName: 'config', extension: '.json' }, `${JSON.stringify(config, null, 2)}\n`);
}

// Record which UX variants exist, so collab.codes / the runtime can show and cycle them. Project-level
// and MERGE-only: keep every existing layout entry (never shrink) and add newly generated indices that
// are missing. A layout index N is "generated" when any page has a materialized web/desktop/page{N}1 .ts.
// Existing names/props are preserved; index 1 defaults to "Default", others to "Ux N".
function buildLayoutsConfig(project: number, pages: CfePagePlan[], previous: Record<string, unknown>): Record<string, unknown> {
  const layouts: Record<string, unknown> = {};
  const layoutName = (index: number, prev: Record<string, unknown>): string => readString(prev.name) || (index === 1 ? 'Default' : `Ux ${index}`);

  // Keep everything already declared at project level.
  for (const key of Object.keys(previous)) {
    const prev = isRecord(previous[key]) ? previous[key] : {};
    layouts[key] = { ...prev, name: layoutName(Number(key), prev) };
  }

  // Add newly generated indices that are not present yet.
  const generated = new Set<number>();
  for (const page of pages) {
    for (let variantIndex = 0; variantIndex < MAX_UX_VARIANTS; variantIndex++) {
      const file = mls.stor.files[mls.stor.getKeyToFile(pageTsFileInfo(project, page, pageGenome(variantIndex)))];
      if (file && file.status !== 'deleted') generated.add(variantIndex + 1);
    }
  }
  if (generated.size === 0 && Object.keys(layouts).length === 0) generated.add(1);
  for (const index of generated) {
    const key = String(index);
    if (!layouts[key]) layouts[key] = { name: layoutName(index, {}) };
  }

  // Stable numeric-ascending order.
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(layouts).sort((left, right) => Number(left) - Number(right))) ordered[key] = layouts[key];
  return ordered;
}

// Update generation status only in l5/{module}/todoFrontend.defs.ts. The l4 owner defs are
// read-only for this agent (mirrors agentChangeBackend/todoBackend).
async function updateOwnerStatuses(context: CfeCreateContext, ownerIds: string[], status: OwnerStatus): Promise<string[]> {
  return setTodoFrontendStatuses(context.project, new Set(ownerIds), status);
}

interface CfeTodoOwner { ownerType: string; ownerId: string; status: string; moduleName: string; }
interface CfeTodoState { files: number; moduleNames: string[]; ownersByKey: Map<string, CfeTodoOwner>; warnings: string[]; errors: string[]; }

function isOwnerStatus(status: string): boolean {
  return status === 'toCreate' || status === 'toUpdate' || status === 'toRemove' || status === 'inProgress' || status === 'done';
}

// validModules = the modules present in l4 this run. A todoFrontend for a module with NO l4 (an orphan
// left behind by a module rename/removal, e.g. l5/petShop after petShop -> petShopReservaRetirada) is
// skipped, not fatal — otherwise its stale owners would read as "absent from l4" and block every rebuild.
// Empty validModules disables the filter (preserves behavior when the l4 scan found no module).
async function readFrontendTodoState(project: number, validModules: Set<string>): Promise<CfeTodoState> {
  const ownersByKey = new Map<string, CfeTodoOwner>();
  const moduleNames = new Set<string>();
  const warnings: string[] = [];
  const errors: string[] = [];
  let files = 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoFrontend') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) { errors.push(`invalid todoFrontend defs at l5/${String(file.folder || '')}/todoFrontend.defs.ts`); continue; }
    const data = parsed.data;
    const moduleName = readString(data.moduleName) || String(file.folder || '');
    if (validModules.size > 0 && moduleName && !validModules.has(moduleName)) {
      warnings.push(`ignored orphan todoFrontend for module '${moduleName}' (no l4 present); stale l5 leftover from a module rename/removal`);
      continue;
    }
    files++;
    const layer = readString(data.layer);
    if (layer && layer !== 'frontend') warnings.push(`todoFrontend ${String(file.folder || '')} has layer=${layer}; treating as frontend by filename`);
    if (moduleName) moduleNames.add(moduleName);
    const owners = Array.isArray(data.owners) ? data.owners.filter(isRecord) : [];
    for (const raw of owners) {
      const ownerType = readString(raw.ownerType);
      const ownerId = readString(raw.ownerId);
      const status = readString(raw.status);
      if ((ownerType !== 'operation' && ownerType !== 'workflow') || !ownerId) { errors.push(`todoFrontend ${moduleName || String(file.folder || '')} has invalid owner entry`); continue; }
      if (!isOwnerStatus(status)) { errors.push(`todoFrontend ${moduleName || String(file.folder || '')}/${ownerType}:${ownerId} has invalid status "${status}"`); continue; }
      const key = `${ownerType}:${ownerId}`;
      if (ownersByKey.has(key)) warnings.push(`duplicate todoFrontend owner ${key}; first entry kept`);
      else ownersByKey.set(key, { ownerType, ownerId, status, moduleName });
    }
  }
  return { files, moduleNames: Array.from(moduleNames).sort(), ownersByKey, warnings, errors };
}

async function setTodoFrontendStatuses(project: number, wanted: Set<string>, status: OwnerStatus): Promise<string[]> {
  const updated: string[] = [];
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoFrontend') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) continue;
    const owners = Array.isArray(parsed.data.owners) ? parsed.data.owners.filter(isRecord) : [];
    let changed = false;
    for (const owner of owners) {
      const key = `${readString(owner.ownerType)}:${readString(owner.ownerId)}`;
      if (!wanted.has(key)) continue;
      owner.status = status;
      updated.push(key);
      changed = true;
    }
    if (changed) {
      parsed.data.updatedAt = new Date().toISOString();
      const fileInfo: FileInfo = { project: file.project, level: 5, folder: String(file.folder || ''), shortName: 'todoFrontend', extension: '.defs.ts' };
      await saveConstDefault(fileInfo, parsed.exportName, parsed.data);
    }
  }
  return updated;
}

async function saveCreateReport(project: number, pages: CfePagePlan[], ownersDone: string[], skippedPages: string[]): Promise<void> {
  for (const moduleName of unique(pages.map(page => page.moduleName))) {
    const fileInfo: FileInfo = { project, level: 2, folder: `${moduleName}/trace`, shortName: 'frontend-create-report', extension: '.json' };
    await saveStorContent(fileInfo, `${JSON.stringify({ savedAt: new Date().toISOString(), pagesDone: pages.filter(p => p.moduleName === moduleName).map(p => p.pageId), ownersDone, skippedPages }, null, 2)}\n`);
  }
}

async function savePageCreateMarker(prepared: CfePreparedPage, status: 'inProgress' | 'done'): Promise<void> {
  const fileInfo = pageCreateMarkerFileInfo(prepared.project, prepared.page);
  await saveStorContent(fileInfo, `${JSON.stringify({
    savedAt: new Date().toISOString(),
    status,
    pageId: prepared.page.pageId,
    moduleName: prepared.page.moduleName,
    agent: 'agentChangeFrontend',
  }, null, 2)}\n`);
}

async function savePageRegisterMarker(project: number, page: CfePagePlan, status: 'done'): Promise<void> {
  const fileInfo = pageRegisterMarkerFileInfo(project, page);
  await saveStorContent(fileInfo, `${JSON.stringify({
    savedAt: new Date().toISOString(),
    status,
    pageId: page.pageId,
    moduleName: page.moduleName,
    agent: 'agentCfeRegisterFrontend',
  }, null, 2)}\n`);
}

async function hasGeneratedDefs(project: number, page: CfePagePlan): Promise<boolean> {
  const defsExist = [sharedFileInfo(project, page), pageFileInfo(project, page)].every(fileInfo => {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    return !!file && file.status !== 'deleted';
  });
  // Contract exists either as the legacy per-page .defs.ts (v1), the generated per-workspace
  // `<pageId>.ts` (F3 v2), or the earlier per-bffCall `<pageId>.<bffId>.ts` files (back-compat).
  if (!defsExist || !hasPageContractArtifact(project, page)) return false;
  const marker = await readJsonFile(pageCreateMarkerFileInfo(project, page));
  return isRecord(marker) && marker.status === 'done';
}

function hasPageContractArtifact(project: number, page: CfePagePlan): boolean {
  const legacy = mls.stor.files[mls.stor.getKeyToFile(contractFileInfo(project, page))];
  if (legacy && legacy.status !== 'deleted') return true;
  const contractsFolder = `${page.moduleName}/web/contracts`;
  return (Object.values(mls.stor.files) as any[]).some(file => {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') return false;
    if (String(file.folder || '') !== contractsFolder || file.extension !== '.ts') return false;
    const shortName = String(file.shortName || '');
    return shortName === page.pageId || shortName.startsWith(`${page.pageId}.`);
  });
}

function hasMaterializedPageTs(project: number, page: CfePagePlan): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(pageTsFileInfo(project, page))];
  return !!file && file.status !== 'deleted';
}

async function hasRegisteredFrontend(project: number, page: CfePagePlan): Promise<boolean> {
  const marker = await readJsonFile(pageRegisterMarkerFileInfo(project, page));
  return isRecord(marker) && marker.status === 'done';
}

// Item 4: write a preview .html for every genome variant that has a materialized .ts (page11 always,
// page21/page31 when present). Each variant's html references its own component tag (folder-derived).
async function savePageHtml(project: number, page: CfePagePlan): Promise<void> {
  for (let index = 0; index < MAX_UX_VARIANTS; index++) {
    const genome = pageGenome(index);
    const tsFile = mls.stor.files[mls.stor.getKeyToFile(pageTsFileInfo(project, page, genome))];
    if (!tsFile || tsFile.status === 'deleted') continue;
    const tag = frontendComponentTag(project, page, genome);
    await saveStorContent(pageHtmlFileInfo(project, page, genome), `<${tag}></${tag}>`);
  }
}

function frontendComponentTag(project: number, page: CfePagePlan, genome = 'page11'): string {
  return convertFileToTag({ project, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId });
}

// page[ux][ui] genome. UX variants vary the UX digit and keep UI=1. Fixed at two genomes
// (flow.json genomePolicy): page11 (baseline) and page21 (goal-first). page31+ is deprecated.
const MAX_UX_VARIANTS = 2;
function pageGenome(variantIndex: number): string { return `page${variantIndex + 1}1`; }

function selectedTemplateId(prepared: CfePreparedPage, genome: string): string | undefined {
  return prepared.variantPlan.find(item => item.genome === genome)?.templateId;
}

function contractFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/contracts`, shortName: page.pageId, extension: '.defs.ts' }; }
function sharedFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/shared`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageFileInfo(project: number, page: CfePagePlan, genome = 'page11'): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageTsFileInfo(project: number, page: CfePagePlan, genome = 'page11'): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId, extension: '.ts' }; }
function pageHtmlFileInfo(project: number, page: CfePagePlan, genome = 'page11'): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId, extension: '.html' }; }
function pageCreateMarkerFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/trace/frontend-create-pages`, shortName: page.pageId, extension: '.json' }; }
function pageRegisterMarkerFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/trace/frontend-register-pages`, shortName: page.pageId, extension: '.json' }; }

function operationFromData(data: Record<string, unknown>, fileInfo: FileInfo, exportName: string, folderModule = ''): CfeOperationDef | null {
  const operationId = readString(data.operationId);
  if (!operationId) return null;
  return { operationId, commandName: readString(data.commandName) || operationId, pageId: readString(data.pageId), bffName: readString(data.bffName), title: readString(data.title) || humanizeId(operationId), actor: readString(data.actor), entity: normalizeEntityRef(readString(data.entity)), kind: readString(data.kind), reads: readStringArray(data.reads), writes: readStringArray(data.writes), rulesApplied: readStringArray(data.rulesApplied), storySteps: readStorySteps(data), todoStatus: '', inlineStatusFrontend: readString(data.statusFrontend), capability: isRecord(data.capability) ? data.capability : undefined, moduleName: '', folderModule, fileInfo, exportName, data };
}

function syntheticOperation(page: CfePagePlan, operationId: string, project: number): CfeOperationDef {
  const entity = page.entityIds[0] || '';
  const kind = inferOperationKind(operationId);
  return {
    operationId,
    commandName: operationId,
    pageId: page.pageId,
    bffName: '',
    title: humanizeId(operationId),
    actor: page.actorIds[0] || 'user',
    entity,
    kind,
    reads: entity ? [entity] : [],
    writes: kind === 'query' || kind === 'view' ? [] : (entity ? [entity] : []),
    rulesApplied: page.rulesApplied,
    storySteps: [],
    todoStatus: 'synthetic',
    inlineStatusFrontend: '',
    capability: page.capabilities[0] ? { capabilityId: page.capabilities[0] } : undefined,
    moduleName: page.moduleName,
    folderModule: page.moduleName,
    fileInfo: { project, level: 4, folder: `${page.moduleName}/operations`, shortName: operationId, extension: '.defs.ts' },
    exportName: `synthetic${toPascalCase(operationId)}`,
    data: {},
  };
}

function inferOperationKind(operationId: string): string {
  const id = operationId.toLowerCase();
  if (/^(list|view|get|show|browse|search|generate|report|ai)/.test(id) || id.includes('dashboard') || id.includes('summary') || id.includes('report')) return 'query';
  if (/^(create|add|record|open|register|start)/.test(id)) return 'create';
  if (/^(delete|remove|cancel|archive|void)/.test(id)) return 'delete';
  return 'update';
}

function workflowFromData(data: Record<string, unknown>, fileInfo: FileInfo, exportName: string, folderModule = ''): CfeWorkflowDef | null {
  const workflowId = readString(data.workflowId);
  if (!workflowId) return null;
  return { workflowId, pageId: readString(data.pageId) || workflowId, title: readString(data.title) || humanizeId(workflowId), actors: readStringArray(data.actors), operationIds: readStringArray(data.operationIds), entities: normalizeEntityRefs(readStringArray(data.entities)), rulesApplied: readStringArray(data.rulesApplied), storySteps: readStorySteps(data), todoStatus: '', inlineStatusFrontend: readString(data.statusFrontend), capabilities: Array.isArray(data.capabilities) ? data.capabilities.filter(isRecord) : [], moduleName: '', folderModule, fileInfo, exportName, data };
}

// A workspace, from either a standalone l4 v2 defs (raw = the whole file's default export) or a legacy
// journeys-nested entry. bffCalls[]/sections[] are parsed when present (v2), [] otherwise.
function workspaceFromData(raw: Record<string, unknown>): CfeJourneyWorkspace | null {
  const workspaceId = readString(raw.workspaceId);
  if (!workspaceId) return null;
  const actors = readStringArray(raw.actors);
  const actor = readString(raw.actor) || actors[0] || '';
  const bffCalls = parseWorkspaceBffCalls(raw);
  return {
    workspaceId,
    title: readString(raw.title),
    actor,
    actors: unique([...(actor ? [actor] : []), ...actors]),
    kind: readString(raw.kind),
    entity: normalizeEntityRef(readString(raw.entity)),
    workflowId: readString(raw.workflowId) || undefined,
    // v2 derives coverage from bffCalls[].uses; legacy carries operationIds directly.
    operationIds: unique([...readStringArray(raw.operationIds), ...bffCalls.flatMap(call => call.uses)]),
    purpose: readString(raw.purpose),
    bffCalls,
    sections: parseWorkspaceSections(raw),
  };
}

function journeyFromData(data: Record<string, unknown>, folderModule: string): CfeJourneyMap | null {
  const moduleName = readString(data.moduleName) || folderModule;
  if (!moduleName) return null;
  const workspaces = (Array.isArray(data.workspaces) ? data.workspaces.filter(isRecord) : [])
    .map(workspaceFromData)
    .filter((ws): ws is CfeJourneyWorkspace => ws !== null);
  return { moduleName, workspaces, navigationEdges: readRecordArray(data.navigationEdges), landings: landingsFromData(data) };
}

function landingsFromData(data: Record<string, unknown>): CfeLanding[] {
  return (Array.isArray(data.landings) ? data.landings.filter(isRecord) : [])
    .map(raw => ({ actorId: readString(raw.actorId), workspaceId: readString(raw.workspaceId), reason: readString(raw.reason) }))
    .filter(landing => landing.actorId && landing.workspaceId);
}

function actorsFromData(data: Record<string, unknown>): CfeActorDef[] {
  return (Array.isArray(data.actors) ? data.actors.filter(isRecord) : [])
    .map(raw => ({ actorId: readString(raw.actorId), title: readString(raw.title) || humanizeId(readString(raw.actorId)), description: readString(raw.description), roleScope: readString(raw.roleScope) }))
    .filter(actor => actor.actorId);
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function entityFromData(data: Record<string, unknown>, fallbackId: string): CfeEntityDef | null {
  const entityId = readString(data.entityId) || fallbackId;
  if (!entityId) return null;
  const fields = Array.isArray(data.fields) ? data.fields.filter(isRecord).map(field => ({ fieldId: readString(field.fieldId), type: readString(field.type), required: field.required === true, description: readString(field.description), enum: readStringArray(field.enum) })).filter(field => field.fieldId) : [];
  return { entityId, title: readString(data.title) || humanizeId(entityId), fields, rulesApplied: readStringArray(data.rulesApplied), statusEnum: readStringArray(data.statusEnum), lifecycleStates: readStringArray(data.lifecycleStates) };
}

function queryInput(operation: CfeOperationDef, entity: CfeEntityDef | undefined, entities: Map<string, CfeEntityDef>): unknown[] {
  const l4Input = operationInputFields(operation, entities);
  if (l4Input) return l4Input;
  if (!entity) return [];
  const explicit = explicitEntityFieldNames(operation.reads, entity.entityId);
  const fields = entity.fields.filter(field => explicit.size > 0 ? explicit.has(field.fieldId) && isLikelyQueryFilterField(field.fieldId) : isLikelyQueryFilterField(field.fieldId));
  return fields.slice(0, 6).map(field => contractFieldFromEntityField(entity, field, { required: false }));
}
function queryOutput(operation: CfeOperationDef, entity: CfeEntityDef | undefined, entities: Map<string, CfeEntityDef>): unknown[] {
  const l4Output = operationOutputFields(operation, entity, entities);
  if (l4Output) return l4Output;
  if (!entity) return [];
  const explicit = explicitEntityFieldNames(operation.reads, entity.entityId);
  const fields = explicit.size > 0 ? entity.fields.filter(field => explicit.has(field.fieldId)) : entity.fields.slice(0, 8);
  return fields.slice(0, 12).map(field => contractFieldFromEntityField(entity, field, { includeRequired: false }));
}
function commandInput(operation: CfeOperationDef, entity: CfeEntityDef | undefined, entities: Map<string, CfeEntityDef>): unknown[] {
  const l4Input = operationInputFields(operation, entities);
  if (l4Input) return l4Input;
  if (!entity) return [];
  const explicitFields = explicitEntityFieldNames(operation.writes, entity.entityId);
  const hasExplicit = explicitFields.size > 0;
  const isCreate = operation.kind === 'create';
  return entity.fields.filter(field => !isSystemField(field.fieldId)).filter(field => !hasExplicit || explicitFields.has(field.fieldId)).filter(field => !isCreate || !isLikelyIdField(field.fieldId)).slice(0, 10).map(field => contractFieldFromEntityField(entity, field, { required: field.required === true && !isLikelyIdField(field.fieldId) }));
}
function commandOutput(operation: CfeOperationDef, entity: CfeEntityDef | undefined, entities: Map<string, CfeEntityDef>): unknown[] {
  const l4Output = operationOutputFields(operation, entity, entities);
  if (l4Output) return l4Output;
  if (!entity) return [];
  const idField = entity.fields.find(field => isLikelyIdField(field.fieldId)) || entity.fields[0];
  return idField ? [contractFieldFromEntityField(entity, idField, { includeRequired: false })] : [];
}

function operationInputFields(operation: CfeOperationDef, entities: Map<string, CfeEntityDef>): Record<string, unknown>[] | null {
  if (!hasL4OperationInputs(operation.data)) return null;
  return l4OperationInputs(operation.data)
    .filter(isUserFacingOperationInput)
    .map(input => contractFieldFromOperationInput(operation, input, entities));
}

function operationOutputFields(operation: CfeOperationDef, entity: CfeEntityDef | undefined, entities: Map<string, CfeEntityDef>): Record<string, unknown>[] | null {
  if (!hasL4OperationOutputRefs(operation.data)) return null;
  return uniqueContractFields(l4OperationOutputRefs(operation.data).flatMap(ref => contractFieldsFromOutputRef(operation, entity, entities, ref)));
}

function contractFieldFromOperationInput(operation: CfeOperationDef, input: CfeL4OperationInput, entities: Map<string, CfeEntityDef>): Record<string, unknown> {
  const resolved = resolveFieldRef(input.fieldRef, operation.entity, entities);
  const out: Record<string, unknown> = resolved.entity && resolved.field
    ? contractFieldFromEntityField(resolved.entity, resolved.field, { required: input.required })
    : { name: input.inputId, type: frontendTypeForUnresolvedRef(input.fieldRef, entities), required: input.required };
  out.name = input.inputId;
  out.required = input.required;
  out.source = input.source;
  out.presentation = frontendInputPresentation(input) || 'context';
  if (input.description) out.description = input.description;
  if (isMultiSelectionKeyInput(operation, input)) out.type = `${typeof out.type === 'string' && out.type ? out.type : 'string'}[]`;
  return out;
}

// accessPattern.selection 'multiple' + input bound to the accessPattern keyField = a LIST of that
// field (petShop setProductHighlights: productIds is Product.productId under multiple selection —
// a scalar here drifts from the backend usecase, which receives an array; l4 judge trace 027).
function isMultiSelectionKeyInput(operation: CfeOperationDef, input: CfeL4OperationInput): boolean {
  const data = isRecord(operation.data) ? operation.data : {};
  const accessPattern = isRecord(data.accessPattern) ? data.accessPattern : {};
  return readString(accessPattern.selection) === 'multiple' && readString(accessPattern.keyField) === input.fieldRef;
}

function pageRoutePattern(page: CfePagePlan, operations: CfeOperationDef[]): string {
  const routeParams = unique(operations.flatMap(operation => l4OperationInputs(operation.data)
    .filter(input => frontendInputPresentation(input) === 'route')
    .map(input => input.inputId)));
  const base = `/${page.moduleName}/${page.pageId}`;
  return routeParams.reduce((route, inputId) => `${route}/:${inputId}?`, base);
}

function contractFieldsFromOutputRef(operation: CfeOperationDef, fallbackEntity: CfeEntityDef | undefined, entities: Map<string, CfeEntityDef>, ref: string): Record<string, unknown>[] {
  const entityRef = normalizeEntityRef(ref);
  const entityFromWholeRef = entities.get(entityRef);
  if (!ref.includes('.') && entityFromWholeRef) {
    return entityFromWholeRef.fields.slice(0, 12).map(field => contractFieldFromEntityField(entityFromWholeRef, field, { includeRequired: false }));
  }

  const resolved = resolveFieldRef(ref, fallbackEntity?.entityId || operation.entity, entities);
  if (resolved.entity && resolved.field) return [contractFieldFromEntityField(resolved.entity, resolved.field, { includeRequired: false })];
  const name = ref.includes('.') ? ref.split('.').pop() || ref : ref;
  return name ? [{ name, type: 'string', required: false }] : [];
}

function resolveFieldRef(ref: string, fallbackEntityId: string, entities: Map<string, CfeEntityDef>): { entity?: CfeEntityDef; field?: CfeFieldDef } {
  const [rawEntity, rawField] = ref.includes('.') ? ref.split('.') : [fallbackEntityId, ref];
  const entity = entities.get(normalizeEntityRef(rawEntity || fallbackEntityId));
  if (!entity) return {};
  const field = entity.fields.find(candidate => candidate.fieldId === rawField);
  return { entity, field };
}

function frontendTypeForUnresolvedRef(ref: string, entities: Map<string, CfeEntityDef>): string {
  return entities.has(normalizeEntityRef(ref)) ? 'json' : 'string';
}

function uniqueContractFields(fields: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const uniqueFields: Record<string, unknown>[] = [];
  for (const field of fields) {
    const name = readString(field.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    uniqueFields.push(field);
  }
  return uniqueFields;
}

function contractFieldFromEntityField(entity: CfeEntityDef, field: CfeFieldDef, options: { required?: boolean; includeRequired?: boolean } = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: field.fieldId,
    type: toFrontendType(field.type),
  };
  if (options.includeRequired !== false) out.required = options.required ?? (field.required === true);
  const enumValues = field.enum?.length ? field.enum : (field.fieldId === 'status' ? entity.statusEnum : []);
  if (enumValues.length > 0) out.enum = enumValues;
  if (field.description) out.description = field.description;
  return out;
}

function explicitEntityFieldNames(values: string[], entityId: string): Set<string> {
  return new Set(fieldRefs(values).filter(ref => ref.startsWith(`${entityId}.`)).map(ref => ref.split('.')[1]).filter(Boolean));
}

function isLikelyQueryFilterField(fieldId: string): boolean {
  const id = fieldId.toLowerCase();
  return ['status', 'name', 'title', 'type', 'category'].some(token => id.includes(token)) || id.endsWith('id') || id.endsWith('at') || id.includes('date');
}

function operationEntities(operation: CfeOperationDef): string[] { return unique([operation.entity, ...normalizeEntityRefs(operation.reads), ...normalizeEntityRefs(operation.writes)]); }
function firstEntity(values: string[]): string { return values.find(Boolean) || ''; }
function fieldRefs(values: string[]): string[] { return values.filter(value => value.includes('.')).map(value => { const [entity, field] = value.split('.'); return `${normalizeEntityRef(entity)}.${field}`; }); }
function inferModule(entityIds: string[], entityToModule: Map<string, string>, fallbackModule: string): string { return entityIds.map(id => entityToModule.get(id)).find(Boolean) || fallbackModule; }
function normalizeEntityRefs(values: string[]): string[] { return unique(values.map(normalizeEntityRef).filter(Boolean)); }
function normalizeEntityRef(value: string): string { return value.split('.')[0].trim(); }

async function readJsonFile(fileInfo: FileInfo): Promise<unknown> {
  try {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    return file ? JSON.parse(String(await file.getContent())) : null;
  } catch { return null; }
}

async function saveStorContent(fileInfo: FileInfo, source: string): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];
  if (!storFile) storFile = await createStorFile({ ...fileInfo, source }, false, false, false);
  if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
  storFile.updatedAt = new Date().toISOString();
  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}

async function saveConstDefault(fileInfo: FileInfo, exportName: string, data: unknown): Promise<void> {
  const header = `/// <mls fileReference="${toDisplayRef(fileInfo)}" enhancement="_blank"/>\n\n`;
  await saveStorContent(fileInfo, `${header}export const ${exportName} = ${JSON.stringify(data, null, 2)} as const;\n\nexport default ${exportName};\n`);
}

function ensureModule(modules: Map<string, CfeModuleInfo>, moduleName: string): CfeModuleInfo { const existing = modules.get(moduleName); if (existing) return existing; const created = { moduleName, entityIds: new Set<string>(), i18nLocales: [], i18nDefaultLocale: '' }; modules.set(moduleName, created); return created; }
function toDisplayRef(fileInfo: FileInfo): string { const folder = fileInfo.folder ? `${fileInfo.folder}/` : ''; return `_${fileInfo.project}_/l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`; }
function toFrontendType(type: string): string { const normalized = type.toLowerCase(); if (['number', 'integer', 'decimal', 'money', 'float'].includes(normalized)) return 'number'; if (['boolean', 'bool'].includes(normalized)) return 'boolean'; if (['date', 'datetime', 'time'].includes(normalized)) return 'date'; return 'string'; }
function isSystemField(fieldId: string): boolean { return ['createdat', 'updatedat'].includes(fieldId.toLowerCase()); }
function isLikelyIdField(fieldId: string): boolean { return fieldId.toLowerCase().endsWith('id'); }
function readString(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function readStringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(readString).filter(Boolean) : []; }
function readStorySteps(data: Record<string, unknown>): string[] { return isRecord(data.story) ? readStringArray(data.story.steps) : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function unique(values: string[]): string[] { return Array.from(new Set(values.filter(Boolean))); }
function toSafeShortName(value: string): string { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'page'; }
function toPascalCase(value: string): string { return value.split(/[^a-zA-Z0-9]+|(?=[A-Z])/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'Organism'; }
function humanizeId(id: string): string { const spaced = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim(); return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : id; }
