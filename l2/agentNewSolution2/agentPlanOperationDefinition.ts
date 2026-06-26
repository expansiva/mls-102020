/// <mls fileReference="_102020_/l2/agentNewSolution2/agentPlanOperationDefinition.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Per-operation definition — the intent-level BFF contract (no tables, no per-page
// bffCommands): operationId, actor, entity, kind, reads/writes (ontology entities/fields),
// rulesApplied, embedded story. One fan-out child per operationId; writes l4/operations/{id}.defs.ts.

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
  normalizeStringList,
  optionalString,
  resolveCapabilityInfo,
  EXPERIENCE_STATUS_INITIAL,
  type ExperienceStatus,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { operationFileInfo, readOperationDefs, saveAgentTrace, saveDefsArtifact } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { operationDefinitionResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getOperationIndex } from '/_102020_/l2/agentNewSolution2/agentPlanOperationIndex.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getEnrichedOntology } from '/_102020_/l2/agentNewSolution2/agentNs2EntityDefinition.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';

const AGENT_NAME = 'agentPlanOperationDefinition';
const TOOL_NAME = 'submitOperationDefinition';

export interface OperationDefinition {
  operationId: string;
  title: string;
  actor: string;
  entity: string;
  kind: 'create' | 'update' | 'delete' | 'query' | 'view';
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  story: { actor: string; goal: string; soThat?: string; steps: string[]; outcome: string };
  // Mechanically attached at save (not from the LLM): the capability this operation realizes + its
  // priority — makes the operation the source of truth for "which feature + phase" it covers.
  capability?: { capabilityId: string; title: string; actor?: string; priority?: string };
  // Independent reconciler statuses: agentChangeFrontend reads/writes statusFrontend, agentChangeBackend
  // reads/writes statusBackend. Each is toCreate|toUpdate|toRemove|inProgress|done; both seeded
  // 'toCreate' on creation. Decoupling them avoids the single-status ambiguity between the two stages.
  statusFrontend?: ExperienceStatus;
  statusBackend?: ExperienceStatus;
}
export interface OperationDefinitionResult { operationDefinition: OperationDefinition }
export type OperationDefinitionOutput = PlannerOutput<OperationDefinitionResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the definition for the current operation selector.', operationDefinitionResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Detail one operation into its intent-level BFF contract', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] operation selector args invalid`);
  const indexItem = getOperationIndex(context).result.operations.find(o => o.operationId === args);
  if (!indexItem) throw new Error(`[${AGENT_NAME}] operation selector not in index: ${args}`);
  const story = getBehaviorIndex(context).result.operations.find(o => o.operationId === args)?.story;
  const ontology = await getEnrichedOntology(context);
  const entityShape = ontology[indexItem.entity];
  const reduced = { selector: args, indexItem, story, entityShape, ontologyEntityIds: Object.keys(ontology) };
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), `## Operation selector\n${args}\n\n## Reduced context\n${JSON.stringify(reduced, null, 2)}\n`, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: OperationDefinitionOutput | undefined;
  const selector = (step.prompt || '').trim();
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (selector && output.result.operationDefinition.operationId !== selector) output.result.operationDefinition.operationId = selector;
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }
  if (status === 'completed' && output && output.status === 'ok') {
    try {
      const def = output.result.operationDefinition;
      // Attach the realized capability (id + title + priority) deterministically.
      const capabilityId = getBehaviorIndex(context).result.operations.find(o => o.operationId === def.operationId)?.capabilityId;
      def.capability = capabilityId ? resolveCapabilityInfo([capabilityId], getFinalizeOutput(context).result.capabilities as unknown[])[0] : undefined;
      def.statusFrontend = EXPERIENCE_STATUS_INITIAL; // agentChangeFrontend picks up statusFrontend != 'done'
      def.statusBackend = EXPERIENCE_STATUS_INITIAL;   // agentChangeBackend picks up statusBackend != 'done'
      await saveDefsArtifact(operationFileInfo(def.operationId), `operation${capitalize(def.operationId)}`, def);
    } catch (error) {
      console.warn(`[${AGENT_NAME}] save failed for ${selector}`, error);
    }
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

/** Reads the GLOBAL l4/operations/*.defs.ts (fan-out children are deleted); in-task payloads override. */
export async function getOperationDefinitions(context: mls.msg.ExecutionContext): Promise<OperationDefinition[]> {
  const byId = new Map<string, OperationDefinition>();
  for (const d of await readOperationDefs()) {
    const id = typeof d.operationId === 'string' ? d.operationId : '';
    if (id) byId.set(id, d as unknown as OperationDefinition);
  }
  for (const o of getPlannerOutputs(context, AGENT_NAME, config)) {
    if (o.status === 'ok') byId.set(o.result.operationDefinition.operationId, o.result.operationDefinition);
  }
  return [...byId.values()];
}

const config: PlannerExtractConfig<OperationDefinitionResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): OperationDefinitionResult {
  const result = assertRecord(value, 'result');
  const d = assertRecord(result.operationDefinition, 'result.operationDefinition');
  const s = assertRecord(d.story, 'result.operationDefinition.story');
  return {
    operationDefinition: {
      operationId: assertString(d.operationId, 'result.operationDefinition.operationId'),
      title: assertString(d.title, 'result.operationDefinition.title'),
      actor: assertString(d.actor, 'result.operationDefinition.actor'),
      entity: assertString(d.entity, 'result.operationDefinition.entity'),
      kind: assertString(d.kind, 'result.operationDefinition.kind') as OperationDefinition['kind'],
      reads: normalizeStringList(d.reads, 'result.operationDefinition.reads'),
      writes: normalizeStringList(d.writes, 'result.operationDefinition.writes'),
      rulesApplied: normalizeStringList(d.rulesApplied, 'result.operationDefinition.rulesApplied'),
      story: { actor: assertString(s.actor, 'story.actor'), goal: assertString(s.goal, 'story.goal'), soThat: optionalString(s.soThat), steps: normalizeStringList(s.steps, 'story.steps'), outcome: assertString(s.outcome, 'story.outcome') },
    },
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Detail exactly ONE operation (the current selector) into its intent-level BFF contract.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.operationDefinition: operationId (== selector), title, actor (actorId), entity (canonical
ontology id), kind (create|update|delete|query|view), reads[] and writes[] (ontology entities or
"Entity.field" the operation reads/writes), rulesApplied[] (ruleIds), and the embedded story.

Rules:
- operationId must equal the selector. No tables, no per-page commands — this is the intent contract.
- reads/writes reference canonical ontology ids (optionally "Entity.field"), never aggregate names.

`;
