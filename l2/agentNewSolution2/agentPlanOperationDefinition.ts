/// <mls fileReference="_102020_/l2/agentNewSolution2/agentPlanOperationDefinition.ts" enhancement="_102027_/l2/enhancementAgent"/>

// NEW (Stage 1). Per-operation definition — the intent-level BFF contract (no tables):
// operationId, actor, entity, kind, reads/writes (ontology entities/fields), rulesApplied,
// embedded story, plus deterministic BFF naming handoff fields for Stage 2/3. One fan-out child per
// operationId; writes l4/operations/{id}.defs.ts.

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
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput, isRecord } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { getApprovedModuleName, operationFileInfo, readOntologyEntities, readOperationDefs, saveAgentTrace, saveDefsArtifact } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
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
  accessPattern: OperationAccessPattern;
  inputs: OperationInput[];
  contextResolution: OperationContextResolution[];
  acceptanceAssertions?: string[];
  // Deterministic handoff for frontend/backend. Stage 2 must use commandName/bffName in l2 contracts;
  // Stage 3 must use the same bffName as the route key. The LLM does not author these names.
  pageId?: string;
  commandName?: string;
  bffName?: string;
  // Mechanically attached at save (not from the LLM): the capability this operation realizes + its
  // priority — makes the operation the source of truth for "which feature + phase" it covers.
  capability?: { capabilityId: string; title: string; actor?: string; priority?: string };
}
export type OperationContextSource = 'userInput' | 'actorSession' | 'businessContext' | 'currentWorkspace' | 'selectedEntity' | 'activeLifecycleInstance' | 'workflowState' | 'routeParam' | 'previousStepOutput' | 'systemDefault';
export interface OperationAccessPattern {
  kind: 'list' | 'getById' | 'lookup' | 'commandInput';
  description: string;
  entity?: string;
  keyField?: string;
  filters?: string[];
  sort?: string[];
  pagination?: 'none' | 'optional' | 'required';
  selection?: 'none' | 'single' | 'multiple';
  output?: string[];
}
export interface OperationInput {
  inputId: string;
  fieldRef: string;
  required: boolean;
  source: OperationContextSource;
  description: string;
}
export interface OperationContextResolution {
  inputId?: string;
  targetRef: string;
  source: OperationContextSource;
  originRef: string;
  description: string;
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
  const behavior = getBehaviorIndex(context).result;
  const workflowOwner = behavior.workflows.find(w => (w.operationIds || []).includes(args));
  // Other entities go with id + title + description (not just ids) so a referenced entity is matched
  // by meaning; the operation's own target entity still goes fully expanded in entityShape.
  const ontologyEntities = Object.entries(ontology).map(([id, meta]) => ({ entityId: id, ...(isRecord(meta) ? { title: meta.title, description: meta.description } : {}) }));
  const reduced = { selector: args, indexItem, story, workflowOwner, entityShape, ontologyEntities };
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
    // Any non-ok status (failed OR needs_input) fails the step loudly with the questions in the trace,
    // instead of silently completing without saving (which surfaced later as plan.disk.divergence).
    if (output.status !== 'ok') {
      status = 'failed';
      const questions = Array.isArray(output.questions) && output.questions.length ? ` — questions: ${output.questions.join(' | ')}` : '';
      traceMsg = `${AGENT_NAME} returned '${output.status}' for operation ${selector}${questions}`;
    }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }
  if (status === 'completed' && output && output.status === 'ok') {
    const def = output.result.operationDefinition;
    try {
      // Attach the realized capability (id + title + priority) deterministically. A classified operation
      // carries its own capabilityId; an operation synthesized from a workflow's operationIds inherits the
      // capability of the workflow that orchestrates it.
      const behavior = getBehaviorIndex(context).result;
      const capabilityId = behavior.operations.find(o => o.operationId === def.operationId)?.capabilityId
        ?? behavior.workflows.find(w => (w.operationIds || []).includes(def.operationId))?.capabilityIds[0];
      def.capability = capabilityId ? resolveCapabilityInfo([capabilityId], getFinalizeOutput(context).result.capabilities as unknown[])[0] : undefined;
      attachBffNaming(context, def);
      // Deterministic repair: rewrite generic 'Entity.id' refs to the entity's canonical pk field
      // (convention '<entity>Id') when it resolves in the ontology — removes a common LLM slip that
      // otherwise hard-fails validation (operation.context.origin.unknown / accessPattern.key.unknown).
      try { normalizeIdRefs(def, await readOntologyEntities(getApprovedModuleName(context) || '')); } catch { /* ontology optional */ }
    } catch (error) {
      status = 'failed';
      traceMsg = `prepare failed for operation ${selector}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[${AGENT_NAME}] ${traceMsg}`);
    }
    // Save with one retry, then fail loudly (mirrors agentNs2EntityDefinition §14.1): a swallowed save
    // used to leave the operation missing on disk and only surface later as plan.disk.divergence.
    if (status === 'completed') {
      try {
        await saveDefsArtifact(operationFileInfo(def.operationId), `operation${capitalize(def.operationId)}`, def);
      } catch (firstError) {
        try {
          await saveDefsArtifact(operationFileInfo(def.operationId), `operation${capitalize(def.operationId)}`, def);
        } catch (secondError) {
          status = 'failed';
          traceMsg = `save failed for operation ${selector}: ${secondError instanceof Error ? secondError.message : String(secondError)}`;
          console.error(`[${AGENT_NAME}] ${traceMsg}`);
        }
      }
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
    if (o.status === 'ok') {
      const def = o.result.operationDefinition;
      attachBffNaming(context, def);
      byId.set(def.operationId, def);
    }
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
      accessPattern: normalizeAccessPattern(d.accessPattern, 'result.operationDefinition.accessPattern'),
      inputs: normalizeOperationInputs(d.inputs, 'result.operationDefinition.inputs'),
      contextResolution: normalizeContextResolution(d.contextResolution, 'result.operationDefinition.contextResolution'),
      acceptanceAssertions: normalizeStringList(d.acceptanceAssertions, 'result.operationDefinition.acceptanceAssertions'),
    },
  };
}

function normalizeAccessPattern(value: unknown, path: string): OperationAccessPattern {
  const p = assertRecord(value, path);
  const kind = assertString(p.kind, `${path}.kind`) as OperationAccessPattern['kind'];
  if (!['list', 'getById', 'lookup', 'commandInput'].includes(kind)) throw new Error(`${path}.kind invalid`);
  const pagination = optionalString(p.pagination) as OperationAccessPattern['pagination'];
  const selection = optionalString(p.selection) as OperationAccessPattern['selection'];
  return {
    kind,
    description: assertString(p.description, `${path}.description`),
    entity: optionalString(p.entity),
    keyField: optionalString(p.keyField),
    filters: normalizeStringList(p.filters, `${path}.filters`),
    sort: normalizeStringList(p.sort, `${path}.sort`),
    pagination: pagination && ['none', 'optional', 'required'].includes(pagination) ? pagination : undefined,
    selection: selection && ['none', 'single', 'multiple'].includes(selection) ? selection : undefined,
    output: normalizeStringList(p.output, `${path}.output`),
  };
}

function normalizeOperationInputs(value: unknown, path: string): OperationInput[] {
  return assertArray(value || [], path).map((item, index) => {
    const input = assertRecord(item, `${path}[${index}]`);
    return {
      inputId: assertString(input.inputId, `${path}[${index}].inputId`),
      fieldRef: assertString(input.fieldRef, `${path}[${index}].fieldRef`),
      required: input.required === true,
      source: normalizeContextSource(input.source, `${path}[${index}].source`),
      description: assertString(input.description, `${path}[${index}].description`),
    };
  });
}

function normalizeContextResolution(value: unknown, path: string): OperationContextResolution[] {
  return assertArray(value || [], path).map((item, index) => {
    const ctx = assertRecord(item, `${path}[${index}]`);
    return {
      inputId: optionalString(ctx.inputId),
      targetRef: assertString(ctx.targetRef, `${path}[${index}].targetRef`),
      source: normalizeContextSource(ctx.source, `${path}[${index}].source`),
      originRef: assertString(ctx.originRef, `${path}[${index}].originRef`),
      description: assertString(ctx.description, `${path}[${index}].description`),
    };
  });
}

function normalizeContextSource(value: unknown, path: string): OperationContextSource {
  const source = assertString(value, path) as OperationContextSource;
  if (['userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault'].includes(source)) return source;
  throw new Error(`${path} invalid`);
}

function attachBffNaming(context: mls.msg.ExecutionContext, def: OperationDefinition): void {
  const moduleName = getApprovedModuleName(context) || 'module';
  const pageId = pageIdForOperation(context, def.operationId);
  const commandName = def.operationId;
  def.pageId = pageId;
  def.commandName = commandName;
  def.bffName = `${moduleName}.${pageId}.${commandName}`;
}

function pageIdForOperation(context: mls.msg.ExecutionContext, operationId: string): string {
  try {
    const workflow = getBehaviorIndex(context).result.workflows.find(w => (w.operationIds || []).includes(operationId));
    if (workflow?.workflowId) return workflow.workflowId;
  } catch { /* fallback below */ }
  return operationId;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// Rewrite generic 'Entity.id' refs to the entity's canonical pk field (convention '<entity>Id', e.g.
// Order.id -> Order.orderId) when the pk resolves in the ontology and no literal 'id' field exists.
// Conservative: leaves the ref untouched if the entity/pk is unknown, so a real error still surfaces.
function normalizeIdRefs(def: OperationDefinition, ontology: Record<string, Record<string, unknown>>): void {
  const fix = (ref: string): string => {
    const dot = ref.indexOf('.');
    if (dot <= 0 || ref.slice(dot + 1) !== 'id') return ref;
    const entity = ref.slice(0, dot);
    const ent = ontology[entity];
    if (!ent || fieldExists(ent, 'id')) return ref;
    const pk = `${entity.charAt(0).toLowerCase()}${entity.slice(1)}Id`;
    return fieldExists(ent, pk) ? `${entity}.${pk}` : ref;
  };
  if (Array.isArray(def.inputs)) for (const input of def.inputs) if (typeof input.fieldRef === 'string') input.fieldRef = fix(input.fieldRef);
  if (Array.isArray(def.contextResolution)) for (const ctx of def.contextResolution) {
    if (typeof ctx.targetRef === 'string') ctx.targetRef = fix(ctx.targetRef);
    if (typeof ctx.originRef === 'string') ctx.originRef = fix(ctx.originRef);
  }
  if (def.accessPattern && typeof def.accessPattern.keyField === 'string') def.accessPattern.keyField = fix(def.accessPattern.keyField);
}

function fieldExists(entity: Record<string, unknown>, fieldId: string): boolean {
  const fields = Array.isArray(entity.fields) ? entity.fields : [];
  return fields.some(field => !!field && typeof field === 'object' && (field as Record<string, unknown>).fieldId === fieldId);
}

const systemPrompt = `
<!-- modelType: codepro -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Detail exactly ONE operation (the current selector) into its intent-level BFF contract.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.operationDefinition: operationId (== selector), title, actor (actorId), entity (canonical
ontology id), kind (create|update|delete|query|view), reads[] and writes[] (ontology entities or
"Entity.field" the operation reads/writes), rulesApplied[] (ruleIds), embedded story, accessPattern,
inputs[], contextResolution[] and acceptanceAssertions[].

Rules:
- operationId must equal the selector. No tables. Do not invent page, command or route names; the
  agent attaches pageId, commandName and bffName deterministically after the tool call.
- reads/writes reference canonical ontology ids (optionally "Entity.field"), never aggregate names.
- accessPattern.kind must be exactly one of list|getById|lookup|commandInput. For query/view, choose
  the user journey's best access: list for browsable sets, getById only when the journey already
  carries a selected id, lookup for compact selectors. For create/update/delete use commandInput.
  Exception: a read-only compute/assistant query (e.g. an AI assistant answering a free-form question)
  may use commandInput — but only if it has NO keyField and NO filters/sort/pagination/selection
  (otherwise it is a list/getById and must say so) and writes[] is empty.
- accessPattern.keyField, when present, must be fully qualified as Entity.field; never use a bare id.
- inputs[] must list every BFF input the frontend/backend contract needs. Each input.fieldRef must be
  an ontology field ref (Entity.field or Entity) and each input.source must be one of:
  userInput, actorSession, businessContext, currentWorkspace, selectedEntity, activeLifecycleInstance, workflowState,
  routeParam, previousStepOutput, systemDefault.
- Composition: if this create/update writes a child entity that is "partOf" the operation's root entity
  (e.g. OrderItem partOf Order), you MUST declare that child as a composed input (fieldRef = the child
  entity, e.g. "OrderItem", a repeatable list like items[]). The root and its composed children are
  ONE BFF command / one submit — never a separate "save order" then "save order item". Do not split a
  parent+children write into two operations.
- Required technical identifier inputs must not be plain userInput. A technical identifier is a
  primary id generated by the system or a field whose ontology type references another entity. Resolve
  those ids from selectedEntity, routeParam, previousStepOutput, activeLifecycleInstance,
  workflowState, actorSession, businessContext, currentWorkspace or systemDefault. userInput is for business values the
  actor types or chooses by label/value, not for raw entity ids.
- contextResolution[] declares fields resolved by the system/runtime, never typed manually. Each item
  must have targetRef, source and originRef:
  - targetRef = the operation input, ontology field, BFF filter or runtime field being filled. Use one
    of these exact forms: Entity.field for domain data, input.<inputId> for an operation input,
    filter.<name> for a BFF/runtime filter, or one of the explicit runtime attributes below. Do not
    use loose names such as "id", "workspaceId" or "referenceDate".
  - source = one of the closed context sources.
  - originRef = the concrete source path.
  Valid originRef formats:
  - actorSession: actorSession.actorId or actorSession.scope.
  - businessContext: businessContext.activeCompanyId or businessContext.activeUnitId. Use this for
    business scope such as primary company/unit; do not use currentWorkspace as a company filter.
  - currentWorkspace: currentWorkspace.workspaceId.
  - systemDefault: systemDefault.now, systemDefault.uuid or systemDefault.locale.
  - selectedEntity, activeLifecycleInstance, workflowState: Entity.field.
- routeParam: routeParam.<name>, matching a journey edge/inputResolution.
- previousStepOutput: previousStepOutput.<operationId>.<field>, matching a journey edge/inputResolution.
  Do not put persistence/table/usecase internals here.
- acceptanceAssertions[] must be objective checks for this operation, such as "opening the list
  requires no typed technical id" or "the action uses the id selected in the journey".

`;
