/// <mls fileReference="_102020_/l2/agentNewSolution2/agentValidateBehaviorModel.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Deterministic, NON-blocking coverage/integrity report. No LLM. Checks: every
// priority-now capability is owned by exactly one workflow or operation; every entity ref resolves to
// a canonical ontology id (no aggregate names); referenced rules exist; every workflow's orchestrated
// operationIds exist. Writes l4/trace/behavior-health-report.json. Warnings/errors never block the task.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, getActorIdSet, getOntologyEntityIdSet, isKnownEntityRef, isRecord } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { saveBehaviorHealthReport } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getWorkflowDefinitions } from '/_102020_/l2/agentNewSolution2/agentNs2WorkflowDefinition.js';
import { getOperationDefinitions } from '/_102020_/l2/agentNewSolution2/agentPlanOperationDefinition.js';

const AGENT_NAME = 'agentValidateBehaviorModel';

export interface HealthFinding { severity: 'error' | 'warning'; code: string; message: string }
export interface BehaviorHealthReport {
  passed: boolean;
  counts: { entities: number; workflows: number; operations: number };
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

  const knownEntities = getOntologyEntityIdSet(ontology);
  const knownActors = getActorIdSet(fp.actors);
  const knownRules = new Set<string>();
  for (const rule of (Array.isArray(fp.rules) ? fp.rules : [])) if (isRecord(rule) && typeof rule.ruleId === 'string') knownRules.add(rule.ruleId);
  const operationIds = new Set<string>([...behavior.operations.map(o => o.operationId), ...operationDefs.map(o => o.operationId)]);

  const errors: HealthFinding[] = [];
  const warnings: HealthFinding[] = [];
  const entityRef = (ref: string, where: string) => { if (!isKnownEntityRef(ref, knownEntities)) errors.push({ severity: 'error', code: 'entity.ref.unknown', message: `${where}: unknown entity ref '${ref}'` }); };
  const actorRef = (ref: string, where: string) => { if (ref && knownActors.size > 0 && !knownActors.has(ref)) warnings.push({ severity: 'warning', code: 'actor.unknown', message: `${where}: unknown actor '${ref}'` }); };
  const ruleRefs = (refs: string[], where: string) => { for (const r of refs) if (knownRules.size > 0 && !knownRules.has(r)) warnings.push({ severity: 'warning', code: 'rule.unknown', message: `${where}: unknown rule '${r}'` }); };

  // Capability coverage: every non-"never" capability should be owned by exactly one workflow or
  // operation. priority-now unowned is a hard error; soon/later unowned is a (non-blocking) warning.
  const ownerCount = new Map<string, number>();
  for (const w of behavior.workflows) for (const c of w.capabilityIds) ownerCount.set(c, (ownerCount.get(c) || 0) + 1);
  for (const o of behavior.operations) ownerCount.set(o.capabilityId, (ownerCount.get(o.capabilityId) || 0) + 1);
  for (const cap of fp.capabilities as { capabilityId?: string; priority?: string }[]) {
    if (cap.priority === 'never' || !cap.capabilityId) continue;
    const count = ownerCount.get(cap.capabilityId) || 0;
    if (count === 0) {
      if (cap.priority === 'now') errors.push({ severity: 'error', code: 'capability.unowned', message: `capability '${cap.capabilityId}' (now) is not owned by any workflow or operation` });
      else warnings.push({ severity: 'warning', code: 'capability.unowned.deferred', message: `capability '${cap.capabilityId}' (${cap.priority}) is not owned by any workflow or operation` });
    } else if (count > 1) {
      warnings.push({ severity: 'warning', code: 'capability.multiowned', message: `capability '${cap.capabilityId}' is owned by ${count} behaviors` });
    }
  }

  // Workflow integrity.
  for (const w of workflowDefs) {
    actorRef(w.story?.actor, `workflow ${w.workflowId}`);
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
  }

  // Fan-out completeness: a defined artifact per classified behavior.
  const definedWorkflows = new Set(workflowDefs.map(w => w.workflowId));
  for (const w of behavior.workflows) if (!definedWorkflows.has(w.workflowId)) warnings.push({ severity: 'warning', code: 'workflow.undefined', message: `workflow '${w.workflowId}' was classified but has no definition` });
  const definedOps = new Set(operationDefs.map(o => o.operationId));
  for (const o of behavior.operations) if (!definedOps.has(o.operationId)) warnings.push({ severity: 'warning', code: 'operation.undefined', message: `operation '${o.operationId}' was classified but has no definition` });

  return {
    passed: errors.length === 0,
    counts: { entities: knownEntities.size, workflows: workflowDefs.length, operations: operationDefs.length },
    errors,
    warnings,
  };
}

/** "Entity.field" -> "Entity" for ref resolution. */
function stripField(ref: string): string {
  const dot = ref.indexOf('.');
  return dot > 0 ? ref.slice(0, dot) : ref;
}
