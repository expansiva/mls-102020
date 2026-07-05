/// <mls fileReference="_102020_/l2/agentNewSolution2/agentPlanOperationIndex.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Index of operations to detail — direct actions on entities (CRUD + query/view,
// dashboards as query/view). Deterministic ref check, checkpoint, then spawn the per-operation
// definition fan-out.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createParallelDynamicAgentStepIntent,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  findStepByPlanId,
  getOntologyEntityIdSet,
  getPlannerOutput,
  isKnownEntityRef,
  parallelProgressTitle,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace, saveIndexCheckpoint } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { operationIndexResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';

const AGENT_NAME = 'agentPlanOperationIndex';
const TOOL_NAME = 'submitOperationIndex';

export interface OperationIndexItem { operationId: string; title: string; actor: string; entity: string; kind: 'create' | 'update' | 'delete' | 'query' | 'view' }
export interface OperationIndexResult { operations: OperationIndexItem[] }
export type OperationIndexOutput = PlannerOutput<OperationIndexResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the operation index.', operationIndexResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Index the operations to detail', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const behavior = getBehaviorIndex(context).result;
  const ontologyIds = Object.keys(await getEnrichedOntology(context));
  const human = `## Classified operations\n${JSON.stringify(behavior.operations.map(o => ({ operationId: o.operationId, title: o.title, actor: o.actor, entity: o.entity, kind: o.kind })), null, 2)}\n\n## Workflows (their orchestrated operationIds are already covered)\n${JSON.stringify(behavior.workflows.map(w => ({ workflowId: w.workflowId, title: w.title })), null, 2)}\n\n## Ontology entity ids\n${JSON.stringify(ontologyIds, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  const warnings: string[] = [];
  let output: OperationIndexOutput | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
    else {
      unionWorkflowOperations(context, output.result.operations);
      const known = getOntologyEntityIdSet(await getEnrichedOntology(context));
      for (const o of output.result.operations) if (!isKnownEntityRef(o.entity, known)) warnings.push(`operation ${o.operationId}: unknown entity ref '${o.entity}'`);
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }

  const intents: mls.msg.AgentIntent[] = [];
  await saveAgentTrace(context, AGENT_NAME, step);
  if (status === 'completed' && output) {
    await saveIndexCheckpoint(context, 'operationIndex', output.result, warnings.map(message => ({ severity: 'warning', message })));
    intents.push(...spawnDefinitions(context, output.result));
  }
  intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg || (warnings.length ? `${warnings.length} ref warning(s)` : undefined)));
  return intents;
}

function spawnDefinitions(context: mls.msg.ExecutionContext, result: OperationIndexResult): mls.msg.AgentIntent[] {
  const placeholder = findStepByPlanId(context, 'plan-operation-definition') as mls.msg.AIAgentStep | null;
  if (!placeholder || placeholder.type !== 'agent' || placeholder.status === 'completed') return [];
  const ids = result.operations.map(o => o.operationId).filter(Boolean);
  if (ids.length === 0) return [createUpdateStatusIntent(context, placeholder, placeholder, 0, 'completed', 'No operations to define.')];
  return [createParallelDynamicAgentStepIntent(context, placeholder, 'agentPlanOperationDefinition', 'plan-operation-definition:parallel', parallelProgressTitle(context, 'Definindo operações', 'Defining operations'), ids, 5)];
}

export function getOperationIndex(context: mls.msg.ExecutionContext): OperationIndexOutput {
  const output = getPlannerOutput(context, AGENT_NAME, config);
  unionWorkflowOperations(context, output.result.operations);
  return output;
}

/** item-4 backstop: every operationId a workflow orchestrates must exist as an operation. The LLM index
 * sometimes omits a few; synthesize their index entries deterministically (entity/kind inferred from the
 * id + the workflow's entities) so the definition fan-out generates real defs and no workflow operationId
 * dangles (the validator's workflow.operation.unknown error). Applied at read-time AND before spawning,
 * so the index, the fan-out, and the per-operation definition agent all see the same union. */
function unionWorkflowOperations(context: mls.msg.ExecutionContext, operations: OperationIndexItem[]): void {
  let behavior: ReturnType<typeof getBehaviorIndex>['result'] | null;
  try { behavior = getBehaviorIndex(context).result; } catch { return; }
  const existing = new Set(operations.map(o => o.operationId));
  for (const w of behavior.workflows) {
    for (const opId of (w.operationIds || [])) {
      if (!opId || existing.has(opId)) continue;
      existing.add(opId);
      operations.push({ operationId: opId, title: humanizeId(opId), actor: w.actor, entity: pickEntityForOp(opId, w.entities), kind: inferOperationKind(opId) });
    }
  }
}

function humanizeId(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : id;
}

function inferOperationKind(id: string): OperationIndexItem['kind'] {
  const s = id.toLowerCase();
  if (/^(view|list|get|show|generate|report|browse|search)/.test(s) || s.includes('dashboard') || s.includes('summary') || s.includes('report')) return 'query';
  if (/^(create|add|record|open|register|start)/.test(s)) return 'create';
  if (/^(delete|remove|cancel|archive|deprecate|void)/.test(s)) return 'delete';
  return 'update';
}

/** Best-effort entity for a synthesized op: the workflow entity whose name appears in the id, else the
 * workflow's first entity. Both are canonical ontology ids, so the ref resolves for the validator. */
function pickEntityForOp(opId: string, entities: string[]): string {
  const s = opId.toLowerCase();
  const match = (entities || []).find(e => { const name = e.split(':').pop() || e; return !!name && s.includes(name.toLowerCase()); });
  return match || (entities && entities[0]) || '';
}

const config: PlannerExtractConfig<OperationIndexResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): OperationIndexResult {
  const result = assertRecord(value, 'result');
  const operations = assertArray(result.operations || [], 'result.operations').map((item, index) => {
    const o = assertRecord(item, `result.operations[${index}]`);
    return {
      operationId: assertString(o.operationId, `result.operations[${index}].operationId`),
      title: assertString(o.title, `result.operations[${index}].title`),
      actor: assertString(o.actor, `result.operations[${index}].actor`),
      entity: assertString(o.entity, `result.operations[${index}].entity`),
      kind: assertString(o.kind, `result.operations[${index}].kind`) as OperationIndexItem['kind'],
    };
  });
  return { operations };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
From the classified operations, produce the operation index to detail.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.operations, each: operationId, title, actor (actorId), entity (canonical ontology id),
kind (create|update|delete|query|view; dashboards are query/view). Keep operationId stable with the
classification. Include direct actions even when a workflow also references them.

Rules:
- Preserve explicit CRUD operations from classification. Do not rename list/create/update/deactivate
  operations into a single vague manage* operation.
- If a manage* operation is already present in the classification, keep it only when the capability
  explicitly describes one bulk/configuration command. Otherwise index the concrete operations already
  present in the classification and leave the generic manage* out.

`;
