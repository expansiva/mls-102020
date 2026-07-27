/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplWriteTemplate.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Write ONE reusable template guide to l4/templates/<styleModel>/<templateId>.md (LLM).
// The template is a GUIDE, not a page: no project names, routes, seeds, BFF ids or screenshots.
// It is read as context by the defs/critique/render steps of every page that uses it.
//
// With useMolecules, the molecule cascade already ran (groups → molecules) and its plan is embedded here
// as the guide's "## Molecules" section — the marker every downstream step keys on.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkFail, mkCompleted } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, templateRef, workspaceRef, moleculesPlanRef, parseMoleculePlan, readFile, saveTextArtifact,
  buildFileSystemPrompt, buildLabelledHuman, extractFileContent, TPL_FILE_TOOL, TPL_FILE_TOOL_NAME,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as writeTemplateSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/writeTemplateGuide.js';
import { writeTemplateAddendum } from '/_102020_/l2/aura/agentTemplatesRender/skills/moleculesAddenda.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplWriteTemplate',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Write a reusable UX template guide (.md) for a style model',
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
    if (!a.templateId) throw new Error('missing templateId');
    const project = mls.actualProject || 0;
    const outPath = templateRef(project, a.styleModel, a.templateId);
    console.info(`[agentTplWriteTemplate] ▶ ${a.templateId} (${a.styleModel}) → ${outPath}`);

    // A couple of representative workspaces this template must fit — as EVIDENCE of the shape, not
    // to be copied into the guide (the skill forbids project-specific detail in the output).
    const sampleBlocks: string[] = [];
    for (const page of (a.pages ?? []).slice(0, 3)) {
      const src = await readFile(workspaceRef(project, a.module, page));
      if (src) sampleBlocks.push(`### ${page}\n\`\`\`ts\n${src}\n\`\`\``);
    }

    // Molecule mode: the cascade already chose the molecules for this template. The plan becomes an extra
    // context section + an addendum to the skill. A plan with no TagName leaves the v1 guide untouched.
    const sections = [
      { title: `Template to write`, body: `Style: **${a.styleModel}**. Template id: **${a.templateId}**.\nWrite a REUSABLE guide (no project names/routes/BFF ids). Generalize from the evidence below.` },
      { title: `Workspace evidence (shape only — do NOT copy specifics)`, body: sampleBlocks.join('\n\n') || '(none)' },
    ];
    let systemSkill = writeTemplateSkill;
    if (a.useMolecules) {
      const planRef = moleculesPlanRef(project, a.module, a.genome, a.templateId);
      const plan = await readFile(planRef);
      const { tags } = parseMoleculePlan(plan);
      if (tags.length) {
        sections.push({ title: `Molecule plan (${planRef})`, body: plan });
        systemSkill = `${writeTemplateSkill}\n${writeTemplateAddendum}`;
        console.info(`[agentTplWriteTemplate] ${a.templateId}: ${tags.length} molecule(s) in the guide`);
      } else {
        console.info(`[agentTplWriteTemplate] ${a.templateId}: empty molecule plan → hand-drawn guide`);
      }
    }

    const humanPrompt = buildLabelledHuman(sections, outPath);

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: buildFileSystemPrompt(systemSkill, 'code', outPath),
      humanPrompt,
      tools: [TPL_FILE_TOOL as unknown as mls.msg.LLMTool],
      toolChoice: { type: 'function', function: { name: TPL_FILE_TOOL_NAME } },
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplWriteTemplate] ${error instanceof Error ? error.message : String(error)}`)];
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
    const outPath = templateRef(project, a.styleModel, a.templateId!);

    const content = extractFileContent(step.interaction?.payload?.[0]);
    if (!content) return [mkFail(context, parentStep, step, hookSequential, 'write-template returned no content')];

    if (!context.isTest) {
      const ok = await saveTextArtifact(outPath, content);
      if (!ok) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${outPath}`)];
      console.info(`[agentTplWriteTemplate] ✓ ${a.templateId} written`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplWriteTemplate] ${error instanceof Error ? error.message : String(error)}`)];
  }
}
