/// <mls fileReference="_102020_/l2/agentChangeFrontend/cfeCreateShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile } from '/_102027_/l2/libStor.js';

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;
type OwnerStatus = 'toCreate' | 'toUpdate' | 'toRemove' | 'inProgress' | 'done';

interface CfeFieldDef { fieldId: string; type: string; required?: boolean; enum?: string[] }
interface CfeEntityDef { entityId: string; title: string; fields: CfeFieldDef[]; rulesApplied: string[] }

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
  const context = await readCreateContext();
  const operations = page.operationIds.map(id => context.operations.get(id) || syntheticOperation(page, id, context.project));
  const commands = operations.map(operation => commandFromOperation(operation, context.entities));
  const navigationRefs: unknown[] = [];

  await saveFrontendDefs(contractFileInfo(context.project, page), 'definition', commands, contractPipeline(context.project, page));
  await saveFrontendDefs(sharedFileInfo(context.project, page), 'definition', { bffCommands: commands, navigationRefs }, sharedPipeline(context.project, page, commands));
  await saveFrontendDefs(pageFileInfo(context.project, page), 'definition', pageDefinition(page, operations), pagePipeline(context.project, page, context.moduleVisualStyle[page.moduleName]));
}

export async function finalizeGeneratedPages(): Promise<{ pagesDone: string[]; ownersDone: string[]; skippedPages: string[] }> {
  const context = await readCreateContext();
  const validPages = context.pages.filter(page => hasGeneratedDefs(context.project, page));
  const skippedPages = context.pages.filter(page => !hasGeneratedDefs(context.project, page)).map(page => page.pageId);
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
    input: kind === 'query' ? queryInput(entity) : commandInput(operation, entity),
    output: kind === 'query' ? queryOutput(entity) : commandOutput(entity),
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
  return [{ id: `${page.pageId}__l2_contract`, type: 'l2_contract', outputPath: `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`, defPath: `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.defs.ts`, dependsFiles: [], dependsOn: [], skills: ['_102020_/l2/agentMaterializeSolution/skills/genContract.ts'], agent: 'agentMaterializeGen' }];
}

function sharedPipeline(project: number, page: CfePagePlan, commands: Record<string, unknown>[]): unknown[] {
  return [{ id: `${page.pageId}__l2_shared`, type: 'l2_shared', outputPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`, defPath: `_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.defs.ts`, dependsFiles: [`_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`], dependsOn: [], skills: ['/_102020_/l2/agentMaterializeSolution/skills/genPageShared.ts'], rulesApplied: unique(commands.flatMap(command => Array.isArray(command.rulesApplied) ? command.rulesApplied.map(String) : [])), agent: 'agentMaterializeGen' }];
}

function pagePipeline(project: number, page: CfePagePlan, visualStyle: unknown): unknown[] {
  return [{ id: `${page.pageId}__l2_page`, type: 'l2_page', outputPath: `_${project}_/l2/${page.moduleName}/web/desktop/page11/${page.pageId}.ts`, defPath: `_${project}_/l2/${page.moduleName}/web/desktop/page11/${page.pageId}.defs.ts`, dependsFiles: [`_${project}_/l2/${page.moduleName}/web/shared/${page.pageId}.ts`, `_${project}_/l2/${page.moduleName}/web/contracts/${page.pageId}.ts`], dependsOn: [], skills: ['_102020_/l2/agentMaterializeSolution/skills/genPageRender.ts', '_102020_/l2/agentMaterializeSolution/skills/genPageDS.ts'], afterSaveFrontEnd: '_102020_/l2/agentMaterializeSolution/registerFrontEnd.ts?registerPage', visualStyle: typeof visualStyle === 'string' ? { description: visualStyle } : (isRecord(visualStyle) ? visualStyle : {}), agent: 'agentMaterializeGen' }];
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

function hasGeneratedDefs(project: number, page: CfePagePlan): boolean {
  return [contractFileInfo(project, page), sharedFileInfo(project, page), pageFileInfo(project, page)].every(fileInfo => {
    const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
    return !!file && file.status !== 'deleted';
  });
}

function contractFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/contracts`, shortName: page.pageId, extension: '.defs.ts' }; }
function sharedFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/shared`, shortName: page.pageId, extension: '.defs.ts' }; }
function pageFileInfo(project: number, page: CfePagePlan): FileInfo { return { project, level: 2, folder: `${page.moduleName}/web/desktop/page11`, shortName: page.pageId, extension: '.defs.ts' }; }

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
  const fields = Array.isArray(data.fields) ? data.fields.filter(isRecord).map(field => ({ fieldId: readString(field.fieldId), type: readString(field.type), required: field.required === true, enum: readStringArray(field.enum) })).filter(field => field.fieldId) : [];
  return { entityId, title: readString(data.title) || humanizeId(entityId), fields, rulesApplied: readStringArray(data.rulesApplied) };
}

function queryInput(entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  return entity.fields.filter(field => ['status', 'name', 'title', 'type', 'category'].some(token => field.fieldId.toLowerCase().includes(token))).slice(0, 4).map(field => ({ name: field.fieldId, type: toFrontendType(field.type), required: false }));
}
function queryOutput(entity?: CfeEntityDef): unknown[] { return entity ? entity.fields.slice(0, 8).map(field => ({ name: field.fieldId, type: toFrontendType(field.type) })) : []; }
function commandInput(operation: CfeOperationDef, entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  const explicitFields = new Set(fieldRefs(operation.writes).filter(ref => ref.startsWith(`${entity.entityId}.`)).map(ref => ref.split('.')[1]));
  const hasExplicit = explicitFields.size > 0;
  const isCreate = operation.kind === 'create';
  return entity.fields.filter(field => !isSystemField(field.fieldId)).filter(field => !hasExplicit || explicitFields.has(field.fieldId)).filter(field => !isCreate || !isLikelyIdField(field.fieldId)).slice(0, 10).map(field => ({ name: field.fieldId, type: toFrontendType(field.type), required: field.required === true && !isLikelyIdField(field.fieldId) }));
}
function commandOutput(entity?: CfeEntityDef): unknown[] {
  if (!entity) return [];
  const idField = entity.fields.find(field => isLikelyIdField(field.fieldId)) || entity.fields[0];
  return idField ? [{ name: idField.fieldId, type: toFrontendType(idField.type) }] : [];
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
