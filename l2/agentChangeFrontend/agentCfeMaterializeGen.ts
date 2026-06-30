/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeMaterializeGen.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  applyHeader,
  buildCompileRepairHint,
  buildMaterializeTypecheckTest,
  buildHumanPrompt,
  buildMissingCodeRepairHint,
  buildSystemPrompt,
  DEFAULT_MODEL_TYPE,
  GEN_TOOL,
  GEN_TOOL_NAME,
  MATERIALIZE_REPAIR_ATTEMPTS,
  parseDefs,
  testPathForOutputPath,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/cfeMaterializeCore.js';
import {
  compileAndGetErrors,
  compileMlsPathAndGetErrors,
  extractToolCallArgs,
  getContentByMlsPath,
  parseMlsPath,
  saveGeneratedTs,
  saveGeneratedTsByMlsPath,
  type GenStepArgs,
} from '/_102020_/l2/agentChangeFrontend/cfeMaterializeStudio.js';

interface ToolOutput {
  code: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeMaterializeGen',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
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
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', message)];
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
    const genArgs = parseGenStepArgs(step.prompt);
    const { defPath } = genArgs;
    const defsContent = defPath ? await getContentByMlsPath(defPath) : null;
    const parsedDefs = defsContent ? parseDefs(defsContent) : null;
    const pipelineItem = parsedDefs?.item;

    if (!pipelineItem) {
      return [mkStatus(context, parentStep, step, hookSequential, 'failed', `pipeline not found in defs: ${defPath || '(missing defPath)'}`)];
    }

    const raw = step.interaction?.payload?.[0] as unknown;
    const output = extractToolCallArgs<ToolOutput>(raw, GEN_TOOL_NAME);
    if (!output?.code) {
      const detail = `missing generated code; payload=${describePayload(raw)}`;
      return retryOrFail(context, parentStep, step, hookSequential, genArgs, buildMissingCodeRepairHint(pipelineItem.outputPath, detail), detail);
    }

    const parsed = parseMlsPath(pipelineItem.outputPath);
    if (!parsed) {
      return [mkStatus(context, parentStep, step, hookSequential, 'failed', `invalid outputPath: ${pipelineItem.outputPath}`)];
    }

    const code = applyHeader(pipelineItem.outputPath, output.code);
    const saved = await saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, code);
    if (!saved) {
      return [mkStatus(context, parentStep, step, hookSequential, 'failed', `saveGeneratedTs failed for ${pipelineItem.outputPath}`)];
    }

    const typecheckTest = buildMaterializeTypecheckTest(pipelineItem, parsedDefs ? parsedDefs.data : null);
    const typecheckPath = typecheckTest ? testPathForOutputPath(pipelineItem.outputPath) : null;
    if (typecheckPath && typecheckTest) {
      const testSaved = await saveGeneratedTsByMlsPath(typecheckPath, typecheckTest);
      if (!testSaved) {
        return [mkStatus(context, parentStep, step, hookSequential, 'failed', `saveGeneratedTs failed for ${typecheckPath}`)];
      }
    }

    const compileErrors = [
      ...await compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName),
      ...(typecheckPath ? await compileMlsPathAndGetErrors(typecheckPath) : []),
    ];
    if (compileErrors.length > 0) {
      const checkedFiles = typecheckPath ? `${pipelineItem.outputPath} + ${typecheckPath}` : pipelineItem.outputPath;
      const traceMsg = `compile/typecheck failed for ${checkedFiles}:\n${compileErrors.slice(0, 8).join('\n')}`;
      return retryOrFail(context, parentStep, step, hookSequential, genArgs, buildCompileRepairHint(pipelineItem.outputPath, compileErrors), traceMsg);
    }

    return [mkStatus(context, parentStep, step, hookSequential, 'completed', undefined, 'input_output')];
  } catch (error) {
    const message = formatError('afterPromptStep', error);
    console.error(`[${agent.agentName}] ${message}`);
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', message)];
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

async function retryOrFail(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  genArgs: GenStepArgs,
  repairHint: string,
  traceMsg: string,
): Promise<mls.msg.AgentIntent[]> {
  const attempt = typeof genArgs.attempt === 'number' ? genArgs.attempt : 0;
  if (attempt >= MATERIALIZE_REPAIR_ATTEMPTS) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', `${traceMsg}\nrepair attempts exhausted (${attempt}/${MATERIALIZE_REPAIR_ATTEMPTS})`)];
  }

  const nextArgs: GenStepArgs = { ...genArgs, attempt: attempt + 1, repairHint };
  const genContext = await buildGenContext(genArgs.defPath);
  return [createPromptReadyIntent(context, parentStep, hookSequential, nextArgs, genContext)];
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
  for (const path of paths) {
    const content = await getContentByMlsPath(path);
    if (!content) continue;
    if (kind === 'skill') {
      sections.push(`<!-- skill: ${path} -->\n${content}`);
    } else {
      sections.push(`### ${path}\n\`\`\`ts\n${content}\n\`\`\``);
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
