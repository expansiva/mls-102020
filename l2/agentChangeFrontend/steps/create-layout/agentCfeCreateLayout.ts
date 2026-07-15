/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/agentCfeCreateLayout.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { cfePageLayoutToolName, cfePageLayoutToolSchema, createLayoutPromptContext, createPromptReadyIntent, createUpdateStatusIntent, extractCfePageLayoutOutput, prepareCreateRunPage, rememberCreateLayout, savePageLayoutDefs } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { readCfePrompt } from '/_102020_/l2/agentChangeFrontend/steps/create-layout/cfePromptFiles.js';
import { skill as uxGuidanceSkill } from '/_102020_/l2/agentChangeFrontend/skills/uxGuidance.js';

const AGENT_NAME = 'agentCfeCreateLayout';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/create-layout',
    agentDescription: 'Create exactly one pinned page layout variant with one LLM call',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const layoutArgs = parseArgs(args || step.prompt);
    const prepared = await prepareCreateRunPage(layoutArgs.runId, layoutArgs.pageId);
    const systemPrompt = await buildSystemPrompt();
    return [createPromptReadyIntent(
      context,
      parentStep,
      hookSequential,
      args || step.prompt || JSON.stringify(layoutArgs),
      systemPrompt,
      `## Pinned layout selector\n${JSON.stringify(layoutArgs)}\n\n## Page + shared context\n${JSON.stringify(createLayoutPromptContext(prepared, layoutArgs.genome, layoutArgs.templateId), null, 2)}\n`,
      cfePageLayoutToolSchema,
      cfePageLayoutToolName,
    )];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  const layoutArgs = parseArgs(step.prompt);
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing LLM payload');
    const output = extractCfePageLayoutOutput(payload);
    if (output.status !== 'ok') throw new Error(output.questions.join('; ') || `${AGENT_NAME} returned ${output.status}`);
    const prepared = await prepareCreateRunPage(layoutArgs.runId, layoutArgs.pageId);
    const savedLayout = await savePageLayoutDefs(prepared, output.result.pageLayout, layoutArgs.genome);
    rememberCreateLayout(layoutArgs.runId, layoutArgs.pageId, layoutArgs.genome, savedLayout);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    // The primary layout is the required page definition. Extra UX variants are optional and leave
    // a visible trace instead of aborting the whole page when a single variant is invalid.
    const status = layoutArgs.genome === 'page11' ? 'failed' : 'completed';
    const trace = layoutArgs.genome === 'page11' ? message : `Skipped optional ${layoutArgs.genome}: ${message}`;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, trace)];
  }
}

function parseArgs(value: string | undefined): { pageId: string; genome: string; templateId: string; runId: string } {
  if (!value) throw new Error('missing layout args');
  const parsed = JSON.parse(value) as Record<string, unknown>;
  const pageId = typeof parsed.pageId === 'string' ? parsed.pageId : '';
  const genome = typeof parsed.genome === 'string' ? parsed.genome : '';
  const templateId = typeof parsed.templateId === 'string' ? parsed.templateId : '';
  const runId = typeof parsed.runId === 'string' ? parsed.runId : '';
  if (!pageId || !genome || !templateId || !runId) throw new Error(`invalid layout args: ${value}`);
  return { pageId, genome, templateId, runId };
}

async function buildSystemPrompt(): Promise<string> {
  const prompt = await readCfePrompt('steps/create-layout', 'prompt');
  return prompt
    .split('{{agentName}}').join(AGENT_NAME)
    .split('{{toolName}}').join(cfePageLayoutToolName)
    .split('{{uxGuidance}}').join(uxGuidanceSkill);
}
