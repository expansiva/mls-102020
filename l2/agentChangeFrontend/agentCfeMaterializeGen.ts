/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeMaterializeGen.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  applyHeader,
  buildHumanPrompt,
  buildSystemPrompt,
  DEFAULT_MODEL_TYPE,
  GEN_TOOL,
  GEN_TOOL_NAME,
  parseDefs,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/cfeMaterializeCore.js';
import {
  compileAndGetErrors,
  extractToolCallArgs,
  getContentByMlsPath,
  parseMlsPath,
  parsePipelineFromContent,
  saveGeneratedTs,
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
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  _step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error('[agentCfeMaterializeGen] missing args');

  const { defPath }: GenStepArgs = JSON.parse(args);
  const genContext = await buildGenContext(defPath);
  const intent: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: buildSystemPrompt(genContext.skillSections, genContext.pipelineItem.outputPath, DEFAULT_MODEL_TYPE),
    humanPrompt: buildHumanPrompt(genContext.definitionData, genContext.contextSections, genContext.pipelineItem.outputPath),
    tools: [GEN_TOOL as unknown as mls.msg.LLMTool],
    toolChoice: { type: 'function', function: { name: GEN_TOOL_NAME } },
  };

  return [intent];
}

async function afterPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const { defPath }: GenStepArgs = JSON.parse(step.prompt || '{}');
  const defsContent = defPath ? await getContentByMlsPath(defPath) : null;
  const pipeline = defsContent ? parsePipelineFromContent(defsContent) : null;
  const pipelineItem = pipeline?.[0];

  if (!pipelineItem) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', 'pipeline not found in defs')];
  }

  const raw = step.interaction?.payload?.[0] as unknown;
  const output = extractToolCallArgs<ToolOutput>(raw, GEN_TOOL_NAME);
  if (!output?.code) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', 'missing generated code')];
  }

  const parsed = parseMlsPath(pipelineItem.outputPath);
  if (!parsed) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', `invalid outputPath: ${pipelineItem.outputPath}`)];
  }

  const code = applyHeader(pipelineItem.outputPath, output.code);
  const saved = await saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, code);
  if (!saved) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', 'saveGeneratedTs failed')];
  }

  const compileErrors = await compileAndGetErrors(parsed.project, parsed.level, parsed.folder, parsed.shortName);
  if (compileErrors.length > 0) {
    return [mkStatus(context, parentStep, step, hookSequential, 'failed', compileErrors.slice(0, 5).join('\n'))];
  }

  return [mkStatus(context, parentStep, step, hookSequential, 'completed', undefined, 'input_output')];
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
