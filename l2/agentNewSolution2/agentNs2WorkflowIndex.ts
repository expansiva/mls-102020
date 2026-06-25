/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2WorkflowIndex.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Index the workflows to detail (executionMode, trigger, actors, refs, orchestrated operationIds).
// Deterministic ref-integrity check (warnings only), freeze a checkpoint, then spawn the per-workflow
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
  normalizeStringList,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace, saveIndexCheckpoint } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { workflowIndexResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';

const AGENT_NAME = 'agentNs2WorkflowIndex';
const TOOL_NAME = 'submitWorkflowIndex';

export interface WorkflowIndexItem { workflowId: string; title: string; executionMode: string; trigger: string; actors: string[]; entities: string[]; operationIds: string[] }
export interface WorkflowIndexResult { workflows: WorkflowIndexItem[] }
export type WorkflowIndexOutput = PlannerOutput<WorkflowIndexResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the workflow index.', workflowIndexResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Index the workflows to detail', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const behavior = getBehaviorIndex(context).result;
  const human = `## Classified workflows\n${JSON.stringify(behavior.workflows, null, 2)}\n\n## Classified operations (for orchestration refs)\n${JSON.stringify(behavior.operations.map(o => ({ operationId: o.operationId, title: o.title, entity: o.entity, kind: o.kind })), null, 2)}\n\n## Ontology entity ids\n${JSON.stringify(Object.keys(getEnrichedOntology(context)), null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  const warnings: string[] = [];
  let output: WorkflowIndexOutput | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
    else {
      const known = getOntologyEntityIdSet(getEnrichedOntology(context));
      for (const w of output.result.workflows) for (const e of w.entities) if (!isKnownEntityRef(e, known)) warnings.push(`workflow ${w.workflowId}: unknown entity ref '${e}'`);
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }

  const intents: mls.msg.AgentIntent[] = [];
  await saveAgentTrace(context, AGENT_NAME, step);
  if (status === 'completed' && output) {
    await saveIndexCheckpoint(context, 'workflowIndex', output.result, warnings.map(message => ({ severity: 'warning', message })));
    intents.push(...spawnDefinitions(context, output.result));
  }
  intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg || (warnings.length ? `${warnings.length} ref warning(s)` : undefined)));
  return intents;
}

function spawnDefinitions(context: mls.msg.ExecutionContext, result: WorkflowIndexResult): mls.msg.AgentIntent[] {
  const placeholder = findStepByPlanId(context, 'plan-workflow-definition') as mls.msg.AIAgentStep | null;
  if (!placeholder || placeholder.type !== 'agent' || placeholder.status === 'completed') return [];
  const ids = result.workflows.map(w => w.workflowId).filter(Boolean);
  if (ids.length === 0) return [createUpdateStatusIntent(context, placeholder, placeholder, 0, 'completed', 'No workflows to define.')];
  return [createParallelDynamicAgentStepIntent(context, placeholder, 'agentNs2WorkflowDefinition', 'plan-workflow-definition:parallel', 'Define workflows', ids, 5)];
}

export function getWorkflowIndex(context: mls.msg.ExecutionContext): WorkflowIndexOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
}

const config: PlannerExtractConfig<WorkflowIndexResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): WorkflowIndexResult {
  const result = assertRecord(value, 'result');
  const workflows = assertArray(result.workflows || [], 'result.workflows').map((item, index) => {
    const w = assertRecord(item, `result.workflows[${index}]`);
    return {
      workflowId: assertString(w.workflowId, `result.workflows[${index}].workflowId`),
      title: assertString(w.title, `result.workflows[${index}].title`),
      executionMode: assertString(w.executionMode, `result.workflows[${index}].executionMode`),
      trigger: assertString(w.trigger, `result.workflows[${index}].trigger`),
      actors: normalizeStringList(w.actors, `result.workflows[${index}].actors`),
      entities: normalizeStringList(w.entities, `result.workflows[${index}].entities`),
      operationIds: normalizeStringList(w.operationIds, `result.workflows[${index}].operationIds`),
    };
  });
  return { workflows };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
From the classified workflows, produce the index to detail.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.workflows, each: workflowId, title, executionMode (sequential|parallel_static|
parallel_dynamic), trigger (what starts it), actors[] (actorIds), entities[] (ontology ids),
operationIds[] (the operations this workflow orchestrates — from the classified operations).

Rules:
- Keep workflowId stable with the classification.
- entities use canonical ontology ids; operationIds reference classified operations.

`;
