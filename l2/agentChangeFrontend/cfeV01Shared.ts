/// <mls fileReference="_102020_/l2/agentChangeFrontend/cfeV01Shared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';

type ExecutionMode = 'sequential' | 'parallel_static' | 'parallel_dynamic' | 'manual_later';

export interface CfeV01Owner {
  kind: 'workflow' | 'operation';
  id: string;
  title: string;
  statusFrontend: string;
  moduleName: string;
  actorIds: string[];
  entityIds: string[];
  operationIds: string[];
}

export interface CfeV01PageCandidate {
  pageId: string;
  pageTitle: string;
  moduleName: string;
  sourceKind: 'workflow' | 'operation';
  ownerIds: string[];
  actorIds: string[];
  entityIds: string[];
  operationIds: string[];
}

export interface CfeV01ScanResult {
  project: number;
  moduleNames: string[];
  workflows: CfeV01Owner[];
  operations: CfeV01Owner[];
  pages: CfeV01PageCandidate[];
}

export interface CfeV01StepArgs {
  page?: CfeV01PageCandidate;
  phase?: 'page' | 'contract' | 'shared' | 'layout' | 'config' | 'final';
  scan?: Pick<CfeV01ScanResult, 'project' | 'moduleNames'> & { pageCount: number; ownerCount: number };
}

interface ModuleInfo {
  moduleName: string;
  entityIds: Set<string>;
}

export async function readCreateScanResult(): Promise<CfeV01ScanResult> {
  const project = mls.actualProject || 0;
  const modules = new Map<string, ModuleInfo>();
  const entityToModule = new Map<string, string>();
  const rawWorkflows: Record<string, unknown>[] = [];
  const rawOperations: Record<string, unknown>[] = [];

  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 4 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const folder = String(file.folder || '');
    const shortName = String(file.shortName || '');
    const parsed = parseDefsSource(String(await file.getContent()));
    if (!isRecord(parsed)) continue;

    if (folder === 'workflows') rawWorkflows.push(parsed);
    else if (folder === 'operations') rawOperations.push(parsed);
    else if (shortName === 'module' && folder && !folder.includes('/')) {
      const moduleData = isRecord(parsed.module) ? parsed.module : parsed;
      const moduleName = readString(moduleData.moduleName) || folder;
      ensureModule(modules, moduleName);
    } else if (folder.endsWith('/ontology')) {
      const moduleName = folder.split('/')[0];
      const entityId = readString(parsed.entityId) || shortName;
      if (moduleName && entityId) {
        ensureModule(modules, moduleName).entityIds.add(entityId);
        entityToModule.set(entityId, moduleName);
      }
    }
  }

  const moduleNames = Array.from(modules.keys()).sort();
  const moduleFallback = moduleNames.length === 1 ? moduleNames[0] : 'unknown';
  const workflows = rawWorkflows.map(item => ownerFromWorkflow(item, entityToModule, moduleFallback)).filter(Boolean) as CfeV01Owner[];
  const operations = rawOperations.map(item => ownerFromOperation(item, entityToModule, moduleFallback)).filter(Boolean) as CfeV01Owner[];
  const pages = buildPageCandidates(workflows, operations);

  return { project, moduleNames, workflows, operations, pages };
}

export function createUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
): mls.msg.AgentIntentUpdateStatus {
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

export function createAgentStepPayload(
  planId: string,
  agentName: string,
  stepTitle: string,
  args: CfeV01StepArgs,
  dependsOn: string[],
  executionMode: ExecutionMode,
  nextSteps: mls.msg.AIPayload[] = [],
  status: mls.msg.AIStepStatus = 'waiting_dependency',
): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle,
    status,
    nextSteps,
    agentName,
    prompt: JSON.stringify(args),
    rags: [],
    planning: {
      planId,
      dependsOn,
      executionMode,
      executionHost: 'client',
    },
  } as any;
}

export function createAddStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

export function createParallelAgentStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  planId: string,
  agentName: string,
  stepTitle: string,
  args: string[],
  maxParallel = 5,
): mls.msg.AgentIntentAddStep {
  const step = createAgentStepPayload(
    planId,
    agentName,
    stepTitle,
    { phase: 'page' },
    [],
    'parallel_dynamic',
    [],
    'in_progress',
  );
  step.interaction = {
    input: [{ type: 'system', content: '<!-- modelType: codefast -->' }],
    cost: 0,
    trace: [`queued ${args.length} parallel args for ${agentName}`],
    payload: null,
  };
  return {
    ...createAddStepIntent(context, parentStep, step),
    executionMode: { type: 'parallel', args, maxParallel },
  };
}

export function parseStepArgs(prompt: string | undefined): CfeV01StepArgs {
  if (!prompt) return {};
  const parsed = JSON.parse(prompt);
  return isRecord(parsed) ? parsed as CfeV01StepArgs : {};
}

export function pagePlanId(page: CfeV01PageCandidate): string {
  return `v01-page:${toSafeId(page.pageId)}`;
}

export function phasePlanId(phase: NonNullable<CfeV01StepArgs['phase']>, page: CfeV01PageCandidate): string {
  return `v01-${phase}:${toSafeId(page.pageId)}`;
}

export function logPrefix(agent: IAgentMeta | { agentName: string }): string {
  return `[${agent.agentName} v0.1]`;
}

function buildPageCandidates(workflows: CfeV01Owner[], operations: CfeV01Owner[]): CfeV01PageCandidate[] {
  const pendingWorkflows = workflows.filter(owner => owner.statusFrontend === 'toCreate');
  const pendingOperations = operations.filter(owner => owner.statusFrontend === 'toCreate');
  const operationById = new Map(pendingOperations.map(owner => [owner.id, owner]));
  const operationIdsUsedByWorkflow = new Set<string>();
  const pages: CfeV01PageCandidate[] = [];

  for (const workflow of pendingWorkflows) {
    for (const operationId of workflow.operationIds) operationIdsUsedByWorkflow.add(operationId);
    const linkedOperations = workflow.operationIds.map(id => operationById.get(id)).filter(Boolean) as CfeV01Owner[];
    const actorIds = unique([...workflow.actorIds, ...linkedOperations.flatMap(owner => owner.actorIds)]);
    const entityIds = unique([...workflow.entityIds, ...linkedOperations.flatMap(owner => owner.entityIds)]);
    pages.push({
      pageId: toSafeId(workflow.id),
      pageTitle: workflow.title || workflow.id,
      moduleName: workflow.moduleName,
      sourceKind: 'workflow',
      ownerIds: unique([`workflow:${workflow.id}`, ...linkedOperations.map(owner => `operation:${owner.id}`)]),
      actorIds,
      entityIds,
      operationIds: unique([...workflow.operationIds, ...linkedOperations.map(owner => owner.id)]),
    });
  }

  for (const operation of pendingOperations) {
    if (operationIdsUsedByWorkflow.has(operation.id)) continue;
    pages.push({
      pageId: toSafeId(operation.id),
      pageTitle: operation.title || operation.id,
      moduleName: operation.moduleName,
      sourceKind: 'operation',
      ownerIds: [`operation:${operation.id}`],
      actorIds: operation.actorIds,
      entityIds: operation.entityIds,
      operationIds: [operation.id],
    });
  }

  return pages.sort((a, b) => `${a.moduleName}:${a.pageId}`.localeCompare(`${b.moduleName}:${b.pageId}`));
}

function ownerFromWorkflow(item: Record<string, unknown>, entityToModule: Map<string, string>, fallbackModule: string): CfeV01Owner | null {
  const id = readString(item.workflowId);
  if (!id) return null;
  const entities = normalizeEntityRefs(readStringArray(item.entities));
  const actorIds = readStringArray(item.actors);
  return {
    kind: 'workflow',
    id,
    title: readString(item.title) || id,
    statusFrontend: readString(item.statusFrontend) || '',
    moduleName: inferModule(entities, entityToModule, fallbackModule),
    actorIds,
    entityIds: entities,
    operationIds: readStringArray(item.operationIds),
  };
}

function ownerFromOperation(item: Record<string, unknown>, entityToModule: Map<string, string>, fallbackModule: string): CfeV01Owner | null {
  const id = readString(item.operationId);
  if (!id) return null;
  const entities = normalizeEntityRefs([
    readString(item.entity),
    ...readStringArray(item.reads),
    ...readStringArray(item.writes),
  ]);
  const actor = readString(item.actor);
  return {
    kind: 'operation',
    id,
    title: readString(item.title) || id,
    statusFrontend: readString(item.statusFrontend) || '',
    moduleName: inferModule(entities, entityToModule, fallbackModule),
    actorIds: actor ? [actor] : [],
    entityIds: entities,
    operationIds: [id],
  };
}

function inferModule(entityIds: string[], entityToModule: Map<string, string>, fallbackModule: string): string {
  for (const entityId of entityIds) {
    const moduleName = entityToModule.get(entityId);
    if (moduleName) return moduleName;
  }
  return fallbackModule;
}

function ensureModule(modules: Map<string, ModuleInfo>, moduleName: string): ModuleInfo {
  const existing = modules.get(moduleName);
  if (existing) return existing;
  const created = { moduleName, entityIds: new Set<string>() };
  modules.set(moduleName, created);
  return created;
}

function parseDefsSource(content: string): unknown {
  const start = content.indexOf('= ');
  const end = content.lastIndexOf(' as const;');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start + 2, end));
  } catch {
    return null;
  }
}

function normalizeEntityRefs(values: string[]): string[] {
  return unique(values.map(value => value.split('.')[0]).filter(Boolean));
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toSafeId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
}
