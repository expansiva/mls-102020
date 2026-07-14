/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializeGen.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  applyHeader,
  buildMaterializeTypecheckTest,
  buildHumanPrompt,
  buildSystemPrompt,
  DEFAULT_MODEL_TYPE,
  expandContextRef,
  GEN_TOOL,
  GEN_TOOL_NAME,
  parseDefs,
  normalizeGeneratedCode,
  testPathForOutputPath,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  compileAndGetErrors,
  compileMlsPathAndGetErrors,
  consumeMaterializeStudioMessages,
  extractToolCallArgs,
  getContentByMlsPath,
  parseMlsPath,
  saveGeneratedTs,
  saveGeneratedTsByMlsPath,
  type GenStepArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';

interface ToolOutput {
  code: string;
}

const AGENT_NAME = 'agentCfeMaterializeGen';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/materialize',
    agentDescription: 'Generate one frontend L2 .ts file from an agentChangeFrontend .defs.ts pipeline item',
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
  try {
    if (!args) throw new Error('missing args');

    const genArgs = parseGenStepArgs(args);
    const genContext = await buildGenContext(genArgs.defPath);
    return [createPromptReadyIntent(context, parentStep, hookSequential, genArgs, genContext)];
  } catch (error) {
    const message = formatError('beforePromptStep', error);
    console.error(`[${agent.agentName}] ${message}`);
    return [mkFailureStatus(context, parentStep, step, hookSequential, isRepairRun(args || step.prompt), message)];
  }
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    consumeMaterializeStudioMessages();
    const genArgs = parseGenStepArgs(step.prompt);
    // attempt >= 2 marks a REPAIR run (normal step added by the phase verify step, with the
    // compiler error as repairHint -> buildHumanPrompt); attempt undefined marks a fan-out slot.
    const repairRun = (genArgs.attempt ?? 1) >= 2;
    const { defPath } = genArgs;
    const defsContent = defPath ? await getContentByMlsPath(defPath) : null;
    const parsedDefs = defsContent ? parseDefs(defsContent) : null;
    const pipelineItem = parsedDefs?.item;

    if (!pipelineItem) {
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, `pipeline not found in defs: ${defPath || '(missing defPath)'}`)];
    }

    const raw = step.interaction?.payload?.[0] as unknown;
    const output = extractToolCallArgs<ToolOutput>(raw, GEN_TOOL_NAME);
    if (!output?.code) {
      const detail = `missing generated code; payload=${describePayload(raw)}`;
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, detail, true)];
    }

    const parsed = parseMlsPath(pipelineItem.outputPath);
    if (!parsed) {
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, `invalid outputPath: ${pipelineItem.outputPath}`)];
    }

    const code = applyHeader(pipelineItem.outputPath, normalizeGeneratedCode(pipelineItem, parsedDefs.data, output.code));
    const saved = await saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, code);
    if (!saved) {
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, withStudioDiagnostics(`saveGeneratedTs failed for ${pipelineItem.outputPath}`))];
    }

    const typecheckTest = buildMaterializeTypecheckTest(pipelineItem, parsedDefs ? parsedDefs.data : null);
    const typecheckPath = typecheckTest ? testPathForOutputPath(pipelineItem.outputPath) : null;
    if (typecheckPath && typecheckTest) {
      const testSaved = await saveGeneratedTsByMlsPath(typecheckPath, typecheckTest);
      if (!testSaved) {
        return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, withStudioDiagnostics(`saveGeneratedTs failed for ${typecheckPath}`))];
      }
    }

    const compileErrors = [
      ...await compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName),
      ...(typecheckPath ? await compileMlsPathAndGetErrors(typecheckPath) : []),
    ];
    const studioDiagnostics = consumeMaterializeStudioMessages();
    if (compileErrors.length > 0) {
      const checkedFiles = typecheckPath ? `${pipelineItem.outputPath} + ${typecheckPath}` : pipelineItem.outputPath;
      const traceMsg = `compile/typecheck failed for ${checkedFiles}:\n${compileErrors.slice(0, 8).join('\n')}`;
      return [mkFailureStatus(context, parentStep, step, hookSequential, repairRun, withStudioDiagnostics(traceMsg, studioDiagnostics), true)];
    }

    return [mkStatus(context, parentStep, step, hookSequential, 'completed', studioDiagnostics.length ? formatStudioDiagnostics(studioDiagnostics) : undefined, 'input_output')];
  } catch (error) {
    const message = formatError('afterPromptStep', error);
    console.error(`[${agent.agentName}] ${message}`);
    return [mkFailureStatus(context, parentStep, step, hookSequential, isRepairRun(step.prompt), message)];
  }
}

function createPromptReadyIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  genArgs: GenStepArgs,
  genContext: {
    pipelineItem: PipelineItem;
    definitionData: unknown;
    skillSections: string[];
    contextSections: string[];
  },
): mls.msg.AgentIntentPromptReady {
  const args = JSON.stringify(genArgs);
  return {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(genContext.skillSections, genContext.pipelineItem.outputPath, DEFAULT_MODEL_TYPE),
    humanPrompt: buildHumanPrompt(genContext.definitionData, genContext.contextSections, genContext.pipelineItem.outputPath, genArgs.repairHint),
    tools: [GEN_TOOL as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: GEN_TOOL_NAME } },
  };
}

async function buildGenContext(defPath: string): Promise<{
  pipelineItem: PipelineItem;
  definitionData: unknown;
  skillSections: string[];
  contextSections: string[];
}> {
  const defsContent = await getContentByMlsPath(defPath);
  if (!defsContent) throw new Error(`[agentCfeMaterializeGen] defs not found: ${defPath}`);

  const parsed = parseDefs(defsContent);
  const pipelineItem = parsed.item;
  if (!pipelineItem) throw new Error(`[agentCfeMaterializeGen] pipeline not found: ${defPath}`);

  const skillSections = await readSections(pipelineItem.skills ?? [], 'skill');
  const contextSections = await readSections(pipelineItem.dependsFiles ?? [], 'context');
  return { pipelineItem, definitionData: parsed.data, skillSections, contextSections };
}

async function readSections(paths: string[], kind: 'skill' | 'context'): Promise<string[]> {
  const sections: string[] = [];
  for (const requestedPath of paths) {
    const expandedPaths = kind === 'context' ? expandContextRef(requestedPath) : [requestedPath];
    for (const path of expandedPaths) {
      const content = await getContentByMlsPath(path);
      if (!content) continue;
      if (kind === 'skill') {
        sections.push(`<!-- skill: ${path} -->\n${content}`);
      } else {
        sections.push(`### ${path}\n\`\`\`ts\n${content}\n\`\`\``);
      }
    }
  }
  return sections;
}

function mkStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  if (traceMsg) {
    if (status === 'failed') console.error(`[${AGENT_NAME}] ${traceMsg}`);
    else if (status === 'completed' && traceMsg.includes('Studio diagnostics')) console.warn(`[${AGENT_NAME}] ${traceMsg}`);
  }
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
    cleaner,
  };
}

// Failure policy (skills/collab_messages.md): a 'failed' PARALLEL child fails the whole task, so
// fan-out slots NEVER return 'failed'. Repair runs (attempt >= 2) must also be able to continue to
// the NEXT repair round, so they don't self-fail either. Every failure path here completes with a
// 'MATERIALIZE-FAILED: ' trace; the phase 'verify' step (agentCfeMaterializePhase, mode 'verify') is
// the completion gate — it runs bounded repair rounds with the compiler error in context
// (specAuraForge §11). Exhaustion is recorded as CLI-materialization pending because the CLI can
// continue from the generated artifacts without discarding the whole changeFrontend task.
function mkFailureStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  repairRun: boolean,
  detail: string,
  manualRerunHint = false,
): mls.msg.AgentIntentUpdateStatus {
  return mkStatus(context, parentStep, step, hookSequential, 'completed', `MATERIALIZE-FAILED: ${detail}`, 'input_output');
}

// Lenient attempt read for catch paths (raw may be missing or invalid JSON).
function isRepairRun(raw: string | undefined): boolean {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return isRecord(parsed) && typeof parsed.attempt === 'number' && parsed.attempt >= 2;
  } catch {
    return false;
  }
}

function withStudioDiagnostics(message: string, diagnostics = consumeMaterializeStudioMessages()): string {
  if (!diagnostics.length) return message;
  return `${message}\n${formatStudioDiagnostics(diagnostics)}`;
}

function formatStudioDiagnostics(diagnostics: ReturnType<typeof consumeMaterializeStudioMessages>): string {
  return [
    'Studio diagnostics:',
    ...diagnostics.map(item => `- ${item.level}: ${item.message}`),
  ].join('\n');
}

function parseGenStepArgs(raw: string | undefined): GenStepArgs {
  if (!raw) throw new Error('missing args');
  const parsed = JSON.parse(raw);
  if (!isRecord(parsed)) throw new Error('args must be an object');
  const planId = readString(parsed.planId);
  const defPath = readString(parsed.defPath);
  if (!planId || !defPath) throw new Error('args missing planId or defPath');
  const attempt = typeof parsed.attempt === 'number' && Number.isInteger(parsed.attempt) ? parsed.attempt : undefined;
  const repairHint = readString(parsed.repairHint) || undefined;
  return { planId, defPath, attempt, repairHint };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatError(stage: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${stage}: ${message}`;
}

function describePayload(raw: unknown): string {
  if (raw === null) return 'null';
  if (raw === undefined) return 'undefined';
  if (typeof raw === 'string') return `string(${raw.slice(0, 160)})`;
  if (typeof raw !== 'object') return typeof raw;
  if (Array.isArray(raw)) return `array(${raw.length})`;
  const keys = Object.keys(raw as Record<string, unknown>).slice(0, 8);
  return `object keys=[${keys.join(',')}]`;
}
