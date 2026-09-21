/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/agentP2Menu.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  accessFile,
  readDefsJson,
  readJson,
  workflowsFile,
  writeJson,
} from '/_102035_/l2/solution/fs.js';
import type { Ns5AccessArtifact, Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';
import {
  P2_MENU_DEVICE,
  createP2RetryStep,
  isP2CandidateRoot,
  markP2Step,
  p2AgentFile,
  p2CanonicalMenuFile,
  p2DraftFile,
  p2MenuFile,
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
import { loadP2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.js';
import {
  unwrapP2ArtifactPayload,
  type P2L4Sources,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  buildP2MenuFile,
  buildP2MenuTool,
  menuActionCounts,
  menuCandidates,
  normalizeMenuV2,
  parseP2Grants,
  parseP2Processes,
  type MenuV2,
  type P2GrantView,
  type P2MenuFile,
  type P2ProcessView,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import {
  formatP2MenuGate,
  formatP2MenuWarnings,
  validateP2Menu,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/gate.js';

const MAX_REPAIRS = 2;
const MAX_TRANSPORT_RETRIES = 1;

interface MenuArgs {
  planId: string;
  moduleName: string;
  repairAttempt: number;
  transportAttempt: number;
  gateFeedback: string;
}

export interface P2MenuSources {
  sources: P2L4Sources;
  grants: P2GrantView[];
  processes: P2ProcessView[];
}

export function composeP2SystemPrompt(skillText: string, stepPrompt: string): string {
  const skill = skillText.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '').trim();
  return [skill, stepPrompt].filter(Boolean).join('\n\n');
}

export function buildP2MenuHumanPrompt(input: {
  menuSources: P2MenuSources;
  gateFeedback?: string;
  previousDraft?: unknown;
  canonicalMenu?: P2MenuFile | null;
}): string {
  const { sources, grants, processes } = input.menuSources;
  const candidates = menuCandidates(sources, grants, processes);
  const actorLines = sources.actors.map(actor => `- ${actor.actorId} (${actor.kind}): ${actor.title}`);
  const grantLines = grants.map(grant => {
    const anchor = grant.dataScope.anchorEntity ? ` anchor=${grant.dataScope.anchorEntity}` : '';
    return `- ${grant.grantId} actor=${grant.actorRef} scope=${grant.dataScope.mode}${anchor} disclosure=${grant.disclosure.mode} entities=${grant.entityRefs.join(',') || '(none)'}`;
  });
  const entityLines = sources.entities.map(entity => {
    const flags = [
      entity.kind,
      entity.family,
      entity.writer ? `writer=${entity.writer}` : '',
      entity.displayField ? `displayField=${entity.displayField}` : '',
    ].filter(Boolean);
    return `- ${entity.entityId} (${flags.join(', ')})`;
  });
  const processLines = processes.map(process => {
    const trigger = [
      process.trigger.kind,
      process.trigger.schedule,
      process.trigger.event,
      process.trigger.actorRef,
    ].filter(Boolean).join(':');
    const tasks = process.tasks.map(task => `${task.taskId}:${task.kind}`).join(', ');
    return `- ${process.processId} trigger=${trigger}\n  stages: ${tasks || '(none)'}`;
  });
  const journeyLines = sources.journeys.map(journey => {
    const steps = journey.steps.map(step => `${step.stepId}:${step.kind}:${step.entity}`).join(', ');
    const goal = journey.goal ? `\n  goal: ${journey.goal}` : '';
    return `- ${journey.journeyId} actor=${journey.actorRef} — ${journey.title}${goal}\n  steps: ${steps}`;
  });
  return [
    `## userLanguage`,
    sources.userLanguage,
    input.canonicalMenu ? [
      '',
      '## the module\'s current screens — keep their ids, labels and wording; change only what the l4 diff changes',
      JSON.stringify(input.canonicalMenu, null, 2),
    ].join('\n') : '',
    '',
    '## Candidates (deterministic; candidates, not the answer)',
    JSON.stringify({
      hubs: candidates.hubs,
      pages: candidates.pages,
      recordsKept: candidates.recordsKept,
    }, null, 2),
    '',
    '## What this actor must see, beyond journeys',
    JSON.stringify(candidates.beyondJourneys, null, 2),
    '',
    '## Actors',
    actorLines.length ? actorLines.join('\n') : '(none)',
    '',
    '## Grants',
    grantLines.length ? grantLines.join('\n') : '(none)',
    '',
    '## Entities',
    entityLines.length ? entityLines.join('\n') : '(none)',
    '',
    '## Processes',
    processLines.length ? processLines.join('\n') : '(none)',
    '',
    '## Journeys',
    journeyLines.length ? journeyLines.join('\n') : '(none)',
    input.gateFeedback ? `\n## Deterministic repair required\n${input.gateFeedback}` : '',
    input.previousDraft ? `\n## Current draft; keep unrelated fields\n${JSON.stringify(input.previousDraft, null, 2)}` : '',
  ].filter(item => item !== '').join('\n');
}

export async function loadP2MenuSources(moduleName: string): Promise<P2MenuSources> {
  const sources = await loadP2L4Sources(moduleName);
  const [access, workflows] = await Promise.all([
    readDefsJson<Ns5AccessArtifact>(accessFile(moduleName)),
    readDefsJson<Ns5WorkflowsArtifact>(workflowsFile(moduleName)),
  ]);
  return {
    sources,
    grants: parseP2Grants(access),
    processes: parseP2Processes(workflows),
  };
}

export async function beforeP2MenuPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentPlannerL2:menu20] task invalid');
  let moduleName = '';
  try {
    const parsed = resolveArgs(context, args || step.prompt);
    moduleName = parsed.moduleName;
    const menuSources = await loadP2MenuSources(moduleName);
    const [skill, prompt, schema, previous, canonicalMenu] = await Promise.all([
      readP2AgentText('skills', 'menu', '.md'),
      readP2AgentText('steps/menu20', 'prompt', '.md'),
      readJson<Record<string, unknown>>(p2AgentFile('schemas', 'menu.schema', '.json')),
      moduleName ? readJson(p2DraftFile(moduleName, 'menu20')) : Promise.resolve(null),
      moduleName && isP2CandidateRoot(moduleName)
        ? readJson<P2MenuFile>(p2CanonicalMenuFile(moduleName, P2_MENU_DEVICE))
        : Promise.resolve(null),
    ]);
    if (!schema) throw new Error('menu.schema.json is missing.');
    const tool = buildP2MenuTool(schema);
    const humanPrompt = buildP2MenuHumanPrompt({
      menuSources,
      gateFeedback: parsed.gateFeedback,
      previousDraft: previous,
      canonicalMenu,
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

export async function afterP2MenuPromptStep(
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
      const failure = readPromptFailure(step, 'menu20 returned no usable menu artifact.');
      if (parsed.transportAttempt < MAX_TRANSPORT_RETRIES) {
        return [
          addStep(context, mutationParent, createP2RetryStep('menu20', moduleName, 'transport', parsed.transportAttempt + 1)),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `menu20 transport retry ${parsed.transportAttempt + 1} scheduled: ${failure}`),
        ];
      }
      throw new Error(failure);
    }

    const menuSources = await loadP2MenuSources(moduleName);
    let pipeline = await requirePipeline(moduleName);
    pipeline = await writeStepState(pipeline, {
      status: 'running',
      updatedAt: new Date().toISOString(),
    });
    const draftPath = await writeJson(p2DraftFile(moduleName, 'menu20'), payload);
    let draft: MenuV2;
    try {
      draft = normalizeMenuV2(payload);
    } catch (error) {
      const feedback = errorMessage(error);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createP2RetryStep('menu20', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `menu20 gate scheduled repair ${parsed.repairAttempt + 1}.`),
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
    const gate = validateP2Menu(draft, menuSources);
    if (!gate.ok) {
      const feedback = formatP2MenuGate(gate.issues);
      if (parsed.repairAttempt < MAX_REPAIRS) {
        return [
          addStep(context, mutationParent, createP2RetryStep('menu20', moduleName, 'repair', parsed.repairAttempt + 1, { gateFeedback: feedback })),
          updateStatus(context, mutationParent, step, hookSequential, 'completed', `menu20 gate scheduled repair ${parsed.repairAttempt + 1}.`),
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

    const artifact = buildP2MenuFile({
      moduleName,
      userLanguage: menuSources.sources.userLanguage,
      device: P2_MENU_DEVICE,
      draft,
    });
    const menuPath = await writeJson(p2MenuFile(moduleName, P2_MENU_DEVICE), artifact);
    const warnings = formatP2MenuWarnings(gate.issues);
    pipeline = await writeStepState(pipeline, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
      artifactPaths: [menuPath, draftPath],
    });
    pipeline = {
      ...pipeline,
      warnings,
      device: P2_MENU_DEVICE,
      actionCounts: menuActionCounts(artifact),
    };
    await writeJson(p2PipelineFile(pipeline.moduleName), pipeline);
    const warningNote = warnings.length ? ` (${warnings.length} warning(s))` : '';
    return [
      doneAnchor(context, mutationParent, moduleName, artifact, menuPath, pipeline.sourceMessages || []),
      updateStatus(context, mutationParent, step, hookSequential, 'completed', `menu20 approved: ${menuPath}${warningNote}`),
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
  next: P2PipelineState['steps']['menu20'] & { status: 'running' | 'approved' | 'failed'; updatedAt: string },
): Promise<P2PipelineState> {
  const updated = markP2Step(pipeline, 'menu20', next);
  await writeJson(p2PipelineFile(pipeline.moduleName), updated);
  return updated;
}

async function recordFailure(moduleName: string, error: string): Promise<void> {
  if (!moduleName) return;
  try {
    const pipeline = await readP2Pipeline(moduleName);
    if (!pipeline) return;
    await writeJson(p2PipelineFile(moduleName), markP2Step(pipeline, 'menu20', {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error,
    }));
  } catch { /* task trace remains the fallback */ }
}

function resolveArgs(context: mls.msg.ExecutionContext, value: unknown): MenuArgs {
  const root = parseRecord(value);
  const moduleName = text(root.moduleName) || memoryString(context, 'moduleName');
  return {
    planId: text(root.planId) || 'menu20',
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
  artifact: P2MenuFile,
  menuPath: string,
  sourceMessages: string[],
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Menu done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName,
      artifactPaths: [menuPath],
      sourceMessages,
      actors: Object.keys(artifact.authorities),
      completedStep: 'menu20',
    }),
    planning: { planId: 'menu20-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
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

P2_STEP_HOOKS.menu20 = {
  beforePromptStep: beforeP2MenuPromptStep,
  afterPromptStep: afterP2MenuPromptStep,
};
