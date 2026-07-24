/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplRender.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Render the page .ts from the (fixed) .defs, guided by the template. Tailwind (layout) + DS tokens
// (colors) — NO molecules in v1. Self-contained context (template + shared + contracts + designSystem);
// definition read from the defs file. Reuses the materialization primitives (system/human prompt,
// GEN_TOOL, header/normalize, save + compile). Compile-check after save; ONE repair round (Option B).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkAgentStep, mkCompleted, mkFail, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  buildSystemPrompt, buildHumanPrompt, buildContextSection, buildCompileRepairHint,
  applyHeader, normalizeGeneratedCode, parseDefs, GEN_TOOL, GEN_TOOL_NAME, DEFAULT_MODEL_TYPE,
  type PipelineItem,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import {
  getContentByMlsPath, saveGeneratedTsByMlsPath, compileMlsPathAndGetErrors, extractToolCallArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import {
  parseTplArgs, workspaceRef, templateRef, sharedRef, designSystemRef, defsDestRef, tsDestRef,
  listContractRefs, readFile, type TplArgs,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as renderSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/renderFromTemplate.js';

interface ToolOutput { code: string; }

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplRender',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Render a page .ts (Tailwind + DS tokens) following the template page structure; one repair round',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

/** Build the context sections for the render prompt (template as plain md; the rest as ts/summary). */
async function buildRenderContext(a: TplArgs, project: number): Promise<{ definition: unknown; sections: string[] }> {
  const defsRef = defsDestRef(a, project);
  const defsContent = await readFile(defsRef);
  if (!defsContent) throw new Error(`defs not found: ${defsRef}`);
  const definition = parseDefs(defsContent).data;

  const sections: string[] = [];
  const template = await readFile(templateRef(project, a.styleModel, a.templateId!));
  if (template) sections.push(`### ${templateRef(project, a.styleModel, a.templateId!)} (UX TEMPLATE — page structure & rules to follow)\n${template}`);
  const workspace = await readFile(workspaceRef(project, a.module, a.page!));
  if (workspace) sections.push(buildContextSection(workspaceRef(project, a.module, a.page!), workspace));
  const shared = await readFile(sharedRef(project, a.module, a.page!));
  if (shared) sections.push(buildContextSection(sharedRef(project, a.module, a.page!), shared));
  for (const ref of listContractRefs(project, a.module, a.page!, a.device)) {
    const c = await readFile(ref);
    if (c) sections.push(buildContextSection(ref, c));
  }
  const ds = await readFile(designSystemRef(project));
  if (ds) sections.push(buildContextSection(designSystemRef(project), ds));
  return { definition, sections };
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
    const a = parseTplArgs(args ?? step.prompt);
    if (!a.page || !a.templateId) throw new Error('missing page or templateId');
    const project = mls.actualProject || 0;
    const outPath = tsDestRef(a, project);
    const attempt = a.attempt ?? 1;

    const { definition, sections } = await buildRenderContext(a, project);

    let repairHint: string | undefined;
    if (attempt >= 2) {
      const errors = await compileMlsPathAndGetErrors(outPath);
      if (errors.length) repairHint = buildCompileRepairHint(outPath, errors.slice(0, 8));
    }
    console.info(`[agentTplRender] ▶ ${a.page} (attempt ${attempt}) → ${outPath}`);

    const skillSection = `<!-- skill: renderFromTemplate -->\n${renderSkill}`;
    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildSystemPrompt([skillSection], outPath, DEFAULT_MODEL_TYPE),
      humanPrompt: buildHumanPrompt(definition, sections, outPath, repairHint),
      tools: [GEN_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: GEN_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplRender] ${error instanceof Error ? error.message : String(error)}`)];
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
    const a = parseTplArgs(step.prompt);
    const project = mls.actualProject || 0;
    const outPath = tsDestRef(a, project);
    const attempt = a.attempt ?? 1;

    const defsContent = await readFile(defsDestRef(a, project));
    const definition = defsContent ? parseDefs(defsContent).data : null;
    const pseudoItem: PipelineItem = { id: a.page!, type: 'l2_page', outputPath: outPath };

    const output = extractToolCallArgs<ToolOutput>(step.interaction?.payload?.[0], GEN_TOOL_NAME);
    if (!output?.code) return [mkFail(context, parentStep, step, hookSequential, 'render returned no code')];

    const code = applyHeader(outPath, normalizeGeneratedCode(pseudoItem, definition, output.code));
    if (!context.isTest) {
      const saved = await saveGeneratedTsByMlsPath(outPath, code);
      if (!saved) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${outPath}`)];
    }

    const errors = context.isTest ? [] : await compileMlsPathAndGetErrors(outPath);
    if (errors.length) {
      if (attempt < 2) {
        console.info(`[agentTplRender] ${a.page}: ${errors.length} compile error(s) → repair round`);
        const repairArgs: TplArgs = { ...a, attempt: 2 };
        return [
          mkCompleted(context, parentStep, step, hookSequential),
          mkAgentStep(context, parentStep, makePlanId('render-repair', a.page), `Render (repair): ${a.page}`,
            'agentTplRender', repairArgs as any, [], 'waiting_human_input', 'sequential'),
        ];
      }
      return [mkFail(context, parentStep, step, hookSequential, `render compile error(s) after repair:\n${errors.slice(0, 8).join('\n')}`)];
    }

    console.info(`[agentTplRender] ✓ ${a.page}: .ts rendered (attempt ${attempt})`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplRender] ${error instanceof Error ? error.message : String(error)}`)];
  }
}
