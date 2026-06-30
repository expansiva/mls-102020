/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2Finalize.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Apply the review and FREEZE the domain plan — the source of truth for the behavior plans. Writes
// the durable l4 domain artifacts (module map + rules), registers the module in l5/project.json, then
// spawns the per-entity ontology fan-out (agentNs2EntityDefinition). Workflows/operations come later.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  coerceOntologyEnumArrays,
  createParallelDynamicAgentStepIntent,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  findStepByPlanId,
  getPlannerOutput,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import {
  actorsFileInfo,
  getApprovedModuleName,
  mergeProjectJson,
  moduleDefsFileInfo,
  ruleSetFileInfo,
  saveAgentTrace,
  saveDefsArtifact,
} from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { getInitialPlanSummary, isRecord, optionalString, optionalStringArray, parallelProgressTitle } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { finalizeResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getBlueprintOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Blueprint.js';
import { getBlueprintReviewOutput } from '/_102020_/l2/agentNewSolution2/agentNs2BlueprintReview.js';
import { getImplementationDecisionResult } from '/_102020_/l2/agentNewSolution2/agentNewSolution2Requirements.js';

const AGENT_NAME = 'agentNs2Finalize';
const TOOL_NAME = 'submitFinalDomainPlan';

export interface FinalizeResult {
  module: Record<string, unknown>;
  actors: unknown[];
  capabilities: unknown[];
  ontology: { entities: Record<string, unknown> };
  rules: unknown[];
  relationships: unknown[];
  approvedArtifacts: { mdm: unknown[]; horizontals: unknown[]; plugins: unknown[]; agents: unknown[] };
  decisions: unknown[];
  deferredItems: unknown[];
}
export type FinalizeOutput = PlannerOutput<FinalizeResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the frozen Stage-1 domain plan.', finalizeResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Freeze the domain plan and write the l4 domain artifacts', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const blueprint = getBlueprintOutput(context);
  const review = getBlueprintReviewOutput(context);
  const decisions = getImplementationDecisionResult(context);
  const human = `## Blueprint\n${JSON.stringify(blueprint.result, null, 2)}\n\n## Review findings\n${JSON.stringify(review?.result ?? { findings: [] }, null, 2)}\n\n## Accepted decisions\n${JSON.stringify(decisions, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: FinalizeOutput | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }

  const intents: mls.msg.AgentIntent[] = [];
  if (status === 'completed' && output && output.status === 'ok') {
    await persistDomain(context, output.result);
    intents.push(...spawnEntityFanOut(context, output.result));
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg));
  return intents;
}

async function persistDomain(context: mls.msg.ExecutionContext, result: FinalizeResult): Promise<void> {
  const moduleName = getApprovedModuleName(context);
  if (!moduleName) { console.warn(`[${AGENT_NAME}] no confirmed module name; skipping l4 writes`); return; }
  try {
    // module.defs.ts is the slim structural artifact. capabilities are NOT persisted as a top-level
    // list (they are realized — with priority — on each workflow/operation); actors live in l4/actors.
    // The ontology block is only an index: canonical entity fields/kind/status live in
    // l4/{module}/ontology/{Entity}.defs.ts to avoid split sources of truth.
    // designContext carries the ORIGINAL intent for Stage 2: the user's prompt, language, open details
    // and the priority decisions (so the page generator knows what was requested and what was deferred).
    await saveDefsArtifact(moduleDefsFileInfo(moduleName), `${moduleName}Module`, {
      module: result.module,
      designContext: buildDesignContext(context),
      ontology: { entities: buildOntologyIndex(moduleName, result.ontology.entities) },
      relationships: result.relationships,
      approvedArtifacts: result.approvedArtifacts,
    });
    // Actors -> l4/actors/{module}Actors.defs.ts, each with a JWT role scope `{module}:{actorId}`.
    await saveDefsArtifact(actorsFileInfo(moduleName), `${moduleName}Actors`, { moduleName, actors: buildActorRoster(moduleName, result.actors) });
    if (result.rules.length > 0) {
      await saveDefsArtifact(ruleSetFileInfo(`${moduleName}Rules`), `${moduleName}Rules`, { ruleSetId: `${moduleName}Rules`, rules: result.rules });
    }
    await mergeProjectJson({
      moduleName,
      title: (result.module as Record<string, unknown>).title || (result.module as Record<string, unknown>).purpose || moduleName,
      stage: 'behavior',
      layer: 'l4',
    }, [], moduleLanguages(result.module));
  } catch (error) {
    console.warn(`[${AGENT_NAME}] persistDomain failed`, error);
  }
}

/** Durable design intent for Stage 2: the user's prompt + language + open details + priority decisions. */
function buildDesignContext(context: mls.msg.ExecutionContext): Record<string, unknown> {
  let initialPrompt = '';
  let userLanguage = '';
  let openDetails: unknown[] = [];
  try {
    const plan = getInitialPlanSummary(context);
    initialPrompt = typeof plan.userPrompt === 'string' ? plan.userPrompt : '';
    userLanguage = typeof plan.userLanguage === 'string' ? plan.userLanguage : '';
    openDetails = Array.isArray(plan.openDetails) ? plan.openDetails : [];
  } catch { /* tolerate */ }
  let decisions: Record<string, unknown>[] = [];
  try {
    decisions = getImplementationDecisionResult(context).decisions.map(d => ({
      recommendationId: d.recommendationId,
      artifactType: d.artifactType,
      title: d.title,
      decidedPriority: d.decidedPriority,
      accepted: d.accepted,
    }));
  } catch { /* decisions may be absent */ }
  return { initialPrompt, userLanguage, openDetails, decisions };
}

function buildOntologyIndex(moduleName: string, entities: Record<string, unknown>): Record<string, Record<string, string>> {
  const index: Record<string, Record<string, string>> = {};
  for (const entityId of Object.keys(entities || {}).filter(Boolean)) {
    index[entityId] = {
      entityId,
      defPath: `l4/${moduleName}/ontology/${entityId}.defs.ts`,
    };
  }
  return index;
}

function moduleLanguages(module: Record<string, unknown>): string[] {
  return optionalStringArray(module.languages) || [];
}

/** Actor roster for authz: each actor + a stable JWT role scope `{module}:{actorId}`. */
function buildActorRoster(moduleName: string, actors: unknown[]): Record<string, unknown>[] {
  return (Array.isArray(actors) ? actors : []).filter(isRecord).map(actor => {
    const actorId = optionalString(actor.actorId) || '';
    return {
      actorId,
      title: optionalString(actor.title) || actorId,
      description: optionalString(actor.description) || '',
      roleScope: actorId ? `${moduleName}:${actorId}` : '',
    };
  }).filter(a => a.actorId);
}

/** Spawn one fan-out child per ontology entity into the planned 'plan-entity-definition' placeholder. */
function spawnEntityFanOut(context: mls.msg.ExecutionContext, result: FinalizeResult): mls.msg.AgentIntent[] {
  const placeholder = findStepByPlanId(context, 'plan-entity-definition') as mls.msg.AIAgentStep | null;
  if (!placeholder || placeholder.type !== 'agent' || placeholder.status === 'completed') return [];
  const entityIds = Object.keys(result.ontology.entities).filter(Boolean);
  if (entityIds.length === 0) {
    return [createUpdateStatusIntent(context, placeholder, placeholder, 0, 'completed', 'No ontology entities to detail.')];
  }
  return [createParallelDynamicAgentStepIntent(context, placeholder, 'agentNs2EntityDefinition', 'plan-entity-definition:parallel', parallelProgressTitle(context, 'Detalhando entidades', 'Detailing entities'), entityIds, 5)];
}

export function getFinalizeOutput(context: mls.msg.ExecutionContext): FinalizeOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
}

const config: PlannerExtractConfig<FinalizeResult> = { toolName: TOOL_NAME, preNormalizeResult: coerceOntologyEnumArrays, normalizeResult };

function normalizeResult(value: unknown): FinalizeResult {
  const result = assertRecord(value, 'result');
  const ontology = assertRecord(result.ontology, 'result.ontology');
  const approved = assertRecord(result.approvedArtifacts, 'result.approvedArtifacts');
  return {
    module: assertRecord(result.module, 'result.module'),
    actors: assertArray(result.actors, 'result.actors'),
    capabilities: assertArray(result.capabilities, 'result.capabilities'),
    ontology: { entities: assertRecord(ontology.entities, 'result.ontology.entities') },
    rules: assertArray(result.rules, 'result.rules'),
    relationships: assertArray(result.relationships, 'result.relationships'),
    approvedArtifacts: {
      mdm: assertArray(approved.mdm, 'result.approvedArtifacts.mdm'),
      horizontals: assertArray(approved.horizontals, 'result.approvedArtifacts.horizontals'),
      plugins: assertArray(approved.plugins, 'result.approvedArtifacts.plugins'),
      agents: assertArray(approved.agents, 'result.approvedArtifacts.agents'),
    },
    decisions: assertArray(result.decisions, 'result.decisions'),
    deferredItems: assertArray(result.deferredItems, 'result.deferredItems'),
  };
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Apply the review and freeze the FINAL domain plan. This is the source of truth for the behavior plans.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result: module, actors, capabilities (keep behaviorHint), ontology MAP (data nouns only — no fields
here), rules, relationships, approvedArtifacts (mdm/horizontals/plugins/agents), decisions[], and
deferredItems[]. Apply the review findings (fix gaps, drop use-case-shaped entities). Keep ids stable
between the blueprint and here so later stages can resolve references.

Rules:
- Stage 1 only — no pages/tables/persistence/metrics.
- Every entity reference uses the canonical ontology id (the entity map key), never an aggregate name.

`;
