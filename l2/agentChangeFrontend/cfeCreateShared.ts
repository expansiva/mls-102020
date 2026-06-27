/// <mls fileReference="_102020_/l2/agentChangeFrontend/cfeCreateShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

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
} from '/_102020_/l2/agentNewSolution2/ns2Extract.js';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;
type OwnerStatus = 'toCreate' | 'toUpdate' | 'toRemove' | 'inProgress' | 'done';

interface CfeFieldDef { fieldId: string; type: string; required?: boolean; description?: string; enum?: string[] }
interface CfeEntityDef { entityId: string; title: string; fields: CfeFieldDef[]; rulesApplied: string[]; statusEnum: string[]; lifecycleStates: string[] }

interface CfeOperationDef {
  operationId: string;
  title: string;
  actor: string;
  entity: string;
  kind: string;
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  statusFrontend: string;
  capability?: Record<string, unknown>;
  moduleName: string;
  fileInfo: FileInfo;
  exportName: string;
  data: Record<string, unknown>;
}

interface CfeWorkflowDef {
  workflowId: string;
  title: string;
  actors: string[];
  operationIds: string[];
  entities: string[];
  rulesApplied: string[];
  statusFrontend: string;
  capabilities: Record<string, unknown>[];
  moduleName: string;
  fileInfo: FileInfo;
  exportName: string;
  data: Record<string, unknown>;
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
}

interface CfeCreateContext {
  project: number;
  moduleNames: string[];
  moduleVisualStyle: Record<string, unknown>;
  entities: Map<string, CfeEntityDef>;
  operations: Map<string, CfeOperationDef>;
  workflows: Map<string, CfeWorkflowDef>;
  pages: CfePagePlan[];
}

export interface CfePreparedPage {
  project: number;
  page: CfePagePlan;
  operations: CfeOperationDef[];
  commands: Record<string, unknown>[];
  navigationRefs: unknown[];
  baseDefinition: Record<string, unknown>;
  visualStyle: unknown;
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

export interface CfePageLayoutResult { pageLayout: CfePageLayoutDefinition }
export type CfePageLayoutOutput = PlannerOutput<CfePageLayoutResult>;

const CFE_LAYOUT_TOOL_NAME = 'submitCfePageLayout';

const strSchema = { type: 'string' } as const;
const boolSchema = { type: 'boolean' } as const;
const intSchema = { type: 'integer' } as const;
const strArraySchema = { type: 'array', items: strSchema } as const;

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

export const cfePageLayoutResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['pageLayout'],
  properties: {
    pageLayout: {
      type: 'object',
      additionalProperties: false,
      required: ['pageId', 'layoutId', 'sections', 'i18n', 'dataBindings'],
      properties: {
        pageId: strSchema,
        layoutId: strSchema,
        sections: { type: 'array', minItems: 1, items: layoutSectionSchema },
        i18n: { type: 'object', additionalProperties: strSchema },
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
    },
  },
} as const;

export const cfePageLayoutToolSchema = createPlannerToolSchema(CFE_LAYOUT_TOOL_NAME, 'Submit the semantic layout for one frontend page.', cfePageLayoutResultSchema as unknown as Record<string, unknown>);
export const cfePageLayoutToolName = CFE_LAYOUT_TOOL_NAME;

export async function readCreateContext(): Promise<CfeCreateContext> {
  const project = mls.actualProject || 0;
  const modules = new Map<string, { moduleName: string; visualStyle?: unknown; entityIds: Set<string> }>();
  const entityToModule = new Map<string, string>();
  const entities = new Map<string, CfeEntityDef>();
  const operations = new Map<string, CfeOperationDef>();
  const workflows = new Map<string, CfeWorkflowDef>();

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
      const moduleName = readString(moduleData.moduleName) || folder;
      ensureModule(modules, moduleName).visualStyle = moduleData.visualStyle;
    } else if (folder.endsWith('/ontology')) {
      const moduleName = folder.split('/')[0];
      const entity = entityFromData(parsed.data, shortName);
      if (moduleName && entity) {
        ensureModule(modules, moduleName).entityIds.add(entity.entityId);
        entityToModule.set(entity.entityId, moduleName);
        entities.set(entity.entityId, entity);
      }
    }
  }

  const moduleNames = Array.from(modules.keys()).sort();
  const moduleFallback = moduleNames.length === 1 ? moduleNames[0] : 'unknown';
  const moduleVisualStyle: Record<string, unknown> = {};
  for (const module of modules.values()) moduleVisualStyle[module.moduleName] = module.visualStyle || {};

  for (const operation of operations.values()) operation.moduleName = inferModule(operationEntities(operation), entityToModule, moduleFallback);
  for (const workflow of workflows.values()) workflow.moduleName = inferModule(workflow.entities, entityToModule, moduleFallback);

  return { project, moduleNames, moduleVisualStyle, entities, operations, workflows, pages: buildPagePlans(workflows, operations, moduleFallback) };
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
  const navigationRefs: unknown[] = [];
  const baseDefinition = pageDefinition(page, operations);
  const visualStyle = context.moduleVisualStyle[page.moduleName];
  const promptContext = buildLayoutPromptContext(context, page, operations, commands, baseDefinition, visualStyle);
  return { project: context.project, page, operations, commands, navigationRefs, baseDefinition, visualStyle, promptContext };
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

export async function savePageLayoutDefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): Promise<CfePageLayoutDefinition> {
  const repairedLayout = repairUnknownLayoutActions(prepared, layout);
  validatePageLayout(prepared, repairedLayout);
  const enrichedLayout = enrichLayoutWithStateRefs(prepared, repairedLayout);
  const definition = {
    ...prepared.baseDefinition,
    sections: layoutSectionSummary(enrichedLayout.sections),
    layout: {
      id: enrichedLayout.layoutId,
      type: 'page',
      sections: enrichedLayout.sections,
    },
    dataBindings: enrichedLayout.dataBindings,
  };
  await saveFrontendDefs(pageFileInfo(prepared.project, prepared.page), 'definition', definition, pagePipeline(prepared.project, prepared.page, prepared.visualStyle));
  return enrichedLayout;
}

export async function finalizeGeneratedPages(): Promise<{ pagesDone: string[]; ownersDone: string[]; skippedPages: string[] }> {
  const context = await readCreateContext();
  const checkedPages = await Promise.all(context.pages.map(async page => ({ page, ok: await hasGeneratedDefs(context.project, page) })));
  const validPages = checkedPages.filter(item => item.ok).map(item => item.page);
  const skippedPages = checkedPages.filter(item => !item.ok).map(item => item.page.pageId);
  await updateConfigJson(context, validPages);
  const ownersDone = await updateOwnerStatuses(context, validPages.flatMap(page => page.ownerIds), 'done');
  await saveCreateReport(context.project, validPages, ownersDone, skippedPages);
  return { pagesDone: validPages.map(page => page.pageId), ownersDone, skippedPages };
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

export function createAddStepIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, args?: string[]): mls.msg.AgentIntentAddStep {
  const intent: mls.msg.AgentIntentAddStep = {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
  if (args) intent.executionMode = { type: 'parallel', args, maxParallel: 5 };
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
  const pageLayout = assertRecord(result.pageLayout, 'result.pageLayout');
  return {
    pageLayout: {
      pageId: assertString(pageLayout.pageId, 'result.pageLayout.pageId'),
      layoutId: assertString(pageLayout.layoutId, 'result.pageLayout.layoutId'),
      sections: assertArray(pageLayout.sections, 'result.pageLayout.sections').map((item, index) => normalizeLayoutSection(item, `sections[${index}]`)),
      i18n: normalizeI18n(pageLayout.i18n),
      dataBindings: assertArray(pageLayout.dataBindings, 'result.pageLayout.dataBindings').map((item, index) => normalizeDataBinding(item, `dataBindings[${index}]`)),
    },
  };
}

function normalizeLayoutSection(value: unknown, path: string): CfeLayoutSection {
  const section = assertRecord(value, path);
  return {
    id: assertString(section.id, `${path}.id`),
    type: assertString(section.type, `${path}.type`) === 'sectionTab' ? 'sectionTab' : 'section',
    sectionName: assertString(section.sectionName, `${path}.sectionName`),
    titleKey: assertString(section.titleKey, `${path}.titleKey`),
    mode: assertString(section.mode, `${path}.mode`),
    order: normalizeOrder(section.order, `${path}.order`),
    organisms: assertArray(section.organisms, `${path}.organisms`).map((item, index) => normalizeLayoutOrganism(item, `${path}.organisms[${index}]`)),
  };
}

function normalizeLayoutOrganism(value: unknown, path: string): CfeLayoutOrganism {
  const organism = assertRecord(value, path);
  return {
    id: assertString(organism.id, `${path}.id`),
    type: assertString(organism.type, `${path}.type`),
    organismName: assertString(organism.organismName, `${path}.organismName`),
    titleKey: assertString(organism.titleKey, `${path}.titleKey`),
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
  const record = assertRecord(value, 'result.pageLayout.i18n');
  const normalized: Record<string, string> = {};
  for (const [key, item] of Object.entries(record)) normalized[key] = assertString(item, `i18n.${key}`);
  return normalized;
}

function normalizeOrder(value: unknown, path: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  throw new Error(`${path} must be an integer`);
}

function buildLayoutPromptContext(context: CfeCreateContext, page: CfePagePlan, operations: CfeOperationDef[], commands: Record<string, unknown>[], baseDefinition: Record<string, unknown>, visualStyle: unknown): Record<string, unknown> {
  const entityIds = new Set([...page.entityIds, ...operations.flatMap(operationEntities), ...commands.flatMap(command => [...readStringArray(command.readsEntities), ...readStringArray(command.writesEntities)])]);
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
  return {
    page,
    baseDefinition,
    visualStyle,
    workflows,
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
      'Every form/filter field must be state-driven by shared; the generator will add explicit stateKey refs.',
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
    console.warn(`[agentCfeCreatePage] dropped unknown layout action(s) for ${prepared.page.pageId}: ${dropped.join('; ')}`);
  }
  return dropped.length > 0 ? { ...layout, sections } : layout;
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
  for (const field of [...intent.fields, ...intent.columns, ...intent.filters]) {
    registerId(ids, field.id, `field:${field.id}`);
    assertI18nKey(i18nKeys, field.labelKey, `${field.id}.labelKey`);
    if (!fields.has(field.field)) throw new Error(`${field.id}.field references unknown field ${field.field}`);
  }
  for (const action of [...intent.toolbar, ...intent.rowActions, ...intent.actions]) {
    registerId(ids, action.id, `action:${action.id}`);
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

function deterministicLayoutFromBase(prepared: CfePreparedPage): CfePageLayoutDefinition {
  const i18n: Record<string, string> = {};
  const sectionId = `section.${prepared.page.pageId}.main`;
  const sectionTitleKey = `${sectionId}.title`;
  i18n[sectionTitleKey] = prepared.page.pageName;
  const organisms = prepared.operations.map((operation, index) => deterministicOrganism(prepared, operation, index, i18n));
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
  const fields = commandFields(command.input).map((field, fieldIndex) => deterministicField(`${intentId}.field.${field}`, field, fieldIndex, i18n));
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
  const states = sharedStates(prepared);
  const actions = sharedActions(prepared, states);
  return {
    pageId: prepared.page.pageId,
    pageName: prepared.page.pageName,
    moduleName: prepared.page.moduleName,
    sourceKind: prepared.page.sourceKind,
    ownerIds: prepared.page.ownerIds,
    operationIds: prepared.page.operationIds,
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
    initialLoads: prepared.commands
      .filter(command => readString(command.kind) === 'query')
      .map(command => ({ actionId: readString(command.commandName), stateKey: queryDataStateKey(prepared.page.pageId, readString(command.commandName)) })),
    navigationRefs: prepared.navigationRefs,
    i18n: layout.i18n,
    automation: {
      statePrefix: `ui.${prepared.page.pageId}`,
      stateKeys: states.map(state => readString(state.stateKey)).filter(Boolean),
      actionIds: actions.map(action => readString(action.actionId)).filter(Boolean),
    },
  };
}

function sharedStates(prepared: CfePreparedPage): Record<string, unknown>[] {
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
        contractRef: { commandName, direction: 'input', field: field.name },
        defaultValue: defaultValueForField(field),
      });
    }

    if (kind === 'query') {
      addState(states, {
        stateKey: queryDataStateKey(prepared.page.pageId, commandName),
        name: queryStateName(commandName),
        kind: 'queryResult',
        contractRef: { commandName, direction: 'output' },
        collection: true,
        defaultValue: [],
      });
    }
  }

  return Array.from(states.values());
}

function sharedActions(prepared: CfePreparedPage, states: Record<string, unknown>[]): Record<string, unknown>[] {
  const actions: Record<string, unknown>[] = [];
  for (const command of prepared.commands) {
    const commandName = readString(command.commandName);
    if (!commandName) continue;
    const kind = readString(command.kind) === 'query' ? 'query' : 'command';
    actions.push({
      actionId: commandName,
      kind,
      commandRef: commandName,
      routeKey: `${prepared.page.moduleName}.${prepared.page.pageId}.${commandName}`,
      purpose: readString(command.purpose),
      methodName: kind === 'query' ? `load${toPascalCase(commandName)}` : commandName,
      handlerName: `handle${toPascalCase(commandName)}Click`,
      inputStateKeys: commandFieldRecords(command.input).map(field => inputStateKey(prepared.page.pageId, commandName, field.name)),
      outputStateKeys: kind === 'query' ? [queryDataStateKey(prepared.page.pageId, commandName)] : [],
      statusStateKey: actionStatusStateKey(prepared.page.pageId, commandName),
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

function enrichLayoutWithStateRefs(prepared: CfePreparedPage, layout: CfePageLayoutDefinition): CfePageLayoutDefinition {
  const cloned = JSON.parse(JSON.stringify(layout)) as CfePageLayoutDefinition;
  cloned.dataBindings = cloned.dataBindings.map(binding => {
    const commandName = binding.command || commandFromBindingSource(binding.source);
    return commandName ? {
      ...binding,
      stateKey: queryDataStateKey(prepared.page.pageId, commandName),
      inputStateKeys: commandInputStateKeys(prepared, commandName),
    } : binding;
  });

  for (const section of cloned.sections) {
    for (const organism of section.organisms) {
      for (const intent of organism.intentions) {
        const commandName = intentCommandName(intent, organism.userActions);
        if (commandName && isQueryCommand(prepared, commandName) && intentUsesQueryResult(intent)) intent.stateKey = queryDataStateKey(prepared.page.pageId, commandName);
        if (commandName) {
          for (const field of [...intent.fields, ...intent.filters]) {
            field.stateKey = inputStateKey(prepared.page.pageId, commandName, field.field);
          }
          for (const field of intent.columns) {
            field.stateKey = queryDataStateKey(prepared.page.pageId, commandName);
          }
        }
        for (const action of [...intent.toolbar, ...intent.rowActions, ...intent.actions]) action.actionKey = action.action;
      }
    }
  }
  return cloned;
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

function commandFieldRecords(value: unknown): { name: string; required?: boolean }[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => isRecord(item) ? { name: readString(item.name), required: item.required === true } : { name: '' }).filter(item => item.name);
}

function commandInputStateKeys(prepared: CfePreparedPage, commandName: string): string[] {
  const command = prepared.commands.find(item => readString(item.commandName) === commandName);
  return commandFieldRecords(command?.input).map(field => inputStateKey(prepared.page.pageId, commandName, field.name));
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
function actionStatusStateKey(pageId: string, commandName: string): string { return `ui.${pageId}.action.${commandName}.status`; }
function inputStateName(commandName: string, fieldName: string): string { return `${commandName}${toPascalCase(fieldName)}`; }
function queryStateName(commandName: string): string { return `${commandName}Data`; }
function contractTsPath(project: number, page: CfePagePlan): string { return `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`; }

function buildPagePlans(workflows: Map<string, CfeWorkflowDef>, operations: Map<string, CfeOperationDef>, moduleFallback: string): CfePagePlan[] {
  const pendingWorkflows = Array.from(workflows.values()).filter(owner => owner.statusFrontend === 'toCreate');
  const pendingOperations = Array.from(operations.values()).filter(owner => owner.statusFrontend === 'toCreate');
  const pendingOpsById = new Map(pendingOperations.map(op => [op.operationId, op]));
  const operationIdsUsedByWorkflow = new Set<string>();
  const pages: CfePagePlan[] = [];

  for (const workflow of pendingWorkflows) {
    for (const operationId of workflow.operationIds) operationIdsUsedByWorkflow.add(operationId);
    const linkedOperations = workflow.operationIds.map(id => pendingOpsById.get(id)).filter(Boolean) as CfeOperationDef[];
    pages.push({
      pageId: toSafeShortName(workflow.workflowId),
      pageName: workflow.title || humanizeId(workflow.workflowId),
      moduleName: workflow.moduleName || moduleFallback,
      sourceKind: 'workflow',
      ownerIds: unique([`workflow:${workflow.workflowId}`, ...linkedOperations.map(op => `operation:${op.operationId}`)]),
      actorIds: unique([...workflow.actors, ...linkedOperations.map(op => op.actor)]),
      entityIds: unique([...workflow.entities, ...linkedOperations.flatMap(operationEntities)]),
      operationIds: unique([...workflow.operationIds, ...linkedOperations.map(op => op.operationId)]),
      rulesApplied: unique([...workflow.rulesApplied, ...linkedOperations.flatMap(op => op.rulesApplied)]),
      capabilities: unique([...workflow.capabilities.map(c => readString(c.capabilityId)), ...linkedOperations.map(op => readString(op.capability?.capabilityId))]),
    });
  }

  for (const operation of pendingOperations) {
    if (operationIdsUsedByWorkflow.has(operation.operationId)) continue;
    pages.push({
      pageId: toSafeShortName(operation.operationId),
      pageName: operation.title || humanizeId(operation.operationId),
      moduleName: operation.moduleName || moduleFallback,
      sourceKind: 'operation',
      ownerIds: [`operation:${operation.operationId}`],
      actorIds: unique([operation.actor]),
      entityIds: operationEntities(operation),
      operationIds: [operation.operationId],
      rulesApplied: operation.rulesApplied,
      capabilities: unique([readString(operation.capability?.capabilityId)]),
    });
  }

  return pages.sort((a, b) => `${a.moduleName}:${a.pageId}`.localeCompare(`${b.moduleName}:${b.pageId}`));
}

function commandFromOperation(operation: CfeOperationDef, entities: Map<string, CfeEntityDef>): Record<string, unknown> {
  const primaryEntity = operation.entity || firstEntity(operationEntities(operation));
  const entity = entities.get(primaryEntity);
  const kind = operation.kind === 'query' || operation.kind === 'view' ? 'query' : 'command';
  return {
    commandName: operation.operationId,
    purpose: operation.title || humanizeId(operation.operationId),
    kind,
    input: kind === 'query' ? queryInput(operation, entity) : commandInput(operation, entity),
    output: kind === 'query' ? queryOutput(operation, entity) : commandOutput(entity),
    readsEntities: unique([operation.entity, ...normalizeEntityRefs(operation.reads)]),
    writesEntities: unique(normalizeEntityRefs(operation.writes)),
    readsTables: [],
    writesTables: [],
    usecaseRefs: [operation.operationId],
    layerContract: { controllerLayer: 'layer_2_controllers', mustCallLayer: 'layer_3_usecases', directTableAccessForbidden: true },
    rulesApplied: unique([...(operation.rulesApplied || []), ...(entity?.rulesApplied || [])]),
  };
}

function pageDefinition(page: CfePagePlan, operations: CfeOperationDef[]): Record<string, unknown> {
  return {
    pageId: page.pageId,
    pageName: page.pageName,
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
    pageInputs: [],
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
  return [{ id: `${page.pageId}__l2_contract`, type: 'l2_contract', outputPath: `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`, defPath: `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`, dependsFiles: [], dependsOn: [], skills: ['_102020_/l2/agentChangeFrontend/skills/genCfeContractTs.ts'], agent: 'agentMaterializeGen' }];
}

function sharedPipeline(project: number, page: CfePagePlan, commands: Record<string, unknown>[]): unknown[] {
  return [{
    id: `${page.pageId}__l2_shared`,
    type: 'l2_shared',
    outputPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`,
    defPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`,
    dependsFiles: [
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`,
      `_${project}_/l2/${page.moduleName}/web/desktop/page11/${page.pageId}.defs.ts`,
    ],
    dependsOn: [],
    skills: ['_102020_/l2/agentChangeFrontend/skills/genCfeSharedTs.ts'],
    rulesApplied: unique(commands.flatMap(command => Array.isArray(command.rulesApplied) ? command.rulesApplied.map(String) : [])),
    agent: 'agentMaterializeGen',
  }];
}

function pagePipeline(project: number, page: CfePagePlan, visualStyle: unknown): unknown[] {
  return [{
    id: `${page.pageId}__l2_page`,
    type: 'l2_page',
    outputPath: `_${project}_/l2/${page.moduleName}/web/desktop/page11/${page.pageId}.ts`,
    defPath: `_${project}_/l2/${page.moduleName}/web/desktop/page11/${page.pageId}.defs.ts`,
    dependsFiles: [
      `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`,
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`,
      `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`,
    ],
    dependsOn: [],
    skills: ['_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts'],
    afterSaveFrontEnd: '_102020_/l2/agentMaterializeSolution/registerFrontEnd.ts?registerPage',
    visualStyle: typeof visualStyle === 'string' ? { description: visualStyle } : (isRecord(visualStyle) ? visualStyle : {}),
    agent: 'agentMaterializeGen',
  }];
}

async function saveFrontendDefs(fileInfo: FileInfo, exportName: string, definition: unknown, pipeline: unknown[]): Promise<void> {
  const header = `/// <mls fileReference="${toDisplayRef(fileInfo)}" enhancement="_blank"/>\n\n`;
  await saveStorContent(fileInfo, `${header}export const ${exportName} = ${JSON.stringify(definition, null, 2)};\n\nexport const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;\n`);
}

async function updateConfigJson(context: CfeCreateContext, pages: CfePagePlan[]): Promise<void> {
  const fileInfo: FileInfo = { project: context.project, level: 0, folder: '', shortName: 'config', extension: '.json' };
  const existing = await readJsonFile(fileInfo);
  const config = isRecord(existing) ? existing : createBaseConfig(context.project);
  const projects = ensureRecord(config, 'projects');
  const projectKey = String(context.project);
  const projectConfig = ensureRecord(projects, projectKey);
  projectConfig.root = projectConfig.root || '.';
  projectConfig.type = projectConfig.type || 'client';
  const modules = ensureArray(projectConfig, 'modules');

  for (const moduleName of unique(pages.map(page => page.moduleName))) {
    const moduleConfig = upsertByKey(modules, 'moduleId', moduleName);
    moduleConfig.moduleId = moduleName;
    moduleConfig.basePath = moduleConfig.basePath || `/${moduleName}`;
    moduleConfig.shellMode = moduleConfig.shellMode || 'spa';
    moduleConfig.backendRouter = moduleConfig.backendRouter || `./_${context.project}_/l1/${moduleName}/layer_2_controllers/router.js`;
    const navigation = ensureArray(moduleConfig, 'navigation');
    const frontend = ensureRecord(moduleConfig, 'frontend');
    frontend.layer = 'l2';
    frontend.moduleEntrypoint = frontend.moduleEntrypoint || `./_${context.project}_/l2/${moduleName}/module.js`;
    frontend.moduleSource = frontend.moduleSource || `l2/${moduleName}/module.ts`;
    const frontendPages = ensureArray(frontend, 'pages');

    for (const page of pages.filter(p => p.moduleName === moduleName)) {
      Object.assign(upsertByKey(navigation, 'id', page.pageId), { id: page.pageId, label: page.pageName, href: `/${moduleName}/${page.pageId}`, description: page.pageName });
      Object.assign(upsertByKey(frontendPages, 'pageId', page.pageId), { pageId: page.pageId, route: `/${moduleName}/${page.pageId}`, source: `l2/${moduleName}/web/desktop/page11/${page.pageId}.ts`, definition: `l2/${moduleName}/web/desktop/page11/${page.pageId}.defs.ts`, componentTag: `${toKebabCase(moduleName)}--web--desktop--page11--${toKebabCase(page.pageId)}-${context.project}` });
    }
  }

  await saveStorContent(fileInfo, `${JSON.stringify(config, null, 2)}\n`);
}

async function updateOwnerStatuses(context: CfeCreateContext, ownerIds: string[], status: OwnerStatus): Promise<string[]> {
  const updated: string[] = [];
  const wanted = new Set(ownerIds);
  for (const workflow of context.workflows.values()) {
    const ownerId = `workflow:${workflow.workflowId}`;
    if (!wanted.has(ownerId)) continue;
    workflow.data.statusFrontend = status;
    await saveConstDefault(workflow.fileInfo, workflow.exportName, workflow.data);
    updated.push(ownerId);
  }
  for (const operation of context.operations.values()) {
    const ownerId = `operation:${operation.operationId}`;
    if (!wanted.has(ownerId)) continue;
    operation.data.statusFrontend = status;
    await saveConstDefault(operation.fileInfo, operation.exportName, operation.data);
    updated.push(ownerId);
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

async function hasGeneratedDefs(project: number, page: CfePagePlan): Promise<boolean> {
  const defsExist = [contractFileInfo(project, page), sharedFileInfo(project, page), pageFileInfo(project, page)].every(fileInfo => {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    return !!file && file.status !== 'deleted';
  });
  if (!defsExist) return false;
  const marker = await readJsonFile(pageCreateMarkerFileInfo(project, page));
  return isRecord(marker) && marker.status === 'done';
}

function contractFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/contracts`, shortName: page.pageId, extension: '.defs.ts' }; }
function sharedFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/shared`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/page11`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageCreateMarkerFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/trace/frontend-create-pages`, shortName: page.pageId, extension: '.json' }; }

function operationFromData(data: Record<string, unknown>, fileInfo: FileInfo, exportName: string): CfeOperationDef | null {
  const operationId = readString(data.operationId);
  if (!operationId) return null;
  return { operationId, title: readString(data.title) || humanizeId(operationId), actor: readString(data.actor), entity: normalizeEntityRef(readString(data.entity)), kind: readString(data.kind), reads: readStringArray(data.reads), writes: readStringArray(data.writes), rulesApplied: readStringArray(data.rulesApplied), statusFrontend: readString(data.statusFrontend), capability: isRecord(data.capability) ? data.capability : undefined, moduleName: '', fileInfo, exportName, data };
}

function syntheticOperation(page: CfePagePlan, operationId: string, project: number): CfeOperationDef {
  const entity = page.entityIds[0] || '';
  const kind = inferOperationKind(operationId);
  return {
    operationId,
    title: humanizeId(operationId),
    actor: page.actorIds[0] || 'user',
    entity,
    kind,
    reads: entity ? [entity] : [],
    writes: kind === 'query' || kind === 'view' ? [] : (entity ? [entity] : []),
    rulesApplied: page.rulesApplied,
    statusFrontend: 'synthetic',
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
  return { workflowId, title: readString(data.title) || humanizeId(workflowId), actors: readStringArray(data.actors), operationIds: readStringArray(data.operationIds), entities: normalizeEntityRefs(readStringArray(data.entities)), rulesApplied: readStringArray(data.rulesApplied), statusFrontend: readString(data.statusFrontend), capabilities: Array.isArray(data.capabilities) ? data.capabilities.filter(isRecord) : [], moduleName: '', fileInfo, exportName, data };
}

function entityFromData(data: Record<string, unknown>, fallbackId: string): CfeEntityDef | null {
  const entityId = readString(data.entityId) || fallbackId;
  if (!entityId) return null;
  const fields = Array.isArray(data.fields) ? data.fields.filter(isRecord).map(field => ({ fieldId: readString(field.fieldId), type: readString(field.type), required: field.required === true, description: readString(field.description), enum: readStringArray(field.enum) })).filter(field => field.fieldId) : [];
  return { entityId, title: readString(data.title) || humanizeId(entityId), fields, rulesApplied: readStringArray(data.rulesApplied), statusEnum: readStringArray(data.statusEnum), lifecycleStates: readStringArray(data.lifecycleStates) };
}

function queryInput(operation: CfeOperationDef, entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  const explicit = explicitEntityFieldNames(operation.reads, entity.entityId);
  const fields = entity.fields.filter(field => explicit.size > 0 ? explicit.has(field.fieldId) && isLikelyQueryFilterField(field.fieldId) : isLikelyQueryFilterField(field.fieldId));
  return fields.slice(0, 6).map(field => contractFieldFromEntityField(entity, field, { required: false }));
}
function queryOutput(operation: CfeOperationDef, entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  const explicit = explicitEntityFieldNames(operation.reads, entity.entityId);
  const fields = explicit.size > 0 ? entity.fields.filter(field => explicit.has(field.fieldId)) : entity.fields.slice(0, 8);
  return fields.slice(0, 12).map(field => contractFieldFromEntityField(entity, field, { includeRequired: false }));
}
function commandInput(operation: CfeOperationDef, entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  const explicitFields = explicitEntityFieldNames(operation.writes, entity.entityId);
  const hasExplicit = explicitFields.size > 0;
  const isCreate = operation.kind === 'create';
  return entity.fields.filter(field => !isSystemField(field.fieldId)).filter(field => !hasExplicit || explicitFields.has(field.fieldId)).filter(field => !isCreate || !isLikelyIdField(field.fieldId)).slice(0, 10).map(field => contractFieldFromEntityField(entity, field, { required: field.required === true && !isLikelyIdField(field.fieldId) }));
}
function commandOutput(entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  const idField = entity.fields.find(field => isLikelyIdField(field.fieldId)) || entity.fields[0];
  return idField ? [contractFieldFromEntityField(entity, idField, { includeRequired: false })] : [];
}

function contractFieldFromEntityField(entity: CfeEntityDef, field: CfeFieldDef, options: { required?: boolean; includeRequired?: boolean } = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: field.fieldId,
    type: toFrontendType(field.type),
    sourceEntity: entity.entityId,
    sourceField: field.fieldId,
  };
  if (options.includeRequired !== false) out.required = options.required ?? (field.required === true);
  const enumValues = field.enum?.length ? field.enum : (field.fieldId === 'status' ? entity.statusEnum : []);
  if (enumValues.length > 0) out.enum = enumValues;
  if (field.fieldId === 'status' && entity.lifecycleStates.length > 0) out.lifecycleStates = entity.lifecycleStates;
  if (field.description) out.description = field.description;
  if (field.type && field.type !== toFrontendType(field.type)) out.sourceType = field.type;
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
  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}

async function saveConstDefault(fileInfo: FileInfo, exportName: string, data: unknown): Promise<void> {
  const header = `/// <mls fileReference="${toDisplayRef(fileInfo)}" enhancement="_blank"/>\n\n`;
  await saveStorContent(fileInfo, `${header}export const ${exportName} = ${JSON.stringify(data, null, 2)} as const;\n\nexport default ${exportName};\n`);
}

function createBaseConfig(project: number): Record<string, unknown> {
  return {
    defaultProjectId: String(project),
    shellTemplates: { spa: './_102033_/l2/shared/spa/index.html', pwa: './_102033_/l2/shared/pwa/index.html' },
    publication: { defaultTarget: 'web', targets: { web: { assetBaseUrl: '', serveStaticFromServer: true, minify: false, sourcemap: true } } },
    clientShell: { mode: 'spa', activeProfile: 'production', regions: { aside: { activeProfile: 'defaultAura', profiles: { defaultAura: { renderer: { entrypoint: '/_102033_/l2/shared/layout/aura-aside.js', source: '../mls-102033/l2/shared/layout/aura-aside.ts', tag: 'collab-aura-aside' }, widthPx: 280 } } } } },
    projects: { '102027': { root: '../mls-102027', type: 'lib' }, '102029': { root: '../mls-102029', type: 'lib' }, '102033': { root: '../mls-102033', type: 'master frontend' }, '102034': { root: '../mls-102034', type: 'master backend' }, [String(project)]: { root: '.', type: 'client', modules: [] } },
  };
}

function ensureModule(modules: Map<string, { moduleName: string; visualStyle?: unknown; entityIds: Set<string> }>, moduleName: string): { moduleName: string; visualStyle?: unknown; entityIds: Set<string> } { const existing = modules.get(moduleName); if (existing) return existing; const created = { moduleName, entityIds: new Set<string>() }; modules.set(moduleName, created); return created; }
function ensureRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> { if (!isRecord(parent[key])) parent[key] = {}; return parent[key] as Record<string, unknown>; }
function ensureArray(parent: Record<string, unknown>, key: string): Record<string, unknown>[] { if (!Array.isArray(parent[key])) parent[key] = []; return parent[key] as Record<string, unknown>[]; }
function upsertByKey(items: Record<string, unknown>[], key: string, value: string): Record<string, unknown> { let item = items.find(candidate => candidate[key] === value); if (!item) { item = { [key]: value }; items.push(item); } return item; }
function toDisplayRef(fileInfo: FileInfo): string { const folder = fileInfo.folder ? `${fileInfo.folder}/` : ''; return `_${fileInfo.project}_/l${fileInfo.level}/${folder}${fileInfo.shortName}${fileInfo.extension}`; }
function toFrontendType(type: string): string { const normalized = type.toLowerCase(); if (['number', 'integer', 'decimal', 'money', 'float'].includes(normalized)) return 'number'; if (['boolean', 'bool'].includes(normalized)) return 'boolean'; if (['date', 'datetime', 'time'].includes(normalized)) return 'date'; return 'string'; }
function isSystemField(fieldId: string): boolean { return ['createdat', 'updatedat'].includes(fieldId.toLowerCase()); }
function isLikelyIdField(fieldId: string): boolean { return fieldId.toLowerCase().endsWith('id'); }
function readString(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function readStringArray(value: unknown): string[] { return Array.isArray(value) ? value.map(readString).filter(Boolean) : []; }
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function unique(values: string[]): string[] { return Array.from(new Set(values.filter(Boolean))); }
function toSafeShortName(value: string): string { return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'page'; }
function toKebabCase(value: string): string { return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase(); }
function toPascalCase(value: string): string { return value.split(/[^a-zA-Z0-9]+|(?=[A-Z])/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'Organism'; }
function humanizeId(id: string): string { const spaced = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim(); return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : id; }
