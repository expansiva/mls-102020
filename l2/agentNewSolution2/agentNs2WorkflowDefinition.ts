/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2WorkflowDefinition.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Per-workflow full definition (states, transitions, orchestrated operationIds, entities touched,
// rulesApplied, embedded story). One fan-out child per workflowId; writes the GLOBAL artifact
// l4/workflows/{workflowId}.defs.ts. Entity refs use canonical ontology ids only.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getPlannerOutputs,
  isRecord,
  normalizeStringList,
  optionalString,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { readWorkflowDefs, saveAgentTrace, saveDefsArtifact, workflowFileInfo } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { workflowDefinitionResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getWorkflowIndex } from '/_102020_/l2/agentNewSolution2/agentNs2WorkflowIndex.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';

const AGENT_NAME = 'agentNs2WorkflowDefinition';
const TOOL_NAME = 'submitWorkflowDefinition';

export interface WorkflowTransition { from: string; to: string; on: string; by?: string; guard?: string }
export interface WorkflowDefinition {
  workflowId: string;
  title: string;
  executionMode?: string;
  trigger: string;
  actors: string[];
  states: string[];
  transitions: WorkflowTransition[];
  operationIds: string[];
  entities: string[];
  rulesApplied: string[];
  story: { actor: string; goal: string; soThat?: string; steps: string[]; outcome: string };
}
export interface WorkflowDefinitionResult { workflowDefinition: WorkflowDefinition }
export type WorkflowDefinitionOutput = PlannerOutput<WorkflowDefinitionResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the full definition for the current workflow selector.', workflowDefinitionResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Detail one workflow into its full definition', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] workflow selector args invalid`);
  const indexItem = getWorkflowIndex(context).result.workflows.find(w => w.workflowId === args);
  if (!indexItem) throw new Error(`[${AGENT_NAME}] workflow selector not in index: ${args}`);
  const behavior = getBehaviorIndex(context).result;
  const story = behavior.workflows.find(w => w.workflowId === args)?.story;
  const operations = behavior.operations.filter(o => indexItem.operationIds.includes(o.operationId)).map(o => ({ operationId: o.operationId, title: o.title, entity: o.entity, kind: o.kind }));
  const ontology = await getEnrichedOntology(context);
  // Lifecycle of the workflow's entities, so states can be aligned to the entity (not generic).
  const entityLifecycles = indexItem.entities.map(id => {
    const e = isRecord(ontology[id]) ? ontology[id] as Record<string, unknown> : {};
    return { entity: id, lifecycleStates: e.lifecycleStates, statusEnum: e.statusEnum };
  });
  const reduced = { selector: args, indexItem, story, orchestratedOperations: operations, entityLifecycles, ontologyEntityIds: Object.keys(ontology) };
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), `## Workflow selector\n${args}\n\n## Reduced context\n${JSON.stringify(reduced, null, 2)}\n`, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: WorkflowDefinitionOutput | undefined;
  const selector = (step.prompt || '').trim();
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (selector && output.result.workflowDefinition.workflowId !== selector) output.result.workflowDefinition.workflowId = selector;
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }
  if (status === 'completed' && output && output.status === 'ok') {
    try {
      await saveDefsArtifact(workflowFileInfo(output.result.workflowDefinition.workflowId), `workflow${capitalize(output.result.workflowDefinition.workflowId)}`, output.result.workflowDefinition);
    } catch (error) {
      console.warn(`[${AGENT_NAME}] save failed for ${selector}`, error);
    }
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

/** Reads the GLOBAL l4/workflows/*.defs.ts (fan-out children are deleted); in-task payloads override. */
export async function getWorkflowDefinitions(context: mls.msg.ExecutionContext): Promise<WorkflowDefinition[]> {
  const byId = new Map<string, WorkflowDefinition>();
  for (const d of await readWorkflowDefs()) {
    const id = typeof d.workflowId === 'string' ? d.workflowId : '';
    if (id) byId.set(id, d as unknown as WorkflowDefinition);
  }
  for (const o of getPlannerOutputs(context, AGENT_NAME, config)) {
    if (o.status === 'ok') byId.set(o.result.workflowDefinition.workflowId, o.result.workflowDefinition);
  }
  return [...byId.values()];
}

const config: PlannerExtractConfig<WorkflowDefinitionResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): WorkflowDefinitionResult {
  const result = assertRecord(value, 'result');
  const d = assertRecord(result.workflowDefinition, 'result.workflowDefinition');
  const s = assertRecord(d.story, 'result.workflowDefinition.story');
  const transitions = assertArray(d.transitions || [], 'result.workflowDefinition.transitions').map((item, index) => {
    const t = assertRecord(item, `result.workflowDefinition.transitions[${index}]`);
    return { from: assertString(t.from, `transitions[${index}].from`), to: assertString(t.to, `transitions[${index}].to`), on: assertString(t.on, `transitions[${index}].on`), by: optionalString(t.by), guard: optionalString(t.guard) };
  });
  return {
    workflowDefinition: {
      workflowId: assertString(d.workflowId, 'result.workflowDefinition.workflowId'),
      title: assertString(d.title, 'result.workflowDefinition.title'),
      executionMode: optionalString(d.executionMode),
      trigger: assertString(d.trigger, 'result.workflowDefinition.trigger'),
      actors: normalizeStringList(d.actors, 'result.workflowDefinition.actors'),
      states: normalizeStringList(d.states, 'result.workflowDefinition.states'),
      transitions,
      operationIds: normalizeStringList(d.operationIds, 'result.workflowDefinition.operationIds'),
      entities: normalizeStringList(d.entities, 'result.workflowDefinition.entities'),
      rulesApplied: normalizeStringList(d.rulesApplied, 'result.workflowDefinition.rulesApplied'),
      story: { actor: assertString(s.actor, 'story.actor'), goal: assertString(s.goal, 'story.goal'), soThat: optionalString(s.soThat), steps: normalizeStringList(s.steps, 'story.steps'), outcome: assertString(s.outcome, 'story.outcome') },
    },
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// keep isRecord referenced for normalizer parity across agents
void isRecord;

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Detail exactly ONE workflow (the current selector) into its full definition.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.workflowDefinition: workflowId (== selector), title, executionMode, trigger, actors[]
(actorIds), states[] (lifecycle states), transitions[] ({from,to,on,by?,guard?}), operationIds[]
(the operations orchestrated — from the provided list), entities[] (canonical ontology ids),
rulesApplied[] (ruleIds), and the embedded story { actor, goal, soThat?, steps[], outcome }.

Rules:
- workflowId must equal the selector.
- transitions reference declared states; entities/operationIds reference provided ids only.
- states must reflect the lifecycle of the workflow's PRIMARY entity: when that entity declares
  lifecycleStates/statusEnum in the reduced context, reuse those exact state names instead of
  inventing generic ones (open/closed/submitted), so the workflow and the entity stay aligned.

`;
