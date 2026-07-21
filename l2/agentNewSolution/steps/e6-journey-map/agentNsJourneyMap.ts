/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/agentNsJourneyMap.ts" enhancement="_102027_/l2/enhancementAgent"/>

// E6 — consolidated journey map. ONE call (no item chain): reads the frozen E5
// classification, short summaries of the saved workflow/operation defs, the E4
// roster and the E2 journeys, and produces the navigation map consumed by
// agentChangeFrontend (workspaces = one page each, landings per actor, advisory
// navigation edges). moduleName and note are attached deterministically after
// the call. On a green gate it writes l4/{module}/journeys/{module}Journeys.defs.ts
// + pipeline/e6-journey-map.md, approves the pipeline step and emits the completed
// 'e6-done' anchor. Retry = 1 with the gate error in context (dynamic "-retry" step).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  listExistingModuleFolders,
  NS_AGENT_FOLDER,
  nsL2File,
  nsOperationsFolder,
  nsPipelineArtifactFileInfo,
  nsWorkflowsFolder,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeDefsArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  buildNsToolInstruction,
  createNsToolSchema,
  extractNsToolOutput,
} from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import {
  nsAgentStepIntent,
  nsFindMutableParentStep,
  nsParallelStepIntent,
  nsParseSelector,
  nsResultStepIntent,
  nsUpdateStatusIntent,
} from '/_102020_/l2/agentNewSolution/helpers/nsSteps.js';
import { nsLlmInfraFailureIntents } from '/_102020_/l2/agentNewSolution/helpers/nsLlmRetry.js';
import { NS_AGENT_BUILD } from '/_102020_/l2/agentNewSolution/agentNewSolution.js';
import {
  approveNsStep,
  createNsPipeline,
  markNsDownstreamDirty,
  markNsStepRunning,
  readNsPipeline,
  writeNsPipeline,
} from '/_102020_/l2/agentNewSolution/helpers/nsPipeline.js';
import { writeNsTrace, nsPromptChars } from '/_102020_/l2/agentNewSolution/helpers/nsTrace.js';
import { readActors } from '/_102020_/l2/agentNewSolution/helpers/nsActors.js';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import { NsE3ModelArtifact } from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';
import {
  E6GateContext,
  E6_JOURNEY_MAP_NOTE,
  E6_JOURNEY_MAP_SCHEMA_VERSION,
  NsE6JourneyMapArtifact,
  NsE6OperationFact,
  NsE6Workspace,
  collectNsOutputPathSets,
  deriveE6BffRoutes,
  prepareE6JourneyMap,
  renderE6Markdown,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';
import {
  E6SiteMapGateContext,
  NsE6SiteMapArtifact,
  computeE6WorkspaceSliceHash,
  deriveE6SiteMapKinds,
  prepareE6SiteMap,
  validateE6SiteMap,
  validateE6WorkspaceEquality,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/siteMap.js';
import {
  deriveE6Journeys,
  readE6JourneySources,
  validateE6Journeys,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.js';

const AGENT_NAME = 'agentNsJourneyMap';
const STEP_ID = 'e6-journey-map';        // phase 1: the site map (single call)
const DETAIL_PHASE_PLAN = 'e6-detail-phase'; // no-LLM barrier that HOSTS the phase-2 fan-out (mirrors e5-operations-phase)
const DETAIL_PLAN = 'e6-detail';         // phase 2: one parallel child per workspace
const FINALIZE_PLAN = 'e6-finalize';     // no-LLM barrier: reassemble + authoritative gate
const DONE_ANCHOR = 'e6-done';
const SITEMAP_TOOL = 'submitNsSiteMap';
const DETAIL_TOOL = 'submitNsWorkspaceDetail';
const STEP_FOLDER = `${NS_AGENT_FOLDER}/steps/e6-journey-map`;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: STEP_FOLDER,
    agentDescription: 'E6 - consolidated journey map (workspaces, landings, edges) for agentNewSolution',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface E6Args {
  planId?: string;
  moduleName?: string;
  workspaceId?: string;
  retryAttempt?: number;
  repairAttempt?: number;
  retryContext?: string;
  llmRetry?: boolean;
}

// Local view of pipeline/e5-classification.json (E5 owns the canonical types).
interface NsE5ClassificationWorkflow {
  workflowId: string;
  title: string;
  actorId: string;
  primaryEntity: string;
  featureRefs: string[];
  operationIds: string[];
}

interface NsE5ClassificationOperation {
  operationId: string;
  title: string;
  actorId: string;
  entity: string;
  kind: string;
  featureRefs: string[];
  workflowId?: string;
}

interface NsE5ClassificationArtifact {
  workflows: NsE5ClassificationWorkflow[];
  operations: NsE5ClassificationOperation[];
}

// Short summary of a saved workflow/operation defs file (prompt input only).
interface NsE6BehaviorSummary {
  id: string;
  title: string;
  actor: string;
  entity: string;
  kind: string;
  pageId: string;
  storySteps: string[];
  // Operations only: the EXACT vocabulary a bffCall projection may reference (so the LLM writes real
  // `from` paths, not guessed field names). inputNames -> `from: <op>.<inputId>`. Output paths are split
  // by POSITION (P1): outputTopPaths go at the bffCall output TOP level (envelope: total/page, or $items
  // = the whole collection); outputItemPaths go INSIDE an item.fields block (the record columns,
  // `$items.<col>`). Same sets the A4.2/P1 gate validates against.
  inputNames?: string[];
  outputTopPaths?: string[];
  outputItemPaths?: string[];
}

interface E6Inputs {
  moduleName: string;
  journeys: NsE2JourneysArtifact;
  classification: NsE5ClassificationArtifact;
  model: NsE3ModelArtifact;
  rosterActorIds: string[];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const hookArgs = args || step.prompt || JSON.stringify({ planId: STEP_ID });
  // Parallel detail children receive the compact selector 'workspace:<workspaceId>'.
  const selector = nsParseSelector(hookArgs);
  const parsedArgs = selector?.kind === 'workspace' ? { planId: DETAIL_PLAN, workspaceId: selector.id } : parseE6Args(hookArgs);
  // Deploy check: confirms the CURRENT e6 build is live (the stale-compile issue — build-11 has the
  // two-phase + command-form primarySurface). If the logs show an older build, compiled.zip is stale.
  console.log(`[ns-build] ${AGENT_NAME} ${NS_AGENT_BUILD} | planId=${parsedArgs.planId || STEP_ID}${parsedArgs.workspaceId ? ` ws=${parsedArgs.workspaceId}` : ''}`);
  if (parsedArgs.planId === DETAIL_PLAN) return [await buildDetailPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
  if (parsedArgs.planId === DETAIL_PHASE_PLAN) return runE6DetailPhase(context, parentStep, step, hookSequential, parsedArgs);
  if (parsedArgs.planId === FINALIZE_PLAN) return runE6Finalize(context, parentStep, step, hookSequential, parsedArgs);
  return [await buildSiteMapPrompt(context, parentStep, hookSequential, parsedArgs, hookArgs)];
}

// ── Phase 1: the SITE MAP (light, global) ──────────────────────────────────
async function buildSiteMapPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const operationSummaries = await summarizeOperationsLight(inputs.moduleName, inputs.classification);
  const schema = await readNsSchema('e6-sitemap.schema');
  const prompt = await readNsText('steps/e6-journey-map', 'promptSiteMap', '.md', true);
  const journeysView = buildJourneysView(inputs.journeys);
  const humanPrompt = [
    '## E5 classification (frozen, primary source)',
    JSON.stringify(inputs.classification, null, 2),
    '',
    '## Operation summaries (id, actor, kind, entity, goal) — the operations to partition into pages',
    JSON.stringify(operationSummaries, null, 2),
    '',
    '## Actor roster (the only valid actor ids)',
    inputs.rosterActorIds.join(', '),
    '',
    '## Declared entity ids (the only valid entity values)',
    inputs.model.entities.map(entity => entity.entityId).join(', '),
    '',
    '## E2 journeys (navigation source: who starts where and who hands off to whom)',
    JSON.stringify(journeysView, null, 2),
    '',
    `## userLanguage: ${inputs.journeys.userLanguage}`,
    parsedArgs.retryContext ? `\n## Gate retry context (fix exactly these problems)\n${parsedArgs.retryContext}\n` : '',
  ].filter(Boolean).join('\n');

  return {
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(SITEMAP_TOOL)}\n\n${buildNsToolInstruction(SITEMAP_TOOL, 'the E5 classification artifact is missing or unusable')}`,
    humanPrompt,
    tools: [createNsToolSchema(SITEMAP_TOOL, 'Submit the E6 site map (the page index).', schema)],
    toolChoice: { type: 'function', function: { name: SITEMAP_TOOL } },
  } as mls.msg.AgentIntentPromptReady;
}

// ── Phase 2: the DETAIL of ONE workspace (sections/organisms/bffCalls) ──────
async function buildDetailPrompt(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
  hookArgs: string,
): Promise<mls.msg.AgentIntentPromptReady> {
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const siteMap = await readSiteMapDefs(inputs.moduleName);
  const slice = (siteMap?.workspaces || []).find(workspace => workspace.workspaceId === parsedArgs.workspaceId);
  if (!slice) throw new Error(`[${AGENT_NAME}] workspace ${parsedArgs.workspaceId} not in siteMap`);
  // FULL projection vocabulary of ONLY this workspace's operations (P3/P7: keeps the detail prompt small).
  const allSummaries = await summarizeOperationDefs(inputs.moduleName, inputs.classification);
  const operationSummaries = allSummaries.filter(summary => slice.operationIds.includes(summary.id));
  const schema = await readNsSchema('e6-workspace.schema');
  const prompt = await readNsText('steps/e6-journey-map', 'promptDetail', '.md', true);
  const humanPrompt = [
    '## Your workspace (from the approved site map — copy workspaceId/title/actors/kind verbatim)',
    JSON.stringify(slice, null, 2),
    '',
    '## Operation summaries for THIS workspace only',
    '## `inputNames`/`outputTopPaths`/`outputItemPaths` are the ONLY valid names for bffCall `from` —',
    '## copy verbatim, respect position (outputItemPaths only inside item.fields).',
    JSON.stringify(operationSummaries, null, 2),
    '',
    `## userLanguage: ${inputs.journeys.userLanguage}`,
    parsedArgs.retryContext ? `\n## Gate retry context (fix exactly these problems)\n${parsedArgs.retryContext}\n` : '',
  ].filter(Boolean).join('\n');

  return {
    type: 'prompt_ready',
    args: hookArgs,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(DETAIL_TOOL)}\n\n${buildNsToolInstruction(DETAIL_TOOL, 'the site map slice is missing or unusable')}`,
    humanPrompt,
    tools: [createNsToolSchema(DETAIL_TOOL, 'Submit ONE workspace detail (sections/organisms/bffCalls).', schema)],
    toolChoice: { type: 'function', function: { name: DETAIL_TOOL } },
  } as mls.msg.AgentIntentPromptReady;
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const selector = nsParseSelector(step.prompt);
  const parsedArgs = selector?.kind === 'workspace' ? { planId: DETAIL_PLAN, workspaceId: selector.id } : parseE6Args(step.prompt);
  // P2: only the site-map single call has no net — retry it once on an LLM-CALL failure. Detail children
  // are covered by the finalize repair round.
  if (parsedArgs.planId !== DETAIL_PLAN) {
    const infraIntents = nsLlmInfraFailureIntents({
      context, mutationParent, step, hookSequential, agentName: AGENT_NAME, stepId: STEP_ID,
      retryPrompt: { moduleName: parsedArgs.moduleName }, alreadyRetried: !!parsedArgs.llmRetry,
    });
    if (infraIntents) return infraIntents;
  }
  try {
    if (parsedArgs.planId === DETAIL_PLAN) return await handleDetailResult(context, mutationParent, step, hookSequential, parsedArgs);
    return await handleSiteMapResult(context, mutationParent, step, hookSequential, parsedArgs);
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (parsedArgs.moduleName) {
      await writeNsTrace(normalizeModuleFolderName(parsedArgs.moduleName), STEP_ID, AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    }
    // A failed DETAIL child would fail the whole fan-out — complete-with-trace and let finalize repair.
    if (parsedArgs.planId === DETAIL_PLAN) {
      return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `detail run failed | ${traceMsg}`, 'input_output')];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
}

async function handleSiteMapResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
): Promise<mls.msg.AgentIntent[]> {
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const moduleName = inputs.moduleName;

  const output = extractNsToolOutput(step.interaction?.payload?.[0], SITEMAP_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', output.trace.join('\n') || 'E6 site map returned failed')];
  }

  const siteMapContext = buildSiteMapContext(inputs);
  // Deterministic: moduleName/note from code; kind + workflowId DERIVED (never trusted from the LLM).
  const siteMap = deriveE6SiteMapKinds(prepareE6SiteMap(output.result, { moduleName }), siteMapContext);
  const schema = await readNsSchema('e6-sitemap.schema');
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  pipeline = markNsStepRunning(pipeline, STEP_ID, { e2CreatedAt: inputs.journeys.createdAt, retryContext: parsedArgs.retryContext || '' });
  const gate = await runNsGate({ stepId: STEP_ID, schema, artifact: siteMap, pipeline, validate: item => validateE6SiteMap(item, siteMapContext) });
  if (gate.pipeline) pipeline = gate.pipeline;

  const attempt = parsedArgs.retryAttempt || gate.attempts;
  if (!gate.ok) {
    await writeNsPipeline(pipeline);
    const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { siteMap, gate, retryContext: gate.retryContext }, traceMsg, nsPromptChars(step));
    if (attempt < 2) {
      return [
        nsAgentStepIntent(context, mutationParent, {
          agentName: AGENT_NAME, stepTitle: 'Retry E6 site map gate',
          planId: `e6-sitemap-retry-${Date.now()}`,
          prompt: { planId: STEP_ID, moduleName, retryAttempt: 2, retryContext: gate.retryContext || traceMsg },
        }),
        nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `site map gate failed (attempt ${attempt}), retrying | ${traceMsg}`, 'input_output'),
      ];
    }
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', traceMsg)];
  }
  await writeNsPipeline(pipeline);

  // The site map is the PERMANENT page index (absorbs the old navigation.defs.ts) + the workspaceIds
  // index so e7/emitter/masters reassemble without scanning the folder.
  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: moduleName, shortName: 'siteMap', extension: '.defs.ts' },
    `${moduleName}SiteMap`,
    { moduleName: siteMap.moduleName, note: siteMap.note, workspaces: siteMap.workspaces, landings: siteMap.landings, navigationEdges: siteMap.navigationEdges, workspaceIds: siteMap.workspaces.map(workspace => workspace.workspaceId) },
  );
  await writeNsTrace(moduleName, STEP_ID, AGENT_NAME, attempt, { siteMap, gate }, undefined, nsPromptChars(step));

  // Hand off to the no-LLM detail-phase BARRIER (mirrors e5: the LLM step never hosts the fan-out —
  // that step goes terminal immediately once its payload is in, which would fire finalize before any
  // detail child runs). The barrier hosts the fan-out and finalize depends on the barrier, not on this.
  return [
    nsAgentStepIntent(context, mutationParent, {
      agentName: AGENT_NAME, stepTitle: 'Detail workspaces', planId: DETAIL_PHASE_PLAN,
      dependsOn: [STEP_ID], status: 'waiting_dependency', prompt: { planId: DETAIL_PHASE_PLAN, moduleName },
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `site map approved for ${moduleName} (${siteMap.workspaces.length} workspaces); detailing`, 'input_output'),
  ];
}

// e6-detail-phase (no LLM): unlocked when e6-journey-map (site map) completes. HOSTS the per-workspace
// detail fan-out + the finalize barrier. Mirrors e5-operations-phase exactly (open fan-out child added
// before the completed status; finalize dependsOn THIS phase step, so it waits for the children).
async function runE6DetailPhase(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const moduleName = parsedArgs.moduleName ? normalizeModuleFolderName(parsedArgs.moduleName) : (await loadE6Inputs()).moduleName;
  const siteMap = await readSiteMapDefs(moduleName);
  const workspaceIds = (siteMap?.workspaces || []).map(workspace => workspace.workspaceId);

  const intents: mls.msg.AgentIntent[] = [];
  if (workspaceIds.length > 0) {
    intents.push(nsParallelStepIntent(context, step, {
      agentName: AGENT_NAME, planId: DETAIL_PLAN,
      stepTitle: `Detailing {{completed}}/{{total}} workspaces, failed {{failed}}`,
      args: workspaceIds.map(workspaceId => `workspace:${workspaceId}`),
      maxParallel: 20, // match e3/e5 fan-outs (the platform runs ~half → ~10 concurrent, "de 10 em 10")
    }));
  }
  intents.push(nsAgentStepIntent(context, mutationParent, {
    agentName: AGENT_NAME, stepTitle: 'Finalize journey map', planId: FINALIZE_PLAN,
    dependsOn: [DETAIL_PHASE_PLAN], status: 'waiting_dependency', prompt: { planId: FINALIZE_PLAN, moduleName },
  }));
  intents.push(nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `detail phase started for ${moduleName} (${workspaceIds.length} workspaces)`));
  return intents;
}

async function handleDetailResult(
  context: mls.msg.ExecutionContext,
  mutationParent: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
): Promise<mls.msg.AgentIntent[]> {
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const moduleName = inputs.moduleName;
  const siteMap = await readSiteMapDefs(moduleName);
  const slice = (siteMap?.workspaces || []).find(workspace => workspace.workspaceId === parsedArgs.workspaceId);
  if (!slice) throw new Error(`[${AGENT_NAME}] workspace ${parsedArgs.workspaceId} not in siteMap`);

  const output = extractNsToolOutput(step.interaction?.payload?.[0], DETAIL_TOOL);
  if (output.status === 'failed') {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `detail returned failed | ${output.trace.join('\n')}`, 'input_output')];
  }

  // Normalize the single workspace (bffCall synthesis + route derivation) via the full-map prepare.
  const prepared = deriveE6BffRoutes(prepareE6JourneyMap({ workspaces: [output.result], landings: [], navigationEdges: [] }, { moduleName }));
  const workspace = prepared.workspaces[0];
  if (!workspace) throw new Error(`[${AGENT_NAME}] detail produced no workspace for ${parsedArgs.workspaceId}`);
  // Force the map-owned fields (kind/workflowId derived at phase 1; equality is still checked below).
  workspace.kind = slice.kind;
  if (slice.workflowId) workspace.workflowId = slice.workflowId; else delete workspace.workflowId;

  // Detail gate (isolated fast-fail): equality-to-map + the per-workspace bffCall/organism checks (run
  // validateE6Invariants scoped to THIS workspace so coverage passes; navigationEntry cross-page links
  // are re-checked authoritatively at finalize).
  const scopedContext = await buildSingleWorkspaceContext(inputs, workspace);
  const localGate = validateE6Invariants(prepared, scopedContext);
  const equality = validateE6WorkspaceEquality(workspace, slice);
  const errors = [...equality, ...localGate.issues.filter(issue => issue.severity === 'error' && issue.code !== 'navigationEntry.target.unknown')];
  const attempt = parsedArgs.retryAttempt || 1;
  if (errors.length) {
    const traceMsg = errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, `e6-detail-${slice.workspaceId}`, AGENT_NAME, attempt, { workspace, errors }, traceMsg, nsPromptChars(step));
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `detail gate failed for ${slice.workspaceId} | ${traceMsg}`, 'input_output')];
  }

  // Stamp the slice hash → incremental re-runs regenerate only workspaces whose slice changed.
  const stamped = { ...workspace, sliceHash: computeE6WorkspaceSliceHash(slice) };
  await writeDefsArtifact(
    { project: mls.actualProject || 0, level: 4, folder: `${moduleName}/workspaces`, shortName: slice.workspaceId, extension: '.defs.ts' },
    `${slice.workspaceId}Workspace`,
    stamped,
  );
  await writeNsTrace(moduleName, `e6-detail-${slice.workspaceId}`, AGENT_NAME, attempt, { workspace: stamped }, undefined, nsPromptChars(step));
  return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${slice.workspaceId} detail saved`, 'input_output')];
}

// ── Finalize (no LLM): reassemble map + details → the AUTHORITATIVE validateE6Invariants + repair ──
async function runE6Finalize(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  parsedArgs: E6Args,
): Promise<mls.msg.AgentIntent[]> {
  const mutationParent = nsFindMutableParentStep(context, parentStep);
  const inputs = await loadE6Inputs(parsedArgs.moduleName);
  const moduleName = inputs.moduleName;
  const siteMap = await readSiteMapDefs(moduleName);
  if (!siteMap) throw new Error(`[${AGENT_NAME}] siteMap.defs.ts not found for ${moduleName}`);

  // Reassemble the full journey map from the detail files + the siteMap landings/edges.
  const workspaces: NsE6Workspace[] = [];
  const missing: string[] = [];
  for (const slice of siteMap.workspaces) {
    const detail = await readJsonDefs<Record<string, unknown>>(`${moduleName}/workspaces`, slice.workspaceId);
    if (detail && Array.isArray(detail.sections)) workspaces.push(prepareE6JourneyMap({ workspaces: [detail], landings: [], navigationEdges: [] }, { moduleName }).workspaces[0]);
    else missing.push(slice.workspaceId);
  }

  // Repair round (one attempt): re-run the detail for any missing workspace.
  if (missing.length > 0 && !parsedArgs.repairAttempt) {
    const repairs = missing.map((workspaceId, index) => nsAgentStepIntent(context, mutationParent, {
      agentName: AGENT_NAME, stepTitle: `Repair workspace ${workspaceId}`,
      planId: `e6-detail-repair-${index + 1}-${workspaceId}`,
      prompt: { planId: DETAIL_PLAN, moduleName, workspaceId, retryAttempt: 2 },
      // task06 6a: a second transient LLM-call failure on the repair degrades to the explicit
      // 'workspaces missing after repair round' message (e6-finalize-2), never a raw task crash.
      onFailure: 'wait_after_prompt',
    }));
    const repairPlanIds = repairs.map(intent => (intent.step.planning as { planId: string }).planId);
    return [
      ...repairs,
      nsAgentStepIntent(context, mutationParent, {
        agentName: AGENT_NAME, stepTitle: 'Finalize journey map (after repair)', planId: 'e6-finalize-2',
        dependsOn: repairPlanIds, status: 'waiting_dependency', prompt: { planId: FINALIZE_PLAN, moduleName, repairAttempt: 2 },
      }),
      nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `${missing.length} workspaces missing (${missing.join(', ')}); repair round started`),
    ];
  }
  if (missing.length > 0) {
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `workspaces missing after repair round: ${missing.join(', ')}`)];
  }

  const artifact: NsE6JourneyMapArtifact = {
    schemaVersion: E6_JOURNEY_MAP_SCHEMA_VERSION, moduleName, note: E6_JOURNEY_MAP_NOTE,
    workspaces, landings: siteMap.landings, navigationEdges: siteMap.navigationEdges,
  };
  const gateContext = await buildFullGateContext(inputs);
  const check = validateE6Invariants(artifact, gateContext);
  const errors = check.issues.filter(issue => issue.severity === 'error');
  let pipeline = await readNsPipeline(moduleName) || createNsPipeline(moduleName);
  if (errors.length > 0) {
    const traceMsg = errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, FINALIZE_PLAN, AGENT_NAME, parsedArgs.repairAttempt || 1, { errors }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `journey map invalid after assembly:\n${traceMsg}`)];
  }

  // P8: the PERMANENT journeys artifact (narrative + operation/workspace links) — derived from the e2
  // narrative + the classification (feature→op) + the site map (op→workspace). Never the LLM's.
  const journeys = deriveE6Journeys(
    readE6JourneySources(inputs.journeys),
    inputs.classification.operations.map(operation => ({ operationId: operation.operationId, featureRefs: operation.featureRefs })),
    siteMap.workspaces.map(workspace => ({ workspaceId: workspace.workspaceId, actors: workspace.actors, operationIds: workspace.operationIds })),
  );
  const journeysCheck = validateE6Journeys(journeys, { operationIds: gateContext.classificationOperationIds, workspaceIds: siteMap.workspaces.map(workspace => workspace.workspaceId) });
  const journeyErrors = journeysCheck.issues.filter(issue => issue.severity === 'error');
  if (journeyErrors.length > 0) {
    const traceMsg = journeyErrors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeNsTrace(moduleName, FINALIZE_PLAN, AGENT_NAME, parsedArgs.repairAttempt || 1, { journeyErrors }, traceMsg);
    return [nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'failed', `journeys invalid:\n${traceMsg}`)];
  }
  for (const journey of journeys) {
    await writeDefsArtifact(
      { project: mls.actualProject || 0, level: 4, folder: `${moduleName}/journeys`, shortName: journey.journeyId, extension: '.defs.ts' },
      `${journey.journeyId}Journey`,
      journey,
    );
  }

  pipeline = approveNsStep(pipeline, STEP_ID, 'auto');
  pipeline = markNsDownstreamDirty(pipeline, STEP_ID); // re-run invalidates e7's contracts (newSolution_11)
  await writeNsPipeline(pipeline);
  await writeMarkdownArtifact(nsPipelineArtifactFileInfo(moduleName, 'e6-journey-map', '.md'), renderE6Markdown(artifact, { generatedAt: new Date().toISOString() }));
  await writeNsTrace(moduleName, FINALIZE_PLAN, AGENT_NAME, 1, { workspaces: workspaces.length, journeys: journeys.length });

  return [
    nsResultStepIntent(context, mutationParent, {
      planId: DONE_ANCHOR, dependsOn: [STEP_ID], stepTitle: 'Journey map ready',
      result: { type: DONE_ANCHOR, moduleName, workspaces: workspaces.map(workspace => workspace.workspaceId) },
    }),
    nsUpdateStatusIntent(context, mutationParent, step, hookSequential, 'completed', `e6-journey-map approved for ${moduleName} (${workspaces.length} workspaces)`),
  ];
}

// ---------------------------------------------------------------------------
// inputs
// ---------------------------------------------------------------------------

async function loadE6Inputs(requestedModule?: string): Promise<E6Inputs> {
  const moduleName = await resolveE6Module(requestedModule);
  const journeys = await readJsonArtifact<NsE2JourneysArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), true);
  if (!journeys) throw new Error(`[${AGENT_NAME}] e2-journeys.json not found for ${moduleName}`);
  const classification = await readJsonArtifact<NsE5ClassificationArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e5-classification', '.json'), true);
  if (!classification) throw new Error(`[${AGENT_NAME}] e5-classification.json not found for ${moduleName}`);
  const model = await readJsonArtifact<NsE3ModelArtifact>(nsPipelineArtifactFileInfo(moduleName, 'e3-model', '.json'), true);
  if (!model) throw new Error(`[${AGENT_NAME}] e3-model.json not found for ${moduleName}`);
  const actorsRules = await readJsonArtifact<Record<string, unknown>>(nsPipelineArtifactFileInfo(moduleName, 'e4-actors-rules', '.json'), true);
  if (!actorsRules) throw new Error(`[${AGENT_NAME}] e4-actors-rules.json not found for ${moduleName}`);
  return {
    moduleName,
    journeys,
    classification: {
      workflows: Array.isArray(classification.workflows) ? classification.workflows : [],
      operations: Array.isArray(classification.operations) ? classification.operations : [],
    },
    model,
    rosterActorIds: readRosterActorIds(actorsRules),
  };
}

async function resolveE6Module(requested?: string): Promise<string> {
  if (requested) return normalizeModuleFolderName(requested);
  for (const moduleName of listExistingModuleFolders()) {
    const pipeline = await readNsPipeline(moduleName);
    if (!pipeline) continue;
    const e5 = pipeline.steps['e5-workflows-operations'];
    const e6 = pipeline.steps[STEP_ID];
    if (e5?.status === 'approved' && (!e6 || e6.status !== 'approved' || e6.dirty)) return moduleName;
  }
  throw new Error(`[${AGENT_NAME}] no module with approved E5 waiting for E6`);
}

function readRosterActorIds(input: unknown): string[] {
  const record = isRecord(input) ? input : {};
  const actors = Array.isArray(record.actors) ? record.actors.filter(isRecord) : [];
  return actors.map(actor => readString(actor.actorId)).filter((actorId): actorId is string => !!actorId);
}

// Actors owning at least one behavior whose featureRefs include a 'now'-priority E2 feature.
function computeNowCapabilityActorIds(
  classification: NsE5ClassificationArtifact,
  journeys: NsE2JourneysArtifact,
): string[] {
  const nowFeatureIds = new Set(journeys.features.filter(feature => feature.priority === 'now').map(feature => feature.featureId));
  const actorIds = new Set<string>();
  for (const workflow of classification.workflows) {
    if ((workflow.featureRefs || []).some(featureId => nowFeatureIds.has(featureId))) actorIds.add(workflow.actorId);
  }
  for (const operation of classification.operations) {
    if ((operation.featureRefs || []).some(featureId => nowFeatureIds.has(featureId))) actorIds.add(operation.actorId);
  }
  return [...actorIds];
}

// Slim journeys view for the prompt: actors, per-journey steps and feature priorities only.
function buildJourneysView(journeys: NsE2JourneysArtifact): Record<string, unknown> {
  return {
    actors: journeys.actors,
    journeys: journeys.journeys.map(journey => ({
      journeyId: journey.journeyId,
      actorId: journey.actorId,
      title: journey.title,
      goal: journey.goal,
      steps: journey.steps.map(item => ({ stepId: item.stepId, title: item.title, featureRefs: item.featureRefs })),
      outcome: journey.outcome,
    })),
    features: journeys.features.map(feature => ({
      featureId: feature.featureId,
      title: feature.title,
      priority: feature.priority,
      actorIds: feature.actorIds,
    })),
  };
}

// ---------------------------------------------------------------------------
// saved defs summaries
// ---------------------------------------------------------------------------

async function summarizeWorkflowDefs(moduleName: string, classification: NsE5ClassificationArtifact): Promise<NsE6BehaviorSummary[]> {
  const summaries: NsE6BehaviorSummary[] = [];
  for (const workflow of classification.workflows) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsWorkflowsFolder(moduleName), workflow.workflowId);
    summaries.push({
      id: workflow.workflowId,
      title: readString(defs?.title) || workflow.title,
      actor: workflow.actorId,
      entity: workflow.primaryEntity,
      kind: 'workflow',
      pageId: readString(defs?.pageId) || workflow.workflowId,
      storySteps: summarizeStory(defs?.story),
    });
  }
  return summaries;
}

async function summarizeOperationDefs(moduleName: string, classification: NsE5ClassificationArtifact): Promise<NsE6BehaviorSummary[]> {
  const summaries: NsE6BehaviorSummary[] = [];
  for (const operation of classification.operations) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsOperationsFolder(moduleName), operation.operationId);
    const inputNames = (Array.isArray(defs?.inputs) ? defs!.inputs : [])
      .map(input => (isRecord(input) ? readString(input.inputId) : undefined))
      .filter((name): name is string => !!name);
    const outputSets = collectNsOutputPathSets(isRecord(defs?.outputShape) ? defs!.outputShape : undefined);
    summaries.push({
      id: operation.operationId,
      title: readString(defs?.title) || operation.title,
      actor: operation.actorId,
      entity: operation.entity,
      kind: readString(defs?.kind) || operation.kind,
      pageId: readString(defs?.pageId) || operation.workflowId || operation.operationId,
      storySteps: summarizeStory(defs?.story),
      // The projectable vocabulary — the LLM must copy these names verbatim into bffCall `from` paths.
      inputNames,
      outputTopPaths: outputSets.top,
      outputItemPaths: outputSets.item,
    });
  }
  return summaries;
}

// Per-operation facts for the deterministic organism gates (detailPanel/batchAction). Read from the
// frozen operation defs so the gate stays pure — an operation whose def is absent simply has no fact
// entry, and the gate errors (organism.fact.missing) rather than silently skipping the check.
const PUBLIC_INPUT_SOURCES = new Set(['userInput', 'selectedEntity', 'routeParam']);

async function buildE6OperationFacts(
  moduleName: string,
  classification: NsE5ClassificationArtifact,
): Promise<Record<string, NsE6OperationFact>> {
  const facts: Record<string, NsE6OperationFact> = {};
  for (const operation of classification.operations) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsOperationsFolder(moduleName), operation.operationId);
    if (!defs) continue;
    const accessPattern = isRecord(defs.accessPattern) ? defs.accessPattern : {};
    const inputs = Array.isArray(defs.inputs) ? defs.inputs : [];
    const outputShape = isRecord(defs.outputShape) ? defs.outputShape : undefined;
    facts[operation.operationId] = {
      accessPatternKind: readEnumValue(accessPattern.kind, ['list', 'getById', 'lookup', 'commandInput'], 'commandInput'),
      selection: readEnumValue(accessPattern.selection, ['none', 'single', 'multiple'], 'none'),
      opKind: readEnumValue(defs.kind, ['create', 'update', 'delete', 'query', 'view'], 'view'),
      hasPublicInput: inputs.some(input => isRecord(input) && typeof input.source === 'string' && PUBLIC_INPUT_SOURCES.has(input.source)),
      // D6 back-compat: new defs carry `actors`, legacy defs carry singular `actor`. Fall back to the
      // classification actorId when a def is missing the field entirely.
      actors: readActors(defs).length ? readActors(defs) : [operation.actorId].filter(Boolean),
      // A4.2 traceability: the valid `from` suffixes a bffCall projection may point at (split by
      // position — P1 makes $items.<col> at the output top level inexpressible).
      inputNames: inputs.map(input => (isRecord(input) ? readString(input.inputId) : undefined)).filter((name): name is string => !!name),
      outputTopPaths: collectNsOutputPathSets(outputShape).top,
      outputItemPaths: collectNsOutputPathSets(outputShape).item,
    };
  }
  return facts;
}

function readEnumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

// Defs files are `export const x = {...} as const;` — extract the JSON block
// (same convention as agentNsOntology.readJsonDefs).
async function readJsonDefs<T>(folder: string, shortName: string): Promise<T | null> {
  const raw = await readStorText({ project: mls.actualProject || 0, level: 4, folder, shortName, extension: '.defs.ts' }, false);
  if (!raw.trim()) return null;
  const start = raw.indexOf('= {');
  const end = raw.lastIndexOf('} as const;');
  if (start < 0 || end < 0) return null;
  const parsed = parseMaybeJson(raw.slice(start + 2, end + 1));
  return isRecord(parsed) ? parsed as T : null;
}

// Stories may be a string, an array of strings or an array of step records.
function summarizeStory(value: unknown): string[] {
  const story = parseMaybeJson(value);
  if (typeof story === 'string') return story.trim() ? [truncateLine(story)] : [];
  if (isRecord(story)) return summarizeStory(story.steps);
  if (!Array.isArray(story)) return [];
  return story.slice(0, 8)
    .map(item => {
      if (typeof item === 'string') return truncateLine(item);
      if (isRecord(item)) {
        return truncateLine(readString(item.title) || readString(item.intent) || readString(item.description) || readString(item.text) || '');
      }
      return '';
    })
    .filter(Boolean);
}

function truncateLine(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > 160 ? `${clean.slice(0, 159).trim()}...` : clean;
}

// ---------------------------------------------------------------------------
// misc
// ---------------------------------------------------------------------------

async function readNsSchema(shortName: string): Promise<Record<string, unknown>> {
  const raw = await readNsText('schemas', shortName, '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error(`[${AGENT_NAME}] invalid schema ${shortName}`);
  return parsed;
}

async function readNsText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(nsL2File(`${NS_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

// Read the site map back from disk (l4/<module>/siteMap.defs.ts) as the phase-2 slice source.
async function readSiteMapDefs(moduleName: string): Promise<NsE6SiteMapArtifact | null> {
  const raw = await readJsonDefs<Record<string, unknown>>(moduleName, 'siteMap');
  if (!raw) return null;
  return prepareE6SiteMap(raw, { moduleName });
}

// Light operation summaries for the site map (no field vocabulary — the map only partitions pages).
async function summarizeOperationsLight(moduleName: string, classification: NsE5ClassificationArtifact): Promise<Record<string, unknown>[]> {
  const summaries: Record<string, unknown>[] = [];
  for (const operation of classification.operations) {
    const defs = await readJsonDefs<Record<string, unknown>>(nsOperationsFolder(moduleName), operation.operationId);
    const accessPattern = isRecord(defs?.accessPattern) ? defs!.accessPattern : {};
    summaries.push({
      id: operation.operationId,
      actor: operation.actorId,
      kind: readString(defs?.kind) || operation.kind,
      entity: operation.entity,
      accessPatternKind: readString(accessPattern.kind) || '',
      ...(operation.workflowId ? { workflowId: operation.workflowId } : {}),
      goal: summarizeStory(defs?.story)[0] || readString(defs?.title) || operation.title,
    });
  }
  return summaries;
}

function buildSiteMapContext(inputs: E6Inputs): E6SiteMapGateContext {
  const operationOwnerWorkflow: Record<string, string | undefined> = {};
  const operationKind: Record<string, string> = {};
  const operationEntity: Record<string, string> = {};
  for (const workflow of inputs.classification.workflows) {
    for (const operationId of workflow.operationIds) operationOwnerWorkflow[operationId] = workflow.workflowId;
  }
  for (const operation of inputs.classification.operations) {
    if (operation.workflowId) operationOwnerWorkflow[operation.operationId] = operation.workflowId;
    operationKind[operation.operationId] = operation.kind;
    operationEntity[operation.operationId] = operation.entity;
  }
  return {
    moduleName: inputs.moduleName,
    classificationWorkflowIds: inputs.classification.workflows.map(workflow => workflow.workflowId),
    classificationOperationIds: inputs.classification.operations.map(operation => operation.operationId),
    rosterActorIds: inputs.rosterActorIds,
    entityIds: inputs.model.entities.map(entity => entity.entityId),
    nowCapabilityActorIds: computeNowCapabilityActorIds(inputs.classification, inputs.journeys),
    operationOwnerWorkflow, operationKind, operationEntity,
  };
}

async function buildFullGateContext(inputs: E6Inputs): Promise<E6GateContext> {
  return {
    moduleName: inputs.moduleName,
    classificationWorkflowIds: inputs.classification.workflows.map(workflow => workflow.workflowId),
    classificationOperationIds: inputs.classification.operations.map(operation => operation.operationId),
    rosterActorIds: inputs.rosterActorIds,
    entityIds: inputs.model.entities.map(entity => entity.entityId),
    nowCapabilityActorIds: computeNowCapabilityActorIds(inputs.classification, inputs.journeys),
    operationFacts: await buildE6OperationFacts(inputs.moduleName, inputs.classification),
  };
}

// Detail-gate context: scope the classification ops to THIS workspace so coverage passes in isolation.
async function buildSingleWorkspaceContext(inputs: E6Inputs, workspace: NsE6Workspace): Promise<E6GateContext> {
  const full = await buildFullGateContext(inputs);
  return { ...full, classificationOperationIds: workspace.operationIds };
}

function parseE6Args(value: unknown): E6Args {
  const parsed = parseMaybeJson(value);
  if (!isRecord(parsed)) return {};
  return {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    workspaceId: readString(parsed.workspaceId),
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    repairAttempt: typeof parsed.repairAttempt === 'number' ? parsed.repairAttempt : undefined,
    retryContext: readString(parsed.retryContext),
    llmRetry: parsed.llmRetry === true,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
