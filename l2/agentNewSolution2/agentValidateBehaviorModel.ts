/// <mls fileReference="_102020_/l2/agentNewSolution2/agentValidateBehaviorModel.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Deterministic coverage/integrity report. No LLM. Checks: every
// priority-now capability is owned by workflows/operations; every entity ref resolves to saved l4
// ontology; referenced rules exist; every workflow's orchestrated operationIds exist; the journey has
// landings/edges/input origins. Writes l4/trace/behavior-health-report.json. Warnings are advisory;
// errors block handoff.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, getActorIdSet, getOntologyEntityIdSet, isKnownEntityRef, isRecord } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { getApprovedModuleName, readModuleRelationships, readOntologyEntities, readOperationDefs, readWorkflowDefs, saveBehaviorHealthReport } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { type WorkflowDefinition } from '/_102020_/l2/agentNewSolution2/agentNs2WorkflowDefinition.js';
import { type OperationDefinition } from '/_102020_/l2/agentNewSolution2/agentPlanOperationDefinition.js';
import { getJourneyMap, type JourneyMap } from '/_102020_/l2/agentNewSolution2/agentPlanJourneyMap.js';
import { collectMdmModelingIssues } from '/_102020_/l2/agentNewSolution2/ns2MdmModeling.js';
import { L4_CONTEXT_ORIGIN_CATALOG } from '/_102029_/l2/runtimeConfigTypes.js';

const AGENT_NAME = 'agentValidateBehaviorModel';

export interface HealthFinding { severity: 'error' | 'warning'; code: string; message: string }
export interface BehaviorHealthReport {
  passed: boolean;
  counts: { plannedEntities: number; savedEntities: number; plannedWorkflows: number; savedWorkflows: number; plannedOperations: number; savedOperations: number; journeyWorkspaces: number };
  errors: HealthFinding[];
  warnings: HealthFinding[];
}

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Deterministic Stage-1 coverage/integrity report (blocking on errors)', visibility: 'private', beforePromptStep };
}

// Deterministic — no LLM. Compute, persist, complete.
async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentValidateBehaviorModel] task invalid');
  let summary = 'behavior model validated';
  try {
    const report = await computeBehaviorHealthReport(context);
    await saveBehaviorHealthReport(context, report);
    summary = `passed=${report.passed} errors=${report.errors.length} warnings=${report.warnings.length}`;
    if (!report.passed) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', summary)];
  } catch (error) {
    summary = `validation failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[${AGENT_NAME}] ${summary}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', summary)];
  }
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary)];
}

/** Reusable so the final step can render the same report. Reads workflow/operation/ontology defs
 * from the SAVED l4 files (fan-out payloads are deleted by then). */
export async function computeBehaviorHealthReport(context: mls.msg.ExecutionContext): Promise<BehaviorHealthReport> {
  const fp = getFinalizeOutput(context).result;
  const behavior = getBehaviorIndex(context).result;
  const moduleName = getApprovedModuleName(context) || '';
  const ontology = moduleName ? await readOntologyEntities(moduleName) : {};
  // Composition map: root entity -> set of children declared `partOf` it (from module relationships).
  const composedChildrenByRoot = new Map<string, Set<string>>();
  for (const rel of moduleName ? await readModuleRelationships(moduleName) : []) {
    if ((typeof rel.type === 'string' ? rel.type : '') !== 'partOf') continue;
    const child = typeof rel.fromEntity === 'string' ? rel.fromEntity : '';
    const rootEntity = typeof rel.toEntity === 'string' ? rel.toEntity : '';
    if (!child || !rootEntity) continue;
    if (!composedChildrenByRoot.has(rootEntity)) composedChildrenByRoot.set(rootEntity, new Set());
    composedChildrenByRoot.get(rootEntity)!.add(child);
  }
  const workflowDefs = (await readWorkflowDefs()).filter(isRecord) as unknown as WorkflowDefinition[];
  const operationDefs = (await readOperationDefs()).filter(isRecord) as unknown as OperationDefinition[];
  const journeyMap = await getJourneyMap(context);

  const knownEntities = getOntologyEntityIdSet(ontology);
  const knownActors = getActorIdSet(fp.actors);
  const knownRules = new Set<string>();
  for (const rule of (Array.isArray(fp.rules) ? fp.rules : [])) if (isRecord(rule) && typeof rule.ruleId === 'string') knownRules.add(rule.ruleId);
  const operationIds = new Set<string>(operationDefs.map(o => o.operationId));
  const currentWorkflowIds = new Set<string>(behavior.workflows.map(w => w.workflowId));
  const currentOperationIds = new Set<string>(behavior.operations.map(o => o.operationId));
  for (const w of behavior.workflows) for (const opId of w.operationIds || []) currentOperationIds.add(opId);

  const errors: HealthFinding[] = [];
  const warnings: HealthFinding[] = [];
  validatePlanDiskDivergence(fp.ontology.entities, behavior, ontology, workflowDefs, operationDefs, errors);
  for (const issue of collectMdmModelingIssues({
    moduleName,
    entities: ontology,
    relationships: moduleName ? await readModuleRelationships(moduleName) : [],
  })) {
    (issue.severity === 'error' ? errors : warnings).push(issue);
  }
  const entityRef = (ref: string, where: string) => { if (!isKnownEntityRef(ref, knownEntities)) errors.push({ severity: 'error', code: 'entity.ref.unknown', message: `${where}: unknown entity ref '${ref}'` }); };
  const actorRef = (ref: string, where: string) => { if (ref && knownActors.size > 0 && !knownActors.has(ref)) warnings.push({ severity: 'warning', code: 'actor.unknown', message: `${where}: unknown actor '${ref}'` }); };
  const ruleRefs = (refs: string[], where: string) => { for (const r of refs) if (knownRules.size > 0 && !knownRules.has(r)) warnings.push({ severity: 'warning', code: 'rule.unknown', message: `${where}: unknown rule '${r}'` }); };

  // Capability coverage. A capability is "realized" if any workflow OR operation owns it (count===0 →
  // now=error / soon|later=warning). For the multiowned signal we DON'T count operations a workflow
  // orchestrates: by design (item 2) those share their workflow's capability, so a workflow + its child
  // operations is ONE owner — only 2+ distinct behaviors (e.g. two workflows) is a real ambiguity.
  const owned = new Set<string>();
  const workspaceIdsByCapability = collectCapabilityWorkspaceIds(journeyMap, workflowDefs, operationDefs);
  for (const w of behavior.workflows) for (const c of w.capabilityIds) owned.add(c);
  for (const o of behavior.operations) owned.add(o.capabilityId);
  for (const cap of fp.capabilities as { capabilityId?: string; priority?: string }[]) {
    if (cap.priority === 'never' || !cap.capabilityId) continue;
    if (!owned.has(cap.capabilityId)) {
      if (cap.priority === 'now') errors.push({ severity: 'error', code: 'capability.unowned', message: `capability '${cap.capabilityId}' (now) is not owned by any workflow or operation` });
      else warnings.push({ severity: 'warning', code: 'capability.unowned.deferred', message: `capability '${cap.capabilityId}' (${cap.priority}) is not owned by any workflow or operation` });
    } else {
      const workspaceIds = workspaceIdsByCapability.get(cap.capabilityId);
      if (workspaceIds && workspaceIds.size > 1) {
        warnings.push({ severity: 'warning', code: 'capability.multiowned', message: `capability '${cap.capabilityId}' is realized across distinct workspaces: ${[...workspaceIds].sort().join(', ')}` });
      }
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
    validateOperationContract(o, ontology, knownEntities, composedChildrenByRoot, journeyMap, errors, warnings);
    if (currentOperationIds.has(o.operationId)) validateBffNaming(o, moduleName, errors);
  }

  validateJourneyContract(journeyMap, workflowDefs, operationDefs, currentOperationIds, ontology, knownEntities, knownActors, errors, warnings);

  // Fan-out completeness: a defined artifact per classified behavior.
  const definedWorkflows = new Set(workflowDefs.map(w => w.workflowId));
  for (const w of behavior.workflows) if (!definedWorkflows.has(w.workflowId)) warnings.push({ severity: 'warning', code: 'workflow.undefined', message: `workflow '${w.workflowId}' was classified but has no definition` });
  const definedOps = new Set(operationDefs.map(o => o.operationId));
  for (const o of behavior.operations) if (!definedOps.has(o.operationId)) warnings.push({ severity: 'warning', code: 'operation.undefined', message: `operation '${o.operationId}' was classified but has no definition` });

  return {
    passed: errors.length === 0,
    counts: {
      plannedEntities: Object.keys(fp.ontology.entities || {}).length,
      savedEntities: knownEntities.size,
      plannedWorkflows: behavior.workflows.length,
      savedWorkflows: workflowDefs.length,
      plannedOperations: currentOperationIds.size,
      savedOperations: operationDefs.length,
      journeyWorkspaces: journeyMap?.workspaces.length || 0,
    },
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

function validatePlanDiskDivergence(
  plannedOntology: Record<string, unknown>,
  behavior: ReturnType<typeof getBehaviorIndex>['result'],
  savedOntology: Record<string, unknown>,
  workflowDefs: WorkflowDefinition[],
  operationDefs: OperationDefinition[],
  errors: HealthFinding[],
): void {
  compareSets('entities', new Set(Object.keys(plannedOntology || {})), new Set(Object.keys(savedOntology || {})), errors);
  compareSets('workflows', new Set(behavior.workflows.map(w => w.workflowId)), new Set(workflowDefs.map(w => w.workflowId)), errors);
  const plannedOps = new Set<string>();
  for (const operation of behavior.operations) plannedOps.add(operation.operationId);
  for (const workflow of behavior.workflows) for (const opId of workflow.operationIds || []) plannedOps.add(opId);
  compareSets('operations', plannedOps, new Set(operationDefs.map(o => o.operationId)), errors);
}

function compareSets(kind: string, planned: Set<string>, saved: Set<string>, errors: HealthFinding[]): void {
  const missing = [...planned].filter(id => id && !saved.has(id)).sort();
  const extra = [...saved].filter(id => id && !planned.has(id)).sort();
  if (missing.length || extra.length) {
    errors.push({
      severity: 'error',
      code: 'plan.disk.divergence',
      message: `${kind}: planned=${planned.size} saved=${saved.size}; missing=[${missing.join(', ')}]; extra=[${extra.join(', ')}]`,
    });
  }
}

function collectCapabilityWorkspaceIds(journey: JourneyMap | null, workflows: WorkflowDefinition[], operations: OperationDefinition[]): Map<string, Set<string>> {
  const capabilityIdsByWorkflow = new Map<string, string[]>();
  const capabilityIdsByOperation = new Map<string, string[]>();
  for (const workflow of workflows) capabilityIdsByWorkflow.set(workflow.workflowId, (workflow.capabilities || []).map(capability => capability.capabilityId).filter(Boolean));
  for (const operation of operations) capabilityIdsByOperation.set(operation.operationId, operation.capability?.capabilityId ? [operation.capability.capabilityId] : []);
  const byCapability = new Map<string, Set<string>>();
  for (const workspace of journey?.workspaces || []) {
    const capabilityIds = new Set<string>();
    if (workspace.workflowId) for (const capabilityId of capabilityIdsByWorkflow.get(workspace.workflowId) || []) capabilityIds.add(capabilityId);
    for (const operationId of workspace.operationIds || []) for (const capabilityId of capabilityIdsByOperation.get(operationId) || []) capabilityIds.add(capabilityId);
    for (const capabilityId of capabilityIds) {
      const workspaceIds = byCapability.get(capabilityId) || new Set<string>();
      workspaceIds.add(workspace.workspaceId);
      byCapability.set(capabilityId, workspaceIds);
    }
  }
  return byCapability;
}

function validateOperationContract(operation: OperationDefinition, ontology: Record<string, unknown>, knownEntities: Set<string>, composedChildrenByRoot: Map<string, Set<string>>, journey: JourneyMap | null, errors: HealthFinding[], warnings: HealthFinding[]): void {
  const where = `operation ${operation.operationId}`;

  // Composition guarantee: a create/update that writes a child entity declared partOf the operation's
  // root must expose that child as a composed input (e.g. items[]), so the BFF is a single command —
  // never a separate "save order" then "save order item". The frontend cannot merge two commands.
  const root = stripField(operation.entity || '');
  const composedChildren = composedChildrenByRoot.get(root);
  if ((operation.kind === 'create' || operation.kind === 'update') && composedChildren && composedChildren.size) {
    const writeEntities = new Set((Array.isArray(operation.writes) ? operation.writes : []).map(stripField));
    const inputEntities = new Set((Array.isArray(operation.inputs) ? operation.inputs : []).map(input => stripField(typeof input.fieldRef === 'string' ? input.fieldRef : '')));
    for (const child of composedChildren) {
      if (writeEntities.has(child) && !inputEntities.has(child)) {
        errors.push({ severity: 'error', code: 'operation.input.compositionMissing', message: `${where}: writes composed child '${child}' (partOf '${root}') but declares no input for it — model it as a composed input (e.g. items[]) so the BFF stays a single command, not a separate save per child` });
      }
    }
  }

  const access = isRecord(operation.accessPattern) ? operation.accessPattern : null;
  if (!access) {
    errors.push({ severity: 'error', code: 'operation.accessPattern.missing', message: `${where}: missing accessPattern` });
  } else {
    const kind = typeof access.kind === 'string' ? access.kind : '';
    if (!['list', 'getById', 'lookup', 'commandInput'].includes(kind)) errors.push({ severity: 'error', code: 'operation.accessPattern.kind.invalid', message: `${where}: invalid accessPattern.kind '${kind}'` });
    if ((operation.kind === 'query' || operation.kind === 'view') && kind === 'commandInput') {
      // A read-only analytical/assistant query may legitimately take a compute input payload
      // (commandInput) — e.g. an AI assistant answering a free-form question. Allowed ONLY when it is
      // not a disguised list or getById: no keyField (else getById) and no filters/sort/pagination/
      // selection (else list/lookup), is read-only (no writes) and actually takes an input. Otherwise
      // it is a mis-classified browse/selector and stays an error (list-vs-get protection preserved).
      const looksLikeBrowse = !!access.keyField
        || (Array.isArray(access.filters) && access.filters.length > 0)
        || (Array.isArray(access.sort) && access.sort.length > 0)
        || (typeof access.pagination === 'string' && access.pagination !== 'none')
        || (typeof access.selection === 'string' && access.selection !== 'none');
      const readOnly = !Array.isArray(operation.writes) || operation.writes.length === 0;
      const hasComputeInput = Array.isArray(operation.inputs) && operation.inputs.length > 0;
      if (looksLikeBrowse || !readOnly || !hasComputeInput) {
        errors.push({ severity: 'error', code: 'operation.accessPattern.query.invalid', message: `${where}: query/view must declare list, getById or lookup access, not commandInput (commandInput on a query is allowed only for a read-only compute/assistant operation with an input payload and no list/getById signals)` });
      }
    }
    if (typeof access.entity === 'string' && !isKnownEntityRef(stripField(access.entity), knownEntities)) errors.push({ severity: 'error', code: 'operation.accessPattern.entity.unknown', message: `${where}: accessPattern entity '${access.entity}' does not resolve` });
    if (typeof access.keyField === 'string' && !isKnownOntologyFieldRef(access.keyField, ontology, knownEntities)) errors.push({ severity: 'error', code: 'operation.accessPattern.key.unknown', message: `${where}: accessPattern keyField '${access.keyField}' must be fully qualified as Entity.field and resolve in saved ontology` });
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
      if (!fieldRef || !isKnownOntologyRefOrField(fieldRef, ontology, knownEntities)) errors.push({ severity: 'error', code: 'operation.input.field.unknown', message: `${where}: input '${inputId || '?'}' fieldRef '${fieldRef}' does not resolve in saved ontology` });
      if (!isKnownContextSource(source)) errors.push({ severity: 'error', code: 'operation.input.source.invalid', message: `${where}: input '${inputId || '?'}' has invalid source '${source}'` });
      if (input.required === true && source === 'userInput' && isTechnicalIdentifierRef(inputId, fieldRef, ontology, knownEntities)) {
        errors.push({ severity: 'error', code: 'operation.input.requiredId.manual', message: `${where}: required identifier input '${inputId || fieldRef}' cannot be plain userInput; resolve it from route, selection, workflow or context` });
      }
    }
  }

  const contexts = Array.isArray(operation.contextResolution) ? operation.contextResolution : null;
  if (!contexts) {
    errors.push({ severity: 'error', code: 'operation.contextResolution.missing', message: `${where}: missing contextResolution[]` });
  } else {
    const inputIds = new Set((operation.inputs || []).map(input => input.inputId).filter(Boolean));
    for (const ctx of contexts) {
      if (!isRecord(ctx)) continue;
      const targetRef = typeof ctx.targetRef === 'string' ? ctx.targetRef : '';
      const originRef = typeof ctx.originRef === 'string' ? ctx.originRef : '';
      const source = typeof ctx.source === 'string' ? ctx.source : '';
      const inputId = typeof ctx.inputId === 'string' ? ctx.inputId : '';
      if (!isKnownContextSource(source)) errors.push({ severity: 'error', code: 'operation.context.source.invalid', message: `${where}: context source '${source}' is invalid` });
      validateContextResolutionRef(where, operation.operationId, inputId, targetRef, originRef, source, inputIds, ontology, knownEntities, journey, errors);
      if (source === 'userInput') warnings.push({ severity: 'warning', code: 'operation.context.userInput', message: `${where}: contextResolution '${targetRef}' should usually be runtime context, not userInput` });
    }
  }
}

function validateContextResolutionRef(
  where: string,
  operationId: string,
  inputId: string,
  targetRef: string,
  originRef: string,
  source: string,
  inputIds: Set<string>,
  ontology: Record<string, unknown>,
  knownEntities: Set<string>,
  journey: JourneyMap | null,
  errors: HealthFinding[],
): void {
  if (!targetRef) {
    errors.push({ severity: 'error', code: 'operation.context.target.missing', message: `${where}: contextResolution missing targetRef` });
  } else if (!isValidContextTargetRef(targetRef, inputIds, ontology, knownEntities)) {
    errors.push({ severity: 'error', code: 'operation.context.target.unknown', message: `${where}: context targetRef '${targetRef}' must be Entity.field, input.<inputId>, filter.<name>, or a catalogued runtime context attribute` });
  }
  if (!originRef) {
    errors.push({ severity: 'error', code: 'operation.context.origin.missing', message: `${where}: contextResolution for '${targetRef || '?'}' missing originRef` });
    return;
  }
  if (source === 'actorSession' || source === 'businessContext' || source === 'currentWorkspace' || source === 'systemDefault') {
    const allowed = L4_CONTEXT_ORIGIN_CATALOG[source] as readonly string[];
    if (!allowed.includes(originRef)) {
      errors.push({ severity: 'error', code: 'operation.context.origin.invalid', message: `${where}: ${source} originRef '${originRef}' must be one of ${allowed.join(', ')}` });
    }
    return;
  }
  if (source === 'selectedEntity' || source === 'activeLifecycleInstance' || source === 'workflowState') {
    if (!isKnownOntologyFieldRef(originRef, ontology, knownEntities)) {
      errors.push({ severity: 'error', code: 'operation.context.origin.unknown', message: `${where}: ${source} originRef '${originRef}' must be a saved ontology field in Entity.field format` });
    }
    return;
  }
  if (source === 'routeParam') {
    if (!/^routeParam\.[A-Za-z0-9_-]+$/.test(originRef)) {
      errors.push({ severity: 'error', code: 'operation.context.origin.invalid', message: `${where}: routeParam originRef '${originRef}' must be routeParam.<name>` });
    } else if (!hasJourneySourceForOperationInput(journey, operationId, inputId || tailRef(originRef), 'routeParam')) {
      errors.push({ severity: 'error', code: 'operation.context.journey.missing', message: `${where}: routeParam originRef '${originRef}' must match journey inputResolution/edge data` });
    }
    return;
  }
  if (source === 'previousStepOutput') {
    if (!/^previousStepOutput\.[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(originRef)) {
      errors.push({ severity: 'error', code: 'operation.context.origin.invalid', message: `${where}: previousStepOutput originRef '${originRef}' must be previousStepOutput.<operationId>.<field>` });
    } else if (!hasJourneySourceForOperationInput(journey, operationId, inputId || tailRef(originRef), 'previousStepOutput')) {
      errors.push({ severity: 'error', code: 'operation.context.journey.missing', message: `${where}: previousStepOutput originRef '${originRef}' must match journey inputResolution/edge data` });
    }
    return;
  }
  if (source === 'userInput' && !/^userInput\.[A-Za-z0-9_-]+$/.test(originRef)) {
    errors.push({ severity: 'error', code: 'operation.context.origin.invalid', message: `${where}: userInput originRef '${originRef}' must be userInput.<name> when used` });
  }
}

function validateJourneyContract(
  journey: JourneyMap | null,
  workflows: { workflowId: string; actors: string[]; capabilities?: { priority?: string }[] }[],
  operations: OperationDefinition[],
  currentOperationIds: Set<string>,
  ontology: Record<string, unknown>,
  knownEntities: Set<string>,
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
  const edges = journey.navigationEdges || [];
  if (edges.length === 0 && (journey.workspaces || []).length > 0) {
    errors.push({ severity: 'error', code: 'journey.edges.missing', message: 'journey has workspaces but no navigationEdges; declare the minimal list/detail/action or workflow-step transitions and transported data' });
  }

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

  for (const edge of edges) {
    if (!workspaceIds.has(edge.from)) errors.push({ severity: 'error', code: 'journey.edge.from.unknown', message: `journey edge '${edge.from}' -> '${edge.to}': source workspace does not exist` });
    if (!workspaceIds.has(edge.to)) errors.push({ severity: 'error', code: 'journey.edge.to.unknown', message: `journey edge '${edge.from}' -> '${edge.to}': target workspace does not exist` });
    if (edge.operationId) {
      reachableOperationIds.add(edge.operationId);
      if (!operationById.has(edge.operationId)) errors.push({ severity: 'error', code: 'journey.edge.operation.unknown', message: `journey edge '${edge.from}' -> '${edge.to}': unknown operation '${edge.operationId}'` });
    }
    for (const data of edge.data || []) if (!isKnownContextSource(data.source)) errors.push({ severity: 'error', code: 'journey.edge.data.source.invalid', message: `journey edge '${edge.from}' -> '${edge.to}': invalid data source '${data.source}'` });
  }

  for (const workspace of journey.workspaces || []) validateEntityManagementEdges(workspace, operationById, edges, errors);

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
      if ((input.source === 'routeParam' || input.source === 'previousStepOutput') && !hasJourneySourceForOperationInput(journey, operation.operationId, input.inputId, input.source)) {
        errors.push({ severity: 'error', code: 'journey.input.edge.missing', message: `operation '${operation.operationId}' input '${input.inputId}' source '${input.source}' must match a journey inputResolution and navigation edge` });
      }
      if (!input.required || !isTechnicalIdentifierRef(input.inputId, input.fieldRef, ontology, knownEntities) || !requiresJourneyInputResolution(input.source)) continue;
      if (!inputResolutions.has(`${operation.operationId}:${input.inputId}`)) errors.push({ severity: 'error', code: 'journey.input.resolution.missing', message: `operation '${operation.operationId}' required identifier '${input.inputId}' has source '${input.source}' but no journey inputResolution row` });
    }
  }

  for (const workflow of workflows) {
    const priority = (workflow.capabilities || []).find(cap => cap.priority)?.priority;
    if (priority && priority !== 'now') continue;
    for (const actor of workflow.actors || []) if (actor && !landingActors.has(actor)) errors.push({ severity: 'error', code: 'journey.actor.landing.missing', message: `actor '${actor}' owns now workflow '${workflow.workflowId}' but has no journey landing` });
  }
}

function validateEntityManagementEdges(
  workspace: NonNullable<JourneyMap>['workspaces'][number],
  operationById: Map<string, OperationDefinition>,
  edges: NonNullable<JourneyMap>['navigationEdges'],
  errors: HealthFinding[],
): void {
  if (workspace.kind !== 'entityManagement') return;
  const operations = (workspace.operationIds || []).map(operationId => operationById.get(operationId)).filter((operation): operation is OperationDefinition => !!operation);
  const hasList = operations.some(operation => operation.kind === 'query' || operation.kind === 'view' || operation.accessPattern?.kind === 'list');
  const hasAction = operations.some(operation => ['update', 'delete', 'view'].includes(operation.kind) || operation.accessPattern?.kind === 'getById');
  if (!hasList || !hasAction) return;
  const hasSelectionEdge = edges.some(edge =>
    edge.from === workspace.workspaceId
    && (edge.to === workspace.workspaceId || workspace.operationIds.includes(edge.operationId || ''))
    && (edge.data || []).some(data => data.source === 'selectedEntity' || data.source === 'previousStepOutput'),
  );
  if (!hasSelectionEdge) {
    errors.push({ severity: 'error', code: 'journey.entityManagement.edge.missing', message: `journey workspace '${workspace.workspaceId}': entityManagement with list/action operations must declare a list-to-action navigationEdge carrying the selected id` });
  }
}

function isKnownContextSource(value: string): boolean {
  return ['userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault'].includes(value);
}

function isIdentifierRef(value: string): boolean {
  const last = (value.split('.').pop() || value).toLowerCase();
  return last === 'id' || last.endsWith('id') || last.endsWith('_id') || last.endsWith('-id');
}

function isKnownOntologyRefOrField(ref: string, ontology: Record<string, unknown>, knownEntities: Set<string>): boolean {
  return isKnownEntityRef(ref, knownEntities) || isKnownOntologyFieldRef(ref, ontology, knownEntities);
}

function isKnownOntologyFieldRef(ref: string, ontology: Record<string, unknown>, knownEntities: Set<string>): boolean {
  const split = splitQualifiedFieldRef(ref);
  if (!split || !isKnownEntityRef(split.entity, knownEntities)) return false;
  if (split.entity.includes(':')) return true;
  const entity = ontology[split.entity];
  const fields = isRecord(entity) && Array.isArray(entity.fields) ? entity.fields : [];
  return fields.some(field => isRecord(field) && field.fieldId === split.field);
}

function splitQualifiedFieldRef(ref: string): { entity: string; field: string } | null {
  const dot = ref.indexOf('.');
  if (dot <= 0 || dot === ref.length - 1) return null;
  return { entity: ref.slice(0, dot), field: ref.slice(dot + 1) };
}

function isRuntimeContextRef(ref: string): boolean {
  return Object.values(L4_CONTEXT_ORIGIN_CATALOG).some(values => (values as readonly string[]).includes(ref));
}

function isValidContextTargetRef(ref: string, inputIds: Set<string>, ontology: Record<string, unknown>, knownEntities: Set<string>): boolean {
  return isKnownOntologyFieldRef(ref, ontology, knownEntities) || isRuntimeContextRef(ref) || isBffContextTargetRef(ref, inputIds);
}

function isBffContextTargetRef(ref: string, inputIds: Set<string>): boolean {
  const split = splitScopedRef(ref);
  if (!split) return false;
  if (split.scope === 'input') return inputIds.has(split.name);
  return split.scope === 'filter';
}

function splitScopedRef(ref: string): { scope: string; name: string } | null {
  const dot = ref.indexOf('.');
  if (dot <= 0 || dot === ref.length - 1) return null;
  const scope = ref.slice(0, dot);
  const name = ref.slice(dot + 1);
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(scope) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) return null;
  return { scope, name };
}

function requiresJourneyInputResolution(source: string): boolean {
  return ['selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput'].includes(source);
}

function isTechnicalIdentifierRef(inputId: string, fieldRef: string, ontology: Record<string, unknown>, knownEntities: Set<string>): boolean {
  const split = splitQualifiedFieldRef(fieldRef);
  if (!split) return isKnownEntityRef(fieldRef, knownEntities) && isIdentifierRef(inputId);
  const field = getOntologyField(split.entity, split.field, ontology);
  if (!field) return isPrimaryEntityIdField(split.entity, split.field);
  const type = typeof field.type === 'string' ? field.type : '';
  if (type && isKnownEntityRef(type, knownEntities)) return true;
  return isPrimaryEntityIdField(split.entity, split.field) && (type === 'uuid' || isIdentifierRef(split.field));
}

function getOntologyField(entityId: string, fieldId: string, ontology: Record<string, unknown>): Record<string, unknown> | null {
  const entity = ontology[entityId];
  const fields = isRecord(entity) && Array.isArray(entity.fields) ? entity.fields : [];
  const field = fields.find(item => isRecord(item) && item.fieldId === fieldId);
  return isRecord(field) ? field : null;
}

function isPrimaryEntityIdField(entityId: string, fieldId: string): boolean {
  const localEntity = (entityId.split(':').pop() || entityId).trim();
  if (!localEntity) return false;
  const expected = `${localEntity.charAt(0).toLowerCase()}${localEntity.slice(1)}Id`;
  return fieldId === expected || fieldId === 'id';
}

function hasJourneySourceForOperationInput(journey: JourneyMap | null, operationId: string, inputId: string, source: string): boolean {
  if (!journey) return false;
  const hasInputResolution = (journey.inputResolutions || []).some(resolution =>
    resolution.operationId === operationId
    && (!inputId || resolution.inputId === inputId)
    && resolution.source === source,
  );
  const hasEdge = (journey.navigationEdges || []).some(edge => {
    if (edge.operationId && edge.operationId !== operationId) return false;
    return (edge.data || []).some(data =>
      data.source === source
      && (!inputId || data.name === inputId || data.to === inputId || data.to === `${operationId}.${inputId}`),
    );
  });
  return hasInputResolution && hasEdge;
}

function tailRef(ref: string): string {
  const parts = ref.split('.');
  return parts[parts.length - 1] || ref;
}
