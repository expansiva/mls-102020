/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplCritique.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Critique the generated .defs against BOTH the template (adherence) and the shared (anchoring).
// Writes findings to trace/templatesRender/<genome>/<page>.critique.md. Does NOT touch the defs.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkFail, mkCompleted } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, templateRef, sharedRef, defsDestRef, critiqueRef, listContractRefs,
  readFile, readContextSections, saveTextArtifact, buildFileSystemPrompt, buildLabelledHuman,
  extractFileContent, hasMoleculesSection, TPL_FILE_TOOL, TPL_FILE_TOOL_NAME,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as critiqueSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/critiqueDefsVsTemplate.js';
import { critiqueAddendum } from '/_102020_/l2/aura/agentTemplatesRender/skills/moleculesAddenda.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplCritique',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Critique a page .defs against the template (adherence) and the shared (anchoring)',
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
    const outPath = critiqueRef(project, a.module, a.genome, a.page);
    console.info(`[agentTplCritique] ▶ ${a.page} → ${outPath}`);

    const contractRefs = listContractRefs(project, a.module, a.page, a.device);
    const tplRef = templateRef(project, a.styleModel, a.templateId);
    const contextSections = await readContextSections([
      { ref: defsDestRef(a, project), lang: 'ts' },
      { ref: tplRef },
      { ref: sharedRef(project, a.module, a.page), lang: 'ts' },
      ...contractRefs.map(ref => ({ ref, lang: 'ts' })),
    ]);

    // Third criterion only when the template actually prescribes molecules.
    const withMolecules = a.useMolecules === true && hasMoleculesSection(await readFile(tplRef));
    if (withMolecules) console.info(`[agentTplCritique] ${a.page}: molecule adherence criterion ON`);

    const humanPrompt = buildLabelledHuman([
      { title: `Review target`, body: `Critique the .defs of page **${a.page}** against template **${a.templateId}** (${a.styleModel}) and the shared surface. Produce findings only.` },
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
      systemPrompt: buildFileSystemPrompt(withMolecules ? `${critiqueSkill}\n${critiqueAddendum}` : critiqueSkill, 'code', outPath),
      humanPrompt,
      tools: [TPL_FILE_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: TPL_FILE_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplCritique] ${error instanceof Error ? error.message : String(error)}`)];
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
    const outPath = critiqueRef(project, a.module, a.genome, a.page!);

    const content = extractFileContent(step.interaction?.payload?.[0]);
    if (!content) return [mkFail(context, parentStep, step, hookSequential, 'critique returned no content')];

    if (!context.isTest) {
      const ok = await saveTextArtifact(outPath, content);
      if (!ok) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${outPath}`)];
      console.info(`[agentTplCritique] ✓ ${a.page}: critique written`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplCritique] ${error instanceof Error ? error.message : String(error)}`)];
  }
}
