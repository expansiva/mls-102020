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
  const human = `## Classified operations\n${JSON.stringify(behavior.operations.map(o => ({ operationId: o.operationId, title: o.title, actor: o.actor, entity: o.entity, kind: o.kind })), null, 2)}\n\n## Workflows (their orchestrated operationIds are already covered)\n${JSON.stringify(behavior.workflows.map(w => ({ workflowId: w.workflowId, title: w.title })), null, 2)}\n\n## Ontology entity ids\n${JSON.stringify(Object.keys(getEnrichedOntology(context)), null, 2)}\n`;
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
      const known = getOntologyEntityIdSet(getEnrichedOntology(context));
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
  return [createParallelDynamicAgentStepIntent(context, placeholder, 'agentPlanOperationDefinition', 'plan-operation-definition:parallel', 'Define operations', ids, 5)];
}

export function getOperationIndex(context: mls.msg.ExecutionContext): OperationIndexOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
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

`;
