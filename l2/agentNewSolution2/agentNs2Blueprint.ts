/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2Blueprint.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Blueprint: module + actors + capabilities (each with a behaviorHint: workflow vs operation) +
// ontology MAP + rules + relationships + behavior-level plan (mdm/horizontals/plugins/agents).
// GUARD (analise11): ontology.entities are persistent DATA nouns only — never use-cases/workflows.
// This is also where the module name becomes final (the user's free-text answer is interpreted here).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  coerceOntologyEnumArrays,
  createPromptReadyIntent,
  createResultStepIntent,
  createUpdateStatusIntent,
  getPlannerOutput,
  isRecord,
  readPlatformSkill,
  withPlatformSkill,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { getApprovedModuleName, getInitialModuleName, reserveAvailableModuleName, saveAgentTrace } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { MODULE_NAME_FINAL_PLAN_ID } from '/_102020_/l2/agentNewSolution2/ns2Plan.js';
import { blueprintResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getSnapshot } from '/_102020_/l2/agentNewSolution2/ns2Snapshot.js';

const AGENT_NAME = 'agentNs2Blueprint';
const TOOL_NAME = 'submitBlueprint';

export interface BlueprintResult {
  module: Record<string, unknown>;
  actors: unknown[];
  capabilities: unknown[];
  ontology: { entities: Record<string, unknown> };
  rules: unknown[];
  relationships: unknown[];
  behaviorPlan: { mdm: unknown[]; horizontals: unknown[]; plugins: unknown[]; agents: unknown[] };
}
export type BlueprintOutput = PlannerOutput<BlueprintResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the Stage-1 blueprint.', blueprintResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Create the Stage-1 blueprint (ontology map, rules, behavior hints)', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const snapshot = getSnapshot(context);
  const platformSkill = await readPlatformSkill();
  const human = `## Initial prompt\n${snapshot.initialPlan.userPrompt}\n\n## Clarification answer\n${JSON.stringify(snapshot.clarificationAnswer, null, 2)}\n\n## Discovered scope\n${JSON.stringify(snapshot.discoveredScope, null, 2)}\n\n## Accepted decisions\n${JSON.stringify(snapshot.decisions, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, withPlatformSkill(systemPrompt.split('{{toolName}}').join(TOOL_NAME), platformSkill), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: BlueprintOutput | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    assertOntologyIsDataOnly(output.result.ontology.entities);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }

  const intents: mls.msg.AgentIntent[] = [];
  // Confirm the module name once (idempotent): interpret module.moduleName, pick a collision-free
  // folder, and record it as the 'module-name-final' result step every later agent resolves.
  if (status === 'completed' && output && output.status === 'ok' && !getApprovedModuleName(context)) {
    try {
      const requested = (output.result.module as Record<string, unknown>).moduleName;
      const finalName = reserveAvailableModuleName(requested, getInitialModuleName(context));
      intents.push(createResultStepIntent(context, parentStep, MODULE_NAME_FINAL_PLAN_ID, ['plan-solution-blueprint'], `Module name: ${finalName}`, { moduleName: finalName }));
      console.log(`[${AGENT_NAME}] module name confirmed: ${finalName}`);
    } catch (error) {
      console.warn(`[${AGENT_NAME}] module name confirmation failed`, error);
    }
  }

  await saveAgentTrace(context, AGENT_NAME, step);
  intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg));
  return intents;
}

export function getBlueprintOutput(context: mls.msg.ExecutionContext): BlueprintOutput {
  return getPlannerOutput(context, AGENT_NAME, config);
}

/** analise11 guard: reject use-case-shaped entries masquerading as ontology data entities. */
function assertOntologyIsDataOnly(entities: Record<string, unknown>): void {
  const offenders: string[] = [];
  for (const [entityId, value] of Object.entries(entities)) {
    const kind = isRecord(value) && typeof value.kind === 'string' ? value.kind : '';
    if (/^(uc|usecase)/i.test(entityId) || kind === 'usecase') offenders.push(entityId);
  }
  if (offenders.length > 0) throw new Error(`ontology.entities must be data nouns only; use-case-shaped ids: ${offenders.join(', ')}`);
}

const config: PlannerExtractConfig<BlueprintResult> = { toolName: TOOL_NAME, preNormalizeResult: coerceOntologyEnumArrays, normalizeResult };

function normalizeResult(value: unknown): BlueprintResult {
  const result = assertRecord(value, 'result');
  const ontology = assertRecord(result.ontology, 'result.ontology');
  const behaviorPlan = assertRecord(result.behaviorPlan, 'result.behaviorPlan');
  return {
    module: assertRecord(result.module, 'result.module'),
    actors: assertArray(result.actors, 'result.actors'),
    capabilities: assertArray(result.capabilities, 'result.capabilities'),
    ontology: { entities: assertRecord(ontology.entities, 'result.ontology.entities') },
    rules: assertArray(result.rules, 'result.rules'),
    relationships: assertArray(result.relationships, 'result.relationships'),
    behaviorPlan: {
      mdm: assertArray(behaviorPlan.mdm, 'result.behaviorPlan.mdm'),
      horizontals: assertArray(behaviorPlan.horizontals, 'result.behaviorPlan.horizontals'),
      plugins: assertArray(behaviorPlan.plugins, 'result.behaviorPlan.plugins'),
      agents: assertArray(behaviorPlan.agents, 'result.behaviorPlan.agents'),
    },
  };
}

// `assertString` is imported to keep the helper set consistent across agents (used by normalizers).
void assertString;

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1 — the durable business model).
Produce the blueprint from the prompt, clarification, scope and accepted decisions.
Use the user's language for titles/descriptions; camelCase ids and PascalCase entity ids.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result:
- module: moduleName, purpose, businessDomain, languages, visualStyle. moduleName is a SINGLE
  camelCase identifier — the user's clarification answer is free text (e.g. "sim cafeShow" means the
  name cafeShow); extract just the name, never include affirmation/filler words.
- actors.
- capabilities: each with actor, priority and behaviorHint (workflow = stateful process over time;
  operation = direct single-actor action; either = unsure).
- ontology.entities: an object map keyed by PascalCase id. Each value has title, description,
  ownership (and kind/statusEnum/lifecycleStates when known). This is a MAP — do NOT detail fields
  here (a later stage does). ontology.entities hold ONLY persistent DATA nouns (kind core/mdm/event/
  metric/supporting). NEVER put use-cases/workflows/queries here; never use Uc*/verb-named ids.
  - ownership is REQUIRED and MUST be EXACTLY one of: moduleOwned, mdmOwned, horizontalOwned,
    pluginOwned, existingModuleOwned, external. Use moduleOwned for entities this module owns
    (the default), mdmOwned for cadastral master-data. Never invent other values (e.g. "module",
    "internal", "owned") — the tool call is rejected if ownership is outside this list.
  - kind, when set, MUST be EXACTLY one of: core, mdm, event, metric, supporting.
  - kind=event is an immutable record of something that happened (status transitions, activity log,
    audit trail). When you add an event entity you MUST (a) set its eventPolicy.purpose — telemetry
    (metrics/reporting, retentionDays default 90), audit (kept history/compliance), or reaction
    (transient outbox trigger, no stored history) — and (b) add a relationship linking it to the core
    entity it belongs to (e.g. fromEntity=OrderStatusEvent, toEntity=Order), so Stage 3 can attach,
    persist and write it. An event without a policy or without an owner relationship will be dropped
    downstream.
  - kind=mdm is ONLY stable cadastral master-data (identity/registration: people, companies,
    vehicles, rooms, furniture, menu/catalog), referenced by id; its statusEnum is a cadastral
    lifecycle (active/inactive), never an operational state.
  - Operational/transactional STATE is NEVER mdm. A status that moves during operation
    (occupied/available, open/closed, in-progress, balances, current charges/consumption) is a
    kind=core entity with its own table.
  - When one real-world thing has BOTH a registration and a live state, SPLIT it into two entities:
    the registration as kind=mdm (cadastral status), the live state as a separate kind=core entity
    that references it by id — e.g. Table (mdm cadastro: number, room) + TableOccupancy
    (core: occupied/available, currentChargesTotal). Operations then write the core state, not the mdm record.
- rules: centralized, stable ruleId.
- relationships.
- behaviorPlan: mdm, horizontals, plugins, agents signals ({ title, reason }).

Rules:
- Stage 1 only. Do NOT plan pages, tables, persistence or metrics.
- Reference platform-provided concerns instead of modeling them.
- status "needs_input" only when a safe blueprint cannot be drafted without another client decision.

`;
