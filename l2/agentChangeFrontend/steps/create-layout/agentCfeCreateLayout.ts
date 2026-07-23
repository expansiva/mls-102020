/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-layout/agentCfeCreateLayout.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { GOAL_FIRST_TEMPLATE_ID, cfePageLayoutToolName, cfePageLayoutToolSchema, createLayoutPromptContext, createPromptReadyIntent, createUpdateStatusIntent, expandLayoutComposition, extractCfePageLayoutOutput, prepareCreateRunPage, rememberCreateLayout, saveCreateLayoutFailureTrace, savePageLayoutDefs, savePageObjectiveTrace } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
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
    const systemPrompt = await buildSystemPrompt(layoutArgs.templateId);
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
    await saveFailureTrace(args || step.prompt, 'beforePromptStep', message);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `CREATE-LAYOUT-FAILED: ${message}`)];
  }
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let layoutArgs: { pageId: string; genome: string; templateId: string; runId: string } | undefined;
  try {
    layoutArgs = parseArgs(step.prompt);
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing LLM payload');
    const output = extractCfePageLayoutOutput(payload);
    if (output.status !== 'ok') throw new Error(output.questions.join('; ') || `${AGENT_NAME} returned ${output.status}`);
    const prepared = await prepareCreateRunPage(layoutArgs.runId, layoutArgs.pageId);
    const objective = layoutArgs.templateId === GOAL_FIRST_TEMPLATE_ID ? output.result.objective : undefined;
    // The LLM returns a minimal semantic composition; expand it into the full render tree deterministically
    // from L4 before the (unchanged) save/repair/validate/reconcile pipeline runs.
    const fullLayout = expandLayoutComposition(prepared, output.result.pageLayout);
    const savedLayout = await savePageLayoutDefs(prepared, fullLayout, layoutArgs.genome, objective);
    if (objective !== undefined) await savePageObjectiveTrace(prepared, layoutArgs.genome, objective);
    rememberCreateLayout(layoutArgs.runId, layoutArgs.pageId, layoutArgs.genome, savedLayout);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    const variant = layoutArgs ? `${layoutArgs.pageId}/${layoutArgs.genome}` : 'unparsed layout args';
    if (layoutArgs) await saveFailureTrace(JSON.stringify(layoutArgs), 'afterPromptStep', message);
    // Fan-out children always complete: the sequential verify-create-layouts gate enforces the
    // primary page11 requirement after all pending parallel slots have been drained.
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `CREATE-LAYOUT-FAILED (${variant}): ${message}`)];
  }
}

async function saveFailureTrace(value: string | undefined, stage: 'beforePromptStep' | 'afterPromptStep', message: string): Promise<void> {
  try {
    const layoutArgs = parseArgs(value);
    await saveCreateLayoutFailureTrace(layoutArgs.runId, layoutArgs.pageId, layoutArgs.genome, layoutArgs.templateId, stage, message);
  } catch (traceError) {
    console.error(`[${AGENT_NAME}] could not persist layout failure trace: ${traceError instanceof Error ? traceError.message : String(traceError)}`);
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

async function buildSystemPrompt(templateId: string): Promise<string> {
  // page11 (pinned template) uses the baseline prompt; page21 (goal_first) uses the goal-first prompt.
  const promptName = templateId === GOAL_FIRST_TEMPLATE_ID ? 'promptGoalFirst' : 'prompt';
  const prompt = await readCfePrompt('steps/create-layout', promptName);
  return prompt
    .split('{{agentName}}').join(AGENT_NAME)
    .split('{{toolName}}').join(cfePageLayoutToolName)
    .split('{{uxGuidance}}').join(uxGuidanceSkill);
}
