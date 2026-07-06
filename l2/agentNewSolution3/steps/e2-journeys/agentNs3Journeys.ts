/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e2-journeys/agentNs3Journeys.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  NS3_AGENT_FOLDER,
  isRecord,
  listExistingModuleFolders,
  ns3L2File,
  ns3PipelineArtifactFileInfo,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
  writeMarkdownArtifact,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  createNs3Pipeline,
  markNs3StepRunning,
  readNs3Pipeline,
  writeNs3Pipeline,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Pipeline.js';
import { writeNs3Trace } from '/_102020_/l2/agentNewSolution3/helpers/ns3Trace.js';
import { Ns3E1DraftArtifact } from '/_102020_/l2/agentNewSolution3/steps/e1-draft/gate.js';
import {
  Ns3E2JourneysArtifact,
  prepareE2JourneysArtifact,
  renderE2JourneysMarkdown,
  validateE2JourneysInvariants,
} from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/gate.js';

const AGENT_NAME = 'agentNs3Journeys';
const TOOL_NAME = 'submitNs3Journeys';
type PlannerStatus = 'ok' | 'failed';

interface Ns3E2PlannerOutput {
  status: PlannerStatus;
  result: Record<string, unknown>;
  trace: string[];
}

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NS3_AGENT_FOLDER}/steps/e2-journeys`,
    agentDescription: 'E2 - journeys and feature catalog for agentNewSolution3',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
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
  const parsedArgs = parseArgs(args);
  const moduleName = await resolveE2Module(parsedArgs.moduleName);
  const draft = await readJsonArtifact<Ns3E1DraftArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e1-draft', '.json'), true);
  if (!draft) throw new Error(`[${AGENT_NAME}] e1-draft.json not found for ${moduleName}`);
  const previous = parsedArgs.adjustment || parsedArgs.retryContext
    ? await readJsonArtifact<Ns3E2JourneysArtifact>(ns3PipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json'), false)
    : null;

  const schema = await readE2Schema();
  const platform = await readNs3Text('skills', 'platform', '.md', true);
  const prompt = await readNs3Text('steps/e2-journeys', 'prompt', '.md', true);
  const humanPrompt = [
    '## E1 draft (only source)',
    JSON.stringify(draft, null, 2),
    '',
    parsedArgs.adjustment ? `## Adjustment request\n${parsedArgs.adjustment}\n` : '',
    parsedArgs.retryContext ? `## Gate retry context\n${parsedArgs.retryContext}\n` : '',
    previous ? `## Current E2 artifact\n${JSON.stringify(previous, null, 2)}\n` : '',
  ].filter(Boolean).join('\n');

  return [{
    type: 'prompt_ready',
    args: JSON.stringify({ planId: 'e2-journeys', moduleName }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: `${prompt.split('{{toolName}}').join(TOOL_NAME)}\n\n${platform}\n\n${buildToolInstruction()}`,
    humanPrompt,
    tools: [createToolSchema(schema)],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  let moduleNameForTrace: string | null = null;
  try {
    const parsedArgs = parseArgs(step.prompt);
    const output = extractE2Output(step.interaction?.payload?.[0]);
    if (output.status === 'failed') {
      return [updateStatus(context, parentStep, step, hookSequential, 'failed', output.trace.join('\n') || 'E2 journeys returned failed')];
    }
    const moduleName = parsedArgs.moduleName || readString(output.result.moduleName) || '';
    const draft = await readJsonArtifact<Ns3E1DraftArtifact>(ns3PipelineArtifactFileInfo(normalizeModuleFolderName(moduleName), 'e1-draft', '.json'), true);
    const e1ActorIds = (draft?.actors || []).map(actor => actor.actorId);

    const artifact = prepareE2JourneysArtifact(output.result);
    moduleNameForTrace = artifact.moduleName;
    const gateInputs = {
      e1DraftCreatedAt: draft?.createdAt || '',
      adjustment: parsedArgs.adjustment || '',
      retryContext: parsedArgs.retryContext || '',
    };
    const schema = await readE2Schema();
    let pipeline = await readNs3Pipeline(artifact.moduleName) || createNs3Pipeline(artifact.moduleName);
    pipeline = markNs3StepRunning(pipeline, 'e2-journeys', gateInputs);
    const gate = await runNs3Gate({
      stepId: 'e2-journeys',
      schema,
      artifact,
      inputs: gateInputs,
      pipeline,
      validate: item => validateE2JourneysInvariants(item, { e1ActorIds }),
    });
    if (gate.pipeline) pipeline = gate.pipeline;
    await writeNs3Pipeline(pipeline);
    const attempt = parsedArgs.retryAttempt || gate.attempts;
    const markdown = renderE2JourneysMarkdown(artifact);
    await writeJsonArtifact(ns3PipelineArtifactFileInfo(artifact.moduleName, 'e2-journeys', '.json'), artifact);
    await writeMarkdownArtifact(ns3PipelineArtifactFileInfo(artifact.moduleName, 'e2-journeys', '.md'), markdown);

    if (!gate.ok) {
      const traceMsg = gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('\n');
      await writeNs3Trace(moduleNameForTrace, 'e2-journeys', AGENT_NAME, attempt, { artifact, gate, retryContext: gate.retryContext }, traceMsg);
      const intents: mls.msg.AgentIntent[] = [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
      if (attempt < 2) intents.unshift(addGateRetryStep(context, parentStep, artifact.moduleName, gate.retryContext || traceMsg));
      return intents;
    }

    await writeNs3Trace(artifact.moduleName, 'e2-journeys', AGENT_NAME, attempt, { artifact, gate });
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', `e2-journeys ready for ${artifact.moduleName}`)];
  } catch (error) {
    const traceMsg = error instanceof Error ? error.message : String(error);
    if (moduleNameForTrace) await writeNs3Trace(moduleNameForTrace, 'e2-journeys', AGENT_NAME, 1, { stepId: step.stepId }, traceMsg);
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', traceMsg)];
  }
}

async function resolveE2Module(requested?: string): Promise<string> {
  if (requested) {
    const normalized = normalizeModuleFolderName(requested);
    const draft = await readJsonArtifact<Ns3E1DraftArtifact>(ns3PipelineArtifactFileInfo(normalized, 'e1-draft', '.json'), false);
    if (draft) return normalized;
  }
  for (const module of listExistingModuleFolders()) {
    const draft = await readJsonArtifact<Ns3E1DraftArtifact>(ns3PipelineArtifactFileInfo(module, 'e1-draft', '.json'), false);
    if (!draft) continue;
    const pipeline = await readNs3Pipeline(module);
    if (!pipeline?.steps['e2-journeys'] || pipeline.steps['e2-journeys'].status !== 'approved') return module;
  }
  throw new Error(`[${AGENT_NAME}] no module with an e1-draft ready for E2`);
}

function addGateRetryStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  moduleName: string,
  retryContext: string,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: 'Retry E2 journeys gate',
      status: 'waiting_human_input',
      nextSteps: [],
      agentName: AGENT_NAME,
      prompt: JSON.stringify({ planId: 'e2-journeys', moduleName, retryAttempt: 2, retryContext }),
      rags: [],
      planning: { planId: `e2-journeys-retry-${Date.now()}`, dependsOn: ['e2-journeys'], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
  };
}

function createToolSchema(resultSchema: Record<string, unknown>): mls.msg.LLMTool {
  return {
    type: 'function',
    function: {
      name: TOOL_NAME,
      description: 'Submit the E2 journeys and feature catalog.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['status', 'result', 'trace'],
        properties: {
          status: { enum: ['ok', 'failed'] },
          result: resultSchema,
          trace: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  } as unknown as mls.msg.LLMTool;
}

function extractE2Output(payload: unknown): Ns3E2PlannerOutput {
  const parsed = parseMaybeJson(payload);
  if (!isRecord(parsed)) throw new Error('missing E2 payload');
  if (parsed.type === 'result') throw new Error(readString(parsed.result) || 'E2 returned result error');

  const direct = tryNormalizeE2Envelope(parsed);
  if (direct) return direct;

  if (parsed.type === 'flexible') {
    const flexible = parseMaybeJson(parsed.result);
    const fromFlexible = tryNormalizeE2Envelope(flexible);
    if (fromFlexible) return fromFlexible;
    const fromFlexibleTool = tryExtractToolOutput(flexible);
    if (fromFlexibleTool) return fromFlexibleTool;
    const fromFlexibleOpenAi = tryExtractOpenAiToolCall(flexible);
    if (fromFlexibleOpenAi) return fromFlexibleOpenAi;
  }

  const fromTool = tryExtractToolOutput(parsed);
  if (fromTool) return fromTool;
  const fromOpenAi = tryExtractOpenAiToolCall(parsed);
  if (fromOpenAi) return fromOpenAi;
  throw new Error(`payload does not contain a recognized ${TOOL_NAME} output`);
}

function tryExtractToolOutput(value: unknown): Ns3E2PlannerOutput | null {
  const record = parseMaybeJson(value);
  if (!isRecord(record) || record.toolName !== TOOL_NAME) return null;
  return normalizeToolArguments(record.arguments);
}

function normalizeToolArguments(value: unknown, depth = 0): Ns3E2PlannerOutput {
  const args = parseMaybeJson(value);
  if (!isRecord(args)) throw new Error('tool arguments must be an object');
  const direct = tryNormalizeE2Envelope(args);
  if (direct) return direct;
  if (args.arguments !== undefined && depth < 3) return normalizeToolArguments(args.arguments, depth + 1);
  throw new Error(`tool arguments do not contain ${TOOL_NAME} output`);
}

function tryExtractOpenAiToolCall(value: unknown): Ns3E2PlannerOutput | null {
  if (!isRecord(value) || !Array.isArray(value.tool_calls)) return null;
  for (const call of value.tool_calls) {
    if (!isRecord(call) || !isRecord(call.function) || call.function.name !== TOOL_NAME) continue;
    return normalizeToolArguments(call.function.arguments);
  }
  return null;
}

function tryNormalizeE2Envelope(value: unknown): Ns3E2PlannerOutput | null {
  const output = parseMaybeJson(value);
  if (!isRecord(output) || output.result === undefined) return null;
  const result = parseMaybeJson(output.result);
  if (!isRecord(result) || isToolWrapper(result)) return null;
  return {
    status: normalizePlannerStatus(output.status),
    result,
    trace: normalizeStringArray(output.trace),
  };
}

function isToolWrapper(value: unknown): boolean {
  const record = parseMaybeJson(value);
  return isRecord(record) && record.toolName === TOOL_NAME && record.arguments !== undefined;
}

function normalizePlannerStatus(value: unknown): PlannerStatus {
  if (value === undefined) return 'ok';
  if (value === 'ok' || value === 'failed') return value;
  if (value === 'needs_input') return 'ok';
  throw new Error(`invalid planner status: ${String(value)}`);
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => readString(item)).filter((item): item is string => !!item) : [];
}

async function readE2Schema(): Promise<Record<string, unknown>> {
  const raw = await readNs3Text('schemas', 'e2-journeys.schema', '.json', true);
  const parsed = parseMaybeJson(raw);
  if (!isRecord(parsed)) throw new Error('[readE2Schema] invalid schema');
  return parsed;
}

async function readNs3Text(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(ns3L2File(`${NS3_AGENT_FOLDER}/${folder}`, shortName, extension), required);
}

function parseArgs(value: unknown): {
  planId?: string;
  moduleName?: string;
  adjustment?: string;
  retryAttempt?: number;
  retryContext?: string;
} {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? {
    planId: readString(parsed.planId),
    moduleName: readString(parsed.moduleName),
    adjustment: readString(parsed.adjustment),
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: readString(parsed.retryContext),
  } : {};
}

function buildToolInstruction(): string {
  return `
Call the "${TOOL_NAME}" tool with only these top-level arguments:
{
  "status": "ok" | "failed",
  "result": E2 artifact matching the JSON schema,
  "trace": []
}

Do not include "type", "toolName", or "arguments" in the tool arguments.
Use status "failed" only when the E1 draft is missing or unusable.
`;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
