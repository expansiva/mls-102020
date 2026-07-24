/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplFix.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Apply the critique findings to the .defs (LLM). Rewrites the SAME <page>.defs.ts, preserving what
// was already good and staying faithful to the template + shared. Overwrites in place.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkFail, mkCompleted } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, templateRef, sharedRef, defsDestRef, critiqueRef, listContractRefs,
  readContextSections, saveEditorFile, buildFileSystemPrompt, buildLabelledHuman,
  extractFileContent, TPL_FILE_TOOL, TPL_FILE_TOOL_NAME,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as fixSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/fixDefs.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplFix',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Apply the critique to the page .defs (rewrite in place)',
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
    const a = parseTplArgs(args ?? step.prompt);
    if (!a.page || !a.templateId) throw new Error('missing page or templateId');
    const project = mls.actualProject || 0;
    const outPath = defsDestRef(a, project);
    console.info(`[agentTplFix] ▶ ${a.page} → ${outPath}`);

    const contractRefs = listContractRefs(project, a.module, a.page, a.device);
    const contextSections = await readContextSections([
      { ref: outPath, lang: 'ts' },
      { ref: critiqueRef(project, a.module, a.genome, a.page) },
      { ref: templateRef(project, a.styleModel, a.templateId) },
      { ref: sharedRef(project, a.module, a.page), lang: 'ts' },
      ...contractRefs.map(ref => ({ ref, lang: 'ts' })),
    ]);

    const humanPrompt = buildLabelledHuman([
      { title: `Fix target`, body: `Apply the critique findings to the .defs of page **${a.page}**. Rewrite the SAME file, preserving what is already good. Stay faithful to template **${a.templateId}** and the shared. If the critique says "no fixes needed", re-emit the defs unchanged.` },
      ...contextSections,
    ], outPath);

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildFileSystemPrompt(fixSkill, 'code', outPath),
      humanPrompt,
      tools: [TPL_FILE_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: TPL_FILE_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplFix] ${error instanceof Error ? error.message : String(error)}`)];
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
    const outPath = defsDestRef(a, project);

    let content = extractFileContent(step.interaction?.payload?.[0]);
    if (!content) return [mkFail(context, parentStep, step, hookSequential, 'fix returned no content')];
    content = ensureHeader(outPath, content);

    if (!context.isTest) {
      await saveEditorFile(outPath, content);
      console.info(`[agentTplFix] ✓ ${a.page}: defs fixed`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplFix] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

function ensureHeader(outPath: string, code: string): string {
  const clean = outPath.startsWith('/') ? outPath.slice(1) : outPath;
  const header = `/// <mls fileReference="${clean}" enhancement="_blank"/>`;
  const trimmed = code.trimStart();
  const existing = /^\/\/\/\s*<mls\b[^>]*\/>\s*/;
  if (existing.test(trimmed)) return trimmed.replace(existing, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
}
