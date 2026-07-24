/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplDefs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the page .defs.ts (LLM), guided by the template. Writes definition (brief + uiSpec anchored
// to the template regions) + pipeline (the template md is in every item's dependsFiles — the "which
// template" reference the caller asked for). Anchored to the real shared/contracts surface.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkFail, mkCompleted } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, workspaceRef, templateRef, sharedRef, designSystemRef, defsDestRef, listContractRefs,
  readFile, readContextSections, saveEditorFile, buildFileSystemPrompt, buildLabelledHuman,
  extractFileContent, TPL_FILE_TOOL, TPL_FILE_TOOL_NAME,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as genDefsSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/genDefsFromTemplate.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplDefs',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Generate a page .defs.ts (brief + uiSpec) anchored to a template and the shared surface',
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
    console.info(`[agentTplDefs] ▶ ${a.page} (template ${a.templateId}) → ${outPath}`);

    const contractRefs = listContractRefs(project, a.module, a.page, a.device);
    const contextSections = await readContextSections([
      { ref: workspaceRef(project, a.module, a.page), lang: 'ts' },
      { ref: templateRef(project, a.styleModel, a.templateId) },
      { ref: sharedRef(project, a.module, a.page), lang: 'ts' },
      ...contractRefs.map(ref => ({ ref, lang: 'ts' })),
    ]);

    const humanPrompt = buildLabelledHuman([
      { title: `Generation parameters`, body: [
        `pageId: ${a.page}`, `moduleName: ${a.module}`, `genome: ${a.genome}`,
        `style: ${a.styleModel}`, `template: ${a.templateId}`, `device: ${a.device}`,
        `Pipeline paths to emit (use these EXACT refs):`,
        `- defs (this file): ${outPath}`,
        `- rendered page: ${outPath.replace(/\.defs\.ts$/, '.ts')}`,
        `- template (put in every pipeline item's dependsFiles): ${templateRef(project, a.styleModel, a.templateId)}`,
        `- shared: ${sharedRef(project, a.module, a.page)}`,
        `- design system: ${designSystemRef(project)}`,
        `- contracts: ${contractRefs.join(', ') || '(none found)'}`,
        `- render skill: _102020_/l2/aura/agentTemplatesRender/skills/renderFromTemplate.ts`,
        `- critique skill: _102020_/l2/aura/agentTemplatesRender/skills/critiqueDefsVsTemplate.ts`,
        `- fix skill: _102020_/l2/aura/agentTemplatesRender/skills/fixDefs.ts`,
      ].join('\n') },
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
      systemPrompt: buildFileSystemPrompt(genDefsSkill, 'code', outPath),
      humanPrompt,
      tools: [TPL_FILE_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: TPL_FILE_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplDefs] ${error instanceof Error ? error.message : String(error)}`)];
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
    if (!content) return [mkFail(context, parentStep, step, hookSequential, 'defs returned no content')];
    content = ensureHeader(outPath, content);

    if (!context.isTest) {
      await saveEditorFile(outPath, content);
      console.info(`[agentTplDefs] ✓ ${a.page}: defs written`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplDefs] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

/** Ensure the .defs.ts starts with the mls header (enhancement="_blank" for defs data files). */
function ensureHeader(outPath: string, code: string): string {
  const clean = outPath.startsWith('/') ? outPath.slice(1) : outPath;
  const header = `/// <mls fileReference="${clean}" enhancement="_blank"/>`;
  const trimmed = code.trimStart();
  const existing = /^\/\/\/\s*<mls\b[^>]*\/>\s*/;
  if (existing.test(trimmed)) return trimmed.replace(existing, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
}
