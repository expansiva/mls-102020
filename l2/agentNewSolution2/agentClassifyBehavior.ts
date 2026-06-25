/// <mls fileReference="_102020_/l2/agentNewSolution2/agentClassifyBehavior.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Classify every priority-now capability into a Workflow (stateful, triggered,
// multi-actor over time) OR an Operation (direct single-actor action on one entity). Absorb the user
// stories HERE as each owner's embedded `story` (NOT persisted as a journeys artifact). Output the
// behavior index (workflows[] + operations[], each with its story and the ontology entities it touches).
// Entity references must be canonical ontology ids — the analise11/12 guardrail.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getActorIdSet,
  getOntologyEntityIdSet,
  getPlannerOutput,
  isKnownEntityRef,
  normalizeStringList,
  summarizeRecords,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { saveAgentTrace, saveIndexCheckpoint } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { behaviorClassificationResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';
import { getRequirementsClarificationAnswer } from '/_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.js';

const AGENT_NAME = 'agentClassifyBehavior';
const TOOL_NAME = 'submitBehaviorIndex';

export interface Story { actor: string; goal: string; soThat?: string; steps: string[]; outcome: string }
export interface WorkflowClassItem { workflowId: string; title: string; actor: string; entities: string[]; capabilityIds: string[]; story: Story }
export interface OperationClassItem { operationId: string; title: string; actor: string; entity: string; kind: 'create' | 'update' | 'delete' | 'query' | 'view'; capabilityId: string; story: Story }
export interface BehaviorIndex { workflows: WorkflowClassItem[]; operations: OperationClassItem[] }
export type BehaviorIndexOutput = PlannerOutput<BehaviorIndex>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the behavior index (workflows + operations with embedded stories).', behaviorClassificationResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Classify capabilities into workflows vs operations (absorbing the user stories)', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const fp = getFinalizeOutput(context).result;
  const ontology = await getEnrichedOntology(context);
  const clarification = getRequirementsClarificationAnswer(context);
  const capabilities = summarizeRecords(fp.capabilities as unknown[], ['capabilityId', 'title', 'actor', 'priority', 'behaviorHint']).filter(c => (c as { priority?: string }).priority !== 'never');
  const human = `## Actors\n${JSON.stringify(summarizeRecords(fp.actors as unknown[], ['actorId', 'title']), null, 2)}\n\n## Capabilities (own each one)\n${JSON.stringify(capabilities, null, 2)}\n\n## Ontology entity ids\n${JSON.stringify(Object.keys(ontology), null, 2)}\n\n## Rules\n${JSON.stringify(summarizeRecords(fp.rules as unknown[], ['ruleId', 'title']), null, 2)}\n\n## Clarification (source for stories)\n${JSON.stringify(clarification, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  const warnings: string[] = [];
  let output: BehaviorIndexOutput | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
    else warnings.push(...(await checkReferences(context, output.result)));
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  if (status === 'completed' && output) await saveIndexCheckpoint(context, 'behaviorIndex', output.result, warnings.map(message => ({ severity: 'warning', message })));
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg || (warnings.length ? `${warnings.length} reference warning(s)` : undefined))];
}

/** Deterministic, non-blocking ref integrity: unknown entity ids and uncovered capabilities -> warnings. */
async function checkReferences(context: mls.msg.ExecutionContext, index: BehaviorIndex): Promise<string[]> {
  const warnings: string[] = [];
  const fp = getFinalizeOutput(context).result;
  const knownEntities = getOntologyEntityIdSet(await getEnrichedOntology(context));
  const knownActors = getActorIdSet(fp.actors);

  const checkEntity = (ref: string, where: string) => { if (!isKnownEntityRef(ref, knownEntities)) warnings.push(`${where}: unknown entity ref '${ref}'`); };
  const checkActor = (ref: string, where: string) => { if (ref && knownActors.size > 0 && !knownActors.has(ref)) warnings.push(`${where}: unknown actor '${ref}'`); };

  for (const w of index.workflows) {
    checkActor(w.actor, `workflow ${w.workflowId}`);
    for (const e of w.entities) checkEntity(e, `workflow ${w.workflowId}`);
  }
  for (const o of index.operations) {
    checkActor(o.actor, `operation ${o.operationId}`);
    checkEntity(o.entity, `operation ${o.operationId}`);
  }

  const owned = new Set<string>();
  for (const w of index.workflows) for (const c of w.capabilityIds) owned.add(c);
  for (const o of index.operations) owned.add(o.capabilityId);
  for (const cap of fp.capabilities as { capabilityId?: string; priority?: string }[]) {
    if (cap.priority === 'now' && cap.capabilityId && !owned.has(cap.capabilityId)) warnings.push(`capability '${cap.capabilityId}' (now) is not owned by any workflow or operation`);
  }
  return warnings;
}

export function getBehaviorIndex(context: mls.msg.ExecutionContext): BehaviorIndexOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
}

const config: PlannerExtractConfig<BehaviorIndex> = { toolName: TOOL_NAME, normalizeResult };

function normalizeStory(value: unknown, path: string): Story {
  const s = assertRecord(value, path);
  return { actor: assertString(s.actor, `${path}.actor`), goal: assertString(s.goal, `${path}.goal`), soThat: typeof s.soThat === 'string' ? s.soThat : undefined, steps: normalizeStringList(s.steps, `${path}.steps`), outcome: assertString(s.outcome, `${path}.outcome`) };
}

function normalizeResult(value: unknown): BehaviorIndex {
  const result = assertRecord(value, 'result');
  const workflows = assertArray(result.workflows || [], 'result.workflows').map((item, index) => {
    const w = assertRecord(item, `result.workflows[${index}]`);
    return {
      workflowId: assertString(w.workflowId, `result.workflows[${index}].workflowId`),
      title: assertString(w.title, `result.workflows[${index}].title`),
      actor: assertString(w.actor, `result.workflows[${index}].actor`),
      entities: normalizeStringList(w.entities, `result.workflows[${index}].entities`),
      capabilityIds: normalizeStringList(w.capabilityIds, `result.workflows[${index}].capabilityIds`),
      story: normalizeStory(w.story, `result.workflows[${index}].story`),
    };
  });
  const operations = assertArray(result.operations || [], 'result.operations').map((item, index) => {
    const o = assertRecord(item, `result.operations[${index}]`);
    return {
      operationId: assertString(o.operationId, `result.operations[${index}].operationId`),
      title: assertString(o.title, `result.operations[${index}].title`),
      actor: assertString(o.actor, `result.operations[${index}].actor`),
      entity: assertString(o.entity, `result.operations[${index}].entity`),
      kind: assertString(o.kind, `result.operations[${index}].kind`) as OperationClassItem['kind'],
      capabilityId: assertString(o.capabilityId, `result.operations[${index}].capabilityId`),
      story: normalizeStory(o.story, `result.operations[${index}].story`),
    };
  });
  return { workflows, operations };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1 — the heart of it).
Classify EVERY priority-now capability/user-action into exactly one of:
- a Workflow: stateful, triggered, spanning time and/or multiple actors (a request/order/approval lifecycle).
- an Operation: a direct action of ONE actor on ONE entity (create/update/delete/query/view; dashboards = query/view).

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result:
- workflows[]: { workflowId, title, actor, entities[], capabilityIds[], story }.
- operations[]: { operationId, title, actor, entity, kind, capabilityId, story }.
- story = { actor, goal, soThat?, steps[], outcome } — derive it from the clarification/scope; this
  absorbs the user journey (do NOT emit a separate journeys artifact).

Rules:
- Use canonical ONTOLOGY entity ids for entities/entity (the provided ids), never aggregate/group names.
- Use actorId values for actors.
- Every priority-now capability must be owned by exactly one workflow or operation.
- Emit Operations for managing master-data / MDM entities (create/update/delete/query) even when the
  capability is implicit (e.g. manage categories, manage tables).
- Besides standalone operations, also emit Operations for the discrete reusable actions performed
  INSIDE a workflow (e.g. create/update an entity, change a status) so each workflow can later
  orchestrate them — a stateful workflow should rarely end up with zero operations.
- camelCase workflowId/operationId.

`;
