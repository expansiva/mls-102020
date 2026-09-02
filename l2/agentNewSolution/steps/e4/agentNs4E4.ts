/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e4/agentNs4E4.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E4 uses the proven agentNewSolution ontology topology: one compact cross-entity plan, one
// parallel LLM call per entity, then a deterministic aggregate/finalize pass. The human still sees
// one complete ontology clarification. A bad parallel child completes with trace; the finalizer
// retries only missing/invalid entities, so one provider failure cannot fail the entire fan-out.

import { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution/helpers/ns4StepTree.js';
import { createNs4FlexibleWorkerTool, unwrapNs4FlexibleWorkerPayload } from '/_102020_/l2/agentNewSolution/helpers/ns4WorkerTools.js';
import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { showNs4ClarificationError } from '/_102020_/l2/agentNewSolution/helpers/ns4Clarification.js';
import {
  readNs4ApprovedAccess, readNs4ApprovedJourneys, readNs4ApprovedOntology,
  readNs4ApprovedOntologyEntity,
} from '/_102020_/l2/agentNewSolution/helpers/ns4ApprovedArtifacts.js';
import {
  createNs4E4FinalizeStep,
  createNs4E4RelationshipBindingStep,
  createNs4E4RepairStep,
  createNs4E4Step,
  plainNs4StepTitle,
  isNs4Pipeline,
  markNs4E3Approved,
  markNs4E4Approved,
  markNs4E4Failed,
  markNs4E4Running,
  markNs4E4WaitingHuman,
  markNs4ModuleE4Approved,
  NS4_E4_MAX_PARALLEL,
  Ns4ApprovedBy,
  Ns4PipelineState,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  ns4E4EntityDraftFile,
  ns4E4PlanDraftFile,
  ns4AgentFile,
  ns4PipelineJsonFile,
  readNs4AgentText,
  readNs4Module,
  readNs4Pipeline,
  readNs4Text,
  writeNs4E4Draft,
  writeNs4E4EntityDraft,
  writeNs4E4PlanDraft,
  writeNs4E4RelationshipBindingsDraft,
  writeNs4Json,
  writeNs4Module,
  writeNs4OntologyEntity,
  writeNs4OntologyIndex,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import { Ns4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import {
  normalizeNs4E3Review,
  Ns4E3Review,
} from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import {
  assembleNs4E4Review,
  applyNs4E4RelationshipBindings,
  buildNs4OntologyArtifacts,
  normalizeNs4E4EntityDraft,
  stripNs4DerivedFieldUnions,
  normalizeNs4E4PlanDraft,
  normalizeNs4E4RelationshipBindings,
  normalizeNs4E4Review,
  Ns4E4EntityDraft,
  Ns4E4EntityFeedback,
  Ns4E4PlanDraft,
  Ns4E4RelationshipBindingsDraft,
  Ns4E4Review,
  Ns4E4ReviewEvent,
} from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';
import {
  ns4E4BindingOwnerEscalation,
  ns4E4RequestText,
  validateNs4E4EntityDraft,
  validateNs4E4Plan,
  validateNs4E4RelationshipBindings,
  validateNs4E4Review,
  type Ns4E4GateOptions,
} from '/_102020_/l2/agentNewSolution/steps/e4/gate.js';
import { resolveNs4E4HookArgs, resolveNs4E4InvocationArgs } from '/_102020_/l2/agentNewSolution/steps/e4/hookArgs.js';
import { decideNs4LaterCheckpoint, ns4E4SmartSignal } from '/_102020_/l2/agentNewSolution/helpers/ns4ReviewPolicy.js';

interface Ns4E4Args {
  planId: 'e4-ontology';
  stage?: 'plan' | 'finalize' | 'bindRelationships';
  moduleName?: string;
  adjustment?: string;
  reviewRound?: number;
  solutionMode: 'new';
  repairAttempt?: number;
  entityRepairRound?: number;
  planRepairAttempt?: number;
  bindingRepairAttempt?: number;
  gateFeedback?: string;
}

const MAX_PLAN_REPAIRS = 1;
const MAX_ENTITY_REPAIR_ROUNDS = 1;
const MAX_RELATIONSHIP_BINDING_REPAIRS = 1;
interface Ns4PersistedE4 {
  moduleName: string;
  solutionMode: 'new';
  entityCount: number;
  relationshipCount: number;
  artifactPaths: string[];
}

export async function beforeNs4E4PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution:e4] task invalid');
  const hookArgs = resolveNs4E4HookArgs(args, step.prompt);
  const entityId = parseEntitySelector(hookArgs) || parseEntitySelector(step.prompt);
  let moduleName = '';
  try {
    const parsed = resolveE4Args(context, resolveNs4E4InvocationArgs(hookArgs, entityId));
    moduleName = parsed.moduleName;
    if (entityId) return [await buildEntityPrompt(context, parentStep, hookSequential, hookArgs, parsed, entityId)];
    if (parsed.stage === 'finalize') {
      return await finalizeOntology(context, parentStep, step, hookSequential, parsed);
    }
    if (parsed.stage === 'bindRelationships') {
      return [await buildRelationshipBindingPrompt(context, parentStep, hookSequential, hookArgs, parsed)];
    }
    if (!parsed.stage && !parsed.adjustment && !parsed.gateFeedback) {
      const resumed = await resumeRelationshipBindingFromValidDrafts(
        context, parentStep, step, hookSequential, parsed,
      );
      if (resumed) return resumed;
    }
    return [await buildPlanPrompt(context, parentStep, hookSequential, hookArgs, parsed)];
  } catch (error) {
    const message = errorMessage(error);
    if (entityId) {
      return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Entity ${entityId} prompt failed; finalizer will repair it. | ${message}`, 'input_output')];
    }
    await recordNs4E4Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function buildPlanPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  hookArgs: string,
  args: Ns4E4Args & { moduleName: string },
): Promise<mls.msg.AgentIntentPromptReady> {
  const handoff = findE3Handoff(context, args.moduleName);
  const storedPipeline = await readNs4Pipeline(args.moduleName);
  if (!isNs4Pipeline(storedPipeline)) throw new Error(`E3 approved pipeline not found for ${args.moduleName}.`);
  let pipeline = storedPipeline;
  if (pipeline.steps.e3?.status !== 'approved') {
    if (!handoff) throw new Error(`E3 approved pipeline state not found for ${args.moduleName}.`);
    pipeline = markNs4E3Approved(pipeline, handoff.approvedBy, handoff.artifactPath, handoff.approvedAt);
    await writeNs4Pipeline(pipeline);
  }
  const [moduleArtifact, journeys, access, prompt, platform] = await Promise.all([
    readNs4Module(args.moduleName),
    readNs4ApprovedJourneys(args.moduleName),
    handoff?.approvedReview ? Promise.resolve(handoff.approvedReview) : readNs4ApprovedAccess(args.moduleName),
    readNs4AgentText('steps/e4', 'prompt'),
    readNs4AgentText('skills', 'platform'),
  ]);
  if (!moduleArtifact) throw new Error(`E3 approved artifacts not found for ${args.moduleName}.`);
  if (moduleArtifact.solutionStrategy.mode !== 'newSolution') {
    throw new Error(`E4 modernization intake is not implemented for strategy ${moduleArtifact.solutionStrategy.mode}.`);
  }
  const reviewRound = args.reviewRound || pipeline.steps.e4?.reviewRound || 1;
  // A plan-gate repair runs before E4 has produced any approved ontology artifact. Its persisted
  // overview is supplied below as previousPlan; only a later human adjustment may read E4 output.
  const previousDraft = args.adjustment ? await readNs4ApprovedOntology(args.moduleName) : null;
  const previousPlan = args.gateFeedback ? await readOptionalPlanDraft(args.moduleName) : null;
  const humanPrompt = [
    '## Explicit delivery mode\nnew solution; new persistence design; no legacy database contract',
    `## Required review round\n${reviewRound}`,
    '## Approved module contract', JSON.stringify(moduleArtifact),
    '## Approved E2 journeys', JSON.stringify(journeys),
    '## Approved E3 access matrix', JSON.stringify(access),
    args.adjustment ? `## Human structural change request\n${args.adjustment}` : '',
    args.gateFeedback ? `## Deterministic gate repair required\n${args.gateFeedback}` : '',
    previousPlan ? `## Current invalid overview; repair it rather than starting over\n${JSON.stringify(previousPlan)}` : '',
    previousDraft ? `## Previous complete E4 review, including direct human edits\n${JSON.stringify(previousDraft)}` : '',
  ].filter(Boolean).join('\n\n');
  return promptReady(context, parentStep, hookSequential, hookArgs, prompt.replace('{{platformSkill}}', platform), humanPrompt);
}

async function resumeRelationshipBindingFromValidDrafts(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E4Args & { moduleName: string },
): Promise<mls.msg.AgentIntent[] | null> {
  const pipeline = await requirePipeline(args.moduleName);
  if (pipeline.steps.e4?.status !== 'failed') return null;
  const plan = await readOptionalPlanDraft(args.moduleName);
  if (!plan || plan.reviewRound !== (pipeline.steps.e4.reviewRound || 1)) return null;
  const [journeys, access] = await Promise.all([
    readNs4ApprovedJourneys(args.moduleName), readNs4ApprovedAccess(args.moduleName),
  ]);
  if (!validateNs4E4Plan(plan, journeys, access, await e4RequestOptions(args.moduleName)).ok) return null;
  const details: Ns4E4EntityDraft[] = [];
  for (const entity of plan.entities) {
    const detail = await readEntityDraft(args.moduleName, entity.entityId);
    if (!detail || !validateNs4E4EntityDraft(plan, detail).ok) return null;
    details.push(detail);
  }
  const review = assembleNs4E4Review(plan, details);
  if (!validateNs4E4Review(review, journeys, access, await e4RequestOptions(args.moduleName, { requireRelationshipRealization: false })).ok) return null;
  const runningPipeline = markNs4E4Running(pipeline, plan.reviewRound);
  await writeNs4Pipeline(runningPipeline);
  const mutationParent = findMutableParentStep(context, parentStep);
  if (!review.relationships.length) {
    return openOntologyReview(
      context, mutationParent, step, hookSequential, review, runningPipeline, journeys, access,
    );
  }
  return [
    addStep(context, mutationParent, createNs4E4RelationshipBindingStep(args.moduleName, plan.reviewRound)),
    updateStatus(
      context, mutationParent, step, hookSequential, 'completed',
      `E4 resumed from ${details.length} revalidated entity drafts; continuing at relationship binding.`,
      'input_output',
    ),
  ];
}

async function buildEntityPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  hookArgs: string,
  args: Ns4E4Args & { moduleName: string },
  entityId: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const plan = await readPlanDraft(args.moduleName);
  const target = plan.entities.find(entity => entity.entityId === entityId);
  if (!target) throw new Error(`Entity ${entityId} is not present in the E4 overview.`);
  const [journeys, access, prompt, previousEntity, currentDetail, tool] = await Promise.all([
    readNs4ApprovedJourneys(args.moduleName), readNs4ApprovedAccess(args.moduleName),
    readNs4AgentText('steps/e4', 'promptEntity'), readNs4ApprovedOntologyEntity(args.moduleName, entityId), readEntityDraft(args.moduleName, entityId),
    readNs4EntityWorkerTool(),
  ]);
  const relatedJourneys = journeys.journeys.filter(journey => target.sourceRefs.journeyIds.includes(journey.journeyId));
  const relatedFeatures = journeys.features.filter(feature => target.sourceRefs.featureIds.includes(feature.featureId));
  const relatedAuthorities = access.authorities.filter(authority => target.sourceRefs.authorityRefs.includes(authority.authorityRef));
  const relatedGrants = access.grants.filter(grant => target.sourceRefs.authorityRefs.includes(grant.authorityRef));
  const touchingRelationships = plan.relationships.filter(rel => rel.fromEntity === entityId || rel.toEntity === entityId);
  const currentGate = currentDetail ? validateNs4E4EntityDraft(plan, currentDetail) : null;
  const upstreamRepairFeedback = memoryString(context, 'resumeFeedback');
  const bindingOwnerFeedback = await readEntityFeedback(args.moduleName, entityId);
  const entityRepairText = [
    currentGate && !currentGate.ok ? formatGate(currentGate.issues) : '',
    bindingOwnerFeedback,
  ].filter(Boolean).join('\n');
  const humanPrompt = [
    '## Frozen target entity overview', JSON.stringify(target),
    '## All valid entity ids and storage targets', JSON.stringify(plan.entities.map(entity => ({ entityId: entity.entityId, storage: entity.storage.target }))),
    '## Relationships touching this entity', JSON.stringify(touchingRelationships),
    '## Related E2 journeys and features', JSON.stringify({ journeys: relatedJourneys, features: relatedFeatures }),
    '## Related E3 authorities and grants', JSON.stringify({ authorities: relatedAuthorities, grants: relatedGrants }),
    previousEntity ? `## Previous human-reviewed entity; preserve unaffected edits\n${JSON.stringify(stripNs4DerivedFieldUnions(previousEntity))}` : '',
    currentDetail ? `## Current entity draft\n${JSON.stringify(currentDetail)}` : '',
    entityRepairText ? `## Entity gate repair required\n${entityRepairText}` : '',
    upstreamRepairFeedback ? `## Downstream E5 contract gaps to resolve where this entity is relevant\n${upstreamRepairFeedback}` : '',
    `## Required identity\nmoduleName=${plan.moduleName}; reviewRound=${plan.reviewRound}; entityId=${entityId}; userLanguage=${plan.userLanguage}`,
  ].filter(Boolean).join('\n\n');
  return promptReady(context, parentStep, hookSequential, hookArgs, prompt, humanPrompt, tool);
}

async function buildRelationshipBindingPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  hookArgs: string,
  args: Ns4E4Args & { moduleName: string },
): Promise<mls.msg.AgentIntentPromptReady> {
  const plan = await readPlanDraft(args.moduleName);
  const details = await readAllEntityDrafts(plan);
  const review = assembleNs4E4Review(plan, details);
  const prompt = await readNs4AgentText('steps/e4', 'promptRelationships');
  const compactEntities = review.entities.map(entity => ({
    entityId: entity.entityId,
    kind: entity.kind,
    storage: entity.storage,
    fields: entity.fields.map(field => ({
      fieldId: field.fieldId, type: field.type, required: field.required, description: field.description,
    })),
  }));
  const humanPrompt = [
    `## Required identity\nmoduleName=${review.moduleName}; reviewRound=${review.reviewRound}`,
    '## Frozen entities and their exact available fields', JSON.stringify(compactEntities),
    '## Frozen semantic relationships to bind', JSON.stringify(review.relationships.map(({ realization: _ignored, ...relationship }) => relationship)),
    args.gateFeedback ? `## Deterministic binding gate repair required\n${args.gateFeedback}` : '',
  ].filter(Boolean).join('\n\n');
  return promptReady(context, parentStep, hookSequential, hookArgs, prompt, humanPrompt);
}

export async function afterNs4E4PromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const entityId = parseEntitySelector(args) || parseEntitySelector(step.prompt);
  let moduleName = '';
  try {
    const args = resolveE4Args(context, resolveNs4E4InvocationArgs(String(step.prompt || ''), entityId));
    moduleName = args.moduleName;
    const mutationParent = findMutableParentStep(context, parentStep, entityId ? undefined : step);
    if (entityId) return await handleEntityResult(context, mutationParent, step, hookSequential, args, entityId);
    if (args.stage === 'bindRelationships') {
      return await handleRelationshipBindingResult(context, mutationParent, step, hookSequential, args);
    }
    return await handlePlanResult(agent, context, mutationParent, step, hookSequential, args);
  } catch (error) {
    const message = errorMessage(error);
    if (entityId) {
      return [updateStatus(context, parentStep, step, hookSequential, 'completed', `Entity ${entityId} failed; finalizer will repair it. | ${message}`, 'input_output')];
    }
    await recordNs4E4Failure(moduleName, message);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function handlePlanResult(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E4Args & { moduleName: string },
): Promise<mls.msg.AgentIntent[]> {
  const pipeline = await requirePipeline(args.moduleName);
  const reviewRound = args.reviewRound || pipeline.steps.e4?.reviewRound || 1;
  await writeNs4Pipeline(markNs4E4Running(pipeline, reviewRound));
  const payload = unwrapPayload(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) throw new Error(readE4FailureMessage(payload));
  const plan = normalizeNs4E4PlanDraft(payload, args.moduleName);
  plan.moduleName = args.moduleName;
  plan.reviewRound = reviewRound;
  const [journeys, access] = await Promise.all([readNs4ApprovedJourneys(args.moduleName), readNs4ApprovedAccess(args.moduleName)]);
  const gate = validateNs4E4Plan(plan, journeys, access, await e4RequestOptions(args.moduleName));
  if (!gate.ok) {
    const message = formatGate(gate.issues);
    await writeNs4E4PlanDraft(args.moduleName, plan);
    const attempt = args.repairAttempt || args.planRepairAttempt || 0;
    if (attempt < MAX_PLAN_REPAIRS) {
      return [
        addStep(context, mutationParent, createNs4E4RepairStep(
          args.moduleName, reviewRound, attempt + 1, message, pipeline.presentation.stepTitles['e4-ontology'],
        )),
        gateRepairResultStep(context, mutationParent, args.moduleName, reviewRound, attempt + 1, message),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `E4 overview gate requested repair ${attempt + 1}.`, 'input_output'),
      ];
    }
    await recordNs4E4Failure(args.moduleName, message);
    return [updateStatus(context, mutationParent, step, hookSequential, 'failed', message)];
  }
  await writeNs4E4PlanDraft(args.moduleName, plan);
  await writeEntityFeedback(args.moduleName, []);
  const planRepairAttempt = args.repairAttempt || args.planRepairAttempt || 0;
  const parallel = parallelEntityStep(context, step, agent.agentName, plan, 0);
  return [
    parallel,
    addStep(context, mutationParent, createNs4E4FinalizeStep(
      args.moduleName, reviewRound, [String(parallel.step.planning?.planId || '')], 0, planRepairAttempt,
    )),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `E4 overview ready; detailing ${plan.entities.length} entities with maxParallel=${NS4_E4_MAX_PARALLEL}.`, 'input_output'),
  ];
}

async function handleEntityResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E4Args & { moduleName: string },
  entityId: string,
): Promise<mls.msg.AgentIntent[]> {
  const plan = await readPlanDraft(args.moduleName);
  const payload = unwrapPayload(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) {
    return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} returned no usable payload; finalizer will repair it.`, 'input_output')];
  }
  const detail = normalizeNs4E4EntityDraft(payload, plan.moduleName, plan.reviewRound, entityId);
  await writeNs4E4EntityDraft(plan.moduleName, entityId, detail);
  const gate = validateNs4E4EntityDraft(plan, detail);
  if (!gate.ok) {
    return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} gate failed; finalizer will repair it. | ${formatGate(gate.issues)}`, 'input_output')];
  }
  return [updateStatus(context, mutationParent, step, hookSequential, 'completed', `Entity ${entityId} detail saved.`, 'input_output')];
}

async function handleRelationshipBindingResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E4Args & { moduleName: string },
): Promise<mls.msg.AgentIntent[]> {
  const plan = await readPlanDraft(args.moduleName);
  const details = await readAllEntityDrafts(plan);
  const unboundReview = assembleNs4E4Review(plan, details);
  const payload = unwrapPayload(step.interaction?.payload?.[0]);
  if (!isRecord(payload)) throw new Error(readE4FailureMessage(payload));
  const bindings = normalizeNs4E4RelationshipBindings(payload, plan.moduleName, plan.reviewRound);
  await writeNs4E4RelationshipBindingsDraft(args.moduleName, bindings);
  const [journeys, access, pipeline] = await Promise.all([
    readNs4ApprovedJourneys(args.moduleName), readNs4ApprovedAccess(args.moduleName), requirePipeline(args.moduleName),
  ]);
  const gate = validateNs4E4RelationshipBindings(unboundReview, bindings, journeys, access);
  if (!gate.ok) {
    const message = formatGate(gate.issues);
    const attempt = args.bindingRepairAttempt || 0;
    const entityRepairRound = args.entityRepairRound || 0;
    if (attempt < MAX_RELATIONSHIP_BINDING_REPAIRS) {
      return [
        addStep(context, mutationParent, createNs4E4RelationshipBindingStep(
          args.moduleName, plan.reviewRound, attempt + 1, message, entityRepairRound,
        )),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', `Relationship binding gate requested repair ${attempt + 1}.`, 'input_output'),
      ];
    }
    const ownerFeedback = ns4E4BindingOwnerEscalation(
      unboundReview, gate.issues, entityRepairRound, MAX_ENTITY_REPAIR_ROUNDS,
    );
    if (ownerFeedback.length) {
      await writeEntityFeedback(args.moduleName, ownerFeedback);
      const affected = ownerFeedback.map(item => item.entityId);
      const parallel = parallelEntityStep(context, step, 'agentNewSolution', plan, entityRepairRound + 1, affected);
      return [
        parallel,
        addStep(context, mutationParent, createNs4E4FinalizeStep(
          args.moduleName, plan.reviewRound, [String(parallel.step.planning?.planId || '')], entityRepairRound + 1, args.planRepairAttempt || 0,
        )),
        updateStatus(
          context, mutationParent, step, hookSequential, 'completed',
          `Relationship binding cannot add fields; entity repair started for ${affected.join(', ')}.`,
          'input_output',
        ),
      ];
    }
    await recordNs4E4Failure(args.moduleName, message);
    return [updateStatus(context, mutationParent, step, hookSequential, 'failed', message, 'input_output')];
  }
  await writeEntityFeedback(args.moduleName, []);
  const review = applyNs4E4RelationshipBindings(unboundReview, bindings);
  return openOntologyReview(context, mutationParent, step, hookSequential, review, pipeline, journeys, access);
}

async function readAllEntityDrafts(plan: Ns4E4PlanDraft): Promise<Ns4E4EntityDraft[]> {
  const details = await Promise.all(plan.entities.map(entity => readEntityDraft(plan.moduleName, entity.entityId)));
  if (details.some(detail => !detail)) throw new Error('E4 relationship binding cannot start before every entity detail exists.');
  return details as Ns4E4EntityDraft[];
}

async function finalizeOntology(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args: Ns4E4Args & { moduleName: string },
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = findMutableParentStep(context, parentStep);
  const [plan, pipeline] = await Promise.all([readPlanDraft(args.moduleName), requirePipeline(args.moduleName)]);
  const details: Ns4E4EntityDraft[] = [];
  const invalid: string[] = [];
  for (const entity of plan.entities) {
    const detail = await readEntityDraft(args.moduleName, entity.entityId);
    if (!detail || !validateNs4E4EntityDraft(plan, detail).ok) invalid.push(entity.entityId);
    else details.push(detail);
  }
  const entityRepairRound = args.entityRepairRound || 0;
  if (invalid.length && entityRepairRound < MAX_ENTITY_REPAIR_ROUNDS) {
    const parallel = parallelEntityStep(context, step, 'agentNewSolution', plan, entityRepairRound + 1, invalid);
    return [
      parallel,
      addStep(context, mutationParent, createNs4E4FinalizeStep(
        args.moduleName, plan.reviewRound, [String(parallel.step.planning?.planId || '')], entityRepairRound + 1, args.planRepairAttempt || 0,
      )),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `${invalid.length} invalid/missing entities; targeted parallel repair started: ${invalid.join(', ')}.`),
    ];
  }
  if (invalid.length) {
    const message = `E4 entities remain invalid after repair: ${invalid.join(', ')}.`;
    await recordNs4E4Failure(args.moduleName, message);
    return [updateStatus(context, mutationParent, step, hookSequential, 'failed', message)];
  }
  const review = assembleNs4E4Review(plan, details);
  const [journeys, access] = await Promise.all([readNs4ApprovedJourneys(args.moduleName), readNs4ApprovedAccess(args.moduleName)]);
  const gate = validateNs4E4Review(review, journeys, access, await e4RequestOptions(args.moduleName, { requireRelationshipRealization: false }));
  if (!gate.ok) {
    const message = formatGate(gate.issues);
    await writeNs4E4Draft(args.moduleName, review);
    const planRepairAttempt = args.planRepairAttempt || 0;
    if (planRepairAttempt < MAX_PLAN_REPAIRS) {
      return [
        addStep(context, mutationParent, createNs4E4RepairStep(
          args.moduleName, review.reviewRound, planRepairAttempt + 1, message,
          pipeline.presentation.stepTitles['e4-ontology'],
        )),
        gateRepairResultStep(context, mutationParent, args.moduleName, review.reviewRound, planRepairAttempt + 1, message),
        updateStatus(context, mutationParent, step, hookSequential, 'completed', 'Final aggregate gate requested one overview repair.', 'input_output'),
      ];
    }
    await recordNs4E4Failure(args.moduleName, message);
    return [updateStatus(context, mutationParent, step, hookSequential, 'failed', message)];
  }
  if (!review.relationships.length) {
    return openOntologyReview(context, mutationParent, step, hookSequential, review, pipeline, journeys, access);
  }
  return [
    addStep(context, mutationParent, createNs4E4RelationshipBindingStep(
      args.moduleName, review.reviewRound, 0, '', args.entityRepairRound || 0,
    )),
    updateStatus(
      context, mutationParent, step, hookSequential, 'completed',
      `E4 assembled ${review.entities.length} entities; binding ${review.relationships.length} relationships to exact fields.`,
      'input_output',
    ),
  ];
}

async function openOntologyReview(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  review: Ns4E4Review,
  pipeline: Ns4PipelineState,
  journeys: Ns4E2Review,
  access: Ns4E3Review,
): Promise<mls.msg.AgentIntent[]> {
  const gate = validateNs4E4Review(review, journeys, access, await e4RequestOptions(review.moduleName));
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  const draftPath = await writeNs4E4Draft(review.moduleName, review);
  await writeNs4Pipeline(markNs4E4WaitingHuman(await requirePipeline(review.moduleName), review.reviewRound, draftPath));
  const module = await readNs4Module(review.moduleName);
  const checkpoint = decideNs4LaterCheckpoint(context, module, ns4E4SmartSignal(review));
  if (!checkpoint.open) {
    const saved = await persistNs4E4(review.moduleName, review, 'auto', journeys, access, checkpoint.autoReason);
    return [
      resultStep(context, mutationParent, saved, 'E4 ontology auto-approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `E4 auto-approved ${saved.entityCount} entities and ${saved.relationshipCount} bound relationships.`, 'input_output'),
    ];
  }
  return [
    clarificationReviewStep(context, mutationParent, review, pipeline.presentation.stepTitles['e4-ontology']),
    updateStatus(context, mutationParent, step, hookSequential, 'completed', `E4 assembled ${review.entities.length} entities and bound ${review.relationships.length} relationships; human review opened.`, 'input_output'),
  ];
}

export async function beforeNs4E4ClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const review = normalizeNs4E4Review(parseMaybeJson(json));
  const [journeys, access] = await Promise.all([readNs4ApprovedJourneys(review.moduleName), readNs4ApprovedAccess(review.moduleName)]);
  const gate = validateNs4E4Review(review, journeys, access, await e4RequestOptions(review.moduleName));
  if (!gate.ok) {
    const message = formatGate(gate.issues);
    await recordNs4E4Failure(review.moduleName, message);
    throw new Error(message);
  }
  await import('/_102020_/l2/agentNewSolution/widgets/widgetNs4Ontology.js');
  const element = document.createElement('widget-ns4-ontology-102020');
  (element as unknown as { value: Ns4E4Review }).value = review;
  element.addEventListener('ns4-ontology-review', (event: Event) => {
    const detail = (event as CustomEvent<Ns4E4ReviewEvent>).detail;
    void applyNs4E4Review(context, parentStep, step, hookSequential, detail)
      .catch(error => { showNs4ClarificationError(element, error); console.error(`[${agent.agentName}] ${errorMessage(error)}`); });
  });
  return element;
}

async function applyNs4E4Review(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  event: Ns4E4ReviewEvent,
): Promise<void> {
  if (!context.task) throw new Error('[agentNewSolution:e4] task invalid');
  const mutationParent = findMutableParentStep(context, parentStep);
  if (event.action === 'cancel') throw new Error('Cancelamento terminal ainda depende de suporte explícito do collab-messages; esta revisão foi mantida aberta sem alterar o pipeline.');
  const [journeys, access] = await Promise.all([readNs4ApprovedJourneys(event.review.moduleName), readNs4ApprovedAccess(event.review.moduleName)]);
  const gate = validateNs4E4Review(event.review, journeys, access, await e4RequestOptions(event.review.moduleName));
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  await writeNs4E4Draft(event.review.moduleName, event.review);
  if (event.action === 'approve') {
    const saved = await persistNs4E4(event.review.moduleName, event.review, 'human', journeys, access);
    await applyIntents(context, [
      resultStep(context, mutationParent, saved, 'E4 ontology approved'),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  } else {
    if (!event.adjustment.trim()) throw new Error('Structural change request cannot be empty.');
    const nextRound = event.review.reviewRound + 1;
    await writeNs4Pipeline(markNs4E4Running(await requirePipeline(event.review.moduleName), nextRound));
    await applyIntents(context, [
      addStep(context, mutationParent, createNs4E4Step(event.review.moduleName, nextRound, event.adjustment)),
      adjustmentResultStep(context, mutationParent, event.review.moduleName, event.review.reviewRound, event.adjustment),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', undefined, 'input_output'),
    ]);
  }
  await continuePoolingTask(context);
}

async function persistNs4E4(
  moduleName: string,
  review: Ns4E4Review,
  approvedBy: Ns4ApprovedBy,
  journeys: Ns4E2Review,
  access: Ns4E3Review,
  autoReason?: string,
): Promise<Ns4PersistedE4> {
  const [moduleArtifact, pipeline] = await Promise.all([readNs4Module(moduleName), requirePipeline(moduleName)]);
  const gate = validateNs4E4Review(review, journeys, access, { requestText: ns4E4RequestText(moduleArtifact) });
  if (!gate.ok) throw new Error(formatGate(gate.issues));
  if (!moduleArtifact || moduleArtifact.module.moduleName !== moduleName) throw new Error(`Invalid module artifact for ${moduleName}.`);
  const approvedAt = new Date().toISOString();
  const artifacts = await buildNs4OntologyArtifacts(review, approvedBy, approvedAt);
  const artifactPaths: string[] = [];
  for (const entity of artifacts.entities) artifactPaths.push(await writeNs4OntologyEntity(moduleName, entity.entityId, entity));
  artifactPaths.push(await writeNs4OntologyIndex(moduleName, artifacts.index));
  await writeNs4Module(moduleName, markNs4ModuleE4Approved(moduleArtifact, approvedBy, approvedAt, autoReason));
  await writeNs4Pipeline(markNs4E4Approved(pipeline, approvedBy, artifactPaths, approvedAt, review.reviewRound, autoReason));
  return { moduleName, solutionMode: 'new', entityCount: review.entities.length, relationshipCount: review.relationships.length, artifactPaths };
}

function parallelEntityStep(
  context: mls.msg.ExecutionContext,
  hostStep: mls.msg.AIAgentStep,
  agentName: string,
  plan: Ns4E4PlanDraft,
  repairRound: number,
  entityIds = plan.entities.map(entity => entity.entityId),
): mls.msg.AgentIntentAddStep {
  if (!context.task) throw new Error('[agentNewSolution:e4] task invalid');
  if (!entityIds.length) throw new Error('E4 entity fan-out cannot be empty.');
  const planId = `e4-ontology-round-${plan.reviewRound}-entities-${repairRound}`;
  return {
    type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task.PK, parentStepId: hostStep.stepId,
    step: {
      type: 'agent', stepId: 0,
      interaction: { input: [{ type: 'system', content: '<!-- modelType: reasoning -->' }], cost: 0,
        trace: [`queued ${entityIds.length} E4 entities with maxParallel=${NS4_E4_MAX_PARALLEL}`], payload: null },
      stepTitle: 'Detailing {{completed}}/{{total}} ontology entities, failed {{failed}}',
      status: 'in_progress', nextSteps: [], agentName, onFailure: 'wait_after_prompt',
      prompt: JSON.stringify({ planId: 'e4-ontology' }), rags: [],
      planning: { planId, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
    executionMode: { type: 'parallel', args: entityIds.map(entityId => `entity:${entityId}`), maxParallel: NS4_E4_MAX_PARALLEL },
  };
}

function promptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  tool?: mls.msg.LLMTool,
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready', args, messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt,
    ...(tool ? { tools: [tool], toolChoice: { type: 'function' as const, function: { name: tool.function.name } } } : {}),
  } as mls.msg.AgentIntentPromptReady;
}

async function readNs4EntityWorkerTool(): Promise<mls.msg.LLMTool> {
  const raw = await readNs4Text(ns4AgentFile('schemas', 'e4-entity-worker.schema', '.json'), true);
  const schema = parseMaybeJson(raw);
  if (!isRecord(schema)) throw new Error('Invalid E4 entity worker tool schema.');
  return createNs4FlexibleWorkerTool('submitNs4E4Entity', 'Submit one E4 entity detail.', schema);
}

function entityFeedbackFile(moduleName: string) {
  return ns4PipelineJsonFile(moduleName, 'e4-entity-feedback');
}

async function writeEntityFeedback(moduleName: string, feedback: Ns4E4EntityFeedback[]): Promise<void> {
  await writeNs4Json(entityFeedbackFile(moduleName), feedback);
}

async function readEntityFeedback(moduleName: string, entityId: string): Promise<string> {
  const parsed = parseMaybeJson(await readNs4Text(entityFeedbackFile(moduleName), false));
  if (!Array.isArray(parsed)) return '';
  return parsed
    .filter(isEntityFeedback)
    .filter(item => item.entityId === entityId)
    .map(item => item.feedback)
    .join('\n');
}

function isEntityFeedback(value: unknown): value is Ns4E4EntityFeedback {
  return isRecord(value)
    && typeof value.entityId === 'string' && !!value.entityId.trim()
    && typeof value.feedback === 'string' && !!value.feedback.trim();
}

async function readPlanDraft(moduleName: string): Promise<Ns4E4PlanDraft> {
  const raw = await readNs4Text(ns4E4PlanDraftFile(moduleName), true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`Invalid E4 overview for ${moduleName}.`);
  return normalizeNs4E4PlanDraft(parsed, moduleName);
}

async function readOptionalPlanDraft(moduleName: string): Promise<Ns4E4PlanDraft | null> {
  const raw = await readNs4Text(ns4E4PlanDraftFile(moduleName), false);
  const parsed = parseMaybeJson(raw);
  return isRecord(parsed) ? normalizeNs4E4PlanDraft(parsed, moduleName) : null;
}

async function readEntityDraft(moduleName: string, entityId: string): Promise<Ns4E4EntityDraft | null> {
  const raw = await readNs4Text(ns4E4EntityDraftFile(moduleName, entityId), false);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) return null;
  const round = typeof parsed.reviewRound === 'number' ? parsed.reviewRound : 1;
  return normalizeNs4E4EntityDraft(parsed, moduleName, round, entityId);
}

async function requirePipeline(moduleName: string): Promise<Ns4PipelineState> {
  const pipeline = await readNs4Pipeline(moduleName);
  if (!isNs4Pipeline(pipeline)) throw new Error(`agentNewSolution pipeline not found for ${moduleName}.`);
  return pipeline;
}

async function recordNs4E4Failure(moduleName: string, failure: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readNs4Pipeline(moduleName);
    if (isNs4Pipeline(pipeline)) await writeNs4Pipeline(markNs4E4Failed(pipeline, failure));
  } catch { /* task trace is the fallback */ }
}

function findMutableParentStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  phaseStep?: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  return resolveNs4MutableParent(getAllSteps(context.task?.iaCompressed?.nextSteps), parentStep, phaseStep);
}

function addStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return { type: 'add-step', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', parentStepId: parentStep.stepId, step };
}

function clarificationReviewStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  review: Ns4E4Review,
  title: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'clarification', stepId: 0, interaction: null,
    stepTitle: plainNs4StepTitle(title), status: 'pending', nextSteps: [],
    json: JSON.stringify(review),
    planning: { planId: `e4-ontology-review-round-${review.reviewRound}`, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIClarificationStep);
}

function resultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, saved: Ns4PersistedE4, title: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: title, status: 'completed', nextSteps: [],
    result: JSON.stringify({ ...saved, completedStep: 'e4-ontology', nextStep: 'e5-rules' }, null, 2),
    planning: { planId: 'e4-result', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function adjustmentResultStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, moduleName: string, round: number, adjustment: string): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E4 changes requested after round ${round}`,
    status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, reviewRound: round, adjustment }, null, 2),
    planning: { planId: `e4-adjustment-request-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function gateRepairResultStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  round: number,
  repairAttempt: number,
  gateFeedback: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result', stepId: 0, interaction: null, stepTitle: `E4 overview repair ${repairAttempt}`,
    status: 'completed', nextSteps: [], result: JSON.stringify({ moduleName, reviewRound: round, repairAttempt, gateFeedback }, null, 2),
    planning: { planId: `e4-gate-repair-${round}-${repairAttempt}-${Date.now()}`, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  return { type: 'update-status', hookSequential, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    stepId: step.stepId, status, ...(traceMsg ? { traceMsg } : {}), ...(cleaner ? { cleaner } : {}) };
}

async function applyIntents(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying E4 intents.');
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
}

function parseE4Args(value: unknown): Ns4E4Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed) || parsed.planId !== 'e4-ontology') throw new Error('Invalid E4 step arguments.');
  return {
    planId: 'e4-ontology', solutionMode: 'new',
    ...(parsed.stage === 'finalize' || parsed.stage === 'plan' || parsed.stage === 'bindRelationships' ? { stage: parsed.stage } : {}),
    ...(typeof parsed.moduleName === 'string' && parsed.moduleName.trim() ? { moduleName: parsed.moduleName.trim() } : {}),
    ...(typeof parsed.adjustment === 'string' && parsed.adjustment.trim() ? { adjustment: parsed.adjustment.trim() } : {}),
    ...(typeof parsed.reviewRound === 'number' ? { reviewRound: parsed.reviewRound } : {}),
    ...(typeof parsed.repairAttempt === 'number' ? { repairAttempt: parsed.repairAttempt } : {}),
    ...(typeof parsed.entityRepairRound === 'number' ? { entityRepairRound: parsed.entityRepairRound } : {}),
    ...(typeof parsed.planRepairAttempt === 'number' ? { planRepairAttempt: parsed.planRepairAttempt } : {}),
    ...(typeof parsed.bindingRepairAttempt === 'number' ? { bindingRepairAttempt: parsed.bindingRepairAttempt } : {}),
    ...(typeof parsed.gateFeedback === 'string' && parsed.gateFeedback.trim() ? { gateFeedback: parsed.gateFeedback.trim() } : {}),
  };
}

function resolveE4Args(context: mls.msg.ExecutionContext, value: unknown): Ns4E4Args & { moduleName: string } {
  const parsed = parseE4Args(value);
  const moduleName = parsed.moduleName || findE3ModuleName(context) || memoryString(context, 'resumeModule');
  if (!moduleName) throw new Error('E3 module result not found for E4.');
  return { ...parsed, moduleName };
}

function parseEntitySelector(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^entity:([A-Z][A-Za-z0-9]*)$/.exec(value.trim());
  return match?.[1] || '';
}

function findE3ModuleName(context: mls.msg.ExecutionContext): string {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e3-result');
  if (!result || result.type !== 'result' || !result.result) return '';
  const parsed = parseMaybeJson(result.result);
  return isRecord(parsed) && typeof parsed.moduleName === 'string' ? parsed.moduleName.trim() : '';
}

interface Ns4E3Handoff {
  moduleName: string;
  artifactPath: string;
  approvedBy: Ns4ApprovedBy;
  approvedAt: string;
  approvedReview?: Ns4E3Review;
}

function findE3Handoff(context: mls.msg.ExecutionContext, moduleName: string): Ns4E3Handoff | null {
  const result = getAllSteps(context.task?.iaCompressed?.nextSteps).find(step => step.planning?.planId === 'e3-result');
  if (!result || result.type !== 'result' || !result.result) return null;
  const parsed = parseMaybeJson(result.result);
  if (!isRecord(parsed) || parsed.moduleName !== moduleName
    || typeof parsed.artifactPath !== 'string' || !parsed.artifactPath.trim()
    || (parsed.approvedBy !== 'human' && parsed.approvedBy !== 'auto')
    || typeof parsed.approvedAt !== 'string' || !parsed.approvedAt.trim()) return null;
  const approvedReview = isRecord(parsed.approvedReview) ? normalizeNs4E3Review(parsed.approvedReview, moduleName) : undefined;
  return { moduleName, artifactPath: parsed.artifactPath.trim(), approvedBy: parsed.approvedBy,
    approvedAt: parsed.approvedAt.trim(), ...(approvedReview ? { approvedReview } : {}) };
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function unwrapPayload(value: unknown): unknown {
  const parsed = unwrapNs4FlexibleWorkerPayload(value);
  if (isRecord(parsed) && parsed.type === 'flexible') return parseMaybeJson(parsed.result);
  if (isRecord(parsed) && parsed.type === 'clarification' && isRecord(parsed.json)) return parsed.json;
  return parsed;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

async function e4RequestOptions(moduleName: string, extra: Ns4E4GateOptions = {}): Promise<Ns4E4GateOptions> {
  return { ...extra, requestText: ns4E4RequestText(await readNs4Module(moduleName)) };
}

function formatGate(issues: Array<{ code: string; path: string; message: string }>): string {
  return issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function readE4FailureMessage(payload: unknown): string {
  if (isRecord(payload) && payload.type === 'result' && typeof payload.result === 'string' && payload.result.trim()) return payload.result.trim();
  return 'E4 returned an invalid ontology payload.';
}
