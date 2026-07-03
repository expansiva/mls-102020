/// <mls fileReference="_102020_/l2/agentNewSolution2/agentValidateBehaviorModel.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Deterministic, NON-blocking coverage/integrity report. No LLM. Checks: every
// priority-now capability is owned by exactly one workflow or operation; every entity ref resolves to
// a canonical ontology id (no aggregate names); referenced rules exist; every workflow's orchestrated
// operationIds exist. Writes l4/trace/behavior-health-report.json. Warnings/errors never block the task.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, getActorIdSet, getOntologyEntityIdSet, isKnownEntityRef, isRecord } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { getApprovedModuleName, saveBehaviorHealthReport } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getWorkflowDefinitions } from '/_102020_/l2/agentNewSolution2/agentNs2WorkflowDefinition.js';
import { getOperationDefinitions, type OperationDefinition } from '/_102020_/l2/agentNewSolution2/agentPlanOperationDefinition.js';
import { getJourneyMap, type JourneyMap } from '/_102020_/l2/agentNewSolution2/agentPlanJourneyMap.js';

const AGENT_NAME = 'agentValidateBehaviorModel';

export interface HealthFinding { severity: 'error' | 'warning'; code: string; message: string }
export interface BehaviorHealthReport {
  passed: boolean;
  counts: { entities: number; workflows: number; operations: number; journeyWorkspaces: number };
  errors: HealthFinding[];
  warnings: HealthFinding[];
}

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Deterministic Stage-1 coverage/integrity report (non-blocking)', visibility: 'private', beforePromptStep };
}

// Deterministic — no LLM. Compute, persist, complete.
async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentValidateBehaviorModel] task invalid');
  let summary = 'behavior model validated';
  try {
    const report = await computeBehaviorHealthReport(context);
    await saveBehaviorHealthReport(context, report);
    summary = `passed=${report.passed} errors=${report.errors.length} warnings=${report.warnings.length}`;
  } catch (error) {
    summary = `validation skipped: ${error instanceof Error ? error.message : String(error)}`;
    console.warn(`[${AGENT_NAME}] ${summary}`);
  }
  // Always complete — this report is advisory and must never block finishing the task.
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary)];
}

/** Reusable so the final step can render the same report. Reads workflow/operation/ontology defs
 * from the SAVED l4 files (fan-out payloads are deleted by then). */
export async function computeBehaviorHealthReport(context: mls.msg.ExecutionContext): Promise<BehaviorHealthReport> {
  const fp = getFinalizeOutput(context).result;
  const ontology = await getEnrichedOntology(context);
  const behavior = getBehaviorIndex(context).result;
  const workflowDefs = await getWorkflowDefinitions(context);
  const operationDefs = await getOperationDefinitions(context);
  const journeyMap = await getJourneyMap(context);
  const moduleName = getApprovedModuleName(context) || '';

  const knownEntities = getOntologyEntityIdSet(ontology);
  const knownActors = getActorIdSet(fp.actors);
  const knownRules = new Set<string>();
  for (const rule of (Array.isArray(fp.rules) ? fp.rules : [])) if (isRecord(rule) && typeof rule.ruleId === 'string') knownRules.add(rule.ruleId);
  const operationIds = new Set<string>([...behavior.operations.map(o => o.operationId), ...operationDefs.map(o => o.operationId)]);
  const currentWorkflowIds = new Set<string>(behavior.workflows.map(w => w.workflowId));
  const currentOperationIds = new Set<string>(behavior.operations.map(o => o.operationId));
  for (const w of behavior.workflows) for (const opId of w.operationIds || []) currentOperationIds.add(opId);

  const errors: HealthFinding[] = [];
  const warnings: HealthFinding[] = [];
  const entityRef = (ref: string, where: string) => { if (!isKnownEntityRef(ref, knownEntities)) errors.push({ severity: 'error', code: 'entity.ref.unknown', message: `${where}: unknown entity ref '${ref}'` }); };
  const actorRef = (ref: string, where: string) => { if (ref && knownActors.size > 0 && !knownActors.has(ref)) warnings.push({ severity: 'warning', code: 'actor.unknown', message: `${where}: unknown actor '${ref}'` }); };
  const ruleRefs = (refs: string[], where: string) => { for (const r of refs) if (knownRules.size > 0 && !knownRules.has(r)) warnings.push({ severity: 'warning', code: 'rule.unknown', message: `${where}: unknown rule '${r}'` }); };

  // Capability coverage. A capability is "realized" if any workflow OR operation owns it (count===0 →
  // now=error / soon|later=warning). For the multiowned signal we DON'T count operations a workflow
  // orchestrates: by design (item 2) those share their workflow's capability, so a workflow + its child
  // operations is ONE owner — only 2+ distinct behaviors (e.g. two workflows) is a real ambiguity.
  const orchestratedOps = new Set<string>();
  for (const w of behavior.workflows) for (const opId of (w.operationIds || [])) orchestratedOps.add(opId);
  const owned = new Set<string>();
  const primaryOwnerCount = new Map<string, number>();
  for (const w of behavior.workflows) for (const c of w.capabilityIds) { owned.add(c); primaryOwnerCount.set(c, (primaryOwnerCount.get(c) || 0) + 1); }
  for (const o of behavior.operations) { owned.add(o.capabilityId); if (!orchestratedOps.has(o.operationId)) primaryOwnerCount.set(o.capabilityId, (primaryOwnerCount.get(o.capabilityId) || 0) + 1); }
  for (const cap of fp.capabilities as { capabilityId?: string; priority?: string }[]) {
    if (cap.priority === 'never' || !cap.capabilityId) continue;
    if (!owned.has(cap.capabilityId)) {
      if (cap.priority === 'now') errors.push({ severity: 'error', code: 'capability.unowned', message: `capability '${cap.capabilityId}' (now) is not owned by any workflow or operation` });
      else warnings.push({ severity: 'warning', code: 'capability.unowned.deferred', message: `capability '${cap.capabilityId}' (${cap.priority}) is not owned by any workflow or operation` });
    } else {
      const owners = primaryOwnerCount.get(cap.capabilityId) || 0;
      if (owners > 1) warnings.push({ severity: 'warning', code: 'capability.multiowned', message: `capability '${cap.capabilityId}' is owned by ${owners} distinct behaviors (excluding workflow-orchestrated operations)` });
    }
  }

  // Workflow integrity.
  for (const w of workflowDefs) {
    actorRef(w.story?.actor, `workflow ${w.workflowId}`);
    if (currentWorkflowIds.has(w.workflowId) && !w.pageId) errors.push({ severity: 'error', code: 'workflow.pageId.missing', message: `workflow ${w.workflowId}: missing canonical pageId` });
    // A workflow is pure orchestration: it generates NO backend command of its own, so it MUST be
    // realized by member operations. A workflow with no operations cannot be executed by the backend.
    if (currentWorkflowIds.has(w.workflowId) && (!w.operationIds || w.operationIds.length === 0)) {
      errors.push({ severity: 'error', code: 'workflow.operations.missing', message: `workflow ${w.workflowId}: has no orchestrated operations — it generates no command and cannot be realized; add the operations that carry its steps` });
    }
    for (const a of w.actors) actorRef(a, `workflow ${w.workflowId}`);
    for (const e of w.entities) entityRef(e, `workflow ${w.workflowId}`);
    ruleRefs(w.rulesApplied, `workflow ${w.workflowId}`);
    for (const opId of w.operationIds) if (!operationIds.has(opId)) errors.push({ severity: 'error', code: 'workflow.operation.unknown', message: `workflow ${w.workflowId}: orchestrated operation '${opId}' does not exist` });
  }

  // Operation integrity.
  for (const o of operationDefs) {
    actorRef(o.actor, `operation ${o.operationId}`);
    entityRef(o.entity, `operation ${o.operationId}`);
    for (const r of [...o.reads, ...o.writes]) entityRef(stripField(r), `operation ${o.operationId}`);
    ruleRefs(o.rulesApplied, `operation ${o.operationId}`);
    validateOperationContract(o, knownEntities, errors, warnings);
    if (currentOperationIds.has(o.operationId)) validateBffNaming(o, moduleName, errors);
  }

  validateJourneyContract(journeyMap, workflowDefs, operationDefs, currentOperationIds, knownActors, errors, warnings);

  // Fan-out completeness: a defined artifact per classified behavior.
  const definedWorkflows = new Set(workflowDefs.map(w => w.workflowId));
  for (const w of behavior.workflows) if (!definedWorkflows.has(w.workflowId)) warnings.push({ severity: 'warning', code: 'workflow.undefined', message: `workflow '${w.workflowId}' was classified but has no definition` });
  const definedOps = new Set(operationDefs.map(o => o.operationId));
  for (const o of behavior.operations) if (!definedOps.has(o.operationId)) warnings.push({ severity: 'warning', code: 'operation.undefined', message: `operation '${o.operationId}' was classified but has no definition` });

  return {
    passed: errors.length === 0,
    counts: { entities: knownEntities.size, workflows: workflowDefs.length, operations: operationDefs.length, journeyWorkspaces: journeyMap?.workspaces.length || 0 },
    errors,
    warnings,
  };
}

/** "Entity.field" -> "Entity" for ref resolution. */
function stripField(ref: string): string {
  const dot = ref.indexOf('.');
  return dot > 0 ? ref.slice(0, dot) : ref;
}

function validateBffNaming(operation: { operationId: string; pageId?: string; commandName?: string; bffName?: string }, moduleName: string, errors: HealthFinding[]): void {
  const where = `operation ${operation.operationId}`;
  if (!operation.pageId) errors.push({ severity: 'error', code: 'operation.pageId.missing', message: `${where}: missing pageId for BFF route handoff` });
  if (!operation.commandName) errors.push({ severity: 'error', code: 'operation.commandName.missing', message: `${where}: missing commandName for BFF route handoff` });
  if (!operation.bffName) errors.push({ severity: 'error', code: 'operation.bffName.missing', message: `${where}: missing bffName for BFF route handoff` });
  if (!moduleName || !operation.pageId || !operation.commandName || !operation.bffName) return;
  const expected = `${moduleName}.${operation.pageId}.${operation.commandName}`;
  if (operation.bffName !== expected) {
    errors.push({ severity: 'error', code: 'operation.bffName.mismatch', message: `${where}: bffName '${operation.bffName}' must be '${expected}'` });
  }
}

function validateOperationContract(operation: OperationDefinition, knownEntities: Set<string>, errors: HealthFinding[], warnings: HealthFinding[]): void {
  const where = `operation ${operation.operationId}`;
  const access = isRecord(operation.accessPattern) ? operation.accessPattern : null;
  if (!access) {
    errors.push({ severity: 'error', code: 'operation.accessPattern.missing', message: `${where}: missing accessPattern` });
  } else {
    const kind = typeof access.kind === 'string' ? access.kind : '';
    if (!['list', 'getById', 'lookup', 'commandInput'].includes(kind)) errors.push({ severity: 'error', code: 'operation.accessPattern.kind.invalid', message: `${where}: invalid accessPattern.kind '${kind}'` });
    if ((operation.kind === 'query' || operation.kind === 'view') && kind === 'commandInput') {
      errors.push({ severity: 'error', code: 'operation.accessPattern.query.invalid', message: `${where}: query/view must declare list, getById or lookup access, not commandInput` });
    }
    if (typeof access.entity === 'string' && !isKnownEntityRef(stripField(access.entity), knownEntities)) errors.push({ severity: 'error', code: 'operation.accessPattern.entity.unknown', message: `${where}: accessPattern entity '${access.entity}' does not resolve` });
    if (typeof access.keyField === 'string' && !isKnownEntityRef(stripField(access.keyField), knownEntities)) errors.push({ severity: 'error', code: 'operation.accessPattern.key.unknown', message: `${where}: accessPattern keyField '${access.keyField}' does not resolve` });
  }

  const inputs = Array.isArray(operation.inputs) ? operation.inputs : null;
  if (!inputs) {
    errors.push({ severity: 'error', code: 'operation.inputs.missing', message: `${where}: missing inputs[]` });
  } else {
    for (const input of inputs) {
      if (!isRecord(input)) continue;
      const inputId = typeof input.inputId === 'string' ? input.inputId : '';
      const fieldRef = typeof input.fieldRef === 'string' ? input.fieldRef : '';
      const source = typeof input.source === 'string' ? input.source : '';
      if (!inputId) errors.push({ severity: 'error', code: 'operation.input.id.missing', message: `${where}: input without inputId` });
      if (!fieldRef || !isKnownEntityRef(stripField(fieldRef), knownEntities)) errors.push({ severity: 'error', code: 'operation.input.field.unknown', message: `${where}: input '${inputId || '?'}' fieldRef '${fieldRef}' does not resolve` });
      if (!isKnownContextSource(source)) errors.push({ severity: 'error', code: 'operation.input.source.invalid', message: `${where}: input '${inputId || '?'}' has invalid source '${source}'` });
      if (input.required === true && source === 'userInput' && isIdentifierRef(inputId || fieldRef)) {
        errors.push({ severity: 'error', code: 'operation.input.requiredId.manual', message: `${where}: required identifier input '${inputId || fieldRef}' cannot be plain userInput; resolve it from route, selection, workflow or context` });
      }
    }
  }

  const contexts = Array.isArray(operation.contextResolution) ? operation.contextResolution : null;
  if (!contexts) {
    errors.push({ severity: 'error', code: 'operation.contextResolution.missing', message: `${where}: missing contextResolution[]` });
  } else {
    for (const ctx of contexts) {
      if (!isRecord(ctx)) continue;
      const fieldRef = typeof ctx.fieldRef === 'string' ? ctx.fieldRef : '';
      const source = typeof ctx.source === 'string' ? ctx.source : '';
      if (!fieldRef || !isKnownEntityRef(stripField(fieldRef), knownEntities)) errors.push({ severity: 'error', code: 'operation.context.field.unknown', message: `${where}: context fieldRef '${fieldRef}' does not resolve` });
      if (!isKnownContextSource(source)) errors.push({ severity: 'error', code: 'operation.context.source.invalid', message: `${where}: context source '${source}' is invalid` });
      if (source === 'userInput') warnings.push({ severity: 'warning', code: 'operation.context.userInput', message: `${where}: contextResolution '${fieldRef}' should usually be runtime context, not userInput` });
    }
  }
}

function validateJourneyContract(
  journey: JourneyMap | null,
  workflows: { workflowId: string; actors: string[]; capabilities?: { priority?: string }[] }[],
  operations: OperationDefinition[],
  currentOperationIds: Set<string>,
  knownActors: Set<string>,
  errors: HealthFinding[],
  warnings: HealthFinding[],
): void {
  if (!journey) {
    errors.push({ severity: 'error', code: 'journey.missing', message: 'missing l4 journey map; Stage 1 must produce l4/{module}/journeys/{module}Journeys.defs.ts' });
    return;
  }

  const operationById = new Map(operations.map(operation => [operation.operationId, operation]));
  const workspaceIds = new Set<string>();
  const landingActors = new Set<string>();
  const reachableOperationIds = new Set<string>();

  for (const landing of journey.landings || []) {
    if (!knownActors.has(landing.actor)) warnings.push({ severity: 'warning', code: 'journey.landing.actor.unknown', message: `journey landing '${landing.workspaceId}': unknown actor '${landing.actor}'` });
    landingActors.add(landing.actor);
  }

  for (const workspace of journey.workspaces || []) {
    if (workspaceIds.has(workspace.workspaceId)) errors.push({ severity: 'error', code: 'journey.workspace.duplicate', message: `journey workspace '${workspace.workspaceId}' is duplicated` });
    workspaceIds.add(workspace.workspaceId);
    if (!knownActors.has(workspace.actor)) warnings.push({ severity: 'warning', code: 'journey.workspace.actor.unknown', message: `journey workspace '${workspace.workspaceId}': unknown actor '${workspace.actor}'` });
    if (workspace.kind === 'entityManagement' && !workspace.entity) warnings.push({ severity: 'warning', code: 'journey.entityManagement.entity.missing', message: `journey workspace '${workspace.workspaceId}': entityManagement should declare entity` });
    for (const operationId of workspace.operationIds || []) {
      reachableOperationIds.add(operationId);
      const operation = operationById.get(operationId);
      if (!operation) errors.push({ severity: 'error', code: 'journey.operation.unknown', message: `journey workspace '${workspace.workspaceId}': unknown operation '${operationId}'` });
      else if (operation.actor !== workspace.actor) warnings.push({ severity: 'warning', code: 'journey.workspace.authorization', message: `journey workspace '${workspace.workspaceId}': operation '${operationId}' actor '${operation.actor}' differs from workspace actor '${workspace.actor}'` });
    }
  }

  for (const landing of journey.landings || []) {
    if (!workspaceIds.has(landing.workspaceId)) errors.push({ severity: 'error', code: 'journey.landing.workspace.unknown', message: `journey landing for actor '${landing.actor}' points to unknown workspace '${landing.workspaceId}'` });
  }

  for (const edge of journey.navigationEdges || []) {
    if (!workspaceIds.has(edge.from)) errors.push({ severity: 'error', code: 'journey.edge.from.unknown', message: `journey edge '${edge.from}' -> '${edge.to}': source workspace does not exist` });
    if (!workspaceIds.has(edge.to)) errors.push({ severity: 'error', code: 'journey.edge.to.unknown', message: `journey edge '${edge.from}' -> '${edge.to}': target workspace does not exist` });
    if (edge.operationId) {
      reachableOperationIds.add(edge.operationId);
      if (!operationById.has(edge.operationId)) errors.push({ severity: 'error', code: 'journey.edge.operation.unknown', message: `journey edge '${edge.from}' -> '${edge.to}': unknown operation '${edge.operationId}'` });
    }
    for (const data of edge.data || []) if (!isKnownContextSource(data.source)) errors.push({ severity: 'error', code: 'journey.edge.data.source.invalid', message: `journey edge '${edge.from}' -> '${edge.to}': invalid data source '${data.source}'` });
  }

  const inputResolutions = new Set((journey.inputResolutions || []).map(item => `${item.operationId}:${item.inputId}`));
  for (const resolution of journey.inputResolutions || []) {
    if (!operationById.has(resolution.operationId)) errors.push({ severity: 'error', code: 'journey.input.operation.unknown', message: `journey inputResolution '${resolution.operationId}.${resolution.inputId}': unknown operation` });
    if (!isKnownContextSource(resolution.source)) errors.push({ severity: 'error', code: 'journey.input.source.invalid', message: `journey inputResolution '${resolution.operationId}.${resolution.inputId}': invalid source '${resolution.source}'` });
  }

  for (const operation of operations) {
    if (!currentOperationIds.has(operation.operationId)) continue;
    const priority = operation.capability?.priority;
    const mustBeReachable = !priority || priority === 'now';
    if (mustBeReachable && !reachableOperationIds.has(operation.operationId)) errors.push({ severity: 'error', code: 'journey.operation.unreachable', message: `operation '${operation.operationId}' (${priority || 'unknown priority'}) is not reachable from any journey workspace/edge` });
    if (mustBeReachable && operation.actor && !landingActors.has(operation.actor)) errors.push({ severity: 'error', code: 'journey.actor.landing.missing', message: `actor '${operation.actor}' owns now behavior but has no journey landing` });
    for (const input of operation.inputs || []) {
      if (!input.required || !isIdentifierRef(input.inputId || input.fieldRef) || input.source === 'userInput') continue;
      if (!inputResolutions.has(`${operation.operationId}:${input.inputId}`)) warnings.push({ severity: 'warning', code: 'journey.input.resolution.missing', message: `operation '${operation.operationId}' required identifier '${input.inputId}' has source '${input.source}' but no journey inputResolution row` });
    }
  }

  for (const workflow of workflows) {
    const priority = (workflow.capabilities || []).find(cap => cap.priority)?.priority;
    if (priority && priority !== 'now') continue;
    for (const actor of workflow.actors || []) if (actor && !landingActors.has(actor)) errors.push({ severity: 'error', code: 'journey.actor.landing.missing', message: `actor '${actor}' owns now workflow '${workflow.workflowId}' but has no journey landing` });
  }
}

function isKnownContextSource(value: string): boolean {
  return ['userInput', 'actorSession', 'currentWorkspace', 'selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault'].includes(value);
}

function isIdentifierRef(value: string): boolean {
  const last = (value.split('.').pop() || value).toLowerCase();
  return last === 'id' || last.endsWith('id') || last.endsWith('_id') || last.endsWith('-id');
}
