/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  accessFile,
  journeyFile,
  journeyIndexFile,
  moduleFile,
  ontologyEntityFile,
  ontologyIndexFile,
  readDefsJson,
  readJson,
  writeJson,
} from '/_102035_/l2/solution/fs.js';
import type {
  Ns5AccessArtifact,
  Ns5JourneyArtifact,
  Ns5JourneyIndexArtifact,
  Ns5ModuleArtifact,
  Ns5OntologyEntityV3,
  Ns5OntologyIndexV3,
} from '/_102035_/l2/solution/types.js';
import {
  P2_STEP_IDS,
  createP2RetryStep,
  markP2Step,
  p2AgentFile,
  p2DraftFile,
  p2PipelineFile,
  readP2AgentText,
  readP2Pipeline,
  type P2PipelineState,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_STEP_HOOKS,
  drainWaitingSiblings,
  updateStatus,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import {
  buildP2WorkspacesTool,
  collectP2WorkspaceCandidates,
  normalizeP2WorkspacesPayload,
  parseP2L4Sources,
  unwrapP2ArtifactPayload,
  type P2L4Sources,
  type P2WorkspacesDraft,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  formatP2WorkspaceGate,
  validateP2Workspaces,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface WorkspacesArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export function composeP2SystemPrompt(skillText: string, stepPrompt: string): string {
  const skill = skillText.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim();
  return [skill, stepPrompt].filter(Boolean).join('\n\n');
}

export function buildP2WorkspacesHumanPrompt(input: {
  sources: P2L4Sources;
  gateFeedback?: string;
  previousDraft?: unknown;
}): string {
  const candidates = collectP2WorkspaceCandidates(input.sources);
  const actorLines = input.sources.actors.map(actor => `- ${actor.actorId} (${actor.kind}): ${actor.title}`);
  const entityLines = input.sources.entities.map(entity => {
    const flags = [
      entity.kind,
      entity.class,
      entity.family,
      entity.storageKind,
      entity.displayField ? `displayField=${entity.displayField}` : '',
      entity.idField ? `idField=${entity.idField}` : '',
    ].filter(Boolean);
    return `- ${entity.entityId} (${flags.join(', ')})`;
  });
  const journeyLines = input.sources.journeys.map(journey => {
    const steps = journey.steps.map(step => `${step.stepId}:${step.kind}:${step.entity}`).join(', ');
    return `- ${journey.journeyId} actor=${journey.actorRef} — ${journey.title}\n  steps: ${steps}`;
  });
  return [
    `## userLanguage`,
    input.sources.userLanguage,
    '',
    '## Candidates (deterministic; choose among these)',
    JSON.stringify(candidates, null, 2),
    '',
    '## Actors',
    actorLines.length ? actorLines.join('\n') : '(none)',
    '',
    '## Entities',
    entityLines.length ? entityLines.join('\n') : '(none)',
    '',
    '## Journeys',
    journeyLines.length ? journeyLines.join('\n') : '(none)',
    input.gateFeedback ? `\n## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `\n## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(item => item !== '').join('\n');
}

export async function loadP2L4Sources(moduleName: string): Promise<P2L4Sources> {
  if (!moduleName) throw new Error('workspaces20 needs a moduleName.');
  const [moduleArtifact, index, access, ontology] = await Promise.all([
    readDefsJson<Ns5ModuleArtifact>(moduleFile(moduleName)),
    readDefsJson<Ns5JourneyIndexArtifact>(journeyIndexFile(moduleName)),
    readDefsJson<Ns5AccessArtifact>(accessFile(moduleName)),
    readDefsJson<Ns5OntologyIndexV3>(ontologyIndexFile(moduleName)),
  ]);
  if (!index) throw new Error(`journeys/index.defs.ts is missing for ${moduleName}.`);
  if (!access) throw new Error(`access.defs.ts is missing for ${moduleName}.`);
  if (!ontology) throw new Error(`ontology/index.defs.ts is missing for ${moduleName}.`);

  const journeys: unknown[] = [];
  for (const row of index.journeys) {
    const artifact = await readDefsJson<Ns5JourneyArtifact>(journeyFile(moduleName, row.journeyId));
    if (!artifact) throw new Error(`journey ${row.journeyId} is missing for ${moduleName}.`);
    journeys.push(artifact);
  }

  const ontologyEntities: unknown[] = [];
  for (const row of ontology.entities) {
    const entity = await readDefsJson<Ns5OntologyEntityV3>(ontologyEntityFile(moduleName, row.entityId));
    if (entity) ontologyEntities.push(entity);
  }

  return parseP2L4Sources({
    moduleName,
    userLanguage: moduleArtifact?.userLanguage,
    journeyIndex: index,
    journeys,
    access,
    ontologyIndex: ontology,
    ontologyEntities,
  });
}

export async function beforeP2WorkspacesPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentPlannerL2:workspaces20] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const sources = await loadP2L4Sources(moduleName);
    const [skill, prompt, schema, previous] = await Promise.all([
      readP2AgentText('skills', 'workspaces', '.md'),
      readP2AgentText('steps/workspaces20', 'prompt', '.md'),
      readJson<Record<string, unknown>>(p2AgentFile('schemas', 'workspaces.schema', '.json')),
      moduleName ? readJson(p2DraftFile(moduleName, 'workspaces20')) : Promise.resolve(null),
    ]);
    if (!schema) throw new Error('workspaces.schema.json is missing.');
    const tool = buildP2WorkspacesTool(schema);
    const humanPrompt = buildP2WorkspacesHumanPrompt({
      sources,
      gateFeedback: parsed.gateFeedback,
      previousDraft: previous,
    });
    return [promptReady(
      context,
      parentStep,
      hookSequential,
      args || String(step.prompt || ''),
      composeP2SystemPrompt(skill, prompt),
      humanPrompt,
      tool,
    )];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

export async function afterP2WorkspacesPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, step.prompt);
    moduleName = parsed.moduleName;
    const mutationParent = findMutableParent(context, parentStep);
    const payload = unwrapP2ArtifactPayload(step.interaction?.payload?.[0]);
    if (!isRecord(payload)) {
      const failure = readPromptFailure(step, 'workspaces20 returned no usable workspaces artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createP2RetryStep('workspaces20', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `workspaces20 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const sources = await loadP2L4Sources(moduleName);
    const draft = normalizeP2WorkspacesPayload(payload, moduleName);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(p2DraftFile(moduleName, 'workspaces20'), draft);
    const gate = validateP2Workspaces(draft, sources);
    if (!gate.ok) {
      const feedback = formatP2WorkspaceGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createP2RetryStep('workspaces20', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `workspaces20 gate scheduled repair ${parsed.repairAttempt + 1}.`),
        ];
      }
      await writeStepState(pipeline, {
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: feedback,
        artifactPaths: [draftPath],
      });
      throw new Error(feedback);
    }

    await writeStepState(pipeline, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
      artifactPaths: [draftPath],
    });
    return [
      doneAnchor(context, mutationParent, moduleName, draft, draftPath),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `workspaces20 approved: ${draftPath}`),
    ];
  } catch (error) {
    const message = errorMessage(error);
    await recordFailure(moduleName, message);
    return [
      ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
      updateStatus(context, parentStep, step, hookSequential, 'failed', message),
    ];
  }
}

async function requirePipeline(moduleName: string): Promise<P2PipelineState> {
  const pipeline = await readP2Pipeline(moduleName);
  if (!pipeline) throw new Error(`l2 pipeline.json is missing for ${moduleName}; entry10 must run first.`);
  return pipeline;
}

async function writeStepState(
  pipeline: P2PipelineState,
  next: P2PipelineState['steps']['workspaces20'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<P2PipelineState> {
  const updated = markP2Step(pipeline, 'workspaces20', next);
  await writeJson(p2PipelineFile(pipeline.moduleName), updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP2Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p2PipelineFile(moduleName), markP2Step(pipeline, 'workspaces20', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): WorkspacesArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'workspaces20',
    moduleName,
    repairAttempt: integer(root.repairAttempt),
    transportAttempt: integer(root.transportAttempt),
    gateFeedback: text(root.gateFeedback),
  };
}

function promptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: string,
  systemPrompt: string,
  humanPrompt: string,
  tool: mls.msg.LLMTool,
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [tool],
    toolChoice: { type: 'function', function: { name: tool.function.name } },
  };
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  draft: P2WorkspacesDraft,
  draftPath: string,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Workspaces done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths: [draftPath],
      workspaceIds: draft.workspaces.map(workspace => workspace.workspaceId),
      completedStep: 'workspaces20',
      nextStep: P2_STEP_IDS[2],
    }),
    planning: { planId: 'workspaces20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

function findMutableParent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function allSteps(context: mls.msg.ExecutionContext): mls.msg.AIPayload[] {
  const root = context.task?.iaCompressed?.nextSteps || [];
  const out: mls.msg.AIPayload[] = [];
  const walk = (steps: mls.msg.AIPayload[]) => {
    for (const step of steps) {
      out.push(step);
      if (step.nextSteps?.length) walk(step.nextSteps);
    }
  };
  walk(root);
  return out;
}

function readPromptFailure(step: mls.msg.AIAgentStep, fallback: string): string {
  const payload = step.interaction?.payload?.[0];
  const recordValue = isRecord(payload) ? payload : parseRecord(payload);
  if (typeof recordValue.result === 'string' && recordValue.result.trim()) return recordValue.result.trim();
  return fallback;
}

function parseRecord(value: unknown): Record<string, unknown> {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? parsed : {};
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch { return value; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function integer(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

P2_STEP_HOOKS.workspaces20 = {
  beforePromptStep: beforeP2WorkspacesPromptStep,
  afterPromptStep: afterP2WorkspacesPromptStep,
};
