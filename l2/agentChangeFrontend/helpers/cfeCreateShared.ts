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
  type CfeL4OperationInput,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.js';
import { convertFileToTag } from '/_102020_/l2/utils.js';
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
  fileInfo: FileInfo;
  exportName: string;
  data: Record<string, unknown>;
}

// L4 journey map (l4/{module}/journeys/{module}Journeys.defs.ts). Workspaces are the unit of
// page grouping in the L4 v2 model: one page per workspace (an actor's coherent area), which
// can split a single workflow across actors (e.g. orderLifecycle -> POS + kitchen workspaces).
interface CfeJourneyWorkspace {
  workspaceId: string;
  title: string;
  actor: string;
  kind: string;              // workflow | entityManagement | dashboard | ...
  entity: string;
  workflowId?: string;
  operationIds: string[];
  purpose: string;
}

interface CfeJourneyMap {
  moduleName: string;
  workspaces: CfeJourneyWorkspace[];
  navigationEdges: Record<string, unknown>[];
}

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

interface CfeCreateContext {
  project: number;
  moduleNames: string[];
  moduleVisualStyle: Record<string, unknown>;
  moduleI18n: Record<string, { defaultLocale: string; activeLocales: string[] }>;
  entities: Map<string, CfeEntityDef>;
  operations: Map<string, CfeOperationDef>;
  workflows: Map<string, CfeWorkflowDef>;
  pages: CfePagePlan[];
  warnings: string[];
}

export interface CfePreparedPage {
  project: number;
  page: CfePagePlan;
  operations: CfeOperationDef[];
  commands: Record<string, unknown>[];
  navigationRefs: unknown[];
  baseDefinition: Record<string, unknown>;
  visualStyle: unknown;
  i18nMeta: { defaultLocale: string; activeLocales: string[] };
  variants: number;
  promptContext: Record<string, unknown>;
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

interface CfeBusinessContextRef {
  operationId: string;
  inputId?: string;
  contextKey: string;
  originRef: string;
  targetRef: string;
  required: boolean;
  description: string;
}

export interface CfePageLayoutVariant { templateId?: string; pageLayout: CfePageLayoutDefinition }
// pageLayout is the primary variant (genome page11). pageVariants are the extra UX variants
// (genome page21, page31...) — same pageId/commands, different structure (item 4).
export interface CfePageLayoutResult { pageLayout: CfePageLayoutDefinition; pageVariants?: CfePageLayoutVariant[] }
export type CfePageLayoutOutput = PlannerOutput<CfePageLayoutResult>;

const CFE_LAYOUT_TOOL_NAME = 'submitCfePageLayout';

const strSchema = { type: 'string' } as const;
const boolSchema = { type: 'boolean' } as const;
const intSchema = { type: 'integer' } as const;
const strArraySchema = { type: 'array', items: strSchema } as const;
const i18nStringMapSchema = { type: 'object', additionalProperties: strSchema } as const;
const i18nNestedMapSchema = { type: 'object', additionalProperties: i18nStringMapSchema } as const;
const i18nValueSchema = { anyOf: [strSchema, i18nStringMapSchema, i18nNestedMapSchema] } as const;

const layoutActionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'action', 'labelKey', 'order'],
  properties: {
    id: strSchema,
    action: strSchema,
    labelKey: strSchema,
    order: intSchema,
    displayHint: strSchema,
    actionKey: strSchema,
  },
} as const;

const layoutFieldSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'field', 'labelKey', 'order'],
  properties: {
    id: strSchema,
    field: strSchema,
    labelKey: strSchema,
    order: intSchema,
    required: boolSchema,
    inputType: strSchema,
    format: strSchema,
    source: strSchema,
    stateKey: strSchema,
  },
} as const;

const layoutIntentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'intent', 'order'],
  properties: {
    id: strSchema,
    intent: strSchema,
    order: intSchema,
    titleKey: strSchema,
    source: strSchema,
    binding: strSchema,
    action: strSchema,
    submitAction: strSchema,
    emptyKey: strSchema,
    displayHint: strSchema,
    stateKey: strSchema,
    fields: { type: 'array', items: layoutFieldSchema },
    columns: { type: 'array', items: layoutFieldSchema },
    filters: { type: 'array', items: layoutFieldSchema },
    toolbar: { type: 'array', items: layoutActionSchema },
    rowActions: { type: 'array', items: layoutActionSchema },
    actions: { type: 'array', items: layoutActionSchema },
  },
} as const;

const layoutOrganismSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'organismName', 'titleKey', 'purpose', 'userActions', 'requiredEntities', 'readsFields', 'writesFields', 'rulesApplied', 'order', 'intentions'],
  properties: {
    id: strSchema,
    type: strSchema,
    organismName: strSchema,
    titleKey: strSchema,
    purpose: strSchema,
    userActions: strArraySchema,
    requiredEntities: strArraySchema,
    readsFields: strArraySchema,
    writesFields: strArraySchema,
    rulesApplied: strArraySchema,
    order: intSchema,
    intentions: { type: 'array', minItems: 1, items: layoutIntentSchema },
  },
} as const;

const layoutSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'sectionName', 'titleKey', 'mode', 'order', 'organisms'],
  properties: {
    id: strSchema,
    type: { enum: ['section', 'sectionTab'] },
    sectionName: strSchema,
    titleKey: strSchema,
    mode: strSchema,
    order: intSchema,
    organisms: { type: 'array', minItems: 1, items: layoutOrganismSchema },
  },
} as const;

const pageLayoutObjectSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pageId', 'layoutId', 'sections', 'i18n', 'dataBindings'],
  properties: {
    pageId: strSchema,
    layoutId: strSchema,
    sections: { type: 'array', minItems: 1, items: layoutSectionSchema },
    i18n: { type: 'object', additionalProperties: i18nValueSchema },
    dataBindings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'source'],
        properties: {
          id: strSchema,
          source: strSchema,
          entity: strSchema,
          command: strSchema,
          description: strSchema,
          stateKey: strSchema,
          inputStateKeys: strArraySchema,
        },
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
    // Item 4: extra UX variants. Each shares pageId/commands with pageLayout; only structure differs.
    pageVariants: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pageLayout'],
        properties: { templateId: strSchema, pageLayout: pageLayoutObjectSchema },
      },
    },
  },
} as const;

export const cfePageLayoutToolSchema = createRelaxedCfePageLayoutToolSchema();
export const cfePageLayoutToolName = CFE_LAYOUT_TOOL_NAME;

function relaxPageLayoutSchema(pageLayoutSchema: any): void {
  if (!pageLayoutSchema || typeof pageLayoutSchema !== 'object') return;
  pageLayoutSchema.required = ['pageId', 'layoutId', 'sections'];
  const sectionSchema = pageLayoutSchema.properties?.sections?.items;
  if (sectionSchema && typeof sectionSchema === 'object') {
    // 'type' is not required: it has a deterministic default ('section'/'organism') applied during
    // normalization, so requiring it only fails the tool call on harmless LLM omissions.
    sectionSchema.required = ['id', 'mode', 'order', 'organisms'];
    const organismSchema = sectionSchema.properties?.organisms?.items;
    if (organismSchema && typeof organismSchema === 'object') {
      organismSchema.required = ['id', 'organismName', 'purpose', 'userActions', 'requiredEntities', 'readsFields', 'writesFields', 'rulesApplied', 'order', 'intentions'];
    }
  }
}

function createRelaxedCfePageLayoutToolSchema(): mls.msg.LLMTool {
  const resultSchema = JSON.parse(JSON.stringify(cfePageLayoutResultSchema)) as Record<string, any>;
  allowAdditionalProperties(resultSchema);

  relaxPageLayoutSchema(resultSchema.properties?.pageLayout);
  relaxPageLayoutSchema(resultSchema.properties?.pageVariants?.items?.properties?.pageLayout);

  const tool = createPlannerToolSchema(CFE_LAYOUT_TOOL_NAME, 'Submit the semantic layout for a frontend page (primary variant plus optional extra UX variants).', resultSchema) as mls.msg.LLMTool;
  const parameters = (tool as any).function?.parameters;
  if (parameters && Array.isArray(parameters.required)) parameters.required = ['status', 'result'];
  return tool;
}

function allowAdditionalProperties(schema: any): void {
  if (!schema || typeof schema !== 'object') return;
  if (schema.type === 'object' || schema.properties) schema.additionalProperties = true;
  if (schema.properties && typeof schema.properties === 'object') {
    for (const propertySchema of Object.values(schema.properties)) allowAdditionalProperties(propertySchema);
  }
  if (schema.items) allowAdditionalProperties(schema.items);
}

export async function readCreateContext(): Promise<CfeCreateContext> {
  const project = mls.actualProject || 0;
  const modules = new Map<string, CfeModuleInfo>();
  const entityToModule = new Map<string, string>();
  const entities = new Map<string, CfeEntityDef>();
  const operations = new Map<string, CfeOperationDef>();
  const workflows = new Map<string, CfeWorkflowDef>();
  const journeys = new Map<string, CfeJourneyMap>();

  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted' || file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    const shortName = String(file.shortName || '');
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) continue;
    const fileInfo: FileInfo = { project: file.project, level: file.level, folder, shortName, extension: file.extension };

    if (folder === 'workflows') {
      const workflow = workflowFromData(parsed.data, fileInfo, parsed.exportName);
      if (workflow) workflows.set(workflow.workflowId, workflow);
    } else if (folder === 'operations') {
      const operation = operationFromData(parsed.data, fileInfo, parsed.exportName);
      if (operation) operations.set(operation.operationId, operation);
    } else if (shortName === 'module' && folder && !folder.includes('/')) {
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

  const moduleNames = Array.from(modules.keys()).sort();
  const moduleFallback = moduleNames.length === 1 ? moduleNames[0] : 'unknown';
  const moduleVisualStyle: Record<string, unknown> = {};
  const moduleI18n: Record<string, { defaultLocale: string; activeLocales: string[] }> = {};
  for (const module of modules.values()) {
    moduleVisualStyle[module.moduleName] = module.visualStyle || {};
    const defaultLocale = module.i18nDefaultLocale || module.i18nLocales[0] || 'en';
    moduleI18n[module.moduleName] = { defaultLocale, activeLocales: unique([defaultLocale, ...module.i18nLocales]) };
  }

  for (const operation of operations.values()) operation.moduleName = inferModule(operationEntities(operation), entityToModule, moduleFallback);
  for (const workflow of workflows.values()) workflow.moduleName = inferModule(workflow.entities, entityToModule, moduleFallback);

  // Generation status is owned by l5/{module}/todoFrontend.defs.ts; the l4 owner defs are read-only
  // for this agent. Merge the todo status into each owner and fail loudly on plan/disk divergence.
  const todoState = await readFrontendTodoState(project);
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

  return { project, moduleNames, moduleVisualStyle, moduleI18n, entities, operations, workflows, pages: buildPagePlans(workflows, operations, moduleFallback, journeyList), warnings };
}

export async function generatePageDefs(page: CfePagePlan): Promise<void> {
  const prepared = await preparePageCreate(page);
  await saveContractDefs(prepared);
  const layout = await savePageLayoutDefs(prepared, deterministicLayoutFromBase(prepared));
  await saveSharedDefs(prepared, layout);
}

export async function preparePageCreate(page: CfePagePlan): Promise<CfePreparedPage> {
  const context = await readCreateContext();
  const operations = page.operationIds.map(id => context.operations.get(id) || syntheticOperation(page, id, context.project));
  const commands = operations.map(operation => commandFromOperation(operation, context.entities));
  recordTechnicalIdLookupGaps(page, commands);
  const navigationRefs: unknown[] = [];
  const baseDefinition = pageDefinition(page, operations);
  const visualStyle = context.moduleVisualStyle[page.moduleName];
  const i18nMeta = context.moduleI18n[page.moduleName] || { defaultLocale: 'en', activeLocales: ['en'] };
  const variants = await readModuleVariants(context.project, page.moduleName);
  const promptContext = buildLayoutPromptContext(context, page, operations, commands, baseDefinition, visualStyle, variants);
  return { project: context.project, page, operations, commands, navigationRefs, baseDefinition, visualStyle, i18nMeta, variants, promptContext };
}

export async function saveContractDefs(prepared: CfePreparedPage): Promise<void> {
  await savePageCreateMarker(prepared, 'inProgress');
  await saveFrontendDefs(contractFileInfo(prepared.project, prepared.page), 'definition', prepared.commands, contractPipeline(prepared.project, prepared.page));
}

export async function saveSharedDefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): Promise<void> {
  const enrichedLayout = enrichLayoutWithStateRefs(prepared, layout);
  const definition = sharedDefinition(prepared, enrichedLayout);
  await saveFrontendDefs(sharedFileInfo(prepared.project, prepared.page), 'definition', definition, sharedPipeline(prepared.project, prepared.page, prepared.commands));
  await savePageCreateMarker(prepared, 'done');
}

export async function savePageLayoutDefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition, genome = 'page11'): Promise<CfePageLayoutDefinition> {
  const repairedLayout = repairMissingLayoutI18n(prepared, repairUnknownLayoutActions(prepared, layout));
  validatePageLayout(prepared, repairedLayout);
  const enrichedLayout = enrichLayoutWithStateRefs(prepared, repairedLayout);
  const definition = {
    ...prepared.baseDefinition,
    templateId: selectedTemplateId(prepared, genome),
    visualStyle: prepared.visualStyle,
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

// Item 4: save the primary variant (page11) plus any extra UX variants (page21, page31...),
// then save ONE shared as the union of all variants. All variants share pageId/contract, so
// their stateKeys (pageId + command + field) coincide and the union is cheap.
export async function savePageVariants(prepared: CfePreparedPage, result: CfePageLayoutResult): Promise<void> {
  // The primary variant (page11) is strict: a page must have at least one complete, valid layout.
  const enrichedLayouts: CfePageLayoutDefinition[] = [await savePageLayoutDefs(prepared, result.pageLayout, pageGenome(0))];
  // Extra UX variants degrade gracefully: a variant that fails validation (e.g. the LLM dropped an
  // operation in that layout) is skipped with a warning instead of failing the whole page.
  let variantIndex = 1;
  for (const variant of result.pageVariants || []) {
    if (variantIndex >= prepared.variants || variantIndex >= MAX_UX_VARIANTS) break;
    const genome = pageGenome(variantIndex);
    variantIndex++;
    try {
      const expectedTemplateId = selectedTemplateId(prepared, genome);
      if (variant.templateId && expectedTemplateId && variant.templateId !== expectedTemplateId) {
        throw new Error(`variant ${genome} templateId ${variant.templateId} does not match selected template ${expectedTemplateId}`);
      }
      enrichedLayouts.push(await savePageLayoutDefs(prepared, variant.pageLayout, genome));
    } catch (error) {
      recordCreateWarning(`skipped UX variant ${genome} for ${prepared.page.pageId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await saveSharedDefsFromLayouts(prepared, enrichedLayouts);
}

// Build shared from the union of all (already enriched) variant layouts. States are contract-keyed,
// so the primary already covers the base; extra variants only add layout-only display states.
async function saveSharedDefsFromLayouts(prepared: CfePreparedPage, enrichedLayouts: CfePageLayoutDefinition[]): Promise<void> {
  const unionLayout = mergeLayoutsForShared(enrichedLayouts);
  const definition = sharedDefinition(prepared, unionLayout);
  await saveFrontendDefs(sharedFileInfo(prepared.project, prepared.page), 'definition', definition, sharedPipeline(prepared.project, prepared.page, prepared.commands));
  await savePageCreateMarker(prepared, 'done');
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

export async function finalizeGeneratedPages(): Promise<{ pagesDone: string[]; ownersDone: string[]; skippedPages: string[] }> {
  const context = await readCreateContext();
  const checkedPages = await Promise.all(context.pages.map(async page => ({ page, ok: await hasGeneratedDefs(context.project, page) && await hasRegisteredFrontend(context.project, page) })));
  const validPages = checkedPages.filter(item => item.ok).map(item => item.page);
  const skippedPages = checkedPages.filter(item => !item.ok).map(item => item.page.pageId);
  const ownersDone = await updateOwnerStatuses(context, validPages.flatMap(page => page.ownerIds), 'done');
  await saveCreateReport(context.project, validPages, ownersDone, skippedPages);
  return { pagesDone: validPages.map(page => page.pageId), ownersDone, skippedPages };
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
  const full = `[agentCfeCreatePage] ${message}`;
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

export function createAddStepIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, args?: string[], maxParallel = 5): mls.msg.AgentIntentAddStep {
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

function normalizePageLayout(value: unknown, path: string, fallback?: { i18n?: unknown; dataBindings?: unknown }): CfePageLayoutDefinition {
  const pageLayout = assertRecord(value, path);
  return {
    pageId: assertString(pageLayout.pageId, `${path}.pageId`),
    layoutId: assertString(pageLayout.layoutId, `${path}.layoutId`),
    sections: assertArray(pageLayout.sections, `${path}.sections`).map((item, index) => normalizeLayoutSection(item, `${path}.sections[${index}]`)),
    i18n: normalizeI18n(pageLayout.i18n ?? fallback?.i18n),
    dataBindings: normalizeDataBindings(pageLayout.dataBindings ?? fallback?.dataBindings),
  };
}

function normalizeCfePageLayoutResult(value: unknown): CfePageLayoutResult {
  const result = assertRecord(value, 'result');
  const pageLayoutRaw = isRecord(result.pageLayout) ? result.pageLayout : result;
  const variantsRaw = Array.isArray(result.pageVariants) ? result.pageVariants : [];
  const pageVariants = variantsRaw.map((item, index) => {
    const variant = assertRecord(item, `result.pageVariants[${index}]`);
    return {
      templateId: optionalString(variant.templateId),
      pageLayout: normalizePageLayout(variant.pageLayout, `result.pageVariants[${index}].pageLayout`),
    };
  });
  return {
    pageLayout: normalizePageLayout(pageLayoutRaw, 'result.pageLayout', { i18n: result.i18n, dataBindings: result.dataBindings }),
    pageVariants,
  };
}

function normalizeLayoutSection(value: unknown, path: string): CfeLayoutSection {
  const section = assertRecord(value, path);
  const id = assertString(section.id, `${path}.id`);
  const sectionName = optionalString(section.sectionName) || id.split('.').pop() || id;
  return {
    id,
    // type is optional in the relaxed tool schema; default to 'section' when the LLM omits it.
    type: optionalString(section.type) === 'sectionTab' ? 'sectionTab' : 'section',
    sectionName,
    titleKey: optionalString(section.titleKey) || fallbackLayoutTitleKey(id),
    mode: assertString(section.mode, `${path}.mode`),
    order: normalizeOrder(section.order, `${path}.order`),
    organisms: assertArray(section.organisms, `${path}.organisms`).map((item, index) => normalizeLayoutOrganism(item, `${path}.organisms[${index}]`)),
  };
}

function normalizeLayoutOrganism(value: unknown, path: string): CfeLayoutOrganism {
  const organism = assertRecord(value, path);
  const id = assertString(organism.id, `${path}.id`);
  return {
    id,
    // type is optional in the relaxed tool schema; default to 'organism' when the LLM omits it.
    type: optionalString(organism.type) || 'organism',
    organismName: assertString(organism.organismName, `${path}.organismName`),
    titleKey: optionalString(organism.titleKey) || fallbackLayoutTitleKey(id),
    purpose: assertString(organism.purpose, `${path}.purpose`),
    userActions: normalizeStringList(organism.userActions, `${path}.userActions`),
    requiredEntities: normalizeStringList(organism.requiredEntities, `${path}.requiredEntities`),
    readsFields: normalizeStringList(organism.readsFields, `${path}.readsFields`),
    writesFields: normalizeStringList(organism.writesFields, `${path}.writesFields`),
    rulesApplied: normalizeStringList(organism.rulesApplied, `${path}.rulesApplied`),
    order: normalizeOrder(organism.order, `${path}.order`),
    intentions: assertArray(organism.intentions, `${path}.intentions`).map((item, index) => normalizeLayoutIntent(item, `${path}.intentions[${index}]`)),
  };
}

function normalizeLayoutIntent(value: unknown, path: string): CfeLayoutIntent {
  const intent = assertRecord(value, path);
  return {
    id: assertString(intent.id, `${path}.id`),
    intent: assertString(intent.intent, `${path}.intent`),
    order: normalizeOrder(intent.order, `${path}.order`),
    titleKey: optionalString(intent.titleKey),
    source: optionalString(intent.source),
    binding: optionalString(intent.binding),
    action: optionalString(intent.action),
    submitAction: optionalString(intent.submitAction),
    emptyKey: optionalString(intent.emptyKey),
    displayHint: optionalString(intent.displayHint),
    stateKey: optionalString(intent.stateKey),
    fields: normalizeOptionalLayoutFields(intent.fields, `${path}.fields`),
    columns: normalizeOptionalLayoutFields(intent.columns, `${path}.columns`),
    filters: normalizeOptionalLayoutFields(intent.filters, `${path}.filters`),
    toolbar: normalizeOptionalLayoutActions(intent.toolbar, `${path}.toolbar`),
    rowActions: normalizeOptionalLayoutActions(intent.rowActions, `${path}.rowActions`),
    actions: normalizeOptionalLayoutActions(intent.actions, `${path}.actions`),
  };
}

function normalizeOptionalLayoutFields(value: unknown, path: string): CfeLayoutField[] {
  return value === undefined ? [] : normalizeLayoutFields(value, path);
}

function normalizeLayoutFields(value: unknown, path: string): CfeLayoutField[] {
  return assertArray(value, path).map((item, index) => {
    const field = assertRecord(item, `${path}[${index}]`);
    return {
      id: assertString(field.id, `${path}[${index}].id`),
      field: assertString(field.field, `${path}[${index}].field`),
    labelKey: assertString(field.labelKey, `${path}[${index}].labelKey`),
    order: normalizeOrder(field.order, `${path}[${index}].order`),
    required: field.required === true,
    inputType: optionalString(field.inputType),
    format: optionalString(field.format),
    source: optionalString(field.source),
    stateKey: optionalString(field.stateKey),
  };
  });
}

function normalizeOptionalLayoutActions(value: unknown, path: string): CfeLayoutAction[] {
  return value === undefined ? [] : normalizeLayoutActions(value, path);
}

function normalizeLayoutActions(value: unknown, path: string): CfeLayoutAction[] {
  return assertArray(value, path).map((item, index) => {
    const action = assertRecord(item, `${path}[${index}]`);
    return {
      id: assertString(action.id, `${path}[${index}].id`),
      action: assertString(action.action, `${path}[${index}].action`),
    labelKey: assertString(action.labelKey, `${path}[${index}].labelKey`),
    order: normalizeOrder(action.order, `${path}[${index}].order`),
    displayHint: optionalString(action.displayHint),
    actionKey: optionalString(action.actionKey),
  };
  });
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

function buildLayoutPromptContext(context: CfeCreateContext, page: CfePagePlan, operations: CfeOperationDef[], commands: Record<string, unknown>[], baseDefinition: Record<string, unknown>, visualStyle: unknown, variants = 1): Record<string, unknown> {
  const entityIds = new Set([...page.entityIds, ...operations.flatMap(operationEntities)]);
  const entities = Array.from(entityIds).map(entityId => context.entities.get(entityId)).filter(Boolean).map(entity => ({
    entityId: entity!.entityId,
    title: entity!.title,
    fields: entity!.fields,
    statusEnum: entity!.statusEnum,
    lifecycleStates: entity!.lifecycleStates,
    rulesApplied: entity!.rulesApplied,
  }));
  const workflows = page.ownerIds
    .filter(id => id.startsWith('workflow:'))
    .map(id => context.workflows.get(id.slice('workflow:'.length))?.data)
    .filter(Boolean);

  // Deterministic UX template candidates (registry selectionPolicy). Each candidate is a distinct
  // template. We assign one distinct template per variant/genome (variant i -> candidate i) so the
  // variants never reuse a template; the effective variant count is capped by how many distinct
  // candidates actually fit this screen.
  const candidates = selectUxTemplateCandidates(deriveUxSignals(context, page, operations, commands), Math.max(1, variants));
  const effectiveVariants = Math.min(Math.max(1, variants), candidates.length);
  const variantPlan = candidates.slice(0, effectiveVariants).map((candidate, index) => ({
    genome: pageGenome(index),
    template: candidate,
  }));

  return {
    page,
    baseDefinition,
    visualStyle,
    i18n: context.moduleI18n[page.moduleName] || { defaultLocale: 'en', activeLocales: ['en'] },
    workflows,
    userJourney: buildPageUserJourney(context, page, operations, commands),
    variants: effectiveVariants,
    pageGenomes: variantPlan.map(entry => entry.genome),
    variantPlan,
    operations: operations.map(operation => ({
      operationId: operation.operationId,
      title: operation.title,
      actor: operation.actor,
      entity: operation.entity,
      kind: operation.kind,
      reads: operation.reads,
      writes: operation.writes,
      rulesApplied: operation.rulesApplied,
      story: operation.data.story,
      capability: operation.capability,
    })),
    contract: { bffCommands: commands },
    shared: {
      contractRef: {
        defPath: toDisplayRef(contractFileInfo(context.project, page)),
        tsPath: contractTsPath(context.project, page),
      },
      availableActions: commands.map(command => command.commandName).filter(Boolean),
      baseStateKeys: baseSharedStateKeys(page.pageId, commands),
      businessContextRefs: collectBusinessContextRefs(operations),
      statePolicy: 'All filters, form fields, query results, action statuses and navigation requests are shared/global state. Page render must not own mutable state.',
    },
    ontology: { entities },
    layoutRules: [
      'Keep the section -> organism structure. Do not replace it with generic components.',
      'Each section, organism, intention, field, column and action needs a stable id and explicit order.',
      'Each operation must appear in at least one organism.userActions entry.',
      'Use intentions for plain page11 composition: queryList, commandForm, summary, workflowStatus, actionList or another semantic intent.',
      'Do not reference molecule groups, molecule tags, web-component tags, DOM slots or package-specific component names in page11.',
      'Use labelKey/titleKey/emptyKey for all visible text and declare those keys in i18n.',
      'Do not emit HTML, CSS, DOM slots or raw web-component markup.',
      'Only reference actions from shared.availableActions.',
      'Do not invent UI-only action names like select*, cancel, close, open, edit, view, remove or clear unless the exact name is in shared.availableActions.',
      'Every intention must include fields, columns, filters, toolbar, rowActions and actions arrays; use [] when empty.',
      'Only reference fields from contract inputs/outputs or ontology fields.',
      'When shared.businessContextRefs is not empty, expose the current company/unit context as a context badge or selector; do not ask the user to type workspaceId or companyId as a plain text filter.',
      'Every form/filter field must be state-driven by shared; the generator will add explicit stateKey refs.',
      'Use userJourney.operationsInOrder and userJourney.recommendedStages to decide the order and purpose of sections/intentions.',
      'For multi-step pages, do not collapse the page into one generic form; represent the operational sequence with distinct intentions.',
      'promptContext.variantPlan contains the ONLY allowed UX template for each genome. Follow its template.userJourney, template.layoutGuidance, template.wiring and template.validationChecks as hard requirements.',
      'Template defines structure; the UX guidance skill defines slot behavior. When they conflict, the template wins.',
      'promptContext.variantPlan pins one DISTINCT template per variant/genome in order: variantPlan[0] is result.pageLayout (page11); variantPlan[1..] are result.pageVariants[] in the same order. Build each variant strictly from its assigned template. Never reuse a template across variants and never produce more than variantPlan.length variants. All variants share the same pageId, commands and fields; only the structure differs.',
    ],
  };
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

function validatePageLayout(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): void {
  if (layout.pageId !== prepared.page.pageId) throw new Error(`layout pageId ${layout.pageId} does not match ${prepared.page.pageId}`);
  const ids = new Set<string>();
  const i18nKeys = new Set(Object.keys(layout.i18n));
  const actions = new Set(prepared.commands.map(command => readString(command.commandName)).filter(Boolean));
  const expectedActions = new Set(prepared.page.operationIds);
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
    const entity = prepared.promptContext.ontology && isRecord(prepared.promptContext.ontology)
      ? (prepared.promptContext.ontology.entities as unknown[] | undefined)?.find(item => isRecord(item) && item.entityId === entityId) as Record<string, unknown> | undefined
      : undefined;
    const fields = Array.isArray(entity?.fields) ? entity.fields : [];
    for (const field of fields) {
      if (!isRecord(field)) continue;
      const fieldId = readString(field.fieldId);
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

function deterministicLayoutFromBase(prepared: CfePreparedPage): CfePageLayoutDefinition {
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

function sharedDefinition(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): Record<string, unknown> {
  const businessContextRefs = collectBusinessContextRefs(prepared.operations);
  const states = sharedStates(prepared, layout);
  const actions = sharedActions(prepared, states);
  const initialLoads = prepared.commands
    .filter(command => readString(command.kind) === 'query')
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
    contractRef: {
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

  for (const state of states.filter(item => item.kind === 'input')) {
    const name = readString(state.name);
    if (!name) continue;
    actions.push({
      actionId: `set.${name}`,
      kind: 'stateSetter',
      stateKey: state.stateKey,
      methodName: `set${toPascalCase(name)}`,
      handlerName: `handle${toPascalCase(name)}Change`,
    });
  }

  return actions;
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

function baseSharedStateKeys(pageId: string, commands: Record<string, unknown>[]): string[] {
  const keys: string[] = [`ui.${pageId}.status`];
  for (const command of commands) {
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    keys.push(actionStatusStateKey(pageId, commandName));
    keys.push(...commandFieldRecords(command.input).map(field => inputStateKey(pageId, commandName, field.name)));
    if (readString(command.kind) === 'query') keys.push(queryDataStateKey(pageId, commandName));
    else keys.push(commandOutputStateKey(pageId, commandName), actionErrorStateKey(pageId, commandName));
  }
  return unique(keys);
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

function commandFromOperation(operation: CfeOperationDef, entities: Map<string, CfeEntityDef>): Record<string, unknown> {
  const primaryEntity = operation.entity || firstEntity(operationEntities(operation));
  const entity = entities.get(primaryEntity);
  const kind = operation.kind === 'query' || operation.kind === 'view' ? 'query' : 'command';
  const commandName = operation.commandName || operation.operationId;
  const outputShape = frontendOutputShapeForOperation({ ...operation.data, kind: operation.kind });
  return {
    commandName,
    ...(operation.bffName ? { bffName: operation.bffName } : {}),
    ...(operation.bffName ? { routeKey: operation.bffName } : {}),
    purpose: operation.title || humanizeId(operation.operationId),
    kind,
    outputShape,
    input: kind === 'query' ? queryInput(operation, entity, entities) : commandInput(operation, entity, entities),
    output: kind === 'query' ? queryOutput(operation, entity, entities) : commandOutput(operation, entity, entities),
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

function sharedPipeline(project: number, page: CfePagePlan, commands: Record<string, unknown>[]): unknown[] {
  return [{
    id: `${page.pageId}__l2_shared`,
    type: 'l2_shared',
    outputPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`,
    defPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`,
    dependsFiles: [
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`,
      '_102029_.d.ts',
    ],
    dependsOn: [`${page.pageId}__l2_contract`],
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
    dependsFiles: [
      `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`,
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`,
      // Design system tokens (optional context): lets page11 theme its colors via var(--token).
      // Missing file is tolerated by the materializer (readSections skips null content).
      `_${project}_/l2/designSystem.ts`,
    ],
    dependsOn: [`${page.pageId}__l2_shared`],
    skills: ['_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts'],
    visualStyle: typeof visualStyle === 'string' ? { description: visualStyle } : (isRecord(visualStyle) ? visualStyle : {}),
    agent: 'agentCfeMaterializeGen',
  }];
}

async function saveFrontendDefs(fileInfo: FileInfo, exportName: string, definition: unknown, pipeline: unknown[]): Promise<void> {
  const header = `/// <mls fileReference="${toDisplayRef(fileInfo)}" enhancement="_blank"/>\n\n`;
  await saveStorContent(fileInfo, `${header}export const ${exportName} = ${JSON.stringify(definition, null, 2)};\n\nexport const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;\n`);
}

// The workspace config.json is no longer written by this agent: it is composed at publish
// time from l5/project.json + on-disk artifacts (see nodejsSaveConfigJson.ts). The agent
// only signs the client-owned l5/project.json so the publish can resolve the composer.
async function updateL5FrontendSignature(project: number, pages: CfePagePlan[] = []): Promise<void> {
  const fileInfo: FileInfo = { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
  const existing = await readJsonFile(fileInfo);
  const cfg = isRecord(existing) ? existing : {};
  const masters = isRecord(cfg.masters) ? cfg.masters : (cfg.masters = {});
  masters.frontend = { masterProject: 102020, agentFolder: 'agentChangeFrontend', runtimeProject: 102033 };
  cfg.layouts = buildLayoutsConfig(project, pages, isRecord(cfg.layouts) ? cfg.layouts : {});
  await saveStorContent(fileInfo, `${JSON.stringify(cfg, null, 2)}\n`);
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

async function readFrontendTodoState(project: number): Promise<CfeTodoState> {
  const ownersByKey = new Map<string, CfeTodoOwner>();
  const moduleNames = new Set<string>();
  const warnings: string[] = [];
  const errors: string[] = [];
  let files = 0;
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoFrontend') continue;
    files++;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) { errors.push(`invalid todoFrontend defs at l5/${String(file.folder || '')}/todoFrontend.defs.ts`); continue; }
    const data = parsed.data;
    const layer = readString(data.layer);
    if (layer && layer !== 'frontend') warnings.push(`todoFrontend ${String(file.folder || '')} has layer=${layer}; treating as frontend by filename`);
    const moduleName = readString(data.moduleName) || String(file.folder || '');
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

// Item 4: number of UX variants to generate for a module, read from l5/{module}/todoFrontend.defs.ts
// (module-level `variants`). Absent -> 1 (backward-compatible). Clamped to [1, MAX_UX_VARIANTS].
// ns3 is expected to emit this field (default 3); until then it is set manually in todoFrontend.
async function readModuleVariants(project: number, moduleName: string): Promise<number> {
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 5 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || String(file.shortName || '') !== 'todoFrontend') continue;
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!parsed) continue;
    const fileModule = readString(parsed.data.moduleName) || String(file.folder || '');
    if (fileModule !== moduleName) continue;
    const raw = parsed.data.variants;
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.min(Math.floor(value), MAX_UX_VARIANTS);
  }
  return 1;
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
    agent: 'agentCfeCreatePage',
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
  const defsExist = [contractFileInfo(project, page), sharedFileInfo(project, page), pageFileInfo(project, page)].every(fileInfo => {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    return !!file && file.status !== 'deleted';
  });
  if (!defsExist) return false;
  const marker = await readJsonFile(pageCreateMarkerFileInfo(project, page));
  return isRecord(marker) && marker.status === 'done';
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

// page[ux][ui] genome. UX variants (item 4) vary the UX digit and keep UI=1: page11, page21, page31.
const MAX_UX_VARIANTS = 3;
function pageGenome(variantIndex: number): string { return `page${variantIndex + 1}1`; }

function selectedTemplateId(prepared: CfePreparedPage, genome: string): string | undefined {
  const variantPlan = Array.isArray(prepared.promptContext.variantPlan) ? prepared.promptContext.variantPlan : [];
  const variant = variantPlan.find(item => isRecord(item) && readString(item.genome) === genome);
  const template = variant && isRecord(variant.template) ? variant.template : undefined;
  return template ? readString(template.id) || undefined : undefined;
}

function contractFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/contracts`, shortName: page.pageId, extension: '.defs.ts' }; }
function sharedFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/shared`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageFileInfo(project: number, page: CfePagePlan, genome = 'page11'): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageTsFileInfo(project: number, page: CfePagePlan, genome = 'page11'): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId, extension: '.ts' }; }
function pageHtmlFileInfo(project: number, page: CfePagePlan, genome = 'page11'): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/${genome}`, shortName: page.pageId, extension: '.html' }; }
function pageCreateMarkerFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/trace/frontend-create-pages`, shortName: page.pageId, extension: '.json' }; }
function pageRegisterMarkerFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/trace/frontend-register-pages`, shortName: page.pageId, extension: '.json' }; }

function operationFromData(data: Record<string, unknown>, fileInfo: FileInfo, exportName: string): CfeOperationDef | null {
  const operationId = readString(data.operationId);
  if (!operationId) return null;
  return { operationId, commandName: readString(data.commandName) || operationId, pageId: readString(data.pageId), bffName: readString(data.bffName), title: readString(data.title) || humanizeId(operationId), actor: readString(data.actor), entity: normalizeEntityRef(readString(data.entity)), kind: readString(data.kind), reads: readStringArray(data.reads), writes: readStringArray(data.writes), rulesApplied: readStringArray(data.rulesApplied), storySteps: readStorySteps(data), todoStatus: '', inlineStatusFrontend: readString(data.statusFrontend), capability: isRecord(data.capability) ? data.capability : undefined, moduleName: '', fileInfo, exportName, data };
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
    fileInfo: { project, level: 4, folder: 'operations', shortName: operationId, extension: '.defs.ts' },
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

function workflowFromData(data: Record<string, unknown>, fileInfo: FileInfo, exportName: string): CfeWorkflowDef | null {
  const workflowId = readString(data.workflowId);
  if (!workflowId) return null;
  return { workflowId, pageId: readString(data.pageId) || workflowId, title: readString(data.title) || humanizeId(workflowId), actors: readStringArray(data.actors), operationIds: readStringArray(data.operationIds), entities: normalizeEntityRefs(readStringArray(data.entities)), rulesApplied: readStringArray(data.rulesApplied), storySteps: readStorySteps(data), todoStatus: '', inlineStatusFrontend: readString(data.statusFrontend), capabilities: Array.isArray(data.capabilities) ? data.capabilities.filter(isRecord) : [], moduleName: '', fileInfo, exportName, data };
}

function journeyFromData(data: Record<string, unknown>, folderModule: string): CfeJourneyMap | null {
  const moduleName = readString(data.moduleName) || folderModule;
  if (!moduleName) return null;
  const workspaces = (Array.isArray(data.workspaces) ? data.workspaces.filter(isRecord) : []).map(raw => ({
    workspaceId: readString(raw.workspaceId),
    title: readString(raw.title),
    actor: readString(raw.actor),
    kind: readString(raw.kind),
    entity: normalizeEntityRef(readString(raw.entity)),
    workflowId: readString(raw.workflowId) || undefined,
    operationIds: readStringArray(raw.operationIds),
    purpose: readString(raw.purpose),
  })).filter(ws => ws.workspaceId);
  const navigationEdges = Array.isArray(data.navigationEdges) ? data.navigationEdges.filter(isRecord) : [];
  return { moduleName, workspaces, navigationEdges };
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
  return out;
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

function parseDefsSource(content: string): { exportName: string; data: Record<string, unknown> } | null {
  const exportMatch = content.match(/export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
  const start = content.indexOf('= ');
  const end = content.lastIndexOf(' as const;');
  if (!exportMatch || start === -1 || end === -1 || end <= start) return null;
  try { const parsed = JSON.parse(content.slice(start + 2, end)); return isRecord(parsed) ? { exportName: exportMatch[1], data: parsed } : null; } catch { return null; }
}

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
